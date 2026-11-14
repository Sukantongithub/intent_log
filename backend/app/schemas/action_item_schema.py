from pydantic import BaseModel, Field, model_validator
from typing import List, Optional, Dict, Any

class ActionItemTask(BaseModel):
    owner: Optional[str] = Field(None, description="Task owner / responsible participant (null if unassigned)")
    task: str = Field(..., description="Action item description")
    deadline: Optional[str] = Field(None, description="Task deadline (null if not specified)")
    priority: str = Field("Medium", description="Priority: High, Medium, or Low")
    deliverable: str = Field("Target Artifact", description="Target deliverable document/artifact")
    speaker: Optional[str] = Field(None, description="Preserved speaker identity (Principle 5)")
    source_timestamp: Optional[str] = Field(None, description="Preserved source timestamp window (Principle 5)")

class ActionItemExtractionResponse(BaseModel):
    id: str
    meeting_id: str
    summary: str
    decisions: List[Any] = []
    discussions: List[Any] = []
    tasks: List[ActionItemTask] = []
    created_at: str

class TaskResponse(BaseModel):
    id: str = Field(..., description="MongoDB Document ID")
    task_id: str = Field("TASK_LEGACY", description="Formatted Task ID")
    meeting_id: str = Field(..., description="Associated Meeting ID")
    owner: Optional[str] = Field(None, description="Task owner (null if unspecified)")
    person: Optional[str] = Field(None, description="Task person alias")
    task: str = Field(..., description="Task description")
    deadline: Optional[str] = Field(None, description="Deadline (null if unspecified)")
    priority: str = Field("Medium", description="Priority")
    status: str = Field("Pending", description="Task status")
    deliverable: str = Field("Target Artifact", description="Deliverable document/artifact")
    speaker: Optional[str] = Field(None, description="Preserved transcript speaker (Principle 5)")
    source_timestamps: Optional[Dict[str, Any]] = Field(None, description="Preserved transcript timestamp evidence (Principle 5)")
    created_at: str = Field(..., description="Creation timestamp")

    @model_validator(mode='before')
    @classmethod
    def populate_fallback_fields(cls, values):
        if isinstance(values, dict):
            p = values.get("owner") or values.get("person")
            values["owner"] = p
            values["person"] = p
            if not values.get("task_id"):
                values["task_id"] = f"TASK_{str(values.get('_id', values.get('id', '0000')))[:6]}"
            if not values.get("deliverable"):
                values["deliverable"] = "Target Deliverable Artifact"
            if not values.get("created_at"):
                from datetime import datetime
                values["created_at"] = datetime.utcnow().isoformat()
        return values

class TaskStatusUpdatePayload(BaseModel):
    status: str = Field(..., description="New status: Pending, In Progress, Completed, Delayed")
