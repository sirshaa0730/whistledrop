# Security

- Moderator routes require `Authorization: Bearer …`; configure a long random `MODERATOR_TOKEN` outside source control. The comparison uses constant-time byte comparison. This is a single shared credential, not per-moderator identity or audit attribution.
- Pydantic validates categories, narrative length, URLs, status enums, and moderator update lengths. Services enforce the allowed status transition graph.
- Case codes use `secrets.token_urlsafe(18)` and are distinct from internal integer IDs.
- Evidence accepts PDF, PNG, JPEG, and UTF-8 plain text with matching filename extension and declared MIME type. Uploads are capped at 5 MiB by default. PDF, PNG, and JPEG headers must match their specified magic bytes; TXT rejects NUL-containing or invalid UTF-8 content.
- Validated bytes are written to a private temporary file, streamed to the configured ClamAV daemon using INSTREAM, and moved to a generated permanent name only after a clean result. An infection returns `422`; missing configuration, connection errors, timeouts, and invalid scanner replies return `503`. Temporary files are removed on all failure paths, and no evidence row is committed unless scanning succeeds.
- Evidence downloads are only exposed through moderator-authenticated routes, with the evidence record scoped to its parent report and storage path resolved under the configured evidence directory.
- API errors use FastAPI's structured error responses; no exception details are returned by application handlers. Production deployments should disable debug mode and place the app behind TLS.
- Keep `.env` files and evidence volumes out of source control. Rotate the shared token if exposed. Avoid request/body logging and configure proxy access logs to minimize retained metadata.

Magic-byte checks reject common extension/content mismatches; they do not prove a file is structurally valid or safe. ClamAV detects known threats using its current signature database but cannot guarantee that a file is harmless. Keep ClamAV signature updates running and treat all downloaded evidence as untrusted. The daemon's TCP protocol has no authentication or encryption; keep it on a private container network, or bind local development access to loopback only.
