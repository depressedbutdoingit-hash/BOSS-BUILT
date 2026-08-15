# Postgres integration

## Quick start

```bash
# 1. Start Postgres
docker compose up -d postgres

# 2. Schema is auto-applied via docker-entrypoint-initdb.d
#    Or manually:
psql postgresql://postgres:postgres@localhost:5432/boss_built -f packages/db/drizzle/0000_init.sql

# 3. Point API at it
# .env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/boss_built

# 4. Run API
cd apps/api && npm install && npm run dev
```

`GET /health` → `{ "database": "postgres" }` when connected, else `"memory"`.

## Behavior

| `DATABASE_URL` | Storage |
|----------------|---------|
| Set + reachable | Postgres via Drizzle |
| Missing / down | In-memory fallback (dev) |

## Tables

- `users` — auth, plan, Stripe ids, scrypt password hashes
- `projects` — memory JSON, generated code, deploy URLs
- `usage_records` — token metering
- `memory_chunks` — vector memory persistence

## Migrations

```bash
cd packages/db
# SQL bootstrap
psql $DATABASE_URL -f drizzle/0000_init.sql

# Or drizzle-kit (after pnpm install in packages/db)
pnpm generate
pnpm migrate
```

## Passwords

`scrypt$salt$hash` via Node crypto. Legacy plaintext hashes still verify for migration.
