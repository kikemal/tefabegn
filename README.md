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

### Checks

```bash
npm test
npm run lint
npm run typecheck
npm run format:check
```

Never commit `.env`, secrets, credentials, or private ownership evidence.
