from fastapi import APIRouter, HTTPException, status
from typing import List
from app.database.mongodb import get_sessions_collection, build_id_query, format_doc
from app.models.session import SessionModel
from app.schemas.session_schema import SessionCreate, SessionResponse

router = APIRouter(prefix="/api/sessions", tags=["Meeting Sessions"])

@router.post("", response_model=SessionResponse, status_code=status.HTTP_201_CREATED, summary="Initialize meeting session with audio stream mappings")
def create_session(payload: SessionCreate):
    """
    Initializes a new meeting session and binds participants to their respective audio streams.
    Example mapping:
    Nithi -> participant_id: USER_003 -> audio_stream_003
    Viswaa -> participant_id: USER_004 -> audio_stream_004
    """
    sessions_col = get_sessions_collection()
    
    participants_dict_list = [p.model_dump() for p in payload.participants]
    
    doc = SessionModel.create_document(
        title=payload.title,
        participants=participants_dict_list
    )
    
    result = sessions_col.insert_one(doc)
    doc["_id"] = result.inserted_id

    return SessionResponse(**format_doc(doc))

@router.get("", response_model=List[SessionResponse], summary="List all meeting sessions")
def list_sessions():
    """
    Returns all meeting sessions and their participant stream bindings.
    """
    sessions_col = get_sessions_collection()
    cursor = sessions_col.find().sort("created_at", -1)
    return [SessionResponse(**format_doc(doc)) for doc in cursor]

@router.get("/{session_id}", response_model=SessionResponse, summary="Get meeting session details by session_id or DB ID")
def get_session(session_id: str):
    """
    Retrieves details and audio stream mappings for a given meeting session.
    """
    sessions_col = get_sessions_collection()
    query = {"$or": [{"session_id": session_id}, build_id_query(session_id)]}
    doc = sessions_col.find_one(query)
    
    if not doc:
        raise HTTPException(status_code=404, detail=f"Meeting Session '{session_id}' not found.")
        
    return SessionResponse(**format_doc(doc))
