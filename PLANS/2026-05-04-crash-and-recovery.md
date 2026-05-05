# Plan: Crash, Corruption & Recovery UX

**Date:** 2026-05-04
**Branch (when started):** `feat/2026-05-04-crash-and-recovery`
**Status:** Draft — not yet implemented
**Part of:** [2026-05-04-roadmap.md](2026-05-04-roadmap.md) — Phase 1. Independent of plans 1–3; runs in parallel.

## Problem

Failure modes today are silent or catastrophic:

- **Phaser scene throws** → blank canvas, no recovery path. The child sees nothing and assumes the device is broken.
- **Dexie/IndexedDB corruption** → load throws on boot; no fallback, no "start fresh?" UI. The 2026-05-02 keyPath learning shows this is a *known* sharp edge in our schema migrations.
- **Asset 404 during preload** → PreloadScene hangs at the loading bar with no error.
- **Curriculum bundle parse error** → game boots into an empty MenuScene; level cards do nothing.
- **Audio fails to load** → silent failure; no fallback to text-only mode.

For K–2 children these failures are not "an error message they can read" — they are "the game is broken, give up". A solo-validation project shipping to real children needs graceful degradation.

## Goals

1. Every uncaught exception in scenes / components is intercepted and rendered as a child-readable recovery screen.
2. Persistence corruption is detected on boot, the user is offered "continue with last backup" / "start fresh" — never a hard crash.
3. Asset / curriculum load failures degrade rather than freeze.
4. Recovery telemetry (anonymised, env-gated) records the failure mode so future hardening is data-driven.
5. Recovery flows are themselves keyboard-accessible and reduced-motion-safe — a child who hits an error path is not also locked out.

## Non-goals

- Sentry-style remote crash reporting (already plumbed env-gated; this plan does not turn it on by default).
- Retrying failed network requests indefinitely. Bounded retries only.
- Recovering corrupt content rows (e.g., a malformed question). The runtime skips them; pipeline owns prevention.

## Definition of done

- Top-level error boundary in `src/main.ts` catches Phaser-thrown exceptions and renders `RecoveryScene`.
- Boot-time DB integrity probe runs in `BootScene`; on failure routes to `DBRecoveryScene`.
- PreloadScene exposes a load-failure path with retry + skip-to-fresh-state.
- All three recovery screens have Playwright + a11y coverage.
- A scripted "kill the DB" test (corrupt the keyPath store) ends in the user landing on `MenuScene` with a working app — not a crash.

---

## Phases

### Phase 1 — Top-level error boundary (gate: scene-throw lands on RecoveryScene)

- Wrap the Phaser game `boot` and each scene's `update` / event hooks in a try/catch that forwards to `src/lib/recovery/recoveryBus.ts`.
- `RecoveryBus.report({kind, error, scene})` emits to `errorReporter` (env-gated, dormant by default per C1) and routes to `RecoveryScene`.
- New `src/scenes/RecoveryScene.ts`:
  - Mascot in concerned pose with simple copy ("Something went wrong. Want to try again?").
  - Two CTAs: "Try again" (reload the originating scene) and "Back to menu" (start MenuScene with state cleared).
  - A11yLayer registered. Reduced-motion-safe entrance.
- Playwright spec: throw inside `Level01Scene.update`; assert the user lands on RecoveryScene with both CTAs working.

**Files to touch:** `src/main.ts`, `src/scenes/RecoveryScene.ts` (new), `src/lib/recovery/recoveryBus.ts` (new).

### Phase 2 — DB integrity probe + recovery (gate: corruption test lands user safely)

- `src/persistence/integrity.ts` exports `probe(): Promise<'ok' | { corrupt: true; reason: string }>`. On boot, reads one row from each store and checks expected shape.
- `BootScene` runs `probe()` before transitioning to `PreloadScene`. On `corrupt`:
  - Route to `DBRecoveryScene`.
  - Offer 3 actions: (a) "Continue with last backup" (read from `backup` rows if available), (b) "Start fresh" (calls Dexie `delete()` → recreate; preserves `lastUsedStudentId` so the child keeps their name), (c) "Cancel" (closes app to OS).
  - For action (a), restore is best-effort: if backup is also corrupt, fall through to (b) with the user warned.
- Test: a unit test programmatically corrupts a row keyPath and asserts the probe reports it; an integration test runs the full corruption → recovery → MenuScene path.

**Files to touch:** `src/persistence/integrity.ts` (new), `src/persistence/db.ts` (export DB delete helper), `src/scenes/BootScene.ts`, `src/scenes/DBRecoveryScene.ts` (new).

### Phase 3 — Preload failure path (gate: asset 404 lands recovery, not freeze)

- `PreloadScene` registers `loaderror` handler. After 3 retries with exponential backoff (1s → 2s → 4s) on the same asset, route to `RecoveryScene` with kind `'preload'`.
- Distinguish curriculum-bundle failure (critical, no continue) from cosmetic asset failure (e.g., an optional decoration). Cosmetic failures log a warning and continue with a placeholder.
- Add a Playwright spec that intercepts the curriculum bundle request and returns 500; assert recovery flow.

### Phase 4 — Curriculum schema-fail safe mode (gate: malformed bundle does not break MenuScene)

- Wrap curriculum load in a schema validation pass (already exists in `validate:curriculum`; reuse the runtime side).
- On schema failure, present a "Content needs to be reloaded" RecoveryScene variant with a reload CTA.
- Per-question malformed entry: skip the question (log warning); ensure the scene does not crash if a level has fewer questions than expected. Add a unit test where one question is null.

### Phase 5 — Audio degradation (gate: no-audio mode works end-to-end)

- Coordinate with `PLANS/audio.md`: if the audio sample bundle fails to load or the device blocks autoplay, the app must continue without audio. The `feedbackBus` from the interaction-and-motion-system plan already routes through audio + visual + motion; audio failure should silently mute that channel without stopping the others.
- Add an Playwright spec that blocks the audio bundle URL and runs L1 to completion.

### Phase 6 — Recovery telemetry + dashboard (gate: env-gated emission verified)

- When `VITE_OTLP_URL` is set, `recoveryBus` emits a span with `recovery.kind`, `recovery.scene`, `recovery.action_taken`. Default builds emit nothing per C1.
- Document the schema in `docs/30-architecture/recovery-telemetry.md`.
- Add a local-only debug overlay (`?debug=recovery` query param) that shows the in-memory recovery log — useful during pilot testing.

### Phase 7 — Phase-close docs (gate: PR merged)

- Append to `.claude/learnings.md`: "Boot path must always reach a working scene — even if every persistence read fails. The child sees the menu, never a blank canvas."
- Update `src/persistence/CLAUDE.md` and create `src/lib/recovery/CLAUDE.md`.
- Update `docs/30-architecture/data-schema.md` with the integrity probe and recovery actions.
- Run `npm run sync:claude-md`.

---

## Risk / rollback

- **Risk:** Recovery UX itself has bugs that mask the underlying failure during dev. Mitigate by having a `?debug=throw` query param that surfaces the underlying error to the dev console even on the recovery screen.
- **Risk:** "Start fresh" deletes a child's progress without consent. Mitigate via a confirmation step + an export-to-file option (uses the existing backup mechanism).
- **Rollback:** Each phase is one PR. Recovery scenes are additive; reverting them returns to current crash behavior, which is no worse than before.

## Out-of-scope follow-ups

- Crash reporting cloud-side dashboard (revisit when pilot data warrants).
- Automatic backup rotation policy (current backup behavior is sufficient until pilot data shows otherwise).
- Multi-device sync recovery (out of scope under C1).
