import requests
import sys

BASE_URL = "http://127.0.0.1:8000"

def run_checkpoint14_test():
    print("==================================================")
    print("   IntenT_loG — CHECKPOINT 14 VERIFICATION TEST  ")
    print("==================================================")

    meeting_id = "MEETING_001_CHK14"

    # 1. Add Speaker Transcripts into Meeting
    print("\n[1] Adding Speaker Transcripts for Meeting...")
    sujith = requests.post(f"{BASE_URL}/api/users/register", json={"name": "Sujith", "email": "sujith_rag@example.com"}).json()
    viswaa = requests.post(f"{BASE_URL}/api/users/register", json={"name": "Viswaa", "email": "viswaa_rag@example.com"}).json()

    requests.post(f"{BASE_URL}/api/meetings/{meeting_id}/participants/{sujith['user_id']}/transcribe", json={
        "meeting_id": meeting_id,
        "participant_id": sujith["user_id"],
        "speaker_name": "Sujith",
        "start_time": 10.0,
        "end_time": 15.0,
        "transcript_text": "Viswaa, you handle the testing report including unit testing results, integration test results, screenshots, and test cases."
    })

    # 2. Extract Action Items
    print("\n[2] Extracting Action Items & Generating Task...")
    requests.post(
        f"{BASE_URL}/api/meetings/{meeting_id}/extract-action-items?custom_transcript=Viswaa will handle the testing report including unit testing results and screenshots by Monday."
    )

    tasks = requests.get(f"{BASE_URL}/api/tasks").json()
    task = next(t for t in tasks if t["meeting_id"] == meeting_id)
    task_id = task["task_id"]

    # 3. Retrieve Requirements via RAG Endpoint
    print(f"\n[3] Verifying RAG Requirements Retrieval for Task '{task_id}'...")
    req_res = requests.get(f"{BASE_URL}/api/tasks/{task_id}/requirements")
    assert req_res.status_code == 200
    req_data = req_res.json()

    print(f"  Task: {req_data['task']}")
    print(f"  Expected Deliverable: {req_data['expected_deliverable']}")
    print(f"  Requirements: {req_data['requirements']}")
    print(f"  Required Evidence: {req_data['required_evidence']}")

    assert len(req_data["requirements"]) >= 3
    print("-> RAG Context Retrieval Test PASSED")

    print("\n==================================================")
    print(" CHECKPOINT 14 VERIFICATION PASSED SUCCESSFULLY!  ")
    print("==================================================")
    return True

if __name__ == "__main__":
    success = run_checkpoint14_test()
    if not success:
        sys.exit(1)
