import requests
import sys

BASE_URL = "http://127.0.0.1:8000"

def run_checkpoint6_test():
    print("==================================================")
    print("   IntenT_loG — CHECKPOINT 6 VERIFICATION TEST   ")
    print("==================================================")

    meeting_id = "MEETING_001_CHK6"
    sample_transcript = (
        "Today's project meeting focused on developing the AI meeting assistant. "
        "John will complete the React dashboard by Friday. "
        "Sarah will design the MongoDB database by Wednesday. "
        "David will test the backend API next Monday. "
        "The team should review the complete application next Friday."
    )

    # 1. Call Qwen3 LLM Action Item Extraction Endpoint
    print("\n[1] Calling POST /api/meetings/{meeting_id}/extract-action-items with Qwen3 Extractor...")
    res = requests.post(
        f"{BASE_URL}/api/meetings/{meeting_id}/extract-action-items?custom_transcript={sample_transcript}"
    )
    print(f"  HTTP Status Code: {res.status_code}")
    assert res.status_code == 201, f"Failed to extract action items: {res.text}"
    data = res.json()

    print(f"  Summary: {data['summary']}")
    print(f"  Decisions Count: {len(data['decisions'])}")
    print(f"  Tasks Extracted Count: {len(data['tasks'])}")

    assert len(data['tasks']) >= 4, "Expected at least 4 extracted action item tasks"

    for idx, t in enumerate(data['tasks'], start=1):
        print(f"    [{idx}] Owner: {t['owner']} | Deadline: {t['deadline']} | Priority: {t['priority']} | Deliverable: \"{t['deliverable']}\"")
        print(f"        Task: \"{t['task']}\"")

    # 2. Verify Persistence in MongoDB 'tasks' Collection
    print(f"\n[2] Querying GET /api/tasks (Stored Tasks across MongoDB)...")
    tasks_res = requests.get(f"{BASE_URL}/api/tasks")
    assert tasks_res.status_code == 200
    all_tasks = tasks_res.json()
    print(f"  Total Tasks Stored in MongoDB: {len(all_tasks)}")
    
    john_task = next((t for t in all_tasks if (t.get("owner") and "John" in t["owner"]) or "John" in t.get("task", "")), None)
    assert john_task is not None, "John's task must be present in MongoDB tasks collection"
    print(f"  Found John's Task: ID={john_task['task_id']} | Status={john_task['status']} | Deliverable={john_task['deliverable']}")

    # 3. Test Task Status Update (Pending -> Completed)
    print("\n[3] Testing PATCH /api/tasks/{task_id}/status (Updating Task Status)...")
    task_id = john_task["task_id"]
    patch_res = requests.patch(f"{BASE_URL}/api/tasks/{task_id}/status", json={"status": "Completed"})
    assert patch_res.status_code == 200
    updated_task = patch_res.json()
    print(f"  Task Status Updated: {updated_task['task_id']} -> Status: {updated_task['status']}")
    assert updated_task["status"] == "Completed"

    print("\n==================================================")
    print(" CHECKPOINT 6 VERIFICATION PASSED SUCCESSFULLY!   ")
    print("==================================================")
    return True

if __name__ == "__main__":
    success = run_checkpoint6_test()
    if not success:
        sys.exit(1)
