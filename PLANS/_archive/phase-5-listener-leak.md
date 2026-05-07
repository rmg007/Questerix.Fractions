# Phase 5 Implementation Plan: Listener & State Leak Hardening

## Context

Phase 5 eliminates listener/state leaks and ensures deterministic shutdown across the gameplay lifecycle. Current issues:
1. **Listener leaks**: Level01Scene & LevelScene pointerdown handlers untracked; Mascot nested timer chains partial cleanup
2. **State leaks**: correctStreak persists on Play Again; potential templatePool growth (mitigated by modulo overflow guard)
3. **Tween leaks**: DragHandle hideGlow() anonymous tween; cleanup pattern inconsistent between scenes
4. **Reduced-motion**: Implemented but needs verification and completion

**Gate**: Scene lifecycle tests pass + 10× Play Again heap snapshot diff shows 0 listener leaks.

---

## Implementation Strategy

### Round 1: Scene-Level Cleanup (sequential, shared god-files)

Scenes touch shared components (Mascot, FeedbackOverlay, ProgressBar). Implement scene cleanup first, then component cleanup.

**Files & Order:**
1. **LevelScene.ts** — add listener tracking, fix state reset, complete preDestroy
2. **Level01Scene.ts** — same pattern as LevelScene
3. **MenuScene.ts** — verify & complete SHUTDOWN cleanup pattern
4. **BootScene.ts** — verify _advanced guard (already solid)

### Round 2: Component Cleanup (sequential, shared usage)

**Files & Order:**
1. **Mascot.ts** — fix nested timer chains, complete destroy()
2. **DragHandle.ts** — store hideGlow tween, verify destroy()
3. **ProgressBar.ts** — add explicit destroy(), ensure tween cleanup
4. **FeedbackOverlay.ts** — verify destroy(), ensure timer cleanup
5. **LevelMapScene.ts** — verify update listener cleanup

### Round 3: Interaction Lifecycle (parallel, independent files)

All 12 interactions already have unmount(). Verify & harden:
- Pointer capture cleanup
- TestHooks unmounting
- A11yLayer unmounting

**Files**: `interactions/*.ts` (11 files + PartitionInteraction.ts)

### Round 4: Reduced-Motion Gating (parallel, independent)

**Files**:
- MenuScene.ts (line 128, 773) — verify gates
- FeedbackOverlay.ts (line 103) — verify dynamic check
- Mascot.ts (line 66) — verify gate pattern
- Level01Scene.ts / LevelScene.ts — add gates if missing

### Round 5: Testing & Verification

Run heap snapshot diff on 10× Play Again cycles to verify zero listener accumulation.

---

## Detailed Work Items

### **Item 1: Scene Pointerdown Listener Tracking**

**Problem**: Level01Scene & LevelScene register `this.input.on('pointerdown', ...)` at lines 267, 269 but never remove them.

**Files & Lines**:
- `LevelScene.ts:269–272` (pointerdown registration)
- `LevelScene.ts:787–805` (preDestroy)
- `Level01Scene.ts:267–270` (pointerdown registration)
- `Level01Scene.ts:622–638` (preDestroy)

**Solution**:
1. Store handler reference:
   ```typescript
   private pointerdownHandler?: () => void;
   ```
2. Register with reference:
   ```typescript
   this.pointerdownHandler = () => {
     this.mascot?.resetIdleTimer();
     this.mascot?.startIdleTimer();
   };
   this.input.on('pointerdown', this.pointerdownHandler);
   ```
3. Remove in preDestroy():
   ```typescript
   this.input.off('pointerdown', this.pointerdownHandler);
   ```

**Pattern**: Same as DragHandle.ts:312 (already working).

---

### **Item 2: Tween & Timer Cleanup**

**A) Mascot.ts — Nested Timer Chains**

**Problem**: `scheduleZzz()` at line 405–413 chains nested `delayedCall()` where only first timer is stored.

**File & Lines**: `Mascot.ts:405–413`, `Mascot.ts:636–638`, `Mascot.ts:717–732`

**Current Pattern**:
```typescript
scheduleZzz() {
  this.zzzTimer = this.scene.time.delayedCall(700, () => {
    this.floatOneZzz('z', 16);
    this.scene.time.delayedCall(700, () => {  // ← not stored
      this.floatOneZzz('Z', 20);
      this.scene.time.delayedCall(1800, () => this.scheduleZzz());  // ← not stored
    });
  });
}
```

**Solution**: Store all nested timers in an array:
```typescript
private zzzTimerChain: Phaser.Time.TimerEvent[] = [];

scheduleZzz() {
  this.zzzTimer = this.scene.time.delayedCall(700, () => {
    this.floatOneZzz('z', 16);
    const t2 = this.scene.time.delayedCall(700, () => {
      this.floatOneZzz('Z', 20);
      const t3 = this.scene.time.delayedCall(1800, () => this.scheduleZzz());
      this.zzzTimerChain.push(t3);
    });
    this.zzzTimerChain.push(t2);
  });
}
```

Then destroy all in `clearSleepFx()` (lines 437–445) and `destroy()` (line 717):
```typescript
for (const t of this.zzzTimerChain) t.destroy();
this.zzzTimerChain = [];
```

**B) DragHandle.ts — Anonymous Tween in hideGlow()**

**Problem**: `hideGlow()` at line 253–260 creates tween without storing reference.

**File & Lines**: `DragHandle.ts:253–260`, `DragHandle.ts:302–314`

**Solution**: Store tween reference:
```typescript
private hideGlowTween?: Phaser.Tweens.Tween;

hideGlow(): void {
  this.hideGlowTween = this.scene.tweens.add({
    targets: this.glowCircle,
    alpha: 0, scaleX: 1, scaleY: 1,
    duration: 180, ease: 'Cubic.easeIn',
  });
}
```

Then destroy in `destroy()`:
```typescript
this.hideGlowTween?.stop();
```

**C) MenuScene.ts — Verify SHUTDOWN Cleanup**

**File & Lines**: `MenuScene.ts:364–371`

Already properly handles tweens and `dashTickHandler`. Verify station button listeners (line 875–908) are covered by scene destroy (Phaser auto-cleans GameObject listeners on destroy).

**D) Level01Scene.ts — Add time.removeAllEvents()**

**File & Lines**: `Level01Scene.ts:622–638`

Add defensive timer cleanup (like Level01Scene already does):
```typescript
preDestroy(): void {
  this.time.removeAllEvents();  // ← add this
  this.tweens.killAll();
  // ... rest of cleanup
}
```

---

### **Item 3: Pointer Capture in Interactions**

**Problem**: All 12 interactions call `mount()` and `unmount()`, but need to verify pointer capture cleanup.

**Files**: `interactions/*.ts` (all 12 files)

**Pattern** (PartitionInteraction.ts line 160–193):
```typescript
mount(): void {
  TestHooks.mountInteractive('partition-target', () => {
    ctx.onCommit(buildInput());
  });
  A11yLayer.mountAction('a11y-partition-submit', 'Submit', () => {
    ctx.onCommit(buildInput());
  });
}

unmount(): void {
  TestHooks.unmount('partition-target');
  A11yLayer.unmountAction('a11y-partition-submit');
  // destroy gameObjects
}
```

**Solution**: Verify all 12 interactions follow this pattern:
- `mount()` registers via TestHooks & A11yLayer
- `unmount()` calls corresponding cleanup
- No raw `this.scene.input.on()` without `this.scene.input.off()`
- All GameObjects destroyed in unmount

---

### **Item 4: Double-Submit Guards**

**Files & Lines**: 
- `levelSceneQuestionFlow.ts:150, 165` (inputLocked checks)
- `MakeInteraction.ts`, `IdentifyInteraction.ts` (check for guards)

**Current Pattern** (line 150, 165):
```typescript
if (ctx.inputLocked) return;  // commitQuestion guard
// ...
if (ctx.inputLocked || ctx.lastPayload === null) return;  // submitQuestion guard
callbacks.setInputLocked(true);  // lock immediately
```

**Verification**: Ensure both interactions check `inputLocked` before calling `onCommit()`. If not, add guard.

---

### **Item 5: Session State Reset on init()**

**Problem**: `correctStreak` not reset on Play Again (LevelScene, Level01Scene).

**Files & Lines**:
- `LevelScene.ts:134–155` (init method)
- `Level01Scene.ts:128–141` (init method)
- Also: `LevelScene.ts:100`, `Level01Scene.ts:102` (declarations)

**Solution**: Add explicit reset in `init()`:
```typescript
init(data: LevelSceneData): void {
  this.levelNumber = data.levelNumber ?? 1;
  this.studentId = data.studentId ?? null;
  
  // Reset all session state
  this.questionIndex = 0;
  this.attemptCount = 0;
  this.wrongCount = 0;
  this.correctCount = 0;
  this.correctStreak = 0;              // ← add this
  this.responseTimes = [];
  this.questionStartTime = 0;
  this.inputLocked = false;
  this.activeInteraction = null;
  this.studentDisplayName = null;
  
  // Clear any persisted BKT state (Level01Scene specific)
  if (this.calibrationState) {
    this.calibrationState = null;
  }
  if (this.recentOutcomes) {
    this.recentOutcomes = [];
  }
}
```

---

### **Item 6: Template Pool Overflow**

**Files & Lines**: `levelSceneQuestionFlow.ts:80–86`, `levelSceneTemplates.ts:56–130`

**Current Pattern**: Uses modulo wrap-around + fallback:
```typescript
const pool = callbacks.getTemplatePool();
if (pool.length > 0) {
  template = pool[index % pool.length]!;  // wrap around
} else {
  template = callbacks.makeFallbackTemplate();  // fallback
}
```

**Verification**: Ensure this pattern is in place. If pool is empty, game degrades gracefully to synthetic questions. No explicit limit needed since pool is per-level and refreshed per scene.

---

### **Item 7: BootScene Robustness**

**File & Lines**: `BootScene.ts:23, 37–42, 178, 192`

**Current Pattern** (already solid):
```typescript
private _advanced = false;  // line 23

// Button mount (line 37–42)
TestHooks.mountInteractive('boot-start-btn', () => {
  void this.advanceToPreload();
});

// Guard (line 192)
private advanceToPreload(): void {
  if (this._advanced) return;  // guard prevents double-advance
  this._advanced = true;
  // ... fade and start PreloadScene
}
```

**Verification**: Guard is atomic and sufficient. No changes needed.

---

### **Item 8: Reduced-Motion Gates**

**Files & Lines**:
- `MenuScene.ts:109, 128, 131–132, 773` (camera fade, dash animation)
- `FeedbackOverlay.ts:103, 162, 169–202` (show tweens vs. instant)
- `Mascot.ts:66, 139, 156, 162` (all animation methods gated)

**Verification Checklist**:
- MenuScene: fadeIn gated ✓
- MenuScene: dash animation gated ✓
- FeedbackOverlay: re-checks on show() ✓ (best practice)
- Mascot: all methods check reduce-motion ✓
- Level01Scene / LevelScene: check if dragHandle animations need gating

**Solution if gaps found**:
```typescript
// Before animation
const reduceMotion = checkReduceMotion();
if (reduceMotion) {
  // instant state, no tweens
  return;
}
// create tweens
```

---

### **Item 9: Mascot Stall Prevention**

**File & Lines**: `Mascot.ts:96, 162–186, 198–214, 232–256, 277–305, 340–355, 368–375, 427–434, 454–470`

**Problem**: Some animation states may finish but not call `setState('idle')` automatically.

**Current Pattern** (line 162–186, celebrate):
```typescript
private celebrate(): void {
  this.stopCurrent();
  if (this.reduceMotion) {
    this.setState('idle');  // fallback
    return;
  }
  
  this.scene.tweens.chain({
    targets: this,
    tweens: [{...}, {...}],
    // ← no onComplete handler shown
  });
}
```

**Solution**: Add `onComplete` callback to every animation chain:
```typescript
this.scene.tweens.chain({
  targets: this,
  tweens: [{...}, {...}],
  onComplete: () => {
    this.setState('idle');  // ← always return to idle
  },
});
```

If tweens don't support onComplete, add 100ms timeout wrapper:
```typescript
this.scene.time.delayedCall(totalDuration + 100, () => {
  if (this.currentState !== 'idle') {
    this.setState('idle');
  }
});
```

---

### **Item 10: Scene Shutdown Robustness**

**Files & Lines**:
- `LevelScene.ts:787–805` (preDestroy)
- `Level01Scene.ts:622–638` (preDestroy)
- `MenuScene.ts:364–371` (SHUTDOWN event)

**Verification Checklist**:
1. **LevelScene.preDestroy()**:
   - ✓ tweens.killAll()
   - ✓ activeInteraction.unmount()
   - ✓ component destroy()
   - ✗ Add: time.removeAllEvents() (defensive)
   - ✗ Add: this.input.off('pointerdown', handler)

2. **Level01Scene.preDestroy()**:
   - ✓ time.removeAllEvents()
   - ✓ tweens.killAll()
   - ✓ component destroy()
   - ✗ Add: this.input.off('pointerdown', handler)

3. **MenuScene SHUTDOWN**:
   - ✓ Ambientween cleanup
   - ✓ dashTickHandler removal
   - Verify: all modal/overlay objects destroyed

**Solution**: Add to preDestroy():
```typescript
preDestroy(): void {
  // Explicit listener cleanup
  this.input.off('pointerdown', this.pointerdownHandler);
  
  // Defensive timer cleanup
  this.time.removeAllEvents();
  
  // Kill all tweens
  this.tweens.killAll();
  
  // Destroy components & overlays
  // ...
}
```

---

## Testing & Verification

### Heap Snapshot Test Procedure

1. **Setup**: Navigate to Level 1, play to completion (5 questions)
2. **Baseline**: Take heap snapshot after session complete, before Play Again
3. **Cycle 1**: Click Play Again, complete another 5 questions
4. **Snapshot 1**: Take heap snapshot
5. **Repeat cycles 2–10**: Play Again → complete → snapshot
6. **Analyze**: Check `Detached DOM nodes` & listener count in DevTools heap snapshots
   - Should NOT accumulate (diff between snapshot 1 and snapshot 10 should be near-zero)
   - Listener count should remain constant

### Scene Lifecycle Test

```bash
npm run test:unit -- --filter "lifecycle|shutdown|cleanup"
```

Expected: All scene cleanup tests pass + no memory leak warnings.

### Reduced-Motion Smoke Test

```bash
npm run test:a11y
```

Expected: A11y tests pass with `prefers-reduced-motion` media query enforced.

---

## Critical Files Summary

| Work Item | Files | Lines | Priority |
|-----------|-------|-------|----------|
| 1. Listener tracking | LevelScene, Level01Scene | 269, 267, 787, 622 | HIGH |
| 2. Tween cleanup | Mascot, DragHandle, MenuScene, Level01Scene | 405, 253, 364, 622 | HIGH |
| 3. Pointer capture | All interactions | — | MEDIUM (verify only) |
| 4. Double-submit | Question flow | 150, 165 | MEDIUM (verify only) |
| 5. State reset | LevelScene, Level01Scene | 134, 128 | HIGH |
| 6. Pool overflow | Question flow, templates | 80, 56 | LOW (verify only) |
| 7. BootScene | BootScene | 23, 192 | LOW (verify only) |
| 8. Reduced-motion | MenuScene, FeedbackOverlay, Mascot | 128, 103, 66 | MEDIUM |
| 9. Mascot stalls | Mascot | 162–470 | MEDIUM |
| 10. Scene shutdown | LevelScene, Level01Scene | 787, 622 | HIGH |

---

## Commit Strategy

One commit per work item (atomic + reversible):
1. `fix(scenes): track and remove pointerdown listeners in LevelScene & Level01Scene`
2. `fix(components): store and cleanup nested timers in Mascot.ts`
3. `fix(components): store hideGlow tween in DragHandle.ts`
4. `fix(scenes): add correctStreak reset on init()`
5. `fix(scenes): add time.removeAllEvents() to preDestroy()`
6. `fix(components): add onComplete handlers to Mascot animation chains`
7. `fix(scenes): verify reduced-motion gating & add if missing`
8. Verify commits for items 3, 4, 6, 7 (no changes if already correct)

Final commit: `test(scenes): add heap snapshot lifecycle tests`

---

## Success Criteria

- ✅ All pointerdown listeners tracked & removed on scene destroy
- ✅ All nested timers stored & destroyed (Mascot zzzTimer chain)
- ✅ All tweens stored & stopped (DragHandle hideGlow)
- ✅ correctStreak reset on init() for both scenes
- ✅ Mascot never stalls (every animation → setState('idle'))
- ✅ Heap snapshot diff (cycle 1 → cycle 10) shows 0 listener accumulation
- ✅ Scene lifecycle tests pass
- ✅ A11y tests pass (reduced-motion gates verified)
