from fastapi import APIRouter, HTTPException, status, Query
from typing import List, Optional
from datetime import datetime
import uuid

from app.database.mongodb import (
    get_users_collection,
    get_organizations_collection,
    get_meetings_collection,
    get_meeting_participants_collection,
    build_id_query,
    format_doc
)
from app.models.user import UserModel, MeetingParticipantModel, ROLE_LEVELS, ROLE_DISPLAY_NAMES
from app.models.organization import OrganizationModel
from app.schemas.user_schema import (
    UserCreate,
    UserLoginRequest,
    UserResponse,
    UserRoleUpdateRequest,
    UserStatusUpdateRequest,
    UserProfileUpdateRequest,
    OrganizationCreate,
    OrganizationResponse,
    MeetingJoinRequest,
    MicStateUpdateRequest,
    MeetingParticipantResponse
)

router = APIRouter(prefix="/api", tags=["Users, Organizations & Hierarchy Roles"])

def generate_token(user_id: str, email: str, role: str, org_id: str) -> str:
    return f"intentlog_token_{user_id}_{role}_{org_id}_{uuid.uuid4().hex[:8]}"

# --- ORGANIZATION MANAGEMENT ---

@router.post("/organizations", response_model=OrganizationResponse, status_code=status.HTTP_201_CREATED, summary="Create a new organization profile")
def create_organization(payload: OrganizationCreate):
    orgs_col = get_organizations_collection()
    name_clean = payload.name.strip()
    existing = orgs_col.find_one({"name": name_clean})
    if existing:
        return OrganizationResponse(**format_doc(existing))

    doc = OrganizationModel.create_document(name=name_clean, domain=payload.domain or "example.com")
    res = orgs_col.insert_one(doc)
    doc["_id"] = res.inserted_id
    return OrganizationResponse(**format_doc(doc))

@router.get("/organizations", response_model=List[OrganizationResponse], summary="List all organizations")
def list_organizations():
    orgs_col = get_organizations_collection()
    cursor = orgs_col.find().sort("created_at", -1)
    return [OrganizationResponse(**format_doc(doc)) for doc in cursor]

@router.delete("/organizations/{org_id}", summary="Drop / delete an organization and cleanup all members and data")
def drop_organization(org_id: str):
    """
    Application Super Admin or Organization Admin right to drop/delete an organization.
    Cleans up organization document, user accounts, and meetings.
    """
    orgs_col = get_organizations_collection()
    users_col = get_users_collection()
    meetings_col = get_meetings_collection()

    o_query = {"$or": [{"org_id": org_id}, build_id_query(org_id)]}
    org_doc = orgs_col.find_one(o_query)
    if not org_doc:
        raise HTTPException(status_code=404, detail=f"Organization '{org_id}' not found.")

    target_org_id = org_doc.get("org_id", org_id)

    # Delete organization record
    orgs_col.delete_one({"_id": org_doc["_id"]})

    # Delete associated user profiles (except global super admin)
    users_col.delete_many({"org_id": target_org_id, "role": {"$ne": "super_admin"}})

    # Delete associated meetings
    meetings_col.delete_many({"org_id": target_org_id})

    return {"message": f"Organization '{target_org_id}' ({org_doc.get('name')}) dropped successfully."}


# --- USER AUTHENTICATION & HIERARCHY MANAGEMENT ---

@router.post("/users/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED, summary="Register a user under an organization with specific hierarchy role")
def register_user(payload: UserCreate):
    """
    Registers a new user under an organization with one of 5 roles:
    1. super_admin (Level 5)
    2. org_admin (Level 4)
    3. manager (Level 3)
    4. team_lead (Level 2)
    5. employee (Level 1)
    """
    users_col = get_users_collection()
    email_clean = payload.email.lower().strip()
    existing = users_col.find_one({"email": email_clean})
    if existing:
        doc = format_doc(existing)
        doc["token"] = generate_token(doc["user_id"], doc["email"], doc.get("role", "employee"), doc.get("org_id", "ORG_ACME"))
        return UserResponse(**doc)

    role_val = payload.role or "employee"
    org_val = payload.org_id or "ORG_ACME"

    user_doc = UserModel.create_document(
        name=payload.name, 
        email=email_clean,
        password=payload.password or "password123",
        role=role_val,
        org_id=org_val,
        reports_to=payload.reports_to
    )
    result = users_col.insert_one(user_doc)
    user_doc["_id"] = result.inserted_id

    doc = format_doc(user_doc)
    doc["token"] = generate_token(doc["user_id"], doc["email"], doc.get("role", "employee"), doc.get("org_id", "ORG_ACME"))
    return UserResponse(**doc)

@router.post("/users/login", response_model=UserResponse, summary="Authenticate user by email and password")
def login_user(payload: UserLoginRequest):
    """
    Authenticates user and returns profile, role hierarchy level, organization ID, and token.
    """
    users_col = get_users_collection()
    email_clean = payload.email.lower().strip()
    user_doc = users_col.find_one({"email": email_clean})
    
    if not user_doc:
        # Determine appropriate role based on email keyword for seamless demo convenience
        if "superadmin" in email_clean or "admin@intentlog" in email_clean:
            role = "super_admin"
            org_id = "GLOBAL"
        elif "orgadmin" in email_clean:
            role = "org_admin"
            org_id = "ORG_ACME"
        elif "manager" in email_clean:
            role = "manager"
            org_id = "ORG_ACME"
        elif "teamlead" in email_clean or "tl" in email_clean:
            role = "team_lead"
            org_id = "ORG_ACME"
        else:
            role = "employee"
            org_id = "ORG_ACME"

        name = email_clean.split("@")[0].replace(".", " ").title()
        user_doc = UserModel.create_document(
            name=name,
            email=email_clean,
            password=payload.password or "password123",
            role=role,
            org_id=org_id
        )
        res = users_col.insert_one(user_doc)
        user_doc["_id"] = res.inserted_id
    else:
        now = datetime.utcnow().isoformat()
        users_col.update_one({"_id": user_doc["_id"]}, {"$set": {"last_login": now}})
        user_doc["last_login"] = now

    if user_doc.get("status") == "suspended":
        raise HTTPException(status_code=403, detail="Account suspended. Please contact your organization administrator.")

    doc = format_doc(user_doc)
    doc["token"] = generate_token(doc["user_id"], doc["email"], doc.get("role", "employee"), doc.get("org_id", "ORG_ACME"))
    return UserResponse(**doc)

@router.get("/users", response_model=List[UserResponse], summary="List users filtered by organization or hierarchy level")
def list_users(
    org_id: Optional[str] = Query(None, description="Filter by Organization ID"),
    min_role_level: Optional[int] = Query(None, description="Filter users below or at specific role level")
):
    users_col = get_users_collection()
    query = {}
    if org_id and org_id != "GLOBAL":
        query["org_id"] = org_id
    if min_role_level:
        query["role_level"] = {"$lte": min_role_level}

    cursor = users_col.find(query).sort("role_level", -1)
    results = []
    for doc in cursor:
        f_doc = format_doc(doc)
        f_doc["token"] = None
        results.append(UserResponse(**f_doc))
    return results

@router.get("/users/{user_id}", response_model=UserResponse, summary="Get user profile by user_id")
def get_user_profile(user_id: str):
    users_col = get_users_collection()
    query = {"$or": [{"user_id": user_id}, build_id_query(user_id)]}
    user_doc = users_col.find_one(query)
    if not user_doc:
        raise HTTPException(status_code=404, detail=f"User '{user_id}' not found.")
    
    f_doc = format_doc(user_doc)
    f_doc["token"] = None
    return UserResponse(**f_doc)

@router.patch("/users/{user_id}/role", response_model=UserResponse, summary="Update user role hierarchy level")
def update_user_role(user_id: str, payload: UserRoleUpdateRequest):
    role_clean = payload.role.lower().strip()
    if role_clean not in ROLE_LEVELS:
        raise HTTPException(status_code=400, detail=f"Invalid role '{payload.role}'. Must be one of: {list(ROLE_LEVELS.keys())}")

    users_col = get_users_collection()
    query = {"$or": [{"user_id": user_id}, build_id_query(user_id)]}

    update_fields = {
        "role": role_clean,
        "role_level": ROLE_LEVELS[role_clean],
        "role_display_name": ROLE_DISPLAY_NAMES[role_clean],
        "updated_at": datetime.utcnow().isoformat()
    }
    if payload.org_id:
        update_fields["org_id"] = payload.org_id
    if payload.reports_to:
        update_fields["reports_to"] = payload.reports_to

    res = users_col.update_one(query, {"$set": update_fields})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail=f"User '{user_id}' not found.")

    updated = users_col.find_one(query)
    f_doc = format_doc(updated)
    f_doc["token"] = None
    return UserResponse(**f_doc)

@router.patch("/users/{user_id}/status", response_model=UserResponse, summary="Update user account status (active/suspended)")
def update_user_status(user_id: str, payload: UserStatusUpdateRequest):
    if payload.status not in ["active", "suspended"]:
        raise HTTPException(status_code=400, detail="Invalid status. Must be 'active' or 'suspended'.")

    users_col = get_users_collection()
    query = {"$or": [{"user_id": user_id}, build_id_query(user_id)]}
    res = users_col.update_one(query, {"$set": {"status": payload.status, "updated_at": datetime.utcnow().isoformat()}})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail=f"User '{user_id}' not found.")

    updated = users_col.find_one(query)
    f_doc = format_doc(updated)
    f_doc["token"] = None
    return UserResponse(**f_doc)

@router.patch("/users/{user_id}/profile", response_model=UserResponse, summary="Update user profile details")
def update_user_profile(user_id: str, payload: UserProfileUpdateRequest):
    users_col = get_users_collection()
    query = {"$or": [{"user_id": user_id}, build_id_query(user_id)]}
    
    update_fields = {}
    if payload.name:
        update_fields["name"] = payload.name.strip()
    if payload.email:
        update_fields["email"] = payload.email.strip().lower()
    if payload.password:
        update_fields["password"] = payload.password
    if payload.preferences is not None:
        update_fields["preferences"] = payload.preferences
        
    update_fields["updated_at"] = datetime.utcnow().isoformat()
    
    res = users_col.update_one(query, {"$set": update_fields})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail=f"User '{user_id}' not found.")
        
    updated = users_col.find_one(query)
    f_doc = format_doc(updated)
    f_doc["token"] = None
    return UserResponse(**f_doc)

@router.delete("/users/{user_id}", summary="Delete user profile")
def delete_user(user_id: str):
    users_col = get_users_collection()
    query = {"$or": [{"user_id": user_id}, build_id_query(user_id)]}
    res = users_col.delete_one(query)
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail=f"User '{user_id}' not found.")
    return {"message": f"User '{user_id}' deleted successfully."}


# --- MEETING PARTICIPANT MANAGEMENT ---

@router.post("/meetings/{meeting_id}/join", response_model=MeetingParticipantResponse, status_code=status.HTTP_201_CREATED, summary="Participant joins meeting")
def join_meeting(meeting_id: str, payload: MeetingJoinRequest):
    users_col = get_users_collection()
    user_doc = users_col.find_one({"$or": [{"user_id": payload.user_id}, build_id_query(payload.user_id)]})
    display_name = payload.display_name or (user_doc.get("name") if user_doc else "Participant")

    part_col = get_meeting_participants_collection()
    existing = part_col.find_one({"meeting_id": meeting_id, "user_id": payload.user_id})
    if existing:
        part_col.update_one(
            {"_id": existing["_id"]},
            {"$set": {"status": "active", "mic_enabled": payload.mic_enabled, "display_name": display_name}}
        )
        updated = part_col.find_one({"_id": existing["_id"]})
        return MeetingParticipantResponse(**format_doc(updated))

    doc = MeetingParticipantModel.create_document(
        meeting_id=meeting_id,
        user_id=payload.user_id,
        display_name=display_name,
        mic_enabled=payload.mic_enabled
    )
    res = part_col.insert_one(doc)
    doc["_id"] = res.inserted_id
    return MeetingParticipantResponse(**format_doc(doc))

@router.post("/meetings/{meeting_id}/leave", summary="Participant leaves meeting")
def leave_meeting(meeting_id: str, user_id: str = Query(..., description="Participant User ID")):
    part_col = get_meeting_participants_collection()
    res = part_col.update_one(
        {"meeting_id": meeting_id, "user_id": user_id},
        {"$set": {"status": "left", "mic_enabled": False}}
    )
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail=f"Participant '{user_id}' not found in meeting '{meeting_id}'.")
    return {"message": f"User '{user_id}' left meeting '{meeting_id}'.", "meeting_id": meeting_id, "user_id": user_id}

@router.get("/meetings/{meeting_id}/participants", response_model=List[MeetingParticipantResponse], summary="List all participants in a meeting")
def list_meeting_participants(meeting_id: str):
    part_col = get_meeting_participants_collection()
    cursor = part_col.find({"meeting_id": meeting_id}).sort("joined_at", 1)
    return [MeetingParticipantResponse(**format_doc(doc)) for doc in cursor]

@router.patch("/meetings/{meeting_id}/participants/{user_id}/mic", response_model=MeetingParticipantResponse, summary="Toggle participant mic state")
def update_mic_state(meeting_id: str, user_id: str, payload: MicStateUpdateRequest):
    part_col = get_meeting_participants_collection()
    res = part_col.update_one(
        {"meeting_id": meeting_id, "user_id": user_id},
        {"$set": {"mic_enabled": payload.mic_enabled}}
    )
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail=f"Participant '{user_id}' not found in meeting '{meeting_id}'.")

    updated = part_col.find_one({"meeting_id": meeting_id, "user_id": user_id})
    return MeetingParticipantResponse(**format_doc(updated))
