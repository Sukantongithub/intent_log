import requests
import sys

BASE_URL = "http://127.0.0.1:8000"

def run_checkpoint11_test():
    print("==================================================")
    print("   IntenT_loG — CHECKPOINT 11 VERIFICATION TEST  ")
    print("==================================================")

    meeting_id = "MEETING_001_CHK11"
    print("\n[1] Creating Meeting & Extracting Action Items...")
    extract_res = requests.post(
        f"{BASE_URL}/api/meetings/{meeting_id}/extract-action-items?custom_transcript=Viswaa will prepare the testing report by Monday."
    )
    assert extract_res.status_code == 201
    
    tasks_res = requests.get(f"{BASE_URL}/api/tasks").json()
    viswaa_task = next(t for t in tasks_res if t["meeting_id"] == meeting_id)
    task_id = viswaa_task["task_id"]
    print(f"  Target Task ID: {task_id} | Task: \"{viswaa_task['task']}\"")

    # Call Requirement Extraction Endpoint (GET /api/tasks/{task_id}/requirements)
    print(f"\n[2] Calling GET /api/tasks/{task_id}/requirements...")
    req_res = requests.get(f"{BASE_URL}/api/tasks/{task_id}/requirements")
    assert req_res.status_code == 200, f"Failed to retrieve requirements: {req_res.text}"
    req_data = req_res.json()

    print(f"  Task: {req_data['task']}")
    print(f"  Expected Deliverable: {req_data['expected_deliverable']}")
    print(f"  Extracted Requirements: {req_data['requirements']}")
    print(f"  Required Sections: {req_data['required_sections']}")
    print(f"  Required Evidence: {req_data['required_evidence']}")

    assert len(req_data["requirements"]) >= 3, "Expected at least 3 extracted requirement points"
    assert "Screenshots" in req_data["required_evidence"] or "Test cases" in req_data["required_evidence"] or len(req_data["required_evidence"]) > 0

    print("\n==================================================")
    print(" CHECKPOINT 11 VERIFICATION PASSED SUCCESSFULLY!  ")
    print("==================================================")
    return True

if __name__ == "__main__":
    success = run_checkpoint11_test()
    if not success:
        sys.exit(1)
