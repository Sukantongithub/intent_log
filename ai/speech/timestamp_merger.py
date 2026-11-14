from typing import List, Dict, Any

class TimestampMergeEngine:
    """
    Timestamp Merge Engine.
    Merges multi-participant speaker transcripts into a chronologically ordered,
    speaker-attributed meeting transcript while detecting and tagging overlapping speaker segments.
    """
    @staticmethod
    def merge_speaker_transcripts(transcripts: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Sorts transcripts chronologically by start_time and identifies overlapping speaker segments.
        """
        if not transcripts:
            return []

        # Sort strictly by start_time ascending, then end_time ascending
        sorted_transcripts = sorted(
            transcripts,
            key=lambda t: (t.get("start_time", 0.0), t.get("end_time", 0.0))
        )

        merged_result = []
        n = len(sorted_transcripts)

        for i in range(n):
            curr = dict(sorted_transcripts[i])
            curr_start = curr.get("start_time", 0.0)
            curr_end = curr.get("end_time", 0.0)
            curr_speaker = curr.get("participant_id") or curr.get("speaker_id")

            has_overlap = False

            # Check overlap against all other segments
            for j in range(n):
                if i == j:
                    continue
                other = sorted_transcripts[j]
                other_start = other.get("start_time", 0.0)
                other_end = other.get("end_time", 0.0)

                # Check interval overlap: max(start1, start2) < min(end1, end2)
                overlap_start = max(curr_start, other_start)
                overlap_end = min(curr_end, other_end)

                if overlap_start < overlap_end:
                    has_overlap = True
                    break

            curr["has_overlap"] = has_overlap
            merged_result.append(curr)

        return merged_result

timestamp_merger = TimestampMergeEngine()
