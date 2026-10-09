# TEFABIGN — GITHUB & CURSOR WORKFLOW

## 1. Repository Ownership

The GitHub repository is owned and controlled by the human developer.

Cursor is a local AI coding co-worker.

Cursor must NOT be added as a GitHub collaborator or represented as a human project member.

All repository settings, collaborators, secrets, branch protection and releases remain under human control.

---

# 2. Recommended Repository

Suggested repository name:

`tefabign`

Possible description:

> ጠፋብኝ (Tefabign) — a university campus lost and found system focused on simple reporting, protected ownership verification, matching, staff review, and accountable item return.

---

# 3. Initial Repository Structure

```text
tefabign/
├── README.md
├── ROLE.md
├── RULES.md
├── TASKS.md
├── GITHUB_WORKFLOW.md
├── REQUIREMENTS.md
├── BUSINESS-RULES.md
├── ARCHITECTURE.md
├── DATABASE.md
├── API.md
├── SECURITY.md
├── TESTING.md
├── CHANGELOG.md
├── docs/
│   ├── original-project/
│   ├── decisions/
│   └── research/
├── backend/
└── .gitignore
```

Only create additional files/directories when they are justified by the implementation.

---

# 4. First Human GitHub Setup

The human developer should:

1. Create the GitHub repository.
2. Keep the repository private/public according to their own decision.
3. Add the repository description.
4. Clone it locally.
5. Place the project documentation in the repository.
6. Review the documentation.
7. Make the first commit.
8. Push the first commit.

Suggested initial commit:

`docs: establish project requirements and development workflow`

Cursor should not make this commit unless explicitly asked.

---

# 5. Cursor Development Loop

For every task:

```text
Human selects TASK-XXX
        ↓
Cursor reads ROLE.md
        ↓
Cursor reads RULES.md
        ↓
Cursor reads GITHUB_WORKFLOW.md
        ↓
Cursor reads TASKS.md
        ↓
Cursor inspects repository
        ↓
Cursor implements ONLY TASK-XXX
        ↓
Cursor runs tests/checks
        ↓
Cursor reports results
        ↓
Human reviews diff
        ↓
Human commits
        ↓
Human pushes
        ↓
Next task
```

---

# 6. Cursor Must Never Auto-Push

Unless the human developer explicitly gives a direct instruction to perform a Git operation:

Cursor must not:
- `git push`;
- push to `main`;
- create releases;
- change remotes;
- change GitHub settings;
- add collaborators;
- modify repository permissions.

Even if a task is complete, Cursor stops after reporting completion.

---

# 7. Branch Strategy

Recommended:

```text
main
  │
  ├── task/TASK-001-foundation
  ├── task/TASK-002-database
  ├── task/TASK-003-auth
  └── ...
```

For a solo developer, either of these is acceptable:

### Option A — Task branches
Use a branch per meaningful task.

Example:

`task/TASK-003-authentication`

This gives strong isolation and review history.

### Option B — Main with human-controlled commits
For very small tasks, work directly on `main`, but only the human commits/pushes after review.

Recommended default: **Option A for major tasks.**

---

# 8. Commit Convention

Use clear conventional commits.

Examples:

```text
feat(auth): add user authentication
feat(reports): add lost item reports
feat(reports): add found item reports
feat(match): add match scoring service
feat(claims): add ownership claims
feat(staff): add claim review workflow
feat(notifications): add in-app notifications
feat(audit): add case event history

fix(auth): prevent unauthorized profile access
fix(claims): prevent duplicate active claims

test(match): cover location and date scoring

docs(tasks): clarify TASK-008 acceptance criteria
refactor(reports): simplify report validation
chore(deps): update backend dependencies
```

The human developer should author the actual commit unless explicitly delegating the operation.

---

# 9. Pull Requests

Even as a solo developer, PRs can be useful for major tasks.

PR title:

`TASK-008: Implement matching engine v1`

PR body should include:

```text
## What changed
...

## Why
...

## Tests
...

## Security
...

## API changes
...

## Database changes
...

## Known limitations
...
```

The human developer is the final reviewer/merger.

---

# 10. Main Branch Rules

`main` should represent a stable state.

Do not push experimental or broken work directly to `main`.

Before merging/pushing:
- tests pass;
- lint/type checks pass where configured;
- migration status is known;
- no secrets are present;
- diff is reviewed;
- task acceptance criteria are satisfied.

---

# 11. Commit Frequency

Commit at meaningful boundaries.

Good:

```text
TASK-003 complete
TASK-004 complete
TASK-005 complete
```

Avoid:
- one giant commit containing the whole application;
- hundreds of meaningless micro-commits;
- generated files;
- secret files.

---

# 12. What Must Never Be Committed

Never commit:

```text
.env
.env.local
.env.production
node_modules/
coverage/
dist/        # if generated and not intentionally versioned
logs/
*.log
private keys
credentials
database dumps containing real personal data
uploaded private evidence
```

Use `.env.example` with placeholders.

---

# 13. Sensitive Data

Development/demo data must be fake.

Never put real student personal information into GitHub.

Never commit:
- real passwords;
- real phone numbers;
- real identity documents;
- real private verification evidence;
- real private photos;
- production database dumps.

---

# 14. Documentation Commit Rule

When a task changes:
- API behavior;
- database schema;
- business rules;
- security behavior;
- architecture;

the related documentation must be updated in the same task before the human commits.

---

# 15. Issue / Task Mapping

Each task should be traceable.

Example:

```text
TASK-008
Matching Engine v1
```

Can correspond to:

```text
GitHub Issue #8
Branch: task/TASK-008-matching
PR: TASK-008: Implement matching engine v1
Commit: feat(match): add match scoring service
```

The exact GitHub numbering is optional; the TASK ID is mandatory for traceability.

---

# 16. Human Review Checklist

Before the human developer commits:

### Scope
- [ ] Only requested task was implemented.
- [ ] No future feature was silently added.

### Security
- [ ] Authorization is server-side.
- [ ] Private evidence is protected.
- [ ] No secrets are committed.

### Quality
- [ ] Tests pass.
- [ ] Validation exists.
- [ ] Errors are safe.
- [ ] Code follows existing structure.

### Documentation
- [ ] API docs updated if needed.
- [ ] Database docs updated if needed.
- [ ] Business rules updated if needed.

### Git
- [ ] Diff reviewed.
- [ ] Correct branch.
- [ ] Meaningful commit message.
- [ ] Human approves push.

---

# 17. Release Strategy

Do not create production releases during the initial backend build.

Suggested milestones:

```text
v0.1.0 — Backend foundation
v0.2.0 — Authentication + users
v0.3.0 — Lost/found reports
v0.4.0 — Search + matching
v0.5.0 — Claims + verification
v0.6.0 — Staff workflow
v0.7.0 — Notifications + audit
v0.8.0 — Security + tests
v1.0.0 — Backend ready for frontend integration
```

Versions are optional and should be created only by the human developer.

---

# 18. Cursor Git Safety Prompt

If Cursor is asked to use Git, it must follow:

> You are an AI coding co-worker. The human developer owns this repository. Do not push, create releases, change GitHub permissions, add collaborators, or modify repository settings unless the human explicitly instructs you to do so. Before any commit, show the intended commit message and summarize the staged changes. Default to leaving changes uncommitted for human review.

---

# 19. Backend-to-Frontend Handoff

After `TASK-020`:

STOP.

Do not start frontend work automatically.

The human developer will provide:
- UI design;
- screens;
- component expectations;
- frontend technology decisions;
- API integration requirements.

Then create a new frontend task plan.

The existing backend API contract must be treated as a dependency and not casually changed to fit the UI.

---

# 20. Project Philosophy

This repository should show a clear progression:

```text
Requirements
    ↓
Architecture
    ↓
Database
    ↓
Backend Modules
    ↓
Tests
    ↓
Security
    ↓
Stable API
    ↓
Frontend
    ↓
Integration
```

The Git history should make this progression understandable to another developer, reviewer, lecturer, or future maintainer.
