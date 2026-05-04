# Codex Full-Spectrum Fix, Harden, and Enhance Findings

Date: 2026-05-03
Status: planning / findings
Scope: Questerix.Fractions full codebase, reconciled from `CLAUDE.md`, `docs/00-foundation/constraints.md`, existing audit reports, and live static scans.

Audit snapshot (update when code changes):
- Branch: `fix/2026-05-03-finish-fsh-cleanup`
- Commit: `bd62ba4`

## Ground Rules

- Read `CLAUDE.md` and `docs/00-foundation/constraints.md` before implementation. This file assumes those rules are binding.
- C1-C10 are locked. No backend, no external data egress, no new framework, no new meaningful `localStorage` surface.
- Branch format for implementation: `fix/YYYY-MM-DD-<slug>`.
- Command note (PowerShell): if `npm run ...` fails due to shell profile wrappers, use `npm.cmd run ...` instead (confirmed working in this environment).
- Each implementation group must be independently green before the next group starts:
  - `npm.cmd run typecheck`
  - `npm.cmd run test:unit`
- Completion gate before PR:
  - `npm.cmd run typecheck`
  - `npm.cmd run lint`
  - `npm.cmd run test:unit`
  - `npm.cmd run test:e2e`
  - `npm.cmd run measure-bundle`
  - `npm.cmd run validate:curriculum`
- `rg` was unavailable in this Codex session due a Windows app execution permission error, so live scans used PowerShell `Select-String`.

## Decision Register

These are the “pick one” decisions that unblock large portions of the plan. Without explicit choices here, later phases risk churn, rewrites, or schema drift.

- DR-01 (P0): **AttemptId primary key strategy**
  - Option A: Attempt rows use UUID string PK (`attempts: 'id, ...'`), AttemptId is a true UUID everywhere (types/repos/tests/migrations).
  - Option B: Attempt rows use numeric auto-increment PK (`attempts: '++id, ...'`), AttemptId is numeric-string everywhere; add a separate `attemptUuid` field only if correlation is needed.
  - Affects: `src/types/branded.ts`, `src/types/runtime.ts`, `src/persistence/db.ts`, `src/persistence/repositories/attempt.ts`, `tests/unit/persistence/attempt.test.ts`, hint linking, session recording.

- DR-02 (P0): **HintTier / HintEvent.tier representation**
  - Option A: `HintTier` is string union only (`'verbal' | 'visual_overlay' | 'worked_example'`) everywhere (runtime, persisted rows, backup schemas, fixtures).
  - Option B: Persist tier as numeric `1|2|3` and introduce a separate field for string label (or map at boundaries), with one canonical “storage form”.
  - Affects: `src/types/hint.ts`, `src/types/runtime.ts`, `src/persistence/schemas.ts`, `tests/unit/persistence/hintEvent.test.ts`, hint flows.

- DR-03 (P0): **hintEvents primary key + migration safety stance**
  - Decide whether preserving historical hintEvents across the v8→v9 primary-key change is mandatory (“no silent loss”) or best-effort acceptable.
  - If mandatory: migrations must not swallow failures; add explicit restore verification tests.
  - Affects: `src/persistence/db.ts` v8/v9 upgrade logic and tests.

- DR-04 (P0/C1): **Telemetry egress policy for MVP**
  - Option A: No network telemetry at all until constraints change (disable sync service even if env var is set).
  - Option B: Allow egress only when env vars are explicitly configured (current shape), and add a test asserting no `fetch` when unset.
  - Affects: `src/lib/observability/index.ts`, `src/lib/observability/syncService.ts`, C1 audits/tests.

- DR-05 (P1): **Validator result contract**
  - Decide whether to (a) change the core validator return type to `{ isCorrect, feedback, misconception? }`, or (b) keep current `ValidatorResult` and adapt at boundaries.
  - Affects: scenes, validators, fixtures, Python parity.

- DR-06 (P1/C5): **Legacy localStorage reads**
  - Decide whether `deviceMetaRepo.readLegacyOnboardingFlag()` remains allowed as “migration-only legacy read” or must be removed entirely from runtime code paths.
  - Affects: `src/persistence/repositories/deviceMeta.ts`, C5 checks, migration documentation.

## Contract Matrix (Single Source Of Truth Checklist)

Use this matrix during implementation to prevent drift between types, Dexie schema, repositories, backup restore schemas, and tests.

| Domain | TypeScript Contract | Dexie Schema Contract | Repo Contract | Backup Restore Contract | Tests That Prove It | Known Drift Today |
|---|---|---|---|---|---|---|
| Attempt ID | `src/types/branded.ts` + `src/types/runtime.ts` | `src/persistence/db.ts` (attempts store) | `src/persistence/repositories/attempt.ts` | `src/persistence/schemas.ts` attemptSchema | `tests/unit/persistence/attempt.test.ts` | UUID vs `++id` mismatch |
| Hint tier | `src/types/hint.ts` + `src/types/runtime.ts` | `src/persistence/db.ts` (hintEvents store) | `src/persistence/repositories/hintEvent.ts` | `src/persistence/schemas.ts` hintEventSchema | `tests/unit/persistence/hintEvent.test.ts` | string vs numeric tier mismatch |
| Hint link | `HintEvent.attemptId?: AttemptId` | hintEvents index on `attemptId` | `hintEventRepo.linkToAttempt()` | schema must allow pending/unlinked rows | needs a linking test | generic hint flow uses fake attemptId |
| Telemetry egress | env-gated no-op | n/a | sync service `fetch` | n/a | a “no fetch when unset” test | C1 policy decision pending |

## Phase Execution Template (No Surprises)

For every phase below, enforce this structure in commits/PR descriptions (even if you bundle multiple micro-fixes):

- Entry criteria: clean `npm.cmd run typecheck` and `npm.cmd run test:unit`
- Change budget: one domain per commit group (types vs persistence vs scenes, etc.)
- Exit criteria: the same commands green, plus any phase-specific tests
- Evidence: include the exact command outputs/links in `PLANS/codex.full.md` or PR description (no “it should work”)

## Current Baseline Findings

Code changes quickly and older audit artifacts may be renamed or removed. Treat this file as the living “plan of record”; when code changes, update the audit snapshot at the top and refresh any “confirmed” bullets below by re-running scans.

### Working Tree Reality Check (Important)

This section must be updated whenever the code changes. It exists to prevent the plan from talking about a different tree than the one you are actually on.

Record current state here:

- `git status --short --branch`:
- `npm.cmd run typecheck`:
- `npm.cmd run test:unit`:

Confirmed live findings:

- Fatal error banner: ensure `src/main.ts` never uses `innerHTML` for error rendering; use DOM nodes + `textContent` and avoid rendering `error.stack`.
- `src/curriculum/seed.ts:202`, `src/lib/observability/errorReporter.ts`, `src/lib/observability/tracer.ts`, `src/lib/level01SessionComplete.ts`, `src/lib/levelSceneOutcomeFlow.ts`, `src/lib/levelSceneQuestionFlow.ts`, `src/lib/levelSceneSessionComplete.ts`, `src/lib/log.ts`, `src/lib/logViewer.ts`, and `src/validators/registry.ts` still contain explicit `any` usage.
- `src/lib/levelSceneHintFlow.ts:144` and `src/scenes/Level01SceneHintSystem.ts:118` still create fake pending attempt IDs via `'' as unknown as AttemptId`.
- `src/curriculum/seed.ts:202`, `src/components/LevelVignette.ts:249`, `src/components/Mascot.ts:380`, `src/components/Mascot.ts:439`, `src/lib/levelSceneChrome.ts:139`, `src/lib/levelSceneSession.ts:180`, `src/persistence/backup.ts:145`, and `src/persistence/repositories/questionTemplate.ts:32` still contain `as unknown as` casts.
- `src/lib/observability/logger.ts:110` still uses direct `Math.random()` for local telemetry trimming.
- `src/scenes/Level01SceneSelection.ts:88` still has a fallback `Math.random()` for selection when no injected RNG is supplied.
- `src/persistence/repositories/deviceMeta.ts:47` still reads legacy `questerix.onboardingSeen` from `localStorage`; `src/persistence/db.ts` still has migration-only legacy `localStorage` reads.
- `src/persistence/repositories/levelProgression.ts:34` catches writes and can hide progression save failures.
- `src/persistence/repositories/skillMastery.ts:26` catches writes and can break transaction atomicity when called by session recording.
- Multiple repository write paths still lack explicit try/catch logging and rethrow behavior.
- `src/persistence/schemas.ts` hardening is incomplete: several row schemas are still underconstrained. Also watch for `hintEvents` drift across boundaries (runtime types vs restore schema vs tests), since `npm.cmd run typecheck` excludes `tests/**`.
- `src/lib/levelSceneHintFlow.ts` records generic-level hints with pending/fake attempt IDs, while the generic attempt path needs explicit linking.
- The codebase has broad `setInteractive()`, `tweens.add()`, and `time.delayedCall()` surfaces; several require a11y, reduced-motion, and teardown verification.
- Player-facing strings remain hardcoded in scenes/components; `main.ts` imports the quest i18n key side effect twice.

### Deep Finding: AttemptId Strategy Is Internally Inconsistent

This is the biggest “root mismatch” surfaced in the deeper pass.

- `src/types/branded.ts:41` documents `AttemptId` as a UUID string.
- `src/persistence/db.ts:69-70` defines `attempts` as `++id` (numeric auto-increment PK) and types the table as `Table<Attempt, number>`.
- `tests/unit/persistence/attempt.test.ts:64-66` asserts attempt IDs are *stringified numeric auto-increment* values.
- But runtime attempt/session recording code generates UUID attempt IDs:
  - `src/lib/attemptRecorder.ts:51`
  - `src/lib/levelSceneSession.ts:84`

This inconsistency cascades into:

- Retrieval: `attemptRepo.get()` assumes numeric keys (`Number(id)`) and will not retrieve UUID-keyed rows (`src/persistence/repositories/attempt.ts:34-39`).
- Hint analytics: `hintEventRepo.linkToAttempt()` is called with the UUID attemptId in Level01 flows (`src/lib/attemptRecorder.ts:93-96`), while generic flows write fake attempt IDs and never link (`src/lib/levelSceneHintFlow.ts:140-158`).

This pass needs a single explicit resolution:

1. Switch attempts to UUID PKs (Dexie schema uses `id` not `++id`), update repos + tests.
2. Keep numeric auto-increment PKs, stop generating UUID AttemptIds, and (if needed) add a separate `attemptUuid` field for correlation/logging.

### Deep Finding: HintEvent Tier Shape Likely Mismatched in Backup Schemas

- Runtime `HintTier` is a string union (`src/types/hint.ts:8`).
- `src/persistence/schemas.ts` should validate `HintEvent.tier` as that same string union and allow `attemptId` to be optional until linked.
- Watch for test/fixture drift: `npm.cmd run typecheck` does not include `tests/**`, so Vitest fixtures can silently diverge from runtime types unless you add explicit runtime assertions in tests.

This is a high-likelihood restore correctness risk unless backup-validation fixtures cover real `hintEvents` rows.

Positive baseline checks from prior audit runs that should be preserved:

- `npm.cmd run typecheck` was clean in the prior audit run.
- `npm.cmd run measure-bundle` was under budget at about 488-489 KB gzipped JS.
- Curriculum bundle parity was previously confirmed by SHA256.
- No `@ts-ignore` or `@ts-expect-error` directives were found in `src/**/*.ts` in the prior audit.
- `src/engine/selection.ts` did not contain direct host-global calls in the prior audit.
- Validator files were pure by prior scan: no Phaser imports, Dexie calls, `localStorage`, `fetch`, `Date.now`, or `Math.random`.
- No `eval()` or `new Function()` usage was found in the prior audit.

## Phase 1 - TypeScript Hardening

Gate: no explicit `any`, no unjustified suppression directives, `npm.cmd run typecheck && npm.cmd run test:unit` green.

Findings to fix:

- Replace `ValidatorRegistration<any, any>` in `src/validators/registry.ts` with a typed heterogeneous registry pattern, likely using `unknown` plus type guards or a discriminated registration helper.
- Replace Sentry and OpenTelemetry `any` types in `src/lib/observability/errorReporter.ts` and `src/lib/observability/tracer.ts` with package types and `Record<string, unknown>` / OpenTelemetry attribute types.
- Introduce narrow local interfaces for Mascot and active interactions used by:
  - `src/lib/level01SessionComplete.ts`
  - `src/lib/levelSceneOutcomeFlow.ts`
  - `src/lib/levelSceneQuestionFlow.ts`
  - `src/lib/levelSceneSessionComplete.ts`
  - `src/lib/levelSceneHintFlow.ts`
  - `src/scenes/LevelScene.ts` call sites, if still casting.
- Add a global `Window` augmentation for `window.__LOG` instead of `(window as any)`.
- Replace `templatesWithGroup as any` in `src/curriculum/seed.ts` with a stored-template type.
- Replace double casts:
  - fake pending `AttemptId` should become `AttemptId | null` or a dedicated pending-link model.
  - Phaser object casts in `Mascot` / `LevelVignette` should use typed helpers or concrete compatible types.
  - backup parsing should align `z.infer` with `BackupEnvelope`.
  - question-template storage should use a stored-template entity.
- Re-scan for `@ts-ignore`; convert only justified cases to commented `@ts-expect-error`.
- Audit bare string ID usage and replace with branded constructors from `src/types/branded.ts`.

Commit message: `fix: harden TypeScript boundaries`

## Phase 2 - Engine Correctness

Gate: typecheck + unit green, engine determinism auditor clean.

Findings to fix or verify:

- BKT:
  - Prior audit found `src/engine/bkt.ts` already clamps and guards degenerate inputs. Re-verify NaN/Infinity handling explicitly.
  - Add boundary tests for `P=0`, `P=1`, all-correct streaks, all-wrong streaks, NaN, and Infinity.
- Router:
  - Prior audit found level 1 regression and level 9 promotion caps already present. Add explicit edge tests anyway.
  - Add empty-mastery-map test if absent.
  - Decide whether `decideNextLevel()` conflicts with completion-gated progression decision D-26; remove/park if dead runtime code.
- Selection / ports:
  - `src/engine/selection.ts` appears port-driven.
  - `src/scenes/Level01SceneSelection.ts` still has fallback `Math.random()`; either require an injected RNG or route fallback through a scene adapter.
  - Add seeded determinism tests that assert stable selection sequences.
- Misconception detectors:
  - Add at least one positive and one false-positive guard test for every MC-* detector.
  - Resolve duplicate/overlapping misconception rules called out in prior audits:
    - `MC-WHB-01` vs `MC-NOM-01`
    - `MC-EOL-01` / `MC-EOL-02` / `MC-EOL-03` / `MC-EOL-04`
- Observability determinism:
  - Replace `Math.random()` in `src/lib/observability/logger.ts:110` with deterministic trimming.

Commit message: `fix: harden engine boundaries and determinism`

## Phase 3 - Validator Hardening

Gate: typecheck + unit green, validator-parity-checker green or documented pre-existing failures isolated.

Findings to fix:

- Confirm every validator in `src/validators` is pure. Prior scan found no Phaser, Dexie, `localStorage`, fetch, `Date.now`, or `Math.random` usage.
- Ensure every `ActivityArchetype` maps to a registered validator in `src/validators/registry.ts`.
- Throw a descriptive error for unknown archetypes/validator IDs rather than returning `undefined`.
- Normalize validator result shape. Current implementation uses `ValidatorResult` with `outcome`, `score`, optional `feedback`, and optional misconception fields. The requested target is `{ isCorrect: boolean, feedback: string, misconception?: string }`.
  - Decide whether to change the core contract or add an adapter at the scene/curriculum boundary.
  - Avoid dropping existing score/outcome semantics unless all callers are migrated.
- Python parity:
  - Add or verify clones for `validator.explain_your_order.sequence`.
  - Add or verify clones for `validator.order.acceptableOrders`.
  - Add or verify clones for `validator.order.withRuleExplanation`.
  - Add or verify clone/alias for `validator.placement.snapTolerance`.
  - Add shared fixtures run against both TypeScript and Python.
- Prior production report mentions 2 pre-existing partition parity failures; treat these as blockers for this phase unless explicitly waived.

Commit message: `fix: normalize validator contract and parity`

## Phase 4 - Persistence Hardening

Gate: typecheck + unit green, C5 check clean or documented migration-only exceptions.

Findings to fix:

- `src/persistence/db.ts`
  - Audit every `version().upgrade()`.
  - Confirm versions 1-9 have no gaps.
  - Add comments on each schema version change reason.
  - Ensure migrations are idempotent and do not silently delete rows.
  - Version 8 previously dropped `hintEvents`; migrate or document an approved exception.
- Repository writes:
  - Wrap every Dexie write operation in try/catch.
  - Log failures via `log.error`.
  - Re-throw write failures so callers can degrade gracefully.
  - Do not swallow transaction-participating writes such as `skillMasteryRepo.upsert()`.
  - Fix `levelProgressionRepo.upsert()` so it does not silently pretend success.
- Backup/restore:
  - Add missing dynamic stores if still omitted: `levelProgression`, `streakRecord`, `telemetryEvents`.
  - Harden `src/persistence/schemas.ts` with `.trim()`, `.max()`, numeric ranges, branded-id-compatible formats, and explicit enums.
  - Reject entire restore if any row fails validation.
- C5:
  - Verify `unlockedLevels:<studentId>` and `completedLevels:<studentId>` are no longer used in `MenuScene.ts` / `LevelMapScene.ts`; prior docs say this migration is now through `levelProgression`.
  - Keep only `questerix.lastUsedStudentId` as runtime `localStorage`.
  - Isolate and document migration-only reads for `questerix.onboardingSeen` and `questerix.streak:*`, then remove migrated keys after success.

Commit message: `fix: harden persistence writes and restore validation`

### Migration Safety Checklist (Applies To Every `version().upgrade()` Edit)

When touching `src/persistence/db.ts`, every upgrade block must be reviewed against this checklist:

- Idempotent: re-running upgrade must not duplicate or corrupt rows.
- No silent data loss: if a store is dropped, there must be an explicit decision (DR-03) and a written rationale.
- No swallowed failures for required migrations: best-effort behavior must be opt-in, not default.
- Shadow-table migrations must include: copy step, restore step, and cleanup step, with tests that prove row counts (or an acceptable loss policy).
- Host-global usage inside upgrade (`crypto.randomUUID`, Date/time) must be explicitly justified for target browsers and tested.

## Phase 5 - Scene and Session Lifecycle

Gate: typecheck + unit green, scene lifecycle tests green.

Findings to fix:

- Template pools:
  - In `LevelScene` and `Level01Scene`, assert `questionIndex < templatePool.length` before reading.
  - If exhausted, reshuffle or close the session gracefully.
- Play Again reset:
  - Ensure `init()` resets `questionIndex`, `attemptCount`, `wrongCount`, `correctCount`, `correctStreak`, `responseTimes`, `currentQuestionHintIds`, and `activeInteraction`.
  - Audit both `LevelScene` and `Level01Scene`.
- Generic session close:
  - `src/lib/levelSceneSessionComplete.ts` previously started close with `void`; ensure session close is awaited before overlay navigation.
  - Disable overlay actions until close settles.
- Hint/attempt linking:
  - Replace pending fake attempt IDs with nullable pending IDs.
  - Link hint events inside the transaction that persists the attempt for every level path.
- Shutdown:
  - Confirm every scene teardown calls `this.tweens.killAll()` and `this.time.removeAllEvents()` where appropriate.
  - Confirm `inputLocked` resets on shutdown/re-entry.
- BootScene:
  - Ensure `_advanced` is checked and set atomically in `advanceToPreload()`.
  - If `lastStudentId` points to a DB-missing student, remove the key and proceed anonymously/new-student.

Commit message: `fix: harden scene session lifecycle`

## Phase 6 - Interaction Layer

Gate: typecheck + unit green, interaction lifecycle tests added.

Findings to fix:

- Every interaction in `src/scenes/interactions` should implement or verify `destroy()` / unmount cleanup.
- Remove all `pointerdown`, `pointermove`, `pointerup`, `pointercancel`, `dragstart`, `drag`, `dragend`, and object-specific listeners from scene input and GameObjects.
- Add `pointerupoutside` / `pointercancel` handling for drag interactions:
  - `LabelInteraction`
  - `OrderInteraction`
  - `ExplainYourOrderInteraction`
  - `SnapMatchInteraction`
- If any interaction uses browser pointer capture directly, release it on cancel via `pointer.releasePointerCapture()`.
- Guard result callbacks with a local `_submitted` boolean so rapid double-tap cannot submit twice.
- Add tests for submit-once behavior and cancel cleanup.

Commit message: `fix: make interactions cancel-safe and single-submit`

## Phase 7 - Component Hardening

Gate: typecheck + unit green, a11y component tests green.

Findings to fix:

- `Mascot`
  - Gate every `setState()` tween with `if (this.reduceMotion)`.
  - Apply final transform directly when reduced motion is active.
  - Ensure all relevant `onComplete` callbacks return to `setState('idle')`.
- `HintLadder`
  - Clamp `next()` to the last tier and add a test for repeated calls past tier 3.
- `A11yLayer`
  - Maintain a registry of every created DOM element.
  - On destroy/reset, call `element.remove()` for every registered element.
  - Replace safe-but-unnecessary `innerHTML = ''` clearing with DOM APIs such as `replaceChildren()`.
  - Add orphan-DOM test.
- `FeedbackOverlay`
  - While visible, set `scene.input.enabled = false`.
  - Re-enable on hide.
  - Confirm z-depth sits above interactive game objects.
- `DragHandle`
  - Re-verify hit area is always at least 44 x 44 CSS px.

Commit message: `fix: harden core components`

## Phase 8 - Accessibility

Gate: typecheck + unit green, `npm.cmd run test:a11y` green where applicable.

Findings to fix:

- Audit every interactive Phaser Image, Graphics, Text, Rectangle, and Container for a corresponding A11yLayer entry with a non-empty accessible label.
- Prior scans found interaction-specific canvas controls needing a11y mirrors in:
  - `BenchmarkInteraction`
  - `CompareInteraction`
  - `EqualOrNotInteraction`
  - `ExplainYourOrderInteraction`
  - `MakeInteraction`
  - `OrderInteraction`
  - `SnapMatchInteraction`
  - plus utility controls such as number-line markers.
- Wrap cosmetic tweens with reduced-motion guards.
- For state-driving tweens, apply final transform immediately when reduced motion is on.
- Verify `AccessibilityAnnouncer` fires on:
  - question load
  - correct answer
  - wrong answer
  - hint display
  - session complete
- Audit hit areas: anything visually smaller than 44 x 44 must have an explicit input hit area at least 44 x 44.
- Add keyboard fallback where drag-only interactions block the learning goal from keyboard users.

Commit message: `fix: complete accessibility coverage`

## Phase 9 - Audio

Gate: typecheck + unit green, audio tests green in jsdom.

Findings to fix:

- Wrap `new AudioContext()` and `AudioContext.resume()` in try/catch in `src/audio/SFXService.ts`.
- Ensure Safari-before-gesture errors no-op gracefully.
- Confirm `TTSService` checks `ttsEnabled` from `deviceMetaRepo` before speaking.
- If TTS disabled, cancel in-flight utterance and return immediately.
- `OnboardingScene` must initialize TTS preference before any narration call.
- Ensure `SFXService.destroy()` closes the AudioContext and is called from Phaser game destroy.

Commit message: `fix: harden audio lifecycle and preferences`

## Phase 10 - i18n and Copy

Gate: typecheck + unit green, catalog missing-key tests green.

Findings to fix:

- Move hardcoded English player-facing strings in scenes/components into catalog files.
- Replace inline scene/component strings with `catalog.get('key')`.
- Keep non-copy symbols/numbers out of i18n only when they are visual mechanics rather than language.
- Make `catalog.get()` throw or `console.error` on missing keys and return a guaranteed string.
- Confirm all catalog side-effect imports happen before `BootScene.create()`.
- Remove duplicate `./lib/i18n/keys/quest` side-effect import in `src/main.ts`.

Commit message: `fix: centralize player-facing copy`

## Phase 11 - Observability and Security

Gate: typecheck + unit green, security scan clean.

Findings to fix:

- `src/main.ts`
  - Replace fatal banner `innerHTML` with DOM creation and `textContent`.
  - Render only `error.message`; never render `error.stack` to the DOM.
  - Avoid inline `onclick`; use `addEventListener`.
- Search all `src` for:
  - `eval(`
  - `new Function(`
  - `innerHTML =`
  - unsafe user/curriculum sourced DOM insertion
- Replace unsafe paths with `textContent` or safe DOM builders.
- `tracer.ts` and `errorReporter.ts`
  - Must be no-ops when activation env vars / DSN are absent.
  - Add a test that `fetch` is never called when `VITE_OTLP_URL` is undefined.
- Observability egress:
  - Prior audit flagged `telemetrySyncService` as C1-sensitive. Remove network sync from MVP builds or hard-disable it unless constraints change.

Commit message: `fix: remove DOM sinks and harden observability gates`

## Phase 12 - Curriculum Pipeline Integrity

Gate: typecheck + unit green, curriculum-byte-parity clean.

Findings to fix:

- Add a pre-commit hook or CI step that compares SHA256 of:
  - `public/curriculum/v1.json`
  - `src/curriculum/bundle.json`
  and fails if they differ.
- In `src/curriculum/loader.ts`, if network fetch or JSON parsing fails, log a warning and fall back to bundled `bundle.json`.
- Do not crash `PreloadScene` on recoverable curriculum fetch failure.
- In `src/curriculum/seed.ts`, validate seeded JSON against the Zod schema before writing to Dexie.
- Reject and log malformed templates instead of writing corrupt rows.

Commit message: `fix: enforce curriculum parity and fallback`

## Phase 13 - Performance

Gate: typecheck + unit green, `npm.cmd run measure-bundle` under 1 MB gzipped JS.

Findings to fix:

- Move any synchronous or startup-blocking Dexie work inside scene `create()` into async helpers with explicit error handling.
- `BootScene` currently performs several serialized async setup steps; add visible progress/error state and defer non-critical work.
- Lazy-import `tracer.ts` and `errorReporter.ts` only when activation conditions are met.
- Keep observability off the critical path and out of default chunks as much as possible.
- Run `npm.cmd run measure-bundle` after all changes.
- If total gzipped JS exceeds 1 MB, inspect chunks and code-split the largest non-Phaser contributor.

Commit message: `fix: defer noncritical startup work`

## Phase 14 - Test Coverage

Gate: full completion gate green.

Findings to fix:

- Prior audit found broad source files without direct filename-matched tests. Treat that as a prioritization signal, not a literal 100% mapping requirement.
- Add minimal tests for high-risk untested files first:
  - audio services
  - A11yLayer
  - FeedbackOverlay
  - HintLadder
  - persistence backup/restore
  - persistence migrations
  - session close/linking
  - interaction lifecycle and single-submit guards
  - curriculum loader fallback
- Replace any `expect(true).toBe(true)` smoke assertions with behavior assertions. Prior audit found none in `tests/**/*.ts`, but re-scan before completion.
- Add E2E Playwright tests for:
  - completing a full 5-question session
  - triggering each of the 3 hint tiers
  - Play Again after session complete
  - offline/fallback curriculum path

Commit message: `test: cover lifecycle and fallback paths`

### Test Map (High-Signal Files)

Use this map to avoid “tests are green” false confidence when fixtures don’t cover the new contract.

- Attempt repo contract: `tests/unit/persistence/attempt.test.ts`
- HintEvent repo contract: `tests/unit/persistence/hintEvent.test.ts`
- Backup restore boundary: `tests/unit/persistence/backup-validation.test.ts` (currently stale vs newer tables; must be expanded when Phase 4 changes land)
- Router/selection/BKT: `tests/unit/engine/router.test.ts`, `tests/unit/engine/selection.test.ts`, `tests/unit/engine/bkt*.test.ts`
- Validator dispatch: `tests/unit/validators/registry.test.ts`
- Session wiring: `tests/unit/scenes/LevelSceneQuestWiring.test.ts`, `tests/unit/scenes/Level01SceneQuestWiring.test.ts`

## Suggested Implementation Order

1. Security and C1/C5 blockers: `main.ts` DOM sink, observability egress, fake pending IDs, write swallowing.
2. TypeScript boundary cleanup: `any`, branded IDs, double casts.
3. Persistence migration/restore hardening.
4. Session lifecycle and hint/attempt transaction integrity.
5. Engine/router/detector tests.
6. Validator parity and contract normalization.
7. Interaction/component/a11y/audio hardening.
8. i18n copy migration.
9. Curriculum pipeline and performance.
10. E2E expansion and final completion gate.

## Audit Addendum (Round 2 - 2026-05-03)

This addendum is based on a second deep read of the highest-risk flows and a fresh round of static scans in the current working tree.

### Findings (New or Refined)

Attempt IDs and retrieval (root mismatch, impacts analytics and linking):

- `src/types/branded.ts:41` brands `AttemptId` as UUID string, but `src/persistence/db.ts:69-70` defines `attempts` as `++id` numeric auto-increment and the repo assumes numeric keys (`src/persistence/repositories/attempt.ts:34-39`).
- Generic attempt recording generates a UUID attempt id and passes it into `attemptRepo.record(...)` (`src/lib/levelSceneSession.ts:84-115`), then later links hint events to that UUID attempt id (`src/lib/levelSceneSession.ts:161-168`).
- This is incompatible with the attemptRepo contract demonstrated by `tests/unit/persistence/attempt.test.ts:64-89` (numeric string ids) and will break `attemptRepo.get()` for UUID-keyed rows.

HintEvent tier/type mismatches and restore risk:

- `src/types/hint.ts:8` defines `HintTier` as `'verbal' | 'visual_overlay' | 'worked_example'`.
- `src/types/runtime.ts:161-175` defines `HintEvent.tier: HintTier` and `attemptId?: AttemptId` (pending-link model).
- Backup restore schemas must match runtime types exactly. Because `npm.cmd run typecheck` excludes tests, fixture drift is easy:
  - If tests use numeric tiers, they can pass even if runtime types/schemas are string tiers, and they may seed invalid rows into fake-indexeddb.
  - Ensure backup-validation fixtures include representative `hintEvents` rows and assert the stored shape is valid against `backupEnvelopeSchema`.

HintEvent storage schema drift (Dexie schema vs repo expectations):

- `src/persistence/db.ts` defines `hintEvents` as `++id` (numeric) through v7 (`src/persistence/db.ts:248-286`), but the repository writes UUID string ids (`src/persistence/repositories/hintEvent.ts:12-24`).
- The working-tree v8/v9 migration attempts to preserve hintEvents by copying into `_migratingHintEvents`, dropping the store, and restoring into a v9 store declared as `hintEvents: 'id, attemptId'` (`src/persistence/db.ts:371-412`).
  - Migration uses `(event: any)` (`src/persistence/db.ts:403`) and swallows failures in both the copy and restore phases. That conflicts with the “no silent data loss” requirement for this pass.
  - The restore uses `crypto.randomUUID()` inside an IndexedDB upgrade transaction. It’s probably fine in modern browsers, but needs an explicit compatibility decision (and test coverage) if older Safari targets exist.

Session-close durability race (generic levels):

- `src/lib/levelSceneSessionComplete.ts:100` calls `void callbacks.closeSession()` without awaiting, while the overlay immediately enables navigation (`src/lib/levelSceneSessionComplete.ts:71-86`).
- On slow IndexedDB, it is possible to navigate away before `endedAt` and other close fields are durable.

Backup validation tests are now stale:

- `tests/unit/persistence/backup-validation.test.ts` fixtures only cover the older table set and omit newer tables (`levelProgression`, `streakRecord`, `telemetryEvents`) and omit hintEvents contents. This means the “green” unit test suite does not actually validate the current backup envelope contract.

Legacy Level01 replay path remains:

- `src/lib/level01SessionComplete.ts:110` routes `onPlayAgain` back to `Level01Scene` instead of the generic `LevelScene` path. This keeps the legacy divergence alive in a hot path.

### Verified This Round

- No `eval()` or `new Function()` usage found in `src/**`.
- `fetch` usage in `src/**` is limited to:
  - `src/audio/SFXService.ts:56`
  - `src/curriculum/loader.ts:244`
  - `src/lib/observability/syncService.ts:95`
- `Math.random()` usage outside engine ports is limited to:
  - `src/lib/observability/logger.ts:110`
  - `src/scenes/Level01SceneSelection.ts:88` (fallback path)
- Replace this block with fresh command results whenever code changes:
  - `npm.cmd run typecheck`
  - `npm.cmd run test:unit`

## Final Completion Checklist

- [ ] No explicit `any` remains in application/source code.
- [ ] No fake branded IDs remain.
- [ ] No `@ts-ignore`; every `@ts-expect-error` has a reason comment.
- [ ] No unsafe `innerHTML`, `eval`, or `new Function` in `src`.
- [ ] No runtime `localStorage` keys beyond `questerix.lastUsedStudentId` except tightly scoped migration-only reads.
- [ ] Repository writes log and rethrow failures.
- [ ] Restore schemas reject oversized, out-of-range, malformed, or enum-invalid rows.
- [ ] Hint events link to real attempts.
- [ ] Session close is durable before navigation.
- [ ] Interactions clean up listeners and submit exactly once.
- [ ] Reduced motion gates cosmetic tweens.
- [ ] A11yLayer mirrors all interactive canvas controls and cleans up all DOM nodes.
- [ ] TTS respects device preference before every speak path.
- [ ] Curriculum files are byte-identical and parity is enforced.
- [ ] Bundle remains <= 1 MB gzipped JS.
- [ ] `npm.cmd run typecheck` passes.
- [ ] `npm.cmd run lint` passes with 0 warnings.
- [ ] `npm.cmd run test:unit` passes.
- [ ] `npm.cmd run test:e2e` passes.
- [ ] `npm.cmd run measure-bundle` passes.
- [ ] `npm.cmd run validate:curriculum` passes.

### Constraint Checkpoints (Run At End Of Every Phase)

- C1: Confirm no new network egress paths were introduced; `fetch` usage remains policy-compliant.
- C5: Confirm no new `localStorage` keys; legacy reads are migration-only and removed after migration.
- C10: Confirm the phase’s changes are validation-serving (correctness, durability, a11y), not polish-only.
