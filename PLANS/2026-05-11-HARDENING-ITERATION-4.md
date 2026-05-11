# Hardening Iteration 4: Memory Leak Prevention & Performance Hardening

**Goal:** Eliminate event listener leaks, lingering references, and performance bottlenecks to ensure sustained session performance.

## Phase 4.1: Event Listener Cleanup
- [ ] Audit Phaser scene for all listeners (input, shutdown, update, signal)
- [ ] Add cleanup in scene.shutdown/destroy hooks
- [ ] Ensure A11yLayer event listeners are removed on scene transition
- [ ] Remove global window listeners on app unmount

**Scope:** src/scenes/, src/components/, src/lib/

## Phase 4.2: Subscription Lifecycle
- [ ] Cancel active Dexie queries on navigation
- [ ] Unsubscribe from observables in React effects (useEffect cleanup)
- [ ] Close IndexedDB cursors and abort operations
- [ ] Clear timers/setInterval (e.g., animation loops, polling)

**Scope:** src/app/hooks/, src/lib/observability/, src/persistence/

## Phase 4.3: Reference Cycles
- [ ] Check for circular references in SkillMastery / ProgressionStat
- [ ] Audit middleware write-through callbacks (observability, telemetry)
- [ ] Ensure scene transitions fully release prior scene data
- [ ] Validate BKT engine state is reset between sessions

**Scope:** src/persistence/middleware.ts, src/engine/, src/scenes/LevelScene.ts

## Phase 4.4: Bundle Dead Code
- [ ] Remove unused imports and dead branches
- [ ] Verify tree-shaking of unused validators
- [ ] Check for lingering debug-only code paths
- [ ] Validate vendor bundle doesn't include dev tools

**Scope:** src/, build output analysis

## Phase 4.5: Performance Baselines
- [ ] Measure scene load time (boot → level scene ready)
- [ ] Profile memory growth across 5-session run
- [ ] Benchmark attempt submission latency (< 100ms)
- [ ] Check frame rate stability (60fps target, min 30fps)

**Scope:** src/lib/perf/, test profiles

## Success Criteria
- No warnings in Chrome DevTools Memory profiler
- Zero detectable memory growth across 10 sessions
- Scene transitions complete in < 500ms
- All Phaser listeners cleaned on scene.shutdown
- Test suite runs without resource warnings
- Production bundle has no unused top-level code

## Notes

**Priority Order:** Phase 4.1 → 4.2 → 4.3 → 4.4 → 4.5

Memory leaks are typically hidden until a user completes many sessions. Focus on cleanup hooks first (event listeners, subscriptions), then reference cycles, then bundle optimization. Performance baselines (Phase 4.5) should be measured *after* cleanup to establish a valid baseline.

This iteration assumes Iteration 3 (input validation) is complete and the app is resilient to malformed data.
