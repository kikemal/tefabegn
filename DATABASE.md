# TEFABIGN — Database Foundation

## Engine

- **PostgreSQL 16** (primary)
- **Prisma** for schema definition and migrations

Local Postgres is provided by `docker-compose.yml` at the repository root.

## Connection

Set `DATABASE_URL` in `backend/.env` (see `backend/.env.example`).

Example (local Docker defaults):

```text
postgresql://tefabign:tefabign@127.0.0.1:5433/tefabign?schema=public
```

## Commands

From `backend/`:

```bash
npm run db:generate   # generate Prisma Client
npm run db:migrate    # apply migrations (dev)
npm run db:migrate:deploy  # apply migrations (CI/prod-style)
npm run db:studio     # optional Prisma Studio
```

## Core entities

| Model | Purpose |
| --- | --- |
| `User` | Campus users and authorized staff |
| `RefreshToken` | Hashed refresh tokens for logout/revocation |
| `ItemReport` | Lost or found item reports |
| `Match` | Suggested lost↔found pairing (never auto-approval) |
| `Claim` | Ownership claim against a found item / match |
| `Notification` | In-app notification records |
| `CaseEvent` | Immutable audit / chain-of-custody history |

## Relationships (summary)

- `User` 1—* `ItemReport`, `Claim`, `Notification`, `CaseEvent`
- `ItemReport` (LOST) and `ItemReport` (FOUND) linked through `Match`
- `Claim` references a claimant `User`, optional `Match`, optional found `ItemReport`
- `CaseEvent` optionally references report, claim, and actor

## Audit / chain of custody (TASK-015)

- `CaseEvent` is append-only at the application layer (create via `src/audit/service.ts` only).
- Staff read APIs: `GET /staff/audit/reports/:reportId`, `GET /staff/audit/claims/:claimId`.
- Metadata is sanitized to exclude private evidence fields.

## Return confirmation fields (TASK-013)

- `ItemReport.returnedAt` — timestamp when staff recorded physical return
- `Claim.recipientConfirmedAt` — optional claimant receipt acknowledgement

## Privacy notes

- `ItemReport.privateDetails`, `Claim.evidence`, and private image refs must never appear in public search/list APIs.
- `Notification.metadata` and `CaseEvent.metadata` must stay free of private evidence and secrets.
- `CaseEvent` rows are append-only for normal application flows (no update/delete of history).

## Indexes

Indexes are defined in `backend/prisma/schema.prisma` for common access patterns:

- report type/status, category, location, event date, reporter
- match status/score
- claim claimant/status
- notification user/read/created
- case event report/claim/actor/eventType + createdAt

## Integrity notes (post TASK-019)

Partial unique indexes on `Claim`:

- one active (`SUBMITTED` / `NEEDS_MORE_INFO` / `UNDER_REVIEW`) claim per `(claimantId, foundReportId)`
- one `APPROVED` claim per `foundReportId`

List endpoints are capped (`take: 100` for most lists; audit history `take: 500`). Full cursor pagination remains a later enhancement if campus volume requires it.
