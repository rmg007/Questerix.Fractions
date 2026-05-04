# Phase 8 — WCAG 2.1 AA Accessibility Hardening

**Goal:** Every interactive object is announced, ≥44×44 CSS px, animations respect reduced-motion, color ≥4.5:1.

**Gate:** `npm run test:a11y` passes + contrast unit test passes + a11y-auditor subagent clean.

**Estimated:** 6–8 hours.

---

## Workstreams (parallel where independent)

### 1. Color Contrast Audit & Fix
- **Scope:** `src/scenes/utils/colors.ts` — audit primary #2F6FED (~3.5:1 on white, fails AA)
- **Options:** 
  - Darken to #1E54CE (~5:1 contrast)
  - Or restrict current to 24pt+ text only
- **Action:** Update HEX.primary, add WCAG contrast unit test in `tests/unit/contrast.spec.ts`
- **Files:** colors.ts, tests/unit/contrast.spec.ts (new)

### 2. Missing ARIA Labels
- **Scope:** MenuScene, LevelMapScene, CompareInteraction
- **Action:** 
  - Grep all setInteractive() calls
  - Assert each has A11yLayer.mountAction() pair
  - Add missing labels using A11yLayer API
- **Files:** MenuScene.ts, LevelMapScene.ts, CompareInteraction.ts, interactions/CLAUDE.md (guidance)

### 3. Hit-Area Sizes (44×44 CSS px minimum)
- **Scope:** MenuScene buttons, LevelMapScene nodes, interactive quiz elements
- **Action:** 
  - Explicitly set hit-area rectangles ≥ 44×44
  - Add automated size check in tests/a11y/wcag.spec.ts
- **Files:** MenuScene.ts, LevelMapScene.ts, interactions/*.ts

### 4. AccessibilityAnnouncer Coverage
- **Scope:** SessionCompleteOverlay, Mascot events
- **Action:** 
  - Verify announcer fires on overlay open
  - Verify Mascot state changes trigger announcement
- **Files:** SessionCompleteOverlay.ts, Mascot.ts, components/A11yLayer.ts (if needed)

### 5. Reduced-Motion Consistency
- **Scope:** BenchmarkInteraction, CompareInteraction, EqualOrNotInteraction
- **Action:** 
  - Standardize on checkReduceMotion() helper
  - Audit all tweens/animations
  - Use prefers-reduced-motion media query consistently
- **Files:** interactions/BenchmarkInteraction.ts, interactions/CompareInteraction.ts, interactions/EqualOrNotInteraction.ts, src/styles/index.css

---

## Sequential execution

1. **Round 1 (parallel):** Contrast audit (1) + ARIA audit (2) + hit-area audit (3)
2. **Round 2:** Apply fixes from Round 1 audits
3. **Round 3 (parallel):** AccessibilityAnnouncer (4) + reduced-motion audit (5)
4. **Round 4:** Apply remaining fixes, run full a11y suite

---

## Success criteria

- [ ] `npm run typecheck` — clean
- [ ] `npm run lint` — clean
- [ ] `npm run test:unit` — all pass
- [ ] `npm run test:a11y` — all pass
- [ ] Contrast unit test added and passing
- [ ] a11y-auditor subagent report clean
