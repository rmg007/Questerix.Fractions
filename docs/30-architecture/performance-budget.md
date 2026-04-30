---
title: Performance Budget
status: active
owner: solo
last_reviewed: 2026-04-24
applies_to: [mvp]
related:
  - stack.md
  - runtime-architecture.md
  - ../00-foundation/risk-register.md
---

# Performance Budget

Per audit §4.4, this document breaks the 1.0 MB gzipped initial-transfer budget (established in `stack.md §4`) into per-component slices, defines the 60 fps rendering target, and specifies how the budget is measured and enforced in CI.

---

## 1. Total Budget

**1.0 MB gzipped initial transfer.** This is the first-meaningful-paint payload — everything the browser must load before the student can interact with the app. Established in `stack.md §4`; this document owns the slice allocation.

A 1.0 MB gzipped transfer at 4G (~5 Mbps) loads in approximately 1.6 seconds. Acceptable for a PWA; further optimization is a post-MVP concern.

---

## 2. Budget Slices

| Component                                           | Budget (KB gzipped)                        | Measurement Tool                         | Rationale                                                                    |
| --------------------------------------------------- | ------------------------------------------ | ---------------------------------------- | ---------------------------------------------------------------------------- |
| Phaser 4 core (vendor chunk)                        | 350 KB                                     | rollup-plugin-visualizer                 | Largest single dependency; fixed cost of the game engine per `stack.md §2.1` |
| Tailwind v4 output (purged)                         | 30 KB                                      | rollup-plugin-visualizer                 | v4 purge is aggressive; utility-class output stays small                     |
| Dexie 4 + dexie-export-import                       | 35 KB                                      | rollup-plugin-visualizer                 | ~22 KB Dexie + ~10 KB export addon; per `stack.md §2.5`                      |
| App code (TS, scenes, components)                   | 200 KB                                     | rollup-plugin-visualizer                 | All `src/` code: scenes, systems, validators, progression engine             |
| Fonts (variable subset, woff2)                      | 80 KB                                      | Lighthouse CI / Network panel            | Lexend Latin subset (primary body font); per `../20-mechanic/design-language.md §3.1` |
| Audio (lazy, on-demand)                             | 0 KB initial; ~50 KB per session avg       | Chrome DevTools Network                  | ~5 SFX; loaded on first play, not initial transfer                           |
| Curriculum JSON (L1 only initial; lazy-load others) | 50 KB initial; ~30 KB per additional level | rollup-plugin-visualizer / Network panel | Only L1 seed in initial bundle; other levels fetched on unlock               |
| Buffer                                              | 255 KB                                     | —                                        | Absorbs measurement variance, future minor additions                         |
| **Total initial transfer**                          | **≤ 1,000 KB (1.0 MB)**                    | **Lighthouse CI**                        | **Hard limit**                                                               |

> App code budget of 200 KB is the most flexible slice. If Phaser 4 ships smaller than 350 KB, that surplus can shift here.

---

## 3. Frame Rate Target

**60 fps on iPhone SE (2020) as the baseline device** (375 × 667 px, A13 Bionic). Per `runtime-architecture.md §9`.

Key constraints:

- Validators are synchronous and pure: < 1 ms each.
- BKT updates are synchronous: < 5 ms each.
- Dexie writes are async and `await`-ed off the input handler — do not block the render loop.
- No Web Workers required for MVP; if profiling shows a Dexie write blocking a frame, enqueue and write on the next event-loop tick (per `runtime-architecture.md §9`).

Animations use a single `cubic-bezier(0.4, 0, 0.2, 1)` easing curve; all durations are under 600 ms (per `../20-mechanic/design-language.md §6.1`).

---

## 4. Measurement

| Tool                                | What it measures                                                        | When                                                      |
| ----------------------------------- | ----------------------------------------------------------------------- | --------------------------------------------------------- |
| **rollup-plugin-visualizer**        | Per-chunk gzipped sizes; interactive treemap of the bundle              | Every production build                                    |
| **Lighthouse CI**                   | Total transfer, Time to Interactive, LCP, CLS; run in headless Chromium | Every CI run on main                                      |
| **Chrome DevTools Performance tab** | Frame timing, main-thread blocking, Dexie write latency                 | Manual; before each phase gate; on any new scene addition |
| **Playwright + axe-core**           | Accessibility metrics piggy-backed on E2E runs                          | Every CI run                                              |

Lighthouse thresholds enforced in CI (`lighthouserc.js`):

- Performance score ≥ 85
- LCP ≤ 2.5 s (4G throttle)
- TBT ≤ 200 ms
- Total transfer weight ≤ 1,024 KB gzipped

---

## 5. Budget Enforcement

- **PRs that push the gzipped initial transfer over 1.0 MB are blocked by CI.**
- PRs that increase any single slice by more than 10% from the checked-in baseline must include a written justification in the PR description.
- `bundle-budget.json` in the repo root captures the current slice snapshot. `rollup-plugin-visualizer` output is compared against it on each build.
- The Curriculum JSON lazy-load strategy (L1 initial only) is a deliberate design decision to keep the initial payload small; do not bundle all 9 levels into the initial chunk.
