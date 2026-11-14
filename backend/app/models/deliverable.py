from datetime import datetime
import uuid
from typing import Dict, Any

class DeliverableDocumentModel:
    """
    Helper structure for uploaded deliverable documents stored in MongoDB collection `deliverables`.
    """
    @staticmethod
    def create_document(
        task_id: str,
        filename: str,
        file_type: str,
        file_size_bytes: int,
        extracted_text: str,
        metadata: Dict[str, Any] = None
    ) -> dict:
        now = datetime.utcnow().isoformat()
        seq = uuid.uuid4().hex[:8].upper()
        deliverable_id = f"DELIV_{seq}"
        char_count = len(extracted_text.strip())
        word_count = len(extracted_text.strip().split())

        return {
            "deliverable_id": deliverable_id,
            "task_id": task_id,
            "filename": filename,
            "file_type": file_type,
            "file_size_bytes": file_size_bytes,
            "extracted_text": extracted_text,
            "character_count": char_count,
            "word_count": word_count,
            "metadata": metadata or {},
            "created_at": now,
            "updated_at": now
        }
