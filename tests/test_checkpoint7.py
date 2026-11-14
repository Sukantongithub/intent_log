import requests
import io
import sys
import fitz      # PyMuPDF
import docx      # python-docx
import openpyxl  # openpyxl

BASE_URL = "http://127.0.0.1:8000"

def create_sample_pdf_bytes():
    doc = fitz.open()
    page = doc.new_page()
    page.insert_text((50, 50), "React Dashboard implementation with interactive task board and responsive components.")
    pdf_buffer = io.BytesIO()
    doc.save(pdf_buffer)
    doc.close()
    return pdf_buffer.getvalue()

def create_sample_docx_bytes():
    doc = docx.Document()
    doc.add_heading("MongoDB Database Schema", level=1)
    doc.add_paragraph("MongoDB schema design for users, meetings, action items, and deliverable documents.")
    docx_buffer = io.BytesIO()
    doc.save(docx_buffer)
    return docx_buffer.getvalue()

def create_sample_xlsx_bytes():
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "TestMatrix"
    ws.append(["Task ID", "Test Case", "Status"])
    ws.append(["TASK_001", "Backend API test matrix and test cases", "Passed"])
    xlsx_buffer = io.BytesIO()
    wb.save(xlsx_buffer)
    return xlsx_buffer.getvalue()

def run_checkpoint7_test():
    print("==================================================")
    print("   IntenT_loG — CHECKPOINT 7 VERIFICATION TEST   ")
    print("==================================================")

    # 1. Setup Test Meeting and Task
    meeting_id = "MEETING_001_CHK7"
    print("\n[1] Creating Test Meeting & Task for Deliverable Processing...")
    extract_res = requests.post(
        f"{BASE_URL}/api/meetings/{meeting_id}/extract-action-items?custom_transcript=John will complete the React dashboard by Friday."
    ).json()
    
    tasks_res = requests.get(f"{BASE_URL}/api/tasks").json()
    task_item = next(t for t in tasks_res if t["meeting_id"] == meeting_id)
    task_id = task_item["task_id"]
    print(f"  Target Task ID: {task_id} | Task: \"{task_item['task']}\"")

    # 2. Test PDF Upload & PyMuPDF Processing
    print("\n[2] Testing PDF Deliverable Upload & PyMuPDF Extraction...")
    pdf_bytes = create_sample_pdf_bytes()
    files = {"file": ("sample_dashboard.pdf", pdf_bytes, "application/pdf")}
    res_pdf = requests.post(f"{BASE_URL}/api/tasks/{task_id}/deliverable/upload", files=files)
    assert res_pdf.status_code == 201, f"PDF upload failed: {res_pdf.text}"
    pdf_data = res_pdf.json()
    print(f"  Uploaded File: {pdf_data['filename']} | Type: {pdf_data['file_type']} | Size: {pdf_data['file_size_bytes']} bytes")
    print(f"  Extracted Text snippet: \"{pdf_data['extracted_text'][:60]}...\"")
    print(f"  Metadata: {pdf_data['metadata']}")
    assert pdf_data["file_type"] == "pdf"
    assert "React Dashboard" in pdf_data["extracted_text"]
    assert pdf_data["metadata"].get("page_count") == 1
    print("-> PDF Processing PASSED")

    # 3. Test DOCX Upload & python-docx Processing
    print("\n[3] Testing DOCX Deliverable Upload & python-docx Extraction...")
    docx_bytes = create_sample_docx_bytes()
    files = {"file": ("sample_schema.docx", docx_bytes, "application/vnd.openxmlformats-officedocument.wordprocessingml.document")}
    res_docx = requests.post(f"{BASE_URL}/api/tasks/{task_id}/deliverable/upload", files=files)
    assert res_docx.status_code == 201
    docx_data = res_docx.json()
    print(f"  Uploaded File: {docx_data['filename']} | Type: {docx_data['file_type']}")
    print(f"  Extracted Text snippet: \"{docx_data['extracted_text'][:60]}...\"")
    print(f"  Metadata: {docx_data['metadata']}")
    assert docx_data["file_type"] == "docx"
    assert "MongoDB schema design" in docx_data["extracted_text"]
    print("-> DOCX Processing PASSED")

    # 4. Test XLSX Upload & openpyxl Processing
    print("\n[4] Testing XLSX Deliverable Upload & openpyxl Extraction...")
    xlsx_bytes = create_sample_xlsx_bytes()
    files = {"file": ("sample_test_matrix.xlsx", xlsx_bytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}
    res_xlsx = requests.post(f"{BASE_URL}/api/tasks/{task_id}/deliverable/upload", files=files)
    assert res_xlsx.status_code == 201
    xlsx_data = res_xlsx.json()
    print(f"  Uploaded File: {xlsx_data['filename']} | Type: {xlsx_data['file_type']}")
    print(f"  Extracted Text snippet: \"{xlsx_data['extracted_text'][:70]}...\"")
    print(f"  Metadata: {xlsx_data['metadata']}")
    assert xlsx_data["file_type"] == "xlsx"
    assert "Backend API test matrix" in xlsx_data["extracted_text"]
    assert xlsx_data["metadata"].get("sheet_count") == 1
    print("-> XLSX Processing PASSED")

    # 5. Retrieve Stored Deliverable for Task
    print(f"\n[5] Querying GET /api/tasks/{task_id}/deliverable...")
    get_res = requests.get(f"{BASE_URL}/api/tasks/{task_id}/deliverable")
    assert get_res.status_code == 200
    stored_deliv = get_res.json()
    print(f"  Stored Deliverable ID: {stored_deliv['deliverable_id']} | Task ID: {stored_deliv['task_id']}")
    print(f"  File: {stored_deliv['filename']} | Words: {stored_deliv['word_count']}")
    assert stored_deliv["task_id"] == task_id

    print("\n==================================================")
    print(" CHECKPOINT 7 VERIFICATION PASSED SUCCESSFULLY!   ")
    print("==================================================")
    return True

if __name__ == "__main__":
    success = run_checkpoint7_test()
    if not success:
        sys.exit(1)
