# Hardening Iteration 2: Error Boundaries & Resilience

**Goal:** Add graceful error handling at component and scene boundaries to prevent cascading failures.

## Phase 2.1: React Error Boundary
- [ ] Create ErrorBoundary component for app-level error catching
- [ ] Log errors with context (route, student ID, level)
- [ ] Show user-friendly error UI instead of blank screen
- [ ] Provide "try again" button with page reload

## Phase 2.2: Scene Lifecycle Safety
- [ ] Add try-catch around scene create/init/update cycles
- [ ] Safe transitions on canvas errors
- [ ] Validate scene params before use
- [ ] Handle missing physics/rendering gracefully

## Phase 2.3: Network Resilience
- [ ] Fetch retries with exponential backoff for curriculum
- [ ] Timeout guards on async operations
- [ ] Offline detection and cached fallback
- [ ] Network error notifications to user

## Phase 2.4: IndexedDB Corruption Recovery
- [ ] Integrity checks on DB open
- [ ] Automatic recovery attempts
- [ ] User-facing recovery UI
- [ ] Backup download option during recovery

## Success Criteria
- No white screen of death on any error path
- All errors logged with full context
- Users can recover from network failures
- DB corruption triggers graceful recovery flow
