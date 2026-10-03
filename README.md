# WhistleDrop

Privacy-conscious anonymous reporting and case tracking. Reporters can submit concerns without creating accounts or providing identity fields, then check progress using a randomly generated case code.

## Problem and features

Reporting misconduct can expose a reporter or create friction before anyone can raise a concern. WhistleDrop minimizes the information requested and provides a private tracking code. It includes anonymous submissions, case tracking, workflow updates, moderator authentication and filtering, evidence upload, permanent closure, OpenAPI docs, automated tests, a minimal React interface, and Docker configuration.

## Architecture and stack

FastAPI + Pydantic + SQLAlchemy backend, PostgreSQL for deployment, pytest/httpx API tests, and React + TypeScript + Vite UI. See [architecture](docs/architecture.md), [privacy](docs/privacy.md), [security](docs/security.md), and [deployment](docs/deployment.md).

## Structure

```text
whistledrop/
├── backend/       # FastAPI application and tests
├── frontend/      # Minimal submission, tracking, moderator UI
├── docs/          # Architecture, privacy, security, deployment
├── screenshots/   # Reserved for reviewed UI screenshots
├── .github/       # Backend CI workflow
├── docker-compose.yml
└── README.md
```

## Run locally

Requirements: Python 3.12+, Node.js 20+, npm, and Docker Compose for the full PostgreSQL + ClamAV stack.

1. Copy `.env.example` to `.env`, then replace both placeholder secrets. Keep the PostgreSQL password URL-safe or percent-encode it in `DATABASE_URL`.
2. Start PostgreSQL, ClamAV, and the API: `docker compose up --build`.
3. In `frontend/`, run `npm install`, then `npm run dev`. Open http://localhost:5173.
4. API docs: http://localhost:8000/docs. Health: http://localhost:8000/health.

For backend-only development, copy `backend/.env.example` to `backend/.env`, set a local moderator token, and run from `backend/`: `pip install -r requirements.txt` then `uvicorn app.main:app --reload`. The example uses SQLite. Evidence uploads require a reachable ClamAV daemon; without one, upload requests fail safely with `503`. To use the Compose ClamAV daemon from the host-run backend, set `CLAMAV_HOST=127.0.0.1` and start `docker compose up -d clamav`. SQLite is for local development/tests; use PostgreSQL for deployment.

## Configuration

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | SQLAlchemy database URL; deployment should use PostgreSQL/psycopg |
| `MODERATOR_TOKEN` | Required shared moderator Bearer token |
| `EVIDENCE_DIRECTORY` | Private persistent directory for evidence files |
| `MAX_UPLOAD_BYTES` | Upload limit, default 5 MiB |
| `CLAMAV_HOST` / `CLAMAV_PORT` | Required ClamAV daemon address for evidence scanning |
| `CLAMAV_TIMEOUT_SECONDS` | Scanner connection/read timeout, default 15 seconds |
| `CORS_ORIGINS` | Comma-separated exact browser origins |
| `ENVIRONMENT` | Deployment environment label |

Backend template: `backend/.env.example`. Never use its placeholder credential in deployment.

## API overview

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| `POST` | `/api/reports` | Public | Submit a report without an account |
| `GET` | `/api/reports/{case_code}` | Public | Track status and reporter-visible updates |
| `POST` | `/api/reports/{case_code}/evidence` | Public | Attach evidence using the case code |
| `GET` | `/api/moderator/reports` | Moderator | List and filter reports |
| `GET` | `/api/moderator/reports/{report_id}` | Moderator | Read report details and evidence metadata |
| `PATCH` | `/api/moderator/reports/{report_id}/status` | Moderator | Apply an allowed status transition and update |
| `POST` | `/api/moderator/reports/{report_id}/updates` | Moderator | Add a reporter-visible update without changing status |
| `POST` | `/api/moderator/reports/{report_id}/close` | Moderator | Permanently close a resolved or dismissed case |
| `GET` | `/api/moderator/reports/{report_id}/evidence/{evidence_id}` | Moderator | Download evidence for the specified report |
| `GET` | `/health` | Public | Check application and database readiness |

Moderator endpoints require `Authorization: Bearer <MODERATOR_TOKEN>`. Listing supports `category`, `status`, `search`, `created_after`, and `created_before` query parameters. FastAPI serves Swagger UI at `/docs` and OpenAPI at `/openapi.json`.

### Example requests and responses

Create an anonymous report (the response contains the one-time case code to save):

```http
POST /api/reports
Content-Type: application/json

{"category":"SECURITY","description":"A detailed description of the concern."}
```

```json
{"case_code":"WD-lz4yJ09TTK2aR7x0N5s_Cw1Q","status":"SUBMITTED","created_at":"2026-01-01T12:00:00+00:00"}
```

Track it by case code, without moderator credentials:

```http
GET /api/reports/WD-lz4yJ09TTK2aR7x0N5s_Cw1Q
```

```json
{
  "case_code":"WD-lz4yJ09TTK2aR7x0N5s_Cw1Q",
  "category":"SECURITY",
  "status":"SUBMITTED",
  "created_at":"2026-01-01T12:00:00+00:00",
  "updated_at":"2026-01-01T12:00:00+00:00",
  "updates":[{"status":"SUBMITTED","message":"Report received.","created_at":"2026-01-01T12:00:00+00:00"}]
}
```

The tracking response intentionally omits the report narrative, reference URL, evidence, internal database IDs, and moderator-only data. A missing case code returns `404`; invalid request fields return `422`. Evidence accepts one PDF, PNG, JPG/JPEG, or UTF-8 TXT file up to 5 MiB. Binary formats must have the expected magic bytes. The backend writes to a private temporary file, scans it through ClamAV's INSTREAM protocol, and moves it to a generated permanent filename only after a clean result. Infected files return `422`; a missing or unavailable scanner returns `503`; neither case stores permanent evidence metadata or content. Downloads require moderator authentication.

## Status workflow

Moderators can move a report from `SUBMITTED` to `UNDER_REVIEW`, then to `RESOLVED` or `DISMISSED`. Either final outcome can be permanently closed as `CLOSED`. Closed cases are terminal and reject status changes, updates, and evidence uploads.

## Tests and frontend build

From `backend/`: `pip install -r requirements.txt` then `pytest -q`. From `frontend/`: `npm install` then `npm run build`. GitHub Actions runs the backend suite.

## Privacy and design decisions

No reporter identity fields or accounts are collected. A cryptographic random case code, not the internal database ID, is used for public tracking. Tracking reveals only category, workflow state, dates, and updates; moderators see the report narrative and evidence metadata and can download evidence through authenticated endpoints. The system does not promise untraceability: infrastructure logs and identifying details in user-submitted text/files remain possible. Upload names are randomized and original names are metadata only. The browser UI uses system fonts and does not fetch third-party font resources.

Screenshots: none are included yet; `screenshots/` is reserved for reviewed interface captures.

## Known limitations

The moderator credential is shared, without individual accounts or attribution. ClamAV scanning reduces the risk of storing known malware but does not guarantee uploaded files are safe; signature databases need ongoing updates. The ClamAV TCP protocol is unencrypted and unauthenticated, so Compose binds its host mapping to loopback only. Evidence uses a persistent local volume; encryption-at-rest policy, retention automation, and object storage are not included. Schema setup uses SQLAlchemy `create_all`; production schema changes need migrations. Production Docker deployment was not runtime-verified in this environment. Configure TLS, secrets, backups, retention, and infrastructure log policy before deployment.
