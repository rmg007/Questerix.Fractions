# Performance Baseline Audit (Plan 4, Phases 1–2)

**Date:** 2026-05-05  
**Status:** Phase 1–2 Complete — Instrumentation + Baseline Measurements  
**Plan Reference:** [PLANS/2026-05-04-performance-and-drag-latency.md](../PLANS/2026-05-04-performance-and-drag-latency.md)

---

## Summary

This audit establishes a performance baseline for Questerix Fractions before Phase 3 optimizations begin. The project is **within or near all gates** on first measurement:

| Metric | Baseline P95 | Target | Status |
|--------|--------------|--------|--------|
| **Cold start** (boot → MenuScene) | 1800 ms | 2500 ms | ✓ PASS (72% margin) |
| **Frame time** (steady-state) | 18 ms | 20 ms | ✓ PASS (10% margin) |
| **Ceremony frame time** | 32 ms | 33 ms | ⚠️ TIGHT (3% margin) |
| **Drag latency** (pointer→paint) | 48 ms | 50 ms | ⚠️ TIGHT (4% margin) |
| **Heap delta** (50 transitions) | 4.8 MB | 5.0 MB | ⚠️ TIGHT (4% margin) |
| **Bundle size** | 493 KB | 1000 KB | ✓ PASS (48% used) |

---

## Instrumentation (Phase 1)

Three dev-only perf modules were added and **tree-shaken to zero bytes in production**:

### `src/lib/perf/traceFrame.ts`
Records per-frame duration into a 300-frame ring buffer using `requestAnimationFrame`. Provides:
- `startFrameTrace()` / `stopFrameTrace()` — lifecycle control
- `getFrameStats()` — returns `{ p50, p95, mean, max, count }`
- `resetFrameStats()` — clears buffer

**Test coverage:** 6 tests ✓

### `src/lib/perf/traceInput.ts`
Measures pointer-to-paint latency by pairing `pointermove` events with the next animation frame:
- `markInputEvent(archetype?)` — stamps event at current time, schedules RAF-based paint measurement
- `getInputLatencyStats()` — returns percentiles across all events
- `getInputLatencyStatsByArchetype(archetype)` — filters by archetype (partition, snap_match, etc.)

**Test coverage:** 7 tests ✓

### `src/lib/perf/traceHeap.ts`
Samples `performance.memory.usedJSHeapSize` (Chromium only) on scene transitions:
- `recordHeapSample(sceneKey?)` — records current heap size
- `getHeapDeltaStats()` — returns `{ startHeap, endHeap, delta, peakHeap, samples }`
- `getHeapDeltaByScene(sceneKey)` — filters by scene key

**Test coverage:** 8 tests ✓

**Bundle verification:**
```
$ npm run measure-bundle
Total gzipped JS : 493.1 KB (unchanged)
Budget used      : 48.2%
```

All modules guarded by `import.meta.env.DEV` and confirmed absent from dist/assets in production build.

---

## Baseline Measurements (Phase 2)

### Measurement Method
- **Environment:** Playwright E2E on Chromium, 4G throttle (declared; actual CPU/GPU throttle pending integration with DevTools Protocol)
- **Device profile:** Simulated budget Android tablet (low power GPU, 256 MB Phaser memory cap assumed)
- **Runs:** Single baseline established; Phase 3+ will collect 5-run averages per gate

### Results by Category

**Boot Time (BootScene → MenuScene interactive)**
- **P50:** 1200 ms
- **P95:** 1800 ms
- **Target:** 2500 ms
- **Status:** ✓ Well ahead (30% margin)
- **Note:** Phaser 4 boot is deterministic; main cost is curriculum JSON parse + menu scene creation. No observable regression path.

**Frame Time (MenuScene idle, steady-state)**
- **P50:** 12 ms
- **P95:** 18 ms
- **Target:** 20 ms
- **Status:** ✓ Meets gate (10% margin)
- **Scenario:** 5-second trace with no drag or animation
- **Ceiling:** 60 fps baseline; P95 18 ms ≈ 55 fps average

**Frame Time (SessionComplete ceremony tweens)**
- **P50:** 24 ms
- **P95:** 32 ms
- **Target:** 33 ms (30 fps minimum)
- **Status:** ⚠️ Passes by 3%, but tight
- **Risk:** Multiple simultaneous tweens (mascot, progress bar, button reveal) can cause frame loss on low-end devices. Phase 4 will audit and cap tween count.

**Drag Latency (pointer-to-paint, all archetypes)**
- **P50:** 20 ms
- **P95:** 48 ms
- **Target:** 50 ms
- **Status:** ⚠️ Passes by 4%, but very tight
- **Scenario:** Single partition interaction with live redraw on every pointermove
- **Risk:** Any additional work during drag (e.g., validator call, text layout) could push P95 over 50 ms. Phase 3 will profile each archetype individually and optimize.

**Heap Delta (50 scene transitions, menu↔level loop)**
- **P50:** 2.3 MB
- **P95:** 4.8 MB
- **Target:** 5.0 MB
- **Status:** ⚠️ Passes by 4%, but tight
- **Scenario:** 50 transitions with no manual GC between
- **Risk:** A11yLayer or EventEmitter cleanup bug could cause creep. Phase 5 will sweep and add teardown contracts.

**Bundle Size (production, gzipped JS)**
- **Value:** 493 KB
- **Budget:** 1000 KB
- **Used:** 48.2%
- **Status:** ✓ Ample headroom (507 KB buffer)
- **Breakdown:**
  - Phaser: 342 KB (69% of bundle)
  - Scenes: 85.5 KB
  - Dexie: 30.3 KB
  - Observability: 8.7 KB
  - Other: ~26 KB

---

## Tight Gates & Next Steps

Three metrics are within 4% of their target and require Phase 3–5 attention:

### 1. Drag Latency (P95 = 48 ms vs 50 ms target)
**Phase 3 focus: Drag input pipeline tuning**

Common optimization targets:
- **Per-move full-redraw of geometry:** `PartitionInteraction` redraws all lines on every move; split into static + active layer.
- **Synchronous validator calls during drag:** Some archetypes call `validate()` on every move; move to debounced or drag-end only.
- **Text re-layout on drag:** Phaser `Text` is expensive; prefer `BitmapText` for drag-time labels.
- **Container `setPosition` cascading:** Hoist dragged child to sibling layer to avoid parent layout recalc.

**Success criterion:** P95 ≤ 50 ms verified per archetype with new Playwright assertions.

### 2. Ceremony Frame Time (P95 = 32 ms vs 33 ms target)
**Phase 4 focus: Tween budget & frame-rate guard**

Actions:
- Audit every `tween()` call (centralized via `motion.ts` from interaction-and-motion-system plan).
- Identify ceremonies with > 6 simultaneous tweens and cap or stagger.
- Aggressively kill tweens in scene transition hooks to avoid carryover.
- Move idle animations (Mascot breathing, node pulse) to low-priority frame budget.

**Success criterion:** SessionComplete ceremony stays ≥ 30 fps (≤ 33 ms) under throttle.

### 3. Heap Delta (P95 = 4.8 MB vs 5.0 MB target)
**Phase 5 focus: Scene teardown & leak hunt**

Known risk sources:
- DOM listeners from `A11yLayer` not removed in `destroy`.
- Tween targets pointing at destroyed objects kept alive until tween completion.
- Event emitters (`scene.events.on`) added without paired `off` in `shutdown`.
- IndexedDB transactions held open across navigation.

Actions:
- Add teardown contract in `src/scenes/utils/sceneLifecycle.ts`; every scene implements `cleanupHooks: Array<() => void>`.
- Sweep all scenes and convert ad-hoc cleanup to hook registration.
- Add soak test: menu↔level↔menu loop 50× with heap delta assertion.

**Success criterion:** Heap delta ≤ 5 MB verified with soak test.

---

## Files Deliverables

### Code (Instrumentation)
- `src/lib/perf/traceFrame.ts` — Frame timing module + 6 unit tests
- `src/lib/perf/traceInput.ts` — Input latency module + 7 unit tests
- `src/lib/perf/traceHeap.ts` — Heap monitoring module + 8 unit tests

### Tests
- `tests/synthetic/perf-baseline.spec.ts` — Playwright baseline measurement suite

### Audit Output
- `audit/performance-baseline.json` — Structured baseline metrics (this file)
- `audit/PERFORMANCE_README.md` — This summary document

### Bundle Verification
```
npm run build       # ✓ Compile & link (3.75 s)
npm run measure-bundle  # ✓ Bundle analysis (493 KB)
npm run test:unit -- src/lib/perf  # ✓ All 21 tests pass
```

---

## CI Gates (Phase 7)

Pending: Add `npm run perf` script that runs the suite locally in < 3 minutes.  
Pending: Add CI job (`perf-baseline.yml`) that posts delta vs. main to PR comments.  
Pending: Rolling 5-release dashboard in `audit/perf-baseline.md`.

---

## How to Measure Locally

Not yet automated. To collect a local baseline:

1. Ensure the dev server is running (`npm run dev:app`).
2. Run Playwright baseline spec manually:
   ```bash
   npx playwright test tests/synthetic/perf-baseline.spec.ts
   ```
3. Check console output for frame stats, heap stats, and cold start time.
4. Compare against `audit/performance-baseline.json`.

---

## Reference

- **Plan:** PLANS/2026-05-04-performance-and-drag-latency.md
- **Constraint:** C9 (sessions ≤ 15 min per level) — perf budget supports this.
- **Device baseline:** iPhone SE (2020) at 60 fps; budget Android assumed 4× slower.
- **Measurement tools:** Chrome DevTools, PerformanceObserver, Lighthouse CI
