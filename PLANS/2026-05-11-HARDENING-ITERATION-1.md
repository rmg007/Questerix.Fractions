# Hardening Iteration 1: Security & Error Handling

**Goal:** Fix security vulnerabilities, improve error handling, and ensure graceful degradation.

## Phase 1.1: Error Boundary & Recovery
- [ ] Add global error boundary in main scene boot
- [ ] Implement recovery mechanism for corrupted IndexedDB
- [ ] Add fallback curriculum bundle validation
- [ ] Graceful handling of missing assets

## Phase 1.2: Security Hardening
- [ ] Sanitize all user-facing strings (XSS prevention)
- [ ] Validate all curriculum data at runtime
- [ ] Remove any debug console logs in production
- [ ] Secure localStorage access patterns

## Phase 1.3: Input Validation
- [ ] Validate all drag/drop coordinates
- [ ] Bounds check for numeric inputs
- [ ] Type guards for all validator inputs
- [ ] Sanitize student ID formats

## Phase 1.4: Observability Fixes
- [ ] Ensure error reporter doesn't fire unless explicitly enabled
- [ ] Add structured logging with request IDs
- [ ] Verify no data egress in default builds
- [ ] Check memory leak patterns

## Success Criteria
- All error paths tested and logged
- No console.error in production bundle without error reporter enabled
- Recovery from network/DB failures verified
- Zero security warnings in audits
