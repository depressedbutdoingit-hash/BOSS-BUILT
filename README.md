# Boss Built

**Where Elite Vision Meets Unstoppable Execution.**

AI full-stack engineer — Genesis Swarm builds, validates, and deploys apps while you watch every step.

## Stack highlights

- **Genesis Swarm** — 7-layer Hydra-Prime orchestration (SOVEREIGN → … → Validator)
- **Vector memory** — embeddings + cosine retrieval, role-budgeted context windows
- **Live terminal** — black · gold · chrome UI, SSE stream, file preview, memory inspector
- **Export / deploy** — JSON, ZIP, Vercel, GitHub (Phase 4)

## Quick start

```bash
# API
cd apps/api && npm install && npm run dev   # :3001

# Web
cd apps/web && npm install && npm run dev   # :5173
```

Static UI demo (no install): open `apps/web/public/preview.html`

## Genesis flow (short)

```
YOU → SOVEREIGN → ARCHITECTS → WORKERS → GUARDIANS → SYNTH → VALID
         │              │           │          │
         └──────── vector memory (retrieve + persist) ────────┘
```

See `docs/GENESIS_FLOW.md` and `docs/TERMINAL_EXPERIENCE.md`.

## Phase status

| Phase | Status | Focus |
|-------|--------|--------|
| 0–2 | Done | Monorepo, Genesis, OpenRouter, SSE |
| 2.5 | Done | Vector memory + context budgets |
| 3 | Done | Cyber UI, file preview, memory inspector, live/demo |
| 4 | **Done** | ZIP / Vercel / GitHub + ownership pack + poll |
| 5 | **Done** | Monthly subs · host default · export unlock | Stripe + metering |

## API map

- `POST /auth/register` · `POST /auth/login`
- `GET|POST /projects` · `POST /projects/:id/chat` (SSE)
- `GET /projects/:id/memory`
- `GET /projects/:id/export` · `GET .../export.zip`
- `POST /projects/:id/deploy/vercel` · `POST .../deploy/github`

## Brand

**Boss Built** · `@boss/*` · Black · Gold · Chrome


## Database (Postgres)

```bash
docker compose up -d postgres
# .env already points to:
# DATABASE_URL=postgresql://postgres:postgres@localhost:5432/boss_built

cd apps/api && npm install && npm run dev
curl http://localhost:3001/health   # database: "postgres" | "memory"
```

See `docs/DATABASE.md`.
