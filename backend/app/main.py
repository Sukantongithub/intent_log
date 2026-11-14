import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from fastapi import FastAPI, status
from fastapi.middleware.cors import CORSMiddleware
from app.config.settings import settings
from app.database.mongodb import check_db_connection, get_users_collection, get_organizations_collection, get_projects_collection

from app.routes.meeting_routes import router as meeting_router
from app.routes.task_routes import router as task_router
from app.routes.participant_routes import router as participant_router
from app.routes.session_routes import router as session_router
from app.routes.audio_routes import router as audio_router
from app.routes.user_routes import router as user_router
from app.routes.audio_stream_routes import router as audio_stream_router
from app.routes.vad_routes import router as vad_router
from app.routes.transcription_routes import router as transcription_router
from app.routes.action_item_routes import router as action_item_router
from app.routes.deliverable_routes import router as deliverable_router
from app.routes.validation_routes import router as validation_router
from app.routes.admin_routes import router as admin_router
from app.routes.signaling_routes import router as signaling_router
from app.routes.project_routes import router as project_router
from app.models.user import UserModel
from app.models.organization import OrganizationModel
from app.models.project import ProjectModel

app = FastAPI(
    title="IntenT_loG — AI-Powered Meeting Assistant API",
    description=(
        "Backend API for IntenT_loG: converting meeting audio streams & transcripts into "
        "structured action items, tracking tasks, and validating deliverables."
    ),
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Configure CORS Middleware for Frontend & Ngrok Access
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_origin_regex=r"^https?://.*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# Seed Organizations & 5 Hierarchy Role Accounts on Startup
@app.on_event("startup")
def seed_default_admin_and_users():
    try:
        orgs_col = get_organizations_collection()
        users_col = get_users_collection()
        
        # 1. Seed Organizations
        if not orgs_col.find_one({"org_id": "ORG_ACME"}):
            orgs_col.insert_one(OrganizationModel.create_document(name="Acme Corporation", domain="acme.com", org_id="ORG_ACME"))
        if not orgs_col.find_one({"org_id": "ORG_TECHNOVA"}):
            orgs_col.insert_one(OrganizationModel.create_document(name="TechNova Solutions", domain="technova.io", org_id="ORG_TECHNOVA"))

        # 2. Seed 5 Role Accounts
        default_roles_users = [
            ("Application Super Admin", "admin@intentlog.ai", "admin123", "super_admin", "GLOBAL", "USER_SUPER_ADMIN"),
            ("Acme Org Admin", "orgadmin@acme.com", "admin123", "org_admin", "ORG_ACME", "USER_ORG_ADMIN"),
            ("Engineering Manager", "manager@acme.com", "password123", "manager", "ORG_ACME", "USER_MANAGER"),
            ("Frontend Team Lead", "teamlead@acme.com", "password123", "team_lead", "ORG_ACME", "USER_TEAM_LEAD"),
            ("Nithi (Employee)", "nithi@acme.com", "password123", "employee", "ORG_ACME", "USER_003"),
            ("Sujith (Employee)", "sujith@acme.com", "password123", "employee", "ORG_ACME", "USER_001"),
            ("Viswaa (Employee)", "viswaa@acme.com", "password123", "employee", "ORG_ACME", "USER_004"),
            ("Sukant (Employee)", "sukant@acme.com", "password123", "employee", "ORG_ACME", "USER_002")
        ]

        for name, email, pwd, r_key, o_id, u_id in default_roles_users:
            if not users_col.find_one({"email": email}):
                u_doc = UserModel.create_document(
                    name=name,
                    email=email,
                    password=pwd,
                    role=r_key,
                    org_id=o_id,
                    user_id=u_id
                )
                users_col.insert_one(u_doc)

        # 3. Seed Sample Projects if empty
        projects_col = get_projects_collection()
        if projects_col.count_documents({}) == 0:
            sample_projects = [
                {
                    "name": "Neural Audio Pipeline v2",
                    "key": "NAP-01",
                    "description": "Next-generation multi-peer WebRTC audio mesh with continuous VAD gate and low-latency Qwen3 extraction.",
                    "status": "In Progress",
                    "priority": "High",
                    "org_id": "ORG_ACME",
                    "lead_name": "Viswaa",
                    "team_members": ["Viswaa", "Nithi", "Sujith"],
                    "start_date": "2026-09-15",
                    "target_date": "2026-11-20",
                    "progress": 65,
                    "budget": "$24,000",
                    "milestones": [
                        {"id": "ms-01", "title": "WebRTC multi-peer mesh verification", "due_date": "2026-09-30", "completed": True},
                        {"id": "ms-02", "title": "VAD audio gate threshold tuning", "due_date": "2026-10-15", "completed": True},
                        {"id": "ms-03", "title": "End-to-End stress load testing", "due_date": "2026-11-10", "completed": False}
                    ]
                },
                {
                    "name": "Enterprise Security & SOC2 Compliance",
                    "key": "SEC-02",
                    "description": "Deterministic deliverable audit protocols and automated cryptographically signed MoM PDFs.",
                    "status": "In Progress",
                    "priority": "High",
                    "org_id": "ORG_ACME",
                    "lead_name": "Nithi",
                    "team_members": ["Nithi", "Sukant"],
                    "start_date": "2026-10-01",
                    "target_date": "2026-12-05",
                    "progress": 40,
                    "budget": "$18,500",
                    "milestones": [
                        {"id": "ms-04", "title": "RBAC 5-tier role separation audit", "due_date": "2026-10-20", "completed": True},
                        {"id": "ms-05", "title": "Deliverable checksum integrity check", "due_date": "2026-11-15", "completed": False}
                    ]
                },
                {
                    "name": "Cloud Microservices & Multi-Tenant Scaling",
                    "key": "CMS-03",
                    "description": "Kubernetes containerization and dynamic WebSocket tunnel load balancing across edge nodes.",
                    "status": "Planning",
                    "priority": "Medium",
                    "org_id": "ORG_ACME",
                    "lead_name": "Sujith",
                    "team_members": ["Sujith", "Viswaa"],
                    "start_date": "2026-11-01",
                    "target_date": "2027-01-15",
                    "progress": 15,
                    "budget": "$35,000",
                    "milestones": [
                        {"id": "ms-06", "title": "Architecture design review meeting", "due_date": "2026-11-10", "completed": False}
                    ]
                }
            ]
            for p in sample_projects:
                p_doc = ProjectModel.create_document(**p)
                projects_col.insert_one(p_doc)
    except Exception as e:
        print(f"Startup seeding warning: {e}")

# Include API Routers
app.include_router(user_router)
app.include_router(admin_router)
app.include_router(audio_stream_router)
app.include_router(vad_router)
app.include_router(transcription_router)
app.include_router(action_item_router)
app.include_router(deliverable_router)
app.include_router(validation_router)
app.include_router(participant_router)
app.include_router(session_router)
app.include_router(audio_router)
app.include_router(meeting_router)
app.include_router(task_router)
app.include_router(project_router)
app.include_router(signaling_router)

@app.get("/", tags=["Health"])
def root_info():
    """
    Root status endpoint for browser checks and verification.
    """
    db_connected = check_db_connection()
    return {
        "status": "online",
        "service": "IntenT_loG API",
        "version": "1.0.0",
        "database": "connected" if db_connected else "disconnected",
        "message": "Backend API is running and connected successfully!",
        "docs_url": "/docs",
        "health_url": "/health"
    }

@app.get("/health", status_code=status.HTTP_200_OK, tags=["Health"])
def health_check():
    """
    Health check endpoint returning service status and MongoDB connectivity.
    """
    db_connected = check_db_connection()
    return {
        "status": "ok",
        "service": "meeting-action-assistant",
        "database": "connected" if db_connected else "disconnected"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
