from datetime import datetime
import uuid

class TranscriptModel:
    """
    Helper structure for speaker-attributed transcript documents stored in MongoDB collection `transcripts`.
    """
    @staticmethod
    def create_document(
        meeting_id: str,
        participant_id: str,
        speaker_name: str,
        start_time: float,
        end_time: float,
        text: str,
        confidence: float = 0.95
    ) -> dict:
        now = datetime.utcnow().isoformat()
        seq = uuid.uuid4().hex[:8].upper()
        transcript_id = f"TRNS_{seq}"
        duration = round(max(0.0, end_time - start_time), 2)

        return {
            "transcript_id": transcript_id,
            "meeting_id": meeting_id,
            "participant_id": participant_id,
            "speaker_name": speaker_name,
            "start_time": start_time,
            "end_time": end_time,
            "duration": duration,
            "text": text,
            "confidence": confidence,
            "created_at": now
        }
