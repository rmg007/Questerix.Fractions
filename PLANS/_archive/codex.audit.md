# Codex Audit - Questerix.Fractions

Date: 2026-05-03  
Auditor: Codex  
Scope: Senior engineering audit against `CLAUDE.md`, `docs/00-foundation/constraints.md`, and the requested 17 domains.  
Method: Read the hard-rule docs first, then scanned `src/**/*.ts`, curriculum bundles, validators, persistence, scenes, components, audio, i18n, observability, tests, bundle output, and git/build hygiene. No source fixes were implemented.

## Commands Run

- `npm run typecheck` - PASS, no TypeScript errors.
- `npm run measure-bundle` - PASS, total gzipped JS `499782` bytes / `488.1 KB`, `47.7%` of the 1 MB budget.
- `Get-FileHash public/curriculum/v1.json` and `Get-FileHash src/curriculum/bundle.json` - PASS, both SHA256 `A430BDD4FB454FD547249BF4AE4DEFC6398E08E9C8A35A46D9EB8D5D71C78E48`.
- Curriculum denominator scan for L1-L3 - PASS, no denominator outside L1-L2 halves and L3 halves/thirds/fourths.
- Static scans for `any`, `@ts-ignore`, `@ts-expect-error`, `as unknown as`, `localStorage`, network APIs/env usage, host globals in `src/engine`, `innerHTML`, TODO markers, and vacuous tests.

## Critical Findings

No Critical findings were confirmed in this pass.

## High Findings

[High] [C1 No Egress / Observability] `src/lib/observability/index.ts:41` - `initObservability()` starts `telemetrySyncService.init()` unconditionally after consent setup, and `src/lib/observability/syncService.ts:83` / `src/lib/observability/syncService.ts:95` can POST buffered local telemetry to `VITE_TELEMETRY_URL`. Even though the endpoint is env-gated and buffered events require consent, this is still a live non-static network path that conflicts with C1's "no backend / no external data egress" MVP rule. Suggested fix: remove `telemetrySyncService` from MVP builds or hard-disable network flushing until the post-2029 sync constraint changes; keep telemetry local-only in IndexedDB.

[High] [Security / XSS] `src/main.ts:23` - The fatal error banner interpolates `error.message` directly into `banner.innerHTML`. Most errors are internal, but this still creates a DOM XSS sink if any thrown message includes user-controlled content from a malformed backup, curriculum payload, or browser API. Suggested fix: construct the fatal UI with DOM nodes and `textContent`, or escape the message before insertion; keep the stack out of the DOM.

[High] [Persistence / Backup Integrity] `src/persistence/backup.ts:31` - Backup/restore omits newer dynamic stores `levelProgression`, `streakRecord`, and `telemetryEvents`, while `src/persistence/schemas.ts:168` only validates/restores the older table set. A user backup will silently lose unlock/completion state, streak state, and buffered telemetry on restore. Suggested fix: add these tables to `BackupEnvelope`, export, restore transaction, and Zod schemas, with bounded numeric ranges and branded-id-compatible string validation.

[High] [Persistence / Migration Data Loss] `src/persistence/db.ts:350` - Version 8 intentionally drops `hintEvents` and comments that wiping them is acceptable, but the requested persistence standard says no data-loss paths. Hint events are student interaction history and can matter for validation. Suggested fix: migrate hint events into the new v9 shape with generated string IDs instead of dropping the store, or explicitly document and approve the data-loss exception in the constraints/decision log.

[High] [Audio / Preference Gate] `src/scenes/OnboardingScene.ts:33` - `OnboardingScene` imports and calls `tts.speak(...)` at multiple points (`src/scenes/OnboardingScene.ts:266`, `350`, `370`, `443`, `459`) but does not load `deviceMeta.preferences.ttsEnabled` or call `tts.setEnabled()` in this scene. If a user disables TTS in settings and later re-enters onboarding/reset flows in the same runtime, narration can still speak depending on the singleton's prior state. Suggested fix: centralize TTS enablement in a boot-level preference observer or call the same audio/TTS preference initialization used by `LevelScene` before any onboarding narration.

## Medium Findings

[Medium] [C5 localStorage] `src/persistence/repositories/deviceMeta.ts:47` - `readLegacyOnboardingFlag()` still reads `questerix.onboardingSeen` from localStorage at runtime. The key is documented as legacy migration support, but the current C5 allowance only permits `questerix.lastUsedStudentId` plus the two documented level-progression deviations. Suggested fix: perform the legacy read only inside an upgrade/migration module with an expiry plan, or document it as a temporary C5 exception and remove it after one release.

[Medium] [C5 localStorage] `src/persistence/db.ts:302` - The v7 migration scans `questerix.streak:<studentId>` keys in localStorage and migrates them to IndexedDB. This is acceptable as a one-time migration, but it is not listed in the current allowed-key set and leaves C5 audits noisy. Suggested fix: document this as a migration-only exception with a removal target, or move the localStorage import path into a narrowly named legacy migration helper that is excluded from runtime code paths after upgrade.

[Medium] [TypeScript Strictness] `src/validators/registry.ts:21` - The registry uses `ValidatorRegistration<any, any>`, bypassing the no-`any` rule at the central validator dispatch boundary. This is exactly where unsafe input/payload shapes can spread across all archetypes. Suggested fix: replace the heterogeneous array escape hatch with `ValidatorRegistration<unknown, unknown>` plus a typed registration helper, or use a discriminated union keyed by archetype.

[Medium] [TypeScript Strictness] `src/lib/observability/errorReporter.ts:9` - `SentryModule = any` and related `any` contexts at `src/lib/observability/errorReporter.ts:85`, `96`, `138`, and `151` bypass strict typing in the error-reporting path. Suggested fix: import `typeof import('@sentry/browser')` as the module type and use `Record<string, unknown>` for context/extras.

[Medium] [TypeScript Strictness] `src/lib/levelSceneHintFlow.ts:22` - The level-flow helper accepts `mascot: any` and `activeInteraction: any`, repeated in `src/lib/levelSceneOutcomeFlow.ts:28`, `src/lib/levelSceneQuestionFlow.ts:36`, `src/lib/levelSceneSessionComplete.ts:19`, and call-site casts in `src/scenes/LevelScene.ts:319`, `451`, `641`, `643`, `665`, `667`. Suggested fix: introduce narrow interfaces for the Mascot surface and interaction surface consumed by these helpers.

[Medium] [TypeScript Strictness] `src/curriculum/seed.ts:202` - `templatesWithGroup as any` hides a schema mismatch between enriched question templates and the `QuestionTemplate` type. Suggested fix: add `levelGroup` to the persisted question-template type or create a dedicated `StoredQuestionTemplate` type used by the repo and Dexie table.

[Medium] [Validators / Python Parity] `src/validators/explain_your_order.ts:43` - TypeScript registers `validator.explain_your_order.sequence`, but `pipeline/validators_py.py` has no matching Python clone. Suggested fix: add the Python clone and parity fixtures before using this archetype in generated curriculum.

[Medium] [Validators / Python Parity] `src/validators/placement.ts:49` - TypeScript registers `validator.placement.snapTolerance`, but `pipeline/validators_py.py` only registers `validator.placement.snap8`. Suggested fix: add `_placement_snap_tolerance` to `validators_py.py` and include parity fixture coverage.

[Medium] [Validators / Python Parity] `src/validators/order.ts:60` and `src/validators/order.ts:108` - TypeScript registers `validator.order.acceptableOrders` and `validator.order.withRuleExplanation`, but `pipeline/validators_py.py` only registers `validator.order.sequence`. Suggested fix: clone both variants in Python and add fixtures covering partial-credit and explanation rules.

[Medium] [Validator Contract] `src/types/validator.ts:15` - `ValidatorResult.feedback` is optional, and several correct/incorrect returns omit it, e.g. `src/validators/compare.ts:37`, `src/validators/equal_or_not.ts:37`, `src/validators/snap_match.ts:48`, and `src/validators/snap_match.ts:51`. The requested contract says `isCorrect`, `feedback`, and optional misconception fields should always be present; the implemented contract is `outcome`/`score` with optional feedback. Suggested fix: either update the project spec to match the implemented `ValidatorResult`, or make feedback mandatory and add a derived `isCorrect` adapter at the scene boundary.

[Medium] [Persistence / Boundary Validation] `src/persistence/repositories/levelProgression.ts:34` - `upsert()` writes caller-supplied `LevelProgression` without validating level ranges, duplicate levels, sortedness, or `syncState`. Suggested fix: add a Zod or explicit boundary validator for dynamic writes before calling `db.levelProgression.put()`.

[Medium] [Persistence / Silent Failure] `src/persistence/repositories/levelProgression.ts:33` - `upsert()` catches and silently swallows Dexie write failures; callers then proceed as if unlock/completion state was saved. Suggested fix: return a boolean/result object or rethrow non-quota errors so scenes can show volatile-mode messaging and retry.

[Medium] [Accessibility / DOM Lifecycle] `src/components/A11yLayer.ts:108` - `getActiveLayer()` auto-creates a base DOM layer, but most scenes call only `A11yLayer.unmountAll()`, not `popLayer()` or `resetAll()`. The container and live region persist for the app lifetime, and modal layers depend on callers balancing `pushLayer()`/`popLayer()`. Suggested fix: wire scene shutdown handlers to `resetAll()` or introduce scene-scoped layer ownership so DOM nodes cannot accumulate or remain inert/hidden after scene transitions.

[Medium] [Accessibility / Reduced Motion] `src/components/FeedbackAnimations.ts:24` - Feedback animation helpers call `ctx.scene.tweens.add()` / `.chain()` without checking `checkReduceMotion()` internally. `FeedbackOverlay` gates entry animation before calling them today, but the helpers are exported and unsafe if reused elsewhere. Suggested fix: either make these helpers private to `FeedbackOverlay` or add a reduced-motion guard at the helper boundary.

[Medium] [Interaction Layer / Pointer Cancel] `src/scenes/interactions/LabelInteraction.ts:95` - Drag interactions register Phaser drag handlers but do not handle `pointercancel` / lost-pointer cancellation explicitly. Similar pattern exists in `src/scenes/interactions/OrderInteraction.ts:118`, `ExplainYourOrderInteraction.ts:114`, and `SnapMatchInteraction.ts:110`. Suggested fix: add cancel-safe cleanup that restores drag state and releases active affordances on `pointerupoutside`, `pointercancel`, scene shutdown, and object destroy.

[Medium] [Observability / Determinism] `src/lib/observability/logger.ts:110` - The local logger uses `Math.random()` to decide when to trim the telemetry ring buffer. This is outside `src/engine`, but it makes retention of local validation telemetry nondeterministic. Suggested fix: trim deterministically after writes when count exceeds a threshold, or inject a scheduler/random port if sampling is intentional.

[Medium] [Security / Backup Schema Hardening] `src/persistence/schemas.ts:22` - Backup schemas accept unbounded strings and numbers across dynamic tables, and most string fields are not `.trim()`ed or format-checked. Malformed backups can store oversized display names, IDs, activity IDs, or timestamps into IndexedDB. Suggested fix: add `.trim()`, `.max(...)`, UUID/ID regexes, integer/nonnegative/range checks, and stricter enums for level/archetype fields.

[Medium] [Curriculum Loader / Degraded Boot] `src/curriculum/loader.ts:272` - Non-`TypeError` fetch/JSON failures return an empty bundle instead of falling back to the bundled curriculum. That preserves a test contract, but production malformed JSON from `/curriculum/v1.json` can degrade to synthetic/empty content despite a valid static bundle being present. Suggested fix: fall back to `bundle.json` for parse errors too, while updating tests to assert the production resilience behavior.

[Medium] [Performance / Main-Thread Scene Create] `src/scenes/BootScene.ts:47` - BootScene runs persistence grant, preference initialization, curriculum seeding, and student lookup/creation during boot before advancing. These are async, but they still serialize startup and can leave the canvas in boot state on slow IndexedDB. Suggested fix: show explicit boot progress/error state and defer non-critical persistence grant/telemetry setup until after first paint or first engagement.

## Low Findings

[Low] [C4 / Bundle Hygiene] `package.json:83` - Runtime dependencies include OpenTelemetry, Sentry, `web-vitals`, and Workbox in addition to Phaser/Vite/Dexie/Zod. They are already present rather than newly introduced, and bundle size passes, but they are non-core MVP dependencies with egress and size implications. Suggested fix: keep them lazy and env-gated, and remove or compile out dormant observability code until validation requires it.

[Low] [Bundle Budget] `dist/assets/phaser-D1YxjZg2.js` - `npm run measure-bundle` reports Phaser at `350315` gzipped bytes, which is the only module above 100 KB. Total bundle still passes at `488.1 KB`. Suggested fix: no immediate action; continue to keep Phaser isolated in a manual chunk and watch regressions.

[Low] [Git / Build Hygiene] `src/main.ts:3` and `src/main.ts:10` - `./lib/i18n/keys/quest` is imported twice as a side effect. It is HMR-idempotent, but this is avoidable startup noise. Suggested fix: remove the duplicate import.

[Low] [Git / Build Hygiene] `src/components/LevelVignette.ts:1` - File-wide `/* eslint-disable max-lines */` hides continued growth of a large component. Suggested fix: split vignette animation scenes into smaller helpers or documented modules, then remove the file-wide bypass.

[Low] [DB Schema Consistency] `src/persistence/db.ts:384` - Version 9 declares only `hintEvents: 'id, attemptId'`. Dexie supports incremental schema declarations, but this style differs from earlier full declarations and is easy to misread as dropping all other stores. Suggested fix: add a clarifying comment or use the same full-schema style consistently.

[Low] [i18n / Copy Discipline] `src/scenes/OnboardingScene.ts:113` - Many player-facing strings in scenes/components are hardcoded rather than retrieved from the typed catalog, while actual `catalog.get()` usage is effectively absent. Suggested fix: migrate stable player-facing scene/component copy into `src/lib/i18n/keys/quest.ts` and retrieve via the catalog so copy linting can cover it.

[Low] [Testing / Vacuous Assertions] No `expect(true).toBe(true)` or `expect(true).toBeTruthy()` patterns were found in `tests/**/*.ts`.

[Low] [Git / Secrets] `wrangler.toml:1` - No credentials or secrets found; file contains project name, compatibility date, and output directory only.

## Strictness Inventory

The following code-bearing `any` / unsafe casts were found. Comments containing the word "any" were ignored for finding severity, but the explicit casts below should be tracked down over time.

- [Medium] [TypeScript Strictness] `src/curriculum/seed.ts:202` - `templatesWithGroup as any` - Replace with a persisted question-template type that includes `levelGroup`.
- [Medium] [TypeScript Strictness] `src/lib/level01SessionComplete.ts:27` - `mascot: any` - Replace with a narrow Mascot interface.
- [Medium] [TypeScript Strictness] `src/lib/levelSceneHintFlow.ts:22` - `mascot: any` - Replace with a narrow Mascot interface.
- [Medium] [TypeScript Strictness] `src/lib/levelSceneHintFlow.ts:24` - `activeInteraction: any` - Replace with a narrow interaction interface.
- [Medium] [TypeScript Strictness] `src/lib/levelSceneOutcomeFlow.ts:28` - `mascot: any` - Replace with a narrow Mascot interface.
- [Medium] [TypeScript Strictness] `src/lib/levelSceneOutcomeFlow.ts:30` - `activeInteraction: any` - Replace with a narrow interaction interface.
- [Medium] [TypeScript Strictness] `src/lib/levelSceneQuestionFlow.ts:36` - `mascot: any` - Replace with a narrow Mascot interface.
- [Medium] [TypeScript Strictness] `src/lib/levelSceneSessionComplete.ts:19` - `mascot: any` - Replace with a narrow Mascot interface.
- [Medium] [TypeScript Strictness] `src/lib/log.ts:258` - `(window as any).__LOG` - Declare a global `Window` augmentation for the debug logger.
- [Medium] [TypeScript Strictness] `src/lib/logViewer.ts:175` - `const w = window as any` - Declare a global `Window` augmentation.
- [Medium] [TypeScript Strictness] `src/lib/observability/errorReporter.ts:9` - `type SentryModule = any` - Use `typeof import('@sentry/browser')`.
- [Medium] [TypeScript Strictness] `src/lib/observability/errorReporter.ts:85` - dynamic import cast `as any` - Use typed dynamic import.
- [Medium] [TypeScript Strictness] `src/lib/observability/errorReporter.ts:96` - `beforeSend(event: any)` - Use Sentry event type.
- [Medium] [TypeScript Strictness] `src/lib/observability/errorReporter.ts:138` - `Record<string, any>` - Use `Record<string, unknown>`.
- [Medium] [TypeScript Strictness] `src/lib/observability/errorReporter.ts:151` - `scope: any` - Use Sentry scope type.
- [Medium] [TypeScript Strictness] `src/lib/observability/tracer.ts:58` - `spanProcessors: any[]` - Use the OpenTelemetry span processor interface type.
- [Medium] [TypeScript Strictness] `src/lib/observability/tracer.ts:104` - `Record<string, any>` - Use `Record<string, unknown>` or OpenTelemetry attributes type.
- [Medium] [TypeScript Strictness] `src/scenes/LevelScene.ts:319` - `this.mascot as any` - Type helper input.
- [Medium] [TypeScript Strictness] `src/scenes/LevelScene.ts:451` - `this.mascot as any` - Type helper input.
- [Medium] [TypeScript Strictness] `src/scenes/LevelScene.ts:641` - `this.mascot as any` - Type helper input.
- [Medium] [TypeScript Strictness] `src/scenes/LevelScene.ts:643` - `this.activeInteraction as any` - Type interaction contract.
- [Medium] [TypeScript Strictness] `src/scenes/LevelScene.ts:665` - `this.mascot as any` - Type helper input.
- [Medium] [TypeScript Strictness] `src/scenes/LevelScene.ts:667` - `this.activeInteraction as any` - Type interaction contract.
- [Medium] [TypeScript Strictness] `src/validators/registry.ts:21` - `ValidatorRegistration<any, any>` - Replace with unknown/discriminated registration.
- [Low] [TypeScript Strictness] `src/components/LevelVignette.ts:249` - `(obj as unknown as { destroy(): void })` - Use a typed `Destroyable` union or helper.
- [Low] [TypeScript Strictness] `src/components/Mascot.ts:380` and `src/components/Mascot.ts:439` - `sleepGfx as unknown as Phaser.GameObjects.GameObject` - Prefer declaring `sleepGfx` as an object type assignable to container children.
- [Low] [TypeScript Strictness] `src/lib/levelSceneChrome.ts:139` - `stars as unknown as Phaser.GameObjects.GameObject[]` - Type the star collection at creation.
- [Low] [TypeScript Strictness] `src/lib/levelSceneHintFlow.ts:144` and `src/scenes/Level01SceneHintSystem.ts:118` - empty string cast to `AttemptId` - Model "no attempt yet" as `AttemptId | null` instead of a fake branded ID.
- [Low] [TypeScript Strictness] `src/lib/levelSceneSession.ts:180` - `f as unknown as { misconceptionId: string }` - Type the detector output or normalize flags before storage.
- [Low] [TypeScript Strictness] `src/persistence/backup.ts:145` - parsed Zod value cast back to `BackupEnvelope` - Align the Zod-inferred type with the runtime `BackupEnvelope` interface.
- [Low] [TypeScript Strictness] `src/persistence/repositories/questionTemplate.ts:32` - `stored as unknown as QuestionTemplate[]` - Use a stored-template type rather than erasing the enrichment.

No `@ts-ignore` or `@ts-expect-error` directives were found in `src/**/*.ts`.

## Positive Checks / No Finding

- `tsconfig.json` keeps `strict`, `noUnusedLocals`, `noUnusedParameters`, and `exactOptionalPropertyTypes` enabled; no override bypass was found.
- `src/engine/selection.ts` did not contain direct `Math.random`, `Date.now`, or `crypto.randomUUID` calls; host globals route through ports in engine code.
- `src/engine/bkt.ts` uses the standard evidence update plus transition step, validates non-degenerate slip/guess, guards zero denominators, and clamps output to `[0, 1]`.
- `src/engine/router.ts` freezes calibration, prevents level-1 regression below 1, caps promotion at level 9, and returns false for an empty mastery map.
- Validator files are pure by scan: no Phaser imports, Dexie calls, localStorage, fetch, `Date.now`, or `Math.random` were found in `src/validators/*.ts`.
- `src/lib/observability/tracer.ts` only installs OTLP export when `VITE_OTLP_URL` is defined; dev mode uses console spans.
- `src/lib/observability/errorReporter.ts` only imports/initializes Sentry when a DSN is explicitly passed and `VITE_SENTRY_DSN` is present.
- `withSpan()` exception handling was not flagged in this audit because no concrete exception-path leak was found in the inspected observability wrappers.
- No `eval()` or `new Function()` usage was found in `src/**/*.ts`.
- `public/curriculum/v1.json` and `src/curriculum/bundle.json` are byte-identical by SHA256.

## Deep-Dive Addendum

Added after a second pass requested on 2026-05-03. This pass used generated cross-checks for validator parity, test-file coverage, Phaser interactive objects without nearby A11yLayer mirrors, reduced-motion guard candidates, and line-by-line inspection of session/attempt/hint persistence.

### Additional High Findings

[High] [Persistence / Hint Analytics Integrity] `src/lib/levelSceneHintFlow.ts:144` - Generic `LevelScene` records hint events with `attemptId: '' as unknown as AttemptId`, but the generic attempt path in `src/lib/levelSceneSession.ts:89` never calls `hintEventRepo.linkToAttempt()`. The only link call found is in the Level 1-specific recorder at `src/lib/attemptRecorder.ts:94`, so Levels 2-9 persist hint rows detached from their actual attempts. This corrupts hint telemetry, assisted-attempt analysis, and restore/replay joins. Suggested fix: make hint events pending with `attemptId: null` or a dedicated pending field, then link them inside the same transaction that persists the attempt for every level path.

[High] [Persistence / Transaction Atomicity] `src/persistence/repositories/skillMastery.ts:25` - `skillMasteryRepo.upsert()` swallows non-quota write errors, and `src/lib/levelSceneSession.ts:89` calls it inside the same transaction that records the attempt. If the mastery write fails, the transaction can still commit the attempt row and return a calculated mastery estimate, leaving BKT state stale while the UI/logs believe mastery updated. Suggested fix: never swallow write errors inside transaction-participating repository methods; return explicit `Result` values outside transactions or rethrow so the transaction aborts atomically.

[High] [Scenes / Legacy Level 1 Regression] `src/lib/level01SessionComplete.ts:103` - The Level 1 Play Again path routes back to `Level01Scene`, but `CLAUDE.md` states the G-C7 fix was that Play Again should route through `LevelScene { levelNumber: ... }` and no longer re-enter `Level01Scene` directly. This keeps the legacy scene alive in a high-use path and can reintroduce divergence from generic session behavior. Suggested fix: change Level 1 replay to `LevelScene` once Level 1 metadata/templates are fully supported, or update `CLAUDE.md` if the legacy route is intentionally back in scope.

[High] [Session Lifecycle / Close Race] `src/lib/levelSceneSessionComplete.ts:89` - Generic session completion starts `callbacks.closeSession()` with `void`, while overlay callbacks can immediately navigate to another scene. On slow IndexedDB, the scene can transition before `endedAt`, `accuracy`, and `scaffoldRecommendation` are durable. Suggested fix: await session close before enabling navigation actions, or disable overlay buttons until close resolves/fails with a visible volatile-mode fallback.

### Additional Medium Findings

[Medium] [Attempt ID Consistency] `src/persistence/repositories/attempt.ts:21` - Attempts are stored in a `++id` auto-increment store, but callers pass UUID-like `AttemptId` values (`src/lib/levelSceneSession.ts:80`, `src/lib/attemptRecorder.ts:56`). Dexie accepts inbound keys even on `++id`, and `attemptRepo.get()` then converts `AttemptId` with `Number(id)` at `src/persistence/repositories/attempt.ts:35`, which cannot retrieve UUID-keyed rows. Suggested fix: choose one primary-key strategy: either numeric auto-increment everywhere with separate UUID field, or string UUID primary keys with schema `id`.

[Medium] [Engine / Router Dead Code Drift] `src/engine/router.ts:52` - `decideNextLevel()` implements a BKT/prerequisite level-up path, but the current accepted decision D-26 says progression gates are completion-based, not BKT-gated. Runtime usage is also effectively limited: generic `LevelScene` does not call `decideNextLevel()`, and `src/lib/level01SessionComplete.ts:56` calls it with `masteries: new Map()` and `prereqsMet: false`, making promotion unreachable there. Suggested fix: either remove/park the router from MVP runtime and tests, or wire it intentionally as advisory-only with docs reflecting D-26.

[Medium] [Misconception Detection / Duplicate Flags] `src/engine/misconceptionRules.ts:160` and `src/engine/misconceptionRules.ts:222` - `MC-WHB-01` and `MC-NOM-01` use the same compare-level predicate (`outcome === 'WRONG' && student relation === '>'`) with similar level gates, so a single pattern can produce two misconception flags. Suggested fix: differentiate numerator-bias vs numerator-over-magnitude using correct-answer relation, numerator/denominator comparisons, or merge the duplicate rules.

[Medium] [Misconception Detection / Overlapping Equal-Or-Not Rules] `src/engine/misconceptionRules.ts:247` and `src/engine/misconceptionRules.ts:269` - `MC-EOL-03` fires on wrong `studentAnswer === true`, while `MC-EOL-01` also fires on wrong `studentAnswer === true` when the correct answer is false. Similarly, `MC-EOL-02` and `MC-EOL-04` both fire on wrong `studentAnswer === false` under broad equal-or-not conditions. Suggested fix: make each EOL rule mutually exclusive by adding payload/prompt/correct-answer guards that map to distinct misconceptions rather than overlapping answer polarity.

[Medium] [Accessibility Coverage / Canvas Controls] `src/scenes/interactions/BenchmarkInteraction.ts:102` - A generated scan found many `.setInteractive()` controls with no nearby A11yLayer mirror, including interaction submit/options in `BenchmarkInteraction`, `CompareInteraction`, `EqualOrNotInteraction`, `ExplainYourOrderInteraction`, `MakeInteraction`, `OrderInteraction`, and `SnapMatchInteraction`. The scene-level submit/hint/back buttons are mirrored, but archetype-specific choices are not consistently represented as DOM buttons. Suggested fix: add interaction-level A11yLayer actions for every answer choice/drag alternative, or implement a shared interaction accessibility contract.

[Medium] [Accessibility / Reduced-Motion Coverage] `src/components/LevelVignette.ts:342` - The generated reduced-motion scan found many tween calls inside `LevelVignette` helper methods without a local guard. The top-level `play()` has reduced-motion branches, but internal helper methods remain callable and difficult to audit. Suggested fix: enforce reduced-motion at helper boundaries or pass an explicit motion context so all vignette tweens are statically gated.

[Medium] [Test Coverage / Untested Runtime Surface] `src/audio/SFXService.ts:1` - Name-based test mapping found 125 of 169 non-test `src/**/*.ts` files without a corresponding `.test.ts`/`.spec.ts`; high-risk examples include `SFXService.ts`, `TTSService.ts`, `A11yLayer.ts`, `FeedbackAnimations.ts`, `HintLadder.ts`, `Mascot.ts`, `curriculum/seed.ts`, `observability/syncService.ts`, `persistence/backup.ts`, `persistence/db.ts`, `BootScene.ts`, `LevelScene.ts`, and all interaction files. Suggested fix: prioritize focused tests for persistence boundary behavior, audio preference gating, A11yLayer lifecycle, session close/linking, and interaction commit callbacks rather than chasing 100% file parity.

### Additional Low Findings

[Low] [Validator Parity / Unused Runtime Variants] `src/validators/placement.ts:63` - The curriculum currently uses 9 validator IDs and all are present in both TypeScript and Python, but 7 TypeScript variants are unused by current curriculum: `validator.explain_your_order.sequence`, `validator.make.halvingByLine`, `validator.order.acceptableOrders`, `validator.order.withRuleExplanation`, `validator.partition.equalCount`, `validator.placement.snapTolerance`, and `validator.placement.snap8`. Suggested fix: either add fixtures and Python parity for intended future variants, or remove unreferenced runtime validators until curriculum needs them.

[Low] [Tooling / Coverage Metric Caveat] `src/main.ts:1` - The zero-corresponding-test scan used filename matching, which misses tests organized by behavior rather than source basename. Treat the 125-file count as a prioritization signal, not an exact coverage failure. Suggested fix: add coverage thresholds by domain and mutation/fixture tests for validators and persistence.
