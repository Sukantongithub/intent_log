from datetime import datetime
import uuid

class AudioChunkModel:
    """
    Helper structure for per-participant audio chunk documents stored in MongoDB.
    """
    @staticmethod
    def create_document(
        session_id: str,
        participant_id: str,
        audio_stream_id: str,
        start_timestamp: float,
        end_timestamp: float,
        is_speech: bool,
        confidence: float,
        energy_db: float,
        decision: str,
        routed_to_stt: bool,
        audio_data_base64: str = None
    ) -> dict:
        now = datetime.utcnow().isoformat()
        chunk_seq = uuid.uuid4().hex[:8].upper()
        chunk_id = f"CHUNK_{chunk_seq}"
        duration = round(max(0.0, end_timestamp - start_timestamp), 2)

        return {
            "chunk_id": chunk_id,
            "session_id": session_id,
            "participant_id": participant_id,
            "audio_stream_id": audio_stream_id,
            "start_timestamp": start_timestamp,
            "end_timestamp": end_timestamp,
            "duration": duration,
            "is_speech": is_speech,
            "confidence": confidence,
            "energy_db": energy_db,
            "decision": decision,
            "routed_to_stt": routed_to_stt,
            "audio_data_base64": audio_data_base64,
            "created_at": now
        }
