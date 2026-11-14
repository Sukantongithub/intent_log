from datetime import datetime
import uuid
import base64

class ParticipantStreamModel:
    """
    Helper for participant-specific audio stream connections and raw stream chunk documents.
    """
    @staticmethod
    def create_stream_connection_document(meeting_id: str, user_id: str, status: str = "connected") -> dict:
        now = datetime.utcnow().isoformat()
        stream_id = f"STREAM_{meeting_id}_{user_id}"

        return {
            "stream_id": stream_id,
            "meeting_id": meeting_id,
            "user_id": user_id,
            "status": status,
            "timestamp": now,
            "created_at": now
        }

    @staticmethod
    def create_stream_chunk_document(
        meeting_id: str,
        user_id: str,
        start_time: float,
        end_time: float,
        audio_base64: str = None
    ) -> dict:
        now = datetime.utcnow().isoformat()
        seq = uuid.uuid4().hex[:8].upper()
        chunk_id = f"RAW_CHUNK_{seq}"
        stream_id = f"STREAM_{meeting_id}_{user_id}"
        duration = round(max(0.0, end_time - start_time), 2)
        bytes_received = len(base64.b64decode(audio_base64)) if audio_base64 else 0

        return {
            "chunk_id": chunk_id,
            "meeting_id": meeting_id,
            "user_id": user_id,
            "stream_id": stream_id,
            "start_time": start_time,
            "end_time": end_time,
            "duration": duration,
            "audio_base64": audio_base64,
            "bytes_received": bytes_received,
            "created_at": now
        }
