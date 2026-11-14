from fastapi import APIRouter, HTTPException, Query, status
from typing import List, Optional
from app.database.mongodb import (
    get_transcripts_collection,
    get_action_items_collection,
    get_tasks_collection,
    build_id_query,
    format_doc
)
from app.models.action_item import ActionItemModel, TaskDocumentModel
from app.schemas.action_item_schema import (
    ActionItemTask,
    ActionItemExtractionResponse,
    TaskResponse,
    TaskStatusUpdatePayload
)
from ai.llm.qwen_extractor import qwen_extractor
from ai.speech.timestamp_merger import timestamp_merger
from app.utils.vocabulary_normalizer import normalize_text_naming_words

router = APIRouter(prefix="/api", tags=["LLM Action Item Extraction (Checkpoint 6)"])

@router.post("/meetings/{meeting_id}/extract-action-items", response_model=ActionItemExtractionResponse, status_code=status.HTTP_201_CREATED, summary="Extract structured action items, decisions, and discussions using Qwen3 LLM")
def extract_action_items_from_meeting(meeting_id: str, custom_transcript: Optional[str] = Query(None, description="Optional explicit meeting transcript")):
    """
    Analyzes meeting transcripts using Qwen3 LLM to extract structured tasks, decisions, and summaries.
    Stores extracted action items and individual tasks in MongoDB.
    """
    try:
        # 1. Retrieve transcript text
        if custom_transcript and len(custom_transcript.strip()) > 0:
            transcript_text = custom_transcript.strip()
        else:
            trans_col = get_transcripts_collection()
            cursor = trans_col.find({"meeting_id": meeting_id})
            raw_docs = [format_doc(doc) for doc in cursor]
            if not raw_docs:
                raise HTTPException(status_code=404, detail=f"No transcripts found for meeting '{meeting_id}'. Please upload transcript or run STT first.")

            merged_timeline = timestamp_merger.merge_speaker_transcripts(raw_docs)
            transcript_text = "\n".join([f"{item['speaker_name']} [{item['start_time']}s - {item['end_time']}s]: {item['text']}" for item in merged_timeline])

        # Normalize naming words, participant names, and technical terms before LLM extraction
        transcript_text = normalize_text_naming_words(transcript_text)

        # 2. Process with Qwen3 LLM Extractor
        extracted = qwen_extractor.extract_from_transcript(transcript_text)

        summary = extracted.get("summary", "Meeting action item extraction complete.")
        raw_decisions = extracted.get("decisions", [])
        raw_discussions = extracted.get("discussions", [])
        decisions = [d.get("decision", d.get("text", str(d))) if isinstance(d, dict) else str(d) for d in raw_decisions]
        discussions = [d.get("discussion", d.get("text", str(d))) if isinstance(d, dict) else str(d) for d in raw_discussions]
        extracted_tasks = extracted.get("tasks", [])

        # 3. Store Action Items Document
        act_col = get_action_items_collection()
        act_doc = ActionItemModel.create_document(
            meeting_id=meeting_id,
            summary=summary,
            decisions=decisions,
            discussions=discussions,
            tasks=extracted_tasks
        )
        res_act = act_col.insert_one(act_doc)
        act_doc["_id"] = res_act.inserted_id

        # 4. Store Tasks in MongoDB 'tasks' Collection
        tasks_col = get_tasks_collection()
        for t_item in extracted_tasks:
            t_doc = TaskDocumentModel.create_document(
                meeting_id=meeting_id,
                owner=t_item.get("owner", "Unassigned"),
                task=t_item.get("task", ""),
                deadline=t_item.get("deadline", "Unspecified"),
                priority=t_item.get("priority", "Medium"),
                deliverable=t_item.get("deliverable", "Target Artifact"),
                status="Pending"
            )
            tasks_col.insert_one(t_doc)

        return ActionItemExtractionResponse(**format_doc(act_doc))
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"{type(e).__name__}: {str(e)}")

@router.get("/meetings/{meeting_id}/action-items", response_model=ActionItemExtractionResponse, summary="Get extracted action items for a meeting")
def get_meeting_action_items(meeting_id: str):
    """
    Retrieves stored action items, decisions, and tasks for a given meeting.
    """
    act_col = get_action_items_collection()
    doc = act_col.find_one({"meeting_id": meeting_id})
    if not doc:
        raise HTTPException(status_code=404, detail=f"No action items found for meeting '{meeting_id}'.")
    return ActionItemExtractionResponse(**format_doc(doc))

@router.get("/tasks", response_model=List[TaskResponse], summary="List all tasks across meetings")
def get_all_tasks(
    owner: Optional[str] = Query(None, description="Filter by task owner"),
    status_filter: Optional[str] = Query(None, alias="status", description="Filter by status: Pending, In Progress, Completed, Delayed"),
    priority: Optional[str] = Query(None, description="Filter by priority: High, Medium, Low")
):
    """
    Lists tasks across meetings filterable by owner, status, or priority.
    """
    tasks_col = get_tasks_collection()
    query = {}
    if owner:
        query["owner"] = {"$regex": owner, "$options": "i"}
    if status_filter:
        query["status"] = status_filter
    if priority:
        query["priority"] = priority

    cursor = tasks_col.find(query).sort("created_at", -1)
    return [TaskResponse(**format_doc(doc)) for doc in cursor]

@router.patch("/tasks/{task_id}/status", response_model=TaskResponse, summary="Update task status")
def update_task_status(task_id: str, payload: TaskStatusUpdatePayload):
    """
    Updates the status of a specific task (e.g., Pending -> Completed).
    """
    tasks_col = get_tasks_collection()
    query = {"$or": [{"task_id": task_id}, build_id_query(task_id)]}
    
    res = tasks_col.update_one(query, {"$set": {"status": payload.status}})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail=f"Task '{task_id}' not found.")

    updated_doc = tasks_col.find_one(query)
    return TaskResponse(**format_doc(updated_doc))
