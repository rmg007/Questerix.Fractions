# Phase 7 — Component Lifecycle Hardening

**Goal:** Zero DOM orphans, zero unbounded calls, predictable cleanup.  
**Gate:** component tests pass + DOM-orphan check after teardown = 0.

---

## Work Items (serial execution)

### Item 1: HintLadder — Boundary Standardization
**File:** `src/components/HintLadder.ts:44`

**Current:** `next()` clamps to last tier on exhaustion; docstring is ambiguous.

**Fix:**
- Clarify: `next()` always returns a tier (clamps to last when exhausted)
- Update docstring: "Returns the next tier, or the last tier if exhausted. Callers check `state.exhausted` before calling."
- Add unit tests (no Phaser needed)

**Test:** `tests/unit/components/HintLadder.test.ts` — verify clamp behavior + state tracking

---

### Item 2: A11yLayer — Lifecycle Cleanup
**File:** `src/components/A11yLayer.ts:129`

**Current:** `pushLayer()` creates DOM; no auto-cleanup on scene shutdown.

**Fix:**
- Add guidance to CLAUDE.md: scenes creating modals must call `A11yLayer.popLayer()` on `scene.events.once('shutdown')`
- Add test verifying orphan prevention (mount layer, destroy scene, check DOM)
- Pattern: scenes should clean up in `shutdown` event handler

**Test:** `tests/unit/a11y/A11yLayer-lifecycle.test.ts` — verify pushLayer/popLayer, test orphan scenario

---

### Item 3: ProgressBar — Tween Tracking
**File:** `src/components/ProgressBar.ts:94`

**Current:** Tween created but reference dropped; relies on `scene.tweens.killAll()`.

**Fix:**
- Store tween refs in `private tweens: Phaser.Tweens.Tween[] = []`
- Kill all tweens in `destroy()` before destroying scene objects
- Add docstring: "All tweens killed in destroy(); does not rely on scene cleanup."

**Test:** `tests/unit/components/ProgressBar-lifecycle.test.ts` — verify tweens killed in destroy()

---

### Item 4: FeedbackOverlay — Positioning & Gating
**File:** `src/components/FeedbackOverlay.ts:120, 124, 249`

**Current:**
- Line 120: Hard-coded `hideY` (ignores camera movement)
- Line 124: SFX unguarded (plays even if muted/paused)
- Emitters: destroyed in `hide()` but not on early scene shutdown

**Fix:**
- Use `scene.cameras.main.centerX` instead of hard-coded width/2
- Gate SFX: `if (!reduceMotion && !scene.isPaused()) sfx.play*()`
- Gate input: `mountInteractive()` only if not transitioning (check `!dismissTimer`)
- Ensure emitters destroyed on scene `shutdown` event (auto-cleanup hook)
- Update `destroy()` to kill any active dismissTimer + emitter cleanup

**Test:** `tests/unit/components/FeedbackOverlay-lifecycle.test.ts` — verify timer cleanup, emitter cleanup, camera tracking

---

### Item 5: DOM-Orphan Verification Utility
**File:** `tests/utils/dom-orphan-check.ts` (new)

**Purpose:** Utility to verify no A11y layer elements remain after scene teardown.

**API:**
```ts
export function countOrphanA11yElements(): number {
  // count divs with id matching 'qf-a11y-layer-*'
  // return count > 0 ? throw : 0
}
```

**Use in tests:** call after each component destruction to verify gate criterion.

---

## Gate Criteria

✅ All unit tests pass  
✅ DOM-orphan check returns 0 after each component lifecycle test  
✅ No timer leaks (delayedCall cleaned up)  
✅ No tween leaks (all killed in destroy())  
✅ No emitter leaks (particle emitters destroyed)

---

## Execution Order

1. **HintLadder** (pure logic, no mocks) ← start here
2. **A11yLayer** (DOM, no Phaser mocks)
3. **ProgressBar** (Phaser mock, simple lifecycle)
4. **FeedbackOverlay** (complex: camera, timers, emitters, SFX gating)
5. **Verify all tests + gate** → commit

Each item: implement fix → write test → verify gate → move to next
