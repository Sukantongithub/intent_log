from fastapi import APIRouter, HTTPException, status
from typing import List
from app.database.mongodb import get_participants_collection, build_id_query, format_doc
from app.models.participant import ParticipantModel
from app.schemas.participant_schema import ParticipantCreate, ParticipantResponse

router = APIRouter(prefix="/api/participants", tags=["Participants"])

@router.post("", response_model=ParticipantResponse, status_code=status.HTTP_201_CREATED, summary="Register or login participant")
def create_participant(payload: ParticipantCreate):
    """
    Registers a participant and generates their unique participant_id and mic_id stream mapping.
    """
    participants_col = get_participants_collection()
    
    # Check if participant with same name already exists to reuse ID if needed
    existing = participants_col.find_one({"name": payload.name})
    if existing:
        return ParticipantResponse(**format_doc(existing))

    doc = ParticipantModel.create_document(
        name=payload.name,
        email=payload.email,
        mic_id=payload.mic_id
    )
    result = participants_col.insert_one(doc)
    doc["_id"] = result.inserted_id

    return ParticipantResponse(**format_doc(doc))

@router.get("", response_model=List[ParticipantResponse], summary="List all registered participants")
def get_participants():
    """
    Returns a list of all registered participants.
    """
    participants_col = get_participants_collection()
    cursor = participants_col.find().sort("created_at", -1)
    return [ParticipantResponse(**format_doc(doc)) for doc in cursor]

@router.get("/{participant_id}", response_model=ParticipantResponse, summary="Get participant by participant_id or DB ID")
def get_participant(participant_id: str):
    """
    Retrieves a participant by their participant_id (e.g. USER_003) or MongoDB ObjectId.
    """
    participants_col = get_participants_collection()
    query = {"$or": [{"participant_id": participant_id}, build_id_query(participant_id)]}
    doc = participants_col.find_one(query)
    
    if not doc:
        raise HTTPException(status_code=404, detail=f"Participant '{participant_id}' not found.")
        
    return ParticipantResponse(**format_doc(doc))
