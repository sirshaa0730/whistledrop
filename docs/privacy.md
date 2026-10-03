# Privacy model

## Data collected

Reports contain a category, narrative, optional reference URL, timestamps, workflow status, status updates, and optional evidence metadata. Evidence bytes are stored separately on the configured filesystem volume. The application does not request or persist a reporter name, email, phone number, account, or IP address in its own report model.

## Case tracking

Each report receives a non-sequential code generated from cryptographically secure random bytes. Possession of that code grants read access to limited tracking data; treat it like a secret. It is returned once at submission and is not recoverable if lost.

## Moderator visibility

An authenticated moderator can see the narrative, reference, evidence metadata, status history, and case code. Public tracking sees category, status, timestamps, and updates, but not the narrative, evidence, or internal database key. Moderators are not shown any reporter identity because none is collected.

## Limits

This implementation does not claim that use is untraceable. Network infrastructure, reverse proxies, browsers, hosting providers, and uploaded documents may retain or contain identifying information. Operators should configure infrastructure logs and retention deliberately and tell reporters not to include identifying details unless needed.
