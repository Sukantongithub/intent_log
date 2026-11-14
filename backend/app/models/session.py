from datetime import datetime
import uuid
from typing import List, Dict, Any


class SessionModel:
    """
    Helper structure for Meeting Session MongoDB documents.
    """
    @staticmethod
    def create_document(
        title: str,
        participants: List[dict]
    ) -> dict:
        now = datetime.utcnow().isoformat()
        session_seq = uuid.uuid4().hex[:8].upper()
        session_id = f"SESS_{session_seq}"

        return {
            "session_id": session_id,
            "title": title,
            "participants": participants,
            "status": "active",
            "created_at": now,
            "updated_at": now
        }
