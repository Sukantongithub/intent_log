import requests
import io
import sys

BASE_URL = "http://127.0.0.1:8000"

def run_checkpoint12_test():
    print("==================================================")
    print("   IntenT_loG — CHECKPOINT 12 VERIFICATION TEST  ")
    print("==================================================")

    meeting_id = "MEETING_001_CHK12"
    print("\n[1] Creating Meeting & Task...")
    requests.post(
        f"{BASE_URL}/api/meetings/{meeting_id}/extract-action-items?custom_transcript=Viswaa will prepare the testing report by Monday."
    )
    
    tasks = requests.get(f"{BASE_URL}/api/tasks").json()
    task = next(t for t in tasks if t["meeting_id"] == meeting_id)
    task_id = task["task_id"]

    # Test Rule Check: Empty / Missing evidence upload
    print("\n[2] Testing Deterministic Rule Check (Missing Required Evidence)...")
    empty_doc = b"Draft report without required evidence or diagrams."
    files = {"file": ("draft.pdf", empty_doc, "application/pdf")}
    upload_res = requests.post(f"{BASE_URL}/api/tasks/{task_id}/deliverable/upload", files=files)
    assert upload_res.status_code == 201

    val_res = requests.post(f"{BASE_URL}/api/tasks/{task_id}/validate-deliverable")
    assert val_res.status_code == 201
    val_data = val_res.json()

    print(f"  Validation Status: {val_data['validation_status']}")
    print(f"  Rule Execution Results:")
    for r in val_data["rule_results"]:
        print(f"    - Rule '{r['rule']}': Status = {r['status']} | Detail: {r.get('detail')}")

    evidence_rule = next((r for r in val_data["rule_results"] if r["rule"] == "required_evidence"), None)
    assert evidence_rule is not None, "Rule 'required_evidence' must be evaluated deterministically!"
    assert evidence_rule["status"] == "failed", "Document missing evidence must fail evidence rule check!"

    print("\n==================================================")
    print(" CHECKPOINT 12 VERIFICATION PASSED SUCCESSFULLY!  ")
    print("==================================================")
    return True

if __name__ == "__main__":
    success = run_checkpoint12_test()
    if not success:
        sys.exit(1)
