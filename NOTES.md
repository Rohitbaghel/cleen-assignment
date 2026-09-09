# NOTES

## Decisions

**Prisma over raw SQL / TypeORM.** Schema + migrations + seed are first-class, and the data model is small. Reviewers can read `schema.prisma` in one screen. The cost is a bit of ORM magic; the audit path deliberately does *not* hang off Prisma middleware so the diff logic stays plain TypeScript.

**Offset pagination.** The assignment asks for pagination; offset with `page` / `pageSize` / `total` is easy to test and demo. Ordering is `cleanedAt DESC, id DESC` for stable pages. With more time I’d add **keyset (cursor) pagination** for deep pages — offset gets expensive as `OFFSET` grows, and concurrent inserts can shift pages. Cursor on `(cleanedAt, id)` would be the natural next step for a production log.

**Header-as-user (`X-User-Name`).** Stretch “current user” without a User table or JWT. `cleanedBy` on create is always taken from the header (body ignored) so the UI “Acting as” control and the audit `changedBy` cannot disagree. This is not security; it’s attribution for the demo.

**Audit only on cleaning records.** Spec/assignment focus. Equipment changes are not audited. Create writes one audit entry with `oldValue: null` for tracked fields; update writes an entry only when `diffChanges` is non-empty.

**Cascade delete.** Deleting equipment removes its cleaning records and audit entries. Fine for a seedable demo DB; a regulated system would soft-delete or archive instead.

**Docker Compose for the full stack.** `docker-compose up --build` runs Postgres, API (migrate + idempotent seed), and nginx-served React. The UI calls same-origin `/api`; nginx proxies to the API service. Host-run Node remains available for day-to-day coding.

**UI.** Vite + React Router + plain CSS. Industrial slate/green palette, IBM Plex — no component library, no purple-gradient template look.

## Deliberately left out

- Real authentication / sessions / RBAC  
- Soft deletes / archival  
- Equipment audit trail  
- Keyset pagination in code (called out above)  
- Hot-reload volumes in Compose (rebuild for UI/API changes)  
- OpenAPI / generated clients  

## With more time

- Cursor pagination + “why” note in the API response docs  
- Transactional outbox if audit had to fan out to an immutable store  
- Playwright smoke for create → edit → audit visible  
- Tighten Zod error shaping to a shared problem+json style  
- CI workflow running `npm test` against compose Postgres  

## Assumptions

- Operator identity is a free-form display name string.  
- Seeded records may have empty audit history until edited in the UI — audits are produced by API create/update, not by seed.
