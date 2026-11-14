from pydantic import BaseModel, Field
from typing import Optional

class VADProcessRequest(BaseModel):
    meeting_id: str = Field(..., description="Meeting ID, e.g. MEETING_001")
    participant_id: str = Field(..., description="Participant User ID, e.g. USER_003")
    start_time: float = Field(..., description="Audio segment start time in seconds", example=72.5)
    end_time: float = Field(..., description="Audio segment end time in seconds", example=76.2)
    audio_base64: Optional[str] = Field(None, description="Base64 encoded audio stream bytes")
    sample_rate: int = Field(16000, description="Audio sample rate in Hz")

class VADSegmentResponse(BaseModel):
    id: str
    segment_id: str
    meeting_id: str
    participant_id: str
    start_time: float
    end_time: float
    duration: float
    speech_detected: bool
    confidence: float
    energy_db: float
    created_at: str
