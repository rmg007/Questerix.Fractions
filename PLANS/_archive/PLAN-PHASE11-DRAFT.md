# Phase 11 — Observability & Security Hardening

**Goal:** No PII in logs, no endpoint injection, telemetry guarded by env var.

**Entry gate:** Phase 8 accessibility tests pass + `npm run typecheck && npm run lint` clean.

**Exit gate:** 
- `npm run test:unit observability/*` passes with 100% coverage of new code
- Simulated logger output has no raw UUIDs or sensitive data (UUID masking verified)
- CSP review clean (no new eval, dynamic endpoints)
- Curriculum loader rejects malformed VITE_TELEMETRY_URL + invalid origins
- All 8 work items verified via spot-check in PR

**Risk:** LOW — all changes are additive guards + refactors in isolation; no business logic changes.

---

## Phase 11.1 — PII Masking & Data Redaction

**Files:** `src/lib/observability/{logger,errorReporter,syncService}.ts`, `src/main.ts`

**Work items:**
1. **UUID masking (logger.ts:90)** — pseudonymize UUIDs in error stacks before persist
   - Extract/export FNV-1a pseudonymizer from errorReporter → shared utility
   - At line 90, when buffering `options.error.stack`, scan for UUID patterns and replace with 8-char hex hash
   - Unit test: verify stack containing `550e8400-e29b-41d4-a716-446655440000` becomes `12345678` (stable)

2. **Pseudonymize deduplication (syncService.ts)** — reuse exported FNV-1a
   - Remove duplicate `pseudonymize()` function from syncService
   - Import from shared utility
   - No logic change; purely DRY

3. **Sentry DSN PII (errorReporter.ts:27)** — add 'sentry_dsn' to PII_KEYS
   - Add `'sentry_dsn'` to the `PII_KEYS` Set
   - Verify `stripPII()` removes it from caller context

4. **Error banner truncation (main.ts:29)** — cap error.message to 200 chars + max-height
   - At line 24, cap `error.message` to 200 chars: `error.message.slice(0, 200) + (error.message.length > 200 ? '…' : '')`
   - Add `max-height: 300px; overflow-y: auto;` to message div style (line 25)
   - Rationale: prevents long error stacks from freezing the UI or leaking PII to user-facing DOM

**Sub-phase gate:**
- Unit tests for UUID masking + FNV-1a stability
- Sentry stripPII integration test with 'sentry_dsn' present in context
- Error banner tests (length cap + overflow)
- No raw student/session IDs in simulated logger output

**Estimated:** 2–3 hours (4 small, isolated changes)

---

## Phase 11.2 — Endpoint Security & SSRF Prevention

**Files:** `src/lib/observability/syncService.ts`, `src/curriculum/loader.ts`

**Work items:**

5. **Endpoint URL validation (syncService.ts:83)** — parse VITE_TELEMETRY_URL once at init, reject if malformed
   - Add `private parsedUrl: URL | null = null` field
   - In `init()`, parse `import.meta.env.VITE_TELEMETRY_URL` via `new URL(raw)` in try/catch
   - If parse fails or URL is not https://, set `parsedUrl = null` and log warning
   - In `flushEvents()`, use `parsedUrl` instead of raw env var
   - Reject if `!parsedUrl`
   - Unit test: verify malformed URLs (no protocol, file://, javascript://) are rejected; valid https:// are accepted

6. **Curriculum loader SSRF (loader.ts:240)** — enforce origin check when fetching
   - At fetch time, compare fetched response's origin against expected origin (or allowlist)
   - If mismatch, emit failure with reason 'ssrf_rejection' and return fallback
   - Unit test: mock fetch returning response with wrong origin header, verify rejection

**Sub-phase gate:**
- URL parser unit tests (malformed, unsafe protocols rejected)
- SSRF rejection test (cross-origin fetch blocked)
- `npm run typecheck` clean (URL type compatibility)

**Estimated:** 1.5–2 hours (2 medium changes with parsing + validation logic)

---

## Phase 11.3 — Observability Resilience & Build-Time Cleanup

**Files:** `src/lib/observability/{withSpan,tracer}.ts`

**Work items:**

7. **withSpan resilience (withSpan.ts:34)** — wrap tracerService.startSpan() in try/catch with no-op fallback
   - Create `function noOpSpan()` returning `{ end(): void {}, setStatus(): void {} }`
   - At line 34, wrap `tracerService.startSpan()` in try/catch
   - On error, log warning (dev mode only) and return noOpSpan
   - Rationale: if tracer service is broken, don't crash the scene; fall through gracefully
   - Unit test: verify withSpan/withSpanSync complete even if startSpan throws

8. **Build-time gate redundancy (tracer.ts:37)** — clean up duplicate checks
   - Lines 33 and 42 both check `!import.meta.env.VITE_OTLP_URL && !import.meta.env.DEV`
   - Consolidate: remove line 42 check (already gated at line 33)
   - Verify Rolldown still DCE-s the SDK chunks in builds without env vars

**Sub-phase gate:**
- withSpan unit test (startSpan throws → no-op used, no crash)
- Rolldown treeshake verification: confirm SDK chunks absent in prod build without VITE_OTLP_URL
- `npm run typecheck && npm run lint` clean

**Estimated:** 1–1.5 hours (2 small resilience + refactoring changes)

---

## Integration gate (all phases)

```bash
npm run typecheck
npm run lint:fix && npm run lint
npm run test:unit observability/*
npm run build:curriculum  # confirm unchanged
npm run build && npm run measure-bundle  # confirm under 1 MB gzipped
```

**Spot checks before PR:**
1. Search logs for raw UUID patterns — zero matches
2. Verify Sentry DSN not logged if VITE_SENTRY_DSN is set
3. Curl invalid endpoint URL → verify rejection in browser console
4. Simulate network error in withSpan → verify graceful fallback
5. Check `dist/index.*.js.gz` size — confirm no SDK bloat

---

## PR + merge strategy

- Single PR, squash merge to `main`
- Title: `fix(phase-11): observability hardening - PII masking, endpoint validation, resilience`
- Branch: `fix/2026-05-03-observability-hardening` (date-stamped per git-workflow.md)
- No version bump (internal hardening, no user-facing change)

---

## Follow-ons (post-Phase 11)

- **Phase 12:** CPU/latency profiling in dev mode (withSpan metrics collection)
- **Phase 13:** Full curriculum migration to Dexie (remove localStorage unlockedLevels/completedLevels per C5 note)
