from pydantic import BaseModel, Field
from typing import List, Optional, Dict
from app.schemas.task_schema import TaskResponse

class MeetingScheduleRequest(BaseModel):
    title: Optional[str] = Field("Google Meet Session", description="Title of the meeting")
    date: Optional[str] = Field(None, description="Date of the meeting (YYYY-MM-DD)")

class MeetingCreate(BaseModel):
    title: str = Field(..., example="Project Discussion", description="Title of the meeting")
    date: str = Field(..., example="2026-08-11", description="Date of the meeting")
    transcript: str = Field(..., example="John will complete the frontend by Friday.", description="Raw text transcript of the meeting")

class MeetingResponse(BaseModel):
    id: str = Field(..., example="64d3e5f2a1b2c3d4e5f6a7b9", description="Unique MongoDB Meeting ID")
    title: str = Field(..., example="Project Discussion")
    date: str = Field(..., example="2026-08-11")
    meeting_code: Optional[str] = Field(None, description="Google Meet style code e.g. abc-defg-hij")
    share_url: Optional[str] = Field(None, description="Shareable join link")
    status: Optional[str] = Field("completed", description="Status: scheduled, live, completed")
    transcript: str = Field(default="")
    summary: str = Field(default="")
    tasks: List[TaskResponse] = Field(default_factory=list)
    created_at: str = Field(...)
    updated_at: str = Field(...)

    class Config:
        from_attributes = True

class MeetingListResponse(BaseModel):
    meetings: List[MeetingResponse]
    total: int
    page: int
    limit: int

class ProgressValidationRequest(BaseModel):
    progress_update: str = Field(..., description="Text description of latest task progress updates")

class ProgressValidationResponse(BaseModel):
    completed: List[str] = Field(default_factory=list)
    pending: List[str] = Field(default_factory=list)
    delayed: List[str] = Field(default_factory=list)
    unmentioned: List[str] = Field(default_factory=list)
    explanations: Optional[Dict[str, str]] = Field(default=None)
