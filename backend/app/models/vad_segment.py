from datetime import datetime
import uuid

class VADSegmentModel:
    """
    Helper structure for timestamped VAD segment documents stored in MongoDB collection `vad_segments`.
    """
    @staticmethod
    def create_document(
        meeting_id: str,
        participant_id: str,
        start_time: float,
        end_time: float,
        speech_detected: bool,
        confidence: float,
        energy_db: float
    ) -> dict:
        now = datetime.utcnow().isoformat()
        seq = uuid.uuid4().hex[:8].upper()
        segment_id = f"VAD_{seq}"
        duration = round(max(0.0, end_time - start_time), 2)

        return {
            "segment_id": segment_id,
            "meeting_id": meeting_id,
            "participant_id": participant_id,
            "start_time": start_time,
            "end_time": end_time,
            "duration": duration,
            "speech_detected": speech_detected,
            "confidence": confidence,
            "energy_db": energy_db,
            "created_at": now
        }
