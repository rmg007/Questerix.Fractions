# React + PixiJS Migration Decision Plan

**Created:** 2026-05-10
**Status:** Decision required - blocked by current C4
**Primary branch:** `plans/2026-05-10-react-pixijs-migration`
**Implementation branch pattern, if approved:** `refactor/YYYY-MM-DD-react-pixijs-phase-N`

This plan evaluates and, if explicitly approved, executes a migration from the current
Phaser 4 runtime to a React + PixiJS runtime.

It is deliberately written as a **decision plan**, not just an implementation checklist.
The migration directly conflicts with the current locked constraint **C4 - Phaser 4 +
TypeScript + Vite + Dexie.js; no React/Redux/new frameworks**. No durable implementation
work may begin until the decision gate in Phase 0 is completed.

The goal is not "use React because React." The goal is to make Questerix Fractions more
inspectable, more testable, easier for agents to modify safely, and less dependent on
canvas-only UI state while preserving the validated curriculum, validators, progression
engine, persistence model, and K-2 interaction design.

---

## Executive Summary

### Recommendation

Do **not** start a full migration immediately. First run a constrained **feasibility
spike** with concrete library choices that answers the two questions that determine
whether the migration is justified:

1. Can the React + PixiJS production bundle (with Phaser tree-shaken out) stay
   <= 1.0 MB gzipped on initial transfer?
2. Can `equal_or_not` — the simplest binary archetype — be ported without losing touch
   responsiveness, accessibility parity with `A11yLayer`, validator-payload compatibility,
   or curriculum compatibility?

**Spike library defaults** (overridable only with measured reason):

| Concern | Default | Rationale |
|---|---|---|
| React renderer | `react@^19` + `react-dom@^19` | Latest stable; concurrent features irrelevant but cheap. |
| Canvas runtime | `pixi.js@^8` | v8 is ~30% smaller gzipped than v7 and has WebGPU path. |
| React/Pixi bridge | `@pixi/react@^8` for archetype renderers; fall back to naked `useRef` + manual Pixi lifecycle if `@pixi/react` adds > 20 KB gzipped or proves flaky. | Bridge is convenient but optional. |
| Tweens | None on the spike — use `requestAnimationFrame` + token-based easings already in `src/scenes/utils/easings.ts`. Re-evaluate at Phase 5. | Phaser's tween manager goes away with Phaser; do not import GSAP/popmotion until measured. |
| Router | `wouter` (~2 KB gz) — not React Router. | App has ~5 routes; React Router DOM ships ~10-15 KB for no measurable gain. |
| Store | No store. Service singletons + `useSyncExternalStore` where reactivity is needed. | Zustand/Redux explicitly excluded by C4 spirit even after revision. |

If either spike question answers "no", keep Phaser and execute the C4-compliant fallback
plan in Appendix A.

If both answer "yes", revise C4 explicitly and proceed phase by phase. No dual-engine
production runtime is allowed.

### Why this plan is stricter than the draft

The first draft assumed the migration was purely mechanical. It was not. The real risk is
not "can we render with Pixi"; it is whether a stack rewrite helps the validation MVP
enough to justify touching the runtime surface that already works.

This plan adds:

- a formal constraint decision gate
- a current-code inventory
- a feasibility spike before commitment
- a no-dual-runtime rule to protect bundle size
- phase gates with rollback criteria
- a testing and parity matrix
- a per-archetype migration strategy
- explicit preservation of engine, validators, curriculum, Dexie, preferences, audio,
  accessibility, and pilot-validation behavior

### Sequential decision gates

These are evaluated in order. A "no" at any gate halts forward motion and routes to
Appendix A (or stops entirely at gate 4).

| Order | Gate | If yes | If no |
|---:|---|---|---|
| 1 | Should C4 be revised at all? Is the agent-friendliness gain worth the rewrite cost on a solo validation project? | Continue to gate 2. | Use Appendix A. Do not spike. |
| 2 | Does the bundle math (next section) make the spike worth funding? | Open spike branch. | Use Appendix A. |
| 3 | Does the spike preserve touch, a11y, validator payloads, and Dexie behavior at production-bundle size? | Approve migration; revise C4 in docs. | Use Appendix A or restart with a different target architecture. |
| 4 | Can the cutover ship without Phaser + React + Pixi in the same production build? | Continue to Phase 7+. | Stop; budget and complexity risk are too high. |

---

## Bundle Math (Decision-Critical)

The 1.0 MB gzipped initial-transfer budget is the single hard constraint that decides
this. Forecast before spending. Run `npm run measure-bundle` on `main` before Phase 0 and
record the result here:

```text
Current main (Phaser 4 stack):
  initial transfer (gzipped, JS only): __________ KB
  Phaser slice estimate:               __________ KB
  app + engine + curriculum slice:     __________ KB
  remaining headroom under budget:     __________ KB
```

Reference ranges from public package data (verify in the spike, do not trust these):

| Package (gzipped) | Approx size | Notes |
|---|---:|---|
| `phaser@^4` | 250-350 KB | Today's largest single cost. |
| `react@^19` + `react-dom@^19` | ~45 KB | Stable across recent majors. |
| `pixi.js@^8` core | 80-120 KB | v8 dropped ~30% vs v7. Tree-shakes well if Filters/Particles unused. |
| `@pixi/react@^8` | 10-15 KB | Optional bridge. |
| `wouter` | ~2 KB | Recommended router. |
| `react-router-dom@^7` | 10-15 KB | Not recommended for this app size. |
| Phaser-style tween manager replacement (if needed) | 15-30 KB | Avoid by using token easings + rAF on the spike. |

**Plausibility check.** If Phaser is ~300 KB and React + Pixi + bridge + wouter is
~140 KB, replacing the runtime *frees* roughly 150 KB. That is the optimistic case. The
pessimistic case is that Pixi visual primitives and a tween shim recapture most of that
delta. The spike must produce real numbers, not estimates.

**Critical rolldown caveat.** Per the 2026-05-05 learning in `.claude/learnings.md`,
rolldown inlines synchronous `import()` calls back into the parent chunk. Lazy-loading
interaction renderers as a budget escape valve **requires async boundaries** — for
example, `React.lazy(() => import('./PartitionRenderer'))` with a `Suspense` boundary
above it. A bare dynamic `import()` inside a synchronously called function will not
split the chunk. Plan budget around this from the start.

---

## What This Migration Buys, and What It Costs

A decision plan should be honest about both sides.

### Buys (the case for spending the budget)

- **Inspectable trees.** `LevelScreen.tsx` reads top-down as JSX; current `LevelScene.ts`
  reads as a graph of `add.existing` calls and event listeners that requires execution
  to understand.
- **Cheaper agent edits.** Specialist subagents (and Claude itself) can reason about
  props/state diffs without simulating a Phaser scene graph.
- **Real DOM for non-canvas UI.** Menus, settings, hints, dialogs, and overlays become
  native browser controls — automatic focus rings, scroll, IME, screen-reader behavior.
- **Smaller interaction surface to test.** Pure model + Pixi renderer + DOM action layer
  lets unit tests cover all logic without booting a canvas.
- **Removes the largest single dependency.** Phaser is the heaviest single cost in the
  current bundle.

### Costs (paid in full, not amortized away)

- **Tween manager loss.** Phaser's tween system disappears. The plan defaults to rAF +
  token easings on the spike, but every animated feedback overlay, mascot reaction,
  and partition snap currently uses Phaser tweens — replacement is non-trivial.
- **Pointer/touch reimplementation.** Phaser's input system handles multi-touch,
  drag thresholds, cancel-on-leave, and pointer capture. Pixi's pointer events are
  closer to raw DOM and the gap must be bridged in `interactions/pixi/pointer.ts`.
- **Accessibility surface re-derivation.** `A11yLayer` currently mirrors the canvas
  state through a DOM tree. A React/Pixi world needs the equivalent — possibly cleaner,
  but it must be re-proven feature by feature.
- **Audio integration rewrite.** The pre-rendered TTS pipeline in `src/audio/` stays,
  but its consumers (mascot voice cues, level intro audio) currently call from Phaser
  scene lifecycle hooks. React-side equivalents need a small adapter layer.
- **Test stack double-cost during migration.** Until Phase 9, two interaction stacks
  coexist on disk. CI runs both test layers or risks losing coverage on the surface
  that still ships.
- **Effort on a solo validation project.** Realistic phase estimates for a single-dev
  evening cadence: Phase 1 spike ~3-5 days, Phase 2 ~2 weeks, Phases 3-6 ~3-5 weeks,
  Phase 7 (11 archetypes) ~6-10 weeks, Phase 8 cutover ~1 week. **Aggregate: 3-5
  months of evenings.** If the goal is a pilot in less time, the math points to
  Appendix A.

### Explicit non-goals of this migration

- Not a redesign. Visual tokens, copy, and curriculum are frozen.
- Not a state library introduction. Service singletons + `useSyncExternalStore` only.
- Not an SSR project. No Next.js, no React Server Components, no hydration concerns.
- Not a Storybook adoption. Use Playwright fixture routes for component isolation.
- Not a backend introduction. C1 still binds after C4 revision.

---



## Non-Negotiables

These apply whether the migration proceeds or is rejected.

| Area | Rule |
|---|---|
| Constraints | C1-C10 remain binding until explicitly revised in docs. |
| Data | No backend, no accounts, no remote telemetry, no external data egress. |
| Persistence | IndexedDB via Dexie remains the source of truth; `localStorage` remains limited to `lastUsedStudentId`. |
| Curriculum | `public/curriculum/v1.json` and `src/curriculum/bundle.json` stay pipeline-generated and byte-equivalent. |
| Validators | `src/validators/` remain pure and continue to define answer semantics. |
| Engine | BKT, routing, misconception logic, review scheduling, and selection logic remain framework-agnostic. |
| Target devices | 360-1024 px, iOS Safari, Android Chrome, desktop browsers. |
| Performance | Initial transfer must stay <= 1.0 MB gzipped; runtime target remains 60 fps on baseline mobile. |
| Scope | Levels 1-9 only; no teacher, parent, admin, account, or Grade 3+ surface. |
| Validation | Every change must improve validation reliability or reduce implementation risk. |

---

## Phase 0 - Decision Gate and Paperwork

**Goal:** Decide whether the project is allowed to pursue React + PixiJS at all.

**Gate:** One of the two paths below is completed and recorded.

### Path A - Reject the stack migration

Choose this path if the goal is agent-friendliness but C4 should remain locked.

Required actions:

- Mark this plan as `Rejected - C4 remains locked`.
- Execute Appendix A instead: Phaser-first agent-friendliness.
- Add a decision-log entry only if the rejection establishes new durable reasoning.

### Path B - Approve a feasibility spike only

Choose this path if the migration is worth evaluating but not yet approved.

Required actions:

- Mark this plan as `Spike approved - implementation not approved`.
- Create a short decision-log entry authorizing a spike despite current C4.
- Keep spike code isolated from `main` runtime entrypoints.
- Keep React/Pixi dependencies branch-local to the spike; do not merge them into the production app.
- Do not remove Phaser, change app routing, or touch persistence schema during the spike.

### Path C - Approve full migration

Choose this path only after the spike passes.

Required actions:

- Add a new decision-log entry superseding C4 for the runtime stack (template below).
- Update `docs/00-foundation/constraints.md` C4.
- Update `docs/30-architecture/stack.md`.
- Update `docs/30-architecture/runtime-architecture.md`.
- Update `docs/30-architecture/performance-budget.md`.
- Open implementation work as phase branches, not one giant branch.

#### Decision-log entry template (paste into `docs/00-foundation/decision-log.md`)

```markdown
## YYYY-MM-DD — Runtime stack: Phaser 4 -> React + PixiJS

**Status:** Accepted, supersedes C4 for runtime layer only.

**Context:**
- MVP is functionally complete (persistence, resumption, backup gates passed 65333ef).
- Validation phase requires fast, low-risk iteration on UI + interactions.
- Spike measured: <bundle delta KB>, <touch parity result>, <a11y parity result>.

**Decision:**
- Adopt `react@^19`, `pixi.js@^8`, `@pixi/react@^8` (or naked Pixi if bridge cost > 20 KB),
  `wouter` for routing. No state library.
- Phaser is removed from production dependencies at Phase 9.
- C1-C3, C5-C10 remain unchanged. C4 is revised to: "React + TypeScript + Vite + PixiJS +
  Dexie; no Redux, no Zustand, no Next.js, no backend framework."

**Consequences:**
- Bundle budget reset to <projected KB gzipped> initial transfer.
- New surface: `src/app/`, `src/interactions/`. Old `src/scenes/` decommissioned at Phase 9.
- `A11yLayer.ts` replaced by DOM-first shell + per-archetype action layer.
- Tween animation strategy: rAF + token easings; revisit only if measured insufficient.

**Rollback:**
- If post-cutover regressions exceed thresholds in the Regrettability Window (Phase 8.5),
  revert to the pre-cutover commit and reopen Appendix A.
```

**Exit criteria:**

- The chosen path is documented.
- Branch naming follows repo policy.
- If React/Pixi dependencies are merged into the production app, C4 has already been revised.

---

## Current State Inventory

This plan should not pretend the repo is a blank Phaser prototype. The current code already
has several migration-friendly boundaries.

| Surface | Current location | Migration implication |
|---|---|---|
| App entry | `src/main.ts` | Replace only at cutover; keep stable until final phase. |
| Scenes | `src/scenes/` | Menus/settings/level flow are Phaser scenes today. |
| Interaction modules | `src/scenes/interactions/` | Already split by archetype; use as migration source units. |
| Interaction registry | `src/scenes/utils/levelRouter.ts` | Already maps archetype/validator to interaction factory. |
| Test hooks | `src/scenes/utils/TestHooks.ts` | Existing DOM sentinel strategy; do not reinvent blindly. |
| Accessibility layer | `src/components/A11yLayer.ts` | Existing DOM-parallel accessibility surface; React path must replace or absorb it deliberately. |
| Engine | `src/engine/` | Preserve unchanged except adapters around time/random ports if needed. |
| Engine ports | `src/engine/ports.ts` | Only approved host-global boundary (random, time). React app must continue to inject through it — no `Math.random()`/`Date.now()` in renderers. |
| Validators | `src/validators/` | Preserve unchanged; payload shapes are the migration contract. The Python clone in `pipeline/validators_py.py` must also stay in lockstep. |
| Persistence | `src/persistence/` | Preserve unchanged; Dexie schema changes are out of scope. |
| Curriculum | `src/curriculum/`, `public/curriculum/` | Preserve pipeline; no hand edits to bundles. |
| Components (TS helpers) | `src/components/*.ts` (non-Phaser parts) | Many are already DOM/TS helpers; classify before rewriting. |
| Components (Phaser GameObjects) | `src/components/HintLadder.ts`, `ProgressBar.ts`, `FractionDisplay.ts`, `Mascot.ts`, `FeedbackOverlay.ts` | Each currently extends a Phaser GameObject. New homes: HintLadder/ProgressBar/FeedbackOverlay → DOM React components; FractionDisplay/Mascot → Pixi or DOM depending on animation needs. |
| Tween manager | `Phaser.Tweens` via scene.tweens | Disappears with Phaser. Default replacement: rAF + tokens in `src/scenes/utils/easings.ts`. Re-evaluate at Phase 5 — do not import a tween library before measuring. |
| Audio (TTS) | `src/audio/` + pre-rendered build-time pipeline (`PLANS/audio.md`) | Pipeline stays — runtime never calls a TTS API. Migration only adds a React adapter (e.g. `useAudio()` hook) over the existing service. |
| Styles | `src/styles/` | Preserve tokens and fonts; no visual redesign. |
| Reduced-motion + theme | `src/scenes/utils/levelTheme.ts`, prefers-reduced-motion checks in scenes | Move detection into a single `usePreferences()`/`useReducedMotion()` hook. Renderers consume the value, do not call `matchMedia` directly. |

### Inventory work before implementation

- [ ] Produce a file-level classification table:
  - keep unchanged
  - wrap/adapt
  - port
  - delete after cutover
- [ ] Confirm all 11 archetypes have a source interaction file and validator coverage.
- [ ] Identify scene-only logic that should move into framework-neutral services before any React work.
- [ ] Identify Phaser-only rendering code that should stay behind interaction renderer boundaries.
- [ ] Record current bundle slices using `npm run measure-bundle`.

---

## Target Architecture, If Approved

The approved target is **React for DOM application structure** and **PixiJS for canvas
interaction rendering**. It is not React as a new state container for the whole app.

### Runtime boundaries

| Layer | Owner | Notes |
|---|---|---|
| App shell | React | Boot, routes, layout, menu, level map, settings, overlays. |
| Interaction canvas | PixiJS via a thin React adapter | One renderer per archetype; props in, typed answer payload out. |
| Learning state | Existing engine/services | No React-global learning state; React observes service state. |
| Persistence | Existing Dexie repos | Same DB, same schema, same backup/restore behavior. |
| Curriculum | Existing loader/pipeline | Same JSON contracts and validation. |
| Validators | Existing registry | Same payload and outcome semantics. |
| Accessibility | DOM-first for shell; DOM overlays/controls for canvas where needed | Must preserve keyboard and screen-reader parity. |

### Proposed folder layout

Use a transitional folder only while both runtimes exist on the branch.

```text
src/
  app/
    main.tsx
    routes.tsx
    App.tsx
    screens/
      MenuScreen.tsx
      LevelMapScreen.tsx
      LevelScreen.tsx
      SettingsScreen.tsx
    hooks/
      useAudio.ts
      useCurriculum.ts
      usePreferences.ts
      useSession.ts
      useLevelRouter.ts
  interactions/
    model/
      types.ts
      testHarness.ts
    pixi/
      PixiStage.tsx
      renderTokens.ts
      pointer.ts
    archetypes/
      identify/
      equal-or-not/
      label/
      snap-match/
      partition/
      make/
      compare/
      benchmark/
      placement/
      order/
      explain-your-order/
```

Keep the existing service directories in place:

```text
src/engine/
src/validators/
src/persistence/
src/curriculum/
src/audio/
src/types/
src/lib/
```

Do not copy these directories into a parallel `src-react/`. Copying creates two sources of
truth and makes later merges painful. If a transitional entrypoint is needed, use
`src/app/` inside the same `src/` tree and protect the production entrypoint until cutover.

---

## Migration Principles

1. **Prove before replacing.** No whole-app rewrite until one archetype and one route pass
   real tests.
2. **One source of truth.** Engine, validators, persistence, curriculum, and types are not
   duplicated.
3. **No dual-engine shipping.** Phaser and Pixi may coexist in a spike branch, but production
   build must not ship both.
4. **Typed payloads are the contract.** Interaction renderers may change; validator input
   shapes must not drift.
5. **DOM where it helps; canvas where it teaches.** Menus, settings, overlays, and controls
   should be DOM. Fraction manipulation can remain canvas.
6. **Accessibility is not postponed.** Each migrated interaction must have keyboard and
   screen-reader behavior before the next interaction starts.
7. **Bundle budget is a phase gate.** Dependency additions must be measured early, not after
   the rewrite is complete.
8. **Rollback is a first-class path.** Each phase ends with a shippable app or a clean reason
   to abandon the migration.

---

## Phase 1 - Feasibility Spike

**Goal:** Determine whether React + PixiJS is viable before approving the migration.

**Scope:** One route, one specific archetype, no persistence schema changes, no
old-code deletion.

**Spike archetype: `equal_or_not`.** It has the simplest UI (two buttons, one prompt),
the smallest answer payload (boolean-equivalent), exists in Level 1, and exercises every
required boundary — pointer input, validator call, attempt persistence, hint ladder,
feedback overlay, mascot reaction, a11y action layer — without the geometric complexity
of partition/make/order. If `equal_or_not` cannot be ported cleanly, none of the others
can.

**Tasks:**

- [ ] Run `npm run measure-bundle` on `main` and record numbers in the Bundle Math
      section above before opening the spike branch.
- [ ] Create spike branch: `refactor/YYYY-MM-DD-react-pixijs-spike`.
- [ ] Install only: `react@^19`, `react-dom@^19`, `pixi.js@^8`, `@pixi/react@^8`,
      `wouter`. No tween library, no state library, no router DOM, no Storybook.
- [ ] Add a non-shipping React entrypoint (e.g. `src/app/main.tsx`) wired only when a
      `VITE_SPIKE=1` flag is set. The default `npm run dev`/`build` must still produce
      the Phaser app.
- [ ] Build a minimal React route that loads one curriculum question from the existing
      loader (no hardcoded content).
- [ ] Port `equal_or_not` to a Pixi renderer + pure model + DOM action layer.
- [ ] Reuse the existing validator registry for answer checking — no copies.
- [ ] Reuse theme tokens, fonts, and copy conventions from `src/styles/` and i18n catalog.
- [ ] Write the attempt through the existing Dexie repository.
- [ ] Add Vitest model tests (correct, incorrect, hint-assisted) with no Phaser/Pixi imports.
- [ ] Add one Playwright smoke test for the spike route at 360 px and at 1024 px.
- [ ] Run `npm run build`. Confirm Phaser-only chunks tree-shake out of the spike entry.
- [ ] Run `npm run measure-bundle` and record exact gzipped chunk deltas.

**Gate (numeric pass/fail — qualitative judgments do not count):**

- `npm run typecheck` green.
- `npm run test:unit` green (existing tests not regressed + new spike model tests pass).
- Spike Playwright smoke test green at both viewport widths.
- **Bundle projection: spike build with `VITE_SPIKE=1` excluding Phaser is <= 850 KB gzipped
  initial JS transfer.** (Leaves 150 KB headroom for archetypes the spike does not cover.)
- Interaction works on a real mid-tier Android device + iOS Safari. (Manual check; record
  device names in the spike report.)
- Tap latency on the spike interaction is <= 100 ms measured via Playwright trace, matching
  current Phaser baseline.
- No `Math.random()`, `Date.now()`, `crypto.randomUUID()` in the spike renderer — all
  routed through `src/engine/ports.ts`.
- No C1/C2/C3/C5/C7/C8/C9/C10 drift.

**Rollback criteria (stop the migration, not just the phase):**

- Spike bundle exceeds 850 KB gzipped with Phaser tree-shaken out.
- Pointer/touch behavior is observably worse than Phaser on a real device.
- Accessibility requires more custom machinery than the current `A11yLayer` provides.
- The port requires duplicating validator, engine, or persistence logic.
- `@pixi/react` bridge adds > 20 KB gzipped and naked Pixi proves substantially harder to
  test through DOM.

**Deliverable:** A short spike report appended to this plan with measured numbers
(bundle KB, tap latency ms, device tested) and a go/no-go recommendation. If go, also
record the resolution of every sub-decision in the recommendation table at the top.

---

## Phase 2 - Service Boundary Extraction

**Goal:** Move reusable orchestration out of Phaser scenes before building the new shell.

This phase is valuable even if the migration stops here.

**Tasks:**

- [ ] Extract route-independent level/session orchestration from `LevelScene` into plain
      TypeScript services where missing.
- [ ] Audit `src/lib/levelScene*` helpers and classify which are framework-neutral already.
- [ ] Keep `src/engine/ports.ts` as the only approved host-global boundary for randomness/time
      used by learning logic.
- [ ] Create a `LevelRuntime` or equivalent service interface that owns:
  - current student
  - current level
  - current question
  - hint state
  - attempt submission
  - persistence writes
  - progression updates
- [ ] Add unit tests around the extracted service behavior.
- [ ] Keep Phaser scene behavior unchanged by adapting it to the extracted service.

**Gate:**

- Existing app behavior unchanged.
- `npm run typecheck` green.
- `npm run test:unit` green.
- Existing E2E smoke suite green.
- No net-new dependency.

**Rollback criteria:**

- Extraction increases coupling or makes the Phaser runtime less stable.
- Tests need large mocks of Phaser to cover service logic.

---

## Phase 3 - React App Shell Behind a Non-Shipping Entry

**Goal:** Build the DOM shell without replacing the production Phaser app.

**Tasks:**

- [ ] Add a non-production React entrypoint for migration work.
- [ ] Build `App`, `routes`, and route-level screens:
  - menu
  - level map
  - level play
  - settings
  - recovery/error surface
- [ ] Preserve current URL semantics or document any intentional route changes.
- [ ] Reuse existing persistence boot flow and `lastUsedStudentId` behavior.
- [ ] Reuse preferences from `src/lib/preferences.ts`.
- [ ] Reuse audio services from `src/audio/`.
- [ ] Reuse existing styles and tokens; no visual redesign.
- [ ] Add Playwright smoke tests for shell navigation.

**Gate:**

- Shell can boot, navigate, and display loaded student/level state.
- No gameplay route is marked complete yet.
- `npm run typecheck`, `npm run test:unit`, and shell smoke tests green.
- Bundle measurement shows the shell work is still compatible with final cutover budget.

**Rollback criteria:**

- React shell needs a second learning-state model.
- Boot behavior diverges from the existing persistence contract.

---

## Phase 4 - Interaction Model Contract

**Goal:** Define the shared contract every migrated interaction follows.

**Target pattern:**

```ts
interface InteractionModel<TQuestion, TState, TEvent, TAnswer> {
  readonly archetype: ArchetypeId;
  initialize(question: TQuestion): TState;
  reduce(state: TState, event: TEvent): TState;
  toAnswer(state: TState): TAnswer | null;
  getA11y(state: TState): A11yAction[];
  getTestState(state: TState): Record<string, string | number | boolean>;
}
```

The exact API can differ, but it must preserve these properties:

- no React import
- no Pixi import
- no Phaser import
- deterministic reducer behavior
- typed answer payload matching validators
- test-state output for Playwright
- accessibility action output for keyboard/screen-reader parity

**Tasks:**

- [ ] Create `src/interactions/model/types.ts`.
- [ ] Create `src/interactions/model/testHarness.ts`.
- [ ] Define a per-archetype answer payload map aligned with `src/validators/`.
- [ ] Build model tests for the spike archetype.
- [ ] Add test fixtures for correct, incorrect, edge, and assisted states.
- [ ] Document how model events map to pointer/keyboard input.

**Gate:**

- Model tests run in Vitest without browser APIs.
- The existing validator registry accepts the model's answer payload.
- The model emits enough test state for E2E assertions.

---

## Phase 5 - Pixi Renderer Foundation

**Goal:** Build a small, shared Pixi rendering layer for interactions.

**Tasks:**

- [ ] Add a `PixiStage` wrapper with explicit resize handling for 360-1024 px devices.
- [ ] Add renderer tokens for colors, typography, spacing, stroke width, and motion timing.
- [ ] Add pointer utilities for tap, drag, drop, snap, and cancel.
- [ ] Add reduced-motion handling.
- [ ] Add keyboard input plumbing for interactions that need non-pointer alternatives.
- [ ] Add visual primitives used across archetypes:
  - bar model
  - number line
  - fraction card
  - drop zone
  - partition divider
  - feedback marker
- [ ] Build one renderer for the chosen spike archetype.
- [ ] Verify canvas is nonblank and correctly framed at mobile and desktop viewports.

**Gate:**

- Renderer works through props/state only.
- Renderer does not call validators directly.
- Renderer does not write persistence directly.
- Playwright can assert state via DOM/test output rather than pixel guessing.
- Touch targets meet 44x44 px minimum where applicable.

---

## Phase 6 - Level Loop Integration

**Goal:** Make one migrated level flow work end to end.

**Tasks:**

- [ ] Build `LevelScreen` around the extracted level/session runtime.
- [ ] Load curriculum through the existing loader.
- [ ] Select interaction by archetype + validator id.
- [ ] Submit answers through existing validators.
- [ ] Write attempts through existing Dexie repositories.
- [ ] Update BKT/progression through existing engine code.
- [ ] Render hint ladder and feedback overlay in DOM.
- [ ] Preserve session completion and level-complete behavior.
- [ ] Preserve recovery behavior when Dexie fails.

**Gate:**

- Complete a representative Level 1 question start-to-finish.
- Attempt is persisted.
- Progression state updates.
- Hint events persist when used.
- E2E verifies the flow through visible DOM/test state.
- Existing Phaser app remains the production path until cutover.

---

## Phase 7 - Migrate Archetypes in Risk Order

**Goal:** Port all archetypes with their model, renderer, accessibility, tests, and validator
contracts intact.

The original draft listed all archetypes but did not define what "done" means. This table
does.

If the spike covered `equal_or_not`, reuse that work as #1 instead of re-porting.

| Order | Archetype | Reason for position | Specific risk | Required tests |
|---:|---|---|---|---|
| 1 | `equal_or_not` | binary answer, completed by spike | none if spike passed | model unit, a11y buttons, E2E tap |
| 2 | `identify` | simplest tap/select after binary | hit-target sizing on small viewport | model unit, validator payload, E2E tap |
| 3 | `label` | introduces text labels and mapping | label-to-slot mapping ambiguity; IME on mobile | model unit, keyboard mapping, E2E place |
| 4 | `snap_match` | drag-to-snap with pairs | first drag archetype — pointer capture and cancel-on-leave parity with Phaser | model unit, pointer drag, keyboard fallback |
| 5 | `compare` | relation buttons and visuals | misconception detector wiring (MC-MAG-*) — payload must still trigger same flags | model unit, misconception flag path, E2E |
| 6 | `benchmark` | multi-card zones | multi-target drag; layout reflow at 360 px when zones stack | model unit, partial errors, responsive layout |
| 7 | `placement` | free number-line placement | tolerance math + pointer precision; subpixel rounding differs between Phaser and Pixi | tolerance tests, drag precision, mobile viewport |
| 8 | `partition` | geometry-heavy | divider geometry, snap thresholds, reduced-motion path for partition animation | region/line tests, reduced-motion feedback |
| 9 | `make` | partition plus shade | composes partition risks with shade-state model; two-stage answer payload | composed model tests, E2E multi-step |
| 10 | `order` | sequence drag/reorder | drag-reorder needs keyboard analogue (up/down stepper) and Kendall tolerance | model unit, Kendall/tolerance edge cases, E2E |
| 11 | `explain_your_order` | capstone with explanation | text/choice composite; the only archetype that may need a real form control | model unit, text/choice flow, full E2E |

**Per-archetype definition of done:**

- [ ] Pure model exists with no renderer imports.
- [ ] Pixi renderer exists and consumes model state.
- [ ] Answer payload matches an existing validator contract.
- [ ] Accessibility actions exist for all required controls.
- [ ] Reduced-motion behavior exists for feedback.
- [ ] Unit tests cover correct, incorrect, edge, and assisted/hint cases where relevant.
- [ ] Playwright smoke test covers the primary interaction.
- [ ] Mobile viewport check passes at 360 px width.
- [ ] No new localStorage usage.

**Gate:**

- Do not start the next high-risk interaction until the previous one passes its local gate.
- After every three archetypes, run the broader suite and bundle measurement.

---

## Phase 8 - Full Parity and Cutover

**Goal:** Replace Phaser as the production runtime only after behavior parity is demonstrated.

**Tasks:**

- [ ] Migrate Playwright selectors to the DOM-first shell.
- [ ] Add parity coverage for:
  - boot
  - first-run student creation
  - returning student resume
  - level map unlock state
  - one successful attempt
  - one incorrect attempt
  - hint request
  - session complete
  - backup/restore
  - settings changes
  - reduced-motion mode
- [ ] Run `npm run test:a11y` and fix all violations.
- [ ] Run `npm run test:integration` if persistence surfaces changed.
- [ ] Run `npm run test:e2e` across configured browsers.
- [ ] Run `npm run measure-bundle`.
- [ ] Run `npm run build`.
- [ ] Confirm Phaser is absent from the production bundle before removing old files.
- [ ] Update `src/main.ts`/entrypoint only in the cutover PR.

**Gate:**

- `npm run typecheck` green.
- `npm run test:unit` green.
- `npm run test:integration` green if applicable.
- `npm run test:e2e` green.
- `npm run test:a11y` green.
- `npm run build` green.
- `npm run measure-bundle` <= 1.0 MB gzipped initial transfer.
- `/c5-check` clean.
- c1-c10 audit clean under the revised C4.
- bundle audit clean.

**Rollback criteria:**

- Bundle budget fails after Phaser removal.
- E2E flake rate increases.
- Pilot-critical flows regress.
- Touch/drag behavior is worse on baseline devices.

---

## Phase 8.5 - Regrettability Window

**Goal:** Give the cutover time to expose regressions that test suites missed, while
keeping reversion cheap.

**Duration:** A minimum of **two weeks of real usage** on `main` after cutover lands —
or longer if pilot validation has not yet exercised every level. Time spent on `main`
matters more than calendar days.

**Rules during the window:**

- Phaser source files in `src/scenes/`, `src/components/*.ts` (Phaser GameObjects), and
  related test hooks are **moved**, not deleted — relocate them to `src/_phaser-legacy/`
  (excluded from the production build via Vite config but kept in the repo).
- The `phaser` dependency stays in `package.json` but the production entry must not import
  it. Verify with `npm run build` + grep of the dist output.
- No feature work that depends on React/Pixi-only primitives lands during the window.
  Bug fixes are fine; new archetypes or visual systems wait.
- A single revert commit (or `git revert -m 1` of the cutover merge) must restore the
  Phaser app cleanly. Test this once — do not assume it works.

**Reversion triggers (any one ends the migration and rolls back):**

- A pilot-critical flow regresses and the React/Pixi fix is non-trivial.
- A real-device-only regression appears that did not surface in CI.
- Bundle grows past 1.0 MB once production-only usage data accumulates.
- A11y issues surface that the per-archetype audits missed.

**Exit criteria (proceed to Phase 9):**

- Two-week minimum elapsed.
- All 9 levels played end-to-end on `main` without revert.
- No reversion trigger fired.
- Full test suite + a11y + bundle audit all green on the most recent commit.

---

## Phase 9 - Decommission Phaser

**Goal:** Remove old runtime code after cutover proves stable through the Regrettability
Window.

**Precondition:** Phase 8.5 exited cleanly. Do not start Phase 9 if any trigger fired.

**Tasks:**

- [ ] Delete `src/_phaser-legacy/` and all files quarantined into it during Phase 8.5.
- [ ] Remove `phaser` from `package.json` dependencies.
- [ ] Run `npm install` and verify the lockfile no longer references Phaser.
- [ ] Remove obsolete Phaser-only helpers and types still referenced from legacy files only.
- [ ] Remove old `TestHooks.ts` only after the new React-side hooks cover equivalent
      Playwright assertions — confirm by running the full E2E suite.
- [ ] Remove old `A11yLayer.ts` only after the React/Pixi accessibility coverage is
      proven equivalent or better — confirm with `a11y-auditor` agent run.
- [ ] Update architecture docs and diagrams.
- [ ] Update `CLAUDE.md` constraints summary and Source map to match the new layout.
- [ ] Run `npm run sync:claude-md`.
- [ ] Archive this plan to `PLANS/_archive/` after final retrospective.

**Gate:**

- No import of `phaser` remains in production or test source (`grep -r "from 'phaser'"`
  returns nothing).
- Lockfile no longer includes Phaser.
- Bundle budget remains green.
- Full validation suite (typecheck, unit, integration, E2E, a11y, bundle) remains green.
- `/c5-check` and c1-c10 audit clean under the revised C4.

---

## Testing Matrix

| Layer | Command | Required when |
|---|---|---|
| Type safety | `npm run typecheck` | Every phase |
| Unit | `npm run test:unit` | Every phase |
| Integration | `npm run test:integration` | Persistence, boot, backup/restore, runtime services |
| E2E | `npm run test:e2e` | Shell, level loop, archetype, cutover |
| A11y | `npm run test:a11y` | Any interactive UI or migrated interaction |
| Build | `npm run build` | Dependency changes, cutover, release confidence |
| Bundle | `npm run measure-bundle` | Dependency changes, every third archetype, cutover |
| Curriculum | `npm run build:curriculum` + `npm run validate:curriculum` | Curriculum artifacts touched |
| LocalStorage | `/c5-check` | Any persistence, settings, boot, student-selection work |

---

## Bundle Budget Strategy

React + PixiJS can only be approved if the final production bundle removes Phaser. During
migration, dual runtime code must remain branch-local or test-only.

Rules:

- Do not ship Phaser + Pixi + React in the same production build.
- Measure after dependency installation, after shell creation, after every three archetypes,
  and at cutover.
- If the final build exceeds budget, stop and choose one:
  - abandon migration
  - remove optional code/features
  - lazy-load interaction renderers
  - revise the performance budget with an explicit decision
- Do not add Storybook during the migration. It is useful in many React projects, but it adds
  tooling surface and does not directly serve MVP validation. Prefer Playwright fixture routes.

---

## Accessibility Strategy

The migration must improve or preserve accessibility; it cannot use "React DOM" as a vague
promise.

| Surface | Requirement |
|---|---|
| Menus/settings/overlays | Native DOM controls with accessible names and visible focus. |
| Pixi canvas interactions | DOM action layer or equivalent keyboard controls for all essential actions. |
| Drag interactions | Keyboard alternative for pick/move/drop or equivalent stepper controls. |
| Feedback | Announced through polite live region where meaningful. |
| Motion | All tweens respect `prefers-reduced-motion`. |
| Touch targets | 44x44 CSS px minimum for interactive controls. |
| Color | State is never conveyed by color alone. |

Current `A11yLayer` behavior must be mapped feature-by-feature before it is removed.

---

## Data and Persistence Strategy

No data migration should be necessary. The migration changes presentation, not storage.

Preserve:

- Dexie schema versions
- repository APIs
- backup/restore format
- `lastUsedStudentId` exception
- static curriculum seed process
- dynamic stores for attempts, sessions, mastery, hints, flags, streaks, bookmarks, and device meta

If a persistence schema change becomes necessary, it is a separate plan and separate PR.

---

## Documentation Updates

Required docs if the migration proceeds:

- `docs/00-foundation/constraints.md` - revise C4.
- `docs/00-foundation/decision-log.md` - add migration decision.
- `docs/30-architecture/stack.md` - update stack and forbidden items.
- `docs/30-architecture/runtime-architecture.md` - update diagrams and lifecycle.
- `docs/30-architecture/test-strategy.md` - update test layers for React/Pixi.
- `docs/30-architecture/performance-budget.md` - update bundle slices.
- `docs/20-mechanic/activity-archetypes.md` - update implementation contract only if payloads or input alternatives change.
- `CLAUDE.md` - update quick orientation and constraints summary after C4 changes.

Phase-close rule from `CLAUDE.md` still applies:

- update `.claude/learnings.md` with non-obvious gotchas
- update durable docs if a rule changed
- run `npm run sync:claude-md` if generated sections changed

---

## Risk Register

| Risk | Severity | Likelihood | Mitigation | Stop condition |
|---|---|---:|---|---|
| C4 violation without explicit decision | High | High | Phase 0 gate before dependencies | Any React/Pixi runtime work before docs change |
| Bundle exceeds 1.0 MB | High | Medium | early vendor measurement; no dual-runtime shipping; spike must hit <= 850 KB | final projection cannot fit budget |
| Lazy-loading does not actually split chunks | High | Medium | use `React.lazy` + Suspense for interaction renderers, not bare `import()`; verify with `npm run measure-bundle` after first lazy boundary lands | dynamic imports inline and chunks stay monolithic |
| Tween-system replacement creeps in scope | Medium | High | rAF + token easings only on spike; only adopt a tween library if measured insufficient with concrete examples | a tween dependency is added without size justification |
| Touch drag regresses on mobile | High | Medium | mobile viewport E2E; manual baseline device check on Android + iOS | interaction feels worse than Phaser |
| Accessibility parity regresses | High | Medium | feature-map `A11yLayer` before removal; a11y tests per interaction; `a11y-auditor` per archetype | missing keyboard path for essential action |
| Engine determinism regressions | High | Low | `engine-determinism-auditor` on every PR touching `src/engine/`; renderers must inject through `src/engine/ports.ts` | direct host-global calls reappear in renderers |
| Validator payload drift | High | Low | payload map + fixtures + unit tests; `validator-parity-checker` on every validator-adjacent PR | validator changes needed solely for UI rewrite |
| Persistence drift | High | Low | no schema changes; reuse repos | Dexie migration required by presentation change |
| Rewrite expands scope | Medium | High | phase gates; no visual redesign; explicit non-goals in cost section | new UX scope unrelated to validation |
| E2E flake increases | Medium | Medium | DOM state assertions; deterministic waits | tests require sleeps or pixel guessing |
| Double-test-stack maintenance | Medium | High | quarantine Phaser code to `src/_phaser-legacy/` at Phase 8.5; gate Phase 9 on the regrettability window | CI runtime grows past current budget; flake rate climbs from interleaved suites |
| Cutover regret with no easy reversion | High | Low | Phase 8.5 regrettability window; revert-cutover commit tested once before deletion | irreversible delete happens before window completes |
| Old and new runtimes diverge | Medium | Medium | short-lived phase branches; no long dual-runtime period | maintaining both becomes required |

---

## Subagent and Audit Use

Use subagents only after a concrete diff exists or for clearly bounded review. Suggested points:

| Point | Agent | Purpose |
|---|---|---|
| After Phase 0 decision docs | `c1-c10-auditor` | Verify constraint changes are explicit and contained. |
| After dependency spike | `bundle-watcher` | Verify vendor cost and budget projection. |
| After validator/payload contract changes | `validator-parity-checker` | Confirm TS/Python parity is not broken. |
| After each interaction migration | `a11y-auditor` | Confirm keyboard, ARIA, reduced-motion, and touch target coverage. |

Do not fan out multiple workers against the same interaction file. Partition work by
archetype or by docs/code ownership.

---

## Final Migration Acceptance Criteria

The migration is done only when all of this is true:

- [ ] C4 has been explicitly revised in constraints and decision docs.
- [ ] Phaser is removed from production dependencies and production source.
- [ ] React + Pixi runtime boots the app from the normal entrypoint.
- [ ] All Levels 1-9 route correctly.
- [ ] All 11 archetypes work through migrated renderers.
- [ ] Existing validators remain the answer-semantics authority.
- [ ] Existing engine/progression behavior is preserved.
- [ ] Existing Dexie data remains readable.
- [ ] Backup/restore behavior is preserved.
- [ ] Accessibility tests pass.
- [ ] E2E tests pass.
- [ ] Unit/integration tests pass.
- [ ] Bundle remains <= 1.0 MB gzipped initial transfer.
- [ ] No new backend, account, remote telemetry, or external data egress exists.
- [ ] Pilot-validation workflow remains possible without special tooling.

---

## Appendix A - C4-Compliant Fallback Plan

If the migration is rejected or the spike fails, keep Phaser and execute this plan instead.
It targets the same agent-friendliness goals without changing the stack.

### A0 - Baseline

**Goal:** Start from a known-good state.

- [ ] Run `npm run typecheck`.
- [ ] Run `npm run test:unit`.
- [ ] Run current E2E smoke tests.
- [ ] Record current bundle with `npm run measure-bundle`.

### A1 - Strengthen existing TestHooks

**Goal:** Make Playwright assertions inspect state without pixel guessing.

- [ ] Standardize sentinel names for level id, question id, archetype id, attempt status,
      hint state, and session state.
- [ ] Ensure hooks are disabled in production unless explicitly test-gated.
- [ ] Add docs for the test hook contract.

### A2 - Extract pure interaction models

**Goal:** Test interaction logic without Phaser.

- [ ] Add a pure model contract under the existing interaction system.
- [ ] Migrate `identify` and `equal_or_not` first.
- [ ] Add headless unit tests for correct, incorrect, and edge cases.
- [ ] Keep Phaser renderers as adapters over the model.

### A3 - Upgrade accessibility mirroring

**Goal:** Make canvas interactions usable and testable through DOM actions.

- [ ] Feature-map current `A11yLayer`.
- [ ] Add missing actions per archetype.
- [ ] Ensure keyboard alternatives for essential drag/tap flows.
- [ ] Run `npm run test:a11y`.

### A4 - Migrate all archetypes to the model-adapter pattern

**Goal:** Keep Phaser but remove logic/render coupling.

- [ ] Apply per-archetype definition of done from Phase 7.
- [ ] Run focused unit tests per archetype.
- [ ] Add E2E smoke coverage only for critical paths.

### A5 - Final hardening

**Goal:** Make the Phaser runtime agent-friendly enough for MVP validation.

- [ ] Run `npm run typecheck`.
- [ ] Run `npm run test:unit`.
- [ ] Run `npm run test:e2e`.
- [ ] Run `npm run test:a11y`.
- [ ] Run `npm run measure-bundle`.
- [ ] Run `/c5-check`.

---

## Appendix B - Original Draft Problems Fixed By This Plan

The original draft was useful, but incomplete. This plan fixes these gaps:

- It treated a C4 violation as a footnote instead of the first gate.
- It proposed copying stable directories into `src-react/`, creating duplicate sources of truth.
- It did not account for existing `src/scenes/interactions/`, `TestHooks`, `A11yLayer`, and
  `levelRouter`.
- It did not include a feasibility spike.
- It did not define rollback criteria.
- It did not prevent a production build from shipping Phaser + React + Pixi together.
- It did not define per-archetype done criteria.
- It did not define accessibility parity requirements.
- It included Storybook without proving that additional tooling serves the MVP.
- It lacked a docs-update matrix for constraints, architecture, stack, tests, and performance.

## Appendix C - Additional Gaps Closed in the 2026-05-10 Revision

The first revision of this plan was decision-oriented but still under-specified in places
where the decision actually gets made. This revision adds:

- A concrete **Bundle Math** section with reference package sizes and a measurement-first
  protocol — the budget is the load-bearing constraint and the plan now treats it that way.
- An explicit **What this migration buys / What it costs** trade-off section, including a
  solo-developer effort estimate so the decision is grounded in calendar reality.
- Concrete **library defaults** for the spike (`react@^19`, `pixi.js@^8`, `@pixi/react@^8`,
  `wouter`, no tween library, no store), not just "React + Pixi."
- A **decision-log entry template** so Phase 0 produces a real artifact, not a checkbox.
- Inventory rows for **engine ports**, **tween manager**, **audio TTS pipeline**, and the
  **reduced-motion + theme** surface — all four were elided from the first draft.
- Commitment to **`equal_or_not` as the spike archetype** (not "identify or equal_or_not")
  with the reasoning recorded.
- **Numeric spike gates** (<= 850 KB gzipped, <= 100 ms tap latency on real device) instead
  of "plausibly fits."
- Per-archetype **specific risk** column in Phase 7 so the migration order communicates
  what to watch for, not just what to port.
- A new **Phase 8.5 Regrettability Window** that quarantines rather than deletes Phaser
  code for two real-usage weeks, with explicit reversion triggers.
- Risk register entries for **rolldown's chunk-inlining behavior**, **tween-system scope
  creep**, **engine determinism regressions**, **double-test-stack cost**, and **cutover
  regret with no easy reversion** — all surfaced from prior learnings.
