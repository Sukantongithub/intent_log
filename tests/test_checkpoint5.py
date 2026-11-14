import requests
import uuid
import sys

BASE_URL = "http://127.0.0.1:8000"

def run_checkpoint5_test():
    print("==================================================")
    print("   IntenT_loG — CHECKPOINT 5 VERIFICATION TEST   ")
    print("==================================================")

    meeting_id = f"MEETING_CHK5_{uuid.uuid4().hex[:6].upper()}"


    # 1. Register & Join 4 Participants
    print("\n[1] Registering & Joining Participants...")
    participants_input = [
        {"name": "Sujith", "email": "sujith_chk5@example.com"},
        {"name": "Sukant", "email": "sukant_chk5@example.com"},
        {"name": "Nithi", "email": "nithi_chk5@example.com"},
        {"name": "Viswaa", "email": "viswaa_chk5@example.com"}
    ]

    user_ids = {}
    for p in participants_input:
        u = requests.post(f"{BASE_URL}/api/users/register", json=p).json()
        u_id = u["user_id"]
        user_ids[p["name"]] = u_id
        requests.post(f"{BASE_URL}/api/meetings/{meeting_id}/join", json={"user_id": u_id, "display_name": p["name"], "mic_enabled": True})
        print(f"  Joined: {p['name']} -> {u_id}")

    # 2. Insert Transcript Segments with Overlapping Windows
    print("\n[2] Inserting Speaker Transcripts with Overlapping Timestamps...")
    test_segments = [
        {
            "user_id": user_ids["Sujith"],
            "speaker_name": "Sujith",
            "start_time": 10.0,
            "end_time": 14.0,
            "text": "We need to finalize the project architecture."
        },
        {
            "user_id": user_ids["Sukant"],
            "speaker_name": "Sukant",
            "start_time": 12.0,
            "end_time": 15.0,
            "text": "I agree, let's select FastAPI and React."
        },
        {
            "user_id": user_ids["Nithi"],
            "speaker_name": "Nithi",
            "start_time": 72.5,
            "end_time": 76.2,
            "text": "The deadline should be Friday."
        },
        {
            "user_id": user_ids["Viswaa"],
            "speaker_name": "Viswaa",
            "start_time": 73.5,
            "end_time": 77.0,
            "text": "No, Monday would be better."
        }
    ]

    for seg in test_segments:
        res = requests.post(
            f"{BASE_URL}/api/meetings/{meeting_id}/participants/{seg['user_id']}/transcribe",
            json={
                "meeting_id": meeting_id,
                "participant_id": seg["user_id"],
                "speaker_name": seg["speaker_name"],
                "start_time": seg["start_time"],
                "end_time": seg["end_time"],
                "transcript_text": seg["text"]
            }
        )
        assert res.status_code == 201
        print(f"  Ingested [{seg['start_time']}s - {seg['end_time']}s] {seg['speaker_name']}: \"{seg['text']}\"")

    # 3. Call Timestamp Merge Endpoint
    print(f"\n[3] Calling GET /api/meetings/{meeting_id}/merged-transcript...")
    res = requests.get(f"{BASE_URL}/api/meetings/{meeting_id}/merged-transcript")
    assert res.status_code == 200
    data = res.json()

    print(f"  Total Segments in Merged Timeline: {data['total_segments']}")
    print(f"  Overlapping Segments Count: {data['overlapping_segments_count']}")

    merged_timeline = data["merged_transcript"]

    # 4. Verify Chronological Sorting
    print("\n[4] Verifying Chronological Order & Overlap Tagging...")
    prev_start = -1.0
    for idx, item in enumerate(merged_timeline):
        print(f"  [{idx+1}] [{item['start_time']}s - {item['end_time']}s] {item['speaker_name']} ({item['participant_id']}) -> Overlap: {item['has_overlap']} | Text: \"{item['text']}\"")
        assert item["start_time"] >= prev_start, "Merged timeline must be strictly ordered by start_time!"
        prev_start = item["start_time"]
        assert item["has_overlap"] is True, f"Segment for {item['speaker_name']} should be tagged has_overlap=True"

    assert len(merged_timeline) == 4
    assert data["overlapping_segments_count"] == 4

    print("\n==================================================")
    print(" CHECKPOINT 5 VERIFICATION PASSED SUCCESSFULLY!   ")
    print("==================================================")
    return True

if __name__ == "__main__":
    success = run_checkpoint5_test()
    if not success:
        sys.exit(1)
