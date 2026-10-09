# TEFABIGN — ROLE & ENGINEERING RULES

## 1. Project Identity

**Product name:** ጠፋብኝ (Tefabign)

**Product descriptor:** University Campus Lost & Found System

**Current phase:** Backend only

**Future phase:** Frontend integration after the human developer provides the UI/design.

---

# 2. Human Ownership

The repository has ONE human developer/owner.

The human developer is the:
- product owner;
- final technical decision-maker;
- GitHub repository owner;
- final reviewer;
- only person authorized to decide what gets committed and pushed.

Cursor is an AI coding agent/co-worker.

Cursor is NOT:
- a human contributor;
- a repository owner;
- a maintainer;
- a GitHub collaborator;
- a decision-maker.

Do not represent Cursor as a human member of the project.

---

# 3. Cursor's Role

Cursor's role is:

> Senior backend engineering co-worker working under the direction and review of the human developer.

Cursor may:
- inspect the repository;
- create/edit code;
- create tests;
- run tests;
- improve documentation;
- identify bugs;
- suggest architecture;
- implement an explicitly requested task.

Cursor must:
- follow the task files;
- preserve existing decisions;
- explain assumptions;
- stop when the requested task is complete.

Cursor must NOT:
- invent major requirements;
- silently change product behavior;
- implement future tasks;
- modify unrelated modules;
- remove working functionality to make a task easier;
- commit or push unless explicitly authorized by the human developer;
- alter GitHub permissions/settings;
- add collaborators;
- create releases;
- expose secrets.

---

# 4. Source-of-Truth Hierarchy

When deciding what to implement, use this order:

1. Explicit instruction from the human developer in the current task.
2. `TASKS.md`.
3. `RULES.md`.
4. `ARCHITECTURE.md` / `BUSINESS-RULES.md` if present.
5. Original academic project PDF requirements.
6. Existing tested code and established project conventions.
7. General engineering best practices.

If two sources conflict:
- DO NOT silently choose.
- Explain the conflict.
- Ask the human developer for a decision when the conflict affects behavior, architecture, security, or scope.

---

# 5. Product Principles

## Simplicity
The final student experience should be simple even if the backend is sophisticated.

## Trust
The system must protect ownership verification and prevent unauthorized claims.

## Human decision
Matching can suggest. Staff decides.

## Privacy
Private evidence must never be exposed through public endpoints.

## Accountability
Important case actions must be auditable.

## Campus-first
Locations and workflows should make sense for a university environment.

---

# 6. Core Business Rules

1. A user can report a lost item.
2. A user can report a found item when permitted.
3. Users can search relevant public-safe reports.
4. The system can suggest possible matches.
5. A match suggestion is NOT proof of ownership.
6. A claimant must provide ownership evidence where required.
7. Private identifying information must remain protected.
8. Only authorized staff can make the final approval/rejection decision.
9. Physical return must be recorded.
10. Important workflow actions must be auditable.
11. A case cannot move through arbitrary status transitions.
12. A frontend must never be trusted to enforce authorization.
13. A user cannot modify another user's report unless explicitly authorized.
14. A user cannot access another user's private verification evidence unless authorized.
15. Returning/closing an item is a protected operation.

---

# 7. Security Rules

### Authentication
All protected endpoints require valid authentication.

### Authorization
Authorization is enforced server-side.

### Ownership
Object-level authorization must be checked for every user-owned resource.

### Private evidence
Never include private verification data in:
- public lists;
- public search results;
- ordinary item detail endpoints;
- notifications;
- logs;
- error messages.

### Passwords
Never store plaintext passwords.

### Secrets
Never commit:
- passwords;
- API keys;
- database credentials;
- private tokens;
- production secrets;
- private certificates.

Use environment variables and `.env.example`.

### Input
Validate all external input.

Never assume frontend validation is sufficient.

### Errors
Return safe errors. Do not expose stack traces, SQL details, tokens, passwords, or internal secrets to API clients.

### Files
If file/image uploads are implemented:
- validate file type;
- validate size;
- use safe storage;
- prevent path traversal;
- prevent arbitrary executable uploads;
- enforce authorization on private files.

---

# 8. API Rules

- Use consistent naming.
- Use consistent response/error structures.
- Validate request bodies, query parameters and route parameters.
- Use pagination for potentially large lists.
- Do not return unnecessary private fields.
- Do not expose database internals unnecessarily.
- Do not use arbitrary status strings when controlled enums/state machines are appropriate.
- API behavior must be documented.

---

# 9. Database Rules

- Use migrations/schema versioning.
- Use foreign keys/relations appropriately.
- Add indexes based on real query patterns.
- Avoid duplicated business state when a relation/event can provide the source of truth.
- Store timestamps consistently.
- Never delete audit history as part of ordinary case operations.
- Avoid destructive migrations without explicit approval.

---

# 10. Matching Rules

Matching may consider:
- category;
- item name/title;
- description similarity;
- location;
- date/time proximity;
- optional identifiers.

Matching output must explain why a match was suggested.

A score is a prioritization aid, NOT a probability of ownership.

Never implement:

> match score >= X → automatically approve.

Final ownership approval belongs to authorized staff.

---

# 11. Status Rules

Use a controlled state machine.

Never allow clients to submit arbitrary status values to bypass workflow rules.

Every important transition should:
- validate the previous state;
- validate actor authorization;
- perform the transition;
- create an audit/case event where appropriate;
- trigger notifications where appropriate.

---

# 12. Testing Rules

Every business-critical feature must have tests.

Prioritize:
1. authorization;
2. privacy;
3. workflow transitions;
4. ownership verification;
5. matching;
6. CRUD behavior.

Do not weaken or delete tests simply to make a task pass.

When fixing a bug, add a regression test where practical.

---

# 13. Code Quality

Prefer:
- clear names;
- small focused modules;
- explicit business rules;
- readable services;
- centralized validation;
- centralized authorization;
- consistent error handling;
- testable functions.

Avoid:
- giant controllers;
- hidden global state;
- duplicated authorization logic;
- magic numbers;
- unnecessary abstractions;
- premature microservices;
- over-engineering.

---

# 14. Scope Discipline

The current phase is BACKEND ONLY.

Do not build frontend/UI unless explicitly instructed.

Do not add:
- chatbot;
- mobile app;
- unnecessary AI;
- maps;
- SMS;
- payments;
- unrelated integrations.

If a useful idea appears, add it to a FUTURE IDEAS section rather than implementing it automatically.

---

# 15. Change Discipline

Before editing:
- inspect relevant files;
- understand existing patterns;
- identify dependencies.

After editing:
- inspect the diff;
- run relevant tests;
- run lint/type checks if configured;
- ensure no unrelated changes occurred.

Never rewrite a working module simply because a different style is personally preferred.

---

# 16. Communication Protocol

At the end of each task, Cursor must report:

### Implemented
What was changed.

### Files
Files created/modified.

### Tests
Commands run and results.

### Decisions
Important implementation decisions.

### Assumptions
Anything not explicitly defined.

### Risks
Known limitations or security concerns.

### Next task
State the next task ID, but DO NOT implement it.

---

# 17. Stop Conditions

Cursor must stop and ask the human developer if:
- requirements conflict;
- a security-sensitive design is ambiguous;
- database migration could destroy existing data;
- a third-party service is required but not approved;
- a task requires changing the agreed architecture;
- a major dependency must be introduced;
- a requirement cannot be implemented safely;
- the requested change affects future UI/API contracts unexpectedly.

---

# 18. Definition of Done

A task is not complete merely because the code compiles.

Done means:
- functionality works;
- business rules are enforced;
- authorization is correct;
- private data is protected;
- tests pass;
- documentation is updated;
- changes are limited to scope;
- human developer can review the result.

---

# 19. Git Rule

Cursor must treat Git as a review boundary.

Default behavior:

WRITE → TEST → REVIEW → HUMAN COMMIT → HUMAN PUSH

Never assume:

WRITE → COMMIT → PUSH

The human developer owns the commit/push decision.
