# WhistleDrop Project Report

## Purpose

WhistleDrop is a privacy-conscious anonymous reporting and case-tracking application. A reporter can submit a concern without creating an account or providing identity fields, receive a randomly generated case code, and later use that code to see limited progress information. Moderators use a server-configured Bearer token to review reports, communicate updates, and advance cases through a controlled workflow.

The project is organized as a small monorepo: the FastAPI service lives in `backend/`, the React application lives in `frontend/`, and the repository root contains shared documentation, Docker Compose configuration, GitHub Actions, and the local development launcher.

The API and submission form support the recruiter’s suggested Security, Harassment, Corruption, Technical, and Other categories. Misconduct and Fraud are also available as additional categories.

## Start the frontend and backend together

After installing the prerequisites and dependencies below, run one command from the repository root:

```sh
pnpm dev
```

This runs the FastAPI development server at `http://localhost:8000` and the Vite frontend at `http://localhost:5173`. Press Ctrl+C to stop both processes.

### First-time setup

Requirements: Python 3.12 or newer, Node.js 20 or newer, and pnpm.

```sh
python -m pip install -r backend/requirements.txt
pnpm --dir frontend install --frozen-lockfile
```

For moderator access, configure a local `backend/.env` based on `backend/.env.example` and set a private `MODERATOR_TOKEN`. The backend defaults to a local SQLite database, so basic report submission and tracking do not require Docker. Evidence uploads fail closed with HTTP 503 until a reachable ClamAV service is configured. To run the Compose scanner while using the local launcher, start `docker compose up -d clamav` and configure the host-run backend to use `CLAMAV_HOST=127.0.0.1`.

`dev.mjs` uses `python` on Windows and `python3` elsewhere. Set the `PYTHON` environment variable to choose another interpreter. The backend requirements must be installed into that interpreter's environment.

To use an alternate API port, set `WHISTLEDROP_API_PORT` before running `pnpm dev`. The frontend API base follows that port unless `VITE_API_URL` is set explicitly. Vite chooses the next free frontend port if 5173 is already in use.

## Repository map

| Location | What it contains |
|---|---|
| `dev.mjs` | Starts backend and frontend child processes together and stops both when interrupted. |
| `package.json` | Root orchestration script; no runtime or third-party dependencies are added here. |
| `docker-compose.yml` | PostgreSQL, ClamAV, and backend services with persistent data volumes and health checks. The frontend is started separately by `pnpm dev`. |
| `README.md` | Concise project overview, Docker setup, API map, and development instructions. |
| `docs/architecture.md` | Request flow, data relationships, and package boundaries. |
| `docs/privacy.md` | Data collected, case-code access model, moderator visibility, and privacy limits. |
| `docs/security.md` | Moderator authentication, case-code entropy, upload validation, scanning, and operational controls. |
| `docs/deployment.md` | Environment configuration, Docker deployment, persistence, scanner requirements, and deployment limitations. |
| `.env.example`, `backend/.env.example` | Configuration templates. They are examples, not credentials for a deployment. |
| `.github/workflows/tests.yml` | GitHub Actions workflow that installs backend requirements and runs pytest. |
| `screenshots/README.md` | Notes for the currently empty reviewed-screenshots area. |

### Backend code

| Location | Responsibility |
|---|---|
| `backend/app/main.py` | FastAPI application, CORS policy, startup table creation, router registration, and `/health`. |
| `backend/app/core/config.py` | Environment settings, defaults, PostgreSQL production guard, CORS origins, evidence directory, and ClamAV settings. |
| `backend/app/core/security.py` | Moderator Bearer-token validation and distinct 401/503 responses. |
| `backend/app/db/database.py` | SQLAlchemy engine, base class, and database-session dependency. |
| `backend/app/db/models.py` | `Report`, `ReportUpdate`, and `Evidence` SQLAlchemy models and relationships. |
| `backend/app/schemas/report.py` | Report categories/status enums and validation/response schemas, including the limited public tracking response. |
| `backend/app/schemas/moderator.py` | Moderator status-change and update input schemas. |
| `backend/app/schemas/evidence.py` | Publicly serializable evidence metadata. |
| `backend/app/routes/reports.py` | Public report submission endpoint. |
| `backend/app/routes/tracking.py` | Public case-code tracking endpoint. |
| `backend/app/routes/evidence.py` | Public evidence upload endpoint, scoped by case code. |
| `backend/app/routes/moderator.py` | Protected list/filter, detail, status, update, close, and evidence-download endpoints. |
| `backend/app/services/reports.py` | Secure case-code creation, initial update, and case-code lookup. |
| `backend/app/services/moderation.py` | Report filters, allowed transitions, reporter-visible updates, and permanent closure. |
| `backend/app/services/evidence.py` | Upload validation, temporary-file handling, ClamAV INSTREAM scanning, safe generated storage names, and cleanup on failure. |
| `backend/tests/` | API tests for submission, tracking, moderator workflow/authentication, security behavior, and evidence validation/scanning. |

### Frontend code

| Location | Responsibility |
|---|---|
| `frontend/src/main.tsx` | Application shell, page navigation, shared header/footer, theme selector, persisted theme, and API docs link. |
| `frontend/src/style.css` | Shared visual system, responsive layouts, accessibility states, and all seven theme palettes. |
| `frontend/src/services/api.ts` | Fetch wrappers for report, tracking, moderation, status/update/close, and evidence download calls. |
| `frontend/src/types/index.ts` | TypeScript models for public tracking and moderator data. |
| `frontend/src/components/StatusPill.tsx` | Reusable report-status label. |
| `frontend/src/pages/Home.tsx` | Product introduction and entry points to submit or track a report. |
| `frontend/src/pages/Submit.tsx` | Anonymous report form, validation, optional upload, success state, and case-code copy flow. |
| `frontend/src/pages/Track.tsx` | Case-code lookup and reporter-visible progress timeline. |
| `frontend/src/pages/Moderator.tsx` | Moderator sign-in, report list/detail, filtering, workflow actions, updates, and evidence downloads. |
| `frontend/src/pages/Privacy.tsx` | User-facing privacy explanation. |
| `frontend/src/pages/Security.tsx` | User-facing moderator and evidence-security explanation. |
| `frontend/package.json` | Frontend development/build scripts and React/Vite/TypeScript dependencies. |
| `frontend/vite.config.ts` | Vite configuration. |

## Main user and API flows

### Report submission and tracking

1. The frontend submits a category, description, and optional HTTP(S) reference URL to `POST /api/reports`.
2. The backend validates input, creates a cryptographically random `WD-…` case code, stores the report, and records the initial `SUBMITTED` update.
3. The frontend displays the case code once and prompts the reporter to save it. The application cannot recover a lost code.
4. `GET /api/reports/{case_code}` returns category, status, timestamps, and public updates. It intentionally excludes the narrative, reference URL, evidence, internal ID, and moderator-only information.

### Moderator work

Moderator routes require `Authorization: Bearer <token>`. The token is configured on the backend and entered in the moderator page; the frontend keeps it in page memory and does not persist it in browser storage. HTTP 401 means the supplied token was rejected. HTTP 503 with the configuration message means moderator authentication is unavailable on the server.

The allowed workflow is `SUBMITTED` → `UNDER_REVIEW` → `RESOLVED` or `DISMISSED` → `CLOSED`. A resolved or dismissed report can be permanently closed. Closed cases reject further updates and evidence uploads. The moderator list supports category, status, search, and creation-date filters; the API returns up to 200 newest matching reports.

### Evidence

Uploads accept PDF, PNG, JPG/JPEG, or UTF-8 TXT and default to a 5 MiB maximum. The backend checks the filename extension and declared MIME type, checks binary signatures where applicable, writes to temporary storage, and streams content to ClamAV. Malware, scanner failure, or scanner unavailability rejects the upload. Only a clean scan is moved under a generated name into persistent evidence storage. Evidence downloads require moderator authentication and are scoped to the report.

## API quick reference

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| `GET` | `/health` | Public | Application/database readiness. |
| `POST` | `/api/reports` | Public | Submit an anonymous report. |
| `GET` | `/api/reports/{case_code}` | Public | Read limited tracking information. |
| `POST` | `/api/reports/{case_code}/evidence` | Public, case-code scoped | Upload evidence for a report. |
| `GET` | `/api/moderator/reports` | Moderator | List/filter reports. |
| `GET` | `/api/moderator/reports/{report_id}` | Moderator | Read report detail. |
| `PATCH` | `/api/moderator/reports/{report_id}/status` | Moderator | Apply an allowed transition and publish an update. |
| `POST` | `/api/moderator/reports/{report_id}/updates` | Moderator | Add a public update without changing status. |
| `POST` | `/api/moderator/reports/{report_id}/close` | Moderator | Permanently close a resolved/dismissed report. |
| `GET` | `/api/moderator/reports/{report_id}/evidence/{evidence_id}` | Moderator | Download associated evidence. |

FastAPI's interactive API documentation is at `http://localhost:8000/docs` while the backend is running.

## Data and privacy model

There is no reporter/user table. A report stores category, narrative, optional reference URL, status, timestamps, updates, and evidence metadata. Evidence bytes live in the configured evidence directory. Public tracking uses the random case code rather than the integer database key and exposes only limited progress data.

Possession of a case code grants access to its limited tracking view, so it should be treated as private. WhistleDrop does not guarantee untraceability: networks and hosting infrastructure may retain connection information, and submitted text or files can contain identifying information.

## Themes and accessibility

The frontend has seven palettes: Black & white (default), Forest, Terracotta, Ocean, Plum, Rose, and Sand. The selected palette is stored in browser `localStorage` and applied through a shared document-level theme attribute, so it follows navigation across pages. The selector is a labeled native control. Layouts are responsive and honor reduced-motion preferences.

## Configuration and operations

| Setting | Use |
|---|---|
| `DATABASE_URL` | SQLAlchemy database URL; SQLite is the local default and Compose uses PostgreSQL. |
| `MODERATOR_TOKEN` | Required shared Bearer credential for moderator routes. |
| `EVIDENCE_DIRECTORY` | Private evidence-storage directory. |
| `MAX_UPLOAD_BYTES` | Upload size limit, default 5 MiB. |
| `CLAMAV_HOST`, `CLAMAV_PORT`, `CLAMAV_TIMEOUT_SECONDS` | Scanner endpoint and timeout. |
| `CORS_ORIGINS` | Comma-separated allowed browser origins. |
| `ENVIRONMENT` | Runtime environment label; production requires PostgreSQL with psycopg. |

The Compose stack runs PostgreSQL, ClamAV, and the backend; the frontend is started separately. Run it with `docker compose up --build` after configuring the root `.env` from `.env.example`. PostgreSQL is not published to the host, and ClamAV is bound to loopback. The root `pnpm dev` launcher is for local process-based development, usually with the backend's SQLite default.

The application currently creates SQL tables with SQLAlchemy `create_all`; it has no migration framework. Evidence storage is a local persistent volume rather than object storage. The project does not provide automated retention/deletion, encryption-at-rest policy, backups, or a production secrets manager. A shared moderator credential does not provide per-person identity or audit attribution. ClamAV reduces known-malware risk but cannot guarantee file safety. Production operation needs TLS, protected secrets, backups, a retention plan, scanner signature maintenance, and infrastructure-log policy.

## Verification commands

```sh
pnpm --dir frontend run build
```

```sh
cd backend
python -m pytest -q
```

The GitHub Actions workflow runs the backend pytest suite on pushes and pull requests. Docker Compose validation and the full container stack require Docker Desktop or Docker Engine to be installed and running.
