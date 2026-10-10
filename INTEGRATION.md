# TEFABIGN — Backend Integration Review (TASK-019)

Cross-module review before backend v1 freeze. Companion docs: `API.md`, `SECURITY.md`, `TESTING.md`, `DATABASE.md`.

## Checklist

| Area | Status | Notes |
| --- | --- | --- |
| API consistency | OK | Shared `ok`/`fail` envelopes; routes match `API.md` prefixes |
| Database integrity | Hardened | Claim partial unique indexes; transactional claim create |
| Workflow consistency | Hardened | Match regenerate no longer rewinds decisions; withdraw reverts report status; handover advances linked lost |
| Authorization | OK | `requireAuth` / `requireStaff` + ownership checks; disabled accounts → `403 ACCOUNT_DISABLED` |
| Error format | OK | Domain `AppError` → envelope; readiness uses `SERVICE_UNAVAILABLE` (documented) |
| Validation | OK | Zod on bodies/queries across modules |
| Performance basics | Hardened | Unbounded lists capped (`take: 100` / audit `500`); staff competitor notify no longer N+1 |
| Documentation | OK | `API.md` verification shape + codes aligned; README auth notes fixed |
| Test reliability | OK | Sequential vitest; unique emails; integration-review cases for review fixes |

## Fixes applied in this task

1. **Match regenerate** — does not reset `ACCEPTED_FOR_REVIEW` / `DISMISSED` / `CLOSED` to `SUGGESTED`
2. **Claim integrity** — DB partial unique indexes + transactional create + P2002 mapping
3. **Withdraw** — last active claim clears `CLAIM_PENDING` back to `ACTIVE` / `POSSIBLE_MATCH`
4. **Handover ready** — linked lost report moves `APPROVED` → `HANDOVER_PENDING`
5. **Auth** — disabled users with a valid JWT get `ACCOUNT_DISABLED` (not generic `401`)
6. **Docs** — verification response nesting, `SERVICE_UNAVAILABLE`, README staff-allowed withdraw/receipt

## Residual / accept for v1

- Full cursor pagination on all list endpoints (caps are enough for campus v1)
- Match sides not CHECK-constrained at DB (app enforces LOST/FOUND types)
- In-memory rate limits are per-process (`SECURITY.md`)
- Refresh-token rotate race under parallel clients (document; harden later if needed)
- `DRAFT` report status reserved but unused on create (reports start `ACTIVE`)
- Text search `contains` without trigram indexes (fine at campus scale)

## Freeze gate

**Closed by TASK-020.** See `BACKEND-V1.md`. Do not expand backend features until the human developer starts the frontend integration phase.
