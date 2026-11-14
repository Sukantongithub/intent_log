from enum import Enum
from datetime import datetime
from typing import Optional

class PriorityEnum(str, Enum):
    HIGH = "High"
    MEDIUM = "Medium"
    LOW = "Low"

class StatusEnum(str, Enum):
    PENDING = "Pending"
    IN_PROGRESS = "In Progress"
    COMPLETED = "Completed"
    DELAYED = "Delayed"

class TaskModel:
    """
    Helper structure for Task MongoDB collection documents.
    """
    @staticmethod
    def create_document(
        meeting_id: str,
        person: str,
        task: str,
        deadline: Optional[str] = None,
        priority: str = PriorityEnum.MEDIUM.value,
        status: str = StatusEnum.PENDING.value,
        org_id: Optional[str] = "ORG_ACME"
    ) -> dict:
        return {
            "meeting_id": meeting_id,
            "person": person or "Unassigned",
            "task": task,
            "deadline": deadline,
            "priority": priority if priority in [e.value for e in PriorityEnum] else PriorityEnum.MEDIUM.value,
            "status": status if status in [e.value for e in StatusEnum] else StatusEnum.PENDING.value,
            "org_id": org_id or "ORG_ACME",
            "created_at": datetime.utcnow().isoformat()
        }
