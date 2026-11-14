import base64
import math
import struct
import logging
from typing import Dict, Any

logger = logging.getLogger(__name__)

class VADProcessor:
    """
    Independent Voice Activity Detection (VAD) Processor.
    Evaluates per-participant audio streams to detect speech segments and output timestamped VAD metadata.
    """
    def __init__(self, energy_threshold: float = 0.015):
        self.energy_threshold = energy_threshold

    def process_participant_stream(
        self,
        meeting_id: str,
        participant_id: str,
        start_time: float,
        end_time: float,
        audio_base64: str = None,
        sample_rate: int = 16000
    ) -> Dict[str, Any]:
        """
        Processes audio data for a single participant stream independently.
        Returns timestamped VAD metadata.
        """
        duration = round(max(0.0, end_time - start_time), 2)

        if not audio_base64 or len(audio_base64) == 0:
            return {
                "meeting_id": meeting_id,
                "participant_id": participant_id,
                "start_time": start_time,
                "end_time": end_time,
                "duration": duration,
                "speech_detected": False,
                "confidence": 0.0,
                "energy_db": -60.0
            }

        try:
            raw_bytes = base64.b64decode(audio_base64)
        except Exception as e:
            logger.error(f"Base64 decoding failed for participant {participant_id}: {e}")
            return {
                "meeting_id": meeting_id,
                "participant_id": participant_id,
                "start_time": start_time,
                "end_time": end_time,
                "duration": duration,
                "speech_detected": False,
                "confidence": 0.0,
                "energy_db": -60.0
            }

        if len(raw_bytes) == 0:
            return {
                "meeting_id": meeting_id,
                "participant_id": participant_id,
                "start_time": start_time,
                "end_time": end_time,
                "duration": duration,
                "speech_detected": False,
                "confidence": 0.0,
                "energy_db": -60.0
            }

        sample_count = len(raw_bytes) // 2
        if sample_count == 0:
            return {
                "meeting_id": meeting_id,
                "participant_id": participant_id,
                "start_time": start_time,
                "end_time": end_time,
                "duration": duration,
                "speech_detected": False,
                "confidence": 0.0,
                "energy_db": -60.0
            }

        try:
            samples = struct.unpack(f"<{sample_count}h", raw_bytes[:sample_count * 2])
            sum_squares = sum((s / 32768.0) ** 2 for s in samples)
            rms = math.sqrt(sum_squares / sample_count)
        except Exception:
            rms = sum(abs(b - 128) for b in raw_bytes) / (len(raw_bytes) * 128.0)

        energy_db = 20 * math.log10(rms) if rms > 1e-6 else -60.0
        speech_detected = rms >= self.energy_threshold
        confidence = min(1.0, max(0.0, rms / (self.energy_threshold * 2.0)))

        return {
            "meeting_id": meeting_id,
            "participant_id": participant_id,
            "start_time": start_time,
            "end_time": end_time,
            "duration": duration,
            "speech_detected": speech_detected,
            "confidence": round(confidence, 3),
            "energy_db": round(energy_db, 2)
        }

vad_processor = VADProcessor()
