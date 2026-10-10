# Changelog

## backend-1.0.0 — Backend v1 freeze (TASK-020)

Declared ready for frontend integration. Canonical contract: `API.md`. Freeze notes: `BACKEND-V1.md`.

### Included capability (TASK-001 … TASK-019)

- Auth (JWT access + hashed refresh), roles `USER` / `STAFF`
- User profile
- Lost and found reports with private evidence separation
- Search / filter (public-safe)
- Deterministic match suggestions (never auto-approve)
- Claims, verification, staff review, handover/return, case close
- In-app notifications and append-only case audit
- Security hardening (CORS, rate limit, headers, safe errors)
- Automated tests + integration review fixes

### Known limitations

Documented in `BACKEND-V1.md` §6 and `INTEGRATION.md`.
