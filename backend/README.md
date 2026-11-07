# FixBack AI – Complete Python FastAPI Backend

FixBack AI is an AI-powered engineering incident memory platform. It serves as an active organizational memory for engineering teams, capturing developer-confirmed incident postmortems, persisting them into **Hindsight Cloud**, and leveraging **Groq AI** (acting as a senior Site Reliability Engineer) to analyze new outages against verified historical precedent.

---

## 1. Technology Stack

- **Python 3.11+**
- **FastAPI**: Modern, asynchronous REST API framework
- **PostgreSQL**: Production-grade relational database for incidents and operational metrics
- **SQLAlchemy 2.0**: Type-safe ORM for database modeling and query execution
- **Pydantic v2 & Pydantic-Settings**: Request/response validation and environment configuration
- **Hindsight Python SDK (`hindsight-client`)**: Vector and associative cloud memory retention and recall
- **Groq Python SDK (`groq`)**: Low-latency AI inference for SRE diagnosis
- **Uvicorn**: High-performance ASGI server
- **Pytest & HTTPX**: Comprehensive automated test suite

---

## 2. Project Structure

```
backend/
├── app/
│   ├── main.py                  # FastAPI application entrypoint, CORS, lifespan, routes
│   ├── config.py                # Environment configuration using pydantic-settings
│   ├── database/
│   │   ├── base.py              # SQLAlchemy Declarative Base
│   │   └── connection.py        # Engine, SessionLocal, and DB health verification
│   ├── models/
│   │   └── incident.py          # SQLAlchemy Incident model (UUID PK, JSON, enum statuses)
│   ├── schemas/
│   │   ├── incident.py          # Request, response, and AI diagnosis schemas
│   │   ├── dashboard.py         # Dashboard statistics, trends, and activity schemas
│   │   └── memory.py            # Hindsight memory search schemas
│   ├── routes/
│   │   ├── health_routes.py     # GET /api/health
│   │   ├── incident_routes.py   # Incident CRUD, analysis, and confirmation routes
│   │   ├── dashboard_routes.py  # GET /api/dashboard/stats
│   │   └── memory_routes.py     # GET /api/memory/search
│   ├── services/
│   │   ├── hindsight_service.py # Official Hindsight SDK client (retain & recall)
│   │   ├── groq_service.py      # Official Groq SDK client (SRE AI diagnosis)
│   │   └── incident_service.py  # Domain orchestration & PostgreSQL aggregations
│   └── utils/
│       └── exceptions.py        # Centralized exceptions and global error handlers
├── tests/
│   ├── conftest.py              # Test database (SQLite in-memory) & external mocks
│   ├── test_health.py           # Health endpoint tests
│   ├── test_incidents.py        # Analysis, confirmation, pagination, and detail tests
│   ├── test_memory.py           # Memory search tests
│   └── test_dashboard.py        # Dashboard stats and metric aggregation tests
├── requirements.txt             # Locked project dependencies
├── .env.example                 # Environment variables template
└── README.md                    # System architecture and documentation
```

---

## 3. Environment Configuration

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

### Environment Variables:

| Variable | Description | Default |
|---|---|---|
| `HINDSIGHT_API_URL` | Hindsight Cloud API Base URL | `https://api.hindsight.vectorize.io` |
| `HINDSIGHT_API_KEY` | Your Hindsight API Key | `your_hindsight_api_key` |
| `HINDSIGHT_BANK_ID` | Memory Bank ID | `fixback-engineering` |
| `GROQ_API_KEY` | Your Groq Cloud API Key | `your_groq_api_key` |
| `GROQ_MODEL` | SRE Diagnosis LLM Model | `openai/gpt-oss-120b` |
| `DATABASE_URL` | SQLAlchemy Database Connection URL | `postgresql+psycopg://username@localhost:5432/fixback` |
| `CORS_ORIGINS` | Allowed frontend origins (comma-separated) | `http://localhost:5173` |

> **Security Note:** Secrets and API keys are never exposed in API responses or logs.

---

## 4. PostgreSQL Database Model

The database stores all incident lifecycle states.

### Incident Schema:

- `id`: `UUID` (Primary key, auto-generated v4)
- `incident_code`: `String(64)` (Unique indexed identifier, e.g., `INC-20261107-AB12`)
- `title`: `String(255)` (Incident headline)
- `service`: `String(100)` (Target microservice / component)
- `environment`: `String(50)` (e.g. `production`, `staging`)
- `error_message`: `Text` (Observed exception / failure signature)
- `logs`: `Text` (Nullable, tracebacks or log snippets)
- `ai_diagnosis`: `JSON` (Structured output from Groq SRE diagnosis)
- `root_cause`: `Text` (Nullable, developer-confirmed root cause)
- `resolution`: `Text` (Nullable, verified mitigation and fix applied)
- `status`: `String(50)` (Allowed values: `analyzing`, `awaiting_confirmation`, `resolved`)
- `memory_retained`: `Boolean` (Default `false`, set to `true` only when Hindsight Cloud confirms retention)
- `created_at`: `DateTime` (UTC timestamp)
- `updated_at`: `DateTime` (UTC timestamp)
- `resolved_at`: `DateTime` (Nullable UTC timestamp)

### Production Migrations Recommendation

During development, `Base.metadata.create_all(bind=engine)` runs on application startup.
For production deployments, initialize and run migrations using **Alembic**:

```bash
# Initialize Alembic
alembic init alembic

# Generate migration revision
alembic revision --autogenerate -m "create_incidents_table"

# Apply migration
alembic upgrade head
```

---

## 5. API Endpoints Reference

Base prefix: `/api`

### A. Health Check
- **Endpoint:** `GET /api/health`
- **Description:** Verifies database connectivity and reports real Hindsight and Groq readiness.
- **Response Example:**
  ```json
  {
    "success": true,
    "message": "FixBack AI Backend is healthy",
    "data": {
      "status": "healthy",
      "database": {
        "connected": true,
        "message": "Database connection operational"
      },
      "hindsight": {
        "configured": true,
        "ready": true,
        "bank_id": "fixback-engineering",
        "message": "Connected to Hindsight Cloud and bank is accessible"
      },
      "groq": {
        "configured": true,
        "ready": true,
        "model": "openai/gpt-oss-120b",
        "message": "Groq client configured and ready"
      }
    }
  }
  ```

---

### B. Analyze Incident
- **Endpoint:** `POST /api/incidents/analyze`
- **Description:** Validates request, creates PostgreSQL record in `analyzing` status, recalls relevant historical memories from Hindsight Cloud, prompts Groq AI SRE, records diagnosis, and transitions status to `awaiting_confirmation`.
- **Request Body:**
  ```json
  {
    "title": "Database connection issue",
    "service": "payment-api",
    "environment": "production",
    "error_message": "Database connection pool exhausted. Requests are timing out.",
    "logs": "Connection timeout after 30000ms."
  }
  ```
- **Response Example:**
  ```json
  {
    "success": true,
    "message": "Incident analyzed and diagnosis generated successfully",
    "data": {
      "incident": {
        "id": "c1f10be3-f935-430b-93ff-15e8b4e94119",
        "incident_code": "INC-20261107-1F4A",
        "title": "Database connection issue",
        "service": "payment-api",
        "environment": "production",
        "error_message": "Database connection pool exhausted. Requests are timing out.",
        "logs": "Connection timeout after 30000ms.",
        "ai_diagnosis": { ... },
        "root_cause": null,
        "resolution": null,
        "status": "awaiting_confirmation",
        "memory_retained": false,
        "created_at": "2026-11-07T12:00:00Z",
        "updated_at": "2026-11-07T12:00:00Z",
        "resolved_at": null
      },
      "diagnosis": {
        "summary": "Database connection pool starvation in payment-api production",
        "possible_root_cause": "Unreleased database connections or long-running transactions leaking connection pool slots.",
        "historical_context": "Past incident INC-20261015-9921 previously experienced connection pool starvation due to unclosed sessions in checkout endpoint.",
        "recommended_steps": [
          "Check active connection counts in pg_stat_activity",
          "Inspect checkout request handlers for unhandled exception paths that skip session.close()",
          "Increase pool overflow temporarily if traffic spike is confirmed"
        ],
        "memory_used": true,
        "related_memories": [ ... ]
      },
      "historical_memories": [ ... ],
      "hindsight_status": {
        "lookup_successful": true,
        "memories_found": 1,
        "error": null
      }
    }
  }
  ```

---

### C. Confirm Incident Resolution
- **Endpoint:** `POST /api/incidents/{incident_id}/confirm`
- **Description:** Accepts developer-verified root cause and resolution. Updates incident to `resolved`, updates `resolved_at`, retains memory into Hindsight Cloud, and records `memory_retained = true`.
- **Idempotency:** Confirmation is idempotent and retry-safe to prevent duplicate memory creation.
- **Request Body:**
  ```json
  {
    "root_cause": "Database connections were not released after requests.",
    "resolution": "Fixed connection lifecycle and added connection pool monitoring."
  }
  ```
- **Response Example:**
  ```json
  {
    "success": true,
    "message": "Resolution confirmed and retained in Hindsight Cloud",
    "data": {
      "incident": {
        "id": "c1f10be3-f935-430b-93ff-15e8b4e94119",
        "incident_code": "INC-20261107-1F4A",
        "status": "resolved",
        "root_cause": "Database connections were not released after requests.",
        "resolution": "Fixed connection lifecycle and added connection pool monitoring.",
        "memory_retained": true,
        "resolved_at": "2026-11-07T12:05:00Z"
      },
      "memory_retained": true,
      "retention_details": {
        "success": true,
        "bank_id": "fixback-engineering",
        "items_count": 1,
        "operation_id": "op_987654"
      }
    }
  }
  ```

---

### D. Get Incidents (Paginated & Filtered)
- **Endpoint:** `GET /api/incidents`
- **Query Parameters:**
  - `page` (integer, default: 1)
  - `limit` (integer, default: 10, max: 100)
  - `search` (string, searches title, error_message, incident_code, service)
  - `service` (string, filter by service)
  - `environment` (string, filter by environment)
  - `status` (string: `analyzing`, `awaiting_confirmation`, `resolved`)
- **Response Example:**
  ```json
  {
    "success": true,
    "message": "Incidents retrieved successfully",
    "data": {
      "items": [ ... ],
      "total": 42,
      "page": 1,
      "limit": 10,
      "total_pages": 5
    }
  }
  ```

---

### E. Incident Details
- **Endpoint:** `GET /api/incidents/{incident_id}`
- **Description:** Retrieve full incident by UUID or `incident_code`. Returns 404 if not found.

---

### F. Memory Search
- **Endpoint:** `GET /api/memory/search?q=database+connection`
- **Description:** Queries Hindsight Cloud Recall directly with the query and returns genuine recalled memories with their content and types. Never fabricates memories.
- **Response Example:**
  ```json
  {
    "success": true,
    "message": "Recalled 2 historical memories from Hindsight",
    "data": {
      "query": "database connection",
      "count": 2,
      "memories": [
        {
          "id": "mem_01",
          "content": "Incident INC-20261107-1F4A: payment-api connection pool exhausted due to unreleased connections.",
          "memory_type": "incident",
          "metadata": { "service": "payment-api", "environment": "production" }
        }
      ]
    }
  }
  ```

---

### G. Dashboard Statistics
- **Endpoint:** `GET /api/dashboard/stats`
- **Description:** Dynamically calculates metrics from PostgreSQL without hardcoded numbers.
- **Response Example:**
  ```json
  {
    "success": true,
    "message": "Dashboard statistics calculated successfully",
    "data": {
      "total_incidents": 24,
      "resolved_incidents": 18,
      "pending_incidents": 5,
      "analyzing_incidents": 1,
      "successfully_retained_memories": 18,
      "incidents_by_status": {
        "resolved": 18,
        "awaiting_confirmation": 5,
        "analyzing": 1
      },
      "incidents_over_time": [
        { "date": "2026-11-05", "count": 6 },
        { "date": "2026-11-06", "count": 10 },
        { "date": "2026-11-07", "count": 8 }
      ],
      "recent_incidents": [ ... ],
      "recent_activity": [ ... ]
    }
  }
  ```

---

## 6. How to Run and Verify the Backend

### Installation

```bash
cd backend
pip install -r requirements.txt
```

### Starting the Server

```bash
uvicorn app.main:app --reload --port 8000
```

### Interactive API Documentation (Swagger)

Open your browser and navigate to:
```
http://localhost:8000/docs
```

---

## 7. Running Automated Tests

Run the full pytest suite:

```bash
cd backend
python -m pytest tests -v
```

All 9 automated unit/integration tests run against an isolated in-memory SQLite database and test the full request/response cycle, pagination, validation, and idempotent confirmation with mocked cloud endpoints.

---

## 8. End-to-End Acceptance Test (Hindsight Cloud Verification)

To execute the official FixBack AI acceptance workflow with live cloud persistence:

1. Configure your `.env` with real credentials:
   ```ini
   HINDSIGHT_API_KEY=your_actual_hindsight_api_key
   HINDSIGHT_BANK_ID=fixback-engineering
   GROQ_API_KEY=your_actual_groq_api_key
   ```

2. **Step 1: Submit First Incident**
   ```bash
   curl -X POST "http://localhost:8000/api/incidents/analyze" \
     -H "Content-Type: application/json" \
     -d '{
       "title": "Payment gateway timeout under heavy checkout load",
       "service": "payment-api",
       "environment": "production",
       "error_message": "Connection pool exhausted. Timeout after 30000ms waiting for DB connection.",
       "logs": "SQLAlchemy QueuePool limit of size 20 overflow 10 reached."
     }'
   ```
   *Note down the returned `incident.id` from the response.*

3. **Step 2: Confirm Resolution & Retain**
   ```bash
   curl -X POST "http://localhost:8000/api/incidents/<INCIDENT_ID>/confirm" \
     -H "Content-Type: application/json" \
     -d '{
       "root_cause": "Checkout controller was not calling session.close() in async rollback branches, leaking pool slots.",
       "resolution": "Converted session management to context manager (with db_session) and increased pool overflow."
     }'
   ```
   *Verify `"memory_retained": true` and `"status": "resolved"` in the response.*

4. **Step 3: Submit Similar Second Incident**
   ```bash
   curl -X POST "http://localhost:8000/api/incidents/analyze" \
     -H "Content-Type: application/json" \
     -d '{
       "title": "Payment API connection timeout during checkout",
       "service": "payment-api",
       "environment": "production",
       "error_message": "QueuePool limit reached. Cannot acquire connection for order charge.",
       "logs": "Timeout waiting for available connection in pool."
     }'
   ```

5. **Step 4: Verify Memory Recall**
   Inspect the response:
   - `historical_memories` will contain the exact retained memory from Step 2.
   - `ai_diagnosis.historical_context` will explain the historical relevance of the previous outage and verify that the unclosed session leak is the primary suspect.
