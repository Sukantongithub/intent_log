import base64
import math
import struct
import logging
from typing import Tuple, Dict, Any

logger = logging.getLogger(__name__)

class VADEngine:
    """
    Voice Activity Detection (VAD) Engine.
    Analyzes per-participant audio streams to determine whether active speech is present,
    preventing silent mic streams (unmuted but inactive) from triggering STT transcription.
    """
    def __init__(self, energy_threshold: float = 0.015):
        self.energy_threshold = energy_threshold

    def analyze_audio_chunk(
        self,
        audio_base64: str = None,
        sample_rate: int = 16000,
        audio_format: str = "wav"
    ) -> Dict[str, Any]:
        """
        Processes audio data payload and returns speech detection metrics.
        """
        if not audio_base64:
            # Silence / empty stream fallback
            return {
                "is_speech": False,
                "confidence": 0.0,
                "energy_db": -60.0,
                "decision": "SILENCE_IGNORED",
                "routed_to_stt": False
            }

        try:
            raw_bytes = base64.b64decode(audio_base64)
        except Exception as e:
            logger.error(f"Failed to decode base64 audio payload: {e}")
            return {
                "is_speech": False,
                "confidence": 0.0,
                "energy_db": -60.0,
                "decision": "SILENCE_IGNORED",
                "routed_to_stt": False
            }

        if len(raw_bytes) == 0:
            return {
                "is_speech": False,
                "confidence": 0.0,
                "energy_db": -60.0,
                "decision": "SILENCE_IGNORED",
                "routed_to_stt": False
            }

        # Calculate Root Mean Square (RMS) energy from 16-bit PCM samples
        sample_count = len(raw_bytes) // 2
        if sample_count == 0:
            return {
                "is_speech": False,
                "confidence": 0.0,
                "energy_db": -60.0,
                "decision": "SILENCE_IGNORED",
                "routed_to_stt": False
            }

        try:
            # Unpack 16-bit signed integers (little-endian)
            samples = struct.unpack(f"<{sample_count}h", raw_bytes[:sample_count * 2])
            sum_squares = sum((s / 32768.0) ** 2 for s in samples)
            rms = math.sqrt(sum_squares / sample_count)
        except Exception:
            # Fallback byte average energy
            rms = sum(abs(b - 128) for b in raw_bytes) / (len(raw_bytes) * 128.0)

        # Convert RMS to dB
        energy_db = 20 * math.log10(rms) if rms > 1e-6 else -60.0

        # Confidence calculation relative to threshold
        is_speech = rms >= self.energy_threshold
        confidence = min(1.0, max(0.0, (rms / (self.energy_threshold * 2.0))))

        decision = "SPEECH_DETECTED" if is_speech else "SILENCE_IGNORED"

        return {
            "is_speech": is_speech,
            "confidence": round(confidence, 3),
            "energy_db": round(energy_db, 2),
            "decision": decision,
            "routed_to_stt": is_speech
        }

# Global VAD Service Singleton
vad_service = VADEngine()
