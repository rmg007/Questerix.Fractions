# Plan: Bundle Splitting & Cold-Start UX

**Date:** 2026-05-04
**Branch (when started):** `perf/2026-05-04-bundle-splitting-and-cold-start`
**Status:** Draft — not yet implemented
**Part of:** [2026-05-04-roadmap.md](2026-05-04-roadmap.md) — Phase 4 (Integration & release). Runs after plans 5 + 7 land so we know the real bundle size we are splitting.

## Problem

Today's bundle is monolithic. Every byte of curriculum, every archetype's interaction code, every observability shim, every worked-example demo — all parsed before MenuScene paints.

Plan 5 (hint catalog expansion) and plan 7 (≥ 5 archetypes per level + ≥ 30 % more questions) will both push the gzipped size hard against the 1.0 MB C4 ceiling. Plan 4's worked-example animations add more. Without splitting, we either blow the budget or ship a degraded set of these features.

The cold-start UX symptom is also concrete: on a budget Android device on slow-4G, time-to-interactive is currently ~3.5 s. The first paint happens fast, but MenuScene does not become interactive until the curriculum bundle parses — and the loading bar in PreloadScene is a generic spinner that gives no signal of progress.

## Goals

1. Boot path (BootScene → MenuScene interactive) ≤ 500 KB gzipped JS + curriculum index only — no per-level content, no worked-example demos, no observability.
2. Each level's content + interaction code + worked-example demo loads on demand when the child taps a level card.
3. PreloadScene shows real progress (per-asset, not generic), and a "you can keep tapping while this loads" affordance for fast switchers.
4. Total gzipped ≤ 1.0 MB across all chunks remains the ceiling; no chunk above 250 KB.
5. Cold-start ≤ 2.5 s on the budget device profile from the perf plan.

## Non-goals

- Server-side rendering — no server (C1).
- Replacing Vite. Stays per C4.
- Pre-fetching every level on idle. Defer; use viewport-based heuristics only.

## Definition of done

- `vite build` output shows route-level chunks: `boot`, `menu`, `level-NN` per level, `worked-example`, `observability`.
- `bundle-watcher` subagent has gates per chunk (boot ≤ 500 KB, level chunks ≤ 200 KB each).
- PreloadScene shows percentage progress and a fallback "still working…" message after 5 s.
- Cold-start budget asserted in CI per the perf plan.

---

## Phases

### Phase 1 — Inventory + dependency graph (gate: chart committed)

- Run `vite-bundle-visualizer` against the current production build; commit `audit/bundle-graph-pre.json` and a screenshot.
- Identify the 10 heaviest modules and their import chains. Likely suspects: curriculum bundle, observability (OpenTelemetry), error reporter (Sentry), Phaser tweens, individual archetype files that import shared utilities transitively.
- Decide split boundaries: per-level chunks, observability, worked-example, audio (coordinated with `PLANS/audio.md`).

### Phase 2 — Curriculum split (gate: per-level fetch works, byte-parity preserved)

- Restructure curriculum output: replace monolithic `public/curriculum/v1.json` with `public/curriculum/index.json` (lightweight manifest: level → URL + sha256) and `public/curriculum/level-NN.json` per level.
- Boot loads only `index.json`. LevelMapScene loads each level's content on first tap and caches in memory.
- Maintain `src/curriculum/bundle.json` (static import fallback) for the test suite — but make it a dev-only build artifact, not shipped.
- Preserve byte-parity: `curriculum-byte-parity` subagent gates the index, then per-level files; sha256 in the index must match the served file.
- Update `npm run build:curriculum` to emit the per-level files and the index.
- This is the riskiest phase — coordinate with [2026-05-04-content-archetype-expansion.md](2026-05-04-content-archetype-expansion.md) so the pipeline regeneration lands on the new layout in one PR.

### Phase 3 — Archetype + worked-example chunking (gate: lazy-load works)

- Convert each `src/scenes/interactions/<Archetype>Interaction.ts` import in `LevelScene.ts` to a dynamic `import()`. The router awaits the chunk before mounting.
- Worked-example demos (per archetype, from plan 4) live in their own chunk loaded only when the demo CTA is tapped.
- Preload heuristic: when LevelMapScene is shown, idle-prefetch the chunk for the next-likely level (heuristic: highest unlocked, then sequential).
- Each `import()` includes a Vite `webpackChunkName` magic comment so chunk names are stable for `bundle-watcher`.

### Phase 4 — Observability + reporter on demand (gate: env-gated paths still work)

- Lazy-import `src/lib/observability/tracer.ts` and `errorReporter.ts` only when their env flag is set on first event.
- This delivers the dormant cost reduction the CLAUDE.md notes as a known issue.
- Test: build with `VITE_OTLP_URL` unset → bundle includes zero OpenTelemetry bytes. Build with it set → telemetry works as today, just lazy.

### Phase 5 — PreloadScene UX improvements (gate: visual baseline + a11y green)

Today's loading bar is generic. Improve:

- Per-asset percentage as a real value derived from the load queue size.
- Mascot waves at intervals so the screen does not feel frozen when one asset is large.
- "Still working…" after 5 s, "This is taking longer than usual…" after 12 s with a retry CTA.
- For per-level on-demand loads, an in-place skeleton inside the level card during fetch (not a full PreloadScene) so the menu remains responsive.
- Reduced-motion-safe: in reduced mode, the mascot is static and the percentage updates remain.
- A11yLayer announces progress at 25 / 50 / 75 / 100 % thresholds via the live region from [2026-05-04-screen-reader-keyboard-parity.md](2026-05-04-screen-reader-keyboard-parity.md).

### Phase 6 — Service worker for repeat-visit cold-start (gate: PWA install works, cache hits)

- Optional but high-leverage: register a service worker that caches `index.json`, the boot chunk, and previously-loaded level chunks.
- On revisit, MenuScene paints from cache before any network call. Cache invalidation via the manifest sha256 — when a level chunk's hash changes the SW evicts and refetches.
- Stays within C1: the service worker only caches assets we already serve; no third-party calls; no analytics.
- Add `manifest.webmanifest` so the app can be added to home screen on iOS / Android. This dramatically improves perceived cold-start because the OS skips browser chrome on subsequent launches.

### Phase 7 — Phase-close docs (gate: PR merged)

- Update `docs/30-architecture/performance-budget.md` with per-chunk gates and the dependency graph reference.
- Append to `.claude/learnings.md`: the heaviest module found in Phase 1 and the split that gave the biggest win.
- Update `src/CLAUDE.md` if the chunk boundary policy is important for future agents.
- Run `npm run sync:claude-md`.

---

## Risk / rollback

- **Risk:** First-tap-on-level adds a network round-trip the child can feel. Mitigate via the idle-prefetch heuristic and PreloadScene's in-place skeleton; measure on the budget device.
- **Risk:** Curriculum split breaks the test suite's static import path. Mitigate by keeping `src/curriculum/bundle.json` as a dev-only build artifact (a single roll-up file generated for tests); production never imports it.
- **Risk:** Service worker caches a broken build and locks users out. Mitigate via aggressive cache versioning keyed to manifest sha256, plus a "force reload" CTA on the recovery scene from the crash plan.
- **Rollback:** Phase 2 (curriculum split) is the riskiest single PR; revert restores the monolith. Other phases revert independently.

## Out-of-scope follow-ups

- HTTP/2 server push / 103 Early Hints (requires server we do not have).
- Brotli static compression beyond gzip — minor wins, not worth Vite plugin churn yet.
- Per-archetype A/B for which split granularity matters most — pilot data first.
