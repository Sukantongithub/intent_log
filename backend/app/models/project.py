from datetime import datetime
import uuid
from typing import List, Optional, Dict, Any

class ProjectModel:
    """
    Helper structure for Project MongoDB collection documents.
    """
    @staticmethod
    def create_document(
        name: str,
        key: Optional[str] = None,
        description: str = "",
        status: str = "In Progress",
        priority: str = "Medium",
        org_id: Optional[str] = None,
        lead_name: str = "Unassigned",
        team_members: Optional[List[str]] = None,
        start_date: Optional[str] = None,
        target_date: Optional[str] = None,
        progress: int = 0,
        budget: Optional[str] = None,
        milestones: Optional[List[Dict[str, Any]]] = None,
        project_id: Optional[str] = None
    ) -> dict:
        now = datetime.utcnow().isoformat()
        
        # Auto-generate a project key if none provided (e.g. "PRJ-3A1B")
        if not key:
            words = [w for w in name.split() if w.isalnum()]
            prefix = "".join([w[0].upper() for w in words[:3]]) or "PRJ"
            suffix = uuid.uuid4().hex[:4].upper()
            key = f"{prefix}-{suffix}"
            
        if not project_id:
            project_id = f"PRJ_{uuid.uuid4().hex[:8].upper()}"

        return {
            "project_id": project_id,
            "name": name.strip(),
            "key": key.strip().upper(),
            "description": description.strip(),
            "status": status,  # "Planning", "In Progress", "On Hold", "Completed"
            "priority": priority,  # "High", "Medium", "Low"
            "org_id": org_id,
            "lead_name": lead_name,
            "team_members": team_members or [],
            "start_date": start_date or now[:10],
            "target_date": target_date or "",
            "progress": max(0, min(100, int(progress))),
            "budget": budget or "",
            "milestones": milestones or [],
            "created_at": now,
            "updated_at": now
        }
