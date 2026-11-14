from pydantic import BaseModel, Field
from typing import Dict, Any, Optional

class DeliverableUploadResponse(BaseModel):
    id: str
    deliverable_id: str
    task_id: str
    filename: str
    file_type: str
    file_size_bytes: int
    extracted_text: str
    character_count: int
    word_count: int
    metadata: Dict[str, Any] = {}
    created_at: str
