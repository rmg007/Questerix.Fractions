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

## Known C5 deviation

`MenuScene.ts` and `LevelMapScene.ts` currently read/write `unlockedLevels:<studentId>` and `completedLevels:<studentId>` keys in localStorage. This is a TODO: those should move to a Dexie `progressionStat` row. Until then, do not extend the localStorage usage further.
