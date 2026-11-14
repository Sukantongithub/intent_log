from fastapi import APIRouter, HTTPException, Query, status
from typing import List, Optional
from app.database.mongodb import (
    get_meeting_participants_collection,
    get_participant_streams_collection,
    get_raw_stream_chunks_collection,
    format_doc
)
from app.models.stream import ParticipantStreamModel
from app.schemas.audio_schema import (
    ParticipantAudioStreamPayload,
    StreamConnectionResponse,
    AudioStreamChunkResponse
)

router = APIRouter(prefix="/api/meetings", tags=["Participant Audio Streaming (Checkpoint 2)"])

@router.post("/{meeting_id}/participants/{user_id}/stream/connect", response_model=StreamConnectionResponse, summary="Connect participant-specific audio stream")
def connect_audio_stream(meeting_id: str, user_id: str):
    """
    Connects participant microphone audio stream explicitly associated with meeting_id and user_id.
    """
    part_col = get_meeting_participants_collection()
    part = part_col.find_one({"meeting_id": meeting_id, "user_id": user_id})
    if not part:
        raise HTTPException(status_code=404, detail=f"Participant '{user_id}' not in meeting '{meeting_id}'.")

    streams_col = get_participant_streams_collection()
    doc = ParticipantStreamModel.create_stream_connection_document(meeting_id, user_id, status="connected")
    streams_col.update_one(
        {"meeting_id": meeting_id, "user_id": user_id},
        {"$set": doc},
        upsert=True
    )
    res_doc = streams_col.find_one({"meeting_id": meeting_id, "user_id": user_id})
    return StreamConnectionResponse(**format_doc(res_doc))

@router.post("/{meeting_id}/participants/{user_id}/stream/disconnect", response_model=StreamConnectionResponse, summary="Disconnect participant-specific audio stream")
def disconnect_audio_stream(meeting_id: str, user_id: str):
    """
    Disconnects participant microphone audio stream.
    """
    streams_col = get_participant_streams_collection()
    doc = ParticipantStreamModel.create_stream_connection_document(meeting_id, user_id, status="disconnected")
    streams_col.update_one(
        {"meeting_id": meeting_id, "user_id": user_id},
        {"$set": doc},
        upsert=True
    )
    res_doc = streams_col.find_one({"meeting_id": meeting_id, "user_id": user_id})
    return StreamConnectionResponse(**format_doc(res_doc))

@router.post("/{meeting_id}/participants/{user_id}/audio-stream", response_model=AudioStreamChunkResponse, status_code=status.HTTP_201_CREATED, summary="Ingest participant microphone audio stream payload")
def ingest_participant_audio_stream(meeting_id: str, user_id: str, payload: ParticipantAudioStreamPayload):
    """
    Receives raw participant microphone audio stream payload.
    Crucial requirement: Each stream remains strictly associated with (meeting_id + user_id).
    Do NOT combine participant audio into one anonymous stream.
    """
    part_col = get_meeting_participants_collection()
    part = part_col.find_one({"meeting_id": meeting_id, "user_id": user_id})
    if not part:
        raise HTTPException(status_code=404, detail=f"Participant '{user_id}' not found in meeting '{meeting_id}'.")

    raw_chunks_col = get_raw_stream_chunks_collection()
    doc = ParticipantStreamModel.create_stream_chunk_document(
        meeting_id=meeting_id,
        user_id=user_id,
        start_time=payload.start_time,
        end_time=payload.end_time,
        audio_base64=payload.audio_base64
    )

    res = raw_chunks_col.insert_one(doc)
    doc["_id"] = res.inserted_id

    return AudioStreamChunkResponse(**format_doc(doc))

@router.get("/{meeting_id}/audio-streams", response_model=List[AudioStreamChunkResponse], summary="Retrieve ingested participant audio stream chunks")
def list_meeting_audio_streams(
    meeting_id: str,
    user_id: Optional[str] = Query(None, description="Filter by participant user_id")
):
    """
    Returns ingested audio stream chunks for a meeting, maintaining individual user_id attribution.
    """
    raw_chunks_col = get_raw_stream_chunks_collection()
    query = {"meeting_id": meeting_id}
    if user_id:
        query["user_id"] = user_id

    cursor = raw_chunks_col.find(query).sort("start_time", 1)
    return [AudioStreamChunkResponse(**format_doc(doc)) for doc in cursor]
