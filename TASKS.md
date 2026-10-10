# TEFABIGN — Backend Build Tasks

> **Project:** ጠፋብኝ (Tefabign) — University Campus Lost & Found System
>
> **Development phase:** Backend first
>
> **Task execution rule:** Cursor must work on ONE task at a time. The human developer reviews and approves the result before the next task starts.

---

## 0. Source of Truth

### Academic source

The supplied project document, `SAD Project - Group 6.pdf`, is the original requirements/design source.

The original project describes a university lost-and-found system with:

- students/staff reporting lost and found items;
- searching/viewing reports;
- possible lost/found matching;
- ownership verification;
- authorized staff review and approval/rejection;
- notifications;
- case/status tracking;
- return confirmation and case closure.

### Product decisions added for the implementation

These are improvements agreed for the real implementation and are NOT to be falsely presented as requirements from the academic PDF:

- simple student-first reporting;
- private ownership evidence;
- private/controlled found-item photos;
- automatic match suggestions that never make the final decision;
- chain-of-custody/audit history;
- shareable report references;
- campus/location-aware matching;
- optional serial/IMEI/unique identifiers;
- privacy-preserving communication;
- human-readable statuses.

If a conflict appears, stop and ask the human developer rather than silently choosing.

---

# 1. Backend Goal

Build a secure, maintainable backend API for ጠፋብኝ.

Core lifecycle:

LOST/FOUND REPORT
→ POSSIBLE MATCH
→ CLAIM
→ OWNERSHIP VERIFICATION
→ STAFF REVIEW
→ APPROVE/REJECT
→ HANDOVER
→ RETURN CONFIRMATION
→ CASE CLOSED

The backend must enforce this workflow. The frontend is NOT part of the current phase.

---

# 2. Recommended Task Order

## TASK-001 — Repository and Backend Foundation

**Status:** Completed

### Goal

Create the backend project foundation without implementing business modules yet.

### Deliverables

- backend project initialized;
- package manager configured;
- environment configuration;
- development/test scripts;
- linting/formatting;
- `.gitignore`;
- `.env.example`;
- health-check endpoint;
- basic application structure;
- README section explaining how to run backend locally.

### Acceptance criteria

- project installs cleanly;
- server starts locally;
- health endpoint works;
- no secrets are committed;
- tests can execute.

### Do not do

- no authentication yet;
- no database business models yet;
- no frontend;
- no deployment configuration unless required later.

---

## TASK-002 — Database Foundation

**Status:** Completed

### Goal

Set up the database connection, migration strategy, and schema foundation.

### Core entities

At minimum design for:

- User
- ItemReport
- Match
- Claim
- Notification
- AuditLog / CaseEvent

The original academic design explicitly centers on users/staff, item reports, matches and notifications. Claims and audit/case events are implementation improvements needed for the full workflow.

### Acceptance criteria

- database connection works;
- migrations/schema are reproducible;
- relationships are explicit;
- timestamps are consistent;
- indexes are planned for common searches;
- no business logic is hidden inside ad-hoc database scripts.

---

## TASK-003 — Authentication

**Status:** Completed

### Goal

Implement secure user authentication.

### Requirements

- registration/login as appropriate for the chosen architecture;
- password hashing;
- token/session strategy;
- authentication middleware;
- logout/revocation strategy if applicable;
- account status;
- secure validation.

### Roles

At minimum:

- STUDENT/STAFF USER
- AUTHORIZED STAFF/ADMIN

Do not assume every authenticated user can perform staff actions.

### Acceptance criteria

- protected endpoints reject unauthenticated access;
- passwords are never stored in plaintext;
- staff authorization is enforced server-side;
- sensitive authentication errors do not leak secrets.

---

## TASK-004 — User and Profile Module

**Status:** Completed

### Goal

Implement authenticated user profile/account operations.

### Requirements

- view own profile;
- update permitted profile fields;
- account status;
- role handling;
- privacy-safe responses.

### Acceptance criteria

A user cannot read or modify another user's private account data without authorization.

---

## TASK-005 — Lost Item Reports

**Status:** Completed

### Goal

Allow authenticated users to create and manage lost-item reports.

### Minimum data

- category;
- title/item name;
- description;
- location;
- date/time or date range;
- optional identifying details;
- optional private ownership evidence;
- optional image reference;
- report owner;
- status.

### Rules

- users can manage their own reports;
- staff can review reports according to authorization;
- private evidence must never be exposed in public listing/search responses;
- validate dates, strings, categories, and ownership.

### Acceptance criteria

A valid user can create, view, update, and appropriately close/cancel their own lost report.

---

## TASK-006 — Found Item Reports

**Status:** Completed

### Goal

Allow authenticated users/staff to register found items.

### Minimum data

- category;
- title/item name;
- description;
- found location;
- found date/time;
- optional public description;
- private identifying details;
- optional private image;
- finder/handler;
- status.

### Special rule

Found-item details must be separated into:

1. public-safe information;
2. private verification information.

The private information is used to help establish ownership and must not be exposed to arbitrary users.

### Acceptance criteria

Found reports can be created and safely retrieved without leaking private evidence.

---

## TASK-007 — Search and Filtering

**Status:** Completed

### Goal

Provide backend search for lost/found reports.

### Filters

At minimum support sensible combinations of:

- category;
- location;
- date/date range;
- report type;
- status;
- text search.

### Acceptance criteria

- pagination;
- deterministic ordering;
- validation;
- no private verification fields in public search results;
- efficient database queries.

---

## TASK-008 — Matching Engine v1

**Status:** Completed

### Goal

Create deterministic matching logic that identifies possible lost↔found matches.

### Candidate signals

Use configurable weighted signals such as:

- category;
- location;
- date/time proximity;
- item title;
- description similarity;
- optional identifiers.

### Important

The matching engine only produces a SUGGESTION.

It must NEVER:

- approve a claim;
- declare ownership;
- automatically release an item.

### Output

A match should include:

- lost report;
- found report;
- score;
- match reasons/signals;
- status;
- timestamps.

### Acceptance criteria

Given suitable lost/found records, the service can generate ranked candidate matches.

---

## TASK-009 — Claims

**Status:** Completed

### Goal

Allow a user to claim a found item or a possible match.

### Claim must contain

- claimant;
- related match/found report;
- claim message;
- ownership evidence answers/details;
- optional proof reference;
- status;
- timestamps.

### Security

Claimants must not be able to retrieve the hidden answers/private evidence before answering/providing their own evidence.

### Acceptance criteria

- duplicate/conflicting claims are handled;
- unauthorized users cannot claim arbitrary private cases;
- claim status is controlled by workflow rules.

---

## TASK-010 — Ownership Verification

**Status:** Completed

### Goal

Build the verification service used by staff.

### Principle

Public information and secret identifying evidence must be separated.

Example:
Public:

- black backpack;
- Main Library;
- found Oct 8.

Private:

- unique sticker;
- internal item detail;
- hidden marking.

The claimant supplies evidence. Staff sees the relevant private evidence and makes the decision.

### Acceptance criteria

- private evidence is protected;
- verification attempts are auditable;
- verification does not automatically approve a claim;
- staff authorization is mandatory for final decision.

---

## TASK-011 — Staff Review and Decision

**Status:** Completed

### Goal

Create staff-only review endpoints/services.

### Staff can

- review reports;
- review potential matches;
- review claims;
- inspect verification evidence;
- approve;
- reject;
- request additional information if supported;
- mark item ready for handover.

### Authorization

Only authorized staff can perform final approval/rejection.

### Acceptance criteria

Every decision creates an audit/case event.

---

## TASK-012 — Case Status Workflow

**Status:** Completed

### Goal

Enforce valid state transitions.

### Suggested internal states

- DRAFT
- ACTIVE
- POSSIBLE_MATCH
- CLAIM_PENDING
- UNDER_REVIEW
- APPROVED
- REJECTED
- HANDOVER_PENDING
- RETURNED
- CLOSED
- CANCELLED

Do not expose raw internal enum names directly to users unless the API contract requires it.

### Rule

Invalid state transitions must be rejected by the backend.

---

## TASK-013 — Handover and Return Confirmation

**Status:** Completed

### Goal

Record the physical return of the item.

### Requirements

- handover status;
- staff confirmation;
- recipient confirmation where appropriate;
- return timestamp;
- case closure;
- audit event.

### Acceptance criteria

An item cannot be marked returned by an ordinary user through an unprotected endpoint.

---

## TASK-014 — Notifications

**Status:** Completed

### Goal

Implement in-app notification infrastructure.

### Events

At minimum consider:

- possible match;
- claim submitted;
- additional verification requested;
- claim approved;
- claim rejected;
- handover ready;
- item returned;
- case closed.

### Acceptance criteria

- notification recipient is correct;
- private data is not leaked through notification text;
- read/unread state works;
- notification generation is tied to actual business events.

---

## TASK-015 — Audit Log / Chain of Custody

**Status:** Completed

### Goal

Create a reliable history of important case events.

### Example

FOUND_REPORTED
→ RECEIVED_BY_STAFF
→ MATCH_SUGGESTED
→ CLAIM_SUBMITTED
→ REVIEW_STARTED
→ CLAIM_APPROVED
→ HANDOVER_COMPLETED
→ RETURN_CONFIRMED
→ CASE_CLOSED

### Requirements

- immutable event history from application level;
- actor;
- action/event;
- related case/report;
- timestamp;
- safe metadata.

### Acceptance criteria

Staff can reconstruct what happened to an item/case without editing historical events.

---

## TASK-016 — Security Hardening

**Status:** Completed

### Goal

Review the complete backend for security.

### Check

- authentication;
- authorization;
- input validation;
- rate limiting;
- error handling;
- secret handling;
- CORS;
- file upload restrictions if implemented;
- private evidence access;
- ID enumeration;
- ownership checks;
- logging without sensitive data.

### Acceptance criteria

No critical authorization path relies on frontend behavior.

---

## TASK-017 — API Documentation

**Status:** Completed

### Goal

Document the backend API for later frontend integration.

### Include

- authentication;
- users;
- lost reports;
- found reports;
- search;
- matches;
- claims;
- verification;
- staff review;
- notifications;
- handover/return;
- audit history.

Use the chosen API documentation standard consistently.

---

## TASK-018 — Automated Tests

### Goal

Build a meaningful backend test suite.

### Must test

- authentication;
- authorization;
- report creation;
- private evidence protection;
- search;
- matching;
- claims;
- staff approval/rejection;
- invalid state transitions;
- return confirmation;
- notifications;
- audit events.

### Priority

Business rules and security tests are more important than superficial line coverage.

---

## TASK-019 — Backend Integration Review

### Goal

Review all modules together.

### Check

- API consistency;
- database integrity;
- workflow consistency;
- authorization;
- error format;
- validation;
- performance basics;
- documentation;
- test reliability.

---

## TASK-020 — Backend v1 Freeze

### Goal

Declare backend v1 ready for frontend integration.

### Deliverables

- stable API contract;
- migration instructions;
- environment documentation;
- test instructions;
- seed/demo data strategy if needed;
- API documentation;
- known limitations;
- frontend integration notes.

After this task, STOP backend feature expansion until the human developer provides the UI/design and explicitly starts the integration phase.

---

# 3. Definition of Done for Every Task

A task is DONE only when:

1. implementation is complete;
2. relevant tests exist and pass;
3. validation/error handling is present;
4. authorization has been checked;
5. documentation is updated;
6. no unrelated files/features were changed;
7. existing tests still pass;
8. the human developer can review the diff;
9. no secrets or generated junk are committed.

Cursor must report:

- what changed;
- files changed;
- tests run;
- result;
- assumptions/decisions;
- anything requiring human review.

---

# 4. Cursor Task Execution Protocol

When the human says:

> Implement TASK-XXX

Cursor must:

1. read `ROLE.md`;
2. read `RULES.md`;
3. read `GITHUB_WORKFLOW.md`;
4. read this `TASKS.md`;
5. inspect the existing repository;
6. inspect the current task's dependencies;
7. implement ONLY the requested task;
8. run relevant tests/lint/type checks;
9. report completion;
10. STOP.

Cursor must not automatically start the next task.

---

# 5. Out of Scope for Backend v1

Unless the human developer explicitly adds a task:

- frontend/UI;
- mobile application;
- AI chatbot;
- image recognition;
- campus map UI;
- SMS integration;
- payment;
- unnecessary third-party integrations;
- microservices;
- Kubernetes;
- production infrastructure.

AI-assisted matching can be introduced later as an enhancement, but deterministic matching must remain understandable and testable.
