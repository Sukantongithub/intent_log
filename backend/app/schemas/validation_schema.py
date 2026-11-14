from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional

class TaskRequirementsResponse(BaseModel):
    task_id: str
    task: str
    expected_deliverable: str
    requirements: List[str] = Field(default=[], description="List of expected requirements extracted from meeting")
    required_sections: List[str] = Field(default=[], description="List of required sections")
    required_evidence: List[str] = Field(default=[], description="List of required evidence items")
    required_file_types: List[str] = Field(default=["pdf", "docx", "xlsx"], description="Allowed file extensions")

class RuleResultItem(BaseModel):
    rule: str = Field(..., description="Rule name e.g. file_exists, correct_file_type, required_evidence")
    status: str = Field(..., description="Rule status: passed or failed")
    detail: Optional[str] = Field(None, description="Detailed result explanation")

class ValidationReportResponse(BaseModel):
    id: str
    report_id: str
    task_id: str
    deliverable_id: str
    validation_status: str = Field(..., description="Validation status: COMPLETE, PARTIALLY_COMPLETE, or INCOMPLETE")
    coverage_score: float = Field(..., description="Coverage score percentage 0.0 - 100.0")
    completion_percentage: float = Field(default=0.0, description="Completion percentage 0-100")
    rationale: str = Field(..., description="Detailed explanation of validation decision")
    reason: str = Field(default="", description="Summary reason for validation status")
    feedback: str = Field(default="", description="Actionable feedback for deliverable")
    fulfilled_points: List[str] = Field(default=[], description="List of fulfilled requirements")
    missing_points: List[str] = Field(default=[], description="List of missing requirements")
    evidence_found: List[str] = Field(default=[], description="List of evidence items found in deliverable")
    missing_requirements: List[str] = Field(default=[], description="List of missing requirements")
    rule_results: List[Dict[str, Any]] = Field(default=[], description="List of deterministic rule execution results")
    created_at: str
