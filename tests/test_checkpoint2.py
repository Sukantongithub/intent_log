import requests
import base64
import struct
import math
import sys

BASE_URL = "http://127.0.0.1:8000"

def generate_audio_payload(duration_sec=2.0, sample_rate=16000, freq=440.0, amplitude=15000):
    """Generates 16-bit PCM audio tone payload representing speech."""
    num_samples = int(sample_rate * duration_sec)
    samples = []
    for i in range(num_samples):
        t = float(i) / sample_rate
        val = int(amplitude * math.sin(2 * math.pi * freq * t))
        samples.append(val)
    raw_bytes = struct.pack(f"<{len(samples)}h", *samples)
    return base64.b64encode(raw_bytes).decode('utf-8')

def run_checkpoint2_test():
    print("==================================================")
    print("   IntenT_loG — CHECKPOINT 2 VERIFICATION TEST   ")
    print("==================================================")

    meeting_id = "MEETING_001"

    # 1. Register & Join Test Participants
    print("\n[1] Registering & Joining Participants to MEETING_001...")
    participants = [
        {"name": "Sujith", "email": "sujith_chk2@example.com"},
        {"name": "Sukant", "email": "sukant_chk2@example.com"},
        {"name": "Nithi", "email": "nithi_chk2@example.com"},
        {"name": "Viswaa", "email": "viswaa_chk2@example.com"}
    ]

    user_map = {}
    for p in participants:
        u_res = requests.post(f"{BASE_URL}/api/users/register", json=p).json()
        u_id = u_res["user_id"]
        user_map[p["name"]] = u_id
        # Join meeting
        requests.post(f"{BASE_URL}/api/meetings/{meeting_id}/join", json={
            "user_id": u_id,
            "display_name": p["name"],
            "mic_enabled": True
        })
        # Connect stream
        conn_res = requests.post(f"{BASE_URL}/api/meetings/{meeting_id}/participants/{u_id}/stream/connect").json()
        print(f"  {p['name']} ({u_id}) -> Stream Connected: {conn_res['stream_id']}")

    # 2. Test Step: Sujith Speaks -> Sujith Stream Receives Audio
    print("\n[2] Testing Sujith Speaks -> Sujith Stream Receives Audio...")
    sujith_id = user_map["Sujith"]
    sujith_audio = generate_audio_payload(duration_sec=2.5, freq=300.0)
    res = requests.post(
        f"{BASE_URL}/api/meetings/{meeting_id}/participants/{sujith_id}/audio-stream",
        json={
            "meeting_id": meeting_id,
            "user_id": sujith_id,
            "start_time": 10.0,
            "end_time": 12.5,
            "audio_base64": sujith_audio
        }
    )
    assert res.status_code == 201
    sujith_chunk = res.json()
    print(f"  Sujith Stream Chunk Ingested: {sujith_chunk['chunk_id']} | Stream: {sujith_chunk['stream_id']} | Bytes: {sujith_chunk['bytes_received']}")
    assert sujith_chunk["user_id"] == sujith_id
    assert sujith_chunk["meeting_id"] == meeting_id
    print("-> Sujith Stream Test PASSED")

    # 3. Test Step: Sukant Speaks -> Sukant Stream Receives Audio
    print("\n[3] Testing Sukant Speaks -> Sukant Stream Receives Audio...")
    sukant_id = user_map["Sukant"]
    sukant_audio = generate_audio_payload(duration_sec=3.0, freq=450.0)
    res = requests.post(
        f"{BASE_URL}/api/meetings/{meeting_id}/participants/{sukant_id}/audio-stream",
        json={
            "meeting_id": meeting_id,
            "user_id": sukant_id,
            "start_time": 15.0,
            "end_time": 18.0,
            "audio_base64": sukant_audio
        }
    )
    assert res.status_code == 201
    sukant_chunk = res.json()
    print(f"  Sukant Stream Chunk Ingested: {sukant_chunk['chunk_id']} | Stream: {sukant_chunk['stream_id']} | Bytes: {sukant_chunk['bytes_received']}")
    assert sukant_chunk["user_id"] == sukant_id
    print("-> Sukant Stream Test PASSED")

    # 4. Test Step: Nithi + Viswaa Speak Simultaneously -> Both Streams Receive Audio Independently
    print("\n[4] Testing Nithi + Viswaa Speak SIMULTANEOUSLY -> Both Streams Receive Audio Independently...")
    nithi_id = user_map["Nithi"]
    viswaa_id = user_map["Viswaa"]

    # Nithi speaks from 25.0s to 28.0s ("The deadline should be Friday.")
    nithi_audio = generate_audio_payload(duration_sec=3.0, freq=550.0)
    res_nithi = requests.post(
        f"{BASE_URL}/api/meetings/{meeting_id}/participants/{nithi_id}/audio-stream",
        json={
            "meeting_id": meeting_id,
            "user_id": nithi_id,
            "start_time": 25.0,
            "end_time": 28.0,
            "audio_base64": nithi_audio
        }
    )

    # Viswaa speaks simultaneously from 26.0s to 29.0s ("No, Monday would be better.")
    viswaa_audio = generate_audio_payload(duration_sec=3.0, freq=700.0)
    res_viswaa = requests.post(
        f"{BASE_URL}/api/meetings/{meeting_id}/participants/{viswaa_id}/audio-stream",
        json={
            "meeting_id": meeting_id,
            "user_id": viswaa_id,
            "start_time": 26.0,
            "end_time": 29.0,
            "audio_base64": viswaa_audio
        }
    )

    assert res_nithi.status_code == 201
    assert res_viswaa.status_code == 201

    n_chunk = res_nithi.json()
    v_chunk = res_viswaa.json()

    print(f"  Nithi Stream Chunk [25.0s - 28.0s]: {n_chunk['chunk_id']} | Stream: {n_chunk['stream_id']}")
    print(f"  Viswaa Stream Chunk [26.0s - 29.0s]: {v_chunk['chunk_id']} | Stream: {v_chunk['stream_id']}")

    assert n_chunk["user_id"] == nithi_id
    assert v_chunk["user_id"] == viswaa_id
    assert n_chunk["stream_id"] != v_chunk["stream_id"], "Streams must be distinct per participant!"

    print("-> Simultaneous Independent Streams Test PASSED")

    # 5. Query All Stream Chunks for Meeting
    print(f"\n[5] Fetching All Ingested Audio Streams for '{meeting_id}'...")
    all_streams = requests.get(f"{BASE_URL}/api/meetings/{meeting_id}/audio-streams").json()
    print(f"  Total Ingested Stream Chunks Recorded: {len(all_streams)}")
    for s in all_streams:
        print(f"    - Participant: {s['user_id']} | Stream: {s['stream_id']} | Time: [{s['start_time']}s - {s['end_time']}s]")

    assert len(all_streams) >= 4, "Expected at least 4 ingested stream chunks"

    print("\n==================================================")
    print(" CHECKPOINT 2 VERIFICATION PASSED SUCCESSFULLY!   ")
    print("==================================================")
    return True

if __name__ == "__main__":
    success = run_checkpoint2_test()
    if not success:
        sys.exit(1)
