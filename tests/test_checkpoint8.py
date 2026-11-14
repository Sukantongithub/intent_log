import requests
import io
import sys
import fitz      # PyMuPDF
import docx      # python-docx

BASE_URL = "http://127.0.0.1:8000"

def create_complete_pdf_bytes():
    doc = fitz.open()
    page = doc.new_page()
    page.insert_text((50, 50), "React Dashboard implementation complete with interactive task board, responsive UI components, and dark theme support.")
    pdf_buffer = io.BytesIO()
    doc.save(pdf_buffer)
    doc.close()
    return pdf_buffer.getvalue()

def create_partial_docx_bytes():
    doc = docx.Document()
    doc.add_heading("MongoDB Database Schema Draft", level=1)
    doc.add_paragraph("Initial schema draft started for user authentication module.")
    docx_buffer = io.BytesIO()
    doc.save(docx_buffer)
    return docx_buffer.getvalue()

def run_checkpoint8_test():
    print("==================================================")
    print("   IntenT_loG — CHECKPOINT 8 VERIFICATION TEST   ")
    print("==================================================")

    meeting_id = "MEETING_001_CHK8"

    # 1. Setup Meeting and Extract Action Items
    print("\n[1] Creating Meeting & Tasks for Deliverable Validation...")
    extract_res = requests.post(
        f"{BASE_URL}/api/meetings/{meeting_id}/extract-action-items?custom_transcript=John will complete the React dashboard by Friday. Sarah will design the MongoDB database by Wednesday."
    ).json()

    tasks_res = requests.get(f"{BASE_URL}/api/tasks").json()
    meeting_tasks = [t for t in tasks_res if t["meeting_id"] == meeting_id]

    john_task = next(t for t in meeting_tasks if (t.get("owner") and "John" in t["owner"]) or "dashboard" in t["task"].lower())
    sarah_task = next(t for t in meeting_tasks if (t.get("owner") and "Sarah" in t["owner"]) or "database" in t["task"].lower())

    # 2. Test Scenario 1: COMPLETE Validation Result
    print(f"\n[2] Testing Complete Validation Scenario (Task: {john_task['task_id']})...")
    pdf_bytes = create_complete_pdf_bytes()
    requests.post(f"{BASE_URL}/api/tasks/{john_task['task_id']}/deliverable/upload", files={"file": ("react_dashboard.pdf", pdf_bytes, "application/pdf")})

    res1 = requests.post(f"{BASE_URL}/api/tasks/{john_task['task_id']}/validate-deliverable")
    assert res1.status_code == 201, f"Validation failed: {res1.text}"
    report1 = res1.json()

    print(f"  Validation Status: {report1['validation_status']} | Coverage Score: {report1['coverage_score']}%")
    print(f"  Rationale: {report1['rationale']}")
    assert report1["validation_status"].upper() in ["COMPLETE", "PARTIALLY_COMPLETE", "PARTIAL"]
    assert report1["coverage_score"] >= 50.0
    print("-> Complete Validation Test PASSED")

    # 3. Test Scenario 2: PARTIAL Validation Result
    print(f"\n[3] Testing Partial Validation Scenario (Task: {sarah_task['task_id']})...")
    docx_bytes = create_partial_docx_bytes()
    requests.post(f"{BASE_URL}/api/tasks/{sarah_task['task_id']}/deliverable/upload", files={"file": ("schema_draft.docx", docx_bytes, "application/vnd.openxmlformats-officedocument.wordprocessingml.document")})

    res2 = requests.post(f"{BASE_URL}/api/tasks/{sarah_task['task_id']}/validate-deliverable")
    assert res2.status_code == 201
    report2 = res2.json()

    print(f"  Validation Status: {report2['validation_status']} | Coverage Score: {report2['coverage_score']}%")
    print(f"  Rationale: {report2['rationale']}")
    assert report2["validation_status"].upper() in ["PARTIALLY_COMPLETE", "PARTIAL", "INCOMPLETE"]
    print("-> Partial Validation Test PASSED")

    # 4. Fetch Stored Validation Report
    print(f"\n[4] Querying GET /api/tasks/{john_task['task_id']}/validation-report...")
    rpt_res = requests.get(f"{BASE_URL}/api/tasks/{john_task['task_id']}/validation-report")
    assert rpt_res.status_code == 200
    stored_rpt = rpt_res.json()
    print(f"  Report ID: {stored_rpt['report_id']} | Status: {stored_rpt['validation_status']} | Score: {stored_rpt['coverage_score']}%")
    assert stored_rpt["task_id"] == john_task["task_id"]

    print("\n==================================================")
    print(" CHECKPOINT 8 VERIFICATION PASSED SUCCESSFULLY!   ")
    print("==================================================")
    return True

if __name__ == "__main__":
    success = run_checkpoint8_test()
    if not success:
        sys.exit(1)
