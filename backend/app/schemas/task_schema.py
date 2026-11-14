from pydantic import BaseModel, Field, model_validator
from typing import Optional
from enum import Enum

class PriorityEnum(str, Enum):
    HIGH = "High"
    MEDIUM = "Medium"
    LOW = "Low"

class StatusEnum(str, Enum):
    PENDING = "Pending"
    IN_PROGRESS = "In Progress"
    COMPLETED = "Completed"
    DELAYED = "Delayed"

class TaskBase(BaseModel):
    person: Optional[str] = Field(None, example="John", description="Person responsible for the task")
    owner: Optional[str] = Field(None, example="John", description="Owner responsible for the task")
    task: str = Field(..., example="Complete login module", description="Description of the action item")
    deadline: Optional[str] = Field(None, example="Friday", description="Task deadline if specified")
    priority: str = Field("Medium", example="High", description="Task priority (High, Medium, Low)")
    status: str = Field("Pending", example="Pending", description="Task status (Pending, In Progress, Completed, Delayed)")
    deliverable: Optional[str] = Field("Target Artifact", example="React Dashboard UI", description="Deliverable document/artifact")
    org_id: Optional[str] = Field("ORG_ACME", description="Organization ID task belongs to")

    @model_validator(mode='before')
    @classmethod
    def populate_person_and_owner(cls, values):
        if isinstance(values, dict):
            p = values.get("person") or values.get("owner") or "Unassigned"
            values["person"] = p
            values["owner"] = p
        return values

class TaskCreate(TaskBase):
    pass

class TaskStatusUpdate(BaseModel):
    status: str = Field(..., example="Completed", description="New status for the task")

class TaskResponse(TaskBase):
    id: str = Field(..., description="Unique MongoDB Task ID")
    task_id: Optional[str] = Field(None, description="Formatted Task ID")
    meeting_id: str = Field(..., description="Associated Meeting ID")
    org_id: Optional[str] = Field("ORG_ACME", description="Organization ID task belongs to")
    created_at: str = Field(..., description="Task creation timestamp")

    class Config:
        from_attributes = True
