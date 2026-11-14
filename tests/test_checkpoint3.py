import requests
import base64
import struct
import math
import sys

BASE_URL = "http://127.0.0.1:8000"

def generate_silence(duration_sec=2.0, sample_rate=16000):
    num_samples = int(sample_rate * duration_sec)
    return base64.b64encode(b'\x00\x00' * num_samples).decode('utf-8')

def generate_speech(duration_sec=3.7, sample_rate=16000, freq=500.0, amplitude=18000):
    num_samples = int(sample_rate * duration_sec)
    samples = []
    for i in range(num_samples):
        t = float(i) / sample_rate
        val = int(amplitude * math.sin(2 * math.pi * freq * t))
        samples.append(val)
    raw_bytes = struct.pack(f"<{len(samples)}h", *samples)
    return base64.b64encode(raw_bytes).decode('utf-8')

def run_checkpoint3_test():
    print("==================================================")
    print("   IntenT_loG — CHECKPOINT 3 VERIFICATION TEST   ")
    print("==================================================")

    meeting_id = "MEETING_001"

    # 1. Register & Join Participants
    print("\n[1] Registering & Joining Nithi and Viswaa...")
    nithi = requests.post(f"{BASE_URL}/api/users/register", json={"name": "Nithi", "email": "nithi_vad@example.com"}).json()
    viswaa = requests.post(f"{BASE_URL}/api/users/register", json={"name": "Viswaa", "email": "viswaa_vad@example.com"}).json()

    nithi_id = nithi["user_id"]
    viswaa_id = viswaa["user_id"]

    requests.post(f"{BASE_URL}/api/meetings/{meeting_id}/join", json={"user_id": nithi_id, "display_name": "Nithi", "mic_enabled": True})
    requests.post(f"{BASE_URL}/api/meetings/{meeting_id}/join", json={"user_id": viswaa_id, "display_name": "Viswaa", "mic_enabled": True})

    # 2. Test Step 1: Nithi Silent -> No Speech Segment Detected (speech_detected = False)
    print("\n[2] Testing VAD Scenario 1: Nithi Silent...")
    silence_payload = {
        "meeting_id": meeting_id,
        "participant_id": nithi_id,
        "start_time": 10.0,
        "end_time": 12.0,
        "audio_base64": generate_silence(duration_sec=2.0)
    }
    res = requests.post(f"{BASE_URL}/api/meetings/{meeting_id}/participants/{nithi_id}/vad-process", json=silence_payload)
    assert res.status_code == 201
    silent_res = res.json()
    print(f"  Participant: Nithi ({silent_res['participant_id']}) [10.0s - 12.0s]")
    print(f"  Speech Detected: {silent_res['speech_detected']} | Confidence: {silent_res['confidence']} | Energy dB: {silent_res['energy_db']} dB")

    assert silent_res["speech_detected"] is False, "Silent stream must NOT trigger speech detection!"
    print("-> Silent VAD Test PASSED (No speech segment generated)")

    # 3. Test Step 2: Nithi Speaks -> Speech Segment Detected with Timestamps (72.5s - 76.2s)
    print("\n[3] Testing VAD Scenario 2: Nithi Speaks [72.5s - 76.2s]...")
    speech_payload = {
        "meeting_id": meeting_id,
        "participant_id": nithi_id,
        "start_time": 72.5,
        "end_time": 76.2,
        "audio_base64": generate_speech(duration_sec=3.7, freq=450.0)
    }
    res = requests.post(f"{BASE_URL}/api/meetings/{meeting_id}/participants/{nithi_id}/vad-process", json=speech_payload)
    assert res.status_code == 201
    speech_res = res.json()
    print(f"  Participant: Nithi ({speech_res['participant_id']}) [{speech_res['start_time']}s - {speech_res['end_time']}s]")
    print(f"  Speech Detected: {speech_res['speech_detected']} | Confidence: {speech_res['confidence']} | Energy dB: {speech_res['energy_db']} dB")

    assert speech_res["speech_detected"] is True, "Speech payload must trigger speech_detected = True"
    assert speech_res["start_time"] == 72.5
    assert speech_res["end_time"] == 76.2
    print("-> Nithi Speech VAD Test PASSED")

    # 4. Test Step 3: Nithi + Viswaa Speak Simultaneously -> Both Streams Independently Detect Speech
    print("\n[4] Testing VAD Scenario 3: Nithi & Viswaa Speak SIMULTANEOUSLY...")
    nithi_overlap = {
        "meeting_id": meeting_id,
        "participant_id": nithi_id,
        "start_time": 80.0,
        "end_time": 83.0,
        "audio_base64": generate_speech(duration_sec=3.0, freq=500.0)
    }
    viswaa_overlap = {
        "meeting_id": meeting_id,
        "participant_id": viswaa_id,
        "start_time": 81.0,
        "end_time": 84.0,
        "audio_base64": generate_speech(duration_sec=3.0, freq=750.0)
    }

    res_n = requests.post(f"{BASE_URL}/api/meetings/{meeting_id}/participants/{nithi_id}/vad-process", json=nithi_overlap).json()
    res_v = requests.post(f"{BASE_URL}/api/meetings/{meeting_id}/participants/{viswaa_id}/vad-process", json=viswaa_overlap).json()

    print(f"  Nithi Stream VAD: Segment {res_n['segment_id']} [{res_n['start_time']}s - {res_n['end_time']}s] -> Speech: {res_n['speech_detected']}")
    print(f"  Viswaa Stream VAD: Segment {res_v['segment_id']} [{res_v['start_time']}s - {res_v['end_time']}s] -> Speech: {res_v['speech_detected']}")

    assert res_n["speech_detected"] is True
    assert res_v["speech_detected"] is True
    assert res_n["participant_id"] != res_v["participant_id"]
    print("-> Simultaneous Independent VAD Test PASSED")

    # 5. Query Active VAD Segments for Meeting
    print(f"\n[5] Querying Timestamped Speech Segments for '{meeting_id}'...")
    segments = requests.get(f"{BASE_URL}/api/meetings/{meeting_id}/vad-segments?speech_only=true").json()
    print(f"  Total Speech Segments Logged: {len(segments)}")
    for s in segments:
        print(f"    - Participant: {s['participant_id']} | Time: [{s['start_time']}s - {s['end_time']}s] | Speech: {s['speech_detected']}")

    assert len(segments) >= 3, "Expected at least 3 active speech VAD segments logged"

    print("\n==================================================")
    print(" CHECKPOINT 3 VERIFICATION PASSED SUCCESSFULLY!   ")
    print("==================================================")
    return True

if __name__ == "__main__":
    success = run_checkpoint3_test()
    if not success:
        sys.exit(1)
