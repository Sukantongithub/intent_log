from fastapi import APIRouter, HTTPException, status
from app.database.mongodb import (
    get_tasks_collection,
    get_deliverables_collection,
    get_validation_reports_collection,
    build_id_query,
    format_doc
)
from app.models.validation import ValidationReportModel
from app.schemas.validation_schema import ValidationReportResponse, TaskRequirementsResponse
from ai.validation.validation_engine import validation_engine

router = APIRouter(prefix="/api/tasks", tags=["Deliverable Validation Engine"])

@router.get("/{task_id}/requirements", response_model=TaskRequirementsResponse, summary="Retrieve requirements associated with task (Checkpoint 11)")
def get_task_requirements(task_id: str):
    """
    Retrieves requirements associated with the task from meeting context (Checkpoint 11).
    """
    tasks_col = get_tasks_collection()
    task_doc = tasks_col.find_one({"$or": [{"task_id": task_id}, build_id_query(task_id)]})
    if not task_doc:
        raise HTTPException(status_code=404, detail=f"Task '{task_id}' not found.")

    task_desc = task_doc.get("task", "")
    target_deliv = task_doc.get("deliverable", "Target Artifact")
    t_id = task_doc.get("task_id", task_id)

    req_res = validation_engine.extract_task_requirements(task_desc, target_deliv)

    return TaskRequirementsResponse(
        task_id=t_id,
        task=task_desc,
        expected_deliverable=target_deliv,
        requirements=req_res["requirements"],
        required_sections=req_res["required_sections"],
        required_evidence=req_res["required_evidence"],
        required_file_types=req_res["required_file_types"]
    )

@router.post("/{task_id}/validate-deliverable", response_model=ValidationReportResponse, status_code=status.HTTP_201_CREATED, summary="Validate uploaded deliverable against task commitments")
def validate_task_deliverable(task_id: str):
    """
    Validates uploaded deliverable document against original task commitments using Rules + RAG + Qwen3.
    (Checkpoints 11 - 15)
    Classifies result as COMPLETE, PARTIALLY_COMPLETE, or INCOMPLETE.
    Updates task status in MongoDB accordingly.
    """
    tasks_col = get_tasks_collection()
    task_doc = tasks_col.find_one({"$or": [{"task_id": task_id}, build_id_query(task_id)]})
    if not task_doc:
        raise HTTPException(status_code=404, detail=f"Task '{task_id}' not found.")

    deliv_col = get_deliverables_collection()
    deliv_doc = deliv_col.find_one({"task_id": task_id})
    if not deliv_doc:
        raise HTTPException(status_code=400, detail=f"No deliverable document uploaded for task '{task_id}'. Please upload a deliverable file first.")

    task_desc = task_doc.get("task", "")
    target_deliverable = task_doc.get("deliverable", "Target Artifact")
    extracted_text = deliv_doc.get("extracted_text", "")
    filename = deliv_doc.get("filename", "deliverable")
    file_type = deliv_doc.get("file_type", "")
    m_id = task_doc.get("meeting_id", "")

    # Execute Validation Engine (Checkpoints 11 - 15)
    val_res = validation_engine.validate_deliverable(
        task_description=task_desc,
        target_deliverable=target_deliverable,
        extracted_text=extracted_text,
        filename=filename,
        file_type=file_type,
        task_id=task_id,
        meeting_id=m_id
    )

    status_classification = val_res.get("validation_status", "INCOMPLETE")
    coverage_score = val_res.get("coverage_score", 0.0)
    comp_pct = val_res.get("completion_percentage", coverage_score)
    rationale = val_res.get("rationale", "")
    reason = val_res.get("reason", rationale)
    feedback = val_res.get("feedback", "")
    fulfilled = val_res.get("fulfilled_points", [])
    missing = val_res.get("missing_points", [])
    evidence_found = val_res.get("evidence_found", fulfilled)
    missing_reqs = val_res.get("missing_requirements", missing)
    rule_results = val_res.get("rule_results", [])

    val_col = get_validation_reports_collection()
    doc = ValidationReportModel.create_document(
        task_id=task_id,
        deliverable_id=str(deliv_doc.get("deliverable_id", deliv_doc.get("_id"))),
        validation_status=status_classification,
        coverage_score=coverage_score,
        rationale=rationale,
        fulfilled_points=fulfilled,
        missing_points=missing
    )

    doc["completion_percentage"] = comp_pct
    doc["reason"] = reason
    doc["feedback"] = feedback
    doc["evidence_found"] = evidence_found
    doc["missing_requirements"] = missing_reqs
    doc["rule_results"] = rule_results

    val_col.update_one(
        {"task_id": task_id},
        {"$set": doc},
        upsert=True
    )

    # Update Task Status according to Validation Result
    status_upper = status_classification.upper()
    if status_upper in ["COMPLETE", "COMPLETED"]:
        new_task_status = "Completed"
    elif status_upper in ["PARTIALLY_COMPLETE", "PARTIAL"]:
        new_task_status = "In Progress"
    else:
        new_task_status = "Delayed"

    tasks_col.update_one(
        {"$or": [{"task_id": task_id}, build_id_query(task_id)]},
        {"$set": {"status": new_task_status}}
    )

    saved_report = val_col.find_one({"task_id": task_id})
    return ValidationReportResponse(**format_doc(saved_report))

@router.get("/{task_id}/validation-report", response_model=ValidationReportResponse, summary="Retrieve stored validation report for a task")
def get_validation_report(task_id: str):
    """
    Retrieves stored validation report details for a task.
    """
    val_col = get_validation_reports_collection()
    doc = val_col.find_one({"task_id": task_id})
    if not doc:
        raise HTTPException(status_code=404, detail=f"No validation report found for task '{task_id}'.")
    return ValidationReportResponse(**format_doc(doc))
