import requests
import io
import sys
import fitz # PyMuPDF
import docx # python-docx
import openpyxl # openpyxl

BASE_URL = "http://127.0.0.1:8000"

def create_pdf():
    doc = fitz.open()
    page = doc.new_page()
    page.insert_text((50, 50), "PDF Document Processing Text - PyMuPDF verified.")
    buf = io.BytesIO()
    doc.save(buf)
    doc.close()
    return buf.getvalue()

def create_docx():
    doc = docx.Document()
    doc.add_paragraph("DOCX Document Processing Text - python-docx verified.")
    buf = io.BytesIO()
    doc.save(buf)
    return buf.getvalue()

def create_xlsx():
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.append(["Header", "Value"])
    ws.append(["XLSX Document Processing Text", "openpyxl verified"])
    buf = io.BytesIO()
    wb.save(buf)
    return buf.getvalue()

def run_checkpoint10_test():
    print("==================================================")
    print("   IntenT_loG — CHECKPOINT 10 VERIFICATION TEST  ")
    print("==================================================")

    meeting_id = "MEETING_001_CHK10"
    print("\n[1] Setup Meeting & Task...")
    requests.post(
        f"{BASE_URL}/api/meetings/{meeting_id}/extract-action-items?custom_transcript=Viswaa will complete testing report by Friday."
    )
    tasks = requests.get(f"{BASE_URL}/api/tasks").json()
    task = next(t for t in tasks if t["meeting_id"] == meeting_id)
    task_id = task["task_id"]

    # 1. Test PDF Processing
    pdf_bytes = create_pdf()
    res_pdf = requests.post(f"{BASE_URL}/api/tasks/{task_id}/deliverable/upload", files={"file": ("doc.pdf", pdf_bytes, "application/pdf")}).json()
    print(f"  [PDF] Type: {res_pdf['file_type']} | Text: \"{res_pdf['extracted_text'].strip()}\"")
    assert "PyMuPDF" in res_pdf["extracted_text"]

    # 2. Test DOCX Processing
    docx_bytes = create_docx()
    res_docx = requests.post(f"{BASE_URL}/api/tasks/{task_id}/deliverable/upload", files={"file": ("doc.docx", docx_bytes, "application/vnd.openxmlformats-officedocument.wordprocessingml.document")}).json()
    print(f"  [DOCX] Type: {res_docx['file_type']} | Text: \"{res_docx['extracted_text'].strip()}\"")
    assert "python-docx" in res_docx["extracted_text"]

    # 3. Test XLSX Processing
    xlsx_bytes = create_xlsx()
    res_xlsx = requests.post(f"{BASE_URL}/api/tasks/{task_id}/deliverable/upload", files={"file": ("doc.xlsx", xlsx_bytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}).json()
    print(f"  [XLSX] Type: {res_xlsx['file_type']} | Text snippet: \"{res_xlsx['extracted_text'].strip()[:60]}...\"")
    assert "openpyxl" in res_xlsx["extracted_text"]

    print("\n==================================================")
    print(" CHECKPOINT 10 VERIFICATION PASSED SUCCESSFULLY!  ")
    print("==================================================")
    return True

if __name__ == "__main__":
    success = run_checkpoint10_test()
    if not success:
        sys.exit(1)
