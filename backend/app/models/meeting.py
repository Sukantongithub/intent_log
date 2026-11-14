from datetime import datetime
import uuid

class MeetingModel:
    """
    Helper structure for Meeting MongoDB collection documents.
    Supports Google Meet style meeting_code (e.g., 'abc-defg-hij'), share_url, and room status.
    """
    @staticmethod
    def generate_meeting_code() -> str:
        s = uuid.uuid4().hex[:9]
        return f"{s[:3]}-{s[3:7]}-{s[7:]}"

    @staticmethod
    def create_document(
        title: str,
        date: str,
        transcript: str = "",
        summary: str = "",
        meeting_code: str = None,
        status: str = "scheduled",
        org_id: str = "ORG_ACME"
    ) -> dict:
        now = datetime.utcnow().isoformat()
        if not meeting_code:
            meeting_code = MeetingModel.generate_meeting_code()

        share_url = f"http://localhost:5173/room/{meeting_code}"

        return {
            "title": title,
            "date": date,
            "meeting_code": meeting_code,
            "share_url": share_url,
            "status": status, # scheduled, live, completed
            "transcript": transcript,
            "summary": summary,
            "org_id": org_id or "ORG_ACME",
            "created_at": now,
            "updated_at": now
        }
