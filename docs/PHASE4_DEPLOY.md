# Phase 4 — One-click deploy & ownership

## What you get

| Action | Endpoint | Result |
|--------|----------|--------|
| JSON export | `GET /projects/:id/export` | Files + memory as JSON |
| ZIP download | `GET /projects/:id/export.zip` | Portable archive |
| Vercel | `POST /projects/:id/deploy/vercel` | Live URL + status poll |
| GitHub | `POST /projects/:id/deploy/github` | New repo with full ownership pack |

## Ownership pack (injected into every export)

Every ZIP / GitHub push / Vercel bundle includes when missing:

- `README.md` — how to run & deploy
- `package.json` — basic Vite scripts
- `.gitignore` · `.env.example`
- `.github/workflows/ci.yml` — install + build on PR/push
- `.github/workflows/deploy.yml` — Vercel deploy when secrets set
- `index.html` fallback (black/gold card) if no HTML was generated

You own the code. No Boss Built runtime required after export.

## Env secrets

```bash
# apps/api .env
VERCEL_TOKEN=...      # https://vercel.com/account/tokens
GITHUB_TOKEN=...      # classic PAT: repo scope
```

Optional body override: `{ "token": "..." }` on deploy routes.

## UI flow

1. **LIVE** build until files appear in GENERATED FILES
2. **ZIP** — download ownership pack
3. **VERCEL** — deploy + auto-poll until READY/ERROR
4. **GITHUB** — create private repo + write all files
5. **JSON** — raw export for tooling

## Platform CI

Boss Built itself uses `.github/workflows/ci.yml` for API/web checks.
