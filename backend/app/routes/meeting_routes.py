from fastapi import APIRouter, HTTPException, Query, Response, status
from typing import List, Optional
from datetime import datetime
from app.database.mongodb import (
    get_meetings_collection,
    get_tasks_collection,
    get_transcripts_collection,
    parse_object_id,
    build_id_query,
    format_doc
)
from app.models.meeting import MeetingModel
from app.models.task import TaskModel
from app.schemas.meeting_schema import (
    MeetingScheduleRequest,
    MeetingCreate,
    MeetingResponse,
    MeetingListResponse,
    ProgressValidationRequest,
    ProgressValidationResponse
)
from app.schemas.task_schema import TaskResponse
from app.services.groq_service import groq_service
from app.services.validation_service import validation_service
from app.services.mom_pdf_service import mom_pdf_service
from ai.llm.qwen_extractor import qwen_extractor
from ai.speech.timestamp_merger import timestamp_merger

router = APIRouter(prefix="/api/meetings", tags=["Meetings"])

@router.post("/schedule", response_model=MeetingResponse, status_code=status.HTTP_201_CREATED, summary="Create a new instant or scheduled meeting hall")
def schedule_meeting(payload: MeetingScheduleRequest):
    """
    Schedules or creates an instant Meeting Hall session.
    Generates a unique meeting code (e.g., 'abc-defg-hij') and shareable URL.
    """
    meetings_col = get_meetings_collection()
    title = payload.title or "Meeting Hall"
    date = payload.date or datetime.utcnow().strftime("%Y-%m-%d")

    doc = MeetingModel.create_document(
        title=title,
        date=date,
        transcript="",
        summary="",
        status="live"
    )

    res = meetings_col.insert_one(doc)
    doc["_id"] = res.inserted_id
    formatted = format_doc(doc)
    formatted["tasks"] = []

    return MeetingResponse(**formatted)

@router.get("/code/{meeting_code}", response_model=MeetingResponse, summary="Get meeting by code or share link")
def get_meeting_by_code(meeting_code: str):
    """
    Look up a meeting session by meeting_code (e.g. 'abc-defg-hij') or meeting_id.
    """
    meetings_col = get_meetings_collection()
    tasks_col = get_tasks_collection()

    m_doc = meetings_col.find_one({"$or": [{"meeting_code": meeting_code}, build_id_query(meeting_code)]})
    if not m_doc:
        raise HTTPException(status_code=404, detail=f"Meeting session '{meeting_code}' not found.")

    m_id_str = str(m_doc["_id"])
    t_cursor = tasks_col.find({"$or": [{"meeting_id": m_id_str}, {"meeting_id": m_doc["_id"]}]})
    tasks_formatted = [TaskResponse(**format_doc(td)) for td in t_cursor]

    m_formatted = format_doc(m_doc)
    m_formatted["tasks"] = tasks_formatted

    return MeetingResponse(**m_formatted)

@router.post("/code/{meeting_code}/end-and-analyze", response_model=MeetingResponse, summary="End live room session and run AI meeting analysis")
def end_and_analyze_meeting(meeting_code: str):
    """
    Ends the live meeting room session:
    1. Collects all speaker transcripts for the meeting.
    2. Runs Qwen3 LLM to extract summary and action items.
    3. Persists tasks in MongoDB.
    4. Updates meeting status to 'completed'.
    """
    meetings_col = get_meetings_collection()
    tasks_col = get_tasks_collection()

    m_doc = meetings_col.find_one({"$or": [{"meeting_code": meeting_code}, build_id_query(meeting_code)]})
    if not m_doc:
        raise HTTPException(status_code=404, detail=f"Meeting session '{meeting_code}' not found.")

    m_id_str = str(m_doc["_id"])

    # 1. Fetch Transcripts
    trans_col = get_transcripts_collection()
    cursor = trans_col.find({"$or": [{"meeting_id": m_id_str}, {"meeting_id": meeting_code}]})
    raw_docs = [format_doc(doc) for doc in cursor]

    if raw_docs:
        merged_timeline = timestamp_merger.merge_speaker_transcripts(raw_docs)
        transcript_text = "\n".join([f"{item['speaker_name']} [{item['start_time']}s - {item['end_time']}s]: {item['text']}" for item in merged_timeline])
    else:
        transcript_text = m_doc.get("transcript", "Live Google Meet discussion ended.")

    # 2. Extract Action Items via Qwen3 / Groq
    extraction = qwen_extractor.extract_from_transcript(transcript_text)
    summary = extraction.get("summary", "Meeting complete.")
    extracted_tasks = extraction.get("tasks", [])

    # 3. Store Tasks
    target_org_id = m_doc.get("org_id", "ORG_ACME")
    inserted_task_responses = []
    for task_item in extracted_tasks:
        t_owner = task_item.get("owner")
        t_doc = TaskModel.create_document(
            meeting_id=m_id_str,
            person=t_owner if t_owner else "Unassigned",
            task=task_item.get("task", ""),
            deadline=task_item.get("deadline"),
            priority=task_item.get("priority", "Medium"),
            status="Pending",
            org_id=target_org_id
        )
        t_res = tasks_col.insert_one(t_doc)
        inserted_task_responses.append(TaskResponse(**format_doc(t_doc)))

    # 4. Update Meeting Document
    meetings_col.update_one(
        {"_id": m_doc["_id"]},
        {"$set": {
            "transcript": transcript_text,
            "summary": summary,
            "status": "completed",
            "updated_at": datetime.utcnow().isoformat()
        }}
    )

    updated_m = meetings_col.find_one({"_id": m_doc["_id"]})
    m_formatted = format_doc(updated_m)
    m_formatted["tasks"] = inserted_task_responses

    return MeetingResponse(**m_formatted)

@router.post("", response_model=MeetingResponse, status_code=status.HTTP_201_CREATED, summary="Create a new meeting and extract action items")
def create_meeting(payload: MeetingCreate):
    extraction = groq_service.extract_action_items(payload.transcript)
    summary = extraction.get("summary", "")
    extracted_tasks = extraction.get("tasks", [])

    meetings_col = get_meetings_collection()
    meeting_doc = MeetingModel.create_document(
        title=payload.title,
        date=payload.date,
        transcript=payload.transcript,
        summary=summary,
        status="completed"
    )
    meeting_result = meetings_col.insert_one(meeting_doc)
    meeting_id_str = str(meeting_result.inserted_id)

    tasks_col = get_tasks_collection()
    inserted_task_responses = []

    for task_item in extracted_tasks:
        task_doc = TaskModel.create_document(
            meeting_id=meeting_id_str,
            person=task_item.get("person", "Unassigned"),
            task=task_item.get("task", ""),
            deadline=task_item.get("deadline"),
            priority=task_item.get("priority", "Medium"),
            status="Pending"
        )
        task_result = tasks_col.insert_one(task_doc)
        inserted_task_responses.append(TaskResponse(**format_doc(task_doc)))

    meeting_doc["_id"] = meeting_result.inserted_id
    meeting_formatted = format_doc(meeting_doc)
    meeting_formatted["tasks"] = inserted_task_responses

    return MeetingResponse(**meeting_formatted)

@router.get("", response_model=MeetingListResponse, summary="Get all meetings with pagination")
def get_meetings(
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(10, ge=1, le=100, description="Items per page")
):
    meetings_col = get_meetings_collection()
    tasks_col = get_tasks_collection()

    total = meetings_col.count_documents({})
    skip = (page - 1) * limit

    cursor = meetings_col.find().sort("created_at", -1).skip(skip).limit(limit)
    meetings_list = []

    for m_doc in cursor:
        m_id_str = str(m_doc["_id"])
        t_cursor = tasks_col.find({
            "$or": [{"meeting_id": m_id_str}, {"meeting_id": m_doc["_id"]}]
        })
        tasks_formatted = [TaskResponse(**format_doc(td)) for td in t_cursor]

        m_formatted = format_doc(m_doc)
        m_formatted["tasks"] = tasks_formatted
        meetings_list.append(MeetingResponse(**m_formatted))

    return MeetingListResponse(
        meetings=meetings_list,
        total=total,
        page=page,
        limit=limit
    )

@router.get("/{meeting_id}", response_model=MeetingResponse, summary="Get single meeting by ID")
def get_meeting_by_id(meeting_id: str):
    meetings_col = get_meetings_collection()
    tasks_col = get_tasks_collection()

    m_query = build_id_query(meeting_id)
    m_doc = meetings_col.find_one(m_query)

    if not m_doc:
        raise HTTPException(status_code=404, detail=f"Meeting with ID '{meeting_id}' not found.")

    m_oid = parse_object_id(meeting_id)
    task_filter = [{"meeting_id": meeting_id}]
    if m_oid:
        task_filter.append({"meeting_id": m_oid})

    t_cursor = tasks_col.find({"$or": task_filter})
    tasks_formatted = [TaskResponse(**format_doc(td)) for td in t_cursor]

    m_formatted = format_doc(m_doc)
    m_formatted["tasks"] = tasks_formatted

    return MeetingResponse(**m_formatted)

@router.delete("/{meeting_id}", status_code=status.HTTP_200_OK, summary="Delete a meeting and its tasks")
def delete_meeting(meeting_id: str):
    meetings_col = get_meetings_collection()
    tasks_col = get_tasks_collection()

    m_query = build_id_query(meeting_id)
    m_doc = meetings_col.find_one(m_query)

    if not m_doc:
        raise HTTPException(status_code=404, detail=f"Meeting with ID '{meeting_id}' not found.")

    m_oid = parse_object_id(meeting_id)
    task_filter = [{"meeting_id": meeting_id}]
    if m_oid:
        task_filter.append({"meeting_id": m_oid})

    tasks_col.delete_many({"$or": task_filter})
    meetings_col.delete_one(m_query)

    return {
        "message": f"Meeting '{meeting_id}' and all associated tasks have been successfully deleted.",
        "meeting_id": meeting_id
    }

@router.post("/{meeting_id}/validate", response_model=ProgressValidationResponse, summary="Validate progress against meeting action items")
def validate_meeting_progress(meeting_id: str, payload: ProgressValidationRequest):
    report = validation_service.validate_meeting_progress(meeting_id, payload.progress_update)
    return ProgressValidationResponse(**report)

@router.get("/{meeting_id}/export-mom-pdf", summary="Export Minutes of Meeting (MoM) as PDF")
def export_meeting_mom_pdf(meeting_id: str):
    """
    Generates and downloads an executive-ready Minutes of Meeting (MoM) PDF
    containing meeting metadata, AI summary, attendees, action items matrix, and audit seal.
    """
    meetings_col = get_meetings_collection()
    tasks_col = get_tasks_collection()
    transcripts_col = get_transcripts_collection()

    m_query = build_id_query(meeting_id)
    m_doc = meetings_col.find_one(m_query)
    if not m_doc:
        m_doc = meetings_col.find_one({"meeting_code": meeting_id})
    if not m_doc:
        raise HTTPException(status_code=404, detail=f"Meeting '{meeting_id}' not found.")

    m_id_str = str(m_doc["_id"])
    m_oid = parse_object_id(m_id_str)

    # Fetch associated tasks
    task_filter = [{"meeting_id": m_id_str}]
    if m_oid:
        task_filter.append({"meeting_id": m_oid})
    tasks = list(tasks_col.find({"$or": task_filter}))

    # Fetch transcripts timeline
    t_filter = [{"meeting_id": m_id_str}]
    if m_oid:
        t_filter.append({"meeting_id": m_oid})
    if m_doc.get("meeting_code"):
        t_filter.append({"meeting_id": m_doc["meeting_code"]})
    transcripts = list(transcripts_col.find({"$or": t_filter}).sort("start_time", 1))

    # Determine participants
    participants = []
    if m_doc.get("participants"):
        participants = [p.get("name") if isinstance(p, dict) else str(p) for p in m_doc["participants"]]
    else:
        speakers = set()
        for t in transcripts:
            sp = t.get("speaker_name") or t.get("speaker")
            if sp:
                speakers.add(sp)
        for tsk in tasks:
            per = tsk.get("person")
            if per and per.lower() != "unassigned":
                speakers.add(per)
        participants = list(speakers)

    pdf_bytes = mom_pdf_service.generate_mom_pdf(
        meeting_data=m_doc,
        tasks=tasks,
        participants=participants,
        transcript_timeline=transcripts
    )

    clean_code = m_doc.get("meeting_code") or m_id_str[:8]
    filename = f"MoM_{clean_code}.pdf"

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Access-Control-Expose-Headers": "Content-Disposition"
        }
    )

