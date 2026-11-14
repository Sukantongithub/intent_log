import requests
import io
import sys
import fitz # PyMuPDF

BASE_URL = "http://127.0.0.1:8000"

def create_testing_report_pdf():
    doc = fitz.open()
    page = doc.new_page()
    page.insert_text((50, 50), "Testing Report - Unit testing results passed 100%, Integration testing results verified, Test cases and Screenshots attached.")
    buf = io.BytesIO()
    doc.save(buf)
    doc.close()
    return buf.getvalue()

def run_checkpoint13_test():
    print("==================================================")
    print("   IntenT_loG — CHECKPOINT 13 VERIFICATION TEST  ")
    print("==================================================")

    meeting_id = "MEETING_001_CHK13"
    print("\n[1] Creating Meeting & Task...")
    requests.post(
        f"{BASE_URL}/api/meetings/{meeting_id}/extract-action-items?custom_transcript=Viswaa will prepare the testing report by Monday."
    )
    
    tasks = requests.get(f"{BASE_URL}/api/tasks").json()
    task = next(t for t in tasks if t["meeting_id"] == meeting_id)
    task_id = task["task_id"]

    # Upload PDF and validate via Qwen3 AI Engine
    pdf_bytes = create_testing_report_pdf()
    requests.post(f"{BASE_URL}/api/tasks/{task_id}/deliverable/upload", files={"file": ("testing_report.pdf", pdf_bytes, "application/pdf")})

    print(f"\n[2] Executing Qwen3 AI Validation (POST /api/tasks/{task_id}/validate-deliverable)...")
    val_res = requests.post(f"{BASE_URL}/api/tasks/{task_id}/validate-deliverable")
    assert val_res.status_code == 201
    val_data = val_res.json()

    print(f"  Status: {val_data['validation_status']}")
    print(f"  Completion Percentage: {val_data['completion_percentage']}%")
    print(f"  Reason: {val_data['reason']}")
    print(f"  Feedback: {val_data['feedback']}")
    print(f"  Evidence Found: {val_data['evidence_found']}")
    print(f"  Missing Requirements: {val_data['missing_requirements']}")

    assert val_data["validation_status"].upper() in ["COMPLETE", "PARTIALLY_COMPLETE", "INCOMPLETE"]
    assert "completion_percentage" in val_data
    assert "feedback" in val_data

    print("\n==================================================")
    print(" CHECKPOINT 13 VERIFICATION PASSED SUCCESSFULLY!  ")
    print("==================================================")
    return True

if __name__ == "__main__":
    success = run_checkpoint13_test()
    if not success:
        sys.exit(1)
