# Security

Review only what code evidence supports. Frame findings as defensive maintenance — pattern, production impact, remediation — without runnable misuse examples.

## Reporting

Never copy secret values into findings or plans. Reference `file:line` and credential type; fixes include rotation, not just removal.

## By-design

Platform conventions and documented ADRs are intentional unless implementation exceeds them. A stale ADR (code drifted from the decision doc) is itself a finding.

## Access control

Server-side identity checks, authorization at enforcement points (not client-only), object access by ID without ownership or tenant checks (IDOR), CSRF on state-changing routes.

## Input contracts

Request bodies without schema validation, file uploads without type/size/storage constraints, broad assignment from request data into persistence models (mass assignment).

## Injection and unsafe handling

SQL or shell operations assembled from untrusted input, HTML sinks fed by user-controlled content (XSS), dynamic execution APIs used with runtime input, filesystem paths derived from request data (path traversal), unsafe HTML or URLs, redirects, insecure randomness, untrusted deserialization, client-controlled identity, cross-origin messaging, and file uploads.

## Dependencies

Run the ecosystem audit command when dependency risk is in scope (`npm audit`, etc.); report only critical/high advisories affecting reachable runtime or build paths.

## Production configuration

Overly broad CORS with credentials, missing hardening headers on sensitive browser surfaces, cookies without appropriate `HttpOnly`/`Secure`/`SameSite`, debug verbosity in production config.

## Data minimization

PII or sensitive data in logs, stack traces or internal errors returned to clients, secret exposure in analytics or traces.

## Privacy and observability

Personal or sensitive data in logs, URLs, analytics, traces, and errors; duplicate or renamed telemetry; events sent before consent; excessive cardinality; and diagnostics that are absent or misleading on important failure paths.
