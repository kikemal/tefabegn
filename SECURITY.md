# TEFABIGN — Security Hardening (TASK-016)

Backend security review notes for ጠፋብኝ (Tefabign). Authorization is enforced server-side; no critical path trusts the frontend.

## Checklist

| Area             | Status   | Notes                                                                            |
| ---------------- | -------- | -------------------------------------------------------------------------------- |
| Authentication   | OK       | JWT access + hashed refresh tokens; disabled accounts rejected                   |
| Authorization    | OK       | `requireAuth` / `requireStaff`; object ownership checks on reports/claims        |
| Input validation | OK       | Zod on bodies/queries; JSON body limited to 100kb                                |
| Rate limiting    | OK       | In-memory per-IP on `/auth`, general API, and public feed (60/15m); off in test   |
| Public feed      | OK       | `GET /reports/public/recent-found` allowlists fields; no private/PII serialization |
| Error handling   | OK       | Safe `AppError` payloads; no stack traces to clients; JSON/payload errors mapped |
| Secret handling  | OK       | Env-only secrets; production rejects known insecure `JWT_SECRET` defaults        |
| CORS             | OK       | `CORS_ORIGINS` allow-list; required in production                                |
| File uploads     | N/A      | Not implemented in backend v1 (image refs are strings only)                      |
| Private evidence | OK       | Found private fields excluded from public/claim/notification/audit surfaces; claimant `message`/`evidence`/`proofRef` only for claimant or staff (finders get claim status/summary with those fields null) |
| ID enumeration   | Hardened | Cross-user profile reads return uniform `404 USER_NOT_FOUND`                     |
| Ownership checks | OK       | Report/claim/match services enforce owner or staff                               |
| Logging          | Hardened | Unhandled errors logged via redacting helper                                     |

## Production requirements

Set in environment (see `backend/.env.example`):

- Strong unique `JWT_SECRET` (not a documented default)
- Explicit `CORS_ORIGINS` (comma-separated)
- `RATE_LIMIT_ENABLED=true` (default)
- Never commit `.env` or real credentials

## Residual risks / later work

- In-memory rate limits are per-process (use a shared store behind multiple instances)
- Put TLS and additional WAF/rate controls at the reverse proxy in deployment
- File upload hardening applies only if binary uploads are added later
