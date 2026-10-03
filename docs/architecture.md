# Architecture

WhistleDrop is a single FastAPI application backed by PostgreSQL in deployment. Routes validate HTTP input and delegate persistence and lifecycle rules to focused services. SQLAlchemy models define reports, status updates, and evidence metadata.

## Request flow

1. A public request submits category, narrative, optional reference URL, and no identity fields.
2. The report service generates a cryptographically random case code and stores the report plus initial status update.
3. The tracking endpoint looks up only by case code and returns status history without the narrative or moderator-only fields.
4. Moderator routes require a configured Bearer token and call moderation services for transitions, updates, closure, and filters.
5. Evidence uploads are size/type checked and saved under generated names; only metadata is stored in SQL.

## Data relationships

One report has zero or more status updates and zero or more evidence records. No reporter/user table exists. The internal integer report key is used only for moderator routes; public tracking uses the case code.

## Boundaries

`routes/` handles HTTP and dependency wiring, `services/` owns business rules, `schemas/` validates/serializes API data, `db/` owns SQLAlchemy setup and models, and `core/` contains configuration and moderator credential checks.
