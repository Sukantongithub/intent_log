import requests
import io
import sys
import fitz # PyMuPDF

BASE_URL = "http://127.0.0.1:8000"

def create_sample_pdf():
    doc = fitz.open()
    page = doc.new_page()
    page.insert_text((50, 50), "Sample PDF deliverable content for testing task submission.")
    buf = io.BytesIO()
    doc.save(buf)
    doc.close()
    return buf.getvalue()

def run_checkpoint9_test():
    print("==================================================")
    print("   IntenT_loG — CHECKPOINT 9 VERIFICATION TEST   ")
    print("==================================================")

    meeting_id = "MEETING_001_CHK9"
    print("\n[1] Setup Meeting & Task...")
    requests.post(
        f"{BASE_URL}/api/meetings/{meeting_id}/extract-action-items?custom_transcript=Viswaa will complete testing report by Friday."
    )
    tasks = requests.get(f"{BASE_URL}/api/tasks").json()
    task = next(t for t in tasks if t["meeting_id"] == meeting_id)
    task_id = task["task_id"]

    # Test PDF Upload (Checkpoint 9)
    print(f"\n[2] Uploading PDF deliverable for Task '{task_id}'...")
    pdf_bytes = create_sample_pdf()
    files = {"file": ("test_deliverable.pdf", pdf_bytes, "application/pdf")}
    res = requests.post(f"{BASE_URL}/api/tasks/{task_id}/deliverable/upload", files=files)
    assert res.status_code == 201, f"Upload failed: {res.text}"
    deliv = res.json()

    print(f"  Deliverable ID: {deliv['deliverable_id']} | File: {deliv['filename']} | Size: {deliv['file_size_bytes']} bytes")
    assert deliv["task_id"] == task_id
    assert deliv["file_type"] == "pdf"

    print("\n==================================================")
    print(" CHECKPOINT 9 VERIFICATION PASSED SUCCESSFULLY!   ")
    print("==================================================")
    return True

if __name__ == "__main__":
    success = run_checkpoint9_test()
    if not success:
        sys.exit(1)
