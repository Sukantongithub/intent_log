from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any

class MilestoneSchema(BaseModel):
    id: str = Field(..., description="Unique milestone identifier")
    title: str = Field(..., description="Title of milestone")
    due_date: Optional[str] = Field("", description="Target completion date")
    completed: bool = Field(False, description="Whether milestone is reached")

class MilestoneCreate(BaseModel):
    title: str = Field(..., description="Title of milestone")
    due_date: Optional[str] = Field("", description="Target completion date")

class MilestoneUpdate(BaseModel):
    title: Optional[str] = None
    due_date: Optional[str] = None
    completed: Optional[bool] = None

class ProjectCreate(BaseModel):
    name: str = Field(..., example="AI Audio Pipeline v2")
    key: Optional[str] = Field(None, example="AAP-01")
    description: Optional[str] = Field("", example="Next-gen streaming audio processing and meeting transcription")
    status: Optional[str] = Field("In Progress", example="In Progress")
    priority: Optional[str] = Field("Medium", example="High")
    org_id: Optional[str] = Field(None, example="ORG_ACME")
    lead_name: Optional[str] = Field("Unassigned", example="Viswaa")
    team_members: Optional[List[str]] = Field(default_factory=list, example=["Viswaa", "Nithi", "Sujith"])
    start_date: Optional[str] = Field(None, example="2026-10-01")
    target_date: Optional[str] = Field(None, example="2026-11-15")
    progress: Optional[int] = Field(0, example=25)
    budget: Optional[str] = Field("", example="$15,000")

class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    key: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    lead_name: Optional[str] = None
    team_members: Optional[List[str]] = None
    start_date: Optional[str] = None
    target_date: Optional[str] = None
    progress: Optional[int] = None
    budget: Optional[str] = None

class ProjectResponse(BaseModel):
    id: str
    project_id: Optional[str] = None
    name: str
    key: str
    description: str = ""
    status: str = "In Progress"
    priority: str = "Medium"
    org_id: Optional[str] = None
    lead_name: str = "Unassigned"
    team_members: List[str] = []
    start_date: str = ""
    target_date: str = ""
    progress: int = 0
    budget: str = ""
    milestones: List[Dict[str, Any]] = []
    created_at: str
    updated_at: str

    class Config:
        from_attributes = True
