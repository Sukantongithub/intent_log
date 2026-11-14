from datetime import datetime
import uuid

class ParticipantModel:
    """
    Helper structure for Participant MongoDB documents.
    """
    @staticmethod
    def create_document(
        name: str,
        email: str = None,
        mic_id: str = None
    ) -> dict:
        now = datetime.utcnow().isoformat()
        participant_seq = uuid.uuid4().hex[:6].upper()
        participant_id = f"USER_{participant_seq}"
        
        # If mic_id not specified, generate default mic mapping
        if not mic_id:
            mic_id = f"mic_{participant_seq.lower()}"

        return {
            "participant_id": participant_id,
            "name": name,
            "email": email,
            "mic_id": mic_id,
            "created_at": now,
            "updated_at": now
        }
