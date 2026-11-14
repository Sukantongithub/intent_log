from fastapi import APIRouter, HTTPException, status, Query
from typing import List, Optional
from datetime import datetime

from app.database.mongodb import (
    get_users_collection,
    get_organizations_collection,
    get_meetings_collection,
    get_tasks_collection,
    get_deliverables_collection,
    get_validation_results_collection,
    get_transcripts_collection,
    build_id_query,
    format_doc
)
from app.schemas.user_schema import AdminMetricsResponse
from app.schemas.meeting_schema import MeetingResponse
from app.models.task import TaskModel
from app.schemas.task_schema import TaskResponse
from ai.llm.qwen_extractor import qwen_extractor
from ai.speech.timestamp_merger import timestamp_merger

router = APIRouter(prefix="/api/admin", tags=["Admin Control Panel & System Metrics"])

@router.get("/metrics", response_model=AdminMetricsResponse, summary="Get metrics & overview (Global or Org Scoped)")
def get_admin_metrics(org_id: Optional[str] = Query(None, description="Filter metrics by Organization ID")):
    users_col = get_users_collection()
    orgs_col = get_organizations_collection()
    meetings_col = get_meetings_collection()
    tasks_col = get_tasks_collection()
    deliverables_col = get_deliverables_collection()
    validations_col = get_validation_results_collection()

    user_query = {}
    meeting_query = {}
    if org_id and org_id != "GLOBAL":
        user_query["org_id"] = org_id
        meeting_query["org_id"] = org_id

    total_users = users_col.count_documents(user_query)
    total_admins = users_col.count_documents({**user_query, "role": {"$in": ["super_admin", "org_admin"]}})
    if org_id and org_id != "GLOBAL":
        total_orgs = orgs_col.count_documents({"org_id": org_id})
    else:
        total_orgs = orgs_col.count_documents({})

    total_meetings = meetings_col.count_documents(meeting_query)
    total_live = meetings_col.count_documents({**meeting_query, "status": "live"})

    total_tasks = tasks_col.count_documents({})
    total_deliverables = deliverables_col.count_documents({})

    validations = list(validations_col.find({}))
    if validations:
        complete_count = sum(1 for v in validations if v.get("final_assessment") == "COMPLETE")
        pass_rate = round((complete_count / len(validations)) * 100, 1)
    else:
        pass_rate = 100.0

    return AdminMetricsResponse(
        total_users=total_users,
        total_admin_users=total_admins,
        total_organizations=total_orgs,
        total_meetings=total_meetings,
        total_live_meetings=total_live,
        total_tasks=total_tasks,
        total_deliverables=total_deliverables,
        validation_pass_rate=pass_rate
    )

@router.get("/logs", summary="Get system audit logs (Global or Org Scoped)")
def get_admin_audit_logs(org_id: Optional[str] = Query(None, description="Filter audit logs by Organization ID")):
    users_col = get_users_collection()
    meetings_col = get_meetings_collection()
    validations_col = get_validation_results_collection()

    user_query = {}
    meeting_query = {}
    if org_id and org_id != "GLOBAL":
        user_query["org_id"] = org_id
        meeting_query["org_id"] = org_id

    logs = []

    # 1. User activity
    for u in users_col.find(user_query).sort("created_at", -1).limit(10):
        role_disp = u.get('role_display_name') or u.get('role', 'User').upper()
        logs.append({
            "id": f"log_u_{str(u['_id'])}",
            "type": "USER_AUTH",
            "message": f"User '{u.get('name')}' ({u.get('email')}) logged in as [{role_disp}] under Org [{u.get('org_id', 'ACME')}].",
            "timestamp": u.get("created_at") or datetime.utcnow().isoformat(),
            "level": "INFO"
        })

    # 2. Meetings
    for m in meetings_col.find(meeting_query).sort("created_at", -1).limit(10):
        logs.append({
            "id": f"log_m_{str(m['_id'])}",
            "type": "MEETING_EVENT",
            "message": f"Meeting '{m.get('title')}' ({m.get('meeting_code', 'ROOM')}) status set to [{m.get('status', 'live').upper()}].",
            "timestamp": m.get("created_at") or datetime.utcnow().isoformat(),
            "level": "SUCCESS" if m.get("status") == "completed" else "INFO"
        })

    # 3. AI Validations
    for v in validations_col.find().sort("validated_at", -1).limit(10):
        logs.append({
            "id": f"log_v_{str(v['_id'])}",
            "type": "AI_VALIDATION",
            "message": f"AI Validation completed for task '{v.get('task_id')}': Assessment [{v.get('final_assessment', 'PENDING')}]. Score {v.get('completeness_score', 0)}%.",
            "timestamp": v.get("validated_at") or datetime.utcnow().isoformat(),
            "level": "WARNING" if v.get("final_assessment") == "INCOMPLETE" else "SUCCESS"
        })

    logs.sort(key=lambda x: x["timestamp"], reverse=True)
    return {"logs": logs}

@router.delete("/meetings/{meeting_id}", summary="Force delete a meeting session")
def admin_delete_meeting(meeting_id: str):
    meetings_col = get_meetings_collection()
    tasks_col = get_tasks_collection()
    trans_col = get_transcripts_collection()

    m_query = {"$or": [{"meeting_code": meeting_id}, build_id_query(meeting_id)]}
    m_doc = meetings_col.find_one(m_query)
    if not m_doc:
        raise HTTPException(status_code=404, detail=f"Meeting '{meeting_id}' not found.")

    m_id_str = str(m_doc["_id"])
    meetings_col.delete_one({"_id": m_doc["_id"]})
    tasks_col.delete_many({"$or": [{"meeting_id": m_id_str}, {"meeting_id": meeting_id}]})
    trans_col.delete_many({"$or": [{"meeting_id": m_id_str}, {"meeting_id": meeting_id}]})

    return {"message": f"Meeting '{meeting_id}' and all associated tasks/transcripts deleted."}

@router.post("/meetings/{meeting_id}/reanalyze", response_model=MeetingResponse, summary="Force re-run AI meeting analysis")
def admin_reanalyze_meeting(meeting_id: str):
    meetings_col = get_meetings_collection()
    tasks_col = get_tasks_collection()
    trans_col = get_transcripts_collection()

    m_query = {"$or": [{"meeting_code": meeting_id}, build_id_query(meeting_id)]}
    m_doc = meetings_col.find_one(m_query)
    if not m_doc:
        raise HTTPException(status_code=404, detail=f"Meeting '{meeting_id}' not found.")

    m_id_str = str(m_doc["_id"])

    cursor = trans_col.find({"$or": [{"meeting_id": m_id_str}, {"meeting_id": meeting_id}]})
    raw_docs = [format_doc(doc) for doc in cursor]

    if raw_docs:
        merged_timeline = timestamp_merger.merge_speaker_transcripts(raw_docs)
        transcript_text = "\n".join([f"{item['speaker_name']} [{item['start_time']}s - {item['end_time']}s]: {item['text']}" for item in merged_timeline])
    else:
        transcript_text = m_doc.get("transcript", "Google Meet session discussion.")

    extraction = qwen_extractor.extract_from_transcript(transcript_text)
    summary = extraction.get("summary", "Admin re-analysis complete.")
    extracted_tasks = extraction.get("tasks", [])

    tasks_col.delete_many({"$or": [{"meeting_id": m_id_str}, {"meeting_id": meeting_id}]})
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

@router.delete("/tasks/{task_id}", summary="Force delete a task")
def admin_delete_task(task_id: str):
    tasks_col = get_tasks_collection()
    query = build_id_query(task_id)
    res = tasks_col.delete_one(query)
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail=f"Task '{task_id}' not found.")
    return {"message": f"Task '{task_id}' deleted."}
