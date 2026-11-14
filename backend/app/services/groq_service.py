import json
import logging
from typing import Dict, Any, List
from fastapi import HTTPException
from groq import Groq
from app.config.settings import settings

logger = logging.getLogger(__name__)

class GroqService:
    def __init__(self):
        self.api_key = settings.GROQ_API_KEY
        self.model = settings.GROQ_MODEL or "openai/gpt-oss-120b"
        self._client = None

    @property
    def client(self) -> Groq:
        if not self.api_key or self.api_key == "your_groq_api_key":
            logger.warning("GROQ_API_KEY is not configured properly.")
            raise HTTPException(
                status_code=503,
                detail="Groq API key is not configured. Please set GROQ_API_KEY in backend/.env"
            )
        if self._client is None:
            self._client = Groq(api_key=self.api_key)
        return self._client

    def extract_action_items(self, transcript: str) -> Dict[str, Any]:
        """
        Sends transcript to Groq API and extracts summary and action items as structured JSON.
        """
        system_prompt = (
            "You are an intelligent meeting action-item extraction assistant.\n"
            "Analyze the provided meeting transcript.\n"
            "Identify every explicit or strongly implied action item.\n"
            "For each action item identify:\n"
            "1. Responsible person (if not clear, return 'Unassigned')\n"
            "2. Task description (clear and concise description)\n"
            "3. Deadline if mentioned (if a deadline is not mentioned, return null)\n"
            "4. Priority (Must strictly be one of: 'High', 'Medium', 'Low')\n\n"
            "Also generate a concise meeting summary.\n"
            "Do not invent people, tasks, or deadlines.\n"
            "Return only valid JSON using the following exact format:\n"
            "{\n"
            '  "summary": "Short meeting summary",\n'
            '  "tasks": [\n'
            "    {\n"
            '      "person": "John",\n'
            '      "task": "Complete login module",\n'
            '      "deadline": "Friday",\n'
            '      "priority": "High"\n'
            "    }\n"
            "  ]\n"
            "}"
        )

        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": f"Meeting Transcript:\n{transcript}"}
                ],
                response_format={"type": "json_object"},
                temperature=0.1
            )
            raw_content = response.choices[0].message.content
            parsed_data = json.loads(raw_content)
            
            # Validation & sanitization of response
            summary = parsed_data.get("summary", "No summary generated.")
            raw_tasks = parsed_data.get("tasks", [])
            
            sanitized_tasks = []
            for t in raw_tasks:
                priority = str(t.get("priority", "Medium")).capitalize()
                if priority not in ["High", "Medium", "Low"]:
                    priority = "Medium"
                
                sanitized_tasks.append({
                    "person": str(t.get("person") or "Unassigned"),
                    "task": str(t.get("task", "")),
                    "deadline": t.get("deadline") if t.get("deadline") else None,
                    "priority": priority
                })

            return {
                "summary": summary,
                "tasks": sanitized_tasks
            }

        except json.JSONDecodeError as e:
            logger.error(f"Groq returned invalid JSON: {e}")
            raise HTTPException(
                status_code=500,
                detail="Failed to parse structured JSON response from Groq LLM."
            )
        except Exception as e:
            logger.error(f"Error calling Groq API: {e}")
            raise HTTPException(
                status_code=503,
                detail=f"Groq API service error: {str(e)}"
            )

    def validate_action_items(self, original_tasks: List[Dict[str, Any]], progress_update: str) -> Dict[str, Any]:
        """
        Compares original meeting tasks with a progress update using Groq LLM.
        """
        system_prompt = (
            "You are a meeting task validation assistant.\n"
            "Compare the original action items with the latest progress update.\n"
            "Do not invent information.\n"
            "Classify each original action item into one of the following categories:\n"
            "- completed: Action items explicitly reported as completed\n"
            "- pending: Action items explicitly in progress or not completed yet\n"
            "- delayed: Action items behind schedule or delayed\n"
            "- unmentioned: Action items not mentioned in the progress update\n\n"
            "Provide a brief explanation for each task classification.\n"
            "Return only valid JSON using the following exact structure:\n"
            "{\n"
            '  "completed": ["Task description 1"],\n'
            '  "pending": ["Task description 2"],\n'
            '  "delayed": ["Task description 3"],\n'
            '  "unmentioned": ["Task description 4"],\n'
            '  "explanations": {\n'
            '    "Task description 1": "Brief explanation"\n'
            "  }\n"
            "}"
        )

        formatted_tasks = []
        for i, t in enumerate(original_tasks, 1):
            person = t.get("person", "Unassigned")
            desc = t.get("task", "")
            deadline = t.get("deadline") or "No deadline"
            status = t.get("status", "Pending")
            formatted_tasks.append(f"{i}. Person: {person} | Task: {desc} | Deadline: {deadline} | Current Status: {status}")

        user_content = (
            f"Original Action Items:\n" + "\n".join(formatted_tasks) + "\n\n"
            f"Latest Progress Update:\n{progress_update}"
        )

        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_content}
                ],
                response_format={"type": "json_object"},
                temperature=0.1
            )
            raw_content = response.choices[0].message.content
            parsed = json.loads(raw_content)

            return {
                "completed": parsed.get("completed", []),
                "pending": parsed.get("pending", []),
                "delayed": parsed.get("delayed", []),
                "unmentioned": parsed.get("unmentioned", []),
                "explanations": parsed.get("explanations", {})
            }
        except json.JSONDecodeError as e:
            logger.error(f"Groq returned invalid JSON during validation: {e}")
            raise HTTPException(
                status_code=500,
                detail="Failed to parse structured validation response from Groq LLM."
            )
        except Exception as e:
            logger.error(f"Error calling Groq API for validation: {e}")
            raise HTTPException(
                status_code=503,
                detail=f"Groq API service error: {str(e)}"
            )

groq_service = GroqService()
