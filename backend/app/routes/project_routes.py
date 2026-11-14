from fastapi import APIRouter, HTTPException, Query, status
from typing import List, Optional, Dict, Any
from datetime import datetime
import uuid

from app.database.mongodb import (
    get_projects_collection,
    get_meetings_collection,
    get_tasks_collection,
    build_id_query,
    format_doc,
    parse_object_id
)
from app.models.project import ProjectModel
from app.schemas.project_schema import (
    ProjectCreate,
    ProjectUpdate,
    ProjectResponse,
    MilestoneCreate,
    MilestoneUpdate
)

router = APIRouter(prefix="/api/projects", tags=["Projects"])

@router.get("", response_model=List[ProjectResponse], summary="List all projects with optional filters")
def get_projects(
    status_filter: Optional[str] = Query(None, alias="status", description="Filter by status (Planning, In Progress, On Hold, Completed)"),
    priority_filter: Optional[str] = Query(None, alias="priority", description="Filter by priority (High, Medium, Low)"),
    search: Optional[str] = Query(None, description="Search term for project name, key, or description"),
    org_id: Optional[str] = Query(None, description="Filter by Organization ID")
):
    projects_col = get_projects_collection()
    query: Dict[str, Any] = {}

    if status_filter and status_filter.lower() != "all":
        query["status"] = status_filter
    if priority_filter and priority_filter.lower() != "all":
        query["priority"] = priority_filter
    if org_id and org_id != "GLOBAL":
        query["$or"] = [{"org_id": org_id}, {"org_id": {"$exists": False}}, {"org_id": None}]

    if search:
        search_rgx = {"$regex": search, "$options": "i"}
        query["$or"] = [
            {"name": search_rgx},
            {"key": search_rgx},
            {"description": search_rgx},
            {"lead_name": search_rgx}
        ]

    cursor = projects_col.find(query).sort("created_at", -1)
    return [ProjectResponse(**format_doc(doc)) for doc in cursor]


@router.post("", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED, summary="Create a new project")
def create_project(payload: ProjectCreate):
    projects_col = get_projects_collection()
    
    doc = ProjectModel.create_document(
        name=payload.name,
        key=payload.key,
        description=payload.description or "",
        status=payload.status or "In Progress",
        priority=payload.priority or "Medium",
        org_id=payload.org_id,
        lead_name=payload.lead_name or "Unassigned",
        team_members=payload.team_members or [],
        start_date=payload.start_date,
        target_date=payload.target_date,
        progress=payload.progress or 0,
        budget=payload.budget or ""
    )

    res = projects_col.insert_one(doc)
    doc["_id"] = res.inserted_id
    return ProjectResponse(**format_doc(doc))


@router.get("/{project_id}", summary="Get detailed project view with linked meetings & tasks")
def get_project_details(project_id: str):
    projects_col = get_projects_collection()
    meetings_col = get_meetings_collection()
    tasks_col = get_tasks_collection()

    p_query = build_id_query(project_id)
    # Also check project_id field
    doc = projects_col.find_one({"$or": [p_query, {"project_id": project_id}]})
    if not doc:
        raise HTTPException(status_code=404, detail=f"Project '{project_id}' not found.")

    formatted_project = format_doc(doc)
    proj_key = formatted_project.get("key", "")
    p_id_str = formatted_project.get("id")

    # Fetch linked meetings
    meetings_cursor = meetings_col.find({
        "$or": [
            {"project_id": p_id_str},
            {"project_id": project_id},
            {"project_key": proj_key}
        ]
    }).sort("created_at", -1)
    linked_meetings = [format_doc(m) for m in meetings_cursor]

    # Fetch linked tasks
    linked_meeting_ids = [str(m.get("_id") or m.get("id")) for m in linked_meetings]
    tasks_cursor = tasks_col.find({
        "$or": [
            {"project_id": p_id_str},
            {"project_id": project_id},
            {"meeting_id": {"$in": linked_meeting_ids}}
        ]
    }).sort("created_at", -1)
    linked_tasks = [format_doc(t) for t in tasks_cursor]

    # Auto-calculate dynamic progress if tasks exist
    if linked_tasks:
        completed_count = sum(1 for t in linked_tasks if t.get("status") == "Completed")
        dynamic_progress = round((completed_count / len(linked_tasks)) * 100)
        formatted_project["calculated_progress"] = dynamic_progress
    else:
        formatted_project["calculated_progress"] = formatted_project.get("progress", 0)

    formatted_project["linked_meetings"] = linked_meetings
    formatted_project["linked_tasks"] = linked_tasks

    return formatted_project


@router.patch("/{project_id}", response_model=ProjectResponse, summary="Update project attributes")
def update_project(project_id: str, payload: ProjectUpdate):
    projects_col = get_projects_collection()
    p_query = build_id_query(project_id)

    existing = projects_col.find_one({"$or": [p_query, {"project_id": project_id}]})
    if not existing:
        raise HTTPException(status_code=404, detail=f"Project '{project_id}' not found.")

    update_fields = {k: v for k, v in payload.dict(exclude_unset=True).items() if v is not None}
    update_fields["updated_at"] = datetime.utcnow().isoformat()

    projects_col.update_one(
        {"_id": existing["_id"]},
        {"$set": update_fields}
    )

    updated_doc = projects_col.find_one({"_id": existing["_id"]})
    return ProjectResponse(**format_doc(updated_doc))


@router.delete("/{project_id}", summary="Delete project")
def delete_project(project_id: str):
    projects_col = get_projects_collection()
    p_query = build_id_query(project_id)

    res = projects_col.delete_one({"$or": [p_query, {"project_id": project_id}]})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail=f"Project '{project_id}' not found.")

    return {"status": "success", "message": f"Project '{project_id}' deleted successfully."}


# Milestones Sub-resource
@router.post("/{project_id}/milestones", summary="Add milestone to project")
def add_milestone(project_id: str, payload: MilestoneCreate):
    projects_col = get_projects_collection()
    p_query = build_id_query(project_id)

    existing = projects_col.find_one({"$or": [p_query, {"project_id": project_id}]})
    if not existing:
        raise HTTPException(status_code=404, detail="Project not found.")

    new_milestone = {
        "id": f"ms_{uuid.uuid4().hex[:6]}",
        "title": payload.title.strip(),
        "due_date": payload.due_date or "",
        "completed": False,
        "created_at": datetime.utcnow().isoformat()
    }

    projects_col.update_one(
        {"_id": existing["_id"]},
        {
            "$push": {"milestones": new_milestone},
            "$set": {"updated_at": datetime.utcnow().isoformat()}
        }
    )

    return new_milestone


@router.patch("/{project_id}/milestones/{milestone_id}", summary="Toggle or update milestone")
def update_milestone(project_id: str, milestone_id: str, payload: MilestoneUpdate):
    projects_col = get_projects_collection()
    p_query = build_id_query(project_id)

    existing = projects_col.find_one({"$or": [p_query, {"project_id": project_id}]})
    if not existing:
        raise HTTPException(status_code=404, detail="Project not found.")

    milestones = existing.get("milestones", [])
    updated = False
    for m in milestones:
        if m.get("id") == milestone_id:
            if payload.title is not None:
                m["title"] = payload.title
            if payload.due_date is not None:
                m["due_date"] = payload.due_date
            if payload.completed is not None:
                m["completed"] = payload.completed
            updated = True
            break

    if not updated:
        raise HTTPException(status_code=404, detail="Milestone not found.")

    projects_col.update_one(
        {"_id": existing["_id"]},
        {
            "$set": {
                "milestones": milestones,
                "updated_at": datetime.utcnow().isoformat()
            }
        }
    )

    return {"status": "success", "milestones": milestones}


@router.delete("/{project_id}/milestones/{milestone_id}", summary="Remove milestone from project")
def delete_milestone(project_id: str, milestone_id: str):
    projects_col = get_projects_collection()
    p_query = build_id_query(project_id)

    existing = projects_col.find_one({"$or": [p_query, {"project_id": project_id}]})
    if not existing:
        raise HTTPException(status_code=404, detail="Project not found.")

    projects_col.update_one(
        {"_id": existing["_id"]},
        {
            "$pull": {"milestones": {"id": milestone_id}},
            "$set": {"updated_at": datetime.utcnow().isoformat()}
        }
    )

    return {"status": "success", "message": "Milestone removed"}


# Link Meeting to Project
@router.post("/{project_id}/link-meeting", summary="Link an existing meeting to this project")
def link_meeting(project_id: str, payload: Dict[str, str]):
    meeting_id = payload.get("meeting_id")
    if not meeting_id:
        raise HTTPException(status_code=400, detail="meeting_id is required")

    meetings_col = get_meetings_collection()
    m_query = build_id_query(meeting_id)

    res = meetings_col.update_one(
        m_query,
        {"$set": {"project_id": project_id, "updated_at": datetime.utcnow().isoformat()}}
    )

    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Meeting not found")

    return {"status": "success", "message": f"Meeting '{meeting_id}' linked to project '{project_id}'"}


# Create task directly under project
@router.post("/{project_id}/tasks", summary="Create and link a task directly to this project")
def create_project_task(project_id: str, payload: Dict[str, Any]):
    tasks_col = get_tasks_collection()
    projects_col = get_projects_collection()

    p_query = build_id_query(project_id)
    project_doc = projects_col.find_one({"$or": [p_query, {"project_id": project_id}]})
    if not project_doc:
        raise HTTPException(status_code=404, detail="Project not found")

    task_desc = payload.get("task") or payload.get("description")
    if not task_desc:
        raise HTTPException(status_code=400, detail="Task description is required")

    now = datetime.utcnow().isoformat()
    task_doc = {
        "task": task_desc.strip(),
        "person": payload.get("person") or payload.get("owner") or "Unassigned",
        "owner": payload.get("owner") or payload.get("person") or "Unassigned",
        "deadline": payload.get("deadline") or "",
        "priority": payload.get("priority") or "Medium",
        "status": payload.get("status") or "Pending",
        "deliverable": payload.get("deliverable") or "Project Deliverable",
        "project_id": project_id,
        "meeting_id": payload.get("meeting_id") or "PROJECT_MANUAL",
        "org_id": project_doc.get("org_id") or "ORG_ACME",
        "created_at": now,
        "updated_at": now
    }

    res = tasks_col.insert_one(task_doc)
    task_doc["_id"] = res.inserted_id
    return format_doc(task_doc)
