import requests
import io
import uuid
import sys
import fitz # PyMuPDF

BASE_URL = "http://127.0.0.1:8000"

def create_final_testing_report_pdf():
    doc = fitz.open()
    page = doc.new_page()
    page.insert_text(
        (50, 50),
        "Final Testing Report\n\n"
        "1. Unit testing results: 100% test pass rate across 45 test cases.\n"
        "2. Integration testing results: All backend endpoints and MongoDB queries verified.\n"
        "3. Test cases and Screenshots: Included in appendix matrix and visual attachments.\n"
        "4. Summary: Deliverable complete and ready for deployment."
    )
    buf = io.BytesIO()
    doc.save(buf)
    doc.close()
    return buf.getvalue()

def run_checkpoint15_test():
    print("==================================================================")
    print("   IntenT_loG — CHECKPOINT 15 COMPLETE END-TO-END INTEGRATION TEST ")
    print("==================================================================")

    meeting_id = f"MEETING_E2E_{uuid.uuid4().hex[:6].upper()}"

    # 1. Register Participants
    print("\n[STEP 1] Registering & Joining Meeting Participants...")
    participants_def = [
        {"name": "Sujith", "email": "sujith_e2e@example.com"},
        {"name": "Sukant", "email": "sukant_e2e@example.com"},
        {"name": "Nithi", "email": "nithi_e2e@example.com"},
        {"name": "Viswaa", "email": "viswaa_e2e@example.com"}
    ]
    user_map = {}
    for p in participants_def:
        u_res = requests.post(f"{BASE_URL}/api/users/register", json=p).json()
        u_id = u_res["user_id"]
        user_map[p["name"]] = u_id
        requests.post(f"{BASE_URL}/api/meetings/{meeting_id}/join", json={"user_id": u_id, "display_name": p["name"], "mic_enabled": True})
        requests.post(f"{BASE_URL}/api/meetings/{meeting_id}/participants/{u_id}/stream/connect")
        print(f"  Joined & Connected Stream: {p['name']} ({u_id})")

    # 2. Ingest Transcripts with Timestamps and Overlapping Speech
    print("\n[STEP 2] Ingesting Participant Audio Streams & Transcripts...")
    transcript_dialogue = [
        {"speaker": "Sujith", "start": 10.0, "end": 14.0, "text": "We need to finish the testing report."},
        {"speaker": "Sukant", "start": 15.0, "end": 19.0, "text": "I'll prepare the API documentation."},
        {"speaker": "Nithi", "start": 25.0, "end": 28.0, "text": "The deadline should be Friday."},
        {"speaker": "Viswaa", "start": 26.0, "end": 29.0, "text": "No, Monday would be better."},
        {"speaker": "Sujith", "start": 30.0, "end": 35.0, "text": "Okay, Monday is the final deadline. Viswaa, you handle the testing report."}
    ]

    for d in transcript_dialogue:
        u_id = user_map[d["speaker"]]
        requests.post(
            f"{BASE_URL}/api/meetings/{meeting_id}/participants/{u_id}/transcribe",
            json={
                "meeting_id": meeting_id,
                "participant_id": u_id,
                "speaker_name": d["speaker"],
                "start_time": d["start"],
                "end_time": d["end"],
                "transcript_text": d["text"]
            }
        )
        print(f"  [{d['start']}s - {d['end']}s] {d['speaker']}: \"{d['text']}\"")

    # 3. Call Merged Timeline Endpoint (Checkpoint 5)
    print("\n[STEP 3] Fetching Merged Speaker-Attributed Timeline (Timestamp Merge)...")
    merged_res = requests.get(f"{BASE_URL}/api/meetings/{meeting_id}/merged-transcript").json()
    print(f"  Total Timeline Segments: {merged_res['total_segments']} | Overlaps Tagged: {merged_res['overlapping_segments_count']}")
    assert merged_res['total_segments'] >= 5

    # 4. Extract Action Items via Qwen3 (Checkpoint 6 & 7)
    print("\n[STEP 4] Extracting Structured Action Items with Qwen3...")
    full_transcript_str = "\n".join([f"{d['speaker']}: {d['text']}" for d in transcript_dialogue])
    extract_res_raw = requests.post(
        f"{BASE_URL}/api/meetings/{meeting_id}/extract-action-items",
        params={"custom_transcript": full_transcript_str}
    )
    if extract_res_raw.status_code != 201:
        print("Extract action items error:", extract_res_raw.status_code, extract_res_raw.text)
    extract_res = extract_res_raw.json()

    print(f"  Summary: {extract_res['summary']}")
    print(f"  Extracted Tasks Count: {len(extract_res['tasks'])}")

    tasks_res = requests.get(f"{BASE_URL}/api/tasks").json()
    meeting_tasks = [t for t in tasks_res if t["meeting_id"] == meeting_id]

    viswaa_task = next((t for t in meeting_tasks if "Viswaa" in t["owner"] or "test" in t["task"].lower()), None)
    assert viswaa_task is not None, "Task assigned to Viswaa must exist!"
    task_id = viswaa_task["task_id"]

    print(f"\n  Verified Action Item for Viswaa:")
    print(f"    - Task ID: {task_id}")
    print(f"    - Task Description: \"{viswaa_task['task']}\"")
    print(f"    - Owner: {viswaa_task['owner']}")
    print(f"    - Deadline: {viswaa_task['deadline']}")
    print(f"    - Deliverable: {viswaa_task['deliverable']}")

    # 5. Retrieve Requirements via RAG (Checkpoint 11 & 14)
    print("\n[STEP 5] Retrieving Task Requirements & RAG Context...")
    reqs = requests.get(f"{BASE_URL}/api/tasks/{task_id}/requirements").json()
    print(f"  Requirements: {reqs['requirements']}")

    # 6. Deliverable Upload & Document Processing (Checkpoint 9 & 10)
    print("\n[STEP 6] Viswaa Uploads Deliverable PDF Document...")
    pdf_bytes = create_final_testing_report_pdf()
    up_res = requests.post(
        f"{BASE_URL}/api/tasks/{task_id}/deliverable/upload",
        files={"file": ("final_testing_report.pdf", pdf_bytes, "application/pdf")}
    )
    assert up_res.status_code == 201
    deliv = up_res.json()
    print(f"  Uploaded File: {deliv['filename']} ({deliv['file_size_bytes']} bytes) | Extracted Text Words: {deliv['word_count']}")

    # 7. Execute Rules + RAG Qwen3 Validation Engine (Checkpoint 12 & 13)
    print("\n[STEP 7] Executing Multi-Tier Rules + RAG Qwen3 AI Validation Engine...")
    val_res = requests.post(f"{BASE_URL}/api/tasks/{task_id}/validate-deliverable")
    assert val_res.status_code == 201
    val_report = val_res.json()

    print("\n==================================================================")
    print("                FINAL END-TO-END VALIDATION REPORT               ")
    print("==================================================================")
    print(f"  Report ID: {val_report['report_id']}")
    print(f"  Task ID: {val_report['task_id']}")
    print(f"  Validation Status: {val_report['validation_status']}")
    print(f"  Completion Percentage: {val_report['completion_percentage']}%")
    print(f"  Reason: {val_report['reason']}")
    print(f"  Feedback: {val_report['feedback']}")
    print(f"  Evidence Found: {val_report['evidence_found']}")
    print(f"  Missing Requirements: {val_report['missing_requirements']}")
    print(f"  Deterministic Rule Results:")
    for r in val_report["rule_results"]:
        print(f"    - [{r['status'].upper()}] Rule '{r['rule']}': {r.get('detail')}")

    assert val_report["validation_status"].upper() in ["COMPLETE", "PARTIALLY_COMPLETE", "INCOMPLETE"]
    assert val_report["completion_percentage"] >= 50.0

    print("\n==================================================================")
    print(" CHECKPOINT 15 COMPLETE END-TO-END INTEGRATION PASSED!           ")
    print("==================================================================")
    return True

if __name__ == "__main__":
    success = run_checkpoint15_test()
    if not success:
        sys.exit(1)
