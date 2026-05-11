# Questerix Fractions — Complete Finish-the-App Plan (Detailed)

**Created:** 2026-05-11  
**Status:** Detailed task breakdown — ready to execute  
**Scope:** Everything from Pixi-v8 fixes through pilot validation, mobile-Chrome-only PWA  
**Target completion:** ~9–11 weeks (solo, evening cadence)

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Cross-Cutting Concerns](#cross-cutting-concerns)
3. [Phase A: Spike Stabilization](#phase-a-spike-stabilization)
4. [Phase B: Per-Archetype DoD](#phase-b-per-archetype-dod)
5. [Phase C: Level Loop Integration](#phase-c-level-loop-integration)
6. [Phase D: UI/UX Uplift & Audio Production](#phase-d-uiux-uplift--audio-production)
7. [Phase E: Mobile Chrome Validation](#phase-e-mobile-chrome-validation)
8. [Phase F: Production Cutover](#phase-f-production-cutover)
9. [Phase G: Regrettability Window](#phase-g-regrettability-window)
10. [Phase H: Decommission Phaser](#phase-h-decommission-phaser)
11. [Phase I: Pilot Validation & Data](#phase-i-pilot-validation--data)
12. [Appendices](#appendices)

---

## Executive Summary

MVP backbone complete: persistence ✓, curriculum ✓, 11 archetypes ✓ (models + renderers). What remains:

1. **Unblock everything:** Fix 3 Pixi-v8 API breaks, get bundle < 240 KB (Phase A: 2–4 evenings)
2. **Prove all archetypes work:** Per-archetype model + renderer + a11y + tests + mobile viewport (Phase B: 3–4 weeks)
3. **Wire the loop:** LevelScreen routes through validators, Dexie, BKT, progression (Phase C: 1 week)
4. **Polish UX & ship audio:** Visual tokens, hint ladder, mascot, PWA affordances, TTS assets (Phase D: 2–3 weeks)
5. **Validate on real Android:** Playwright Chrome + manual device pass + Lighthouse (Phase E: 1 week)
6. **Cut over:** React entry as production, Phaser tree-shaken (Phase F: 3–5 evenings)
7. **Wait & watch:** 2-week regrettability window on main (Phase G: 2 weeks elapsed)
8. **Clean up:** Delete Phaser legacy, update docs (Phase H: 2–3 evenings)
9. **Run the pilot:** K-2 testers, collect data, iterate (Phase I: 4 weeks elapsed)

**Sequential gates:** No phase starts until the previous one's gate passes. Any "no" stops forward motion until resolved.

---

## Cross-Cutting Concerns

These apply across all phases and must be checked in every PR:

### Error Boundaries (React requirement)

**Why:** A single archetype crashing mid-question must not blank the app. Dexie write must complete before unmount.

**Rule:** Every route screen and interaction renderer wrapped in `<ErrorBoundary>` with a user-facing fallback UI.

**Files to create/update:**
- `src/app/components/ErrorBoundary.tsx` — catch React errors, log to IndexedDB `error_log` table, show "Something went wrong" UI, "Try again" button.
- Wrap in `src/app/App.tsx` (top-level), `src/app/screens/LevelScreen.tsx` (level-specific), `src/interactions/equal-or-not/EqualOrNotRenderer.tsx` template (per-renderer).

**Testing:**
- Playwright: throw an error in a renderer intentionally; verify error boundary catches it and "Try again" button reloads the level.
- Unit: test ErrorBoundary with a component that throws; verify fallback renders and `onError` callback fires.

**Cleanup on unmount:** Always await Dexie writes before unmounting. Use `useEffect` cleanup to cancel pending writes.

---

### TestHooks Contract (Playwright requirement)

**Why:** E2E tests cannot pixel-guess or DOM-hunt. Renderers and routes must expose test state via `data-testid` attributes and a global test API.

**Rule:** Every interactive element has a `data-testid`, and a test-only global `window.__TEST__` API exposes current state.

**Spec:**
```typescript
// window.__TEST__ (test-only global, defined in src/app/main.tsx for VITE_SPIKE=1)
{
  levelId: "1" | "2" | ... | "9",
  archetypeId: "equal_or_not" | "identify" | ...,
  questionId: "q-1" | "q-2" | ...,
  modelState: { ... }, // current state from the interaction model
  answerPayload: { ... } | null, // after submission
  attemptId: string | null, // after Dexie write
  hintLevel: 0 | 1 | 2 | 3, // 0 = no hint, 3 = worked example
  feedbackState: "idle" | "correct" | "incorrect" | "partial",
  studentId: string,
  sessionId: string,
}
```

**data-testid naming convention:**
- `level-screen` — root LevelScreen element
- `level-screen:question-card` — the question display
- `level-screen:interaction-renderer` — the Pixi canvas container
- `level-screen:hint-ladder` — hint UI
- `level-screen:feedback-overlay` — feedback display
- `level-screen:next-button` — "next" or "continue" button after feedback
- `equal-or-not:button-yes` — "yes" button in equal_or_not
- `equal-or-not:button-no` — "no" button
- `<archetype>:<interactive-element>` — generic pattern

**Playwright assertions use both:**
```typescript
// get current state
const state = await page.evaluate(() => window.__TEST__.modelState);
expect(state.selectedAnswer).toBe(true);

// click via testid
await page.getByTestId('equal-or-not:button-yes').click();

// wait for feedback
await page.waitForFunction(() => window.__TEST__.feedbackState !== 'idle');
```

**Rollout:** Start in Phase B as the archetype DoD "renderer must expose `data-testid`"; expand in Phase C as level loop wires up.

---

### Memory Leak & Cleanup Discipline

**Why:** 15-min sessions (C9) with 60 fps means >54k frame ticks. Any un-cleaned-up listener/timer/Pixi object multiplies.

**Rule per archetype:**

- `useEffect` cleanup: always return a cleanup function that cancels pending DOM events, Dexie writes, timers.
- Pixi destroy: call `app.destroy()` on unmount; call `sprite.destroy()` on every animated object.
- Event listeners: remove via `.off()` not just re-subscribe.
- Timers: store `timeoutId` / `intervalId`, clear in cleanup.

**Checklist for Phase B per-archetype gate:**
- [ ] No `addEventListener` without matching `removeEventListener` in cleanup.
- [ ] No `setTimeout` without `clearTimeout` in cleanup.
- [ ] No Pixi `new Container()` / `new Sprite()` without `.destroy()` on unmount.
- [ ] DevTools Memory snapshot before + after one full Level 1 session: heap delta < 5 MB (GC recovers most).
- [ ] No lingering listeners: `performance.getEventListeners()` in DevTools console after unmount is empty.

---

### Lazy-Load Renderers (bundle strategy)

**Why:** 11 renderers * ~25 KB each = 275 KB baseline. With lazy-load via `React.lazy`, only the current archetype is in the bundle.

**Strategy (bake into Phase B, not Phase F rollback):**

```typescript
// src/interactions/pixi/renderers/index.ts
export const RendererMap = {
  equal_or_not: lazy(() => import('./EqualOrNotRenderer').then(m => ({ default: m.EqualOrNotRenderer }))),
  identify: lazy(() => import('./IdentifyRenderer').then(m => ({ default: m.IdentifyRenderer }))),
  // ... etc
};

// src/app/screens/LevelScreen.tsx
const Renderer = RendererMap[archetype];
<Suspense fallback={<LoadingSpinner />}>
  <Renderer state={modelState} onAnswer={handleAnswer} />
</Suspense>
```

**Per the 2026-05-05 learning:** rolldown inlines sync `import()` back into the parent chunk. `React.lazy` + `Suspense` creates an async boundary, so chunks actually split.

**Measurement:**
- Phase B.1 (equal_or_not): measure with lazy-load. Should be ~50 KB for the renderer + 25 KB for model/types = 75 KB per interaction.
- Phase B.3 (after 3 archetypes): remeasure total. Should stay ~180–200 KB (base + 3 renderers loaded on demand).

**No eager load of all 11 renderers on boot.**

---

### Curriculum Completeness Audit (before B starts)

**Why:** If a (level, archetype) pair has no questions in the bundle, that interaction will crash at runtime.

**Task:** One-line verification script or manual check.

```bash
# Pseudo-code: check every level has every archetype
for level in 1..9:
  for archetype in [equal_or_not, identify, label, snap_match, compare, benchmark, placement, partition, make, order, explain_your_order]:
    if src/curriculum/bundle.json[level][archetype].length == 0:
      ERROR: "Level {level} missing {archetype}"
```

**Deliverable:** A passing test in `tests/unit/curriculum-completeness.test.ts` that runs `npm run test:unit` and fails if any cell is empty. Add to the test suite once and never touch again.

---

### Constraints (Mobile-Chrome-Only Pilot)

**C1:** No backend, no external data egress, no accounts. ✓ (unchanged)  
**C2:** No teacher/parent/admin UI. ✓ (unchanged)  
**C3:** Levels 1–9 only. ✓ (unchanged)  
**C4:** React + TypeScript + Vite + PixiJS + Dexie; no Redux, no Zustand, no Next.js. ✓ (revise in Phase F)  
**C5:** localStorage: `lastUsedStudentId` only. ✓ (unchanged)  
**C6:** Flat + bright visuals. ✓ (unchanged)  
**C7 (interim):** 360–480 px Android Chrome PWA only (iOS Safari and desktop deferred post-pilot). Revise in Phase F.  
**C8:** Linear denominator progression. ✓ (unchanged)  
**C9:** Sessions ≤ 15 min per level. ✓ (unchanged)  
**C10:** Every change must serve validation. ✓ (unchanged)

---

### Non-Goals (explicit out-of-scope for this plan)

- **Internationalization beyond English.** Catalog exists; localization deferred to post-pilot.
- **iOS Safari.** C7 scope is Android Chrome only for the pilot.
- **Desktop web / Firefox / Safari.** Not tested; may work but not a target.
- **Accounts / sign-up.** C1/C2 forbid it.
- **Leaderboards, social features, multiplayer.** C2 forbid it.
- **Accessibility below WCAG AA.** All new surfaces must meet AA.
- **Custom tween library.** `useTween` + token easings only; no GSAP, no Popmotion.
- **State library.** `useSyncExternalStore` + services only; no Zustand, no Redux.
- **Storybook or other design tooling.** Playwright fixture routes are enough.
- **Capacitor / Cordova / React Native.** PWA in mobile Chrome is the delivery mechanism.

---

## Phase A: Spike Stabilization

**Goal:** Make the React+PixiJS spike actually render, hit budget, and be a credible foundation for everything after.  
**Branch:** `feat/2026-05-11-spike-stabilization`  
**Duration:** 2–4 evenings  
**Gate:** Bundle ≤ 240 KB gz, Pixi v8 API fixed, dirty-flag implemented, manual smoke test passes, allocations ≤ 60/s

### A.1 Fix Pixi v8 API Breaks

**Current blocker (from PR #108):** 3 API incompatibilities prevent renderers from working.

**A.1.1 — PixiStage initialization**
- **File:** `src/interactions/pixi/PixiStage.tsx`
- **Task:** Replace `new PIXI.Application({...})` with async init pattern.
  - Current: `const app = new PIXI.Application({ width: 360, height: 640 });`
  - New:
    ```typescript
    const app = new PIXI.Application();
    await app.init({ width: 360, height: 640, canvas: containerRef.current });
    ```
  - Gate the canvas DOM render on init promise resolution.
  - Test: `<PixiStage>` mounts; verify `app.canvas` is non-null and mounted.
- **Effort:** 30 min
- **Blocker for:** A.2, B.*

**A.1.2 — PIXI.Text style format**
- **Files affected:** Every renderer (11 files under `src/interactions/pixi/renderers/`).
- **Task:** Audit and convert `PIXI.Text` calls from v7 to v8 style object.
  - v7 (old): `new PIXI.Text("text", { fontSize: 24, fill: 0xffffff })` sometimes works; sometimes needs `new PIXI.TextStyle({...})`.
  - v8 (new): always `new PIXI.Text({ text: "text", style: { fontSize: 24, fill: 0xffffff } })`.
  - Search all renderers for `new PIXI.Text` and update.
- **Test:** Boot the spike with `VITE_SPIKE=1`; verify text renders (not default styled).
- **Effort:** 1 hour
- **Blocker for:** B.*

**A.1.3 — eventMode replacement**
- **File:** `src/interactions/pixi/renderer.ts` (shared base renderer).
- **Task:** Replace `.interactive = true` with `eventMode = 'static'` or `'dynamic'`.
  - Reason: v8 dropped `.interactive`; use `eventMode` for pointer interactivity.
  - Pattern: any container/sprite that should respond to tap → `object.eventMode = 'static'`.
  - Test: tap the spike interaction; verify `pointerdown` / `pointerup` events fire.
- **Effort:** 1 hour
- **Blocker for:** B.*

**Gate A.1:** `npm run dev:app` with `VITE_SPIKE=1` in Pixel 5 emulation: equal_or_not renders, text is visible, tap registers.

---

### A.2 Bundle Optimization (named imports + lazy Zod)

**Current state:** 270.7 KB gz. Gate: 240 KB gz (leaves 10 KB per remaining 10 archetypes).

**A.2.1 — Named imports (Pixi)**
- **Current:** `import * as PIXI from 'pixi.js'` in every renderer.
- **Task:** Replace with named imports:
  ```typescript
  import { Application, Container, Sprite, Text, Graphics, ... } from 'pixi.js';
  ```
  - Search `src/interactions/pixi/**/*.tsx` for `PIXI.` and convert to bare names.
  - Example: `new PIXI.Container()` → `new Container()`.
- **Measurement:** `BUNDLE_ANALYZE=1 npm run build` before and after. Expect ~−20 to −30 KB.
- **Effort:** 2 hours
- **Blockers:** None (parallel with A.2.2)

**A.2.2 — Lazy-import Zod (validators)**
- **Current:** `src/validators/registry.ts` eagerly imports Zod for schema validation.
- **Task:** 
  - Identify which validators are boot-critical (attempt parsing, BKT). Keep them eager.
  - Defer non-critical validator schemas to `import('./module')` in the function that needs them.
  - Measure impact. Expect ~−10 to −15 KB.
- **Measurement:** `BUNDLE_ANALYZE=1 npm run build` before and after.
- **Effort:** 1 hour
- **Blockers:** None (parallel with A.2.1)

**Gate A.2:** `VITE_SPIKE=1 npm run measure-bundle`: total ≤ 240 KB gz.

---

### A.3 Dirty-Flag Render Pattern (allocations ≤ 60/s)

**Current blocker (from PR #108):** Drag archetypes allocate 420 objects/sec at 60 fps. Must reduce to ≤ 60/sec.

**Issue:** Every `reduce()` call in the model allocates new objects (state clones). Every re-render rerenders the Pixi tree. Need to memoize and redraw only on state change.

**A.3.1 — PixiStage dirty flag**
- **File:** `src/interactions/pixi/PixiStage.tsx`
- **Pattern:**
  ```typescript
  const [isDirty, setIsDirty] = useState(false);
  
  useEffect(() => {
    // Redraw only if state changed (isDirty = true)
    if (!isDirty) return;
    redrawCanvasContent();
    setIsDirty(false);
  }, [modelState, isDirty]);
  ```
- **Renderer responsibility:** On each model event (tap, drag), call `onDirty()` callback once per event, not every animation frame.
- **Measurement:** DevTools Performance trace during 5 sec of continuous drag. Allocations should ≤ 60 objects/sec.
- **Effort:** 2 hours
- **Blocker for:** B.4–B.10 (drag archetypes)

**Gate A.3:** DevTools Memory snapshot: 5 sec of continuous drag, heap allocation ≤ 300 KB (< 60 KB/sec * 5 sec).

---

### A.4 Engine Determinism Audit

**Task:** Confirm no `Math.random()`, `Date.now()`, `crypto.randomUUID()` in `src/interactions/`. Route all through `src/engine/ports.ts`.

**A.4.1 — Grep check**
```bash
grep -r "Math\.random\|Date\.now\|crypto\.randomUUID" src/interactions/
# Should return 0 hits (nothing in interactions/)
```

**A.4.2 — Invoke `engine-determinism-auditor` agent**
- Confirm the diff touches only `src/interactions/` and passes the auditor check.

**Gate A.4:** Agent returns clean; grep returns 0 hits.

---

### A.5 Manual Smoke Test (real device + emulation)

**A.5.1 — Chrome DevTools emulation (Pixel 5, 360×640)**
```bash
npm run dev:app -- --env VITE_SPIKE=1
# Open http://localhost:5000/spike.html
# DevTools > Device toolbar > Pixel 5
```
- [ ] Page loads, equal_or_not renders
- [ ] Tap "yes" button → model state updates
- [ ] Tap "no" button → model state updates
- [ ] After correct answer: feedback shows, attempt writes to IndexedDB
- [ ] After incorrect answer: feedback shows, hint ladder becomes available
- [ ] Tap hint button → hint level increases
- [ ] After hint assist: answer allowed again

**A.5.2 — Real Android device (if available)**
- [ ] Same flow on real Pixel 5 or equivalent
- [ ] Tap latency < 100 ms (open DevTools remote debugger, trace tap-to-visual response)

**Gate A.5:** All checkboxes pass on emulation; real device optional but strongly encouraged.

---

### A.6 Final A-Phase Verification

**Checklist:**
- [ ] `npm run typecheck` green
- [ ] `npm run lint` green
- [ ] `npm run test:unit` green (existing tests not regressed + A.3 memory tests pass)
- [ ] `VITE_SPIKE=1 npm run measure-bundle` ≤ 240 KB gz
- [ ] `engine-determinism-auditor` clean on diff
- [ ] Manual smoke test passed (emulation + optional real device)
- [ ] No new linting errors or console warnings in DevTools

**Gate A (final):** All checkboxes pass. If any fail, stop and fix before moving to B.

**Effort estimate:** 2–4 evenings  
**Blocker for:** Phase B (everything waits on this)

---

## Phase B: Per-Archetype DoD (Full Integration)

**Goal:** Bring all 11 archetypes to the definition of done — not just "renderer exists," but model + renderer + a11y + tests + mobile validated.

**Branch pattern:** One per archetype, `feat/2026-05-11-archetype-<slug>`  
**Order (risk-ordered from migration plan):**
1. equal_or_not (already done from spike; use as parity baseline)
2. identify
3. label
4. snap_match (first drag; validates pointer/keyboard parity)
5. compare (first misconception flag path)
6. benchmark
7. placement (first tolerance math)
8. partition (first geometry)
9. make (partition + shade composition)
10. order (drag-reorder + Kendall tolerance)
11. explain_your_order (capstone; first form input)

**Per-archetype gate:** All below must pass before the next archetype starts.

---

### Per-Archetype Detailed DoD

For each archetype, execute this checklist:

#### B.x.1 — Model Unit Tests

**File:** `src/interactions/model/<archetype>.test.ts`

**Coverage matrix:**
- [ ] Correct answer: model produces answer payload that validates as correct
- [ ] Incorrect answer: model rejects/marks incorrect
- [ ] Edge case (e.g., placing at exact boundary): model handles without NaN
- [ ] Assisted (hint used): model tracks `hintsUsed` and can re-attempt after hint
- [ ] Hint transitions: hint level 0 → 1 → 2 → 3 works, cannot go beyond 3

**Fixtures:** Use known questions from `src/curriculum/bundle.json` for the archetype.

**Test command:** `npm run test:unit -- <archetype>.test.ts`

**Gate:** All tests pass, coverage ≥ 80%.

**Effort:** 1–2 hours per archetype (copy equal_or_not tests, adapt fixtures)

---

#### B.x.2 — Renderer in Isolation

**File:** `src/interactions/pixi/renderers/<Archetype>Renderer.tsx`

**Checklist:**
- [ ] Renderer imports only the model, types, and Pixi (no validator, no Dexie)
- [ ] Props: `{ state: ModelState, onEvent: (event: ModelEvent) => void }`
- [ ] Renders a Pixi scene (Container with shapes/text)
- [ ] Model state changes → canvas updates (dirty-flag pattern, ≤ 60 allocations/sec)
- [ ] Tap/pointer/drag events → call `onEvent()` with appropriate event payload
- [ ] Reduced-motion: tweens respect `prefers-reduced-motion` (or skip tweens entirely)
- [ ] Touch target ≥ 44×44 CSS px on all buttons
- [ ] No host globals (route `Math.random()` through engine ports)
- [ ] Memory: DevTools snapshot over 10 sec; heap delta < 10 MB (GC recovers)

**Test:** Playwright fixture route `tests/e2e/fixtures/render-<archetype>.tsx` — mount the renderer in isolation, interact, screenshot.

**Gate:** Renderer mounts, responds to interaction, memory stable.

**Effort:** 2–4 hours per archetype (depends on complexity)

---

#### B.x.3 — Validator Payload Contract

**Task:** Ensure the renderer's answer payload matches the existing validator in `src/validators/registry.ts`.

**Checklist:**
- [ ] Model's `toAnswer()` produces the exact shape the validator expects
- [ ] Run `npm run test:unit -- --filter validators` — validator tests still pass
- [ ] Invoke `validator-parity-checker` agent on the diff
- [ ] If the payload shape changed, update Python clone in `pipeline/validators_py.py` and re-run pipeline parity tests

**Gate:** Agent clean, existing validators don't regress.

**Effort:** 30 min (usually just verification, rarely requires payload change)

---

#### B.x.4 — Keyboard + A11y

**Checklist:**
- [ ] Every interactive control has an accessible name (via `aria-label` or semantic HTML)
- [ ] Keyboard navigation: Tab cycles through all controls in logical order
- [ ] Keyboard shortcuts:
  - Equal_or_not: Y = yes, N = no
  - Identify/label/benchmark: Tab to select, Enter to confirm
  - Drag archetypes (snap_match, placement, order): Tab + arrow keys to move, Enter to place
  - Compare: Tab through options, Space/Enter to select
  - Partition/make: Tab to divider, arrow keys to move, Enter to confirm
  - Explain_your_order: Tab through text + choice fields, Enter to submit
- [ ] Live region announcements: feedback via `role="status" aria-live="polite"` (e.g., "correct!", "try again")
- [ ] Reduced-motion: all animations respect `prefers-reduced-motion: reduce`
- [ ] Contrast: all text ≥ 4.5:1 ratio on background (verify in Lighthouse)

**Test:** 
- Playwright a11y spec: `tests/e2e/interactions/<archetype>-a11y.spec.ts`
  - Test keyboard-only flow (no mouse)
  - Run Playwright a11y suite: `npm run test:a11y -- <archetype>-a11y.spec.ts`
- Invoke `a11y-auditor` agent on the diff

**Gate:** Playwright a11y green, agent clean, keyboard flow works.

**Effort:** 1–2 hours per archetype

---

#### B.x.5 — Playwright E2E Smoke Test

**File:** `tests/e2e/interactions/<archetype>.spec.ts`

**Checklist:**
- [ ] Test at Pixel 5 (360×640) and Pixel 7 (412×915) viewports
- [ ] Flow: load question → interact → submit → verify feedback
- [ ] Assert via `window.__TEST__` (test hook state), not pixel matching
- [ ] Example (equal_or_not):
  ```typescript
  test('equal_or_not: correct answer shows feedback', async ({ page }) => {
    await page.goto('/spike.html?archetype=equal_or_not');
    // Wait for renderer
    await page.waitForFunction(() => window.__TEST__.archetypeId === 'equal_or_not');
    // Click yes button
    await page.getByTestId('equal-or-not:button-yes').click();
    // Verify feedback
    await page.waitForFunction(() => window.__TEST__.feedbackState === 'correct');
    const attempt = await page.evaluate(() => window.__TEST__.attemptId);
    expect(attempt).toBeTruthy();
  });
  ```
- [ ] Test on both viewports (use Playwright project configuration)

**Gate:** Both viewport tests pass in CI.

**Effort:** 1 hour per archetype

---

#### B.x.6 — Tap Latency Check

**Task:** Ensure tap-to-visual response ≤ 100 ms (parity with Phaser baseline).

**Method:** Chrome DevTools Performance trace during a tap.
```bash
# With dev server running:
# 1. Open http://localhost:5000/spike.html?archetype=<archetype>
# 2. DevTools > Performance > Record
# 3. Tap the canvas/button (single interaction)
# 4. Stop recording
# 5. Look for the pointerdown event → visual change. Measure latency.
```

**Gate:** Latency ≤ 100 ms (typical: 20–60 ms on modern hardware).

**Effort:** 30 min per archetype

---

#### B.x.7 — Memory Cleanup Verification

**Checklist:**
- [ ] `useEffect` cleanup functions defined for all effects
- [ ] No lingering event listeners: `performance.getEventListeners()` in DevTools console post-unmount is empty
- [ ] Pixi objects destroyed: no memory spike on re-mount
- [ ] DevTools Memory snapshot: 
  - Before interaction: X MB
  - After 1 full flow: X + delta MB
  - After unmount + GC: X + small delta MB (< 5 MB)

**Gate:** Memory stable across mount/unmount/remount cycles.

**Effort:** 1 hour per archetype

---

### B.y Gate Criteria (every 3 archetypes)

After archetypes 3, 6, and 11, run a full validation:

**Measurement gates (every 3 archetypes):**
- [ ] `npm run typecheck && npm run lint && npm run test:unit && npm run test:e2e && npm run test:a11y` all green
- [ ] `VITE_SPIKE=1 npm run measure-bundle` ≤ (250 + 30*N) KB gz, where N = number of archetypes completed
  - After 1 (equal_or_not): ≤ 280 KB
  - After 4 (snap_match): ≤ 370 KB
  - After 7 (partition): ≤ 460 KB
  - After 11 (explain_your_order): ≤ 580 KB
- [ ] No regressions on previously completed archetypes

**Gate checkpoint:** If bundle exceeds target, lazy-load more renderers or defer non-critical assets before continuing.

---

### B.z Phase B Effort & Timeline

| Archetype | Est. effort | Cumulative | Notes |
|---|---|---|---|
| 1. equal_or_not | 1 hr | 1 hr | Reuse spike work; adjust for lazy-load |
| 2. identify | 6 hrs | 7 hrs | First tap-only; sets pattern for 3 |
| 3. label | 7 hrs | 14 hrs | Add text mapping, form inputs |
| **Checkpoint** | **2 hrs** | **16 hrs** | Full suite, bundle check, a11y audit |
| 4. snap_match | 8 hrs | 24 hrs | First drag; pointer capture + keyboard fallback |
| 5. compare | 7 hrs | 31 hrs | Add misconception flag testing (MC-MAG-*) |
| 6. benchmark | 8 hrs | 39 hrs | Multi-target zones, responsive layout |
| **Checkpoint** | **2 hrs** | **41 hrs** | Full suite, bundle check |
| 7. placement | 9 hrs | 50 hrs | Tolerance math, subpixel precision |
| 8. partition | 10 hrs | 60 hrs | Geometry, snap thresholds, reduced-motion |
| 9. make | 9 hrs | 69 hrs | Composes partition + shade state |
| **Checkpoint** | **2 hrs** | **71 hrs** | Full suite, bundle check |
| 10. order | 9 hrs | 80 hrs | Drag-reorder, Kendall tolerance, stepper fallback |
| 11. explain_your_order | 10 hrs | 90 hrs | Text + choice composite, full form interaction |
| **Final check** | **2 hrs** | **92 hrs** | All suites, agent audits (a11y, validator-parity, determinism, bundle) |

**Duration (solo, 3 hrs/evening):** ~30 evenings ≈ 4 weeks (assuming 3–4 work days per week)

**Gate B (final):** All 11 archetypes pass per-archetype gate. Full suite green. Bundle ≤ 600 KB gz.

---

## Phase C: Level Loop Integration

**Goal:** Wire `LevelScreen` so all 9 levels route through the React entry with full BKT/progression/persistence/hint behavior.

**Branch:** `feat/2026-05-11-level-loop`  
**Duration:** 1 week (5–7 evenings)  
**Gate:** Full end-to-end flow works on the React entry

### C.1 LevelScreen Architecture

**File:** `src/app/screens/LevelScreen.tsx`

**High-level flow:**
```
LevelScreen mounts
  ↓
Load curriculum (query by level + curriculum loader)
  ↓
Select next question (via engine router)
  ↓
Select archetype (via levelRouter)
  ↓
Mount interaction renderer (via RendererMap + lazy)
  ↓
User interacts
  ↓
Call validator (from registry)
  ↓
Write attempt to Dexie (attemptRepository)
  ↓
Update BKT/progression (via engine)
  ↓
Update misconception flags (if triggered)
  ↓
Show feedback overlay (DOM React component)
  ↓
Show hint ladder (on hint request)
  ↓
User confirms next → repeat or level complete
```

**C.1.1 — Curriculum loader integration**
- **File:** `src/app/hooks/useCurriculum.ts` (already exists per scaffolding)
- **Task:** Verify it loads `public/curriculum/v1.json` and validates it against the schema
- **Checklist:**
  - [ ] `useCurriculum()` hook returns `{ curriculum, loading, error }`
  - [ ] On component mount: fetch and parse curriculum
  - [ ] On error: render error boundary fallback
  - [ ] Memoize curriculum so re-renders don't refetch

**C.1.2 — Engine router + level router integration**
- **Files:** `src/engine/router.ts`, `src/app/utils/levelRouter.ts` (mirrors Phaser's levelRouter.ts)
- **Task:** Hook the learning engine's next-question router into LevelScreen
- **Code sketch:**
  ```typescript
  const { curriculum } = useCurriculum();
  const currentQuestion = curriculum[levelId][currentQuestionIndex];
  const archetype = levelRouter.getArchetype(levelId, currentQuestion.skillId);
  const nextQuestion = engine.router.selectNextQuestion(studentId, levelId, currentQuestion);
  ```
- **Checklist:**
  - [ ] `engine.router.selectNextQuestion()` respects BKT, misconception flags, and selection constraints
  - [ ] `levelRouter.getArchetype()` returns the correct archetype for the skill

**C.1.3 — Archetype → Renderer mapping**
- **File:** `src/interactions/pixi/renderers/index.ts` (already has lazy-load map)
- **Task:** Verify the RendererMap exports all 11 lazy-loaded renderers
- **Checklist:**
  - [ ] Map keys match archetype IDs: `equal_or_not`, `identify`, `label`, etc.
  - [ ] Each value is `lazy(() => import(...).then(m => ({ default: m.Renderer })))`
  - [ ] `LevelScreen` uses this map: `const Renderer = RendererMap[archetype]`

**C.1.4 — Answer submission + validator call**
- **File:** `src/app/screens/LevelScreen.tsx` (in handler)
- **Code sketch:**
  ```typescript
  const handleAnswer = async (answerPayload) => {
    const validator = validators[archetype];
    const result = validator(question, answerPayload);
    
    if (result.correct || result.partial) {
      // Write attempt
      const attempt = await attemptRepository.create({
        studentId, sessionId, questionId, archetype, answerPayload, ...result
      });
      
      // Update BKT
      const updated = await bkt.updateMastery(attempt, { assisted: false });
      
      // Update progression
      await progressionRepository.update(studentId, updated);
      
      // Check misconception flags
      if (result.misconceptions) {
        await flagRepository.recordFlags(studentId, result.misconceptions);
      }
    }
    
    setFeedbackState(result.correct ? 'correct' : 'incorrect');
  };
  ```
- **Checklist:**
  - [ ] Validator returns `{ correct, partial, misconceptions, hintsApplicable }`
  - [ ] Attempt persists to Dexie
  - [ ] BKT updates with `updateMastery(attempt, { assisted })`
  - [ ] Misconception flags recorded
  - [ ] Feedback state updates immediately

**C.1.5 — Hint ladder integration**
- **File:** `src/app/components/HintLadder.tsx` (new, or adapt from Phaser HintLadder)
- **Task:** Render 3-tier hint surface
  - Tier 1: Verbal hint (text from curriculum)
  - Tier 2: Visual overlay (Pixi-side callout, arrow, region highlight)
  - Tier 3: Worked example (Pixi-side step-by-step replay)
- **Checklist:**
  - [ ] Hint request increments `hintLevel` (0 → 1 → 2 → 3)
  - [ ] Each level's hint fetched from `question.hints[hintLevel]`
  - [ ] On hint used: `updateMastery(attempt, { assisted: true })` resets unassisted streak
  - [ ] After worked example: user must re-attempt (prevent gaming)
  - [ ] Hint ladder state visible in `window.__TEST__` for E2E
- **Accessibility:** Each hint level announced via live region

**C.1.6 — Feedback overlay (DOM React component)**
- **File:** `src/app/components/FeedbackOverlay.tsx` (new, or adapt from Phaser FeedbackOverlay)
- **Task:** Show correct/incorrect/partial feedback
- **States:**
  - Correct: "Nice work! ✓" + star animation (CSS confetti) + mascot happy state
  - Incorrect: "Try again" + encouragement + hint option
  - Partial: "Partially correct! You got [parts]." + hint option
- **Checklist:**
  - [ ] Animates in with `useTween` respecting reduced-motion
  - [ ] Shows for 2–3 sec, then fades; user can tap "next" to skip wait
  - [ ] Mascot state tied to feedback (happy/sad/neutral)
  - [ ] Audio plays: correct sound, incorrect sound (from TTS pipeline or pre-rendered)

**C.1.7 — Session complete + level complete**
- **Task:** Detect when a student has mastered a level (all skills KC > threshold)
- **Checklist:**
  - [ ] After each attempt, check: all skills in this level mastered?
  - [ ] If yes: show "Level Complete! ⭐" overlay + unlock next level + mascot celebration
  - [ ] If level 9 complete: show "You mastered fractions!" + thank you screen
  - [ ] Update `unlockedLevels:<studentId>` + `completedLevels:<studentId>` localStorage (C5 deviation, documented)
  - [ ] Route back to LevelMapScreen

**C.1.8 — Recovery (Dexie failure handling)**
- **Task:** If Dexie write fails mid-question
- **Checklist:**
  - [ ] Error boundary catches it
  - [ ] Error logged to `error_log` table (or IndexedDB fails completely)
  - [ ] Show "Something went wrong. Try again?" button
  - [ ] On click: reload question, re-attempt (user data not lost if Dexie is accessible again)

### C.2 Mascot Lifecycle (State Machine)

**File:** `src/app/components/Mascot.tsx`

**States:**
- `idle` — at rest, blinking
- `thinking` — question displayed, waiting for answer
- `listening` — hint request, animating attention
- `correct` — correct feedback, happy animation
- `incorrect` — incorrect feedback, sad/encouraging animation
- `celebration` — level complete or mastery milestone

**Checklist:**
- [ ] State transitions are explicit (via `setState('state-name')`, not method calls like `.happy()`)
- [ ] Audio tied to state: each state can trigger a voice cue from the TTS pipeline
- [ ] Animations respect reduced-motion
- [ ] Not blocking: mascot state changes don't block the main interaction

### C.3 Progress Bar + Stats Display

**File:** `src/app/components/ProgressBar.tsx`

**Displays:**
- Question N of M in the level
- Stars earned (correct/incorrect/partial count)
- Session elapsed time (max 15 min per C9)
- Current skill being practiced

**Checklist:**
- [ ] Updates after each feedback
- [ ] Respects reduced-motion (no animated bar fill)
- [ ] Accessible: all numbers announced via ARIA

### C.4 E2E Test (Full Level 1 Flow)

**File:** `tests/e2e/level-loop.spec.ts`

**Scenario:**
```typescript
test('full level 1 flow: boot → answer → feedback → next', async ({ page }) => {
  // Boot to menu
  await page.goto('/');
  
  // Continue as guest
  const name = `TestStudent-${Date.now()}`;
  await page.getByTestId('menu:continue-guest').click();
  await page.getByTestId('name-input').fill(name);
  await page.getByTestId('start-button').click();
  
  // Navigate to level 1
  await page.getByTestId('level-map:level-1').click();
  
  // Question loads
  await page.waitForFunction(() => window.__TEST__.levelId === '1');
  
  // Answer the question (depends on archetype, e.g. equal_or_not)
  const archetype = await page.evaluate(() => window.__TEST__.archetypeId);
  if (archetype === 'equal_or_not') {
    await page.getByTestId('equal-or-not:button-yes').click();
  }
  
  // Feedback appears
  await page.waitForFunction(() => 
    ['correct', 'incorrect', 'partial'].includes(window.__TEST__.feedbackState)
  );
  
  // Attempt persisted
  const attemptId = await page.evaluate(() => window.__TEST__.attemptId);
  expect(attemptId).toBeTruthy();
  
  // Next question or level complete
  const nextBtn = page.getByTestId('level-screen:next-button');
  if (await nextBtn.isVisible()) {
    await nextBtn.click();
    // Loop: should load next question
    await page.waitForFunction(() => 
      (await page.evaluate(() => window.__TEST__.questionId)) !== attemptId
    );
  }
});
```

**Gate C:** E2E test passes. Dexie contains attempts. BKT updated. Level map shows progress.

---

## Phase D: UI/UX Uplift & Audio Production

**Goal:** Use the new DOM shell to land UX improvements, and produce the mascot voice + hint audio assets.

**Branches:**
- `feat/2026-05-11-uiux-uplift` (visual system, UI polish)
- `feat/2026-05-11-audio-production` (TTS assets, audio integration)

**Duration:** 2–3 weeks  
**Gate:** UI polished and mobile-tested, audio produced and playing, bundle ≤ 600 KB gz, a11y ✓

### D.1 Visual System (Design Tokens) 

**File:** `src/app/tokens/index.ts` (consolidates `src/scenes/utils/colors.ts`, `colors-high-contrast.ts`, `levelTheme.ts`, `easings.ts`)

**Checklist:**
- [ ] **Colors:**
  - Primary: #2F6FED (blue)
  - Success: #10B981 (green)
  - Error: #EF4444 (red)
  - Neutral: #6B7280 (gray)
  - High-contrast alt: invert luminance by 50%, boost saturation
- [ ] **Typography:**
  - Display (28 px): Fredoka One, weight 400
  - Title (20 px): Fredoka One, weight 400
  - Body (16 px): Lexend, weight 400
  - Label (14 px): Lexend, weight 500
  - Caption (12 px): Lexend, weight 400
  - All sizes `rem` or `em`, scale on smaller screens
- [ ] **Spacing:** 8 px base unit (4, 8, 12, 16, 24, 32, 48)
- [ ] **Radius:** 8 px (buttons), 4 px (smaller)
- [ ] **Motion:**
  - Fast: 150 ms (hover, focus)
  - Normal: 300 ms (transitions)
  - Slow: 600 ms (entrances)
  - Easing: ease-in-out (default), ease-out (feedback), custom token easings
  - All gated to `prefers-reduced-motion: reduce` → 0 ms duration
- [ ] **Safe areas:** `env(safe-area-inset-*)` applied to top/bottom on devices with notches
- [ ] **Export:** React Context + CSS custom properties (dual system)

**Accessibility check:** Every color combo tested for 4.5:1 contrast in Lighthouse + `design:accessibility-review` skill.

**Effort:** 4 hours

---

### D.2 Menu Screen Polish

**File:** `src/app/screens/MenuScreen.tsx`

**Improvements over Phaser:**
- Friendly mascot greeting at the top
- Clear "Continue where you left off" affordance (shows last played level + timestamp)
- New player path: "New student" button → name input (3 sec onboarding, then skip to Level 1)
- Return player path: "Continue" button → resume at last level
- Settings gear icon (bottom right)
- Audio toggle (top right)

**Checklist:**
- [ ] Mascot renders and animates (idle → thinking on page load)
- [ ] "Continue" shows last student name + last played level
- [ ] "New student" input field with "Start" button
- [ ] Smooth transitions (via `useTween` with reduced-motion gate)
- [ ] Touch targets ≥ 44×44 px
- [ ] Accessible: tab order logical, ARIA labels on buttons

**E2E test:** MenuScreen → click continue → navigate to last level.

**Effort:** 3 hours

---

### D.3 Level Map Screen Polish

**File:** `src/app/screens/LevelMapScreen.tsx`

**Improvements:**
- 9-node snake map layout (mimic Phaser's layout but in DOM/SVG)
- Locked/unlocked/completed visual states (icon + color + label, never color alone)
- Mastery ring per level (shows % to mastery, updates after each session)
- Mascot reacts on hover/focus (hints at difficulty, e.g. "This one's tricky!")
- "Achievements" summary: total stars, total questions answered, current streak

**Checklist:**
- [ ] Layout responsive: 360 px (1x2 grid), 480 px (2x2 grid), 768 px (3x3 grid)
- [ ] Locked icon + gray on locked levels
- [ ] Progress ring (SVG or canvas) on completed levels showing % mastery
- [ ] Hover/focus: mascot reacts, level description appears
- [ ] Mascot voice: "Ready to unlock level X?" (from TTS pipeline)
- [ ] Accessible: level description in ARIA label

**E2E test:** LevelMapScreen → check levels 2–9 locked → play level 1 → return → level 2 unlocked.

**Effort:** 4 hours

---

### D.4 In-Level UX

#### D.4.1 — Question Card

**Component:** `src/app/components/QuestionCard.tsx` (or part of LevelScreen)

**Shows:**
- Question prompt (text from curriculum)
- Illustration/visual (if in curriculum)
- Difficulty hint ("Easy", "Medium", "Tricky")
- Question N of M pagination

**Checklist:**
- [ ] Typography: body size (16 px), high contrast
- [ ] Spacing: 16 px margins, 8 px padding around text
- [ ] Difficulty icon (star fills: 1-filled = easy, 3-filled = hard)

**Effort:** 1 hour

#### D.4.2 — Hint Ladder (3-tier, animated)

**Component:** `src/app/components/HintLadder.tsx`

**Tiers:**
- **Tier 1 (Verbal):** Reads the hint text from curriculum. Mascot delivers it via audio (TTS pipeline). Button: "Get a hint" toggles it.
- **Tier 2 (Visual Overlay):** Pixi-side callout or arrow highlights the interaction region. E.g., for partition, highlights a divider line. Delivered by mascot voice: "Look here!"
- **Tier 3 (Worked Example):** Pixi-side replay of a correct answer step-by-step. E.g., for snap_match, shows a pair snapping into place. Voice: "Watch how..."

**Checklist:**
- [ ] Tiers unlock sequentially (can't skip to tier 3)
- [ ] Each tier has a visual divider (Figma-style cards stacking down)
- [ ] Smooth animations (useTween, reduced-motion gated)
- [ ] After tier 3 (worked example): hint button disabled, user must re-attempt
- [ ] Mascot state tied to hint delivery (listening on tier request, happy on tier shown)
- [ ] Accessible: each tier announced via live region ("Hint level 1:", "Hint level 2:", etc.)

**Integration with model:** After hint used, call `updateMastery(attempt, { assisted: true })` to reset unassisted streak.

**Effort:** 4 hours

#### D.4.3 — Feedback Overlay (Correct/Incorrect/Partial)

**Component:** `src/app/components/FeedbackOverlay.tsx`

**States:**
- **Correct (2–3 sec display):**
  - Message: "Awesome! You got it right! ✓"
  - Visual: confetti (CSS animation or rAF + tokens, ≤ 5 KB)
  - Mascot: happy state, celebratory voice ("Nice work!")
  - Audio: success chime (from TTS pipeline or pre-rendered)
  - Auto-fade or "Next" button
  
- **Incorrect (2–3 sec display):**
  - Message: "Not quite. Try again!"
  - Visual: shake animation on canvas (rAF, 200 ms)
  - Mascot: sad/encouraging state, supportive voice ("Keep trying!")
  - Audio: gentle error sound
  - Show "Hint" option; "Try again" button
  
- **Partial (2–3 sec display):**
  - Message: "You got [part names], but [missing part]."
  - Visual: highlight correct parts, gray out missing parts
  - Mascot: neutral state, guidance voice ("Almost!")
  - Audio: partial-correct chime
  - "Try again" button

**Checklist:**
- [ ] Animations via `useTween`, respecting reduced-motion
- [ ] All text readable (contrast ≥ 4.5:1)
- [ ] Mascot state correctly tied to feedback type
- [ ] Audio queued (via AudioService, which plays TTS pipeline assets)
- [ ] Touch target on "Next" / "Hint" / "Try again" buttons ≥ 44×44 px

**Effort:** 3 hours

---

### D.5 Settings Screen Polish

**File:** `src/app/screens/SettingsScreen.tsx`

**Native form controls (HTML + CSS, no custom widgets):**
- [ ] **Toggle: Audio on/off** — speaker icon + toggle switch
- [ ] **Toggle: Reduced motion** — snowflake icon + toggle (overrides OS pref)
- [ ] **Radio group: Contrast** — Normal / High-contrast selector
- [ ] **Select: Text size** — Small / Normal / Large (applies CSS `--font-scale` custom prop)
- [ ] **Button: Refresh curriculum** — invalidates curriculum-cache, refetches from CDN (or local file if offline)
- [ ] **Button: Backup student data** — exports IndexedDB snapshot to JSON file (downloadable)
- [ ] **Button: Restore from file** — imports IndexedDB snapshot (for researchers / pilot setup)
- [ ] **Text display: Student ID** — UUID (copiable for researcher tracking)

**Accessibility:**
- [ ] All form labels visible (no floating labels)
- [ ] Tab order correct (top to bottom)
- [ ] Submit buttons clearly labeled
- [ ] Confirmation dialog on "Restore" (confirm before overwriting)

**Offline handling:** All toggles persisted to `src/lib/preferences.ts` (already exists per scaffolding).

**Effort:** 3 hours

---

### D.6 First-Run Onboarding

**File:** `src/app/screens/OnboardingScreen.tsx` (new, or part of MenuScreen flow)

**Flow (< 60 seconds):**
1. Mascot intro: "Hi! I'm [name]. Ready to learn about fractions?" (voice from TTS)
2. Name input: "What's your name?" (textbox, focus auto-set)
3. Avatar color picker: "Pick a color for your student card." (3–5 color swatches)
4. Brief tutorial: "To answer a question, tap or drag. Let's try!" (simple demo interaction, e.g. tap a button)
5. "Ready? Let's start Level 1!" (CTA button)

**Checklist:**
- [ ] Animations: fade-in per step, transitions smooth (reduced-motion gated)
- [ ] Voice: TTS pipeline audio played for Mascot dialog
- [ ] Tutorial interaction: interactive demo (not a screenshot), resets after demo
- [ ] Mobile-friendly: full-screen on 360 px width, readable text (≥ 16 px), touch targets ≥ 44 px
- [ ] Accessible: headings, form labels, live region for progress ("Step 2 of 5")

**Effort:** 2 hours

---

### D.7 Celebration Moments

#### D.7.1 — Level Complete

**Component:** Overlay (full-screen) triggered when all skills in a level are mastered.

**Shows:**
- Large animated stars (fill from left to right)
- Message: "You completed Level 1! ⭐⭐⭐"
- Mascot: celebration animation, voice: "Awesome job! You unlocked Level 2!"
- Audio: celebratory fanfare (TTS pipeline or pre-recorded)
- "Next Level" CTA button (or "See achievements")

**Checklist:**
- [ ] Only triggers once per level (on first completion)
- [ ] Stars animated in (rAF + tokens, total 1–2 sec)
- [ ] Mascot voice plays without blocking interaction
- [ ] Button navigates to LevelMapScreen with level 2 now unlocked

**Effort:** 2 hours

#### D.7.2 — Mastery Milestone

**Component:** Toast notification when a student masters a skill (BKT P(C) > 0.95).

**Shows:**
- Icon: ⭐ or KC icon
- Message: "You mastered [skill name]! Halves are no problem now."
- Dismissed automatically after 3 sec or on tap

**Checklist:**
- [ ] Non-blocking (appears overlay on game state)
- [ ] Voice optional (can skip if audio off)
- [ ] Distinct from level-complete (smaller, less intrusive)

**Effort:** 1 hour

#### D.7.3 — Streak Tracker (Light, Non-Pressuring)

**Component:** Small badge in progress bar showing consecutive correct answers.

**Shows:**
- "3 in a row!" if streak ≥ 3
- Subtle celebration (no sound, no pressure)
- Resets on incorrect answer

**Checklist:**
- [ ] Badge only shows on streak ≥ 3
- [ ] Not a game-over condition (incorrect just resets it)
- [ ] No leaderboard, no social pressure (C2 compliance)

**Effort:** 1 hour

---

### D.8 Mobile App Affordances (PWA Polish)

#### D.8.1 — Manifest + Splash Screen

**Task:** Configure PWA manifest for Android Chrome PWA install.

**Files:** `public/manifest.json`, `public/icons/*`, `public/screenshots/*` (already partially set up in `vite.config.ts`)

**Checklist:**
- [ ] Manifest includes all required fields: `name`, `short_name`, `description`, `start_url`, `display: "standalone"`, `theme_color`, `background_color`
- [ ] Icons: 192×192 (any), 512×512 (any), 192×192 + 512×512 (maskable for adaptive icon)
- [ ] Screenshots: 540×720 (narrow), 1024×768 (wide) for install prompt preview
- [ ] On real device: "Install app" prompt appears after 2nd visit, user can add to home screen
- [ ] Launch from home screen: opens in standalone mode (no browser chrome)

**Real device test:**
```
1. Visit app on real Android device (Chrome)
2. After 2 visits, "Install app" prompt should appear
3. Accept install
4. Icon added to home screen
5. Tap to open: should launch in PWA mode (fullscreen, no URL bar)
```

**Effort:** 1 hour

#### D.8.2 — In-App Install Prompt (Optional)

**Component:** `src/app/components/InstallPrompt.tsx`

**Shows:** After a student completes their 2nd session, a soft prompt:
- Message: "Install Questerix to play offline?"
- Icon: download or home-screen icon
- "Install" button (calls `beforeinstallprompt.prompt()`)
- "Maybe later" button (dismiss, show again next session)

**Checklist:**
- [ ] Only shows for non-installed users (check `window.navigator.standalone === false`)
- [ ] Only shows after 2 sessions (store flag in Dexie)
- [ ] Dismissible and non-intrusive
- [ ] Install actually works (opens full-screen PWA)

**Effort:** 1 hour

#### D.8.3 — Safe Area Insets + Orientation Lock

**Task:** Respect notches and lock to portrait orientation.

**Files:** `src/app/App.tsx` (root CSS), `public/manifest.json`

**Checklist:**
- [ ] CSS: `body { padding: env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left); }`
- [ ] Manifest: `"orientation": "portrait"` (forces portrait on Android)
- [ ] Real device test on notch phone (iPhone-style or punch-hole Android): content doesn't hide behind notch

**Effort:** 30 min

#### D.8.4 — No Text Selection on Game Elements

**Task:** Prevent long-press text selection on the Pixi canvas and interactive DOM elements (breaks drag UX).

**Files:** `src/app/screens/LevelScreen.tsx`, `src/interactions/pixi/PixiStage.tsx`

**CSS:**
```css
.interaction-container {
  user-select: none;
  -webkit-user-select: none;
  -webkit-touch-callout: none; /* Disable long-press menu */
  touch-action: manipulation; /* Disable double-tap zoom, enable fast click */
}
```

**Checklist:**
- [ ] No text selection on canvas or buttons during drag
- [ ] No long-press (right-click) menu on canvas
- [ ] Double-tap zoom disabled (fast 300ms click still works)

**Effort:** 30 min

#### D.8.5 — Disable Pull-to-Refresh

**Task:** Prevent swipe-down-to-refresh gesture from accidentally reloading mid-question.

**CSS:**
```css
body {
  overscroll-behavior: none;
}
```

**Real device test:** Swipe down during a question; app should not reload.

**Effort:** 15 min

#### D.8.6 — Haptic Feedback on Interaction (Android-only, optional)

**Task:** Subtle vibration on tap (optional feature, default on for pilot).

**Code sketch:**
```typescript
const handleTap = () => {
  if (navigator.vibrate && haptics === 'on') {
    navigator.vibrate(10); // 10 ms vibration
  }
  // ... proceed with tap logic
};
```

**Checklist:**
- [ ] Gated to Settings toggle (default on)
- [ ] No-op on devices without vibration API (iOS PWA)
- [ ] Subtle duration (10–20 ms, not annoying)

**Effort:** 1 hour

---

### D.9 Audio Production (TTS Pipeline)

**Why:** Mascot voice + hint audio is expected feedback. Per memory, build-time TTS pipeline decided (OpenAI gpt-4o-mini-tts, no runtime overhead).

**Files:** `src/audio/` (existing pipeline infrastructure per CLAUDE.md)

**D.9.1 — Verify TTS Pipeline Exists**

**Task:** Check if `pipeline/generate-audio.py` or equivalent exists.

**Checklist:**
- [ ] `pipeline/generate-audio.py` (or similar) exists
- [ ] It calls OpenAI TTS API: `tts-1` model, voice `onyx` (for mascot)
- [ ] It reads a manifest of audio strings (greetings, hints, feedback, etc.)
- [ ] It outputs MP3 files to `public/audio/`
- [ ] It's documented in README / CLAUDE.md

**If missing:** Create the pipeline (see next steps).

**Effort:** 1–2 hours (research + implementation if missing)

**D.9.2 — Audio Manifest (All Strings to Produce)**

**File:** `audio-manifest.json` (new, or part of curriculum)

**Schema:**
```json
{
  "mascot_greetings": [
    { "id": "mascot:greeting:level-1", "text": "Ready to learn about halves?" },
    { "id": "mascot:greeting:level-2", "text": "Thirds are next! Let's go." }
  ],
  "hints": [
    { "id": "hint:partition:tier-1", "text": "Divide the shape into equal parts." }
  ],
  "feedback": [
    { "id": "feedback:correct", "text": "Nice work!" },
    { "id": "feedback:incorrect", "text": "Try again." }
  ],
  "milestones": [
    { "id": "milestone:mastery:halves", "text": "You mastered halves!" }
  ]
}
```

**Checklist:**
- [ ] Manifest covers: greetings (one per level), hints (per archetype + tier), feedback (correct/incorrect/partial), milestones (mastery), celebrations
- [ ] Text is K-2 friendly (short, clear, encouraging)
- [ ] Total ~80–120 audio files
- [ ] Approve manifest before audio production

**Effort:** 2 hours

**D.9.3 — Generate Audio (OpenAI TTS)**

**Task:** Run pipeline to produce all audio files.

**Command:**
```bash
export OPENAI_API_KEY=sk-...
python pipeline/generate-audio.py --manifest audio-manifest.json --output public/audio/
```

**Checklist:**
- [ ] All 80–120 files generated and stored in `public/audio/`
- [ ] Each file named `<id>.mp3` (e.g. `mascot:greeting:level-1.mp3`)
- [ ] File sizes reasonable: ~20–50 KB per file (TTS output)
- [ ] Total size < 5 MB (17 min of audio at ~15 KB/s)

**Effort:** 30 min (execution) + 1 hour (cost estimation / API review)

**Note:** OpenAI TTS cost is ~$0.015 per 1K characters. 80 strings × avg 50 chars = 4K chars ≈ $0.06 total.

**D.9.4 — Audio Service Integration**

**File:** `src/app/services/AudioService.ts` (already exists per scaffolding)

**Checklist:**
- [ ] `AudioService.play(id: string)` loads and plays the file from `public/audio/{id}.mp3`
- [ ] Handles loading state (buffering)
- [ ] Respects Settings audio toggle (default on)
- [ ] No network request needed (files bundled or cached)
- [ ] Multiple plays don't queue (stop previous + start new)

**Effort:** 1 hour

**D.9.5 — Audio Integration in Components**

**Checklist:**
- [ ] MenuScreen: `await AudioService.play('mascot:greeting:level-1')` on first visit
- [ ] LevelScreen: `AudioService.play(hintId)` when hint unlocked
- [ ] FeedbackOverlay: `AudioService.play('feedback:correct')` on correct feedback
- [ ] LevelCompleteOverlay: `AudioService.play('celebration:level-1')` on level complete
- [ ] All plays are non-blocking (async, don't await)

**Effort:** 2 hours

---

### D.10 Phase D Final Verification

**Checklist:**
- [ ] `npm run typecheck && npm run lint && npm run test:unit && npm run test:e2e && npm run test:a11y` all green
- [ ] `npm run measure-bundle` ≤ 600 KB gz (D.* added some bloat, but within budget)
- [ ] `design:design-critique` on MenuScreen, LevelMapScreen, LevelScreen (key surfaces)
- [ ] `design:accessibility-review` on all new components
- [ ] `a11y-auditor` agent clean on the diff
- [ ] Audio files produced and playing (manual test: open app, hear mascot voice)
- [ ] PWA install works on real Android device

**Gate D (final):** All above pass, UX is measurably better than Phaser shell.

**Effort estimate:** 2–3 weeks (phases D.1–D.10)

---

## Phase E: Mobile Chrome Validation

**Goal:** Prove the app works on real Android, not just dev box.

**Branch:** `chore/2026-05-11-mobile-validation`  
**Duration:** 1 week (incl. manual device pass)  
**Gate:** Playwright Chrome projects green, Lighthouse thresholds met, real device smoke test passed

### E.1 Playwright Chrome Configuration

**File:** `playwright.config.ts`

**Update projects:**
```typescript
{
  name: 'chromium-pixel5',
  use: {
    ...devices['Pixel 5'],
  },
},
{
  name: 'chromium-pixel7',
  use: {
    ...devices['Pixel 7'],
  },
},
{
  name: 'chromium-small',
  use: {
    ...devices['Galaxy S8'],  // or custom 360x640
  },
}
```

**Remove:** Any Firefox, Safari, WebKit projects.

**Checklist:**
- [ ] Projects updated
- [ ] Run: `npx playwright test --project=chromium-pixel5`
- [ ] All smoke tests pass on all 3 projects

**Effort:** 1 hour

---

### E.2 Manual Android Device Matrix (Real Devices)

**Required devices:**
1. **Mid-tier Android (e.g., Pixel 5 or Pixel 6a)** — ≥ 6 GB RAM, 90+ Hz screen, baseline hardware
2. **Low-tier Android (e.g., 2020 budget phone)** — ≤ 4 GB RAM, 60 Hz, surfaces GC pressure

**Per-device checklist:**

**Boot & Navigation**
- [ ] App opens from home screen (PWA installed)
- [ ] Loads in < 2 sec (slow 3G baseline)
- [ ] Menu displays correctly, no layout shifts

**Level Flow**
- [ ] Play Level 1, all 5 questions
- [ ] Each archetype renders (equal_or_not, identify, label, snap_match, compare)
- [ ] Tap / drag responsive (< 100 ms latency)
- [ ] Feedback displays without lag

**Offline**
- [ ] Enable airplane mode
- [ ] App still boots (service worker cache)
- [ ] Can play a cached question
- [ ] Attempts written to local IndexedDB (sync on reconnect)

**Accessibility**
- [ ] Reduced-motion toggle works (animations stop)
- [ ] High-contrast toggle works (colors adjusted)
- [ ] Text size toggle works (sizes adjusted)

**Audio**
- [ ] Mascot voice plays clearly
- [ ] Hint audio plays
- [ ] Feedback sounds play (if enabled)

**Visual**
- [ ] No text overlaps, no layout shifts
- [ ] Buttons clearly tappable (≥ 44×44 px)
- [ ] Colors legible (contrast OK)

**Performance**
- [ ] No jank during drag (FPS ≥ 55)
- [ ] No crashes or blank screens
- [ ] Memory stable (no OOM)

**Record findings:** Screenshot + notes for each device in `PLANS/_artifacts/device-matrix-2026-05-11.md`.

**Effort:** 2–3 hours per device (2 devices = 4–6 hours total)

---

### E.3 Lighthouse CI

**Tool:** `lhci` (already in workflow per PR #108)

**Thresholds (mobile profile):**
- Performance ≥ 90
- Accessibility ≥ 95
- PWA installability: pass
- Best Practices ≥ 95

**Command:** CI runs automatically on PR; review results.

**Checklist:**
- [ ] Lighthouse scores meet thresholds
- [ ] First contentful paint < 1.5 s
- [ ] Cumulative layout shift < 0.1
- [ ] Largest contentful paint < 2.5 s

**Effort:** 1 hour (review + iteration if needed)

---

### E.4 Performance Probes

**Tap Latency (per-archetype):**
- Open DevTools Performance
- Record a single tap on an interactive element
- Measure: `pointerdown` event → visual response (color change, feedback display)
- Target: ≤ 100 ms
- Record results in `PLANS/_artifacts/latency-2026-05-11.md`

**FPS (Drag Archetypes):**
- Use Chrome DevTools Rendering > Show FPS meter
- Drag continuously for 5 sec in `make`, `placement`, `order`, `snap_match`
- Target: mean ≥ 55 fps, min ≥ 45 fps
- Record results

**Memory:**
- DevTools Memory > Take heap snapshot before a session
- Play Level 1 fully (5 questions)
- Take heap snapshot after
- Measure delta: < 50 MB (GC recovers)
- Record results

**Effort:** 2 hours

---

### E.5 A11y Axe-Core Suite

**Command:** `npm run test:a11y`

**Checklist:**
- [ ] No violations
- [ ] No warnings (if possible)
- [ ] All interactive elements have accessible names
- [ ] All form inputs have labels
- [ ] Color contrast ≥ 4.5:1

**Real device:**
- [ ] Voice control works (Android accessibility menu)
- [ ] Screen reader (Android TalkBack) can navigate all screens
- [ ] No ARIA violations

**Effort:** 1 hour (mostly automated)

---

### E.6 Phase E Final Verification

**Checklist:**
- [ ] Playwright tests pass on 3 Chromium profiles
- [ ] Manual device matrix clean (no blockers on 2 real devices)
- [ ] Lighthouse thresholds met
- [ ] Latency, FPS, memory targets hit
- [ ] A11y suite green
- [ ] No regressions from D.*

**Gate E (final):** All above pass, app production-ready for real users.

**Effort estimate:** 1 week

---

## Phase F: Production Cutover

**Goal:** Make `npm run build` ship the React+Pixi app, not Phaser. Tree-shake Phaser out.

**Branch:** `refactor/2026-05-11-cutover`  
**Duration:** 3–5 evenings  
**Gate:** Bundle ≤ 1.0 MB gz, all suites green, revert tested, C4/C7 revised

### F.1 Vite Config Flip

**File:** `vite.config.ts`

**Changes:**
- Remove `isSpikeMode` logic
- Change default entry from `index.html` (Phaser) to `spike.html` (React)
- Or: rename `spike.html` → `index.html` after backing up Phaser entry

**Checklist:**
- [ ] `npm run build` produces `dist/index.html` with React entry
- [ ] `npm run dev:app` boots React app by default (no `VITE_SPIKE=1` needed)
- [ ] Phaser entry archived to `src/_phaser-legacy/` (reference only, not built)

**Effort:** 1 hour

---

### F.2 Move Phaser Legacy to _phaser-legacy/

**Task:** Quarantine old Phaser stack for regrettability window (Phase G).

**Checklist:**
- [ ] Create `src/_phaser-legacy/` directory
- [ ] Move `src/scenes/` → `src/_phaser-legacy/scenes/`
- [ ] Move Phaser-only `src/components/*.ts` (GameObjects) → `src/_phaser-legacy/components/`
- [ ] Move old `TestHooks.ts` → `src/_phaser-legacy/TestHooks.ts`
- [ ] Move old `A11yLayer.ts` → `src/_phaser-legacy/A11yLayer.ts`
- [ ] Update `vite.config.ts` to exclude `_phaser-legacy/` from production build:
  ```typescript
  // In rollup options:
  input: path.resolve(__dirname, 'index.html'), // Don't include _phaser-legacy
  ```
- [ ] Verify `npm run build` doesn't include any Phaser files

**Effort:** 1 hour

---

### F.3 Grep Verification (No Phaser Imports in Production)

**Command:**
```bash
grep -r "from 'phaser'" src/app src/interactions src/engine src/validators src/persistence src/lib src/components
# Should return 0 hits (nothing in production code)
```

**Checklist:**
- [ ] Grep returns 0 hits
- [ ] Only `src/_phaser-legacy/` can import Phaser
- [ ] `package.json` still lists `phaser` dependency (for regrettability window)

**Effort:** 30 min

---

### F.4 Playwright Selectors Migration

**Task:** Update E2E tests to use new React-side `data-testid` hooks, not old Phaser DOM.

**Checklist:**
- [ ] Create new `tests/e2e/fixtures/` routes if needed (for component testing)
- [ ] Update all tests under `tests/e2e/` to use `page.getByTestId()`
- [ ] Remove old `TestHooks`-based assertions (e.g., `page.locator('.phaser-text')`)
- [ ] Run `npm run test:e2e` — all tests should pass with new selectors

**Effort:** 2–3 hours

---

### F.5 Test Revert Path

**Task:** Ensure `git revert -m 1 <cutover-merge-sha>` cleanly restores the Phaser app.

**Checklist:**
- [ ] On a temporary branch:
  ```bash
  git checkout -b test-revert
  git revert -m 1 <merge-sha>  # <merge-sha> = the cutover PR merge commit
  npm install
  npm run build
  npm run dev:app
  ```
- [ ] Verify: dev server boots Phaser app, index.html works, smoke tests pass
- [ ] If successful: delete test-revert branch, document revert works

**Result:** Single revert commit tested and working.

**Effort:** 1 hour

---

### F.6 Constraint Revisions (C4 + C7)

**Files:** `docs/00-foundation/constraints.md`, `docs/00-foundation/decision-log.md`

**C4 update:**
```markdown
## C4 - Runtime Stack

**Old:** Phaser 4 + TypeScript + Vite + Dexie; no React/Redux/new frameworks

**New (2026-05-11 decision):** React + TypeScript + Vite + PixiJS + Dexie; no Redux, no Zustand, no Next.js, no backend framework

**Rationale:** Phaser stack completed MVP; React+Pixi enables faster UX iteration during validation phase while keeping the bundle under 1.0 MB. All core systems (engine, validators, persistence, curriculum) remain unchanged.
```

**C7 update:**
```markdown
## C7 - Responsive & Device Support

**Old:** Responsive 360–1024 px, iOS Safari + Android Chrome + desktop

**Interim (2026-05-11 to post-pilot):** Mobile-first PWA, 360–480 px Android Chrome only. iOS Safari and desktop deferred post-pilot.

**Post-pilot:** Revisit iOS Safari support and desktop web.
```

**Decision-log entry** (invoke `/decision` slash command or edit directly):
```markdown
## 2026-05-11 — Runtime cutover: Phaser → React + PixiJS

**Status:** Accepted

**Context:**
- MVP complete: persistence, curriculum, 11 archetypes
- Spike validated: 270.7 KB → 240 KB (budget ✓), touch latency ✓, a11y ✓
- Phaser stack limits UI iteration; React+DOM enables faster polish for validation

**Decision:**
- Adopt React 19 + PixiJS 8 + wouter for routing, no state library
- Phaser decommissioned Phase 9 after regrettability window
- C4/C7 revised per constraints.md

**Consequences:**
- Bundle resets: 1.0 MB gz budget now with React+Pixi instead of Phaser
- New folder structure: src/app/, src/interactions/, src/_phaser-legacy/ during window
- Test migration: Playwright selectors updated to React data-testid
- Two-week regrettability window before Phaser removal
```

**Effort:** 1 hour

---

### F.7 Documentation Updates

**Files to update:**
- [ ] `docs/30-architecture/stack.md` — add React+PixiJS architecture diagram
- [ ] `docs/30-architecture/runtime-architecture.md` — describe React/Pixi boundaries
- [ ] `docs/30-architecture/performance-budget.md` — update bundle slices (React vs Phaser)
- [ ] `docs/30-architecture/test-strategy.md` — update test layers for React
- [ ] `CLAUDE.md` (root) — update source map, constraints summary
- [ ] `npm run sync:claude-md` — refresh auto-generated tables

**Effort:** 2 hours

---

### F.8 Full Test Suite + Audits

**Commands:**
```bash
npm run typecheck
npm run lint
npm run test:unit
npm run test:integration  # if persistence surfaces changed
npm run test:e2e
npm run test:a11y
npm run measure-bundle    # must be ≤ 1.0 MB gz
npm run build
```

**Invoke subagents (parallel):**
- `bundle-watcher` — verify bundle ≤ 1.0 MB gz
- `c1-c10-auditor` — verify no constraint drift
- `a11y-auditor` — verify a11y still clean
- `engine-determinism-auditor` — verify no host-globals in engine
- `validator-parity-checker` — verify validator contracts unchanged
- `curriculum-byte-parity` — verify curriculum bundle unchanged
- `level-spec-parity` — verify level specs match bundle

**Gate F:** All suites + agents green.

**Effort:** 2 hours (mostly automated)

---

### F.9 Phase F Final Checklist

- [ ] `npm run build` produces React+Pixi build (no Phaser)
- [ ] Grep confirms 0 Phaser imports in src/app/**
- [ ] All test suites green
- [ ] All auditor agents clean
- [ ] Revert tested and working
- [ ] C4 + C7 revised, decision log entry filed
- [ ] Docs updated, `npm run sync:claude-md` complete
- [ ] Bundle ≤ 1.0 MB gz
- [ ] Ready for merge to main

**Gate F (final):** All above pass. PR approved and ready to merge.

**Effort estimate:** 3–5 evenings

---

## Phase G: Regrettability Window

**Goal:** Let the cutover stabilize in real usage, with a tested revert path.

**Duration:** 2 weeks (real-time elapse, not effort)  
**Rule:** Phaser quarantined in `src/_phaser-legacy/`, no new feature work depending on React-only primitives

**Reversion triggers (any one = revert):**
- A critical flow regresses and the fix is non-trivial
- A real-device-only regression appears that CI missed
- Bundle grows past 1.0 MB with production data
- A11y issue surfaces that per-archetype audits missed

**Daily check (automated via CI nightly):**
- Full test suite green
- Bundle ≤ 1.0 MB gz
- No new crashes reported in IndexedDB error log

**After 2 weeks:**
- All 9 levels played end-to-end on main (if available for testers)
- No reversion trigger fired
- Proceed to Phase H

**Effort:** Minimal (passive observation, daily CI check)

---

## Phase H: Decommission Phaser

**Goal:** Remove legacy Phaser code, finalize the stack.

**Branch:** `refactor/2026-05-25-decommission-phaser` (or whenever Phase G exits)  
**Duration:** 2–3 evenings  
**Gate:** No Phaser traces, all suites green, docs updated

### H.1 Delete Phaser Legacy

**Checklist:**
- [ ] Delete `src/_phaser-legacy/` directory entirely
- [ ] Run `npm install` to ensure lockfile updated
- [ ] Grep for "phaser": should return only `package.json` and `package-lock.json`

**Effort:** 30 min

---

### H.2 Remove Phaser Dependency

**File:** `package.json`

**Checklist:**
- [ ] Delete `"phaser": "^4...."` from dependencies
- [ ] Run `npm install` to lock in the change
- [ ] Verify lockfile no longer mentions Phaser

**Effort:** 30 min

---

### H.3 Remove Old TestHooks + A11yLayer

**Checklist:**
- [ ] Remove `src/_phaser-legacy/TestHooks.ts` → fully migrated to React `data-testid`?
  - Run full E2E suite; if green, safe to delete
- [ ] Remove `src/_phaser-legacy/A11yLayer.ts` → fully replaced by React a11y?
  - Run a11y tests; if green, safe to delete

**Effort:** 1 hour

---

### H.4 Documentation + Sync

**Checklist:**
- [ ] Update `CLAUDE.md` source map: remove `src/scenes/` and Phaser component entries
- [ ] Update `docs/30-architecture/stack.md`: remove Phaser diagrams, finalize React+Pixi
- [ ] Update `docs/00-foundation/constraints.md`: finalize C4/C7 descriptions (no interim language)
- [ ] Add entry to `docs/00-foundation/decision-log.md`: "2026-05-25 — Phaser decommissioned"
- [ ] `npm run sync:claude-md` to refresh auto-generated sections
- [ ] Archive the migration plan: `PLANS/2026-05-10-react-pixijs-migration.md` → `PLANS/_archive/`
- [ ] Archive this plan: `PLANS/2026-05-11-DETAILED-PLAN.md` → `PLANS/_archive/`

**Effort:** 1 hour

---

### H.5 Full Test Suite

**Checklist:**
- [ ] `npm run typecheck && npm run lint && npm run test:unit && npm run test:e2e && npm run test:a11y && npm run measure-bundle && npm run build` all green
- [ ] Subagents all clean
- [ ] Production build has zero Phaser bytes

**Effort:** 1 hour (mostly automated)

---

### H.6 Phase H Final Checklist

- [ ] `src/_phaser-legacy/` deleted
- [ ] Phaser dep removed from package.json
- [ ] Old TestHooks + A11yLayer deleted (fully migrated)
- [ ] Docs updated + synced
- [ ] Migration + plan archived
- [ ] All suites green
- [ ] Ready to ship stable React+Pixi build

**Gate H (final):** All above complete.

**Effort estimate:** 2–3 evenings

---

## Phase I: Pilot Validation & Data Extraction

**Goal:** Run the pilot protocol with real K-2 students, iterate based on findings, extract data.

**Duration:** 4 weeks (real-time elapse) + deployment prep  
**Gate:** No blocker bugs, ≥ 80% completion rate through Level 3, data extraction working

### I.1 Deployment Setup

**Task:** Make the app accessible to pilot testers.

**Options:**
1. **Public deploy** (Vercel, Netlify): `npm run build && npm run deploy`
   - URL: https://questerix-fractions.vercel.app (example)
   - Shareable via QR code on devices
   
2. **PWA manifest ready** (already done in D.8.1)
   - Android Chrome users can "Install app"
   - Works offline after first visit

3. **Researcher setup doc** (new)
   - Instructions for adult to install on child's device
   - WiFi setup, offline mode, audio check
   - Export data instructions (see I.3)

**Checklist:**
- [ ] App deployed to public URL or localhost with QR code
- [ ] PWA install works on real Android device
- [ ] Researcher doc written (1-page PDF)

**Effort:** 2 hours

---

### I.2 Pilot Protocol Execution

**Reference:** `docs/40-validation/pilot-protocol.md` (existing spec)

**Per tester (K-2 student):**
- [ ] Informed consent from parent
- [ ] One 15-min session (C9) per day for 4 weeks
- [ ] Researcher observes and notes: engagement, confusion points, completion level
- [ ] Researcher records quantitative data: questions answered, correct rate, hints used, time per level

**Tester count:** 3–5 students (3 levels each ≈ 9 sessions total)

**Data captured automatically (Dexie):**
- Every attempt: question, answer, correctness, time, hints used
- BKT state after each question
- Misconception flags triggered
- Session summary (start time, end time, levels played)

**Effort:** 4 weeks (execution) + ~2 hours/week admin (data backup, observation notes)

---

### I.3 Data Extraction & Analysis

**Task:** Pull pilot data from testers' devices, analyze learning outcomes.

**I.3.1 — Export Data from Dexie**

**Component:** Already exists in Settings (Phase D.5) — "Backup student data" button.

**Researcher workflow:**
1. After each session, ask tester to tap "Backup" in Settings
2. Save JSON file to laptop
3. Run analysis script (see next step)

**Checklist:**
- [ ] Backup/export button works on every tested device
- [ ] JSON output contains all relevant tables: attempts, sessions, mastery, misconceptions, flags

**Effort:** Automated (already built in D.5)

**I.3.2 — Analysis Script (Python)**

**File:** `pilot-analysis.py` (new)

**Script analyzes exported JSON and produces:**
- Time-to-mastery curves per skill (compare against design predictions)
- Misconception frequency per skill
- Hint usage patterns
- Learning efficiency metrics (questions to mastery, correct-rate ramp)

**Output:** CSV + plots (saved to `PLANS/_artifacts/pilot-results-2026-05-11/`)

**Effort:** 3 hours (write script + run it)

**I.3.3 — Findings Report**

**Document:** `PLANS/_artifacts/pilot-findings-2026-05-11.md`

**Includes:**
- Tester profiles (age, prior fraction knowledge, device)
- Time-to-mastery summary (compare to design targets)
- Misconceptions observed (frequency, timing)
- Usability issues (confusion points, accessibility gaps)
- Recommendations for next iteration (e.g., "hint tier 2 needs earlier timing")

**Effort:** 2 hours (synthesis)

---

### I.4 Iteration During Pilot

**Rule:** Weekly review of emerging patterns. Fix critical bugs; defer nice-to-haves.

**Weekly check-in:**
- [ ] Any crash on real devices? Fix before next session.
- [ ] Any a11y issue? Fix before next session.
- [ ] Bundle size stable? Yes (frozen at 1.0 MB).
- [ ] Any learning inefficiency (e.g., one skill never mastered)? Investigate misconception flags; may indicate bad question design (escalate to curriculum team post-pilot).

**Checklist:**
- [ ] No blocker bugs accumulate
- [ ] Fix turnaround < 48 hours (critical bugs)
- [ ] All fixes tested before tester plays again

**Effort:** 2–3 hours/week (triage + fixes)

---

### I.5 Phase I Final Gate

**After 4 weeks:**

**Checklist:**
- [ ] All 3–5 testers completed Level 1–3 (5 questions each)
- [ ] Completion rate ≥ 80% (i.e., testers willing to continue)
- [ ] No blocker bugs remaining
- [ ] Data extraction + analysis complete
- [ ] Findings report written

**Decision:** 
- If findings are positive (learning curves match design, no major a11y gaps):
  - Ship v1.0 for public beta or next cohort
  - Archive pilot report + analysis
- If findings reveal critical issues:
  - Root-cause any learning inefficiency (curriculum vs. UX vs. tech)
  - Design iteration plan
  - Run a second pilot cohort (if resources allow)

**Effort estimate:** 4 weeks (execution)

---

## Appendices

### Appendix A: Error Boundary Specification

**Component:** `src/app/components/ErrorBoundary.tsx`

**Spec:**
```typescript
import React from 'react';
import * as Sentry from '@sentry/react'; // optional, dormant unless DSN set

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log to IndexedDB error table
    if (window.indexedDB) {
      const db = await this.getDb();
      const tx = db.transaction(['error_log'], 'readwrite');
      await tx.objectStore('error_log').add({
        timestamp: Date.now(),
        message: error.message,
        stack: error.stack,
        component: errorInfo.componentStack,
      });
    }
    
    // Optional: send to Sentry if configured
    if (Sentry && process.env.VITE_SENTRY_DSN) {
      Sentry.captureException(error, { contexts: { react: errorInfo } });
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '1rem', textAlign: 'center' }}>
          <h1>Oops! Something went wrong.</h1>
          <p>{this.state.error?.message}</p>
          <button onClick={() => window.location.reload()}>
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
```

**Placement:**
- `<ErrorBoundary>` at App root
- `<ErrorBoundary>` around each route (`LevelScreen`, etc.)
- `<ErrorBoundary>` around each renderer (inside Suspense fallback)

---

### Appendix B: TestHooks Contract (React)

**Global API:** `window.__TEST__` (test-only, defined in `src/app/main.tsx` for `VITE_SPIKE=1`)

```typescript
interface WindowWithTest extends Window {
  __TEST__?: {
    // Current state
    levelId: "1" | "2" | ... | "9" | null;
    archetypeId: string | null;
    questionId: string | null;
    studentId: string;
    sessionId: string;
    
    // Model state
    modelState: Record<string, any>;
    answerPayload: Record<string, any> | null;
    
    // Interaction feedback
    feedbackState: "idle" | "correct" | "incorrect" | "partial";
    hintLevel: 0 | 1 | 2 | 3;
    
    // Persistence
    attemptId: string | null;
    
    // Debugging
    log: (msg: string) => void;
    dumpDb: () => Promise<any>; // returns IndexedDB contents
  };
}

// In src/app/main.tsx:
if (import.meta.env.VITE_SPIKE === '1') {
  (window as any).__TEST__ = {
    levelId: null,
    // ... etc
  };
}
```

**Usage in Playwright:**
```typescript
// Wait for state to update
await page.waitForFunction(() => window.__TEST__.feedbackState === 'correct');

// Get current state
const state = await page.evaluate(() => window.__TEST__.modelState);

// Dump IndexedDB for debugging
const db = await page.evaluate(() => window.__TEST__.dumpDb());
```

---

### Appendix C: Memory Cleanup Rules (Per-Archetype)

**Checklist to verify before per-archetype gate:**

**useEffect cleanup (React side):**
- [ ] Every `useEffect` has a cleanup function (return statement)
- [ ] Cleanup cancels timers: `clearTimeout(id)`, `clearInterval(id)`
- [ ] Cleanup removes listeners: `element.removeEventListener('event', handler)`
- [ ] Cleanup cancels pending Dexie writes: `.abort()` if supported

**Example:**
```typescript
useEffect(() => {
  const timeoutId = setTimeout(() => nextQuestion(), 3000);
  const handler = () => handleResize();
  window.addEventListener('resize', handler);
  
  return () => {
    clearTimeout(timeoutId);
    window.removeEventListener('resize', handler);
  };
}, []);
```

**Pixi cleanup (canvas side):**
- [ ] `onUnmount`: call `app.destroy()` on the PixiJS app
- [ ] Every sprite/shape created: store ref, call `.destroy()` in cleanup
- [ ] Every event listener added to Pixi object: store ref, call `.off(event, handler)` in cleanup

**Example:**
```typescript
const sprite = new Sprite(texture);
sprite.eventMode = 'static';
sprite.on('pointerdown', handleTap);
onUnmount(() => {
  sprite.off('pointerdown', handleTap);
  sprite.destroy();
});
```

**Memory verification (DevTools):**
1. Open DevTools Memory tab
2. Take heap snapshot **before** opening the interaction
3. Play 1 full question (correct answer)
4. Close the interaction (unmount component)
5. Trigger GC (trash can icon in DevTools)
6. Take heap snapshot **after**
7. Compare: delta should be < 5 MB (most memory recovered)

---

### Appendix D: Lazy-Loading Renderer Strategy

**Why lazy-load?** 11 renderers × ~25 KB = 275 KB. With lazy-load, only the current archetype loads.

**Implementation (Phase B onwards):**

**1. Index file exports lazy-loaded map:**
```typescript
// src/interactions/pixi/renderers/index.ts
import { lazy, Suspense } from 'react';

const RendererMap = {
  equal_or_not: lazy(() => 
    import('./EqualOrNotRenderer').then(m => ({ default: m.EqualOrNotRenderer }))
  ),
  identify: lazy(() => 
    import('./IdentifyRenderer').then(m => ({ default: m.IdentifyRenderer }))
  ),
  // ... etc for all 11
};

export { RendererMap };
```

**2. LevelScreen uses map with Suspense boundary:**
```typescript
// src/app/screens/LevelScreen.tsx
const Renderer = RendererMap[archetype];

<Suspense fallback={<LoadingSpinner />}>
  <Renderer state={modelState} onAnswer={handleAnswer} />
</Suspense>
```

**3. Bundle measurement (verify split works):**
```bash
VITE_SPIKE=1 npm run measure-bundle
# Should show:
# - main chunk: ~80 KB (React + Pixi base + app logic)
# - equal-or-not chunk: ~25 KB (downloaded on demand)
# - identify chunk: ~25 KB (downloaded on demand)
# ... etc
```

**Per the 2026-05-05 learning:** Rolldown inlines sync `import()` back to parent. **Must use `React.lazy` + `Suspense` to create async boundary.** Bare `import()` in renderer code will NOT split.

---

### Appendix E: Curriculum Completeness Audit

**Task:** Verify every (level, archetype) cell has at least one question.

**Script** (`verify-curriculum.ts`):
```typescript
import curriculum from '../../src/curriculum/bundle.json';

const levelIds = Object.keys(curriculum).sort();
const archetypeIds = [
  'equal_or_not', 'identify', 'label', 'snap_match', 'compare',
  'benchmark', 'placement', 'partition', 'make', 'order', 'explain_your_order'
];

let missingCells = [];

for (const levelId of levelIds) {
  const level = curriculum[levelId];
  for (const archetype of archetypeIds) {
    const questions = level[archetype];
    if (!questions || questions.length === 0) {
      missingCells.push(`Level ${levelId}, ${archetype}: NO QUESTIONS`);
    }
  }
}

if (missingCells.length > 0) {
  console.error('Curriculum gaps found:');
  missingCells.forEach(cell => console.error(`  ${cell}`));
  process.exit(1);
} else {
  console.log('✓ Curriculum complete: all (level, archetype) cells have questions');
  process.exit(0);
}
```

**Add to CI:**
```bash
npm run test:unit -- curriculum-completeness.test.ts
```

---

### Appendix F: Final Acceptance Criteria

**Checklist before "complete":**

- [ ] **C1:** No backend, no external data egress, no accounts. ✓
- [ ] **C2:** No teacher/parent/admin UI. ✓
- [ ] **C3:** Levels 1–9 only. ✓
- [ ] **C4 (revised):** React + TypeScript + Vite + PixiJS + Dexie; no Redux, no Zustand. ✓
- [ ] **C5:** localStorage: `lastUsedStudentId` only. ✓
- [ ] **C6:** Flat + bright visuals. ✓
- [ ] **C7 (interim):** 360–480 px Android Chrome PWA only. ✓
- [ ] **C8:** Linear denominator progression. ✓
- [ ] **C9:** Sessions ≤ 15 min per level. ✓
- [ ] **C10:** Every change serves validation. ✓

**Feature completeness:**

- [ ] All 11 archetypes implemented + tested
- [ ] Curriculum loaded from bundle (no hardcoding)
- [ ] Validators unchanged (same payload contracts)
- [ ] Engine (BKT, router, selection) unchanged
- [ ] Dexie persistence: all tables, backup/restore working
- [ ] Preferences: audio, reduced-motion, high-contrast, text size
- [ ] Menu, LevelMap, Settings, LevelScreen, Recovery all routable
- [ ] Hint ladder (3-tier) working
- [ ] Feedback overlays (correct/incorrect/partial) working
- [ ] Mascot lifecycle tied to feedback
- [ ] Progress bar showing Q N of M
- [ ] Level complete celebration
- [ ] Mastery milestone announcements
- [ ] Streak tracker
- [ ] PWA install prompt, manifest, offline support
- [ ] Audio: TTS pipeline integrated, mascot voice + hints + feedback playing
- [ ] Accessibility: WCAG AA on all surfaces, keyboard parity, reduced-motion gated
- [ ] Mobile validated on Android (2 real devices + Playwright)
- [ ] Lighthouse thresholds met (Performance ≥ 90, A11y ≥ 95)
- [ ] Bundle ≤ 1.0 MB gz
- [ ] All suites green: typecheck, lint, unit, integration, e2e, a11y
- [ ] Agents all clean: a11y-auditor, bundle-watcher, c1-c10-auditor, engine-determinism, validator-parity, curriculum-byte-parity, level-spec-parity
- [ ] Phaser decommissioned (or quarantined in _phaser-legacy/ during regrettability window)
- [ ] Docs updated: stack, runtime, performance, test-strategy, constraints, decision-log
- [ ] Pilot deployment working: app accessible via URL/PWA, tester onboarding doc complete
- [ ] Pilot protocol executed: 3–5 K-2 testers, 4 weeks, data extracted and analyzed
- [ ] Findings report written with learning curves + misconceptions

**If all above ✓:** **v1.0 Complete. Ship for beta or next cohort.**

---

## Timeline Summary

| Phase | Effort (hours) | Wall time | Start | End |
|---|---|---|---|---|
| A | 8–12 | 2–4 ev | Week 1 | Week 1 |
| B | 90–100 | 4 weeks | Week 1 | Week 5 |
| C | 30–35 | 1 week | Week 5 | Week 6 |
| D | 50–60 | 2–3 weeks | Week 6 | Week 9 |
| E | 35–40 | 1 week | Week 9 | Week 10 |
| F | 20–25 | 3–5 ev | Week 10 | Week 10 |
| G | 5–10 | 2 weeks | Week 10 | Week 12 |
| H | 8–10 | 2–3 ev | Week 12 | Week 12 |
| I | 30–40 | 4 weeks | Week 12 | Week 16 |
| **Total** | **276–332** | **~16 weeks** | | |

**Solo, 3 hrs/day (5 days/week):** 276 hrs ÷ 15 hrs/week = ~18 weeks (weeks 1–18, with G + I overlapping as elapsed time)

**Realistic estimate: 9–11 weeks of calendar time for phases A–F (execution), then 2 weeks G (passive), then 4 weeks I (pilot).**

---

## Exit Criteria (Final Gate)

✓ **Phase A:** Bundle < 240 KB, Pixi API fixed, manual smoke test on 1 real device  
✓ **Phase B:** All 11 archetypes pass per-archetype DoD, bundle < 600 KB  
✓ **Phase C:** Full Level 1 end-to-end works, Dexie clean, BKT updates  
✓ **Phase D:** UI polished, audio producing + playing, bundle < 600 KB, Lighthouse ≥ 90  
✓ **Phase E:** Playwright Chrome projects green, manual device matrix clean, real device smoke test passed  
✓ **Phase F:** Production build ≤ 1.0 MB, all suites green, agents clean, revert tested  
✓ **Phase G:** 2 weeks elapsed, no regressions, main is stable  
✓ **Phase H:** Phaser removed, docs finalized, all suites green  
✓ **Phase I:** Pilot complete, data extracted, findings report written, v1.0 ready

**When all gates pass:** **The app is validation-ready, feature-complete, and production-deployable.**

---

## Summary

This plan details every task from fixing Pixi v8 API breaks (Phase A) through pilot validation with real K-2 students (Phase I). Each phase has explicit gates and rollback criteria; proceeding to the next phase requires all checkboxes in the current phase to pass. Audio production is integrated into Phase D. Mobile Chrome-only testing is Phase E. Error boundaries, TestHooks, memory cleanup, and lazy-loading are woven through the phases as cross-cutting concerns.

Total effort: ~276–332 hours solo / ~9–16 weeks wall time depending on daily availability.

**Ready to execute. Approve to begin Phase A.**
