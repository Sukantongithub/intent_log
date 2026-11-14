from pydantic import BaseModel, Field
from typing import Optional, List

class TranscriptRequest(BaseModel):
    meeting_id: Optional[str] = Field(None, description="Meeting ID, e.g. MEETING_001")
    participant_id: Optional[str] = Field(None, description="Participant User ID, e.g. USER_003")
    speaker_name: Optional[str] = Field("Speaker", description="Speaker display name, e.g. Nithi")
    start_time: float = Field(0.0, description="Speech start time in seconds", example=72.5)
    end_time: float = Field(1.0, description="Speech end time in seconds", example=76.2)
    audio_base64: Optional[str] = Field(None, description="Base64 encoded speech audio bytes")
    transcript_text: Optional[str] = Field(None, description="Explicit transcript text if pre-processed")

class TranscriptSegmentResponse(BaseModel):
    id: str
    transcript_id: str
    meeting_id: str
    participant_id: str
    speaker_name: str
    start_time: float
    end_time: float
    duration: float
    text: str
    confidence: float
    created_at: str

class MergedTranscriptSegmentResponse(BaseModel):
    id: str
    transcript_id: str
    meeting_id: str
    participant_id: str
    speaker_name: str
    start_time: float
    end_time: float
    duration: float
    text: str
    confidence: float
    has_overlap: bool = False
    created_at: str

class MergedTranscriptListResponse(BaseModel):
    meeting_id: str
    total_segments: int
    overlapping_segments_count: int
    merged_transcript: List[MergedTranscriptSegmentResponse]
