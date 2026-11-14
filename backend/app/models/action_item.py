from datetime import datetime
import uuid
from typing import List, Dict, Any

class ActionItemModel:
    """
    Helper structure for Action Item extraction documents in MongoDB collection `action_items`.
    """
    @staticmethod
    def create_document(
        meeting_id: str,
        summary: str,
        decisions: List[str],
        discussions: List[str],
        tasks: List[Dict[str, Any]]
    ) -> dict:
        now = datetime.utcnow().isoformat()
        return {
            "meeting_id": meeting_id,
            "summary": summary,
            "decisions": decisions,
            "discussions": discussions,
            "tasks": tasks,
            "created_at": now,
            "updated_at": now
        }

class TaskDocumentModel:
    """
    Helper structure for individual Task documents in MongoDB collection `tasks`.
    """
    @staticmethod
    def create_document(
        meeting_id: str,
        owner: str,
        task: str,
        deadline: str,
        priority: str = "Medium",
        deliverable: str = "Target Artifact",
        status: str = "Pending"
    ) -> dict:
        now = datetime.utcnow().isoformat()
        seq = uuid.uuid4().hex[:8].upper()
        task_id = f"TASK_{seq}"

        return {
            "task_id": task_id,
            "meeting_id": meeting_id,
            "owner": owner,
            "person": owner, # Compatibility alias
            "task": task,
            "deadline": deadline,
            "priority": priority,
            "status": status,
            "deliverable": deliverable,
            "created_at": now,
            "updated_at": now
        }
