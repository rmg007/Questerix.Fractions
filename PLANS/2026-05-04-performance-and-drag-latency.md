# Plan: Performance & Drag Latency (Frame Rate + Input Responsiveness)

**Date:** 2026-05-04
**Branch (when started):** `perf/2026-05-04-performance-and-drag-latency`
**Status:** Draft — not yet implemented
**Part of:** [2026-05-04-roadmap.md](2026-05-04-roadmap.md) — Phase 1. Runs after [2026-05-04-interaction-and-motion-system.md](2026-05-04-interaction-and-motion-system.md) so measurements use the unified gesture grammar.

## Problem

Plan 1 fixes hit-area *correctness*. Nothing in the current set fixes drag *responsiveness*. On the realistic K–2 hardware target (a $50 Android tablet with a low-power GPU) the experience can degrade in three failure modes:

1. **Drag latency.** From `pointermove` to visual update, the budget is one frame at 60 fps = 16.6 ms. Anything > 50 ms feels "sticky" to a child. The current archetype implementations re-render on every move with no batching audit.
2. **Frame rate dips.** Phaser scenes with many tweens (`SessionCompleteOverlay` ceremony, `HintLadder` tier transitions, `Mascot` idle loop) regularly miss frames on low-end Android. There is no FPS budget asserted in CI.
3. **Memory growth across scene transitions.** `start(SceneKey)` does not always tear down listeners cleanly. After 30 minutes of menu↔level↔menu the GC pauses become user-visible. No instrumentation tracks it.

Smooth UX depends on solving all three. A child who sees their finger drift away from the dragged object stops trusting the input.

## Goals

1. P95 pointer-to-paint latency ≤ 50 ms across all 5 drag-bearing archetypes (`Partition`, `SnapMatch`, `Make`, `Placement`, `Benchmark`, `Order`) on a budget device profile.
2. P95 frame time ≤ 20 ms (≥ 50 fps) during steady-state gameplay; never worse than 33 ms (≥ 30 fps) during ceremony tweens.
3. Heap growth ≤ 5 MB across 50 scene transitions in a soak test; zero retained Phaser scenes after teardown.
4. Cold start (boot → MenuScene interactive) ≤ 2.5 s on a budget device on a fast 4G connection.
5. CI asserts the above as gates; regressions block merge.

## Non-goals

- Re-architecting the renderer. Phaser 4 stays per C4.
- Optimising load time below 1.5 s — diminishing returns and not the user pain point.
- Replacing IndexedDB with something faster. Dexie 4 stays.

## Definition of done

- A budget device profile exists (CPU 4× throttle, GPU low, 256 MB Phaser memory cap) and is run in CI Playwright.
- Drag latency, FPS, heap, and cold start are measured and asserted at gate values.
- A perf dashboard (Markdown table in `audit/perf-baseline.md`) records the numbers per release; regressions visible at a glance.
- `npm run perf` script runs the suite locally in under 3 minutes.

---

## Phases

### Phase 1 — Instrumentation (gate: traces flowing locally, no perf changes yet)

- Add `src/lib/perf/traceFrame.ts`: wraps `requestAnimationFrame` to record per-frame duration into a ring buffer; exposes `getFrameStats()` for tests.
- Add `src/lib/perf/traceInput.ts`: stamps `pointermove` events with `performance.now()` and pairs them with the next paint timestamp (via `requestAnimationFrame` after the scene's update tick) to compute pointer-to-paint latency.
- Add `src/lib/perf/traceHeap.ts`: where `performance.memory` is available (Chromium), samples `usedJSHeapSize` once per scene transition and writes to the ring buffer.
- All three are **dev/test only** — tree-shaken out of production builds via a `import.meta.env.DEV` guard. Bundle delta: 0 in production.
- Unit tests confirm ring buffer correctness and that production bundle has zero references to these modules.

### Phase 2 — Baseline measurement (gate: numbers committed to audit/)

- Playwright spec `tests/perf/baseline.spec.ts` runs with CPU throttle 4× and:
  - Boots the app, records cold start (boot → MenuScene `'create'` event).
  - Plays scripted L1 (10 questions) and records frame stats + pointer-to-paint per archetype.
  - Loops menu↔L1↔menu 50 times and records heap delta.
- Output: `audit/perf-baseline.md` with the matrix `{ device-profile × scenario × P50/P95 }`.
- This is the read before we tune; commit it before touching any optimization.

### Phase 3 — Drag input pipeline tuning (gate: P95 latency ≤ 50 ms)

Common smells to find and fix in the drag-bearing archetypes:

- **Per-move full-redraw of decorative geometry.** `PartitionInteraction` redraws all partition lines on every move when only the active line changes. Split into a static layer + an active-line layer; only repaint the active layer.
- **Synchronous validator calls during drag.** Some archetypes call `validate()` on every move to update a "would this be correct?" hint. Move to debounced (per `Gesture.fingerRestTolerancePx` from plan motion-system) or to drag-end only.
- **Text re-layout on drag.** Phaser `Text` is expensive to mutate. Prefer `BitmapText` for any label that updates during drag.
- **Container `setPosition` cascading layout.** Where a parent container holds many children that don't move, hoist the dragged child to a sibling layer so the parent's layout cost doesn't fire.

Each archetype gets a per-archetype PR with a Playwright assertion `expect(p95Latency).toBeLessThan(50)`.

### Phase 4 — Tween budget & frame-rate guard (gate: P95 frame ≤ 20 ms)

- Audit every `tween()` call (now centralized via `motion.ts` from the interaction-and-motion-system plan). Identify any ceremony scene with > 6 simultaneous tweens; cap or stagger.
- Use `scene.tweens.killTweensOf` aggressively in scene-transition hooks so leftover tweens from the prior scene don't cost frames in the new one.
- Move idle-loop animations (`Mascot.ts` breathing, `LevelMapScene` node pulse) onto a low-priority frame budget — pause when the scene is occluded by an overlay.
- Add a CI Playwright assertion that the SessionComplete ceremony stays ≥ 30 fps under throttle.

### Phase 5 — Scene teardown & leak hunt (gate: heap delta ≤ 5 MB / 50 transitions)

The classic Phaser leaks:

- DOM listeners added to `window`/`document` from `A11yLayer` not removed in `destroy`.
- Tween targets pointing at destroyed game objects keep references alive until tween completion.
- Event emitters (`scene.events.on`, `game.events.on`) added without paired `off` in `shutdown`.
- IndexedDB transactions held open across navigation.

Steps:

- Add a teardown contract in `src/scenes/utils/sceneLifecycle.ts`: every scene must implement `cleanupHooks: Array<() => void>` and the helper invokes them on `'shutdown'` and `'destroy'`. `A11yLayer.popLayer()` is the canonical example.
- Sweep every scene; convert ad-hoc cleanup to `cleanupHooks` registration.
- Add a soak test that runs the menu↔level↔menu loop 50× and asserts heap delta ≤ 5 MB.

### Phase 6 — Cold start optimisation (gate: ≤ 2.5 s on budget profile)

- Defer `src/lib/observability/**` import: it's dormant unless env flags are set, but it still parses on boot. Lazy-load on first user-triggered telemetry event.
- Defer `errorReporter` until the first error or DSN-set check.
- Move the curriculum bundle import behind a dynamic `import()` so the boot path doesn't pay for it before MenuScene renders.
- Audit `BootScene.ts` and `PreloadScene.ts` for sync work that can move post-first-paint.
- Coordination: this overlaps the bundle-splitting plan ([2026-05-04-bundle-splitting-and-cold-start.md](2026-05-04-bundle-splitting-and-cold-start.md)). That plan owns the route-level chunking; this phase owns the boot-path-only deferrals.

### Phase 7 — CI gates + dashboard (gate: PR merged with dashboard)

- Add `npm run perf` script that runs the perf suite locally.
- Add a CI job (`perf-baseline.yml`) that runs against budget profile and posts a comment to the PR with delta vs. main.
- Add `audit/perf-baseline.md` template with rolling 5-release history.
- Document the gate values in `docs/30-architecture/performance-budget.md` (extend the existing doc, don't create a parallel one).

### Phase 8 — Phase-close docs (gate: PR merged)

- Append to `.claude/learnings.md`: a one-liner capturing the most-impactful smell found (e.g., "Phaser `Text` mutation during drag was the worst latency offender — switch to `BitmapText` for any drag-time label").
- Update `src/engine/CLAUDE.md` and `src/scenes/CLAUDE.md` if drag patterns changed.
- Run `npm run sync:claude-md`.

---

## Risk / rollback

- **Risk:** CI throttle profile drifts away from real budget hardware. Mitigate by recalibrating quarterly against a physical reference device (covered by [2026-05-04-cross-browser-and-device-matrix.md](2026-05-04-cross-browser-and-device-matrix.md) Phase 4).
- **Risk:** Optimization changes alter visual output (e.g., switching `Text` → `BitmapText` rendering subtly differs). Mitigate via plan 3 visual baselines as the regression net.
- **Risk:** Lazy-loading observability modules breaks the env-gated activation path. Mitigate with an integration test that sets `VITE_OTLP_URL` and confirms the lazy import resolves.
- **Rollback:** Each phase reverts independently; Phase 3 is per-archetype so a regression in one doesn't block others.

## Out-of-scope follow-ups

- WebGL renderer tuning (Phaser default is fine until profiling proves otherwise).
- Replacing tweens with WAAPI animations — non-trivial Phaser integration.
- GPU-tier detection / quality auto-degrade (defer until pilot data shows necessity).
