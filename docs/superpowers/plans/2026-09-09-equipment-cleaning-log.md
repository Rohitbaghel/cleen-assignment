# Equipment Cleaning Log Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a full-stack Equipment Cleaning Log (Express + Prisma + React) with field-level audit trail, offset pagination, validation, header-based current user, Dockerized Postgres, tests, README, and NOTES.

**Architecture:** Thin Express routes → Zod validation + `X-User-Name` middleware → services → Prisma. Pure `diffChanges` drives audit JSON; create/update and audit inserts share one `$transaction`. React SPA (Vite) talks to `/api` via a thin fetch client that always sends the acting-user header.

**Tech Stack:** Node.js, TypeScript, Express, Prisma, PostgreSQL 16, Zod, Vitest, Vite, React, React Router, CSS (no UI library), Docker Compose.

**Spec:** `docs/superpowers/specs/2026-09-09-equipment-cleaning-log-design.md`

## Global Constraints

- TypeScript on API and web
- PostgreSQL via Docker Compose; API/web run on host
- Audit only for CleaningRecord (not Equipment)
- Tracked audit fields: `cleanedBy`, `cleanedAt`, `method`, `notes`, `status`
- `cleanedBy` on create always from `X-User-Name` (ignore body)
- Pagination: offset `page` / `pageSize` / optional `status`; order `cleanedAt desc`, `id desc`
- Cascade delete Equipment → CleaningRecord → AuditEntry
- No real auth, no soft deletes, no cursor pagination in code
- Prefer quality tests over quantity; cover `diffChanges`, pagination, audit persistence

---

## File Structure

```
cleen-assignment/
  docker-compose.yml
  README.md
  NOTES.md
  .gitignore
  api/
    package.json
    tsconfig.json
    vitest.config.ts
    .env
    .env.example
    prisma/
      schema.prisma
      seed.ts
      migrations/          # created by prisma migrate
    src/
      index.ts            # listen
      app.ts              # Express app factory (export for tests)
      lib/prisma.ts
      lib/errors.ts
      lib/diffChanges.ts
      middleware/requireUser.ts
      middleware/validate.ts
      middleware/errorHandler.ts
      services/equipmentService.ts
      services/cleaningRecordService.ts
      routes/equipment.ts
      routes/cleaningRecords.ts
    tests/
      diffChanges.test.ts
      cleaningRecords.integration.test.ts
      setup.ts
  web/
    package.json
    tsconfig.json
    vite.config.ts
    index.html
    src/
      main.tsx
      App.tsx
      index.css
      api/client.ts
      context/UserContext.tsx
      pages/EquipmentListPage.tsx
      pages/EquipmentDetailPage.tsx
      components/EquipmentForm.tsx
      components/CleaningRecordForm.tsx
      components/CleaningRecordTable.tsx
      components/AuditTrail.tsx
      components/ActingAs.tsx
      types.ts
```

---

### Task 1: Foundation — Docker, API scaffold, Prisma schema, migrate, seed

**Files:**
- Create: `docker-compose.yml`, `.gitignore`, `api/package.json`, `api/tsconfig.json`, `api/.env.example`, `api/.env`, `api/prisma/schema.prisma`, `api/prisma/seed.ts`, `api/src/lib/prisma.ts`

**Interfaces:**
- Consumes: none
- Produces: Prisma client with models `Equipment`, `CleaningRecord`, `AuditEntry`; `DATABASE_URL`; seed data (≥3 equipment, ≥15 cleaning records across statuses)

- [ ] **Step 1: Create root Docker Compose and gitignore**

`docker-compose.yml`:

```yaml
services:
  db:
    image: postgres:16-alpine
    ports:
      - "5432:5432"
    environment:
      POSTGRES_USER: cleen
      POSTGRES_PASSWORD: cleen
      POSTGRES_DB: cleaning_log
    volumes:
      - pgdata:/var/lib/postgresql/data

volumes:
  pgdata:
```

`.gitignore` must ignore `node_modules/`, `dist/`, `api/.env`, `web/dist/`, `*.log`, `.DS_Store`.

- [ ] **Step 2: Scaffold `api` package**

`api/package.json` scripts:
- `"dev": "tsx watch src/index.ts"`
- `"build": "tsc"`
- `"start": "node dist/index.js"`
- `"test": "vitest run"`
- `"test:watch": "vitest"`
- `"prisma:migrate": "prisma migrate dev"`
- `"prisma:seed": "tsx prisma/seed.ts"`

Dependencies: `express`, `@prisma/client`, `zod`, `cors`
DevDependencies: `typescript`, `tsx`, `prisma`, `vitest`, `@types/express`, `@types/cors`, `@types/node`

`api/tsconfig.json`: `strict: true`, `outDir: dist`, `rootDir: src`, `esModuleInterop: true`, `module`/`moduleResolution` suitable for NodeNext or CommonJS (pick `CommonJS` + `ES2022` for simplicity).

- [ ] **Step 3: Prisma schema**

`api/prisma/schema.prisma`:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum EquipmentStatus {
  ACTIVE
  RETIRED
}

enum CleaningStatus {
  PENDING
  VERIFIED
}

model Equipment {
  id        String          @id @default(uuid())
  name      String
  code      String          @unique
  status    EquipmentStatus @default(ACTIVE)
  createdAt DateTime        @default(now())
  updatedAt DateTime        @updatedAt
  cleaningRecords CleaningRecord[]
}

model CleaningRecord {
  id          String         @id @default(uuid())
  equipmentId String
  equipment   Equipment      @relation(fields: [equipmentId], references: [id], onDelete: Cascade)
  cleanedBy   String
  cleanedAt   DateTime
  method      String
  notes       String?
  status      CleaningStatus @default(PENDING)
  createdAt   DateTime       @default(now())
  updatedAt   DateTime       @updatedAt
  auditEntries AuditEntry[]

  @@index([equipmentId, cleanedAt, id])
}

model AuditEntry {
  id               String         @id @default(uuid())
  cleaningRecordId String
  cleaningRecord   CleaningRecord @relation(fields: [cleaningRecordId], references: [id], onDelete: Cascade)
  changedBy        String
  changedAt        DateTime       @default(now())
  changes          Json

  @@index([cleaningRecordId, changedAt])
}
```

`api/.env` and `api/.env.example`:

```
DATABASE_URL="postgresql://cleen:cleen@localhost:5432/cleaning_log?schema=public"
PORT=3001
```

- [ ] **Step 4: Start Postgres and migrate**

```bash
docker compose up -d
cd api && npm install
npx prisma migrate dev --name init
```

Expected: migration applied; Prisma Client generated.

- [ ] **Step 5: Seed script**

`api/prisma/seed.ts` creates:
- Users conceptually: Alice, Bob, Carol (strings only)
- 3+ equipment (mix ACTIVE/RETIRED)
- 15+ cleaning records on at least one equipment so pagination is visible (mix PENDING/VERIFIED)
- No audit rows in seed (or optional 1–2 for demo — prefer none; audits appear when UI edits)

Wire seed in `package.json`:

```json
"prisma": {
  "seed": "tsx prisma/seed.ts"
}
```

Run: `npx prisma db seed`  
Expected: completes without error; verify with `npx prisma studio` or a quick `tsx` query.

- [ ] **Step 6: Prisma singleton**

`api/src/lib/prisma.ts`:

```typescript
import { PrismaClient } from "@prisma/client";

export const prisma = new PrismaClient();
```

- [ ] **Step 7: Commit**

```bash
git add docker-compose.yml .gitignore api
git commit -m "chore: scaffold API, Postgres, Prisma schema and seed"
```

---

### Task 2: `diffChanges` (TDD)

**Files:**
- Create: `api/src/lib/diffChanges.ts`, `api/tests/diffChanges.test.ts`, `api/vitest.config.ts`

**Interfaces:**
- Consumes: none
- Produces:

```typescript
export type Change = {
  field: string;
  oldValue: string | null;
  newValue: string | null;
};

export type TrackedCleaningFields = {
  cleanedBy: string;
  cleanedAt: Date | string;
  method: string;
  notes: string | null;
  status: string;
};

export function normalizeValue(value: unknown): string | null;
export function diffChanges(
  before: Partial<TrackedCleaningFields> | null,
  after: Partial<TrackedCleaningFields>
): Change[];
```

Rules:
- If `before` is `null` (create), emit a change for every key present in `after` with `oldValue: null`
- If `before` is an object (update), emit only keys where normalized values differ
- Dates → ISO strings via `normalizeValue`
- `null` and `undefined` notes normalize to `null`

- [ ] **Step 1: Vitest config**

`api/vitest.config.ts`:

```typescript
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
});
```

- [ ] **Step 2: Write failing tests**

`api/tests/diffChanges.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { diffChanges } from "../src/lib/diffChanges";

describe("diffChanges", () => {
  it("create: all after fields with oldValue null", () => {
    const after = {
      cleanedBy: "Alice",
      cleanedAt: new Date("2026-01-15T10:00:00.000Z"),
      method: "CIP",
      notes: null,
      status: "PENDING",
    };
    const changes = diffChanges(null, after);
    expect(changes).toEqual([
      { field: "cleanedBy", oldValue: null, newValue: "Alice" },
      {
        field: "cleanedAt",
        oldValue: null,
        newValue: "2026-01-15T10:00:00.000Z",
      },
      { field: "method", oldValue: null, newValue: "CIP" },
      { field: "notes", oldValue: null, newValue: null },
      { field: "status", oldValue: null, newValue: "PENDING" },
    ]);
  });

  it("update: only changed fields", () => {
    const before = {
      cleanedBy: "Alice",
      cleanedAt: new Date("2026-01-15T10:00:00.000Z"),
      method: "CIP",
      notes: "ok",
      status: "PENDING",
    };
    const after = { ...before, status: "VERIFIED", notes: "checked" };
    expect(diffChanges(before, after)).toEqual([
      { field: "notes", oldValue: "ok", newValue: "checked" },
      { field: "status", oldValue: "PENDING", newValue: "VERIFIED" },
    ]);
  });

  it("update: identical → empty", () => {
    const row = {
      cleanedBy: "Bob",
      cleanedAt: "2026-01-15T10:00:00.000Z",
      method: "WIP",
      notes: null,
      status: "PENDING",
    };
    expect(diffChanges(row, row)).toEqual([]);
  });

  it("normalizes Date and ISO string to same value", () => {
    const before = {
      cleanedBy: "Bob",
      cleanedAt: new Date("2026-01-15T10:00:00.000Z"),
      method: "WIP",
      notes: null,
      status: "PENDING",
    };
    const after = {
      ...before,
      cleanedAt: "2026-01-15T10:00:00.000Z",
    };
    expect(diffChanges(before, after)).toEqual([]);
  });
});
```

- [ ] **Step 3: Run tests — expect fail**

```bash
cd api && npm test -- tests/diffChanges.test.ts
```

Expected: FAIL (module not found / export missing).

- [ ] **Step 4: Implement `diffChanges`**

`api/src/lib/diffChanges.ts` — implement `normalizeValue` and `diffChanges` per Interfaces above. Iterate a fixed field order: `cleanedBy`, `cleanedAt`, `method`, `notes`, `status` so test array order is stable.

- [ ] **Step 5: Run tests — expect pass**

```bash
cd api && npm test -- tests/diffChanges.test.ts
```

Expected: PASS (4 tests).

- [ ] **Step 6: Commit**

```bash
git add api/src/lib/diffChanges.ts api/tests/diffChanges.test.ts api/vitest.config.ts api/package.json
git commit -m "feat: add audited field diff helper with unit tests"
```

---

### Task 3: Express app shell — errors, auth, validation middleware

**Files:**
- Create: `api/src/lib/errors.ts`, `api/src/middleware/requireUser.ts`, `api/src/middleware/validate.ts`, `api/src/middleware/errorHandler.ts`, `api/src/app.ts`, `api/src/index.ts`
- Create: `api/src/types/express.d.ts` (augment `Request` with `userName: string`)

**Interfaces:**
- Consumes: none
- Produces:
  - `createApp(): Express` mounting `/api` with cors, json, `requireUser`, routes placeholder, `errorHandler`
  - `requireUser` sets `req.userName`
  - `HttpError` class with `statusCode`
  - `validateBody(schema)` / `validateQuery(schema)` middleware using Zod

- [ ] **Step 1: Errors**

```typescript
// api/src/lib/errors.ts
export class HttpError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public details?: unknown
  ) {
    super(message);
    this.name = "HttpError";
  }
}
```

- [ ] **Step 2: requireUser**

```typescript
// api/src/middleware/requireUser.ts
import { Request, Response, NextFunction } from "express";
import { HttpError } from "../lib/errors";

export function requireUser(req: Request, _res: Response, next: NextFunction) {
  const name = req.header("X-User-Name")?.trim();
  if (!name) {
    return next(new HttpError(401, "X-User-Name header required"));
  }
  req.userName = name;
  next();
}
```

- [ ] **Step 3: validate + errorHandler**

`validateBody` / `validateQuery`: on Zod failure → `HttpError(400, "Validation failed", error.flatten())`.

`errorHandler`:
- `HttpError` → `{ error: message, details? }` with status
- Prisma `P2002` → 409 `{ error: "Conflict", details }`
- else 500 `{ error: "Internal server error" }` (log server-side)

- [ ] **Step 4: app.ts + index.ts**

```typescript
// api/src/app.ts
import express from "express";
import cors from "cors";
import { requireUser } from "./middleware/requireUser";
import { errorHandler } from "./middleware/errorHandler";

export function createApp() {
  const app = express();
  app.use(cors());
  app.use(express.json());
  app.get("/api/health", (_req, res) => res.json({ ok: true }));
  app.use("/api", requireUser);
  // routes mounted in later tasks
  app.use(errorHandler);
  return app;
}
```

```typescript
// api/src/index.ts
import { createApp } from "./app";

const port = Number(process.env.PORT) || 3001;
createApp().listen(port, () => {
  console.log(`API listening on http://localhost:${port}`);
});
```

- [ ] **Step 5: Smoke check**

```bash
cd api && npx tsx src/index.ts
# other terminal:
curl -s http://localhost:3001/api/health
curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/api/health
# health can stay outside requireUser — already mounted before requireUser
curl -s -o /dev/null -w "%{http_code}" -H "X-User-Name: Alice" http://localhost:3001/api/health
```

Expected: health returns `{ ok: true }` without header (mounted before `requireUser`).

- [ ] **Step 6: Commit**

```bash
git add api/src
git commit -m "feat: add Express app shell with auth and error middleware"
```

---

### Task 4: Equipment CRUD

**Files:**
- Create: `api/src/services/equipmentService.ts`, `api/src/routes/equipment.ts`
- Modify: `api/src/app.ts` — mount equipment router at `/api/equipment`

**Interfaces:**
- Consumes: `prisma`, `HttpError`, `validateBody`, `req.userName` (header required but unused for equipment)
- Produces service functions:

```typescript
listEquipment(): Promise<Equipment[]>
getEquipment(id: string): Promise<Equipment>  // 404 if missing
createEquipment(data: { name: string; code: string; status?: EquipmentStatus }): Promise<Equipment>
updateEquipment(id: string, data: Partial<{ name: string; code: string; status: EquipmentStatus }>): Promise<Equipment>
deleteEquipment(id: string): Promise<void>
```

Zod schemas: `createEquipmentSchema`, `updateEquipmentSchema`.

- [ ] **Step 1: Implement service + routes**

Routes:
- `GET /` → list
- `GET /:id` → get
- `POST /` → create
- `PUT /:id` → update
- `DELETE /:id` → delete

Mount: `app.use("/api/equipment", equipmentRouter)` **after** `requireUser`.

- [ ] **Step 2: Manual verify against seed**

```bash
curl -s -H "X-User-Name: Alice" http://localhost:3001/api/equipment | head
curl -s -X POST -H "X-User-Name: Alice" -H "Content-Type: application/json" \
  -d '{"name":"Tank Z","code":"TANK-Z","status":"ACTIVE"}' \
  http://localhost:3001/api/equipment
```

Expected: JSON list; create returns new row; duplicate `code` → 409.

- [ ] **Step 3: Commit**

```bash
git add api/src/services/equipmentService.ts api/src/routes/equipment.ts api/src/app.ts
git commit -m "feat: add equipment CRUD API"
```

---

### Task 5: Cleaning records + audit + pagination (TDD integration)

**Files:**
- Create: `api/src/services/cleaningRecordService.ts`, `api/src/routes/cleaningRecords.ts`, `api/tests/setup.ts`, `api/tests/cleaningRecords.integration.test.ts`
- Modify: `api/src/app.ts`, `api/src/routes/equipment.ts` (nest list/create under equipment) or mount both routers cleanly
- Modify: `api/vitest.config.ts` if needed for longer timeouts

**Interfaces:**
- Consumes: `diffChanges`, `prisma`, `HttpError`, `req.userName`
- Produces:

```typescript
type Paginated<T> = {
  data: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

listCleaningRecords(
  equipmentId: string,
  query: { page: number; pageSize: number; status?: CleaningStatus }
): Promise<Paginated<CleaningRecord>>

createCleaningRecord(
  equipmentId: string,
  input: { cleanedAt: Date; method: string; notes?: string | null; status?: CleaningStatus },
  changedBy: string
): Promise<CleaningRecord>
// cleanedBy := changedBy; audit create diff in same transaction

updateCleaningRecord(
  id: string,
  input: Partial<{ cleanedAt: Date; method: string; notes: string | null; status: CleaningStatus }>,
  changedBy: string
): Promise<CleaningRecord>
// if diff empty, still update updatedAt only OR no-op update without audit — prefer: skip audit entry when diff empty

getAuditHistory(cleaningRecordId: string): Promise<AuditEntry[]>
// order by changedAt asc, id asc
```

Route map (exact paths from spec):
- `GET /api/equipment/:id/cleaning-records`
- `POST /api/equipment/:id/cleaning-records`
- `PUT /api/cleaning-records/:id`
- `GET /api/cleaning-records/:id/audit`

Query Zod: `page` coerce number default 1, `pageSize` default 10 max 100, `status` optional enum.

- [ ] **Step 1: Write failing integration tests**

`api/tests/setup.ts`: ensure `DATABASE_URL` is set; optionally truncate tables before each test file via `DELETE` in FK-safe order or use transactions. Simplest approach: beforeEach delete all `AuditEntry`, `CleaningRecord`, create fresh Equipment fixture.

`api/tests/cleaningRecords.integration.test.ts` must cover:

1. **Pagination:** insert 15 records; `pageSize=5` → `data.length === 5`, `total === 15`, `totalPages === 3`; page 3 returns remainder.
2. **Status filter:** mix PENDING/VERIFIED; filter PENDING → `total` equals pending count only.
3. **Audit on create:** after create, audit length 1; changes include `method` with `oldValue: null`.
4. **Audit on update:** update `status`; new audit entry with only `status` change; `changedBy` matches header user passed into service.

Use `cleaningRecordService` directly (faster than HTTP) **or** `supertest` against `createApp()` — prefer service-level for speed unless `supertest` already added. If HTTP preferred, add `supertest` + `@types/supertest`.

- [ ] **Step 2: Run tests — expect fail**

```bash
cd api && npm test -- tests/cleaningRecords.integration.test.ts
```

Expected: FAIL (service missing).

- [ ] **Step 3: Implement service + routes**

Critical create transaction sketch:

```typescript
return prisma.$transaction(async (tx) => {
  const record = await tx.cleaningRecord.create({
    data: {
      equipmentId,
      cleanedBy: changedBy,
      cleanedAt: input.cleanedAt,
      method: input.method,
      notes: input.notes ?? null,
      status: input.status ?? "PENDING",
    },
  });
  const changes = diffChanges(null, {
    cleanedBy: record.cleanedBy,
    cleanedAt: record.cleanedAt,
    method: record.method,
    notes: record.notes,
    status: record.status,
  });
  await tx.auditEntry.create({
    data: { cleaningRecordId: record.id, changedBy, changes },
  });
  return record;
});
```

Update: load existing → compute diff → if equipment missing 404 → update + conditional audit in one transaction.

- [ ] **Step 4: Run tests — expect pass**

```bash
cd api && npm test
```

Expected: all unit + integration tests PASS. Postgres must be up.

- [ ] **Step 5: Manual curl smoke**

```bash
# list page 1
curl -s -H "X-User-Name: Alice" \
  "http://localhost:3001/api/equipment/<EQUIPMENT_ID>/cleaning-records?page=1&pageSize=5"
# audit after an update
curl -s -X PUT -H "X-User-Name: Bob" -H "Content-Type: application/json" \
  -d '{"status":"VERIFIED"}' \
  http://localhost:3001/api/cleaning-records/<RECORD_ID>
curl -s -H "X-User-Name: Bob" \
  http://localhost:3001/api/cleaning-records/<RECORD_ID>/audit
```

- [ ] **Step 6: Commit**

```bash
git add api/src/services/cleaningRecordService.ts api/src/routes api/src/app.ts api/tests
git commit -m "feat: cleaning records with audit trail and pagination"
```

---

### Task 6: Web app — shell, client, acting user, equipment list

**Files:**
- Create: entire `web/` Vite React TS app as listed in File Structure (at minimum: `main.tsx`, `App.tsx`, `index.css`, `api/client.ts`, `context/UserContext.tsx`, `components/ActingAs.tsx`, `pages/EquipmentListPage.tsx`, `components/EquipmentForm.tsx`, `types.ts`)

**Interfaces:**
- Consumes: API at `http://localhost:3001/api` (env `VITE_API_URL`)
- Produces:
  - `api.get/post/put/delete` always attaching `X-User-Name` from context
  - Routes: `/` list, `/equipment/:id` placeholder page OK until Task 7

- [ ] **Step 1: Scaffold Vite app**

```bash
npm create vite@latest web -- --template react-ts
cd web && npm install && npm install react-router-dom
```

`vite.config.ts`: leave defaults; set proxy optional:

```typescript
server: {
  port: 5173,
  proxy: { "/api": "http://localhost:3001" },
}
```

Prefer proxy so client can call `/api/...` with `VITE_API_URL=""` or `VITE_API_URL="http://localhost:3001"`.

- [ ] **Step 2: CSS variables + layout**

`index.css`: industrial palette (slate/steel + one accent that is **not** purple); distinctive font via Google Fonts or system stack with a clear display + body pairing that is not Inter/Roboto. Full-height app shell with header containing brand “Cleen” / “Cleaning Log” and `<ActingAs />`.

- [ ] **Step 3: UserContext + API client**

```typescript
// web/src/api/client.ts
const base = import.meta.env.VITE_API_URL ?? "";

export async function api<T>(
  path: string,
  options: RequestInit & { userName: string } = { userName: "" }
): Promise<T> {
  const { userName, headers, ...rest } = options;
  const res = await fetch(`${base}${path}`, {
    ...rest,
    headers: {
      "Content-Type": "application/json",
      "X-User-Name": userName,
      ...headers,
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? res.statusText);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}
```

Acting-as options: `["Alice", "Bob", "Carol"]`, persisted in `localStorage`.

- [ ] **Step 4: Equipment list + create form**

- Fetch `GET /api/equipment`
- Table/list: name, code, status; row navigates to `/equipment/:id`
- Minimal form: name, code, status → `POST /api/equipment`
- Loading / empty / error states

- [ ] **Step 5: Verify in browser**

```bash
cd web && npm run dev
```

Open `http://localhost:5173` — list shows seed equipment; create works; missing header never happens because ActingAs always set.

- [ ] **Step 6: Commit**

```bash
git add web
git commit -m "feat: React app with equipment list and acting-user header"
```

---

### Task 7: Web — cleaning records, form, audit trail

**Files:**
- Create: `web/src/pages/EquipmentDetailPage.tsx`, `web/src/components/CleaningRecordTable.tsx`, `web/src/components/CleaningRecordForm.tsx`, `web/src/components/AuditTrail.tsx`
- Modify: `web/src/App.tsx` routes

**Interfaces:**
- Consumes: paginated list + audit endpoints from Task 5
- Produces: full equipment detail UX per spec

- [ ] **Step 1: Detail page data flow**

On `/equipment/:id`:
1. Load equipment (`GET /api/equipment/:id`)
2. Load records (`GET .../cleaning-records?page&pageSize&status`)
3. Status filter control + pagination controls
4. Selecting a row sets `selectedRecordId` and loads `GET /api/cleaning-records/:id/audit`
5. Add / Edit opens form; submit `POST` or `PUT`; refresh list + audit

- [ ] **Step 2: Form**

Fields: `cleanedAt` (datetime-local), `method`, `notes`, `status`. Show `cleanedBy` read-only = current acting user. On edit, do not send `cleanedBy`.

- [ ] **Step 3: AuditTrail UI**

For each entry: `changedBy`, formatted `changedAt`, list of `field: old → new` (render `null` as `—`).

- [ ] **Step 4: Manual E2E check**

1. Open equipment with many records — page size works  
2. Filter VERIFIED  
3. Create record as Alice — audit shows create diffs  
4. Switch to Bob, edit status — audit shows Bob + status old→new  

- [ ] **Step 5: Commit**

```bash
git add web/src
git commit -m "feat: cleaning records UI with pagination and audit trail"
```

---

### Task 8: README + NOTES

**Files:**
- Create: `README.md`, `NOTES.md`
- Modify: none required

- [ ] **Step 1: README**

Must include exact commands:
1. Prerequisites (Node 20+, Docker)
2. `docker compose up -d`
3. `cd api && npm install && cp .env.example .env && npx prisma migrate dev && npx prisma db seed`
4. `npm run dev` (API on 3001)
5. `cd web && npm install && npm run dev` (5173)
6. `cd api && npm test`
7. Brief API overview + `X-User-Name` note

- [ ] **Step 2: NOTES**

Cover:
- Why Prisma
- Why offset pagination; when you’d use keyset (and why deferred)
- Header-as-user trade-off
- Cascade delete choice
- Audit in-transaction + pure diff helper
- Deliberately left out (real auth, equipment audit, cursor pagination, containerized Node)
- What you’d do with more time

- [ ] **Step 3: Final verification**

```bash
cd api && npm test
# fresh clone mental check: README steps from empty state
```

Expected: tests green; README steps accurate.

- [ ] **Step 4: Commit**

```bash
git add README.md NOTES.md
git commit -m "docs: add README and NOTES for take-home submission"
```

---

## Spec coverage checklist

| Spec requirement | Task |
|------------------|------|
| Equipment + CleaningRecord + AuditEntry models | 1 |
| Equipment CRUD | 4 |
| Create/update/list cleaning records | 5 |
| Pagination + status filter | 5 |
| Field-level audit + fetch endpoint | 2, 5 |
| React list / records / form / audit | 6, 7 |
| Tests: diff + pagination + audit | 2, 5 |
| Zod validation + error shapes | 3, 4, 5 |
| X-User-Name current user | 3, 5, 6 |
| Docker Compose Postgres | 1 |
| Migration + seed | 1 |
| README + NOTES | 8 |

## Self-review notes

- No TBD placeholders in tasks
- `cleanedBy` always from `changedBy` / header — consistent across Task 5 and Task 7
- Integration tests require Docker Postgres (same as dev)
- Health route intentionally outside `requireUser`; all `/api/equipment` and cleaning routes behind it
