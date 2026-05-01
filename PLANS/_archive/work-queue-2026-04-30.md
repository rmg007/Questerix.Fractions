# Work Queue — 2026-04-30

**Status:** Active  
**Last updated:** 2026-04-30  
**Owner:** solo (agent-driven)  
**Scope:** Everything remaining after the agent-harness sessions (rounds 1–6). Ordered by impact.

---

## Context

Agent harness is complete (CLAUDE.md, 9 slash commands, 4 subagents, 8 nested CLAUDE.mds, hooks, learnings, doctor). The game does not yet complete a 5-question session end-to-end. Sprint 0 exit criteria unmet. This plan covers all remaining actionable work, ordered by impact on validation.

Cross-reference: `harden-and-polish-2026-04-30.md` covers 48 deeper bugs found in the full audit. This plan covers the subset that must ship before Cycle A playtesting.

---

## Priority 1 — Bundle: OTel + Sentry Lazy Imports

**Why first:** 50–100 KB gzip reduction. Serves C10 (no bundle bloat that doesn't help validation). Clean, bounded, no UX risk.

**Problem:** `tracer.ts` and `errorReporter.ts` have top-level static imports of 8 `@opentelemetry/*` packages and `@sentry/browser`. Vite bundles all of them even though both are env-gated (`VITE_OTLP_URL`, `dsn`) and inactive in default MVP builds.

**Approach:** Convert static package imports to dynamic `import()` inside `init()`. Keep `@opentelemetry/api` static (tiny API shim, needed for noop tracer fallback). `init()` becomes `async` — callers already fire-and-forget it.

**Files to change:**

| File | Change |
|------|--------|
| `src/lib/observability/tracer.ts` | Remove 7 static OTel SDK imports; dynamic-import inside `_doInit()`. Keep `@opentelemetry/api`. |
| `src/lib/observability/errorReporter.ts` | Remove `import * as Sentry from '@sentry/browser'`; dynamic-import inside `init()`. Store module ref. |
| `src/lib/observability/index.ts` | Mark `initObservability()` as `async`; update internal calls. |

**No changes needed:**
- `src/main.ts` — calls `initObservability()` without await (already fire-and-forget in a try/catch)
- `src/persistence/middleware.ts` — calls `tracerService.startSpan()` synchronously; noop fallback handles uninitialized state
- `src/lib/observability/meter.ts` — uses `web-vitals` (small, keep static)
- `src/lib/observability/syncService.ts` — no heavy deps, leave as-is

**Implementation steps:**

1. Rewrite `tracer.ts`:
   - Add `private initialized = false` guard (replaces `provider` reference)
   - `init(): Promise<void>` — returns early if `!VITE_OTLP_URL && !DEV` (Vite tree-shakes this branch in prod builds)
   - `_doInit()` — parallel `Promise.all([import('@opentelemetry/sdk-trace-web'), ...])` for base packages; conditional `import('@opentelemetry/exporter-trace-otlp-http')` only when `VITE_OTLP_URL` is set

2. Rewrite `errorReporter.ts`:
   - Remove static Sentry import
   - Add `private sentry: typeof import('@sentry/browser') | null = null`
   - `init(): Promise<void>` — returns early if no `config.dsn`; else dynamic-imports Sentry, stores module ref, calls `Sentry.init()`
   - Update `setContext()`, `report()`, `leaveBreadcrumb()` to use `this.sentry` guard

3. Update `index.ts`:
   - `initObservability()` becomes `async`
   - Awaits `errorReporter.init()` and `tracerService.init()` via `Promise.allSettled()` (errors must not block boot)

**Test plan:**
```bash
npm run typecheck          # strict — no any regressions
npm run build              # must succeed
npm run measure-bundle     # verify reduction vs current baseline
npm run test:unit          # observability logger tests must pass
```

**Done when:** `npm run measure-bundle` shows reduction ≥ 30 KB gzip vs pre-change baseline.

**Rollback:** `git revert` — self-contained, no DB or curriculum changes.

---

## Priority 2 — Sprint 0 Bugs (Game Loop Broken)

Exit criteria: student completes a 5-question session at `localhost:5000` in a real browser tab.

### BUG-01 — Wrong prompt on partition scene (2 min)
**File:** `src/scenes/Level01Scene.ts`  
**Symptom:** "identify" archetype prompt shown on a "partition" scene.  
**Fix:** Find the hardcoded prompt string; replace with the partition archetype's prompt from the `QuestionTemplate`.  
**Test:** Load L1, verify prompt matches the activity type shown.

### BUG-02 — Validation never passes, 0/5 forever (~30 min)
**File:** `src/scenes/Level01Scene.ts`  
**Symptom:** No answer ever registers as correct; progress counter stuck.  
**Approach:**
1. Find the `onCommit` handler and trace the payload to `validatorRegistry.get(validatorId)`
2. Verify `validatorId` on the template matches a registered key in `registry.ts`
3. Verify the `input` shape matches what the validator expects (`PartitionInput`, etc.)
4. Check `ValidatorResult.outcome === 'correct'` is actually read and increments the counter  

**Test:** `npm run test:unit -- --filter validators`; then manual smoke test — submit correct answer, verify counter increments.

### BUG-04 — Hint tiers stuck at Tier 1 (15 min)
**File:** `src/scenes/Level01Scene.ts`  
**Symptom:** Requesting a hint always shows Tier 1 (verbal) regardless of how many times it's been requested.  
**Fix:** A new `HintLadder` instance is likely being created per hint request instead of per question. Find the instantiation and move it to question-init scope.  
**Test:** Submit wrong answers 3× for the same question, verify tier advances.

### G-E1 — BKT `updateMastery()` never called (Sprint 1)
**File:** `src/scenes/Level01Scene.ts` → `src/engine/bkt.ts`  
**Symptom:** Zero learning signal — no mastery state changes.  
**Fix:** After each attempt's `ValidatorResult`, call `updateMastery(prior, outcome === 'correct')` and persist the updated `SkillMastery` row.  
**Test:** Unit test verifying mastery increases after correct attempt, decreases after wrong.

### G-C7 — "Keep going" loops L1 instead of advancing (30 min)
**File:** `src/scenes/LevelScene.ts`  
**Symptom:** Session-complete overlay "Keep going" button restarts L1.  
**Fix:** After session complete, look up the next level number from `LEVEL_META` and route to `LevelScene` with the incremented level config. Verify `unlockedLevels` is updated.  
**Test:** Complete L1 session, verify L2 loads.

---

## Priority 3 — CI / Infra Quick Wins (< 1 hour total)

### 3a. Add `npm run agent-doctor` to CI
**File:** `.github/workflows/ci.yml`  
**Change:** Add a step after "Install dependencies":
```yaml
- name: Agent harness health check
  run: npm run agent-doctor
```
**Why:** Harness integrity should be a gate, not just a manual check.

### 3b. Lighthouse workflow Node version
**File:** `.github/workflows/lighthouse.yml`  
**Change:** `node-version: '20'` → `node-version: '24'`; remove `--legacy-peer-deps` (the project already has `legacy-peer-deps=true` in `.npmrc`).

### 3c. CHANGELOG update
**File:** `CHANGELOG.md`  
**Change:** Append all rounds 1–6 work to `[Unreleased]`. Categories: Added (harness), Changed (README, settings), Removed (CONTRIBUTING.md, stale reports).

### 3d. Decision log entry D-21
**File:** `docs/00-foundation/decision-log.md`  
**Change:** `/decision "Adopt committed CLAUDE.md agent harness"` — document that the autonomous agent system (CLAUDE.md, nested guides, hooks, slash commands, subagents) is the canonical onboarding mechanism going forward.

---

## Priority 4 — C5 Violation Fix (Dexie migration)

**Also tracked in:** `harden-and-polish-2026-04-30.md` R13  
**Files:** `src/scenes/MenuScene.ts:348–384`, `src/scenes/LevelMapScene.ts:331–349`  
**Symptom:** `unlockedLevels:<studentId>` and `completedLevels:<studentId>` written to localStorage; violates C5 (localStorage = `lastUsedStudentId` only).  
**Fix:**
1. Add `progressionStat` table to `src/persistence/db.ts` (bump schema version)
2. Create `src/persistence/repositories/progressionStat.ts` with `get(studentId)` / `set(studentId, data)`
3. Replace `localStorage.setItem('unlockedLevels:...')` calls with repo writes
4. Replace `localStorage.getItem` reads with repo reads (note: now async — scenes must await)
5. Remove the localStorage keys after migration

**Test:** `npm run test:integration`; manual: complete a level, refresh, verify unlock state persists.

---

## Sequencing

```
P1 (bundle trim)      → P3a+3b (CI)    → commit
P2 (BUG-01)          → P2 (BUG-02)    → P2 (BUG-04) → manual smoke test → commit
P3c+3d (docs)        → commit
P2 (G-C7)            → P2 (G-E1)      → commit
P4 (C5 fix)          → commit
```

P1 is self-contained. P2 items cascade (fixing BUG-02 may reveal G-E1 wiring opportunity).  
P4 is last — it touches persistence and needs integration tests to be solid first.

---

## Gate: Sprint 0 Exit

- [ ] `npm run preflight` clean (typecheck, lint, test:unit, build, bundle guard)
- [ ] Bundle reduced ≥ 30 KB gzip from P1
- [ ] BUG-01, BUG-02, BUG-04 fixed — manual smoke test passes
- [ ] Student completes 5-question session in Chromium at `localhost:5000`
- [ ] CHANGELOG updated
- [ ] `npm run agent-doctor` in CI green

**Once gate passes:** proceed to G-E1 + G-C7 (Sprint 1 entry), then `harden-and-polish-2026-04-30.md` backlog.
