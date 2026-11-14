from pydantic import BaseModel, Field
from typing import Optional, List

class AudioChunkUpload(BaseModel):
    participant_id: str = Field(..., description="Participant ID, e.g., USER_003")
    audio_stream_id: str = Field(..., description="Participant audio stream ID, e.g., audio_stream_003")
    start_timestamp: float = Field(..., description="Segment start timestamp in seconds", example=80.0)
    end_timestamp: float = Field(..., description="Segment end timestamp in seconds", example=83.0)
    audio_data_base64: Optional[str] = Field(None, description="Base64 encoded audio payload")
    audio_format: str = Field("wav", description="Audio encoding format, e.g. wav or pcm")
    sample_rate: int = Field(16000, description="Audio sample rate in Hz")

class ParticipantAudioStreamPayload(BaseModel):
    meeting_id: str = Field(..., description="Meeting ID, e.g., MEETING_001")
    user_id: str = Field(..., description="Participant User ID, e.g., USER_003")
    start_time: float = Field(..., description="Stream segment start time in seconds", example=10.5)
    end_time: float = Field(..., description="Stream segment end time in seconds", example=14.2)
    audio_base64: Optional[str] = Field(None, description="Raw PCM or WAV base64 encoded audio payload")
    sample_rate: int = Field(16000, description="Audio sample rate in Hz")

class StreamConnectionResponse(BaseModel):
    stream_id: str
    meeting_id: str
    user_id: str
    status: str # connected | disconnected
    timestamp: str

class AudioStreamChunkResponse(BaseModel):
    id: str
    chunk_id: str
    meeting_id: str
    user_id: str
    stream_id: str
    start_time: float
    end_time: float
    duration: float
    bytes_received: int
    created_at: str

class VADAnalysisResponse(BaseModel):
    chunk_id: str
    session_id: str
    participant_id: str
    audio_stream_id: str
    start_timestamp: float
    end_timestamp: float
    duration: float
    is_speech: bool
    confidence: float
    energy_db: float
    decision: str = Field(..., description="SPEECH_DETECTED or SILENCE_IGNORED")
    routed_to_stt: bool
