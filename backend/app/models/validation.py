from datetime import datetime
import uuid
from typing import List

class ValidationReportModel:
    """
    Helper structure for validation report documents in MongoDB collection `validation_reports`.
    """
    @staticmethod
    def create_document(
        task_id: str,
        deliverable_id: str,
        validation_status: str,
        coverage_score: float,
        rationale: str,
        fulfilled_points: List[str] = None,
        missing_points: List[str] = None
    ) -> dict:
        now = datetime.utcnow().isoformat()
        seq = uuid.uuid4().hex[:8].upper()
        report_id = f"RPT_{seq}"

        return {
            "report_id": report_id,
            "task_id": task_id,
            "deliverable_id": deliverable_id,
            "validation_status": validation_status,
            "coverage_score": round(coverage_score, 1),
            "rationale": rationale,
            "fulfilled_points": fulfilled_points or [],
            "missing_points": missing_points or [],
            "created_at": now,
            "updated_at": now
        }
