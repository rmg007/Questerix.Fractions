# Plan: Multi-Student Switching & First-Run UX

**Date:** 2026-05-04
**Branch (when started):** `feat/2026-05-04-multi-student-and-first-run`
**Status:** COMPLETED 2026-05-06 — FirstRunScene + StudentSwitcher registered; multi-student flow merged
**Part of:** [2026-05-04-roadmap.md](2026-05-04-roadmap.md) — Phase 2. Independent of pedagogy plans; can run in parallel with plans 4–6.

## Problem

The app stores `lastUsedStudentId` in localStorage (the only allowed key per C5) and assumes a single child per device. Real households break this:

- **Siblings share the tablet.** Today the second child overwrites the first child's session because the menu auto-resumes whoever was last.
- **First-run is invisible.** The first time the app loads, the child does not know what to do. The `OnboardingScene` triggers, but only after some pre-state is set up that does not exist on a clean device.
- **No "different child" affordance** at the menu — the child cannot say "this is me, not my brother".
- **Name editing is missing.** A typo at first-run sticks forever.
- **Re-install / new device** — there is no "this is the same child as before" path because there is no account (C1). Acceptable, but the UX should clarify what is happening so the child does not feel they lost their progress.

The current behavior is acceptable for solo testing; it will fail the moment the app reaches a household pilot.

## Goals

1. Up to 4 student profiles per device, switchable from the menu in two taps.
2. First-run flow that introduces the mascot, asks for the child's name (optional, skippable), and explains the no-account model in one sentence the child can read.
3. Adding / renaming / removing a profile is reachable from Settings.
4. `lastUsedStudentId` continues to govern auto-resume, but the menu always shows a "switch student" affordance.
5. No new localStorage keys (C5). Profiles persist as Dexie `student` rows.

## Non-goals

- Cloud sync between devices (C1).
- Parental PIN protection on profile creation. Defer; pilot data will show whether children abuse it.
- Photo / avatar upload. Defer; use a small set of pre-made avatars.
- Account recovery / merging two profiles.

## Definition of done

- StudentSwitcher component exists, mounted in MenuScene corner.
- FirstRunScene replaces today's "OnboardingScene first" path; OnboardingScene continues to teach the partition mechanic.
- Profile creation / rename / delete in SettingsScene works at 360 px with all touch targets ≥ 44×44.
- A11yLayer covers the entire flow.
- No localStorage churn beyond `lastUsedStudentId`.
- Visual baselines committed for the new screens.

---

## Phases

### Phase 1 — Profile model + persistence (gate: unit + repo tests green)

- Confirm `student` table in Dexie schema has the fields needed (id, displayName, avatar, createdAt, lastSeenAt). Extend with `avatar: AvatarKey` if missing — this is an indexed field if we ever query by it (we don't), so a non-indexed addition is fine and avoids the schema-bump trap from the 2026-05-02 keyPath learning.
- Add `studentRepo.list()`, `.create({displayName?, avatar?})`, `.rename(id, displayName)`, `.remove(id)`.
- Cap profiles at 4 (UI policy, not schema).
- Unit tests for create / list / rename / remove + cap enforcement.

### Phase 2 — FirstRunScene (gate: E2E + a11y green)

Decision tree on app launch:

1. `studentRepo.list()` empty AND `lastUsedStudentId` absent → **FirstRunScene**.
2. `studentRepo.list()` non-empty AND `lastUsedStudentId` matches a row → MenuScene with that student active.
3. `studentRepo.list()` non-empty AND `lastUsedStudentId` missing or mismatched → MenuScene with the SwitcherSheet open.

FirstRunScene flow:

1. Mascot enters with a wave. Reduced-motion: appears in place.
2. Speech: "Hi! I'm [Mascot]. What should I call you?" with a name field (optional, max 20 chars, child-safe character allowlist) + "Skip" CTA.
3. Avatar picker: 6 pre-made avatars in a 2×3 grid, ≥ 56 × 56 each (above the 44 minimum because picking is harder than tapping).
4. "Where's my progress?" plain-text micro-FAQ (one line, not a modal): "Your progress lives only on this tablet."
5. "Let's go" → creates the student row, sets `lastUsedStudentId`, transitions to OnboardingScene which teaches the partition mechanic as today.

Coordination: the touch-target sizes use the helper from [2026-05-04-button-hit-regions.md](2026-05-04-button-hit-regions.md); the entrance tween uses `motion.ts` from [2026-05-04-interaction-and-motion-system.md](2026-05-04-interaction-and-motion-system.md).

### Phase 3 — Student switcher in MenuScene (gate: E2E green)

- Top-right corner: avatar chip showing the active student. Tap → SwitcherSheet.
- SwitcherSheet bottom-anchored at 360 px, side panel ≥ 768 px:
  - Active student row at the top with checkmark.
  - Other student rows (avatar + name + last-seen).
  - "Add a child" CTA (only shown if profiles count < 4).
- Switching: tap a row → `lastUsedStudentId` updates → MenuScene refreshes BKT / progress for that student → smooth cross-fade.
- Visual baseline at 360 px.
- Reduced-motion: instant transition, no cross-fade.

### Phase 4 — Profile management in SettingsScene (gate: E2E + a11y green)

- New "Children" section in SettingsScene listing all profiles.
- Per row: rename (inline edit, max 20 chars), change avatar, remove.
- Remove flow: confirmation step naming what gets deleted ("All progress for [name] will be erased on this tablet"). After confirm, deletes student row + cascading attempt / hint / mastery rows via the repo cascade helper (add this if not present).
- "Add a child" duplicates the avatar+name picker from FirstRunScene.

### Phase 5 — Re-install / shared device messaging (gate: copy reviewed)

- One-line micro-FAQ surfaced at FirstRunScene Phase 2 step 4, AND from a "?" affordance in the Children settings section.
- Copy: "Your progress lives only on this tablet. If you reinstall the app or get a new tablet, your progress starts fresh."
- This is the C1 trade-off made plain. It is more important to not surprise the child than to obscure it.

### Phase 6 — Phase-close docs (gate: PR merged)

- Append to `.claude/learnings.md`: "First-run flow must own student creation; OnboardingScene teaches the mechanic and assumes a student already exists. Don't conflate them."
- Update `docs/30-architecture/data-schema.md` with the cascade-delete cascade rules.
- Update `src/persistence/CLAUDE.md`.
- Run `npm run sync:claude-md`.

---

## Risk / rollback

- **Risk:** Children create profiles experimentally and hit the cap of 4. Mitigate by making "remove" reachable and the cap UI clear; revisit cap if pilot data shows abuse.
- **Risk:** A child accidentally deletes a sibling's profile. Mitigate via the named confirmation step. Pilot data may motivate a parental PIN — explicitly out of scope here.
- **Risk:** SwitcherSheet covers important menu controls at 360 px. Mitigate by bottom-anchoring with safe-area inset awareness; visual baseline is the regression net.
- **Rollback:** Phases 2–4 each ship as one PR; revert reverts to the current single-student behavior, which is functional.

## Out-of-scope follow-ups

- Parental PIN, time limits, parent-mode (revisit if households need it; out of MVP per C2).
- Avatar customisation beyond the 6-set.
- Profile photos (privacy + moderation overhead, not worth it).
- Cross-device sync (C1).
