from fastapi import APIRouter, HTTPException, UploadFile, File, status
from typing import List
from app.database.mongodb import (
    get_tasks_collection,
    get_deliverables_collection,
    build_id_query,
    format_doc
)
from app.models.deliverable import DeliverableDocumentModel
from app.schemas.deliverable_schema import DeliverableUploadResponse
from ai.validation.document_processor import document_processor

router = APIRouter(prefix="/api/tasks", tags=["Deliverable Processing (Checkpoint 7)"])

@router.post("/{task_id}/deliverable/upload", response_model=DeliverableUploadResponse, status_code=status.HTTP_201_CREATED, summary="Upload deliverable document (PDF, DOCX, XLSX, TXT) for task")
async def upload_task_deliverable(task_id: str, file: UploadFile = File(...)):
    """
    Ingests deliverable document (PDF, DOCX, XLSX, TXT) for an action item task:
    1. Validates task existence in MongoDB.
    2. Processes file bytes using PyMuPDF / python-docx / openpyxl document processor.
    3. Extracts text content, paragraph/page count metadata.
    4. Persists deliverable document in MongoDB 'deliverables' collection.
    """
    tasks_col = get_tasks_collection()
    task_doc = tasks_col.find_one({"$or": [{"task_id": task_id}, build_id_query(task_id)]})
    if not task_doc:
        raise HTTPException(status_code=404, detail=f"Task '{task_id}' not found.")

    file_bytes = await file.read()
    filename = file.filename or "deliverable_document.txt"
    content_type = file.content_type or ""

    # Process Document
    parsed_res = document_processor.process_file_bytes(
        file_bytes=file_bytes,
        filename=filename,
        content_type=content_type
    )

    deliv_col = get_deliverables_collection()
    doc = DeliverableDocumentModel.create_document(
        task_id=task_id,
        filename=filename,
        file_type=parsed_res["file_type"],
        file_size_bytes=len(file_bytes),
        extracted_text=parsed_res["extracted_text"],
        metadata=parsed_res["metadata"]
    )

    # Upsert deliverable for task
    deliv_col.update_one(
        {"task_id": task_id},
        {"$set": doc},
        upsert=True
    )

    # Update Task Status to 'In Progress' / 'Under Review'
    tasks_col.update_one(
        {"$or": [{"task_id": task_id}, build_id_query(task_id)]},
        {"$set": {"status": "In Progress"}}
    )

    saved_doc = deliv_col.find_one({"task_id": task_id})
    return DeliverableUploadResponse(**format_doc(saved_doc))

@router.get("/{task_id}/deliverable", response_model=DeliverableUploadResponse, summary="Get uploaded deliverable document details")
def get_task_deliverable(task_id: str):
    """
    Retrieves stored deliverable details and extracted text content for a given task.
    """
    deliv_col = get_deliverables_collection()
    doc = deliv_col.find_one({"task_id": task_id})
    if not doc:
        raise HTTPException(status_code=404, detail=f"No deliverable uploaded for task '{task_id}'.")
    return DeliverableUploadResponse(**format_doc(doc))
