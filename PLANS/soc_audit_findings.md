# Separation-of-Concerns Audit — Findings

**Date:** 2026-04-26
**Auditor:** Autonomous Architectural Auditor
**Codebase:** Questerix Fractions (Phaser 4 + TypeScript + Dexie)
**Scope:** Domain-layer purity, data-access contamination, presentation-layer bloat, dependency direction

---

## Layer Inventory (assumed)

| Layer | Directories | Permitted dependencies |
|---|---|---|
| Domain (pure) | `src/engine/`, `src/validators/`, `src/types/` | only `src/types/` and self |
| Data Access | `src/persistence/`, `src/persistence/repositories/` | `src/types/`, Dexie |
| Presentation | `src/scenes/`, `src/components/` | all lower layers via injected ports (ideally) |
| Infrastructure adapters | `src/audio/`, `src/lib/log.ts` | `src/types/` |

The architecture has no Application / Use-Case layer. The scenes have absorbed that responsibility, which is the root cause of nearly every finding below.

---

## Findings

### src/scenes/Level01Scene.ts
* **Violation:** Presentation Layer Bloat — Cross-Layer Orchestration. The scene imports and orchestrates eight persistence repositories (`questionTemplateRepo`, `deviceMetaRepo`, `lastUsedStudent`, `sessionRepo`, `attemptRepo`, `hintEventRepo`, `skillMasteryRepo`, `misconceptionFlagRepo`), the BKT domain engine, the misconception-detector domain engine, and the validator registry. It performs domain transformations (BKT updates, mastery state derivation, accuracy/avgResponseMs computation, validator dispatch, fallback construction) directly inside Phaser callbacks.
* **Location:**
  - `recordAttempt()` lines 906–1026 — directly imports `attemptRepo`, `skillMasteryRepo`, `misconceptionFlagRepo`, `engine/bkt`, `engine/misconceptionDetectors`; constructs default `SkillMastery` record (lines 961–974); derives `masteredAt` / `decayedAt` / `compositeKey` (lines 976–985); calls `runAllDetectors` and persists flags in a loop (lines 1001–1018).
  - `onSubmit()` lines 614–686 — embeds validator-registry lookup, fallback to `partitionEqualAreas`, error capture, response-time computation, accuracy counting.
  - `openSession()` lines 277–343 — instantiates `nanoid`, builds full `Session` aggregate, persists it.
  - `closeSession()` lines 1146–1174 — derives session summary metrics (accuracy, avgResponseMs, xpEarned, scaffoldRecommendation) inline.
  - `loadQuestion()` lines 437–457 — performs template→`L01Question` shape mapping (a domain projection) inside the scene.
  - Hardcoded `QUESTIONS` array lines 69–110 — curriculum content embedded in the presentation layer.
* **Consequence:**
  1. The scene is untestable in isolation — every unit test has to stub IndexedDB, Dexie repositories, and dynamic `import()` resolution.
  2. Any change to the persistence schema (adding a `Session` field, renaming a column, changing the BKT default-record shape) propagates into the scene file, multiplying touch points.
  3. The same orchestration is duplicated in `LevelScene.ts` (see below); diverging copies will create inconsistent learner-data contracts (e.g., L1 may write a different mastery shape than L2).
  4. Dynamic `await import('../persistence/...')` inside methods hides the dependency graph from static analysis and TypeScript's circular-import detection — concealing the violation from tooling.
  5. Migrating off Phaser (or to a non-browser test harness) requires rewriting the orchestration, not the scene.
* **Refactoring Directive:**
  1. Introduce an Application layer at `src/application/` containing use-case classes: `SubmitAttemptUseCase`, `OpenSessionUseCase`, `CloseSessionUseCase`, `LoadLevelTemplatesUseCase`, `RecordHintUseCase`. Each accepts repositories and the BKT/detector engines via constructor injection (Hexagonal / Ports-and-Adapters pattern).
  2. Move all of `recordAttempt()`'s body into `SubmitAttemptUseCase.execute(attemptInput): Promise<AttemptOutcome>`, returning a DTO that the scene only needs to read.
  3. Move validator dispatch into a `ValidationService` (Strategy pattern over `validatorRegistry`); the scene calls `validation.validate(template, payload)` and gets a `ValidatorResult`.
  4. Move `Session` aggregate construction into a `SessionFactory` (Factory pattern). Move accuracy/avgResponseMs derivation into a `SessionSummaryCalculator` (pure domain function in `src/engine/`).
  5. Delete the embedded `QUESTIONS` array; resolve fallback templates via a `CurriculumGateway` port that the application layer can swap for a synthetic implementation.
  6. Replace dynamic `await import()` with eager imports once the application layer exists — the circular-dependency justification disappears once the scene no longer reaches into persistence.
  7. Target shape: scene constructor receives `{ submitAttempt, openSession, closeSession, loadTemplates, recordHint }` interfaces; the file shrinks from ~1200 lines to ~400 lines of pure UI choreography.

---

### src/scenes/LevelScene.ts
* **Violation:** Presentation Layer Bloat — duplicated and divergent copy of `Level01Scene` orchestration. Same domain logic, same persistence calls, slight contract drift.
* **Location:**
  - `recordAttempt()` lines 634–743 — duplicates the BKT update block (lines 666–717) and misconception-detection block (lines 720–739) verbatim from `Level01Scene`, but uses a *different* skillId derivation (`skillIds[0] ?? skill.level_${levelNumber}`) — diverging contract with L1.
  - `onSubmit()` lines 366–420 — duplicates validator-dispatch logic with a different fallback path.
  - `openSession()` lines 596–632 — duplicates session-aggregate construction with `activityId: level_${levelNumber}` instead of `partition_halves` — another contract divergence.
  - `showHintForTier()` lines 490–580 — embeds a 60-line per-archetype message lookup table (lines 495–553) inside a Phaser scene method; this is content/copy data, not presentation.
  - `makeFallbackTemplate()` lines 243–260 — synthetic curriculum construction inside the scene.
* **Consequence:**
  1. Bug fixes in `Level01Scene.recordAttempt` will not propagate to `LevelScene.recordAttempt`. The 2026-04-27 architecture review already flagged this as `G-E2` ("wired in LevelScene, not in Level01Scene").
  2. The `skillId` divergence will silently bifurcate the BKT mastery store: L1 attempts update `skill.partition_halves` while L2+ attempts update `skill.level_2`, `skill.level_3`, etc. — different namespaces.
  3. The hint-copy table is unreachable from i18n tooling, can't be A/B tested, and forces a code release for any wording change.
* **Refactoring Directive:**
  1. Apply the same use-case extraction prescribed for `Level01Scene`. Both scenes should become thin views over `SubmitAttemptUseCase` etc.
  2. Once extracted, delete `Level01Scene.ts` entirely — its only justification was the duplicated orchestration, and `LevelScene` already accepts `levelNumber: 1`.
  3. Move the per-archetype hint copy into `src/curriculum/hints/` as a JSON resource keyed by `(archetype, tier)`. Resolve at runtime via a `HintCopyRepository`. This also closes the C10 content-authoring gap for hints.
  4. Introduce a `SkillIdResolver` domain service so L1 and L2+ agree on skill namespacing — single source of truth for the mastery store key.

---

### src/scenes/SettingsScene.ts
* **Violation:** Data Access Contamination — direct invocation of the Dexie database object from a presentation scene.
* **Location:**
  - Line 13 — `import { db } from '../persistence/db';`
  - Line 256 — `await db.delete();` (destructive operation invoked from a UI button handler).
* **Consequence:**
  1. The scene has unrestricted access to the entire Dexie instance — it could read any table, run any transaction. Reset is one button-press away from a database wipe and there is no domain-level guardrail (e.g., a `ResetDeviceUseCase` that also clears `lastUsedStudent`, audits the action, or emits a telemetry event before deleting).
  2. If the persistence layer migrates to a different store (or a multi-DB sharded model), every scene that touched `db` directly must be rewritten.
  3. Backup-export and reset are the most security/privacy-sensitive operations in the app (per `privacy.html`). They deserve a dedicated use-case with logging, not a direct DB handle.
* **Refactoring Directive:**
  1. Create `src/application/ResetDeviceUseCase.ts` that owns `db.delete()`, `lastUsedStudent.clear()`, and any future reset-side-effects (telemetry write, audit log). Inject it into `SettingsScene`.
  2. Mirror with `ExportBackupUseCase` wrapping `backupToFile()`.
  3. Remove the `db` import from `SettingsScene`; the scene must not know that Dexie is the persistence engine.
  4. Apply the Facade pattern at `src/persistence/index.ts` — export only repository instances and use-case-shaped operations, never the raw `db` handle.

---

### src/scenes/MenuScene.ts
* **Violation 1:** Constraint violation — `localStorage` used for important data, contradicting C5 ("No localStorage for important data; IndexedDB only").
* **Violation 2:** Dual-source persistence — the same domain concept (level-unlock state) is read from both `localStorage` and Dexie within the same method, creating two competing sources of truth.
* **Location:**
  - Line 338 — `const raw = localStorage.getItem(key);` (`_getUnlockedLevels`)
  - Line 353–358 — `localStorage.setItem('unlockedLevels:...', JSON.stringify(arr));` (`markLevelComplete`)
  - Lines 365–384 — `_openLevelChooser()` reads `localStorage` first, then merges with Dexie session results.
* **Consequence:**
  1. Direct C5 breach. Per the locked constraints (`docs/00-foundation/constraints.md`), unlock state is "important data" and may not live in `localStorage`.
  2. The two stores can disagree: a student who completes Level 3 in one browser tab updates `localStorage`, but if Dexie reflects only Level 1 completion (because the session never closed cleanly), the merge logic over-grants access. The `localStorage` write effectively bypasses the BKT mastery gate.
  3. Quota or browser-clear actions silently destroy progress, with no warning surfaced to the student.
  4. `markLevelComplete` is a `static` method on `MenuScene` invoked from `Level01Scene` and `LevelScene` — coupling a presentation class as a domain-state writer.
* **Refactoring Directive:**
  1. Introduce `ProgressionRepository` in `src/persistence/repositories/progressionStat.ts` (the file already exists — extend it). Persist unlock state as a `ProgressionStat` row keyed by `(studentId, levelNumber)`, replacing the `localStorage` key.
  2. Introduce `MarkLevelCompleteUseCase` and `GetUnlockedLevelsUseCase` in the application layer; both `MenuScene` and the level scenes call the use case, never write progression directly.
  3. Delete `MenuScene.markLevelComplete` (the static method); presentation classes must not be domain writers. Adopt the Mediator pattern via the application layer.
  4. Migration step: on first run after the refactor, copy any existing `localStorage` `unlockedLevels:*` keys into Dexie, then delete the `localStorage` keys (one-time migration use case).

---

### src/scenes/MenuScene.ts (secondary)
* **Violation:** Data Access Contamination — direct repository import from a presentation scene to derive a domain concept.
* **Location:** Lines 365–384 — `_openLevelChooser()` does `await import('../persistence/repositories/session')` and iterates `sessions.listForStudent(...)` to compute "any closed session counts as completing that level."
* **Consequence:** The "completion" rule is a domain policy, not a UI concern. Today it is "any closed session"; tomorrow it might be "session with accuracy ≥ 0.7" or "BKT mastery ≥ 0.85". Each policy change requires editing presentation code. The scene also makes the policy invisible to property-based tests of the engine.
* **Refactoring Directive:**
  1. Define `LevelUnlockPolicy` in `src/engine/` as a pure function: `(sessions: Session[], masteries: SkillMastery[]) => Set<LevelId>`. Unit-test it.
  2. Wrap it in `GetUnlockedLevelsUseCase` (application layer) which fetches `sessions` and `masteries` via repositories, then calls the policy.
  3. The scene calls only the use case — no Dexie awareness, no policy logic.

---

### src/engine/misconceptionDetectors.ts
* **Violation:** Domain Layer Purity — domain functions perform infrastructure side effects (`crypto.randomUUID()` and `Date.now()`).
* **Location:**
  - `crypto.randomUUID()` — lines 38, 83, 117, 164, 206 (each detector mints an ID inline).
  - `Date.now()` — lines 41–42, 86–87, 120–121, 167–168, 209–210 (each detector stamps `firstObservedAt` / `lastObservedAt` inline).
* **Consequence:**
  1. Detectors are not deterministic — two consecutive calls with the same `attempts` array produce different `MisconceptionFlag.id` values. This breaks property-based testing, makes flag deduplication ambiguous, and complicates replay/diffing of student histories.
  2. `Date.now()` ties the engine to wall-clock time. Tests must mock the global clock; backfilled / imported data carries the import time, not the actual observation time.
  3. The engine is supposedly pure (per its own header comment in `bkt.ts`: "No Dexie, no Phaser, no side effects"), but `misconceptionDetectors.ts` silently violates that promise.
* **Refactoring Directive:**
  1. Refactor each detector to accept a `ports: { idGen: () => string; clock: () => number }` argument. Pass real implementations from the application layer; pass deterministic fakes from tests. (Dependency Injection / Ports pattern.)
  2. Alternative cheaper fix: each detector returns `Omit<MisconceptionFlag, 'id' | 'firstObservedAt' | 'lastObservedAt'>` — let the application layer stamp identity and timestamps. This keeps the engine signature short and the engine pure.
  3. Add an explicit `// PURE — NO SIDE EFFECTS` invariant comment at the top of `engine/`-layer files and a lint rule forbidding `crypto`, `Date`, `Math.random`, `window`, `document`, `console`, `localStorage`, and `fetch` in `src/engine/**`.

---

### src/engine/selection.ts
* **Violation:** Domain Layer Purity — non-deterministic RNG inside a domain function.
* **Location:** Line 87 — `function pickRandom<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]!; }` invoked from `selectNextQuestion` (lines 59, 63, 66).
* **Consequence:** `selectNextQuestion` is documented as a "Pure function" (line 2) but is non-deterministic. Tests can't assert a specific selection without monkey-patching `Math.random`. Replay of a student's session can't reproduce the exact question shown.
* **Refactoring Directive:**
  1. Inject an RNG port: `export function selectNextQuestion(args: SelectionArgs & { rng?: () => number }): QuestionTemplate | null`. Default to `Math.random` to preserve current behavior; tests pass a seeded PRNG.
  2. Long-term: store the RNG seed on the `Session` aggregate so a session is exactly reproducible (relevant for educational-research replay).

---

### src/scenes/* (cross-cutting)
* **Violation:** Infrastructure leakage repeated in every scene — `window.matchMedia('(prefers-reduced-motion: reduce)')` is duplicated.
* **Location:**
  - `Level01Scene.ts:1180` (`checkReduceMotion`)
  - `LevelScene.ts:873` (`checkReduceMotion`)
  - `MenuScene.ts:767` (`checkReduceMotion`)
  - `PreloadScene.ts:130` (`checkReduceMotion`)
* **Consequence:** Five copies of the same browser-API call. Any future enhancement (caching, listening for changes, integrating with the `prefs.reduceMotion` Dexie record) requires editing all five sites. Inconsistent fallbacks (some try/catch around `matchMedia`, some don't).
* **Refactoring Directive:**
  1. Extract `src/lib/accessibility.ts` exporting `prefersReducedMotion(): boolean`. Inject (or import) into every scene that needs it.
  2. Reconcile with the persisted `DeviceMeta.preferences.reduceMotion` value — the OS-level media query should be the *default*, but the user toggle in `SettingsScene` should override. Today the two signals are not coordinated.

---

### src/scenes/Level01Scene.ts (incremental — dynamic imports)
* **Violation:** Dependency Direction obfuscation — using `await import('../persistence/...')` inside methods to defer module resolution and dodge circular-import warnings, instead of fixing the underlying coupling.
* **Location:**
  - Lines 187, 256, 282, 287, 297, 312, 313, 648, 654, 658, 805, 914, 915, 953, 954, 1007, 1011, 1149.
  - Same pattern repeats in `LevelScene.ts` (lines 149, 164, 383, 393, 564, 600, 603, 604, 637, 638, 671, 672, 726, 731, 842).
* **Consequence:**
  1. Static dependency tools (madge, dpdm, ts-prune, IDE rename refactors) cannot trace these edges. Renaming a repository file or its export will not flag the scene as broken until runtime.
  2. The dynamic-import pattern is being used to *hide* the SoC violation rather than to enable code-splitting (the scenes are loaded eagerly anyway).
  3. Bundle-splitting heuristics will be unable to optimize repository chunks because they appear deferred at every call site.
* **Refactoring Directive:**
  1. After the application layer is introduced and scenes no longer depend on repositories, replace every `await import('...')` with a top-of-file static import.
  2. Add an ESLint rule `no-restricted-syntax` that forbids dynamic imports of `src/persistence/**` and `src/engine/**` from `src/scenes/**`. This makes the architecture self-policing.

---

### src/scenes/BootScene.ts
* **Violation:** Acceptable per C5 — `localStorage` use is whitelisted for `lastUsedStudentId` only. **No new violation introduced.** Logged for completeness.
* **Location:** Lines 74, 84, 101.
* **Consequence:** None — within constraint envelope.
* **Refactoring Directive:** Leave as-is. Optionally encapsulate the read/write in `src/persistence/lastUsedStudent.ts` (already exists — verify Boot uses it instead of raw `localStorage` calls). If yes, this finding closes itself.

---

## Dependency-Direction Audit

| From → To | Status | Evidence |
|---|---|---|
| `engine/` → `persistence/` | ✅ clean | grep: 0 imports |
| `engine/` → `scenes/` | ✅ clean | grep: 0 imports |
| `engine/` → `phaser` | ✅ clean | grep: 0 imports |
| `validators/` → `persistence/` | ✅ clean | grep: 0 imports |
| `validators/` → `scenes/` | ✅ clean | grep: 0 imports |
| `persistence/` → `scenes/` | ✅ clean | grep: 0 imports |
| `persistence/` → `engine/` | ✅ clean | grep: 0 imports (good — the inverse direction would invert ports) |
| `scenes/` → `persistence/` | 🔴 violated | every level scene imports repositories directly (see Level01Scene, LevelScene, SettingsScene findings) |
| `scenes/` → `engine/` | 🔴 violated | scenes call `updateMastery`, `runAllDetectors` directly (should be through application use cases) |
| `engine/` → infrastructure (`crypto`, `Date`, `Math.random`) | 🔴 violated | misconceptionDetectors.ts, selection.ts |

No circular dependencies detected at the directory level. The architectural fault is **missing-layer**: there is no Application layer, so presentation scenes have absorbed orchestration that they should be delegating.

---

## Summary of Patterns Cited for Refactor

| Pattern | Where to apply |
|---|---|
| Hexagonal / Ports & Adapters | Inject repositories and engine ports into use cases instead of `await import()` calls inside scenes |
| Use Case (Application Service) | New `src/application/` layer wrapping every cross-repo orchestration currently embedded in scenes |
| Strategy | `ValidationService` over `validatorRegistry`; `LevelUnlockPolicy` for unlock derivation |
| Factory | `SessionFactory` for `Session` aggregate construction (currently inline in scenes) |
| Repository (extension) | `ProgressionRepository` to replace `localStorage` unlock state per C5 |
| Facade | `src/persistence/index.ts` exposes only operations, never the raw `db` handle |
| Mediator | Application layer mediates between scenes and persistence; no presentation class is a domain-state writer |
| Dependency Injection | Inject `idGen`, `clock`, `rng` into engine functions to restore purity |

---

## Priority Index

| ID | Layer impact | Severity | Effort |
|---|---|---|---|
| F-01 — Level01Scene orchestration bloat | Presentation / Domain / Data | 🔴 Critical | Large (introduces application layer) |
| F-02 — LevelScene duplicate orchestration | Presentation / Domain / Data | 🔴 Critical | Large (closes with F-01) |
| F-03 — SettingsScene direct `db` access | Presentation / Data | 🟡 High | Small (1 use case) |
| F-04 — MenuScene `localStorage` for unlock | Presentation / Data | 🔴 Critical (C5 breach) | Medium |
| F-05 — MenuScene direct sessionRepo + policy inline | Presentation / Domain | 🟡 High | Small (after F-04) |
| F-06 — misconceptionDetectors side effects | Domain | 🟡 High | Small (port injection) |
| F-07 — selection.ts non-determinism | Domain | 🟢 Medium | Small |
| F-08 — reduce-motion duplicated | Presentation | 🟢 Medium | Trivial |
| F-09 — Dynamic imports hiding deps | Presentation | 🟡 High | Closes with F-01/F-02 |

---

*Audit complete. File path: `PLANS/soc_audit_findings.md`. Re-run after each refactor pass; append new findings as separate dated sections.*
