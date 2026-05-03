---
title: progressionStat — localStorage → Dexie Migration Plan
status: planned
owner: solo
last_reviewed: 2026-05-02
applies_to: [post-mvp]
constraint_refs: [C5]
related:
  - data-schema.md
  - persistence-spec.md
  - ../../src/persistence/db.ts
---

# progressionStat Migration Plan

## Problem

Two localStorage keys currently violate **C5** ("localStorage: `lastUsedStudentId` only"):

| Key pattern | Written by | Read by |
|---|---|---|
| `unlockedLevels:<studentId>` | `LevelMapScene.ts` | `LevelMapScene.ts`, `MenuScene.ts` |
| `completedLevels:<studentId>` | `LevelMapScene.ts` | `LevelMapScene.ts`, `MenuScene.ts` |

These keys were added as a pragmatic shortcut during Sprint 0 and are explicitly flagged in CLAUDE.md as a known C5 deviation.

## Target state

A new Dexie table `progressionStats` replaces both keys:

```typescript
interface ProgressionStat {
  id: ProgressionStatId;        // branded UUID
  studentId: StudentId;
  levelNumber: number;
  unlocked: boolean;
  completed: boolean;
  unlockedAt?: Date;
  completedAt?: Date;
}
```

Schema added to `src/persistence/db.ts` as a new table in the next DB version bump.

Repositories:
- `src/persistence/repositories/progressionStatRepository.ts`
- Methods: `getByStudent(studentId)`, `setUnlocked(studentId, level)`, `setCompleted(studentId, level)`

## Migration steps

1. **Bump Dexie schema version** in `src/persistence/db.ts` — add `progressionStats` table.
2. **Write `progressionStatRepository.ts`** — CRUD methods.
3. **Add migration hook** — on DB open, read existing `localStorage` keys for the current student and write them into `progressionStats`, then delete the localStorage keys.
4. **Update `LevelMapScene.ts`** — replace all `localStorage` reads/writes with repository calls.
5. **Update `MenuScene.ts`** — replace all `localStorage` reads with repository calls.
6. **Delete C5 deviation note** from CLAUDE.md once migration is complete.

## Gate criteria

- [ ] `npm run typecheck` clean
- [ ] `npm run test:unit` — persistence repo tests added and green
- [ ] Manual smoke test: complete L1 session → reload → map shows L2 unlocked
- [ ] `localStorage` inspection shows only `lastUsedStudentId` key — no `unlockedLevels:*` or `completedLevels:*`

## Why defer to post-MVP?

The localStorage workaround is functional and non-blocking for the MVP validation question. The migration adds persistence complexity (Dexie version bump, migration hook) that risks introducing bugs during the critical validation sprint. The known deviation is acceptable until validation passes.
