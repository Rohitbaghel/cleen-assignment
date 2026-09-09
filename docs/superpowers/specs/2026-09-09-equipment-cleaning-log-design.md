# Equipment Cleaning Log — Design Spec

**Date:** 2026-09-09  
**Scope:** Take-home assignment (core + light stretch)  
**Status:** Approved in design review; pending implementation plan

## Goals

Build a small full-stack Equipment Cleaning Log with a field-level audit trail for pharmaceutical manufacturing traceability. Optimize for clear structure, correct audit/pagination behavior, and meaningful tests — not feature count.

## Non-goals

- Real authentication / user accounts
- Soft deletes
- Audit trail on Equipment changes
- Keyset/cursor pagination (discussed in NOTES only)
- Containerizing the Node API / React app (Postgres only in Docker)

## Stack & layout

```
cleen-assignment/
  api/                 # Node + TypeScript + Express + Prisma + Zod + Vitest
  web/                 # Vite + React + TypeScript + React Router + CSS
  docker-compose.yml   # PostgreSQL 16
  README.md
  NOTES.md
```

- **ORM:** Prisma (schema + migrations + seed)
- **Validation:** Zod on request bodies and query params
- **Architecture:** Thin Express routes → middleware → services → Prisma
- **Audit core:** Pure `diffChanges(old, new)` unit-tested in isolation; persisted inside the same Prisma `$transaction` as create/update

## Data model

### Equipment

| Field | Type | Notes |
|-------|------|--------|
| id | UUID | PK |
| name | String | |
| code | String | Unique |
| status | Enum | `ACTIVE` \| `RETIRED` |
| createdAt | DateTime | |
| updatedAt | DateTime | |

### CleaningRecord

| Field | Type | Notes |
|-------|------|--------|
| id | UUID | PK |
| equipmentId | UUID | FK → Equipment |
| cleanedBy | String | Operator name |
| cleanedAt | DateTime | When cleaning occurred |
| method | String | Cleaning method |
| notes | String? | Optional |
| status | Enum | `PENDING` \| `VERIFIED` |
| createdAt | DateTime | |
| updatedAt | DateTime | |

### AuditEntry

| Field | Type | Notes |
|-------|------|--------|
| id | UUID | PK |
| cleaningRecordId | UUID | FK → CleaningRecord |
| changedBy | String | From `X-User-Name` |
| changedAt | DateTime | Server timestamp |
| changes | JSON | Array of `{ field, oldValue, newValue }` |

**Delete behavior:** Deleting equipment cascades to cleaning records and their audit entries. Documented in NOTES.

**Users:** No User table. Identity is a string header for stretch “current user.”

## API

Base URL: `http://localhost:3001/api`

### Auth middleware (stretch)

- Require `X-User-Name` header on mutating and audited routes (and consistently on all `/api` routes for simplicity).
- Missing/empty → `401` with `{ error: "X-User-Name header required" }`.
- `changedBy` on audits always comes from the header.
- On create, `cleanedBy` is always set from the header (request body `cleanedBy` is ignored if present). The UI shows it read-only from the “Acting as” selector.

### Equipment

| Method | Path | Behavior |
|--------|------|----------|
| GET | `/equipment` | List all |
| GET | `/equipment/:id` | Get one; 404 if missing |
| POST | `/equipment` | Create; validate body |
| PUT | `/equipment/:id` | Update |
| DELETE | `/equipment/:id` | Cascade delete |

### Cleaning records

| Method | Path | Behavior |
|--------|------|----------|
| GET | `/equipment/:id/cleaning-records` | Paginated list + optional `status` filter |
| POST | `/equipment/:id/cleaning-records` | Create + audit entry (create diff) |
| PUT | `/cleaning-records/:id` | Update + audit entry (changed fields only) |
| GET | `/cleaning-records/:id/audit` | Audit history, oldest → newest |

### Pagination query

- `page` (default 1, min 1)
- `pageSize` (default 10, max 100)
- `status` (optional: `PENDING` \| `VERIFIED`)

Response shape:

```json
{
  "data": [ /* CleaningRecord */ ],
  "page": 1,
  "pageSize": 10,
  "total": 42,
  "totalPages": 5
}
```

Order: `cleanedAt` descending, then `id` descending for stable pages.

### Audit diff rules

Tracked fields on CleaningRecord: `cleanedBy`, `cleanedAt`, `method`, `notes`, `status`.

- **Create:** one audit entry; each set field has `oldValue: null`, `newValue: <value>`.
- **Update:** one audit entry only if at least one tracked field changed; each changed field is `{ field, oldValue, newValue }`. Unchanged fields omitted.
- Dates serialized as ISO strings in JSON for stable comparison/display.
- Create/update and audit insert run in a single `$transaction`.

### Error responses

| Status | When |
|--------|------|
| 400 | Zod validation failure — `{ error, details }` |
| 401 | Missing `X-User-Name` |
| 404 | Resource not found |
| 409 | Unique constraint (e.g. equipment `code`) |

## Front-end

### Routes

- `/` — Equipment list (name, code, status). Row click → detail.
- `/equipment/:id` — Cleaning records (paginated, status filter), add/edit form, audit trail for selected record.

### UX

- Global “Acting as” selector (seeded names, e.g. Alice / Bob / Carol) sets `X-User-Name` for all API calls.
- Cleaning form fields: `cleanedAt`, `method`, `notes`, `status`; `cleanedBy` displayed read-only from acting user.
- Audit panel: chronological list of entries; each shows `changedBy`, `changedAt`, and field-level old → new.
- States: loading, empty, error.
- Thin `fetch` API client wrapping base URL + header.
- Minimal “Add equipment” so Equipment CRUD is demoable beyond seed data.
- Visual tone: functional industrial UI with CSS variables; no component library; avoid generic AI-template aesthetics.

## Tests

Framework: Vitest (API).

1. **`diffChanges` unit tests** — create diffs, partial updates, identical objects → empty, date/null handling.
2. **Pagination** — page size, total count, status filter (against Postgres via Docker or configured test `DATABASE_URL`).
3. **Audit persistence** — create/update produce expected `AuditEntry` payloads in a transaction.

Prefer a handful of meaningful tests over broad shallow coverage.

## Docker & local run

- `docker-compose.yml` runs PostgreSQL 16 with a named volume.
- API and web run on the host (`npm run dev` in each package).
- `api/.env.example` documents `DATABASE_URL`, `PORT`.
- Prisma migrate + seed scripts documented in README.

## Documentation deliverables

- **README.md** — exact install, DB up, migrate, seed, run API, run web, run tests.
- **NOTES.md** — Prisma choice, offset vs cursor, header-as-user, cascade delete, deliberate omissions, what more time would buy.

## Assumptions

1. Assignment audit requirement applies only to cleaning records, not equipment.
2. String operator names are sufficient; no User FK.
3. Offset pagination meets the core requirement; cursor pagination is stretch and deferred to NOTES.
4. Cascade delete is acceptable for a demo seed DB.
5. Host-run Node processes + Dockerized Postgres is enough for “Docker to run everything” spirit without multi-service Node images.

## Implementation order (preview)

1. Scaffold repo, Docker Postgres, Prisma schema/migrate/seed  
2. Audit `diffChanges` + unit tests (TDD)  
3. Equipment + cleaning record services/routes + pagination/audit tests  
4. React UI wired to API  
5. README + NOTES + commit history cleanup  

(Detailed plan follows after this spec is approved.)
