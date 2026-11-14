from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class ParticipantCreate(BaseModel):
    name: str = Field(..., description="Participant full name", example="Nithi")
    email: Optional[str] = Field(None, description="Participant email address", example="nithi@example.com")
    mic_id: Optional[str] = Field(None, description="Designated Mic ID or Audio Device ID", example="mic_003")

class ParticipantResponse(BaseModel):
    id: str
    participant_id: str
    name: str
    email: Optional[str] = None
    mic_id: str
    created_at: str
