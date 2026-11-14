from fastapi import APIRouter, HTTPException, Query, status
from typing import List, Optional
from app.database.mongodb import (
    get_meeting_participants_collection,
    get_vad_segments_collection,
    format_doc
)
from app.models.vad_segment import VADSegmentModel
from app.schemas.vad_schema import VADProcessRequest, VADSegmentResponse
from ai.vad.vad_processor import vad_processor

router = APIRouter(prefix="/api/meetings", tags=["Voice Activity Detection (Checkpoint 3)"])

@router.post("/{meeting_id}/participants/{user_id}/vad-process", response_model=VADSegmentResponse, status_code=status.HTTP_201_CREATED, summary="Process participant audio stream chunk with Voice Activity Detection (VAD)")
def process_participant_vad(meeting_id: str, user_id: str, payload: VADProcessRequest):
    """
    Applies Voice Activity Detection (VAD) independently to participant stream:
    1. Evaluates stream audio bytes for speech vs silence.
    2. Generates timestamped VAD segment metadata (meeting_id, participant_id, start_time, end_time, speech_detected).
    3. Persists segment to MongoDB 'vad_segments' collection.
    """
    part_col = get_meeting_participants_collection()
    part = part_col.find_one({"meeting_id": meeting_id, "user_id": user_id})
    if not part:
        raise HTTPException(status_code=404, detail=f"Participant '{user_id}' not found in meeting '{meeting_id}'.")

    # Run VAD Processor
    vad_res = vad_processor.process_participant_stream(
        meeting_id=meeting_id,
        participant_id=user_id,
        start_time=payload.start_time,
        end_time=payload.end_time,
        audio_base64=payload.audio_base64,
        sample_rate=payload.sample_rate
    )

    vad_col = get_vad_segments_collection()
    doc = VADSegmentModel.create_document(
        meeting_id=meeting_id,
        participant_id=user_id,
        start_time=vad_res["start_time"],
        end_time=vad_res["end_time"],
        speech_detected=vad_res["speech_detected"],
        confidence=vad_res["confidence"],
        energy_db=vad_res["energy_db"]
    )

    res = vad_col.insert_one(doc)
    doc["_id"] = res.inserted_id

    return VADSegmentResponse(**format_doc(doc))

@router.get("/{meeting_id}/vad-segments", response_model=List[VADSegmentResponse], summary="Retrieve timestamped VAD segments for meeting")
def list_meeting_vad_segments(
    meeting_id: str,
    participant_id: Optional[str] = Query(None, description="Filter by participant_id"),
    speech_only: bool = Query(False, description="Filter only segments where speech was detected")
):
    """
    Returns timestamped VAD speech/silence segments for a meeting.
    """
    vad_col = get_vad_segments_collection()
    query = {"meeting_id": meeting_id}
    if participant_id:
        query["participant_id"] = participant_id
    if speech_only:
        query["speech_detected"] = True

    cursor = vad_col.find(query).sort("start_time", 1)
    return [VADSegmentResponse(**format_doc(doc)) for doc in cursor]
