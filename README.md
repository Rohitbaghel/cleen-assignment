# Cleen — Equipment Cleaning Log

Full-stack take-home: PostgreSQL + Express/Prisma API + React UI with a field-level audit trail for cleaning records.

## Prerequisites

- Docker / Docker Compose  
- (Optional, for local/dev without containers) Node.js 20+ and npm

## Quick start (one command)

From `equipment-cleaning-log/`:

```bash
docker-compose up --build
```

| Service | URL |
|---------|-----|
| **UI** | [http://localhost:8080](http://localhost:8080) |
| **API** | [http://localhost:3001](http://localhost:3001) |
| **Postgres** | `localhost:5432` (`cleen` / `cleen` / `cleaning_log`) |

Compose builds the API and web images, waits for Postgres, runs migrations + seed (seed is skipped if data already exists), then serves the UI via nginx (proxies `/api` → API).

Stop with `Ctrl+C`, or `docker-compose down`. Reset DB volume: `docker-compose down -v`.

Use **Acting as** in the UI header to set `X-User-Name` (Alice / Bob / Carol).

## Local development (optional)

If you prefer host-run Node with only Postgres in Docker:

```bash
docker-compose up -d db
cd api && cp .env.example .env && npm install && npx prisma migrate dev && npx prisma db seed && npm run dev
cd web && npm install && npm run dev
```

- API: http://localhost:3001  
- UI: http://localhost:5173 (Vite proxies `/api` → API)

## Tests

Postgres must be reachable (`docker-compose up -d db` is enough):

```bash
cd api
npm test
```

Covers `diffChanges` plus integration tests for pagination, status filter, and audit persistence.

## API overview

All `/api/*` routes except `GET /api/health` require:

```
X-User-Name: Alice
```

| Method | Path | Notes |
|--------|------|--------|
| GET | `/api/health` | No auth header |
| GET/POST/PUT/DELETE | `/api/equipment` | CRUD |
| GET/POST | `/api/equipment/:id/cleaning-records` | Paginated list (`page`, `pageSize`, optional `status`) / create |
| PUT | `/api/cleaning-records/:id` | Update + audit |
| GET | `/api/cleaning-records/:id/audit` | Field-level history |

## Project layout

```
api/                 Express + Prisma + Zod + Vitest
web/                 Vite + React + TypeScript (+ nginx in Docker)
docker-compose.yml   db + api + web
```

See `NOTES.md` for design decisions and trade-offs.
