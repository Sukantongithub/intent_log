import json
import logging
from typing import Dict, Any, List
from app.config.settings import settings

logger = logging.getLogger(__name__)

class DeliverableValidationEngine:
    """
    Multi-tier Deliverable Validation Engine combining:
    1. Requirement Extraction (Checkpoint 11)
    2. Deterministic Rule-Based Validation (Checkpoint 12)
    3. Qwen3 AI Validation (Checkpoint 13)
    4. RAG Requirement & Meeting Context Retrieval (Checkpoint 14)
    5. End-to-End Pipeline Integration (Checkpoint 15)
    """
    def __init__(self, model_name: str = "qwen3-validation"):
        self.model_name = model_name

    def extract_task_requirements(self, task_description: str, target_deliverable: str) -> Dict[str, Any]:
        """
        Extracts structured requirement representation for a given task (Checkpoint 11).
        """
        task_lower = task_description.lower()
        deliv_lower = target_deliverable.lower()

        # Domain-specific requirement templates based on task / deliverable type
        if "test" in task_lower or "test" in deliv_lower or "report" in deliv_lower:
            reqs = [
                "Unit testing results",
                "Integration testing results",
                "Screenshots",
                "Test cases",
                "Summary"
            ]
            sections = ["Unit testing results", "Integration testing results", "Summary"]
            evidence = ["Screenshots", "Test cases"]
        elif "dashboard" in task_lower or "react" in task_lower or "ui" in deliv_lower:
            reqs = [
                "Interactive task board",
                "Responsive UI components",
                "Dark theme / styling",
                "API integration",
                "Screenshots / preview"
            ]
            sections = ["Interactive task board", "Responsive UI components", "API integration"]
            evidence = ["Screenshots / preview"]
        elif "database" in task_lower or "schema" in task_lower or "mongodb" in deliv_lower:
            reqs = [
                "MongoDB collection definitions",
                "Field types and validation rules",
                "Index specifications",
                "Architecture diagram / documentation"
            ]
            sections = ["Collection definitions", "Validation rules", "Indexes"]
            evidence = ["Architecture documentation"]
        else:
            reqs = [
                f"Core implementation of {target_deliverable}",
                "Detailed summary and specifications",
                "Verification evidence"
            ]
            sections = [f"Core implementation", "Specifications"]
            evidence = ["Verification evidence"]

        return {
            "task": task_description,
            "expected_deliverable": target_deliverable,
            "requirements": reqs,
            "required_sections": sections,
            "required_evidence": evidence,
            "required_file_types": ["pdf", "docx", "xlsx"]
        }

    def evaluate_rule_checks(
        self,
        extracted_text: str,
        filename: str,
        file_type: str,
        requirements: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """
        Executes deterministic rule-based pre-checks (Checkpoint 12).
        Rules do NOT depend entirely on the LLM.
        """
        rules = []

        # Rule 1: File exists?
        if filename and len(filename.strip()) > 0:
            rules.append({
                "rule": "file_exists",
                "status": "passed",
                "detail": f"Deliverable document file '{filename}' exists."
            })
        else:
            rules.append({
                "rule": "file_exists",
                "status": "failed",
                "detail": "No deliverable document file provided."
            })

        # Rule 2: Correct file type?
        ext = file_type.lower().replace(".", "") if file_type else filename.split(".")[-1].lower() if "." in filename else ""
        allowed_types = requirements.get("required_file_types", ["pdf", "docx", "xlsx"])
        if ext in allowed_types or file_type.lower() in ["pdf", "docx", "xlsx"]:
            rules.append({
                "rule": "correct_file_type",
                "status": "passed",
                "detail": f"File type '{ext}' is valid and supported."
            })
        else:
            rules.append({
                "rule": "correct_file_type",
                "status": "failed",
                "detail": f"File type '{ext}' is unsupported. Allowed: {allowed_types}"
            })

        # Rule 3: Content not empty?
        text_clean = extracted_text.strip() if extracted_text else ""
        if len(text_clean) >= 20:
            rules.append({
                "rule": "content_not_empty",
                "status": "passed",
                "detail": f"Extracted document content contains {len(text_clean.split())} words."
            })
        else:
            rules.append({
                "rule": "content_not_empty",
                "status": "failed",
                "detail": "Extracted document content is empty or insufficient."
            })

        # Rule 4: Required evidence present?
        text_lower = text_clean.lower()
        required_evidence = requirements.get("required_evidence", [])
        missing_evidence = []
        for ev in required_evidence:
            ev_terms = ev.lower().split()
            if not any(term in text_lower for term in ev_terms if len(term) > 3):
                missing_evidence.append(ev)

        if not missing_evidence:
            rules.append({
                "rule": "required_evidence",
                "status": "passed",
                "detail": "All required evidence items found in document."
            })
        else:
            rules.append({
                "rule": "required_evidence",
                "status": "failed",
                "detail": f"Missing required evidence: {', '.join(missing_evidence)}"
            })

        return rules

    def retrieve_rag_context(self, task_id: str, meeting_id: str = None) -> Dict[str, Any]:
        """
        Retrieves relevant meeting context & requirements before validation (Checkpoint 14 - RAG).
        """
        try:
            from app.database.mongodb import get_tasks_collection, get_transcripts_collection, build_id_query
            tasks_col = get_tasks_collection()
            task_doc = tasks_col.find_one({"$or": [{"task_id": task_id}, build_id_query(task_id)]})
            
            m_id = meeting_id or (task_doc.get("meeting_id") if task_doc else None)
            transcripts = []
            if m_id:
                trans_col = get_transcripts_collection()
                cursor = trans_col.find({"meeting_id": m_id}).sort("start_time", 1)
                transcripts = [f"[{d.get('speaker_name', 'Speaker')}]: {d.get('text', '')}" for d in cursor]

            return {
                "meeting_id": m_id,
                "task": task_doc.get("task", "") if task_doc else "",
                "owner": task_doc.get("owner", "") if task_doc else "",
                "meeting_transcripts": transcripts
            }
        except Exception as e:
            logger.warning(f"RAG context retrieval fallback: {e}")
            return {"meeting_id": meeting_id, "meeting_transcripts": []}

    def validate_deliverable(
        self,
        task_description: str,
        target_deliverable: str,
        extracted_text: str,
        filename: str = "",
        file_type: str = "",
        task_id: str = "",
        meeting_id: str = ""
    ) -> Dict[str, Any]:
        """
        Validates extracted deliverable document text against requirements using Rules + RAG + Qwen3.
        (Checkpoints 11 - 15)
        """
        # 1. Extract Requirements (Checkpoint 11)
        reqs_data = self.extract_task_requirements(task_description, target_deliverable)

        # 2. Rule-Based Validation (Checkpoint 12)
        rule_results = self.evaluate_rule_checks(extracted_text, filename, file_type, reqs_data)

        # 3. RAG Retrieval Engine (Checkpoint 14)
        rag_context = self.retrieve_rag_context(task_id, meeting_id) if task_id else {}

        # Default fallback values for empty text
        if not extracted_text or len(extracted_text.strip()) == 0:
            return {
                "validation_status": "INCOMPLETE",
                "coverage_score": 0.0,
                "completion_percentage": 0.0,
                "reason": "The uploaded deliverable file contains no readable text content.",
                "feedback": "Please re-upload a valid document with readable text content.",
                "rationale": "Empty deliverable content fails deterministic rule checks.",
                "fulfilled_points": [],
                "missing_points": reqs_data["requirements"],
                "evidence_found": [],
                "missing_requirements": reqs_data["requirements"],
                "rule_results": rule_results,
                "requirements": reqs_data
            }

        # 4. Qwen3 AI Validation (Checkpoint 13 & 15)
        if settings.GROQ_API_KEY and settings.GROQ_API_KEY != "gsk_your_real_groq_api_key_here":
            try:
                from groq import Groq
                client = Groq(api_key=settings.GROQ_API_KEY)

                context_str = "\n".join(rag_context.get("meeting_transcripts", [])) if rag_context.get("meeting_transcripts") else "No additional transcript context."

                prompt = (
                    f"You are Qwen3 Deliverable Validation Engine.\n"
                    f"Compare the Meeting Requirements and Task Commitment against the Submitted Deliverable document text.\n\n"
                    f"Task Description: {task_description}\n"
                    f"Target Deliverable Requirement: {target_deliverable}\n"
                    f"Extracted Requirements: {json.dumps(reqs_data['requirements'])}\n"
                    f"Relevant Meeting Context:\n{context_str}\n\n"
                    f"Submitted Document Filename: {filename}\n"
                    f"Extracted Document Text:\n{extracted_text}\n\n"
                    f"Return ONLY valid JSON matching this exact schema:\n"
                    f"{{\n"
                    f'  "status": "COMPLETE", "PARTIALLY_COMPLETE", or "INCOMPLETE",\n'
                    f'  "completion_percentage": float (0.0 to 100.0),\n'
                    f'  "evidence_found": ["List of evidence found in document"],\n'
                    f'  "missing_requirements": ["List of missing requirements"],\n'
                    f'  "feedback": "Actionable feedback message",\n'
                    f'  "reason": "Summary reason explaining validation status"\n'
                    f"}}"
                )

                response = client.chat.completions.create(
                    model=settings.GROQ_MODEL,
                    messages=[{"role": "user", "content": prompt}],
                    response_format={"type": "json_object"},
                    temperature=0.1
                )
                raw_res = json.loads(response.choices[0].message.content)

                status_str = raw_res.get("status", "INCOMPLETE").upper()
                comp_pct = float(raw_res.get("completion_percentage", 0.0))
                evidence = raw_res.get("evidence_found", [])
                missing = raw_res.get("missing_requirements", [])
                feedback = raw_res.get("feedback", "Deliverable submitted for review.")
                reason = raw_res.get("reason", "Validation completed by Qwen3 LLM engine.")

                return {
                    "validation_status": status_str,
                    "coverage_score": comp_pct,
                    "completion_percentage": comp_pct,
                    "reason": reason,
                    "feedback": feedback,
                    "rationale": f"{reason} — {feedback}",
                    "fulfilled_points": evidence,
                    "missing_points": missing,
                    "evidence_found": evidence,
                    "missing_requirements": missing,
                    "rule_results": rule_results,
                    "requirements": reqs_data
                }
            except Exception as e:
                logger.warning(f"Qwen API validation engine fallback: {e}")

        # 5. Deterministic Rules + RAG Keyword Backup Engine
        matched_rules_failed = any(r["status"] == "failed" for r in rule_results if r["rule"] in ["content_not_empty", "required_evidence"])
        text_lower = extracted_text.lower()
        word_count = len(text_lower.split())

        req_matches = [r for r in reqs_data["requirements"] if any(w.lower() in text_lower for w in r.split() if len(w) > 3)]
        req_missing = [r for r in reqs_data["requirements"] if r not in req_matches]

        if not matched_rules_failed and len(req_matches) >= 3:
            status_str = "COMPLETE"
            comp_pct = 95.0
            reason = f"Deliverable '{filename}' satisfies all deterministic rules and required task points."
            feedback = "Task deliverable is complete and verified."
        elif len(req_matches) >= 1 or "draft" in text_lower or "partial" in text_lower:
            status_str = "PARTIALLY_COMPLETE"
            comp_pct = 50.0
            reason = f"Deliverable '{filename}' satisfies initial requirements but missing key evidence."
            feedback = f"Missing requirements: {', '.join(req_missing)}"
        else:
            status_str = "INCOMPLETE"
            comp_pct = 20.0
            reason = f"Deliverable '{filename}' fails required content and evidence rules."
            feedback = f"Please include required sections: {', '.join(reqs_data['requirements'])}"

        return {
            "validation_status": status_str,
            "coverage_score": comp_pct,
            "completion_percentage": comp_pct,
            "reason": reason,
            "feedback": feedback,
            "rationale": f"{reason} {feedback}",
            "fulfilled_points": req_matches,
            "missing_points": req_missing,
            "evidence_found": req_matches,
            "missing_requirements": req_missing,
            "rule_results": rule_results,
            "requirements": reqs_data
        }

validation_engine = DeliverableValidationEngine()
