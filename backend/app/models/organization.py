from datetime import datetime
import uuid

class OrganizationModel:
    """
    Helper structure for Organization MongoDB collection documents.
    """
    @staticmethod
    def create_document(
        name: str,
        domain: str = "example.com",
        org_id: str = None
    ) -> dict:
        now = datetime.utcnow().isoformat()
        if not org_id:
            org_seq = uuid.uuid4().hex[:6].upper()
            org_id = f"ORG_{org_seq}"

        return {
            "org_id": org_id,
            "name": name,
            "domain": domain.lower().strip(),
            "status": "active",
            "created_at": now,
            "updated_at": now
        }
