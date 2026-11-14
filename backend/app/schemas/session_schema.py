from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime

class StreamMapping(BaseModel):
    participant_id: str = Field(..., description="Unique participant identifier, e.g., USER_003")
    participant_name: str = Field(..., description="Name of the participant", example="Nithi")
    mic_id: str = Field(..., description="Hardware or soft mic ID", example="Mic 3")
    audio_stream_id: str = Field(..., description="Dedicated participant audio stream ID", example="audio_stream_003")

class SessionCreate(BaseModel):
    title: str = Field(..., description="Meeting Title / Topic", example="Sprint Planning & Action Item Sync")
    participants: List[StreamMapping] = Field(..., description="List of participant-to-audio-stream mappings")

class SessionResponse(BaseModel):
    id: str
    session_id: str
    title: str
    participants: List[StreamMapping]
    status: str = "active"
    created_at: str
