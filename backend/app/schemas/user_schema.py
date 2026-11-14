from pydantic import BaseModel, Field
from typing import Optional, List

class OrganizationCreate(BaseModel):
    name: str = Field(..., description="Organization Name", example="Acme Corp")
    domain: Optional[str] = Field("acme.com", description="Email Domain")

class OrganizationResponse(BaseModel):
    id: str
    org_id: str
    name: str
    domain: str
    status: str = "active"
    created_at: str

class UserCreate(BaseModel):
    name: str = Field(..., description="Full Name", example="Nithi")
    email: str = Field(..., description="Email Address", example="nithi@acme.com")
    password: Optional[str] = Field("password123", description="User password")
    role: Optional[str] = Field("employee", description="Role: super_admin | org_admin | manager | team_lead | employee")
    org_id: Optional[str] = Field("ORG_ACME", description="Organization ID")
    reports_to: Optional[str] = Field(None, description="Superior User ID")

class UserLoginRequest(BaseModel):
    email: str = Field(..., description="Email Address for authentication", example="admin@intentlog.ai")
    password: Optional[str] = Field("password123", description="Password")

class UserResponse(BaseModel):
    id: str
    user_id: str
    name: str
    email: str
    role: str = "employee"
    role_level: int = 1
    role_display_name: str = "Employee"
    org_id: str = "ORG_ACME"
    reports_to: Optional[str] = None
    status: str = "active"
    last_login: Optional[str] = None
    created_at: str
    token: Optional[str] = None

class UserRoleUpdateRequest(BaseModel):
    role: str = Field(..., description="New role: 'super_admin' | 'org_admin' | 'manager' | 'team_lead' | 'employee'")
    org_id: Optional[str] = Field(None, description="Updated organization ID")
    reports_to: Optional[str] = Field(None, description="Superior User ID")

class UserStatusUpdateRequest(BaseModel):
    status: str = Field(..., description="New status: 'active' or 'suspended'")

class UserProfileUpdateRequest(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    password: Optional[str] = None
    preferences: Optional[dict] = None

class MeetingJoinRequest(BaseModel):
    user_id: str = Field(..., description="Participant User ID, e.g. USER_003")
    display_name: Optional[str] = Field(None, description="Display name in meeting")
    mic_enabled: bool = Field(True, description="Initial microphone state")

class MicStateUpdateRequest(BaseModel):
    mic_enabled: bool = Field(..., description="Microphone state toggle (True = unmuted, False = muted)")

class MeetingParticipantResponse(BaseModel):
    id: str
    meeting_id: str
    user_id: str
    display_name: str
    mic_enabled: bool
    status: str = "active" # active | left
    joined_at: str

class AdminMetricsResponse(BaseModel):
    total_users: int
    total_admin_users: int
    total_organizations: int
    total_meetings: int
    total_live_meetings: int
    total_tasks: int
    total_deliverables: int
    validation_pass_rate: float
