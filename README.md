# ጠፋብኝ — Tefabign

University Campus Lost & Found System.

## Current Phase

Backend-first development.

## Cursor Workflow

Cursor reads:

1. `ROLE.md` / `RULES.md`
2. `GITHUB_WORKFLOW.md`
3. `TASKS.md`

Then it implements only the task explicitly selected by the human developer.

The human developer is the sole GitHub owner and final commit/push authority.

## Start

Begin with `TASK-001` in `TASKS.md`.

## Documentation

- `TASKS.md` — ordered implementation tasks
- `RULES.md` — Cursor role, engineering and security rules
- `GITHUB_WORKFLOW.md` — Git/GitHub ownership and workflow
- `REQUIREMENTS.md` — product requirements and agreed additions
- `DATABASE.md` — database engine, schema entities, and migration commands

## Backend (local)

The API lives in `backend/`. Stack: Node.js, TypeScript, Express, PostgreSQL, Prisma.

### Prerequisites

- Node.js 20+
- npm 10+
- Docker (for local PostgreSQL)

### Setup

```bash
# start PostgreSQL (host port 5433 → container 5432)
docker compose up -d

cd backend
cp .env.example .env
npm install
npm run db:migrate
```

Default local DB URL uses `127.0.0.1:5433` so it does not clash with another Postgres on 5432.
See `DATABASE.md` for schema details.

### Run

```bash
# development (auto-reload)
npm run dev

# production-style
npm run build
npm start
```

Default URL: `http://localhost:3000`

- Health: `GET http://localhost:3000/health`
- Readiness (includes DB ping): `GET http://localhost:3000/health/ready`

### Auth (TASK-003)

Public registration always creates role `USER`. Staff role (`STAFF`) is not self-assignable.

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| POST | `/auth/register` | no | Register (email, password, fullName) |
| POST | `/auth/login` | no | Login |
| POST | `/auth/refresh` | refresh token body | Rotate tokens |
| POST | `/auth/logout` | refresh token body | Revoke refresh token |
| GET | `/auth/me` | Bearer access token | Current user |
| GET | `/auth/staff/ping` | Bearer + staff role | Staff authorization check |

Passwords are hashed with bcrypt. Access tokens are JWTs; refresh tokens are stored hashed and can be revoked.

### Users / profile (TASK-004)

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| GET | `/users/me` | Bearer | View own profile |
| PATCH | `/users/me` | Bearer | Update own `fullName` / `email` only |
| GET | `/users/:id` | Bearer | Own profile, or staff viewing another user |

Users cannot change their own `role` or `status`. Responses never include `passwordHash`.

### Lost reports (TASK-005)

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| POST | `/reports/lost` | Bearer | Create lost report |
| GET | `/reports/lost/mine` | Bearer | List own lost reports (includes private fields) |
| GET | `/reports/lost` | Bearer + staff | Staff review list (includes private fields) |
| GET | `/reports/lost/:id` | Bearer | Detail — private fields only for owner/staff |
| PATCH | `/reports/lost/:id` | Bearer (owner) | Update while DRAFT/ACTIVE |
| POST | `/reports/lost/:id/cancel` | Bearer (owner) | Cancel report |
| POST | `/reports/lost/:id/close` | Bearer (owner) | Close report |

`privateDetails` and `identifier` are never returned to non-owner, non-staff viewers.

### Found reports (TASK-006)

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| POST | `/reports/found` | Bearer | Create found report |
| GET | `/reports/found/mine` | Bearer | List own found reports (includes private fields) |
| GET | `/reports/found` | Bearer + staff | Staff review list (includes private fields) |
| GET | `/reports/found/:id` | Bearer | Public-safe detail; private fields only for finder/staff |
| PATCH | `/reports/found/:id` | Bearer (finder) | Update while DRAFT/ACTIVE |
| POST | `/reports/found/:id/cancel` | Bearer (finder) | Cancel report |
| POST | `/reports/found/:id/close` | Bearer (finder) | Close report |

Public found responses expose only public-safe fields (`publicDescription`, title, category, location, etc.).  
`description`, `privateDetails`, `identifier`, and `imageRef` are private verification fields.

### Search (TASK-007)

`GET /reports/search` (Bearer auth)

Query params: `category`, `location`, `type`, `status`, `dateFrom`, `dateTo`, `q`, `page`, `pageSize`

- Default status filter: `ACTIVE` (override with `status`)
- Ordering: `createdAt desc`, then `id desc`
- Results are public-safe only (no private verification fields)
- Text search (`q`) uses public-safe fields only

### Matching (TASK-008)

Matching only produces **suggestions**. It never auto-approves claims or ownership.

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| POST | `/matches/generate` | Bearer (owner/staff) | Generate ranked lost↔found suggestions |
| GET | `/matches` | Bearer | List visible matches |
| GET | `/matches/:id` | Bearer | Match detail |

Signals (weighted): category, location, date proximity, title, description, optional identifier.  
Responses include `suggestionOnly: true` and safe match reasons (no private evidence values).

### Claims (TASK-009)

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| POST | `/claims` | Bearer | Claim a found item and/or match |
| GET | `/claims/mine` | Bearer | List own claims |
| GET | `/claims/:id` | Bearer | Claim detail (authorized parties) |
| POST | `/claims/:id/withdraw` | Bearer (claimant) | Withdraw SUBMITTED/NEEDS_MORE_INFO claim |

Claimants never receive found-item private verification fields (`privateDetails`, `identifier`, private `imageRef`, internal `description`).  
Duplicate active claims by the same user are rejected; competing claims are reported via `conflictingActiveClaims`.

### Ownership verification (TASK-010)

Staff-only. Verification **never auto-approves** a claim.

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| GET | `/verification/claims` | Bearer + staff | List claims awaiting verification |
| GET | `/verification/claims/:claimId` | Bearer + staff | Verification package (public + private evidence separated) |
| POST | `/verification/claims/:claimId/attempts` | Bearer + staff | Record assessment (`CONSISTENT` / `INCONSISTENT` / `UNCLEAR`) |

Recording an attempt moves the claim to `UNDER_REVIEW` or `NEEDS_MORE_INFO` and writes a `VERIFICATION_RECORDED` audit event. Final approve/reject remains a later staff decision task.

### Checks

```bash
npm test
npm run lint
npm run typecheck
npm run format:check
```

Never commit `.env`, secrets, credentials, or private ownership evidence.
