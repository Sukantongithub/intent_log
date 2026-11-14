# AI-Powered Meeting Action Item Validation Assistant (Backend)

An intelligent backend service built with **FastAPI**, **MongoDB (PyMongo)**, **Pydantic**, and the **Groq Python SDK**. It automatically analyzes meeting transcripts, extracts structured action items (responsible persons, tasks, deadlines, priorities) and summaries using Groq LLM, manages task lifecycles, and validates progress updates against original commitments.

---

## 1. Project Overview

During engineering and business meetings, action items and deadlines are frequently discussed but hard to track. This backend provides:
- **Transcript Extraction**: Converts unstructured meeting transcripts into structured action items and summaries via Groq AI.
- **Task Management**: Stores and tracks action item statuses (`Pending`, `In Progress`, `Completed`, `Delayed`).
- **Progress Validation**: Validates text updates against original meeting action items to identify completed, pending, delayed, or unmentioned tasks without auto-mutating state unpredictably.
- **RESTful Endpoints**: Built with FastAPI, designed specifically for easy integration with modern React frontends.

---

## 2. Technology Stack

- **Language**: Python 3.11+
- **Framework**: FastAPI & Uvicorn
- **Database**: MongoDB (via PyMongo client)
- **Validation**: Pydantic v2
- **LLM Engine**: Groq Python SDK (`groq`) with JSON Output Mode
- **Configuration**: python-dotenv & pydantic-settings
- **CORS Middleware**: Pre-configured for React (`http://localhost:5173`)

---

## 3. Project Folder Structure

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py                   # FastAPI Application Entrypoint & Health Check
│   │
│   ├── config/
│   │   ├── __init__.py
│   │   └── settings.py           # Environment & Settings Management
│   │
│   ├── database/
│   │   ├── __init__.py
│   │   └── mongodb.py            # PyMongo Connection Manager & ID Utilities
│   │
│   ├── models/
│   │   ├── __init__.py
│   │   ├── meeting.py            # MongoDB Document Helper for Meetings
│   │   └── task.py               # MongoDB Document Helper for Tasks
│   │
│   ├── schemas/
│   │   ├── __init__.py
│   │   ├── meeting_schema.py     # Pydantic Schemas for Meetings & Validation
│   │   └── task_schema.py        # Pydantic Schemas for Tasks
│   │
│   ├── services/
│   │   ├── __init__.py
│   │   ├── groq_service.py       # Groq SDK Integration & Prompt Engineering
│   │   └── validation_service.py # Progress Validation Engine
│   │
│   └── routes/
│       ├── __init__.py
│       ├── meeting_routes.py     # Endpoints for Meeting CRUD & Validation
│       └── task_routes.py        # Endpoints for Task Retrieval & Status Updates
│
├── .env                          # Local Environment Secrets (Not committed to Git)
├── .env.example                  # Environment Configuration Template
├── .gitignore                    # Excluded Files & Virtual Envs
├── requirements.txt              # Project Dependencies
└── README.md                     # Technical Documentation
```

---

## 4. Setup Requirements

- Python 3.11+
- MongoDB Community Server (running locally on port 27017) or MongoDB Atlas connection URI
- Groq API Key (Get a free key from [console.groq.com](https://console.groq.com))

---

## 5. Python Environment Setup

```bash
# Navigate to backend directory
cd backend

# Create virtual environment
python -m venv .venv

# Activate virtual environment
# Windows (PowerShell):
.venv\Scripts\Activate.ps1
# Windows (CMD):
.venv\Scripts\activate.bat
# macOS/Linux:
source .venv/bin/activate
```

---

## 6. Dependency Installation

```bash
pip install -r requirements.txt
```

---

## 7. Configuration (`.env`)

Create a `.env` file in the `backend/` directory by copying `.env.example`:

```bash
cp .env.example .env
```

Configure your environment variables:

```env
GROQ_API_KEY=gsk_your_real_groq_api_key_here
MONGODB_URI=mongodb://localhost:27017
DATABASE_NAME=meeting_action_assistant
GROQ_MODEL=openai/gpt-oss-120b
```

---

## 8. Starting MongoDB

### Windows:
If MongoDB is installed as a service, it runs automatically. Alternatively, start it via CLI:
```powershell
mongod --dbpath "C:\data\db"
```

---

## 9. Starting the Backend Server

Run Uvicorn with hot-reload enabled:

```bash
uvicorn app.main:app --reload
```

The server will start at: `http://localhost:8000`

---

## 10. Swagger Documentation

Interactive OpenAPI documentation is available out of the box:
- **Swagger UI**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **ReDoc**: [http://localhost:8000/redoc](http://localhost:8000/redoc)

---

## 11. Core API Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/health` | Service & DB health status |
| `POST` | `/api/meetings` | Create meeting from transcript & extract tasks via Groq |
| `GET` | `/api/meetings` | Get paginated list of all meetings |
| `GET` | `/api/meetings/{id}` | Get single meeting with tasks |
| `DELETE` | `/api/meetings/{id}` | Delete meeting and linked tasks |
| `POST` | `/api/meetings/{id}/validate` | Validate progress update against original tasks |
| `GET` | `/api/tasks` | Get all tasks (filterable by status, priority, person) |
| `GET` | `/api/tasks/{id}` | Get single task |
| `PATCH` | `/api/tasks/{id}/status` | Update task status |

---

## 12. Example API Requests & Responses

### 1. Health Check (`GET /health`)

**Response:**
```json
{
  "status": "ok",
  "service": "meeting-action-assistant",
  "database": "connected"
}
```

---

### 2. Create Meeting (`POST /api/meetings`)

**Request:**
```json
{
  "title": "Project Meeting",
  "date": "2026-08-11",
  "transcript": "Today's project meeting focused on developing the AI meeting assistant. John will complete the React dashboard by Friday. Sarah will design the MongoDB database by Wednesday. David will test the backend API next Monday. The team should review the complete application next Friday."
}
```

**Response:**
```json
{
  "id": "66b8d1f2a1b2c3d4e5f6a7b9",
  "title": "Project Meeting",
  "date": "2026-08-11",
  "transcript": "Today's project meeting focused on developing the AI meeting assistant. John will complete the React dashboard by Friday. Sarah will design the MongoDB database by Wednesday. David will test the backend API next Monday. The team should review the complete application next Friday.",
  "summary": "The team discussed progress on the AI meeting assistant project, assigning frontend, database design, backend testing, and overall application review tasks across team members.",
  "tasks": [
    {
      "id": "66b8d1f2a1b2c3d4e5f6a7ba",
      "meeting_id": "66b8d1f2a1b2c3d4e5f6a7b9",
      "person": "John",
      "task": "Complete the React dashboard",
      "deadline": "Friday",
      "priority": "High",
      "status": "Pending",
      "created_at": "2026-08-11T11:00:00.000000"
    },
    {
      "id": "66b8d1f2a1b2c3d4e5f6a7bb",
      "meeting_id": "66b8d1f2a1b2c3d4e5f6a7b9",
      "person": "Sarah",
      "task": "Design the MongoDB database",
      "deadline": "Wednesday",
      "priority": "Medium",
      "status": "Pending",
      "created_at": "2026-08-11T11:00:00.000000"
    },
    {
      "id": "66b8d1f2a1b2c3d4e5f6a7bc",
      "meeting_id": "66b8d1f2a1b2c3d4e5f6a7b9",
      "person": "David",
      "task": "Test the backend API",
      "deadline": "Next Monday",
      "priority": "Medium",
      "status": "Pending",
      "created_at": "2026-08-11T11:00:00.000000"
    },
    {
      "id": "66b8d1f2a1b2c3d4e5f6a7bd",
      "meeting_id": "66b8d1f2a1b2c3d4e5f6a7b9",
      "person": "Unassigned",
      "task": "Review the complete application",
      "deadline": "Next Friday",
      "priority": "Medium",
      "status": "Pending",
      "created_at": "2026-08-11T11:00:00.000000"
    }
  ],
  "created_at": "2026-08-11T11:00:00.000000",
  "updated_at": "2026-08-11T11:00:00.000000"
}
```

---

### 3. Validate Meeting Progress (`POST /api/meetings/{id}/validate`)

**Request:**
```json
{
  "progress_update": "John finished the React dashboard. Sarah is still working on MongoDB. David has not started."
}
```

**Response:**
```json
{
  "completed": [
    "Complete the React dashboard"
  ],
  "pending": [
    "Design the MongoDB database"
  ],
  "delayed": [],
  "unmentioned": [
    "Test the backend API",
    "Review the complete application"
  ],
  "explanations": {
    "Complete the React dashboard": "John finished the React dashboard as stated in the update.",
    "Design the MongoDB database": "Sarah is currently working on the MongoDB design."
  }
}
```

---

### 4. Update Task Status (`PATCH /api/tasks/{id}/status`)

**Request:**
```json
{
  "status": "Completed"
}
```

**Response:**
```json
{
  "id": "66b8d1f2a1b2c3d4e5f6a7ba",
  "meeting_id": "66b8d1f2a1b2c3d4e5f6a7b9",
  "person": "John",
  "task": "Complete the React dashboard",
  "deadline": "Friday",
  "priority": "High",
  "status": "Completed",
  "created_at": "2026-08-11T11:00:00.000000"
}
```

---

## 13. Data Flow Architecture

```
User / Frontend
      │
      ▼
1. POST /api/meetings (Transcript)
      │
      ├──▶ 2. Groq LLM API (Extract Tasks & Summary as JSON)
      │
      ├──▶ 3. Store Meeting Document in MongoDB (`meetings`)
      │
      ├──▶ 4. Store Action Items in MongoDB (`tasks`)
      │
      ▼
5. Unified Response returned to Frontend
```
