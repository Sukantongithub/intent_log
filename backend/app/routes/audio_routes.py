from fastapi import APIRouter, HTTPException, Query, status
from typing import List, Optional
from app.database.mongodb import get_sessions_collection, get_audio_chunks_collection, build_id_query, format_doc

from app.models.audio_chunk import AudioChunkModel
from app.schemas.audio_schema import AudioChunkUpload, VADAnalysisResponse
from app.services.vad_service import vad_service

router = APIRouter(prefix="/api/sessions", tags=["Audio Streaming & VAD"])

@router.post("/{session_id}/audio-chunk", response_model=VADAnalysisResponse, status_code=status.HTTP_201_CREATED, summary="Ingest participant audio chunk and process with Voice Activity Detection (VAD)")
def upload_audio_chunk(session_id: str, payload: AudioChunkUpload):
    """
    Ingests per-participant audio chunk (e.g. Nithi -> USER_003 -> audio_stream_003):
    1. Validates meeting session existence.
    2. Runs Voice Activity Detection (VAD) analysis.
    3. If silent (e.g., mic unmuted but participant is silent), tags decision as 'SILENCE_IGNORED' (routed_to_stt = False).
    4. If active speech, tags decision as 'SPEECH_DETECTED' (routed_to_stt = True).
    5. Saves analysis doc to MongoDB.
    """
    sessions_col = get_sessions_collection()
    session_doc = sessions_col.find_one({"$or": [{"session_id": session_id}, build_id_query(session_id)]})
    if not session_doc:
        raise HTTPException(status_code=404, detail=f"Meeting session '{session_id}' not found.")


    # Execute VAD Analysis
    vad_result = vad_service.analyze_audio_chunk(
        audio_base64=payload.audio_data_base64,
        sample_rate=payload.sample_rate,
        audio_format=payload.audio_format
    )

    audio_chunks_col = get_audio_chunks_collection()
    chunk_doc = AudioChunkModel.create_document(
        session_id=session_id,
        participant_id=payload.participant_id,
        audio_stream_id=payload.audio_stream_id,
        start_timestamp=payload.start_timestamp,
        end_timestamp=payload.end_timestamp,
        is_speech=vad_result["is_speech"],
        confidence=vad_result["confidence"],
        energy_db=vad_result["energy_db"],
        decision=vad_result["decision"],
        routed_to_stt=vad_result["routed_to_stt"],
        audio_data_base64=payload.audio_data_base64
    )

    insert_res = audio_chunks_col.insert_one(chunk_doc)
    chunk_doc["_id"] = insert_res.inserted_id

    formatted = format_doc(chunk_doc)
    return VADAnalysisResponse(**formatted)

@router.get("/{session_id}/audio-chunks", response_model=List[VADAnalysisResponse], summary="Retrieve session audio chunks and VAD metrics")
def get_session_audio_chunks(
    session_id: str,
    participant_id: Optional[str] = Query(None, description="Filter by participant ID"),
    speech_only: bool = Query(False, description="Filter only chunks with active speech detected")
):
    """
    Returns processed audio stream chunks for a meeting session.
    """
    audio_chunks_col = get_audio_chunks_collection()
    query = {"session_id": session_id}
    
    if participant_id:
        query["participant_id"] = participant_id
    if speech_only:
        query["is_speech"] = True

    cursor = audio_chunks_col.find(query).sort("start_timestamp", 1)
    return [VADAnalysisResponse(**format_doc(doc)) for doc in cursor]
