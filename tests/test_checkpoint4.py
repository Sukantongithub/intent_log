import requests
import uuid
import sys

BASE_URL = "http://127.0.0.1:8000"

def run_checkpoint4_test():
    print("==================================================")
    print("   IntenT_loG — CHECKPOINT 4 VERIFICATION TEST   ")
    print("==================================================")

    meeting_id = f"MEETING_CHK4_{uuid.uuid4().hex[:6].upper()}"


    # 1. Register & Join Participants
    print("\n[1] Registering & Joining Nithi and Viswaa...")
    nithi = requests.post(f"{BASE_URL}/api/users/register", json={"name": "Nithi", "email": "nithi_stt@example.com"}).json()
    viswaa = requests.post(f"{BASE_URL}/api/users/register", json={"name": "Viswaa", "email": "viswaa_stt@example.com"}).json()

    nithi_id = nithi["user_id"]
    viswaa_id = viswaa["user_id"]

    requests.post(f"{BASE_URL}/api/meetings/{meeting_id}/join", json={"user_id": nithi_id, "display_name": "Nithi", "mic_enabled": True})
    requests.post(f"{BASE_URL}/api/meetings/{meeting_id}/join", json={"user_id": viswaa_id, "display_name": "Viswaa", "mic_enabled": True})

    # 2. Test Step 1: Nithi STT Transcription [72.5s - 76.2s]
    print("\n[2] Testing STT Transcription for Nithi [72.5s - 76.2s]...")
    nithi_transcript_req = {
        "meeting_id": meeting_id,
        "participant_id": nithi_id,
        "speaker_name": "Nithi",
        "start_time": 72.5,
        "end_time": 76.2,
        "transcript_text": "The deadline should be Friday."
    }
    res = requests.post(f"{BASE_URL}/api/meetings/{meeting_id}/participants/{nithi_id}/transcribe", json=nithi_transcript_req)
    assert res.status_code == 201
    n_res = res.json()
    print(f"  Transcript ID: {n_res['transcript_id']} | Speaker: {n_res['speaker_name']} ({n_res['participant_id']})")
    print(f"  Timestamp: [{n_res['start_time']}s - {n_res['end_time']}s] | Text: \"{n_res['text']}\"")

    assert n_res["speaker_name"] == "Nithi"
    assert n_res["start_time"] == 72.5
    assert n_res["end_time"] == 76.2
    assert "Friday" in n_res["text"]
    print("-> Nithi STT Transcription PASSED")

    # 3. Test Step 2: Viswaa STT Transcription [73.5s - 77.0s] (Overlapping Speech)
    print("\n[3] Testing STT Transcription for Viswaa [73.5s - 77.0s] (Overlapping)...")
    viswaa_transcript_req = {
        "meeting_id": meeting_id,
        "participant_id": viswaa_id,
        "speaker_name": "Viswaa",
        "start_time": 73.5,
        "end_time": 77.0,
        "transcript_text": "No, Monday would be better."
    }
    res = requests.post(f"{BASE_URL}/api/meetings/{meeting_id}/participants/{viswaa_id}/transcribe", json=viswaa_transcript_req)
    assert res.status_code == 201
    v_res = res.json()
    print(f"  Transcript ID: {v_res['transcript_id']} | Speaker: {v_res['speaker_name']} ({v_res['participant_id']})")
    print(f"  Timestamp: [{v_res['start_time']}s - {v_res['end_time']}s] | Text: \"{v_res['text']}\"")

    assert v_res["speaker_name"] == "Viswaa"
    assert v_res["start_time"] == 73.5
    assert v_res["end_time"] == 77.0
    assert "Monday" in v_res["text"]
    print("-> Viswaa STT Transcription PASSED")

    # 4. Fetch All Transcripts for Meeting & Verify Timestamp Preservation
    print(f"\n[4] Querying Speaker-Attributed Transcripts for '{meeting_id}'...")
    transcripts = requests.get(f"{BASE_URL}/api/meetings/{meeting_id}/transcripts").json()
    print(f"  Total Transcripts Retrieved: {len(transcripts)}")
    for t in transcripts:
        print(f"    [{t['start_time']}s - {t['end_time']}s] {t['speaker_name']} ({t['participant_id']}): \"{t['text']}\"")

    assert len(transcripts) >= 2, "Expected at least 2 transcript segments"

    # Verify speaker attribution remains intact for overlapping timestamps
    n_item = next(t for t in transcripts if t["participant_id"] == nithi_id)
    v_item = next(t for t in transcripts if t["participant_id"] == viswaa_id)

    assert n_item["speaker_name"] == "Nithi"
    assert v_item["speaker_name"] == "Viswaa"

    print("\n==================================================")
    print(" CHECKPOINT 4 VERIFICATION PASSED SUCCESSFULLY!   ")
    print("==================================================")
    return True

if __name__ == "__main__":
    success = run_checkpoint4_test()
    if not success:
        sys.exit(1)
