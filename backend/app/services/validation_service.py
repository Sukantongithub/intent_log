import logging
from typing import Dict, Any
from fastapi import HTTPException
from app.database.mongodb import get_meetings_collection, get_tasks_collection, parse_object_id, build_id_query, format_doc
from app.services.groq_service import groq_service

logger = logging.getLogger(__name__)

class ValidationService:
    @staticmethod
    def validate_meeting_progress(meeting_id_str: str, progress_update: str) -> Dict[str, Any]:
        """
        Retrieves a meeting's action items from MongoDB and uses Groq LLM to compare
        them with the progress update.
        """
        meetings_col = get_meetings_collection()
        tasks_col = get_tasks_collection()

        m_query = build_id_query(meeting_id_str)
        meeting = meetings_col.find_one(m_query)

        if not meeting:
            raise HTTPException(status_code=404, detail=f"Meeting with ID '{meeting_id_str}' not found.")

        m_oid = parse_object_id(meeting_id_str)
        task_filter = [{"meeting_id": meeting_id_str}]
        if m_oid:
            task_filter.append({"meeting_id": m_oid})

        tasks_cursor = tasks_col.find({"$or": task_filter})
        tasks = [format_doc(doc) for doc in tasks_cursor]

        if not tasks:
            logger.warning(f"No tasks found for meeting '{meeting_id_str}'.")

        # Send tasks and progress update to Groq Service
        validation_report = groq_service.validate_action_items(tasks, progress_update)
        return validation_report


validation_service = ValidationService()
