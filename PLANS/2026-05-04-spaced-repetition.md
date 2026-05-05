# Plan: Spaced Repetition & Retention Loop

**Date:** 2026-05-04
**Branch (when started):** `feat/2026-05-04-spaced-repetition`
**Status:** Draft — not yet implemented
**Part of:** [2026-05-04-roadmap.md](2026-05-04-roadmap.md) — Phase 2 (Pedagogy depth). Runs after [2026-05-04-progression-mastery-display.md](2026-05-04-progression-mastery-display.md) so the mastery state model is in place.

## Problem

BKT marks a skill `MASTERED` after a streak of unassisted-correct answers. The app currently has no mechanism to revisit that skill afterwards. This is the single largest unrealized pedagogy lever:

- **Mastered ≠ remembered.** Forgetting curves are real for K–2 children — concepts that look mastered at the end of a session are frequently lost a week later.
- **No review queue.** The level structure assumes sequential mastery and forward progress. There is no path that says "you mastered halves last week — let's check that's still true before we go deeper into thirds."
- **Linear progression risks ceiling effects.** A child who plateaus at L4 has nothing productive to do; they cannot deepen earlier mastery.

A lightweight resurfacing policy (mastered skills reappear at increasing intervals) would substantially change the learning outcome with modest engineering effort.

## Goals

1. Each `MASTERED` skill enters a review schedule with intervals 1d → 3d → 7d → 21d → 60d (lightweight Leitner / Anki-style).
2. Sessions begin with a short review block (≤ 3 questions) drawn from due skills before the level's regular content. Optional, skippable, but on by default.
3. A miss in review demotes the skill back to `LEARNING` and resets the interval to 1d.
4. Review questions reuse existing curriculum content; no new authoring required for the first ship.
5. UX is ceremony-light — review feels like part of the level, not a quiz, with explicit "Warm-up complete!" celebration before the new content begins.

## Non-goals

- A full SM-2 / FSRS-style spaced-repetition engine. Overkill for K–2 with 9 levels.
- Cross-device sync of the schedule (C1).
- Notification push to remind a child to come back (privacy + parent-consent surface; out of MVP).
- Standalone "review only" mode at the menu — defer; the warm-up block is enough for Phase 1.

## Definition of done

- New table `reviewSchedule` in Dexie holding `{ studentId, skillId, intervalDays, dueAt, lastReviewedAt }`.
- BKT integration: `MASTERED` transition writes a schedule row at interval=1d.
- Level entry runs `selectDueReviews(studentId, levelContext)` and inserts review questions ahead of the regular block.
- Miss-in-review demotes skill → `LEARNING`, schedule reset to 1d.
- Warm-up UX implemented: small banner at level start "Warm-up: 3 questions to remember", celebration overlay after.
- Unit + integration tests cover the schedule math and the demotion path.
- Visual baseline of the warm-up banner and celebration at 360 px.

---

## Phases

### Phase 1 — Schema + scheduler (gate: unit + repo tests green)

- Add Dexie table `reviewSchedule` with index on `dueAt` and composite `[studentId+skillId]`. Per the 2026-05-02 keyPath learning, this is a fresh store — no migration drama.
- Add `src/engine/reviewScheduler.ts`:
  - `scheduleReview(studentId, skillId, opts?)` — writes/updates a row.
  - `selectDueReviews(studentId, opts: { now, max, eligibleSkills })` — pure read, returns up to `max` skills sorted by `dueAt` ascending.
  - `recordReviewOutcome(studentId, skillId, correct, assisted)` — advances or resets the interval.
- Pure logic; no Phaser. Determinism per the engine port rule (`now` injected, never `Date.now()` directly).
- Unit tests cover: scheduling, due-selection, demotion on miss, no-op on assisted-correct (assistance never advances the interval).

### Phase 2 — BKT hook (gate: integration green)

- Wrap `bkt.updateMastery` so any `LEARNING → MASTERED` transition calls `scheduleReview` with interval=1d.
- A `MASTERED → LEARNING` regression (via miss-in-review) clears the schedule row.
- Test: a scripted run that masters a skill, advances clock by 1d, runs `selectDueReviews`, and confirms the skill is offered.

### Phase 3 — Level entry warm-up (gate: E2E green)

- `LevelScene` and `Level01Scene` on entry call `selectDueReviews` with the eligible skill set for that level (skills the level has historically taught — stored on `LEVEL_META`).
- If due reviews exist, prepend up to 3 questions drawn from prior questions in the curriculum that exercise those skills.
- UX:
  - Mascot speech: "Quick warm-up — 3 questions to remember!"
  - Mini progress bar (3 dots) at the top of the level.
  - On all 3 correct: celebratory "Warm-up complete!" overlay (1 s, reduced-motion-safe), then the regular level block begins.
  - On any miss: still proceed but the missed skill is demoted (per Phase 1 logic). No punitive UI — the warm-up just continues.
- Skip CTA: small "skip" link bottom-right; tapping skips the warm-up and goes straight to the regular level. Persisted-per-session, not permanently — so children can have a quick path on repeat sessions but the warm-up returns the next day.

### Phase 4 — Review question selection quality (gate: heuristic doc'd)

The first ship reuses existing curriculum questions. The selection heuristic:

- Prefer questions the student has answered correctly before (success memory; not punitive).
- Avoid the exact question they last saw for that skill (rotate within the pool).
- If the curriculum has < 3 questions per skill, allow exact repeats but log it (prompts plan 7 to expand).

Document the heuristic in `docs/10-curriculum/spaced-repetition.md`.

### Phase 5 — Settings affordance (gate: SettingsScene + a11y green)

- Add a "Warm-ups" toggle in SettingsScene. Default on. Off disables warm-ups entirely. Persists via `src/lib/preferences.ts`.
- Copy: "Quick review at the start of each level." No jargon ("spaced repetition" never appears in user-facing copy).

### Phase 6 — Reporting in the mastery summary (gate: integration green)

Coordinates with the progression-mastery-display plan: extend the end-of-level mastery summary to mark skills as "kept fresh" if a successful review occurred this session. Small trophy icon next to the skill chip.

### Phase 7 — Phase-close docs (gate: PR merged)

- `docs/10-curriculum/spaced-repetition.md` with the full schedule policy.
- Update `docs/30-architecture/data-schema.md` with the new table.
- Append to `.claude/learnings.md`: "Mastered ≠ remembered. The warm-up loop is a 1-day → 60-day Leitner; demote-on-miss is non-negotiable to prevent false-mastery cementing."
- Run `npm run sync:claude-md`.

---

## Risk / rollback

- **Risk:** Children who repeatedly miss warm-ups feel demoralised. Mitigate by capping warm-up at 3 questions, never gating progress on it, and keeping language affirming ("warm-up", not "review", not "test").
- **Risk:** Schedule grows without bound on a heavy player. Mitigate via index on `dueAt` + a 60-day max interval cap.
- **Risk:** Reusing existing questions causes pattern memorisation. Phase 4 heuristic addresses this; pilot data may motivate generating dedicated review variants later.
- **Rollback:** Phase 2 hook can be disabled at the wrapper level; warm-up UX in Phase 3 is behind the Settings toggle. Default-off rollback is a one-line config flip.

## Out-of-scope follow-ups

- Adaptive interval tuning per child (FSRS-style) — defer until pilot data justifies.
- Cross-skill correlation (mastering halves should affect the schedule of related comparisons). Defer.
- Notifications — privacy + consent surface.
