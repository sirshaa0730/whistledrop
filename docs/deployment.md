# Deployment

## Configuration

Local development defaults to SQLite (`sqlite:///./whistledrop.db`). Docker Compose sets `DATABASE_URL` to PostgreSQL via psycopg. Configure `MODERATOR_TOKEN` with a unique long random secret, `EVIDENCE_DIRECTORY` to a private persistent volume, `MAX_UPLOAD_BYTES` to the upload limit, exact `CORS_ORIGINS`, and `CLAMAV_HOST`, `CLAMAV_PORT`, and `CLAMAV_TIMEOUT_SECONDS` for the scanner.

## Local containers

Copy the root `.env.example` to `.env` and replace the PostgreSQL password and moderator-token placeholders. Keep `POSTGRES_PASSWORD` and the password in `DATABASE_URL` in sync; URL-encode reserved characters. Run `docker compose up --build`. Compose starts PostgreSQL, ClamAV, and the API; PostgreSQL is not published to the host. PostgreSQL data, ClamAV signature data, and evidence use persistent volumes. Backend startup waits for healthy PostgreSQL and ClamAV services; the backend `/health` endpoint checks database readiness. The official ClamAV image provides its daemon health check and waits for database startup. The API listens on port 8000; the frontend runs separately with `npm install && npm run dev` from `frontend/`.

For direct SQLite development, copy `backend/.env.example` to `backend/.env` and edit it. The backend loads that file when present. Evidence uploads fail with `503` unless `CLAMAV_HOST` points to a reachable daemon; to use the Compose scanner from a host-run backend, Compose binds port 3310 to loopback only and set `CLAMAV_HOST=127.0.0.1`. Do not expose ClamAV TCP outside a trusted private network.

## Backend and frontend

Build the backend from the project root using `docker build -f backend/Dockerfile backend`. Provide environment variables and persistent storage for the configured evidence path. Build the frontend using `npm install && npm run build`; set `VITE_API_URL` to the deployed API origin at build time. Configure TLS, exact CORS origins, and a persistent PostgreSQL service.

## Evidence storage limits

Evidence is size-limited to 5 MiB, restricted by extension and declared MIME type, checked for PDF/PNG/JPEG magic bytes (TXT must be UTF-8 without NUL bytes), and scanned before permanent storage. Malware or invalid scanner responses fail closed; infected content returns `422`, scanner outages return `503`, and temporary data is removed. ClamAV reduces the risk of known malware but is not a guarantee of safety. This project does not include object storage integration, encryption-at-rest controls, retention/deletion jobs, or database migrations. Provide TLS, backups, monitoring, resource capacity for ClamAV (the signature database has significant memory requirements), and migration tooling before production use.

The PostgreSQL/ClamAV Compose configuration was not runtime-tested in environments without Docker. Validate image updates and resource requirements before deploying.
