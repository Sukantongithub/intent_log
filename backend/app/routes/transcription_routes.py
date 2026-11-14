from fastapi import APIRouter, HTTPException, Query, status
from typing import List, Optional
from app.database.mongodb import (
    get_meeting_participants_collection,
    get_transcripts_collection,
    get_meetings_collection,
    build_id_query,
    format_doc
)
from app.models.transcript import TranscriptModel
from app.schemas.transcript_schema import (
    TranscriptRequest,
    TranscriptSegmentResponse,
    MergedTranscriptSegmentResponse,
    MergedTranscriptListResponse
)
from ai.speech.whisper_service import whisper_service
from ai.speech.timestamp_merger import timestamp_merger
from app.utils.vocabulary_normalizer import normalize_text_naming_words

router = APIRouter(prefix="/api/meetings", tags=["Speech-to-Text & Merged Transcripts (Checkpoints 4 & 5)"])

@router.post("/{meeting_id}/participants/{user_id}/transcribe", response_model=TranscriptSegmentResponse, status_code=status.HTTP_201_CREATED, summary="Transcribe participant active speech segment via Whisper Large-v3")
def transcribe_participant_segment(meeting_id: str, user_id: str, payload: TranscriptRequest):
    """
    Converts participant active speech audio segment to text:
    1. Evaluates text via Whisper STT service (or explicit transcript text if provided).
    2. Stores speaker-attributed transcript document with exact timestamps in MongoDB 'transcripts' collection.
    """
    part_col = get_meeting_participants_collection()
    part = part_col.find_one({"meeting_id": meeting_id, "user_id": user_id})
    speaker_name = payload.speaker_name
    if part and part.get("display_name"):
        speaker_name = part.get("display_name")

    if payload.transcript_text:
        text = payload.transcript_text.strip()
        confidence = 0.98
    else:
        stt_res = whisper_service.transcribe_audio_segment(
            audio_base64=payload.audio_base64,
            participant_name=speaker_name,
            start_time=payload.start_time,
            end_time=payload.end_time
        )
        text = stt_res["text"]
        confidence = stt_res["confidence"]

    # Normalize naming words and proper nouns for accurate attribution
    text = normalize_text_naming_words(text, [speaker_name])

    trans_col = get_transcripts_collection()
    doc = TranscriptModel.create_document(
        meeting_id=meeting_id,
        participant_id=user_id,
        speaker_name=speaker_name,
        start_time=payload.start_time,
        end_time=payload.end_time,
        text=text,
        confidence=confidence
    )

    res = trans_col.insert_one(doc)
    doc["_id"] = res.inserted_id

    return TranscriptSegmentResponse(**format_doc(doc))

@router.patch("/{meeting_id}/transcripts/{transcript_id}", response_model=TranscriptSegmentResponse, summary="Update transcript segment text")
def update_transcript_segment(meeting_id: str, transcript_id: str, payload: dict):
    new_text = payload.get("text", "").strip()
    if not new_text:
        raise HTTPException(status_code=400, detail="Transcript text cannot be empty")

    normalized = normalize_text_naming_words(new_text)
    trans_col = get_transcripts_collection()
    res = trans_col.find_one_and_update(
        {"$or": [{"transcript_id": transcript_id}, build_id_query(transcript_id)]},
        {"$set": {"text": normalized}},
        return_document=True
    )
    if not res:
        raise HTTPException(status_code=404, detail=f"Transcript segment '{transcript_id}' not found")
    return TranscriptSegmentResponse(**format_doc(res))

@router.get("/{meeting_id}/transcripts", response_model=List[TranscriptSegmentResponse], summary="Retrieve speaker-attributed meeting transcripts")
def get_meeting_transcripts(
    meeting_id: str,
    user_id: Optional[str] = Query(None, description="Filter by participant user_id")
):
    """
    Retrieves speaker-attributed transcript segments for a meeting sorted by start_time.
    Supports overlapping speaker timestamps.
    """
    trans_col = get_transcripts_collection()
    meetings_col = get_meetings_collection()
    m_doc = meetings_col.find_one({"$or": [{"meeting_code": meeting_id}, build_id_query(meeting_id)]})
    
    ids_to_query = [meeting_id]
    if m_doc:
        ids_to_query.append(str(m_doc["_id"]))
        if m_doc.get("meeting_code"):
            ids_to_query.append(m_doc.get("meeting_code"))

    query = {"meeting_id": {"$in": list(set(ids_to_query))}}
    if user_id:
        query["user_id"] = user_id

    cursor = trans_col.find(query).sort("start_time", 1)
    return [TranscriptSegmentResponse(**format_doc(doc)) for doc in cursor]

@router.get("/{meeting_id}/merged-transcript", response_model=MergedTranscriptListResponse, summary="Get merged speaker-attributed transcript with overlapping timeline tags")
def get_merged_transcript(meeting_id: str):
    """
    Retrieves all speaker transcript segments for a meeting, chronologically merges them by start_time,
    and identifies/tags overlapping speaker speech windows (has_overlap = True).
    """
    trans_col = get_transcripts_collection()
    meetings_col = get_meetings_collection()
    m_doc = meetings_col.find_one({"$or": [{"meeting_code": meeting_id}, build_id_query(meeting_id)]})

    ids_to_query = [meeting_id]
    if m_doc:
        ids_to_query.append(str(m_doc["_id"]))
        if m_doc.get("meeting_code"):
            ids_to_query.append(m_doc.get("meeting_code"))

    cursor = trans_col.find({"meeting_id": {"$in": list(set(ids_to_query))}})
    raw_docs = [format_doc(doc) for doc in cursor]

    merged_docs = timestamp_merger.merge_speaker_transcripts(raw_docs)
    formatted_segments = [MergedTranscriptSegmentResponse(**doc) for doc in merged_docs]
    overlap_count = sum(1 for doc in merged_docs if doc.get("has_overlap"))

    return MergedTranscriptListResponse(
        meeting_id=meeting_id,
        total_segments=len(formatted_segments),
        overlapping_segments_count=overlap_count,
        merged_transcript=formatted_segments
    )
