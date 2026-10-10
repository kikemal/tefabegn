# TEFABIGN — Automated Tests (TASK-018)

Backend test strategy for ጠፋብኝ. Priority: **business rules and security** over line-coverage vanity.

## How to run

Prerequisites: PostgreSQL via `docker compose up -d`, `backend/.env` configured.

```bash
cd backend
npm test                 # full suite (vitest run)
npm run test:watch       # watch mode
npm run lint
npm run typecheck
npm run format:check
```

Notes:

- Tests use `NODE_ENV=test` and defaults from `backend/tests/setup.ts`
- Vitest runs files **sequentially** (`fileParallelism: false`) for Prisma stability on Windows
- Rate limiting is disabled in test (`RATE_LIMIT_ENABLED=false`) unless a test forces it

## Requirement coverage matrix

| TASK-018 must-test area | Primary test files |
| --- | --- |
| Authentication | `auth.test.ts`, `security.test.ts` |
| Authorization | `auth.test.ts`, `security.test.ts`, `staff-review.test.ts`, `users.test.ts` |
| Report creation | `lost-reports.test.ts`, `found-reports.test.ts` |
| Private evidence protection | `found-reports.test.ts`, `claims.test.ts`, `search.test.ts`, `notifications.test.ts`, `lifecycle.test.ts` |
| Search | `search.test.ts` |
| Matching | `matching.test.ts`, `matching-scoring.test.ts` |
| Claims | `claims.test.ts` |
| Staff approval/rejection | `staff-review.test.ts` |
| Invalid state transitions | `workflow.test.ts`, `workflow-api.test.ts`, `lifecycle.test.ts` |
| Return confirmation | `handover.test.ts`, `lifecycle.test.ts` |
| Notifications | `notifications.test.ts`, `lifecycle.test.ts` |
| Audit events | `audit.test.ts`, `lifecycle.test.ts`, staff/verification tests |
| Integration review (TASK-019) | `integration-review.test.ts`, `lifecycle.test.ts` |

## Suite layout

| File | Focus |
| --- | --- |
| `lifecycle.test.ts` | Full happy-path integration across the case workflow |
| `helpers.ts` | Shared register/staff helpers for new tests |
| `auth.test.ts` / `users.test.ts` | Authn/authz + profile privacy |
| `lost-reports.test.ts` / `found-reports.test.ts` | Report CRUD + private fields |
| `search.test.ts` | Filters, pagination, public-safe results |
| `matching*.test.ts` | Suggestion-only matching + scoring |
| `claims.test.ts` | Claims without evidence leakage |
| `verification.test.ts` | Staff verification, no auto-approve |
| `staff-review.test.ts` | Approve/reject/more-info/handover-ready |
| `handover.test.ts` | Return + close, staff-only return |
| `workflow*.test.ts` | State machine unit + API invalid transitions |
| `notifications.test.ts` | Read/unread + private-safe text |
| `audit.test.ts` | Chain-of-custody history, append-only |
| `security.test.ts` | Headers, auth abuse resistance, rate limit unit |
| `health.test.ts` / `database.test.ts` / `env.test.ts` | Foundation |

## Writing new tests

1. Prefer API-level tests with `supertest` for business rules.
2. Assert **negative** cases: forbidden roles, invalid transitions, privacy leaks.
3. Use unique email/markers (`helpers.ts`) to avoid cross-test pollution.
4. Never assert on or log real secrets; use synthetic markers like `PRIVATE-EVIDENCE`.
5. Keep unit tests for pure logic (scoring, workflow transitions, sanitization).

## Gaps accepted for v1

- No separate load/performance suite
- No multi-instance rate-limit store tests
- Frontend/E2E UI tests are out of scope (backend phase)
