from datetime import datetime
import uuid

ROLE_LEVELS = {
    "super_admin": 5,
    "org_admin": 4,
    "manager": 3,
    "team_lead": 2,
    "employee": 1
}

ROLE_DISPLAY_NAMES = {
    "super_admin": "Application Super Admin",
    "org_admin": "Organization Admin",
    "manager": "Manager",
    "team_lead": "Team Lead",
    "employee": "Employee"
}

class UserModel:
    """
    Helper structure for User MongoDB collection documents supporting multi-level RBAC:
    - super_admin (Level 5): Application Super Admin
    - org_admin (Level 4): Organization Admin
    - manager (Level 3): Manager
    - team_lead (Level 2): Team Lead
    - employee (Level 1): Employee
    """
    @staticmethod
    def create_document(
        name: str, 
        email: str, 
        password: str = "password123",
        role: str = "employee",
        org_id: str = "ORG_ACME",
        reports_to: str = None,
        user_id: str = None
    ) -> dict:
        now = datetime.utcnow().isoformat()
        role_clean = role.lower().strip()
        if role_clean not in ROLE_LEVELS:
            role_clean = "employee"

        if not user_id:
            user_seq = uuid.uuid4().hex[:6].upper()
            user_id = f"USER_{user_seq}"

        return {
            "user_id": user_id,
            "name": name,
            "email": email.lower().strip(),
            "password": password,
            "role": role_clean,
            "role_level": ROLE_LEVELS[role_clean],
            "role_display_name": ROLE_DISPLAY_NAMES[role_clean],
            "org_id": org_id,
            "reports_to": reports_to,  # Superior's user_id
            "status": "active",  # 'active' or 'suspended'
            "last_login": now,
            "created_at": now,
            "updated_at": now
        }

class MeetingParticipantModel:
    """
    Helper structure for Meeting Participant MongoDB collection documents.
    """
    @staticmethod
    def create_document(
        meeting_id: str,
        user_id: str,
        display_name: str,
        mic_enabled: bool = True
    ) -> dict:
        now = datetime.utcnow().isoformat()

        return {
            "meeting_id": meeting_id,
            "user_id": user_id,
            "display_name": display_name,
            "mic_enabled": mic_enabled,
            "status": "active",
            "joined_at": now,
            "updated_at": now
        }
