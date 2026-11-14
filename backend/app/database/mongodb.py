import logging
from typing import Optional
from pymongo import MongoClient
from bson import ObjectId
from bson.errors import InvalidId
from fastapi import HTTPException
from app.config.settings import settings

logger = logging.getLogger(__name__)

class DatabaseManager:
    _client: MongoClient = None

    @classmethod
    def get_client(cls) -> MongoClient:
        if cls._client is None:
            try:
                cls._client = MongoClient(settings.MONGODB_URI, serverSelectionTimeoutMS=3000)
            except Exception as e:
                logger.error(f"Failed to initialize MongoDB client: {e}")
                raise HTTPException(status_code=503, detail="MongoDB service unavailable")
        return cls._client

    @classmethod
    def get_db(cls):
        client = cls.get_client()
        return client[settings.DATABASE_NAME]

    @classmethod
    def get_collection(cls, collection_name: str):
        db = cls.get_db()
        return db[collection_name]

def get_organizations_collection():
    return DatabaseManager.get_collection("organizations")

def get_users_collection():
    return DatabaseManager.get_collection("users")

def get_meetings_collection():
    return DatabaseManager.get_collection("meetings")

def get_tasks_collection():
    return DatabaseManager.get_collection("tasks")

def get_projects_collection():
    return DatabaseManager.get_collection("projects")

def get_action_items_collection():
    return DatabaseManager.get_collection("action_items")

def get_deliverables_collection():
    return DatabaseManager.get_collection("deliverables")

def get_validation_reports_collection():
    return DatabaseManager.get_collection("validation_reports")

def get_validation_results_collection():
    return DatabaseManager.get_collection("validation_results")

def get_participants_collection():
    return DatabaseManager.get_collection("participants")




def get_meeting_participants_collection():
    return DatabaseManager.get_collection("meeting_participants")

def get_participant_streams_collection():
    return DatabaseManager.get_collection("participant_streams")

def get_raw_stream_chunks_collection():
    return DatabaseManager.get_collection("raw_stream_chunks")

def get_vad_segments_collection():
    return DatabaseManager.get_collection("vad_segments")

def get_transcripts_collection():
    return DatabaseManager.get_collection("transcripts")

def get_sessions_collection():
    return DatabaseManager.get_collection("sessions")




def get_audio_chunks_collection():
    return DatabaseManager.get_collection("audio_chunks")




def parse_object_id(id_str: str) -> Optional[ObjectId]:
    """
    Safely converts a string to ObjectId if valid, otherwise returns None.
    """
    if id_str and ObjectId.is_valid(id_str):
        return ObjectId(id_str)
    return None

def build_id_query(id_str: str) -> dict:
    """
    Builds a flexible MongoDB filter for _id matching both ObjectId and string formats.
    """
    oid = parse_object_id(id_str)
    if oid:
        return {"$or": [{"_id": oid}, {"_id": id_str}]}
    return {"_id": id_str}


def format_doc(doc: dict) -> dict:
    """
    Converts MongoDB _id to string 'id' for clean Pydantic/JSON serialization.
    """
    if not doc:
        return doc
    formatted = dict(doc)
    if "_id" in formatted:
        formatted["id"] = str(formatted.pop("_id"))
    if "meeting_id" in formatted and isinstance(formatted["meeting_id"], ObjectId):
        formatted["meeting_id"] = str(formatted["meeting_id"])
    return formatted

def check_db_connection() -> bool:
    """
    Pings the MongoDB server to verify connection status.
    """
    try:
        client = DatabaseManager.get_client()
        client.admin.command('ping')
        return True
    except Exception as e:
        logger.warning(f"Database connection check failed: {e}")
        return False
