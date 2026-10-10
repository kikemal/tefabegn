# TEFABIGN — Backend API (TASK-017)

Canonical HTTP API contract for ጠፋብኝ (Tefabign) backend v1.

**Freeze:** Backend v1 is frozen (TASK-020). See `BACKEND-V1.md`. Treat this document as the stable contract for frontend work.

**Base URL (local):** `http://localhost:3000`  
**Format:** JSON request/response  
**Auth:** `Authorization: Bearer <accessToken>` unless noted

This document is the source of truth for frontend integration. Endpoint summaries in `README.md` point here.

---

## 1. Conventions

### 1.1 Success envelope

```json
{
  "success": true,
  "data": {}
}
```

### 1.2 Error envelope

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human-readable message"
  }
}
```

Common codes:

| Code | HTTP | Meaning |
| --- | --- | --- |
| `VALIDATION_ERROR` | 400 | Invalid/query failed Zod validation or invalid JSON |
| `UNAUTHORIZED` | 401 | Missing/invalid access token |
| `FORBIDDEN` | 403 | Authenticated but not allowed |
| `NOT_FOUND` | 404 | Route or resource not found |
| `USER_NOT_FOUND` | 404 | User missing or unauthorized cross-user profile read |
| `REPORT_NOT_FOUND` | 404 | Lost/found report not found |
| `CLAIM_NOT_FOUND` | 404 | Claim not found |
| `MATCH_NOT_FOUND` | 404 | Match not found |
| `NOTIFICATION_NOT_FOUND` | 404 | Notification not found / not owned |
| `EMAIL_IN_USE` | 409 | Registration/email update conflict |
| `DUPLICATE_CLAIM` | 409 | Active claim already exists for claimant+found item |
| `INVALID_STATUS` | 409 | Illegal workflow transition |
| `INVALID_CREDENTIALS` | 401 | Login failed (generic) |
| `ACCOUNT_DISABLED` | 403 | Account disabled |
| `INVALID_REFRESH_TOKEN` | 401 | Refresh token invalid/expired/revoked |
| `RATE_LIMITED` | 429 | Too many requests |
| `PAYLOAD_TOO_LARGE` | 413 | Body exceeds 100kb |
| `SERVICE_UNAVAILABLE` | 503 | Readiness check failed (DB unreachable) |
| `INTERNAL_SERVER_ERROR` | 500 | Unexpected server error |

### 1.3 Roles

| Role | Notes |
| --- | --- |
| `USER` | Default on registration; cannot self-elevate |
| `STAFF` | Assigned out-of-band (DB/admin); required for `/staff/*` and `/verification/*` |

### 1.4 Auth tokens

- **Access token:** JWT in `Authorization: Bearer …`
- **Refresh token:** opaque string in JSON body; stored hashed server-side; rotatable/revocable
- Registration always creates `role: USER`

### 1.5 Privacy rules (API-wide)

Never expose to unauthorized clients:

- `passwordHash`
- Found private verification: `description`, `privateDetails`, `identifier`, `imageRef`
- Claimant evidence beyond what the authorized viewer should see
- Private fields in search results, notifications, or audit metadata

Reports/claims/matches include machine `status` plus human-readable `statusLabel` where mapped.

### 1.6 Categories

`electronics` | `bags` | `documents` | `clothing` | `keys` | `cards` | `jewelry` | `other`

### 1.7 Report statuses

`DRAFT` → `ACTIVE` → `POSSIBLE_MATCH` → `CLAIM_PENDING` → `UNDER_REVIEW` → `APPROVED` → `HANDOVER_PENDING` → `RETURNED` → `CLOSED`  
Also: `REJECTED`, `CANCELLED`

### 1.8 Claim statuses

`SUBMITTED` | `NEEDS_MORE_INFO` | `UNDER_REVIEW` | `APPROVED` | `REJECTED` | `WITHDRAWN` | `CLOSED`

### 1.9 Match statuses

`SUGGESTED` | `DISMISSED` | `ACCEPTED_FOR_REVIEW` | `CLOSED`

---

## 2. Health

### `GET /health`

Public liveness.

**Response `data`:** service health payload.

### `GET /health/ready`

Public readiness including DB ping.

### `GET /`

Public service metadata (`name`, `description`, `health`).

---

## 3. Authentication

### `POST /auth/register`

**Auth:** none

**Body:**

```json
{
  "email": "student@campus.edu",
  "password": "at-least-8-chars",
  "fullName": "Ada Student"
}
```

**Response `201` `data`:** `{ user, tokens }`

`tokens`:

```json
{
  "accessToken": "...",
  "refreshToken": "...",
  "tokenType": "Bearer",
  "expiresIn": "8h"
}
```

`user` (public): `id`, `email`, `fullName`, `role`, `status`, `createdAt`, `updatedAt`

### `POST /auth/login`

**Body:** `{ "email", "password" }`  
**Response `200` `data`:** `{ user, tokens }`  
Failures use generic `INVALID_CREDENTIALS`.

### `POST /auth/refresh`

**Body:** `{ "refreshToken" }`  
**Response `200` `data`:** `{ tokens }` (previous refresh token revoked)

### `POST /auth/logout`

**Body:** `{ "refreshToken" }`  
**Response `200` `data`:** `{ "loggedOut": true }`

### `GET /auth/me`

**Auth:** Bearer  
**Response `200` `data`:** `{ user }`

### `GET /auth/staff/ping`

**Auth:** Bearer + staff  
**Response `200` `data`:** `{ "staff": true, "message": "..." }`

---

## 4. Users / profile

### `GET /users/me`

**Auth:** Bearer  
**Response `200` `data`:** `{ user }`

### `PATCH /users/me`

**Auth:** Bearer  

**Body** (at least one field):

```json
{
  "fullName": "New Name",
  "email": "new@campus.edu"
}
```

Users cannot change `role` or `status` via API.

### `GET /users/:id`

**Auth:** Bearer  

- Self: allowed  
- Staff: may view another user’s public profile  
- Other users: `404 USER_NOT_FOUND` (enumeration-hardened)

---

## 5. Lost reports

### `POST /reports/lost`

**Auth:** Bearer  

**Body:**

```json
{
  "category": "electronics",
  "title": "Black Dell laptop",
  "description": "15-inch laptop with sticker",
  "location": "Main Library",
  "lostAt": "2026-10-08T10:00:00.000Z",
  "identifier": "optional-serial",
  "privateDetails": "optional private ownership evidence",
  "imageRef": "optional-storage-key"
}
```

**Response `201` `data`:** `{ report }` (owner view, includes private fields)

### `GET /reports/lost/mine`

**Auth:** Bearer  
**Response `200` `data`:** `{ reports: PrivateLostReport[] }`

### `GET /reports/lost`

**Auth:** Bearer + staff  
**Response `200` `data`:** `{ reports }` (includes private fields)

### `GET /reports/lost/:id`

**Auth:** Bearer  
Owner/staff → private view; others → public view (no `privateDetails` / `identifier`).

### `PATCH /reports/lost/:id`

**Auth:** Bearer (owner)  
Editable while `DRAFT` / `ACTIVE`. At least one field required.

### `POST /reports/lost/:id/cancel`

**Auth:** Bearer (owner) → `CANCELLED` when allowed by workflow

### `POST /reports/lost/:id/close`

**Auth:** Bearer (owner) → `CLOSED` when allowed by workflow

**PrivateLostReport fields:** `id`, `type:"LOST"`, `status`, `statusLabel`, `category`, `title`, `description`, `location`, `lostAt`, `shareRef`, `imageRef`, `returnedAt`, `reporterId`, `createdAt`, `updatedAt`, `identifier`, `privateDetails`

**PublicLostReport:** same without `identifier` / `privateDetails`

---

## 6. Found reports

### `POST /reports/found`

**Auth:** Bearer  

**Body:**

```json
{
  "category": "bags",
  "title": "Blue backpack",
  "description": "Internal verification description",
  "publicDescription": "Blue backpack near cafeteria",
  "location": "Cafeteria",
  "foundAt": "2026-10-08T12:00:00.000Z",
  "identifier": "optional",
  "privateDetails": "hidden marking",
  "imageRef": "optional-private-image-key"
}
```

**Response `201` `data`:** `{ report }` (finder/staff private view)

### `GET /reports/found/mine`

**Auth:** Bearer → own reports (private view)

### `GET /reports/found`

**Auth:** Bearer + staff → all found reports (private view)

### `GET /reports/found/:id`

**Auth:** Bearer  
Finder/staff → private; others → public-safe only.

### `PATCH /reports/found/:id`

**Auth:** Bearer (finder) while `DRAFT` / `ACTIVE`

### `POST /reports/found/:id/cancel` / `POST /reports/found/:id/close`

**Auth:** Bearer (finder) — workflow-gated

**PublicFoundReport:** `id`, `type:"FOUND"`, `status`, `statusLabel`, `category`, `title`, `publicDescription`, `location`, `foundAt`, `shareRef`, `returnedAt`, `reporterId`, `createdAt`, `updatedAt`

**PrivateFoundReport:** public fields + `description`, `identifier`, `privateDetails`, `imageRef`

---

## 7. Public recent found (welcome)

### `GET /reports/public/recent-found`

**Auth:** none (anonymous read-only)  
**Rate limit:** dedicated public-feed limiter (60 requests / 15 minutes / IP) in addition to the general API limiter.

**Query:**

| Param | Type | Notes |
| --- | --- | --- |
| `limit` | int 1–20 | default **8** |

**Eligibility:** `type=FOUND` and `status` in `ACTIVE` \| `POSSIBLE_MATCH` only.

**Ordering:** `foundAt` (`eventOccurredAt`) desc, then `createdAt` desc, then `id` desc.

**Response `200` `data`:** `{ reports: PublicRecentFoundReport[] }`

Allowlisted fields only:

`id`, `type` (`"FOUND"`), `status`, `statusLabel`, `category`, `title`, `publicDescription`, `location`, `foundAt`, `shareRef`, `createdAt`

Never includes `privateDetails`, `identifier`, `description`, `imageRef`, `reporterId`, `returnedAt`, `updatedAt`, evidence, or contact data.

---

## 8. Search

### `GET /reports/search`

**Auth:** Bearer  

**Query:**

| Param | Type | Notes |
| --- | --- | --- |
| `category` | enum | see categories |
| `location` | string | |
| `type` | `LOST` \| `FOUND` | |
| `status` | ReportStatus | default `ACTIVE` |
| `dateFrom` / `dateTo` | ISO datetime | `dateFrom` ≤ `dateTo` |
| `q` | string | public-safe text search |
| `page` | int ≥ 1 | default 1 |
| `pageSize` | 1–100 | default 20 |

**Response `200` `data`:** paginated public-safe reports + pagination metadata  
Ordering: `createdAt desc`, `id desc`  
No private verification fields.

---

## 9. Matches

Matching produces **suggestions only** (`suggestionOnly: true`). Never auto-approves ownership.

### `POST /matches/generate`

**Auth:** Bearer (report owner or staff)

**Body:**

```json
{
  "lostReportId": "optional",
  "foundReportId": "optional",
  "limit": 20
}
```

Provide at least one of `lostReportId` / `foundReportId`.

**Response `200` `data`:** `{ suggestionOnly: true, threshold, matches[] }`

### `GET /matches`

**Auth:** Bearer  
Query: optional `lostReportId`, `foundReportId`  
Non-staff only see matches involving their reports.

### `GET /matches/:id`

**Auth:** Bearer (participant or staff)

Match object includes `score`, `status`, `statusLabel`, `reasons`, nested safe report views for the viewer.

---

## 10. Claims

### `POST /claims`

**Auth:** Bearer  

**Body:**

```json
{
  "foundReportId": "optional",
  "matchId": "optional",
  "message": "I lost this item…",
  "evidence": "Ownership evidence answers",
  "proofRef": "optional-ref"
}
```

Require `foundReportId` and/or `matchId`.

**Response `201` `data`:** `{ claim, conflictingActiveClaims }`

Claim responses embed **public** found report only (never found private evidence).

### `GET /claims/mine`

**Auth:** Bearer → own claims

### `GET /claims/:id`

**Auth:** Bearer  
Allowed: claimant, found reporter, related lost reporter (via match), or staff.

### `POST /claims/:id/withdraw`

**Auth:** Bearer (claimant or staff)  
Allowed from `SUBMITTED` / `NEEDS_MORE_INFO`.

### `POST /claims/:id/confirm-receipt`

**Auth:** Bearer (approved claimant; staff also allowed)  

**Body:** `{ "notes": "optional" }`  

Optional recipient acknowledgement. Does **not** set report to `RETURNED`.  
**Response `200` `data`:** `{ claim, alreadyConfirmed }`

---

## 11. Ownership verification (staff)

Verification **never** auto-approves.

### `GET /verification/claims`

**Auth:** Bearer + staff  
Lists claims in verifiable statuses with public found summary only.

### `GET /verification/claims/:claimId`

**Auth:** Bearer + staff

**Response `200` `data`:**

```json
{
  "verification": {
    "publicFound": {},
    "privateFoundEvidence": {
      "description": "...",
      "privateDetails": "...",
      "identifier": "...",
      "imageRef": "..."
    },
    "claimantEvidence": {
      "message": "...",
      "evidence": "...",
      "proofRef": "..."
    },
    "autoApproval": false
  }
}
```

### `POST /verification/claims/:claimId/attempts`

**Auth:** Bearer + staff  

**Body:**

```json
{
  "assessment": "CONSISTENT",
  "notes": "Staff notes",
  "requestMoreInfo": false
}
```

`assessment`: `CONSISTENT` | `INCONSISTENT` | `UNCLEAR`  
Moves claim to `UNDER_REVIEW` or `NEEDS_MORE_INFO`. Writes `VERIFICATION_RECORDED`.

---

## 12. Staff review

All routes: **Bearer + staff**.

### Lists / detail

| Method | Path | Response focus |
| --- | --- | --- |
| GET | `/staff/reports` | Lost/found reports (private views) |
| GET | `/staff/matches` | Match suggestions |
| GET | `/staff/claims` | Claims |
| GET | `/staff/claims/:claimId` | `{ claim, verification }` |

### `POST /staff/claims/:claimId/decision`

**Body:**

```json
{
  "decision": "APPROVE",
  "notes": "Required notes"
}
```

`decision`: `APPROVE` | `REJECT` | `REQUEST_MORE_INFO`  

On approve: claim + found report → `APPROVED`; competing active claims rejected; linked lost/match updated when present.  
Audit: `CLAIM_APPROVED` / `CLAIM_REJECTED` / `CLAIM_MORE_INFO_REQUESTED`.

### `POST /staff/reports/found/:foundReportId/ready-for-handover`

**Body:** `{ "notes": "optional" }`  
Requires approved found item + approved claim → `HANDOVER_PENDING`.  
Audit: `HANDOVER_READY`.

---

## 13. Handover and return

### `POST /staff/reports/found/:foundReportId/confirm-return`

**Auth:** Bearer + staff  

**Body:**

```json
{
  "notes": "optional",
  "returnedAt": "2026-10-09T15:30:00.000Z"
}
```

Requires `HANDOVER_PENDING` → `RETURNED` (+ `returnedAt`).  
Audit: `HANDOVER_COMPLETED`.

### `POST /staff/reports/found/:foundReportId/close-case`

**Auth:** Bearer + staff  

**Body:** `{ "notes": "optional" }`  

Requires `RETURNED` → closes found (and linked lost/claim/match when applicable).  
Audit: `CASE_CLOSED`.

Ordinary users cannot mark return/close via staff routes.

---

## 14. Notifications

### `GET /notifications`

**Auth:** Bearer  

**Query:** `unreadOnly=true|false`, `limit` (1–100, default 50)

**Response `200` `data`:** `{ notifications: [{ id, type, title, body, readAt, metadata, createdAt }] }`

Types: `POSSIBLE_MATCH`, `CLAIM_SUBMITTED`, `MORE_INFO_REQUESTED`, `CLAIM_APPROVED`, `CLAIM_REJECTED`, `HANDOVER_READY`, `ITEM_RETURNED`, `CASE_CLOSED`

### `GET /notifications/unread-count`

**Response `200` `data`:** `{ unreadCount }`

### `POST /notifications/:id/read`

Marks own notification read.

### `POST /notifications/read-all`

Marks all own notifications read → `{ updated }`

---

## 15. Audit history (staff)

Append-only. No update/delete endpoints.

### `GET /staff/audit/reports/:reportId`

**Auth:** Bearer + staff  

**Response `200` `data`:**

```json
{
  "reportId": "...",
  "events": [
    {
      "id": "...",
      "eventType": "FOUND_REPORTED",
      "eventLabel": "Found item reported",
      "reportId": "...",
      "claimId": null,
      "actor": { "id": "...", "fullName": "...", "role": "USER" },
      "metadata": {},
      "createdAt": "..."
    }
  ]
}
```

Events are chronological (`createdAt` asc). Metadata is sanitized.

### `GET /staff/audit/claims/:claimId`

**Auth:** Bearer + staff  
Claim events plus linked found-report events (deduplicated).

---

## 16. Frontend integration notes

1. Store access + refresh tokens securely; send Bearer access token on protected calls.
2. On `401`, try `/auth/refresh` then retry once; on failure, force re-login.
3. Treat `status` as machine enum; display `statusLabel` to users.
4. Never rely on the client to hide private fields — server enforces visibility.
5. Staff UI must use `/staff/*` and `/verification/*`; ordinary users receive `403`.
6. Matching UI must show suggestions as non-final (`suggestionOnly: true`).
7. Configure production `CORS_ORIGINS` to the real frontend origin(s).
8. Image uploads are not implemented; use `imageRef` string keys only for now.

---

## 17. Related docs

- `README.md` — local run + module index
- `DATABASE.md` — schema / migrations
- `SECURITY.md` — hardening checklist
- `TASKS.md` — implementation task status
