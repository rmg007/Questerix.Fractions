# Phase 6: Archetype Renderers (Parallel Implementation)

**Status:** Ready to start  
**Date:** 2026-05-10  
**Phase:** 6 of ~8  

## Goal
Implement 9 remaining archetype renderers using the PixiStage + model reducer pattern validated in Phase 5 (commit ff5855f). Unblock Phase 7 (integration + E2E).

---

## Renderers (10 archetypes, 1 bonus)

| # | Archetype | Renderer File | Visual Domain | Pattern |
|---|-----------|---------------|---------------|---------|
| 1 | partition_halves, partition_thirds, partition_fourths | PartitionRenderer | Circle/rectangle partitioning | shapes + highlighting |
| 2 | identify_denominators, identify_numerators | IdentifyRenderer | Label identification | pointer + selection |
| 3 | label_fractional_parts | LabelRenderer | Text labeling | input fields / text boxes |
| 4 | make_fraction | MakeRenderer | Construct from pieces | drag + drop assembly |
| 5 | compare_fractions | CompareRenderer | Side-by-side comparison | pointer + feedback |
| 6 | snap_match_fraction | SnapMatchRenderer | Grid-based matching | drag + snap + validation |
| 7 | benchmark_fraction | BenchmarkRenderer | Compare vs reference | highlighting + feedback |
| 8 | placement_on_number_line | PlacementRenderer | Number line positioning | drag on 1D axis |
| 9 | order_fractions | OrderRenderer | Arrange in sequence | drag to reorder |
| 10 | explain_your_order | ExplainYourOrderRenderer | Verbal/text reasoning | text input or choice selection |

---

## Architecture (Validated)

All renderers inherit from **Phase 5 foundation**:

```tsx
export function ArchetypeRenderer({
  question,        // ArchetypeQuestion
  model,          // InteractionModel<Q, S, E, A>
  onAnswer,       // (answer: ArchetypeAnswer) => void
  onStateChange,  // (state: ArchetypeState) => void
  width = 500,
  height = 300,
}: ArchetypeRendererProps) {
  const stageRef = useRef<PIXI.Application | null>(null);
  const pointerMgrRef = useRef<PointerManager | null>(null);
  const keyboardMgrRef = useRef<KeyboardManager | null>(null);
  const stateRef = useRef<ArchetypeState>(model.initialize(question));

  // Initialize managers
  useEffect(() => { /* ... */ }, []);

  // Handle pointer events → updateState()
  const handlePointerEvent = (event) => { /* ... */ };

  // Handle keyboard events → updateState()
  const handleKeyboardEvent = (event) => { /* ... */ };

  // updateState: emit to model.reduce(), call onAnswer/onStateChange, re-render
  const updateState = (event: ArchetypeEvent) => { /* ... */ };

  // renderStage: clear, draw using design tokens, attach listeners
  const renderStage = (app, state) => { /* ... */ };

  return <PixiStage onReady={handleReady} {...props} />;
}
```

**Key patterns:**
- No local useState; state lives in `stateRef` + model reducer
- Pointer/keyboard events always route through `updateState()` → `model.reduce()`
- Rendering is fully declarative: `renderStage()` called on every state change
- Animations: `tweenAlpha()`, `tweenPosition()` from `src/interactions/pixi/visual.ts`
- Design tokens: `COLORS`, `SPACING`, `TOUCH_TARGETS` from `src/interactions/pixi/tokens.ts`

---

## Phase Gates (Must Pass Before Phase 7)

### Gate 1: All Renderers Implemented
- [ ] 10 renderer files created in `src/interactions/pixi/renderers/`
- [ ] All exports added to `src/interactions/pixi/index.ts`
- [ ] No template comments or TODOs in renderer code

### Gate 2: Type Safety & Lint
- [ ] `npm run typecheck` passes (no `any` types)
- [ ] `npm run lint` passes (<100 warnings, 0 errors)
- [ ] No `@ts-ignore` or `any` casts in new code

### Gate 3: Validators Green
- [ ] All 10 archetype validators pass (`npm run test:unit -- --filter validators`)
- [ ] 1056 tests green (pre-existing Level 5 failures acceptable; no new failures)

### Gate 4: Bundle Size
- [ ] Gzipped JS ≤ 250 KB (Phase 5: ~208 KB; Phase 6 estimate: +30–40 KB)
- [ ] `npm run measure-bundle` shows breakdown by renderer

### Gate 5: Accessibility
- [ ] All interactive elements have touch targets ≥ 44×44 CSS px (checked per renderer)
- [ ] All buttons/text have ARIA labels or accessible names
- [ ] Animations respect `prefers-reduced-motion` (via design token defaults)
- [ ] `npm run test:a11y` baseline established (will expand in Phase 7)

### Gate 6: Code Review (Specialist Agents)
- [ ] `a11y-auditor` runs post-implementation (parallel with bundle-watcher)
- [ ] `bundle-watcher` confirms 250 KB ceiling
- [ ] `game-design-k2` reviews visual consistency across all 10 renderers

---

## Implementation Strategy (Parallel Work)

### Pre-Implementation (Solo, ~30 min)
1. Create branch `feat/2026-05-10-phase-6-archetype-renderers`
2. Document archetype specs in `PLANS/archetype-specs-phase-6.md` (grep each from docs/20-mechanic/activity-archetypes.md)
3. Create skeleton for all 10 renderers (empty renderStage functions, placeholder props)

### Phase 6a: Parallel Renderer Authoring (3 sub-teams, ~2 hours each)

**Team A: Geometric Renderers** (PartitionRenderer, IdentifyRenderer, LabelRenderer)  
Visual focus: circles, rectangles, highlighting, text labels

**Team B: Interaction-Heavy Renderers** (MakeRenderer, CompareRenderer, SnapMatchRenderer)  
Focus: drag/drop, snapping, validation feedback

**Team C: Layout Renderers** (BenchmarkRenderer, PlacementRenderer, OrderRenderer, ExplainYourOrderRenderer)  
Focus: number lines, positioning, ordering UI, text input/output

Each team:
1. Read activity-archetype spec
2. Review existing Phaser scene implementation (from `src/scenes/interactions/`)
3. Sketch visual layout on paper / in PIXI (prototyping)
4. Implement renderStage function + event handlers
5. Link to model validators (test early)
6. Run `npm run test:unit -- --filter <archetype>`

### Phase 6b: Integration & Polish (Solo, ~1 hour)
1. Update all 10 renderer exports in `src/interactions/pixi/index.ts`
2. Run full test suite: `npm run typecheck && npm run lint && npm run test:unit`
3. Measure bundle: `npm run measure-bundle`
4. Create demo/integration test wiring (Phase 7 prep)

### Phase 6c: Specialist Agent Audits (Concurrent with 6b, ~30 min)
Spawn in parallel after code lands:
- `a11y-auditor` (touch targets, ARIA)
- `bundle-watcher` (250 KB gate)
- `game-design-k2` (visual consistency)

---

## Estimation
- Pre-implementation: **30 min**
- Parallel team work: **2 hours** (3 sub-teams overlap)
- Integration: **1 hour**
- Audits: **30 min** (concurrent)
- **Total: ~3.5–4 hours** (including test passes)

---

## Known Constraints & Edge Cases

### Design Consistency
All renderers must use design tokens from `tokens.ts`:
- **Never** hardcode colors, spacing, or animations
- Use COLORS constants for all fills/strokes
- Use SPACING for margins, TOUCH_TARGETS for interactive elements
- Use MOTION/EASING for tweens

### Model-Renderer Contract
- Renderers are **stateless views** — all business logic lives in InteractionModel
- `renderStage()` may be called 0 or 100 times per interaction; must be idempotent
- Never modify model state directly; always emit events through updateState()

### A11y Touch Targets
Minimum 44×44 CSS px per WCAG 2.1 Level AA. Phaser scenes use 50–60 px; Pixi renderers should match or exceed.

### Performance
- Use `createButton()` factory (createRectvis + text caching)
- Avoid `new PIXI.Text()` in tight loops; cache or reuse
- Benchmark particle effects (benchmarkRenderer) if performance suspect

---

## Acceptance Criteria
Phase 6 is complete when:
1. All 10 renderers implemented and exported
2. All gates 1–6 passing
3. Commit message: `feat: Phase 6 — 10 archetype renderers`
4. PR title: `feat: 10 archetype renderers for React+PixiJS migration`
5. Ready to hand off to Phase 7 (integration + E2E)

---

## Deferred to Phase 7+
- E2E interaction tests (Playwright)
- Integration with curriculum loader
- Full A11y audit (axe-core)
- Performance profiling + optimization
