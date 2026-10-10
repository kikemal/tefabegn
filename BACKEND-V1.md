# TEFABIGN — Backend v1 Freeze (TASK-020)

**Status:** Frozen for frontend integration  
**API contract:** [`API.md`](./API.md)  
**Version tag:** backend `1.0.0` (`backend/package.json`)

This document declares the backend ready for UI work. **Do not expand backend features** until the human developer supplies UI/design and explicitly starts the integration phase.

---

## 1. Stable API contract

| Item | Location |
| --- | --- |
| Canonical HTTP contract | `API.md` |
| Quick endpoint index | `README.md` |
| Error / auth / privacy conventions | `API.md` §1 |
| Security expectations | `SECURITY.md` |
| Integration review residuals | `INTEGRATION.md` |

Breaking changes to paths, envelopes, status codes, or privacy rules require an explicit human decision and a new version note in `CHANGELOG.md`.

---

## 2. Migration instructions

Prerequisites: Docker (PostgreSQL), Node.js 20+, npm 10+.

```bash
# from repo root
docker compose up -d

cd backend
cp .env.example .env   # if needed; never commit .env
npm install
npm run db:migrate:deploy   # apply all Prisma migrations (CI/prod-style)
# or during local iteration:
# npm run db:migrate
```

Migrations live under `backend/prisma/migrations/`. Schema source of truth: `backend/prisma/schema.prisma`. Details: `DATABASE.md`.

Verify DB:

```bash
curl http://localhost:3000/health/ready
```

---

## 3. Environment documentation

Copy `backend/.env.example` → `backend/.env`.

| Variable | Required | Notes |
| --- | --- | --- |
| `DATABASE_URL` | yes | Local default uses host port **5433** |
| `JWT_SECRET` | yes | Long random secret; production rejects known insecure defaults |
| `JWT_ACCESS_EXPIRES_IN` | no | Default `8h` |
| `REFRESH_TOKEN_DAYS` | no | Default `30` |
| `PORT` | no | Default `3000` |
| `NODE_ENV` | no | `development` / `test` / `production` |
| `CORS_ORIGINS` | **yes in production** | Comma-separated browser origins (e.g. Vite `http://localhost:5173`) |
| `RATE_LIMIT_ENABLED` | no | Default `true`; tests set `false` |

Never commit real secrets, production URLs with credentials, or private ownership evidence.

---

## 4. Test instructions

```bash
cd backend
npm test
npm run lint
npm run typecheck
npm run format:check
```

Coverage map and lifecycle notes: [`TESTING.md`](./TESTING.md).

Vitest runs files sequentially for Prisma stability on Windows. PostgreSQL must be up (`docker compose up -d`).

---

## 5. Seed / demo data strategy

**No committed seed with fake campus PII or fabricated case history.**

For local / frontend demos:

1. **Register users** via `POST /auth/register` (always role `USER`).
2. **Promote staff** out-of-band (Prisma Studio, SQL, or one-off script)—staff cannot self-elevate:

```sql
UPDATE "User"
SET role = 'STAFF'
WHERE email = 'your-staff@campus.test';
```

3. **Walk the lifecycle** with API calls (or the existing automated path in `backend/tests/lifecycle.test.ts`):  
   lost + found reports → match generate → claim → verification → staff decision → handover → return → close.
4. Optional later: a human-approved `prisma/seed` that only creates empty staff/user accounts from env vars—**not** invented case data.

---

## 6. Known limitations (accepted for v1)

- List endpoints use hard caps (`take: 100`; audit `500`), not full cursor pagination
- Matching is deterministic suggestion-only; no AI / image recognition
- No binary file upload; image fields are string refs only
- In-memory rate limits are per process
- `DRAFT` report status exists in the state machine but creates start as `ACTIVE`
- Text search uses `contains` without trigram indexes
- Notifications are in-app only (no email/SMS)
- Frontend, mobile, maps, payments, and production infra are out of scope

See also residual notes in `INTEGRATION.md` and `SECURITY.md`.

---

## 7. Frontend integration notes

### Auth

- Store access token; send `Authorization: Bearer <accessToken>`
- Persist refresh token securely; rotate via `POST /auth/refresh`; revoke via `POST /auth/logout`
- Registration always yields `USER`; staff UI must use a pre-promoted account
- Treat `403 ACCOUNT_DISABLED` and `401 UNAUTHORIZED` distinctly

### Envelopes

- Success: `{ success: true, data }`
- Error: `{ success: false, error: { code, message } }` — drive UI from `error.code`

### Privacy (non-negotiable)

Never expect or display for unauthorized viewers:

- Found private: `description`, `privateDetails`, `identifier`, `imageRef`
- Claimant evidence beyond authorized views
- `passwordHash`
- Private fields inside search, notifications, or audit metadata

Public found surfaces use `publicDescription` and other public-safe fields only.

### Workflow UX

Suggested screens map 1:1 to API modules:

| UI area | Primary APIs |
| --- | --- |
| Auth / session | `/auth/*` |
| Profile | `/users/me` |
| Report lost/found | `/reports/lost`, `/reports/found` |
| Search | `/reports/search` |
| Match suggestions | `/matches`, `/matches/generate` |
| Claims | `/claims` |
| Staff verification | `/verification/*` |
| Staff decisions / handover | `/staff/*` |
| Notifications | `/notifications` |
| Audit timeline | `/staff/audit/*` |

Show human-readable `statusLabel` in UI; keep machine `status` for logic. Invalid transitions return `409 INVALID_STATUS` — surface as workflow guidance, not a crash.

### CORS / local frontend

Default example origin: `http://localhost:5173` in `.env.example`. Align Vite (or other) origin with `CORS_ORIGINS`.

### Health

- Liveness: `GET /health`
- Readiness (DB): `GET /health/ready` → `503 SERVICE_UNAVAILABLE` if DB down

---

## 8. Run (production-style)

```bash
cd backend
npm run build
npm start
```

Default: `http://localhost:3000`

---

## Freeze rule

After TASK-020, Cursor and contributors must **stop backend feature expansion** until the human developer provides UI/design and explicitly opens the frontend integration phase. Bugfixes that preserve the v1 contract may still be authorized by the human developer.
