# Codex Audit Fixes — Questerix.Fractions

**Date:** 2026-05-03  
**Scope:** Implement all findings from `codex.audit.md`  
**Approach:** Phased rollout, High → Medium → Low, with atomic per-finding PRs or bundled domain groups.

---

## Phase 1: Critical High Findings (Days 1–3)

**Gate:** All High findings resolved, typecheck + test + build green, security-review + a11y-auditor pass.

### Phase 1a: Egress Constraint (C1)
- **[High] Observability Egress** (`src/lib/observability/index.ts:41`) — Remove telemetry network sync from MVP, or hard-disable `telemetrySyncService.init()` on default builds.
  - Remove `telemetrySyncService` from non-env-gated builds
  - Keep telemetry local-only in IndexedDB
  - Verify `npm run build` does NOT POST to `VITE_TELEMETRY_URL`
  - Test: check no network requests in smoke test

### Phase 1b: XSS Mitigation
- **[High] DOM XSS in Error Banner** (`src/main.ts:23`) — Replace `innerHTML` with `textContent`/DOM nodes.
  - Rewrite fatal error banner to use DOM APIs instead of string interpolation
  - Test: malformed curriculum/backup payload with script tags does not render script

### Phase 1c: Persistence Data Loss Prevention
- **[High] Backup/Restore Missing Tables** (`src/persistence/backup.ts:31`) — Add `levelProgression`, `streakRecord`, `telemetryEvents` to backup envelope.
  - Update `BackupEnvelope` type to include new stores
  - Add Zod validation for new fields (bounded ranges, branded-id regexes)
  - Update restore transaction to write all tables
  - Test: round-trip backup/restore preserves unlock/completion/streak state

- **[High] Migration Data Loss (hintEvents)** (`src/persistence/db.ts:350`) — Migrate hint events instead of dropping.
  - Change v8 migration: keep `hintEvents` but mark pending (`attemptId: null`)
  - Add v9 migration: link pending hints to actual attempts
  - Test: hint telemetry survives v7→v9 migration

### Phase 1d: Audio Preference Gate
- **[High] TTS Ignore Preference in OnboardingScene** (`src/scenes/OnboardingScene.ts:33`) — Call `tts.setEnabled()` before any narration.
  - Centralize TTS enablement in boot or scene-entry handler
  - Load `deviceMeta.preferences.ttsEnabled` before OnboardingScene renders
  - Test: disable TTS, re-enter onboarding, verify no speech output

### Phase 1e: Hint Event Integrity & Linking
- **[High] Hint Events Detached from Attempts (Levels 2–9)** (`src/lib/levelSceneHintFlow.ts:144`) — Replace empty `attemptId` with `null` and link inside attempt transaction.
  - Change hintEvent schema: `attemptId?: AttemptId`
  - Record hints with `attemptId: null` until attempt persists
  - Link hints in same transaction that persists attempt
  - Test: L2–L9 hint telemetry rows have valid `attemptId` after close

### Phase 1f: Session Close Race Condition
- **[High] Close Race Before Durability** (`src/lib/levelSceneSessionComplete.ts:89`) — Await session close before overlay navigation.
  - Make `callbacks.closeSession()` return a Promise
  - Disable overlay buttons until close settles
  - Test: save session state, force slow IndexedDB, verify state durability before scene transition

### Phase 1g: Legacy Level 1 Route Regression
- **[High] Play Again Re-enters Level01Scene** (`src/lib/level01SessionComplete.ts:103`) — Route to `LevelScene { levelNumber: 1 }` instead.
  - Verify L1 metadata/templates are in `levelMeta.ts`
  - Change Play Again route from `Level01Scene` to generic `LevelScene`
  - Remove one-off L1 session complete handler if generic path covers it
  - Test: L1 Play Again follows same state/session logic as L2–L9

### Phase 1h: Atomicity in Transaction Boundaries
- **[High] Mastery Write Swallows Errors** (`src/persistence/repositories/skillMastery.ts:25`) — Return explicit result, never silent failures.
  - Change `upsert()` to return `{ ok: true } | { ok: false, error }`
  - Update callers to check result before proceeding
  - Test: transaction aborts if mastery write fails

---

## Phase 2: TypeScript Strictness & Safety (Days 4–6)

**Gate:** All `any` casts replaced, `tsconfig strict` passes, type safety maintained across scene helpers.

### Phase 2a: Core Helper Interfaces
- **[Medium] Mascot Interface** — Create `MascotInterface` from `Mascot.setState()` contract.
  - Extract method signatures from `src/components/Mascot.ts`
  - Replace `mascot: any` in `levelSceneHintFlow`, `levelSceneOutcomeFlow`, `levelSceneQuestionFlow`, `level01SessionComplete`
  - Replace casts in `LevelScene.ts:319, 451, 641, 665`

- **[Medium] Interaction Interface** — Create `InteractionInterface` from active interaction contract.
  - Extract `commit()`, `canCommit()`, any state method signatures
  - Replace `activeInteraction: any` in helpers and `LevelScene.ts:643, 667`

- **[Medium] Sentry & OpenTelemetry Types** — Import from package type definitions.
  - `src/lib/observability/errorReporter.ts`: use `typeof import('@sentry/browser')`
  - `src/lib/observability/tracer.ts`: use `SpanProcessor[]` from `@opentelemetry/api`
  - Replace `Record<string, any>` with `Record<string, unknown>`

- **[Medium] Window Augmentation** — Add global type for `__LOG` and debug window.
  - Declare `declare global { interface Window { __LOG?: LogViewer } }`
  - Replace `window as any` in `log.ts:258`, `logViewer.ts:175`

- **[Medium] Validator Registry** — Replace `ValidatorRegistration<any, any>` with discriminated union.
  - Change from heterogeneous array to typed registration helpers
  - Use `ValidatorRegistration<unknown, unknown>` as fallback
  - Add runtime typeguards to dispatch

### Phase 2b: Branded ID Fixes
- **[Low] "No Attempt Yet" as `null` instead of empty string** — Change hint/attempt ID model.
  - Update schema and callers: `attemptId?: AttemptId` (not fake `'' as unknown as AttemptId`)
  - Test: `levelSceneHintFlow.ts:144`, `Level01SceneHintSystem.ts:118`

- **[Medium] Attempt ID Consistency** — Choose one primary-key strategy: either numeric auto-increment or UUID.
  - If staying numeric: add separate `attemptUuid` field, use UUID in logs
  - If switching to UUID: update schema and all callers
  - Test: `attemptRepo.get()` correctly retrieves by whatever key type is chosen

---

## Phase 3: Persistence Safety & Validation (Days 7–8)

**Gate:** All persistence boundaries validated, no silent failures, backup/restore integrity confirmed.

### Phase 3a: Backup Schema Hardening
- **[Medium] Unbounded Backup Strings** (`src/persistence/schemas.ts:22`) — Add `.trim()`, `.max()`, UUID/ID regexes, range checks.
  - Audit all Zod field types in backup schemas
  - Add constraints: display name max 256, IDs must match UUID regex, nonnegative integers with ranges
  - Test: malformed backup JSON rejects oversized/invalid fields

### Phase 3b: LevelProgression Validation
- **[Medium] Upsert Without Validation** (`src/persistence/repositories/levelProgression.ts:34`) — Add boundary validator.
  - Add Zod schema for `LevelProgression` writes
  - Validate level ranges (1–9), no duplicates, sorted order, syncState enum
  - Test: invalid writes reject before DB call

### Phase 3c: Error Handling in Persistence
- **[Medium] Silent Failure in LevelProgression** (`src/persistence/repositories/levelProgression.ts:33`) — Return result object.
  - Change `upsert()` signature to return `Promise<Result<LevelProgression, Error>>`
  - Update scenes to handle result and show volatile-mode messaging on failure
  - Test: display message when save fails due to quota

---

## Phase 4: Validators & Parity (Days 9–10)

**Gate:** Python parity fixtures added, unused validators documented or removed, validation contract consistent.

### Phase 4a: Python Parity Clones
- **[Medium] Missing Python Validators** — Add Python clones for TS-only variants.
  - `explain_your_order.sequence` → add to `pipeline/validators_py.py`
  - `order.acceptableOrders` + `order.withRuleExplanation` → add to Python
  - `placement.snapTolerance` → rename Python to match or add alias
  - Add fixtures for each new variant
  - Test: `validator-parity-checker` passes

### Phase 4b: Unused Validator Cleanup
- **[Low] Unused Variants** — Document or remove 7 unused TS validators.
  - Create decision log entry: keep as "reserved for future curriculum" or remove?
  - If removing: delete from registry + tests
  - Test: curriculum load does not reference removed validators

### Phase 4c: Validator Result Contract
- **[Medium] Inconsistent Feedback Field** — Make contract consistent: `isCorrect`, `feedback`, `misconceptions`.
  - Decide: update spec to match implementation or update implementation to match spec?
  - If spec: document that `feedback` is optional
  - If implementation: make `feedback` mandatory, add `isCorrect` adapter
  - Test: all validators return consistent shape

---

## Phase 5: Accessibility & A11yLayer (Days 11–12)

**Gate:** A11y-auditor passes, interaction submit buttons mirrored, reduced-motion guards consistent.

### Phase 5a: Interaction Canvas Controls
- **[Medium] Unmirrored Interaction Controls** (`src/scenes/interactions/*.ts`) — Add A11yLayer for all archetype choices.
  - Audit `BenchmarkInteraction`, `CompareInteraction`, `EqualOrNotInteraction`, `ExplainYourOrderInteraction`, `MakeInteraction`, `OrderInteraction`, `SnapMatchInteraction`
  - Add `A11yLayer.pushAction()` for each answer choice / drag option
  - Test: `npm run test:a11y` finds no axe violations for interaction controls

### Phase 5b: A11yLayer Lifecycle
- **[Medium] Layer Accumulation** (`src/components/A11yLayer.ts:108`) — Wire scene shutdown to `resetAll()`.
  - Add shutdown handler to each scene that calls `A11yLayer.resetAll()`
  - Or introduce scene-scoped layer stack ownership
  - Test: layer DOM container is clean after scene transition

### Phase 5c: Reduced-Motion Guards
- **[Medium] Unguarded Feedback Animations** (`src/components/FeedbackAnimations.ts:24`) — Make helpers private or add guard.
  - Either move to private exports or add `checkReduceMotion()` guard at boundary
  - Audit `LevelVignette.ts:342` helper methods: ensure all tweens are gated
  - Test: `prefers-reduced-motion: reduce` disables all tweens

### Phase 5d: Pointer Cancellation
- **[Medium] Missing Drag Cleanup** (`src/scenes/interactions/LabelInteraction.ts:95`) — Add `pointerupoutside` / `pointercancel` handlers.
  - Add cleanup for `pointercancel`, `pointerupoutside`, scene shutdown, object destroy
  - Restore drag state on cancel
  - Test: cancel mid-drag restores UI state

---

## Phase 6: Engine & Router Clarity (Day 13)

**Gate:** Dead code parked or removed, misconception rules non-overlapping, determinism verified.

### Phase 6a: Router Dead Code
- **[Medium] Unused `decideNextLevel()`** (`src/engine/router.ts:52`) — Park or remove per D-26.
  - If removal: delete function, update tests
  - If advisory: add docs explaining why it's unreachable
  - Update decision log to reference D-26
  - Test: removal does not break any call sites

### Phase 6b: Misconception Rule Deduplication
- **[Medium] Duplicate MC-WHB-01 / MC-NOM-01** (`src/engine/misconceptionRules.ts:160, 222`) — Differentiate rules.
  - Add numerator-bias vs magnitude checks to distinguish cases
  - Or merge if truly duplicate
  - Test: single student response maps to exactly one misconception flag

- **[Medium] Overlapping EOL Rules** (`src/engine/misconceptionRules.ts:247, 269`) — Make mutually exclusive.
  - Add correct-answer or payload guards so only one EOL rule fires
  - Test: coverage of all answer combinations (true/false × correct/incorrect)

### Phase 6c: Observability Determinism
- **[Medium] Random Ring Buffer Trim** (`src/lib/observability/logger.ts:110`) — Trim deterministically.
  - Replace `Math.random()` with count-based threshold
  - Test: telemetry ring buffer is deterministically sized

---

## Phase 7: Curriculum & Boot Resilience (Day 14)

**Gate:** Curriculum loader has fallback, boot shows progress, bundle hygiene confirmed.

### Phase 7a: Curriculum Loader Fallback
- **[Medium] Silent Degradation on Parse Errors** (`src/curriculum/loader.ts:272`) — Fall back to bundled curriculum.
  - Change non-`TypeError` failures to also fall back to `bundle.json`
  - Test: malformed `/curriculum/v1.json` loads bundled fallback

### Phase 7b: Boot Progress & Async Gating
- **[Medium] Blocking Persistence in Boot** (`src/scenes/BootScene.ts:47`) — Show progress state, defer non-critical setup.
  - Add boot progress UI (spinner/text)
  - Defer non-critical async (telemetry grant, student lookup)
  - Critical path: curriculum seed, student state
  - Test: boot completes in <2s on slow IndexedDB

### Phase 7c: Bundle & Dependency Hygiene
- **[Low] Non-core MVP Observability** (`package.json:83`) — Keep observability lazy & env-gated.
  - Verify OpenTelemetry, Sentry, `web-vitals`, Workbox are not imported unless env vars set
  - Test: `npm run build` without env vars does not include observability code

---

## Phase 8: Code Cleanup & Polish (Day 15)

**Gate:** All findings resolved, lint + typecheck + test + bundle green.

### Phase 8a: Duplicate Imports & Minor Hygiene
- **[Low] Duplicate `quest` Import** (`src/main.ts:3, 10`) — Remove one
- **[Low] `LevelVignette` `max-lines` Bypass** (`src/components/LevelVignette.ts:1`) — Remove or split component

### Phase 8b: Schema Consistency & Comments
- **[Low] Version 9 Schema Style** (`src/persistence/db.ts:384`) — Add clarifying comment
- **[Low] i18n Copy Migration** (`src/scenes/OnboardingScene.ts:113`) — Migrate hardcoded strings to `catalog.get()`

### Phase 8c: Type Casts: Lower-Priority
- **[Low] Destroyable Union** (`src/components/LevelVignette.ts:249`) — Use typed helper
- **[Low] Mascot sleepGfx Type** (`src/components/Mascot.ts:380, 439`) — Type properly at creation
- **[Low] Star Collection Type** (`src/lib/levelSceneChrome.ts:139`) — Type array creation
- **[Low] Detector Output Type** (`src/lib/levelSceneSession.ts:180`) — Type detector or normalize before storage
- **[Low] QuestionTemplate Storage Type** (`src/persistence/repositories/questionTemplate.ts:32`) — Use stored-template type
- **[Low] Backup Zod Type Alignment** (`src/persistence/backup.ts:145`) — Align Zod-inferred with runtime type

---

## Rollout Checklist

After each phase:
- [ ] `npm run typecheck` (0 errors)
- [ ] `npm run lint` (0 warnings)
- [ ] `npm run test:unit` (all pass)
- [ ] `npm run test:a11y` (all pass) — Phase 5 onwards
- [ ] `npm run build` (succeeds, no warnings)
- [ ] `npm run measure-bundle` (≤1 MB gzipped)
- [ ] Run `security-review` skill (no new issues)
- [ ] Run `a11y-auditor` subagent (no new issues) — Phase 5 onwards
- [ ] Run `validator-parity-checker` (fixtures match) — Phase 4 onwards
- [ ] Open PR, squash-merge after approval

---

## Success Criteria

**Phase 1–8 complete** = `codex.audit.md` shows **zero** High/Medium/Low findings, all 25+ `any` casts resolved, `tsconfig strict` clean, and bundle/test/a11y all green.
