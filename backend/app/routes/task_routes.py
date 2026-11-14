from fastapi import APIRouter, HTTPException, Query, status
from typing import List, Optional
from datetime import datetime
from app.database.mongodb import get_tasks_collection, parse_object_id, build_id_query, format_doc
from app.schemas.task_schema import TaskResponse, TaskStatusUpdate, StatusEnum, PriorityEnum

router = APIRouter(prefix="/api/tasks", tags=["Tasks"])

@router.get("", response_model=List[TaskResponse], summary="Get all tasks with optional filtering")
def get_tasks(
    status_filter: Optional[StatusEnum] = Query(None, alias="status", description="Filter by task status"),
    priority_filter: Optional[PriorityEnum] = Query(None, alias="priority", description="Filter by task priority"),
    person_filter: Optional[str] = Query(None, alias="person", description="Filter by responsible person (case-insensitive search)"),
    org_id: Optional[str] = Query(None, alias="org_id", description="Filter by Organization ID")
):
    """
    Returns tasks stored across meetings with optional query filters for status, priority, person, and organization ID.
    """
    tasks_col = get_tasks_collection()
    query = {}

    if status_filter:
        query["status"] = status_filter.value
    if priority_filter:
        query["priority"] = priority_filter.value
    if person_filter:
        query["person"] = {"$regex": person_filter, "$options": "i"}
    if org_id and org_id != "GLOBAL":
        query["$or"] = [{"org_id": org_id}, {"org_id": {"$exists": False}}]

    cursor = tasks_col.find(query).sort("created_at", -1)
    tasks_list = [TaskResponse(**format_doc(doc)) for doc in cursor]
    return tasks_list


@router.get("/{task_id}", response_model=TaskResponse, summary="Get single task by ID")
def get_task_by_id(task_id: str):
    """
    Retrieves details for a single task by its MongoDB ID.
    """
    tasks_col = get_tasks_collection()
    t_query = build_id_query(task_id)

    task_doc = tasks_col.find_one(t_query)
    if not task_doc:
        raise HTTPException(status_code=404, detail=f"Task with ID '{task_id}' not found.")

    return TaskResponse(**format_doc(task_doc))


@router.patch("/{task_id}/status", response_model=TaskResponse, summary="Update task status")
def update_task_status(task_id: str, payload: TaskStatusUpdate):
    """
    Updates the status of a specific task (Pending, In Progress, Completed, Delayed).
    """
    tasks_col = get_tasks_collection()
    t_query = build_id_query(task_id)

    existing_task = tasks_col.find_one(t_query)
    if not existing_task:
        raise HTTPException(status_code=404, detail=f"Task with ID '{task_id}' not found.")

    tasks_col.update_one(
        t_query,
        {"$set": {"status": payload.status.value, "updated_at": datetime.utcnow().isoformat()}}
    )

    updated_task = tasks_col.find_one(t_query)
    return TaskResponse(**format_doc(updated_task))

