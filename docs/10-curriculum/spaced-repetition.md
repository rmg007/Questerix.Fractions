# Spaced Repetition & Retention Loop

**Implemented:** 2026-05-04  
**Branch:** `feat/2026-05-04-spaced-repetition`

---

## Overview

BKT marks a skill `MASTERED` after a streak of unassisted-correct answers. A mastered skill immediately enters a **Leitner-style review schedule** so it resurfaces at increasing intervals before the student forgets it.

This system adds no new question content — it reuses existing curriculum templates.

---

## Review Schedule Policy

| Interval | Meaning |
|---|---|
| 1 day | First review after mastery |
| 3 days | Passed first review |
| 7 days | Passed second review |
| 21 days | Passed third review |
| 60 days | Near-permanent retention |

**Advance rule:** correct answer *without* hint assistance → move to next interval.  
**Reset rule:** incorrect answer *or* correct with hint assistance → reset to 1-day interval.

The 60-day cap is the maximum interval. A skill stays at 60 days until it is missed, at which point it demotes to 1 day.

---

## BKT Integration

- `LEARNING → MASTERED` transition: creates a `ReviewSchedule` row with `intervalDays = 1`.
- `MASTERED → LEARNING` regression (miss-in-review): deletes the row (next correct run will recreate it at interval 1).
- Hook lives in `src/lib/masteryTransitionHook.ts`; called from `recordAttemptAndMasteryForLevel`.

---

## Level Entry Warm-Up

At the start of every level, `loadWarmUpTemplates()` checks for due reviews:

1. Fetch all `ReviewSchedule` rows for the student (`reviewScheduleRepo.getAllForStudent`).
2. Filter to rows where `dueAt ≤ now`, sorted by most-overdue first.
3. Select up to **3** due skills.
4. For each due skill, find a matching `QuestionTemplate` in the Dexie `questionTemplates` store (first match by `skillIds` membership).
5. Prepend the matched templates to the `warmUpPool` before the level vignette.

---

## Review Question Selection Heuristic

**Current (Phase 4 — Ship 1):** first-match in the Dexie template store by skill ID.

This means:
- The template selected is whichever `questionTemplates` row appears first in the store for that `skillId` (determined by bulk-put order from the curriculum pipeline).
- Repeated reviews of the same skill may show the same question until the curriculum expands.

**Guardrails:**
- Duplicate templates are deduplicated (`result.some(r => r.id === match.id)` check).
- If the skill has no matching template (e.g., skill ID uses the dot-format fallback `skill.level_N`), the skill is silently skipped. The warm-up shrinks but never errors.

**Planned improvements (Phase 7+ follow-up):**
- Prefer questions the student has previously answered *correctly* (success-memory heuristic — not punitive).
- Avoid the exact question ID last seen for that skill (rotation within the pool).
- Log when `< 3` templates exist per skill to prompt pipeline expansion.

---

## UX

- **Mascot speech:** "Quick warm-up — N question(s) to remember!" fires 400ms after the level vignette completes.
- **Warm-up complete overlay:** `showWarmUpCompleteOverlay()` in `src/lib/levelSceneWarmUp.ts` — 240ms fade-in → 600ms hold → 400ms fade-out. Reduced-motion: instant transition.
- **Skip CTA:** "skip warm-up →" bottom-right. Tapping clears the warm-up pool and resets session counters so only regular questions count toward the session goal.
- Session counters (`attemptCount`, `correctCount`) are reset when transitioning from warm-up to regular play so warm-up answers do not count toward the 5-question session goal.

---

## Data Model

```
reviewSchedule (Dexie table, version 12)
  PK:  [studentId+skillId]   (composite)
  IDX: dueAt, studentId
  
  studentId:      StudentId (branded)
  skillId:        SkillId   (branded)
  intervalDays:   1 | 3 | 7 | 21 | 60
  dueAt:          number    (epoch ms)
  lastReviewedAt: number    (epoch ms)
```

See `docs/30-architecture/data-schema.md` for the full schema.

---

## Files

| File | Role |
|---|---|
| `src/engine/reviewScheduler.ts` | Pure scheduling logic (`buildInitialSchedule`, `selectDueReviews`, `computeReviewOutcome`) |
| `src/persistence/repositories/reviewSchedule.ts` | Dexie CRUD wrapper |
| `src/lib/masteryTransitionHook.ts` | BKT bridge: creates/deletes schedule rows on state transitions |
| `src/lib/levelWarmUp.ts` | `loadWarmUpTemplates()` — queries due reviews, finds matching templates |
| `src/lib/levelSceneWarmUp.ts` | Phaser UI: overlay + skip button |
