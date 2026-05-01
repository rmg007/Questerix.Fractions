# persistence/ — Dexie 4 IndexedDB Layer

All progression data lives here. localStorage is **not** an option (C5).

## Files

- `db.ts` — Dexie schema. Versioned migrations via `db.version(N).stores(...).upgrade(tx => ...)`. Bump the version when changing indexes.
- `repositories/<entity>.ts` — one file per entity, exporting CRUD-style functions over a single Dexie table. Pure data access; no business logic.
- `backup.ts` — JSON export/import for the "Backup my progress" UI.
- `middleware.ts` — write-through hooks for telemetry + dirty-tracking.
- `lastUsedStudent.ts` — the one allowed localStorage interaction (`lastUsedStudentId` key only).

## Rules

- **Always use branded IDs** from `src/types/branded.ts` in repository signatures. Don't accept `string` for entity IDs.
- **No `Math.random` for IDs.** Use `crypto.randomUUID()` (see existing repos).
- **Schema changes require a version bump in `db.ts`.** Add an `upgrade(tx => ...)` for any non-additive change. Test with `fake-indexeddb` (already a devDep).
- **Repositories return plain objects, not Dexie `Table` references.** Callers should not need to know about Dexie.
- **No Phaser imports here.** This layer must be testable in Node.

## Adding a new entity

1. Add the type in `src/types/entities.ts`.
2. Add a table to `db.ts` with appropriate indexes; bump the version.
3. Create `repositories/<entity>.ts` exporting the needed operations.
4. Re-export from `repositories/index.ts` if you have one, or wire callers directly.
5. Add unit tests; use `fake-indexeddb/auto` to set up a real Dexie instance in tests.

## Extend rows before adding tables

Before introducing a new entity, ask: can this be a new field on an existing row? Per-level counters, scalar flags, or per-student-per-level maps belong on the existing entity row (`Record<number, number>` on `LevelProgression`, a boolean on `DevicePreferences`, etc.) — **not** in a new table. Mark the new field **optional** in the type so existing rows from earlier schema versions still validate; readers normalise the absent case (`?? {}` / `?? false`). Reach for a new table only when the data has its own lifecycle, query needs, or write cadence.

## C5 status

As of 2026-05-01, all known localStorage uses outside the documented `lastUsedStudentId` exception have been migrated to IndexedDB:

- `unlockedLevels:<studentId>` and `completedLevels:<studentId>` — migrated to `levelProgression` table (v6)
- `questerix.streak:<studentId>` — migrated to `streakRecord` table (v7)
- `questerix.onboardingSeen` — migrated to `DeviceMeta.onboardingComplete` field (v7)
- `DEBUG_VITALS` (dev flag) — moved to `sessionStorage` (session-scoped, not progress data)

Migration is handled by upgrade callbacks in `db.ts` (best-effort; tolerates absent localStorage). Run `/c5-check` to verify the constraint holds — only `lastUsedStudentId` should appear.
