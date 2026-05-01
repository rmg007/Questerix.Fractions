# Plan: Code Quality & Architectural Hardening — Questerix Fractions

**Status:** Awaiting approval
**Last updated:** 2026-05-01
**Audit lens:** Principal Software Architect (Architectural Cohesion · Computational Performance · Defensive Engineering · Modularity & Future-Proofing)
**Scope boundary:** No new features. No framework changes. Architecture, code quality, defensive engineering, and test rigor only.

---

## Context

This plan is the synthesis of three deep audits run on 2026-05-01 (scene-layer forensics; engine/validators/persistence rigor; sprint/bundle context). It complements — does not replace — three approval-pending plans already on disk:

- `master-plan-2026-04-26.md` — sprint backlog; **owns decision D-4** (Level01Scene sunset, currently blocked on user input)
- `harden-and-polish-2026-04-30.md` — 48 file:line-precise risk items across 9 dimensions
- `work-queue-2026-04-30.md` — P1 (OTel/Sentry lazy imports) and P4 (C5 → Dexie, in flight per commit `8f11c90`)

The new material this plan adds: **architectural pushback that the prior plans avoid**. Where the existing plans treat symptoms (kill the localStorage key, fix the bug, lazy-load the chunk), this plan names the structural causes and proposes seam-level remediation.

---

## Audit methodology

Four dimensions, applied in the order they appear in the audit prompt. Findings carry severity (CRITICAL / HIGH / MEDIUM / LOW), file:line citation, and a remediation phase reference. **No finding is included unless it carries a concrete remediation** — diagnosis without prescription is noise.

---

## Executive summary

The codebase is **healthier than it looks at first glance**. The pure layers — validators (`src/validators/`), BKT engine math (`src/engine/bkt.ts`), persistence repositories (`src/persistence/repositories/`) — are well-engineered: pure functions, branded ID types, property tests with `fast-check`, consistent repo pattern, lazy-loaded telemetry. TypeScript strictness is enforced and largely respected (7 `any` uses across 132 files, all defensible at the call sites).

**The architectural risk concentrates in three seams:**

1. **Scene layer** — `Level01Scene.ts` (1604 LOC) and `LevelScene.ts` (1155 LOC) share **9 method clusters with ~500 LOC of near-verbatim duplication** (45% overlap). Each scene independently owns ≥7 responsibilities (question loop, validation, attempt recording, mastery update, hint coordination, feedback overlay, summary, transitions). This is a textbook SRP violation that has produced two co-evolving forks of the same logic. **Decision D-4 (sunset Level01Scene) is overdue.**

2. **Engine ↔ Persistence boundary** — `src/engine/ports.ts` was added in commit `3dd038b` ("Phase 2 partial — engine port interfaces"). **Adoption is partial.** Engine code still reaches for global side-effects (`Math.random` in `selection.ts:86-88`, `crypto.randomUUID()` and `Date.now()` in `misconceptionDetectors.ts:9-15`), and scenes still import Dexie repositories directly. The DIP abstraction exists; it is just not wired through. The result: engine is non-deterministic (cannot replay a learning session), and the architecture lies about its own dependency direction.

3. **Pipeline parity contract** — TS validators (`src/validators/`) are hand-mirrored in Python (`pipeline/validators_py.py`) with **no codegen, no shared schema, and no CI gate**. Of 15 validator variants, only 5 have parity fixtures (33% coverage). `.github/workflows/ci.yml` does not invoke `pipeline/parity_test.py`. Every validator edit silently risks parity drift.

### Three architectural recommendations (substantive pushback)

These are the plan's load-bearing positions. The prior plans hedge on each; this plan does not.

- **A1 — Sunset `Level01Scene.ts`.** Path B from my prior synthesis ("keep both scenes with a shared `QuestionLoopController`") was a hedge that preserves the duplication risk over time. Recommendation: **resolve D-4 as Path A**. Migrate L1 to `LevelScene` via `LEVEL_META`; delete `Level01Scene.ts` (1604 LOC removed, no replacement). Rationale: a "shared controller" is structurally indistinguishable from "the LevelScene path with L1 entered into the meta table" — the latter is simpler and removes the parallel scaffold instead of formalizing it. **KISS over extracted abstraction.**

- **A2 — Replace Python parity with a single executable contract.** Hand-mirroring TS validators in Python is a permanent labor tax with negative leverage: every validator edit means writing it twice, every CI gap means silent drift. Three options ordered by elegance: (a) move the pipeline's validation step to TypeScript (the pipeline's *content generation* stays in Python; only the validation step moves), (b) execute TS validators from Python via Pyodide at pipeline time, (c) generate Python from TS via codegen. **Recommendation: option (a).** It eliminates parity entirely rather than enforcing it.

- **A3 — Enforce engine dependency direction at lint level.** Adoption of `engine/ports.ts` is voluntary today. Make it mandatory: add an `eslint-plugin-import` rule (or a custom rule) that **fails the build if `src/engine/*` imports from `src/persistence/*`, `src/scenes/*`, or calls `Math.random` / `Date.now()` / `crypto.randomUUID` directly**. The lint rule is the architecture; without it, the architecture is a suggestion.

---

## 1. Architectural Cohesion

Adherence to SOLID, DRY, KISS. Findings ordered by severity.

### 1.1 SRP — Scene god-objects (CRITICAL)

`Level01Scene.ts` (1604 LOC) and `LevelScene.ts` (1155 LOC) each own **at least seven independent responsibilities**: question selection, user-input validation, attempt recording, BKT mastery update, hint ladder coordination, feedback overlay rendering, summary screen, scene transition, and progress-bar maintenance. Concrete duplication map (cluster → file:line in each scene):

| Cluster | Level01Scene | LevelScene | Status |
|---|---|---|---|
| Question loop | `:623-662` (BKT-aware pool) | `:215-323` (rotation) | divergent strategies for the same problem |
| Validation | `:869-951` | `:504-561` | duplicated |
| Progress increment | `:1080-1097` | `:717-735` | duplicated |
| Attempt recording | `:1276-1428` (152 LOC) | `:899-1019` (120 LOC) | ~80% identical |
| Mastery update | `:1343-1397` | `:938-990` | duplicated |
| Hint ladder | `:1099-1192` | `:737-830` | duplicated |
| Feedback overlay | `:1024-1078` | `:563-612` | duplicated |
| Summary screen | `:1445-1535` | `:1023-1084` | duplicated |
| Transition routing | `:1514` (hardcoded `levelNumber: 2`) | `:1055` (dynamic) | symptom of the duplication |

**Remediation:** Phase 3 — sunset `Level01Scene` (recommendation A1). Path B (`QuestionLoopController` extraction across both scenes) is the fallback if D-4 resolves against sunset.

### 1.2 SRP — `misconceptionDetectors.ts` (HIGH)

The single file at `src/engine/misconceptionDetectors.ts` mixes three concerns:
- ID generation infrastructure (`async IIFE` for nanoid loading at `:9-15`, plus `crypto.randomUUID()` calls at `:48,103,137,192`)
- 16 detector functions (one per misconception ID)
- A sequential aggregator `runAllDetectors()` at `:785-849`

**Remediation:** Phase 4 — extract `src/engine/misconceptionRegistry.ts` (data: rule table mapping `MC-XXX-NN` → predicate), `src/engine/misconceptionRunner.ts` (orchestration), and inject the ID generator. **Substantive pushback:** 16 hand-written detector functions are essentially a rule engine implemented as code. They should be data — a declarative table interpreted at runtime. Adding a misconception becomes a row, not a function. See Phase 4.2.

### 1.3 OCP — Open/Closed violations (MEDIUM)

- `src/scenes/utils/levelRouter.ts:42-43` hardcodes a branch for `validator.order.withRuleExplanation`. Adding a new validator variant requires modifying this file rather than registering a new entry. **Fix (Phase 8):** convert to a metadata-driven factory keyed by `validatorId`.
- `src/engine/selection.ts` hardcodes `ZPD_LOW = 0.4` and `ZPD_HIGH = 0.85` as module-private constants. Strategy variation requires modifying the function body. **Fix (Phase 4):** accept `SelectionPolicy` as a parameter; default to ZPD bands.

### 1.4 ISP — Fat interfaces (MEDIUM)

- The `Interaction` interface (`src/scenes/interactions/types.ts`, 27 LOC) is implemented by all 10 archetypes. Several archetypes (e.g., `EqualOrNotInteraction` at 113 LOC) implement `showVisualOverlay` and `onHintRequest` only because the interface demands it, not because the archetype semantically needs them.
- `AnyValidatorRegistration` in `src/validators/registry.ts:20` is a discriminated-union-flattened-to-`any` to defeat type variance. Callers receive `AnyValidatorRegistration | undefined` and never narrow before invoking.

**Remediation:** Phase 8 — segregate `Interaction` into `MountableInteraction`, `HintAware`, `OverlayCapable`. Replace `AnyValidatorRegistration` with a phantom-typed lookup that requires the caller to specify the archetype.

### 1.5 DIP — Dependency direction violated by engine layer (HIGH)

`src/engine/ports.ts` (added in commit `3dd038b`) defines abstract ports for the engine to consume. **Adoption is partial:**
- `src/engine/selection.ts:86-88` calls `Math.random` directly (concrete dependency on a global).
- `src/engine/misconceptionDetectors.ts:12` uses `Date.now()` in a fallback path (concrete dependency on a global).
- `src/engine/misconceptionDetectors.ts:48,103,137,192,712` use `crypto.randomUUID()` directly.
- Scenes (`Level01Scene.ts`, `LevelScene.ts`, `MenuScene.ts`) import Dexie repositories directly rather than receiving them via injection.

**The architecture lies about itself.** `engine/ports.ts` declares a clean dependency direction; the actual import graph violates it. **Remediation (Phase 2 + recommendation A3):** add an ESLint rule that fails the build on `engine/*` → `persistence/*` imports and on direct `Math.random` / `Date.now()` / `crypto.*` calls inside `engine/*`. Inject all I/O.

### 1.6 DRY — Duplications outside the scene layer (MEDIUM)

- `deriveLevelGroup()` duplicated at `src/curriculum/seed.ts:24-36` and `src/persistence/repositories/questionTemplate.ts:19-26` (per harden R14).
- Skill-ID mapping duplicated at `src/scenes/MenuScene.ts:75-78` and `src/scenes/LevelMapScene.ts:56-59`.
- The TS↔Python validator hand-mirror in `pipeline/validators_py.py` is the largest DRY violation in the codebase: 13 validator implementations × 2 languages × N parity fixtures, with no codegen.

**Remediation:** Phase 8 (extract `levelGroup` and `skillMapping` helpers) and Phase 9 (eliminate Python parity per recommendation A2).

### 1.7 KISS — Overengineered constructions (LOW–MEDIUM)

- `misconceptionDetectors.ts:9-15` async IIFE for nanoid loading is overengineered for a pure-function module. Synchronous import or constructor injection is simpler and testable.
- The dual-file curriculum sync (`public/curriculum/v1.json` ↔ `src/curriculum/bundle.json`, gated by `npm run build:curriculum`) has invariant-by-build-step semantics. A single source plus a build symlink would be both simpler and harder to violate.
- `as unknown as` and `as never` casts at `Level01Scene.ts:752`, `seed.ts:202`, `questionTemplate.ts:38`, `LevelScene.ts:525` work around type-system limitations rather than fixing the underlying type. They hide complexity rather than removing it. **Remediation:** Phase 8 — replace with discriminated unions or type-narrowing helpers.

### 1.8 Leaky abstractions (HIGH)

- `ValidatorResult.misconceptionId` is typed `string` (`src/types/validator.ts:22`) but the comment specifies the `MC-XXX-NN` pattern. The type system does not enforce the contract; a downstream consumer can pass any string. **Remediation:** introduce branded `MisconceptionId` per the existing branded-ID pattern in `src/types/branded.ts`.
- `localStorage` access bypasses the persistence abstraction at `Level01Scene.ts:1435,1477`, `MenuScene.ts:434-441`, and `src/lib/log.ts:40,113,118,122` (the last is harden R27). Each is a concrete dependency on a browser global that should route through a repository.
- `seed.ts:202` casts `templatesWithGroup as any` to satisfy `Dexie.bulkPut`. Dexie's table types should not surface this leak; the cast hides a real type mismatch (per harden R15).

**Remediation:** Phase 5 (close all localStorage uses except the documented `lastUsedStudentId` exception, then evaluate whether even that can move to IndexedDB) and Phase 8 (brand `MisconceptionId`, fix the Dexie cast).


## 2. Computational Performance

### 2.1 Per-attempt write fan-out (MEDIUM)

A single user submission triggers an unbatched sequence of IndexedDB writes:
1. `attemptRepo.add(...)` — one transaction
2. `hintEventRepo.add(...)` — one transaction (if a hint was used)
3. `skillMasteryRepo.upsert(...)` — read-modify-write, two transactions
4. `misconceptionFlagRepo.add(...)` — one transaction per detector that fires (potentially multiple)

On slow Android Chrome with throttled disk, this can serialize to 100–250 ms of post-submit latency before the feedback overlay is visually consistent. The compound index `[archetype+submittedAt]` (db.ts:112,130, added in S1-T6) accelerates reads but does not coalesce writes.

**Remediation (Phase 6.3):** wrap the post-submit sequence in a single Dexie `transaction()`. Acceptance: under 50 ms aggregate write latency on a 4× CPU-throttled Chromium profile.

### 2.2 Misconception detector fan-out (LOW–MEDIUM)

`runAllDetectors()` at `misconceptionDetectors.ts:785-849` invokes 16 detectors sequentially per submit. Several detectors independently re-walk the recent attempt history (lookback varies, ~5–10 attempts), each making a Dexie call. **The work is O(detectors × history) where O(1) — fetch once, pass into each detector — would suffice.**

**Remediation (Phase 4.1):** restructure the runner to fetch the history once (`recentAttempts: Attempt[]`), then pass the snapshot to each detector. Detectors become pure functions over a snapshot (also a purity win — see §1.5).

### 2.3 Scene mount/unmount on every level transition (LOW)

Phaser scene transitions destroy and re-instantiate the scene's `GameObjects`. Per `levelTheme.ts` and the documented ~500 ms transition, a 9-level run does ~4.5 s of pure scene churn. This is acceptable for the K–2 audience but is the single largest opportunity if perceived latency becomes a problem.

**Remediation (deferred — not in this plan unless instrumented as a problem):** consider a persistent `LevelHostScene` that holds the question loop and reskins for level transitions. Out of scope for the current plan; flagged for the master backlog.

### 2.4 Memory leak across scene transitions (CRITICAL — already in harden R7)

`Level01Scene.preDestroy()` (`:1331-1338`) does not destroy four child components. Each scene transition leaks ~N ARTrees / event listeners. Over a 9-level session, this compounds.

**Remediation:** harden R7 — already enumerated; sequenced into Phase 0.5 of this plan.

### 2.5 Bundle composition (MEDIUM — already in work-queue P1)

Bundle reality check from the bundle-watcher run on 2026-05-01:

- Total gzipped JS: **606 KB / 1024 KB** (59% of budget — pass)
- Largest chunks: `phaser-D169srp8.js` 350 KB gz · `prod-B5bLN-HE.js` 142 KB gz · `scenes-BBSZqk8n.js` 39 KB gz · `dexie-CEiZsXz7.js` 31 KB gz
- **OTel/Sentry strings appear in 8 chunks including `prod-*.js` (142 KB)** — the lazy-import boundary is leaking.

**Remediation (Phase 7):** convert observability to true lazy boundaries (`() => import('@sentry/browser')` inside guarded init), and add a CI assertion that fails the build if `@sentry/*` or `@opentelemetry/*` strings appear in the main entry bundle. Quantified target: main bundle ≤ 560 KB gzipped (current 606 minus expected ~50 KB telemetry win).

### 2.6 Test runtime headroom (LOW — informational)

Unit + integration tests: **41 files, 372 tests, 21.39 s, 100% green**. Plenty of headroom. Coverage gate addition (Phase 6.4) will not push runtime above 30 s.


## 3. Defensive Engineering

Resilience under failure. Many of the most severe items here are already enumerated in `harden-and-polish-2026-04-30.md` — this plan does not redraft those, but **does sequence them by failure-blast-radius rather than by audit dimension**, which the harden plan does not.

### 3.1 BUG-02 — state-mutation ordering (HIGH; root cause located)

`Level01Scene.ts:1035` calls `progressBar.setProgress(this.attemptCount + 1)` *before* `this.attemptCount` is incremented at `:1082`. The displayed progress advances by one but the underlying counter does not, so the session-complete check at `:1091` never triggers and the student is "stuck at 0/5."

**This is a class-invariant violation**, not a logic bug. The invariant "displayed value ≡ counter value" is maintained nowhere; the bug is the natural consequence of allowing a UI write to read a future state.

**Remediation (Phase 1.1):** move `++this.attemptCount` to the top of `onCorrectAnswer`, before any UI write. Acceptance: assertion in unit test that after N submissions, `progressBar.value === this.attemptCount`.

### 3.2 G-C7 — post-completion routing has no guard (HIGH; root cause located)

`Level01Scene.ts:1513-1517`:

```ts
onPlayAgain: () => fadeAndStart(this, 'Level01Scene', { ... }),
onNextLevel:  () => fadeAndStart(this, 'LevelScene', { levelNumber: 2, ... }),
```

After a student completes L1, the `SessionCompleteOverlay` shows both buttons. The "Play Again" button re-enters Level01Scene, which behaves identically and offers the same overlay — a closed loop. There is no guard that hides "Play Again" once `completedLevels` includes 1, nor a guard that re-routes "Play Again" to L2 once L1 is mastered.

**Remediation (Phase 1.2):** in `SessionCompleteOverlay`, hide "Play Again" when `completedLevels.includes(currentLevel)`; alternatively, route `onPlayAgain` to `LevelScene{levelNumber: nextLevel}` post-completion. Acceptance: an E2E test that completes L1 and asserts the next start is L2 (not L1).

### 3.3 Session creation silent collapse (CRITICAL — harden R6)

`Level01Scene.ts:314-379, 1022`: session creation can fail silently, producing a 30-minute window of orphaned attempts with no parent session. **Remediation:** harden R6, sequenced as Phase 0.5.

### 3.4 Per-write `QuotaExceededError` not handled (CRITICAL — harden R9)

Every repository wraps Dexie in `try/catch` and returns falsy on error. **This silently swallows quota errors**, the single most likely failure mode for an offline-first PWA on a low-storage device. The student's progress vanishes with no signal.

**Remediation:** Phase 7.5 — surface quota errors to the error reporter (now lazy-loaded) and present a recoverable UI affordance. Acceptance: deliberate `QuotaExceededError` injection in test surfaces a toast and does not lose the in-flight attempt.

### 3.5 Curriculum loader has no per-row validation (HIGH — harden R19)

`src/curriculum/loader.ts:80-121` deserializes JSON and trusts it. A malformed row (missing `payload`, missing `prompt`) crashes `loadQuestion` with no recovery. **Remediation:** Phase 7.4 — Zod schema at the boundary; reject malformed rows with a structured error and skip-with-log.

### 3.6 Backup restore inserts unvalidated rows (HIGH — harden R29)

`src/persistence/backup.ts:125-210` writes restored rows directly into Dexie without schema validation. A maliciously or accidentally crafted backup file can corrupt the local store. **Remediation:** Phase 7.4 — Zod at the boundary; reject malformed entries; transactional restore (all-or-nothing).

### 3.7 Schema upgrade (v5 → v6) has no upgrade callback (MEDIUM)

`src/persistence/db.ts:176-204` declares a v6 schema that adds `levelProgression` to replace localStorage keys, but **provides no `.upgrade()` callback** to migrate existing localStorage data. Users on v5 who upgrade will have their `unlockedLevels:*` and `completedLevels:*` keys silently abandoned.

**Remediation (Phase 5.1):**

```ts
.version(6).stores({ ... }).upgrade(async (tx) => {
  for (const key of Object.keys(localStorage)) {
    if (key.startsWith('unlockedLevels:') || key.startsWith('completedLevels:')) {
      // parse, write to tx.levelProgression, delete localStorage key
    }
  }
});
```

Acceptance: integration test that pre-populates v5 localStorage, opens the v6 DB, asserts `levelProgression` rows exist and localStorage keys are gone.

### 3.8 `Math.random` in production engine code (MEDIUM)

`src/engine/selection.ts:86-88` uses `Math.random` directly. Consequences:
- A failing learning session cannot be replayed deterministically — debugging is harder than necessary.
- Property-based tests cannot pin the RNG and assert tie-break behavior.
- A/B experimentation on selection strategy cannot use a sequential test design that requires reproducible assignment.

**Remediation (Phase 4.3 + recommendation A3):** inject `rng: () => number` into selection. Default to `Math.random` at scene call sites; tests pass a seeded RNG. Add the lint rule that bans direct `Math.random` use inside `src/engine/`.

### 3.9 Detector silent fallthrough (MEDIUM)

`misconceptionDetectors.ts:785-849` runs 16 detectors sequentially with **no per-detector `try/catch`**. A single detector throwing aborts the entire run and the remaining detectors never fire. The error is not logged.

**Remediation (Phase 4.4):** wrap each detector invocation in `try/catch`; on failure, log the detector ID and the error to the (lazy-loaded) error reporter; continue running.

### 3.10 No global `window.error` handler (CRITICAL — harden R8)

`src/main.ts:6-13` installs an `unhandledrejection` listener but no `window.onerror` listener. Synchronous errors in scenes go to `console.error` only and do not reach the (lazy-loaded) Sentry reporter even when configured.

**Remediation:** harden R8, sequenced as Phase 0.5.


## 4. Modularity & Future-Proofing

Can the system grow without restructuring? For each candidate change, count the touch sites.

### 4.1 Adding a new archetype — change cost: 8 places (HIGH friction)

Today, introducing one new archetype requires edits in:
1. `pipeline/validators_py.py` (Python implementation)
2. `pipeline/fixtures/parity/<archetype>.json` (parity fixture, when CI gate is wired per Phase 0.2)
3. `src/validators/<archetype>.ts` (TS implementation)
4. `src/validators/registry.ts` (registration)
5. `src/scenes/interactions/<Archetype>Interaction.ts` (UI mount)
6. `src/scenes/interactions/index.ts` (export)
7. `src/scenes/utils/levelRouter.ts` (factory wiring)
8. `src/types/archetype.ts` (union extension)

Plus tests. **The archetype is fundamentally one concept but its definition is scattered across 8 files in 4 modules.**

**Remediation (Phase 8 — recommendation A2 path):** when the validation step moves to TS-only, items 1 and 2 collapse into items 3 and the standard test fixture. A future archetype lives at `src/validators/<archetype>.ts` plus `src/scenes/interactions/<Archetype>Interaction.ts` plus a single registry registration. **Touch sites drop from 8 to 3.**

### 4.2 Adding a new misconception — change cost: edit a 700-line file (HIGH friction)

Today, adding `MC-NEW-01` requires:
1. Documenting it in `docs/10-curriculum/misconceptions.md`
2. Writing a `detectMcNew01()` function in `misconceptionDetectors.ts` (already 850+ LOC)
3. Adding the call to `runAllDetectors()` aggregator
4. Branding the ID, ensuring no collision with existing IDs

The aggregator file is **append-only and unbounded**. At 30 detectors it will exceed 1500 LOC.

**Remediation (Phase 4.2 — substantive pushback):** detectors should be data, not code. Refactor to a `MisconceptionRule` table in `src/engine/misconceptionRules.ts`:

```ts
type MisconceptionRule = {
  id: MisconceptionId;
  appliesTo: ArchetypeKind[];
  predicate: (ctx: AttemptContext, snapshot: AttemptSnapshot) => boolean;
};
```

A rule interpreter at `misconceptionRunner.ts` walks the rule table once per submit. Adding a misconception is now a single-row addition in a single file. **Touch sites drop from 4 to 2.**

### 4.3 Adding a new selection strategy — change cost: rewrite a function (MEDIUM friction)

`src/engine/selection.ts` hardcodes ZPD bands and calls `Math.random` directly. Strategy variation requires modifying `selectNextQuestion`. **Remediation:** Phase 4.3 — extract `SelectionPolicy` interface; `selectNextQuestion(ctx, policy: SelectionPolicy)`; default policy is the current ZPD-band logic.

### 4.4 Adding a new device target — change cost: minimal (LOW friction)

Per C7, the responsiveness contract is 360–1024 px. Phaser handles most of the device adaptation; the touch surface is regulated by the a11y layer. No restructuring required for additional device targets within that range. **No remediation needed.**

### 4.5 Adding a new student progression metric — change cost: scattered (HIGH friction)

Today, "level unlocked" / "level completed" / "suggested next level" are **simultaneously** stored in:
- localStorage (Level01Scene.ts:1435,1477; MenuScene.ts:434-441)
- `levelProgression` Dexie store (per v6 schema, but no migration callback yet)
- BKT skill mastery (indirectly, via `MASTERY_THRESHOLD`)

Adding a new metric (e.g., "time-to-first-correct") would land in yet another shape unless the persistence story is consolidated.

**Remediation (Phase 5):** complete the localStorage → Dexie migration with an upgrade callback (per §3.7); make `levelProgressionRepo` the single read/write path; deprecate all scene-direct localStorage. **Touch sites for adding a new metric drop from 3 to 1.**

### 4.6 Pipeline-runtime contract is hand-mirrored (HIGH friction — recommendation A2)

The TS validator at `src/validators/partition.ts` and the Python validator at `pipeline/validators_py.py:partition` must remain semantically equivalent forever. There is no mechanism that enforces this **except a Python test suite that is not invoked in CI** (per audit §1.6).

The cost compounds with every validator change: developer must maintain TS, must mirror to Python, must add a fixture, must hope a teammate runs `pipeline/parity_test.py` locally. **At 13 validator variants today, this is a perpetual labor tax.**

**Recommendation A2 (Phase 9 — substantive pushback):** the TS and Python implementations should not coexist. The path of least entropy: move the *validation step of the pipeline* to TypeScript. The pipeline's *content generation* remains Python (Anthropic SDK, prompt orchestration) — only the post-generation validation that mirrors runtime semantics becomes TS. **One implementation, executed in both contexts.**

This eliminates parity rather than enforcing it. It also means the runtime can never drift from the pipeline because there is no second implementation to drift from.

### 4.7 Two scenes for one game (HIGH friction — recommendation A1)

`Level01Scene` and `LevelScene` solve the same problem two ways. Every behavioral change must be made twice. Decision D-4 has been pending since Sprint 0 planning and is the single highest-leverage architectural decision in the codebase.

**Recommendation A1 (Phase 3):** sunset Level01Scene. Defer to Path B only if the L1 special-cases (per `LEVEL_META`) cannot be expressed in the config-driven `LevelScene` — which the audit found no evidence of.


## 5. Risk inventory (consolidated)

Cross-section table. `H&P` denotes an item already enumerated in `harden-and-polish-2026-04-30.md` — this plan **sequences** rather than redrafts those items.

| #   | Severity | Dim | Issue                                                                                     | File:line                                       | Phase |
| --- | -------- | --- | ----------------------------------------------------------------------------------------- | ----------------------------------------------- | ----- |
| Q1  | CRITICAL | 1   | Two scenes own the same logic with ~500 LOC duplication (D-4 pending)                     | `Level01Scene.ts`, `LevelScene.ts`              | 3     |
| Q2  | CRITICAL | 3   | BUG-02: progress bar pre-increment violates UI/state invariant                            | `Level01Scene.ts:1035` vs `:1082`               | 1.1   |
| Q3  | CRITICAL | 3   | G-C7: post-completion routing loops L1                                                    | `Level01Scene.ts:1513-1517`                     | 1.2   |
| Q4  | CRITICAL | 3   | Memory leak — preDestroy doesn't destroy 4 components (H&P R7)                            | `Level01Scene.ts:1331-1338`                     | 0.5   |
| Q5  | CRITICAL | 3   | Session creation silent collapse (H&P R6)                                                 | `Level01Scene.ts:314-379, 1022`                 | 0.5   |
| Q6  | CRITICAL | 3   | No global `window.error` handler (H&P R8)                                                 | `src/main.ts:6-13`                              | 0.5   |
| Q7  | CRITICAL | 3   | `QuotaExceededError` not handled at call sites (H&P R9)                                   | `src/persistence/repositories/*.ts`             | 7.5   |
| Q8  | CRITICAL | 3   | iOS Safari TTS — missing `onvoiceschanged` (H&P R10)                                      | `src/audio/TTSService.ts:23-38`                 | 7     |
| Q9  | CRITICAL | 1,3 | C5 violation: `unlockedLevels:*` localStorage (H&P R13, in flight)                        | `src/scenes/MenuScene.ts:348-384`               | 5     |
| Q10 | HIGH     | 1   | Engine layer reaches for global side-effects despite `ports.ts`                           | `engine/selection.ts:86-88`, `engine/mc...:9-15`| 2,4   |
| Q11 | HIGH     | 1   | Validator parity hand-mirrored TS↔Python with no CI gate                                  | `pipeline/validators_py.py`, `ci.yml`           | 0.2,9 |
| Q12 | HIGH     | 1   | `misconceptionDetectors.ts` is 16 functions of pattern-matching (rule engine in code)     | `src/engine/misconceptionDetectors.ts`          | 4.2   |
| Q13 | HIGH     | 1   | `ValidatorResult.misconceptionId` is `string` not branded `MisconceptionId`               | `src/types/validator.ts:22`                     | 8     |
| Q14 | HIGH     | 3   | Curriculum loader has no per-row Zod validation (H&P R19)                                 | `src/curriculum/loader.ts:80-121`               | 7.4   |
| Q15 | HIGH     | 3   | Backup restore inserts unvalidated rows (H&P R29)                                         | `src/persistence/backup.ts:125-210`             | 7.4   |
| Q16 | HIGH     | 1,3 | localStorage `LOG` key violates C5 (H&P R27)                                              | `src/lib/log.ts:40,113,118,122`                 | 5     |
| Q17 | HIGH     | 4   | Adding an archetype touches 8 files (after A2: drops to 3)                                | (cross-cutting)                                 | 8,9   |
| Q18 | HIGH     | 4   | Adding a misconception requires editing 850-LOC file                                      | `src/engine/misconceptionDetectors.ts`          | 4.2   |
| Q19 | MEDIUM   | 2   | Per-attempt write fan-out — 4+ unbatched Dexie transactions                                | `Level01Scene.ts:1276-1428`, repos              | 6.3   |
| Q20 | MEDIUM   | 2   | Misconception runner re-fetches history per detector (O(d×h))                             | `misconceptionDetectors.ts:785-849`             | 4.1   |
| Q21 | MEDIUM   | 2,3 | OTel/Sentry leak into main bundle in 8 chunks (work-queue P1)                             | `src/lib/observability/*`                       | 7     |
| Q22 | MEDIUM   | 1   | OCP — `levelRouter.ts` hardcodes validator branch                                          | `src/scenes/utils/levelRouter.ts:42-43`         | 8     |
| Q23 | MEDIUM   | 1   | ISP — `Interaction` interface forces overlay/hint methods on all 10 archetypes            | `src/scenes/interactions/types.ts`              | 8     |
| Q24 | MEDIUM   | 1   | DRY — `deriveLevelGroup()` duplicated (H&P R14)                                           | `seed.ts:24-36`, `questionTemplate.ts:19-26`    | 8     |
| Q25 | MEDIUM   | 1   | DRY — skill-ID mapping duplicated                                                          | `MenuScene.ts:75-78`, `LevelMapScene.ts:56-59`  | 8     |
| Q26 | MEDIUM   | 3   | Detectors silently swallow throws — runner aborts, error not logged                       | `misconceptionDetectors.ts:785-849`             | 4.4   |
| Q27 | MEDIUM   | 3   | v5→v6 schema upgrade has no migration callback                                            | `src/persistence/db.ts:176-204`                 | 5.1   |
| Q28 | MEDIUM   | 3   | `Math.random` non-determinism blocks replay/test                                          | `src/engine/selection.ts:86-88`                 | 4.3   |
| Q29 | MEDIUM   | 4   | Adding a progression metric scattered across 3 stores                                     | (cross-cutting)                                 | 5     |
| Q30 | MEDIUM   | 1,3 | `as unknown as` and `as never` casts hide real type mismatches                            | 6+ sites                                        | 8     |
| Q31 | LOW      | 1   | KISS — async IIFE for nanoid in pure module                                                | `misconceptionDetectors.ts:9-15`                | 4.2   |
| Q32 | LOW      | 1   | KISS — dual-file curriculum sync invariant by build step                                  | `public/curriculum/v1.json`, `src/curriculum/...` | (deferred) |
| Q33 | LOW      | 3   | BKT edge cases: extreme priors, threshold-boundary not property-tested                    | `tests/unit/bkt.test.ts`                        | 6     |
| Q34 | LOW      | 3   | Detector unit tests: zero coverage for 16 detectors                                       | (no file)                                       | 4.5   |
| Q35 | LOW      | 4   | No CI coverage gate (engine/validators/persistence are pure — cheap to gate)              | `.github/workflows/ci.yml`                      | 6.4   |

**Severity rollup:** 9 CRITICAL, 9 HIGH, 12 MEDIUM, 5 LOW = 35 issues. (`harden-and-polish` independently lists 48; ~10 of those duplicate the items above and are sequenced via the H&P plan in Phase 9.)


## 6. Phased remediation plan

11 phases (Phase 0 through Phase 10). Each phase = its own dated branch (`<type>/2026-05-01-<slug>` per CLAUDE.md). One concern per branch.

### Phase 0 — Unblock (≈4 hr · parallel-safe)

| #   | Task                                                                                                                       | File:line / artifact                                  | Effort  |
| --- | -------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- | ------- |
| 0.1 | Resolve **D-4** (sunset Level01Scene). Default to **Path A** per recommendation A1. Document as **D-25** in decision log. | `docs/00-foundation/decision-log.md`                  | 30 min  |
| 0.2 | Wire parity tests in CI: add `pytest pipeline/parity_test.py` to `.github/workflows/ci.yml` after unit-test step.         | `.github/workflows/ci.yml`                            | 30 min  |
| 0.3 | Update `CLAUDE.md` "Active bugs" table: delete BUG-04 + G-E1 (already fixed); annotate BUG-02/G-C7 with located lines.    | `CLAUDE.md`                                           | 15 min  |
| 0.4 | Generate the 10 missing parity fixtures so the new CI gate has something to enforce.                                      | `pipeline/fixtures/parity/*.json`                     | 2 hr    |
| 0.5 | Sequence harden CRITICALs that are pure prerequisites: R6, R7, R8 (one PR, one branch).                                   | `Level01Scene.ts`, `src/main.ts`                      | 1 hr    |

**Acceptance:** D-25 written; CI fails on a deliberately broken parity fixture; `CLAUDE.md` reflects ground truth; 15 parity fixtures present; window.error handler installed; preDestroy cleanup present.

### Phase 1 — Bug fixes from located root causes (≈3 hr)

| #   | Task                                                                                                                       | File:line                                             | Effort  |
| --- | -------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- | ------- |
| 1.1 | **BUG-02 fix.** Move `++this.attemptCount` to before `showOutcome()`. Add unit-test assertion: after N submits, `progressBar.value === attemptCount`. | `Level01Scene.ts:1035`, `:1082`                       | 30 min  |
| 1.2 | **G-C7 fix.** Hide "Play Again" once `completedLevels.includes(currentLevel)`; route `onPlayAgain` to next level if mastered. | `Level01Scene.ts:1513-1517`, `SessionCompleteOverlay` | 30 min  |
| 1.3 | E2E spec: full L1 5-question flow asserts progress bar matches counter; "Keep Going" lands in L2.                         | new `tests/e2e/2026-05-01-sprint0-bugs.spec.ts`       | 1.5 hr  |
| 1.4 | Delete BUG-02 and G-C7 from `CLAUDE.md` and from `INDEX.md` blocker table.                                                 | `CLAUDE.md`, `PLANS/INDEX.md`                          | 15 min  |

**Acceptance:** Both bugs reproducible-then-fixed in CI; deletable from active bug list. Phase 1 ships independently of Phases 2+.

### Phase 2 — Architectural decoupling: enforce DIP (≈6 hr · enables Phase 4)

The **structural** fix for §1.5 and §3.8.

| #   | Task                                                                                                                       | File:line / artifact                                  | Effort  |
| --- | -------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- | ------- |
| 2.1 | Add ESLint rule `no-restricted-imports` in `src/engine/**` — fail on imports from `src/persistence/*`, `src/scenes/*`, `phaser`. | `.eslintrc.cjs` or equivalent                        | 1 hr    |
| 2.2 | Add ESLint rule banning direct calls to `Math.random`, `Date.now()`, `crypto.randomUUID` inside `src/engine/**`. Use `no-restricted-globals` + custom rule. | `.eslintrc.cjs`                                       | 1 hr    |
| 2.3 | Audit current violations and either (a) inject via `engine/ports.ts`, or (b) accept a transient `eslint-disable` with a `// MIGRATE: phase 4.x` comment that the lint rule downgrades to warning. | `src/engine/*.ts`                                     | 2 hr    |
| 2.4 | Verify `engine/ports.ts` interfaces cover: `RngPort`, `ClockPort`, `IdGeneratorPort`, `MasteryStorePort`, `AttemptHistoryPort`. Add missing ports. | `src/engine/ports.ts`                                 | 1 hr    |
| 2.5 | Production adapter wiring at scene mount — ensure scenes pass concrete adapters into engine entry points.                  | `src/main.ts`, scene constructors                     | 1 hr    |

**Acceptance:** A grep for `Math.random|Date.now|crypto.randomUUID` inside `src/engine/` returns zero unannotated occurrences; ESLint fails the build on a synthetic violation; `engine/ports.ts` covers the four side-effect axes (RNG, clock, IDs, persistence).

### Phase 3 — Sunset Level01Scene (≈14 hr · gated by D-25 from Phase 0.1)

The structural fix for Q1, Q17, and the bulk of §1.1 / §4.7.

| #   | Task                                                                                                                       | File:line / artifact                                  | Effort  |
| --- | -------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- | ------- |
| 3.1 | Add an L1 entry to `LEVEL_META`. Verify pipeline output for L1 conforms to the same shape as L2-L9.                       | `src/scenes/utils/levelMeta.ts`, `pipeline/output/level_01/all.json` | 2 hr    |
| 3.2 | Behind a feature flag (`?useLevelScene=1`), route L1 through `LevelScene` and verify parity. Run synthetic playtest.       | `src/main.ts`, scene registry                         | 3 hr    |
| 3.3 | Migrate Phase 1 bug fixes (BUG-02, G-C7) into LevelScene if not already present.                                          | `LevelScene.ts`                                       | 1 hr    |
| 3.4 | Switch the default route for L1 to `LevelScene`. Keep `Level01Scene` import as dead-code for one PR cycle (rollback safety). | `src/main.ts`                                         | 1 hr    |
| 3.5 | After 1-week soak, delete `Level01Scene.ts` (1604 LOC removed, no replacement). Remove the L1 special case from `levelRouter.ts`. | `src/scenes/Level01Scene.ts` (delete), `levelRouter.ts` | 1 hr    |
| 3.6 | Update CLAUDE.md source map; remove L1 from "active bugs"; mark D-4 closed.                                               | `CLAUDE.md`, `decision-log.md`                        | 30 min  |
| 3.7 | Move `Level01Scene.test.ts` and the `level01.spec.ts` E2E into a generic `level-flow.spec.ts` parameterized by `levelNumber`. | `tests/`                                              | 5 hr    |

**Acceptance:** No file in `src/scenes/` exceeds 800 LOC (currently `LevelScene.ts` is 1155 LOC; some Phase 3 logic absorbed will land in extracted helpers per Phase 8). `Level01Scene.ts` is deleted. The synthetic playtest passes with L1–L9 routed through a single scene.

**Fallback (Path B):** if D-25 resolves against sunset (e.g., for a known L1-specific accessibility reason that the audit missed), Phase 3 falls back to extracting `QuestionLoopController` per the interface drafted in the prior synthesis: `mount`, `validate`, `recordAttempt`, `updateMastery`, `onHintRequest`, `advance`, `summary`. Both scenes consume the controller. Effort: ≈18 hr (replaces Path A's 14 hr).


### Phase 4 — Engine: determinism + misconception data-ification (≈10 hr)

Structural fix for Q10, Q12, Q18, Q20, Q26, Q28, Q31, Q34.

| #   | Task                                                                                                                       | File:line / artifact                                  | Effort  |
| --- | -------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- | ------- |
| 4.1 | Restructure `runAllDetectors` to fetch `recentAttempts` once and pass the snapshot to each detector. Detectors become pure over (attempt, snapshot). | `misconceptionDetectors.ts:785-849`                   | 1.5 hr  |
| 4.2 | **Substantive refactor.** Extract `MisconceptionRule` table + interpreter. Move 16 detector predicates into a data table at `src/engine/misconceptionRules.ts`. Aggregator becomes a 30-LOC interpreter at `misconceptionRunner.ts`. | new files; gut `misconceptionDetectors.ts`            | 4 hr    |
| 4.3 | Inject `RngPort` into `selectNextQuestion`. Default policy stays ZPD-band; signature accepts `SelectionPolicy`.            | `src/engine/selection.ts:86-88`, `engine/ports.ts`    | 1.5 hr  |
| 4.4 | Wrap each rule predicate invocation in `try/catch` inside the runner. On failure, log via injected error reporter; continue. | `misconceptionRunner.ts`                              | 30 min  |
| 4.5 | Unit tests for all 16 misconception rules: each gets ≥1 positive + 1 negative case using a seeded snapshot.               | new `tests/unit/misconceptionRules.test.ts`           | 2 hr    |
| 4.6 | Property test for `selectNextQuestion`: with seeded RNG, identical inputs produce identical sequence.                     | extend `tests/unit/selection.test.ts`                 | 30 min  |

**Acceptance:** zero `Math.random | Date.now | crypto.*` inside `src/engine/` (Phase 2 lint enforces). Adding a new misconception is a single-row addition to `misconceptionRules.ts`. Coverage of misconception rules ≥ 90%. Detector run is deterministic given a seeded RNG.

### Phase 5 — Persistence consolidation + C5 closeout (≈5 hr)

Structural fix for Q9, Q16, Q27, Q29.

| #   | Task                                                                                                                       | File:line / artifact                                  | Effort  |
| --- | -------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- | ------- |
| 5.1 | Add `.upgrade()` callback to v6 schema that migrates `unlockedLevels:*` and `completedLevels:*` localStorage keys, then deletes them. | `src/persistence/db.ts:176-204`                       | 1.5 hr  |
| 5.2 | Add `suggestedNextLevel` to `levelProgression` shape and a repo method `setSuggestedNext(studentId, level)`. Migrate `Level01Scene.ts:1435,1477` writers. | `src/types/runtime.ts`, `levelProgression.ts`         | 1 hr    |
| 5.3 | Migrate `MenuScene.ts:434-441` localStorage reads to `levelProgressionRepo`.                                              | `MenuScene.ts`                                        | 30 min  |
| 5.4 | Migrate `src/lib/log.ts:40,113,118,122` `LOG` key off localStorage (per H&P R27). Either to IndexedDB or remove if not load-bearing. | `src/lib/log.ts`                                      | 1 hr    |
| 5.5 | Integration test: pre-populate v5 localStorage fixture, open the v6 DB, assert `levelProgression` rows match and localStorage keys are absent. | `tests/integration/2026-05-01-v5-to-v6.test.ts`       | 1 hr    |

**Acceptance:** `/c5-check` returns only `lastUsedStudentId` (the documented exception). `npm run test:integration` includes a v5→v6 migration test. The `levelProgressionRepo` is the single read/write path for level state.

### Phase 6 — Test pyramid + coverage gate (≈9 hr)

Structural fix for Q33, Q35; closes the scene-layer coverage gap.

| #   | Task                                                                                                                       | File:line / artifact                                  | Effort  |
| --- | -------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- | ------- |
| 6.1 | Add `data-testid` attributes for the 10 elements `level01.spec.ts` references; un-skip the file (or rewrite it as the parameterized `level-flow.spec.ts` from Phase 3.7). | scene files; `tests/e2e/level01.spec.ts`              | 2 hr    |
| 6.2 | Add canvas mock (`jest-canvas-mock`) per the TODO at `MenuScene.test.ts:5`. Enable scene mounts in Vitest.                | `vitest.config.ts`, `package.json`                    | 1 hr    |
| 6.3 | Wrap the post-submit Dexie sequence in a single `transaction()`. Bench the change on a 4× CPU throttled Chromium profile. | `src/persistence/repositories/*.ts`, scene attempt path | 2 hr    |
| 6.4 | Add Vitest coverage reporter. Set CI gate: **80% line coverage for `src/engine/`, `src/validators/`, `src/persistence/`** — these are pure layers; cheap to gate. Do **not** gate on scenes (Phaser is hard to instrument). | `vitest.config.ts`, `.github/workflows/ci.yml`        | 2 hr    |
| 6.5 | Add property tests for BKT extreme-prior and threshold-boundary cases.                                                     | `tests/unit/bkt.test.ts`                              | 1 hr    |
| 6.6 | One full-level happy-path Playwright spec: mount → answer 5 → advance → next level. Parameterize for L1, L5, L9.          | `tests/e2e/level-flow.spec.ts`                        | 1 hr    |

**Acceptance:** Unit test count ≥ 450 (currently 372). E2E `level01.spec.ts` un-skipped or replaced. CI fails below 80% coverage on the three pure layers. Post-submit write latency < 50 ms p95 in the CI bench.

### Phase 7 — Bundle, observability, and resilience (≈6 hr)

Structural fix for Q7, Q8, Q14, Q15, Q21.

| #   | Task                                                                                                                       | File:line / artifact                                  | Effort  |
| --- | -------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- | ------- |
| 7.1 | Convert `tracer.ts` and `errorReporter.ts` to true `() => import(...)` boundaries; verify no `@sentry/*` or `@opentelemetry/*` strings appear in `prod-*.js`. | `src/lib/observability/*`                             | 1.5 hr  |
| 7.2 | Extend `scripts/measure-bundle.mjs` to fail CI if telemetry packages appear in the main entry bundle. Quantified target: main bundle gzipped ≤ 560 KB. | `scripts/measure-bundle.mjs`, `.github/workflows/ci.yml` | 1 hr    |
| 7.3 | Apply harden R10: install `onvoiceschanged` listener for iOS Safari TTS.                                                   | `src/audio/TTSService.ts:23-38`                       | 30 min  |
| 7.4 | Add Zod schemas at curriculum loader (R19) and backup restore (R29) boundaries. Reject malformed entries; transactional restore. | `src/curriculum/loader.ts:80-121`, `src/persistence/backup.ts:125-210` | 2 hr    |
| 7.5 | `QuotaExceededError` handling at every repo write site. Surface to error reporter; attempt re-save; UI affordance.        | `src/persistence/repositories/*.ts`                   | 1 hr    |

**Acceptance:** `measure-bundle` enforces ≤ 560 KB main entry; CI assertion fails on telemetry leakage; deliberate `QuotaExceededError` injection produces a recoverable UI state, not silent data loss.


### Phase 8 — Type-system rigor + DRY pass (≈8 hr)

Structural fix for Q13, Q22, Q23, Q24, Q25, Q30.

| #   | Task                                                                                                                       | File:line / artifact                                  | Effort  |
| --- | -------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- | ------- |
| 8.1 | Brand `MisconceptionId` per the existing pattern in `src/types/branded.ts`. Add a smart constructor that validates the `MC-XXX-NN` shape. | `src/types/branded.ts`, `src/types/validator.ts:22`   | 1 hr    |
| 8.2 | Eliminate `as never`, `as unknown as`, `as any` casts at the 6+ identified sites. Replace with discriminated unions or type-narrowing helpers. | scattered (per H&P R5, R15)                           | 2 hr    |
| 8.3 | Convert `levelRouter.ts:42-43` hardcoded validator branch to a metadata-driven factory keyed by `validatorId`.            | `src/scenes/utils/levelRouter.ts`                     | 1 hr    |
| 8.4 | Segregate `Interaction` interface into `MountableInteraction` + optional `HintAware` + optional `OverlayCapable`. Update the 10 archetype implementations to declare the optional capabilities they provide. | `src/scenes/interactions/types.ts`, all 10 archetypes | 2.5 hr  |
| 8.5 | Extract `deriveLevelGroup()` to `src/curriculum/levelGroup.ts`; remove the duplicate. Extract `skillMapping` to `src/scenes/utils/skillMapping.ts`; remove the duplicate. | per H&P R14, audit Q25                                 | 1 hr    |
| 8.6 | Enable `noUncheckedIndexedAccess` in `tsconfig.json` (per H&P R41). Fix resulting type errors.                            | `tsconfig.json`                                       | 30 min  |

**Acceptance:** zero `as never | as unknown as | as any` outside well-commented test fixtures; `noUncheckedIndexedAccess` enabled and clean; `Interaction` interface segregated; new archetype registration is one row.

### Phase 9 — Pipeline parity re-architecture (≈12 hr · recommendation A2)

Structural fix for Q11, Q17. The single highest-leverage modularity win.

| #   | Task                                                                                                                       | File:line / artifact                                  | Effort  |
| --- | -------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- | ------- |
| 9.1 | Architectural decision (D-26): "Validation step of pipeline moves to TypeScript; content generation remains Python." Document trade-offs. | `docs/00-foundation/decision-log.md`                  | 1 hr    |
| 9.2 | Extract validator invocation to `pipeline/validate_step.ts`. Use `tsx` or `esbuild` to execute. Pipeline orchestration calls the TS step via subprocess. | new file; pipeline orchestrator                       | 4 hr    |
| 9.3 | Delete `pipeline/validators_py.py`. Delete `pipeline/parity_test.py` (no longer needed). Remove the parity-fixture authoring step. | (deletions)                                           | 30 min  |
| 9.4 | Update `.github/workflows/content-validation.yml` to invoke the TS validation step instead of Python parity. Keep schema validation Python-side (it is shape-only, not behavior-equivalent). | `.github/workflows/content-validation.yml`            | 1 hr    |
| 9.5 | Re-run all level pipelines end-to-end against the new validation step. Confirm `pipeline/output/level_NN/all.json` is byte-identical to the Python-validated version. | per-level pipeline run                                | 4 hr    |
| 9.6 | Update CLAUDE.md "Curriculum content pipeline" section to describe the new architecture.                                  | `CLAUDE.md`                                           | 30 min  |
| 9.7 | Decommission the `validator-parity-checker` subagent (no longer applicable).                                              | `.claude/agents/validator-parity-checker.md`          | 15 min  |

**Acceptance:** No Python validator code in the repo. CI no longer needs a parity gate. Adding an archetype touches 3 files instead of 8.

**Risk:** Phase 9 is the most invasive change in this plan. Sequence after Phases 0-8 are merged and stable. **If any concerns arise from D-26 review, defer Phase 9 indefinitely** — Phase 0.2 (parity tests in CI with full fixture coverage) is the conservative fallback that mitigates the same risk.

### Phase 10 — `harden-and-polish-2026-04-30.md` rollup (≈14 hr)

Approve and execute the residual items from `harden-and-polish-2026-04-30.md` not already absorbed into Phases 0–9. Roughly **38 of 48** items remain after this plan's overlap.

Sequence into 4 PRs by risk dimension:

1. **Type safety** (R1–R10 minus already-absorbed): kill `as never`, `as unknown as` at residual sites; further `noUncheckedIndexedAccess` cleanup.
2. **Concurrency** (R11–R20): Dexie transaction guards, race conditions in scene transitions, `deviceMeta` read-modify-write race (R16), schema upgrade re-index hooks (R17).
3. **A11y** (R21–R32): contrast (R11, R22, R23), focus order (R21, R24), skip link target (R12), missing testids (R30, R31, R32) — overlaps Phase 6.1.
4. **Dead code + housekeeping** (R33–R48): `validators/utils.ts` cleanup (R39), residual.

**Acceptance:** all 48 items in `harden-and-polish-2026-04-30.md` checked off or explicitly deferred with a documented reason.

---

## 7. Sequencing & branching

```
Phase 0  (unblock)
  ├─→ Phase 1  (bugs)            ─── shippable independently
  ├─→ Phase 2  (DIP enforcement) ─── enables Phase 4
  ├─→ Phase 5  (persistence)     ─── independent
  └─→ Phase 7  (bundle/resilience) ─── independent
                  ↓
              Phase 3  (sunset L01)         ← gated by D-25 from Phase 0.1
                  ↓
              Phase 4  (engine determinism) ← depends on Phase 2 lint enforcement
                  ↓
              Phase 6  (test pyramid + coverage gate)
                  ↓
              Phase 8  (type rigor + DRY)
                  ↓
              Phase 9  (pipeline parity re-arch) ← optional / deferrable
                  ↓
              Phase 10 (harden rollup)
```

Phases 0, 1, 2, 5, 7 are **parallel-safe** and can ship in any order. Phase 3 gates on D-25. Phase 4 gates on Phase 2's lint enforcement (otherwise the engine refactor lands without the rule that prevents regression). Phase 9 is **deferrable** — the conservative fallback is Phase 0.2 with full fixture coverage.

Each phase is its own dated branch:
- `fix/2026-05-01-bug02-gc7` (Phase 1)
- `refactor/2026-05-01-engine-dip` (Phase 2)
- `refactor/2026-05-01-sunset-l01` (Phase 3)
- ...etc.

Total effort estimate (Path A, all phases): **~91 hr / ~2.5 weeks for one engineer**.

Effort by sub-scope:
- Core code-quality work, Phases 0–8: **~65 hr** (~1.5 weeks)
- Including optional Phase 9 (pipeline TS migration): **~77 hr**
- Including Phase 10 (`harden-and-polish` rollup absorption): **~91 hr**

Two engineers can compress Phases 0, 1, 2, 5, 7 into the first week in parallel; the dependent chain (Phase 3 → 4 → 6 → 8) takes the second week serially.

---

## 8. Definition of Done

This plan is complete when:

1. **Architectural seams enforced.** ESLint fails the build on `engine/*` → `persistence/*` imports, on direct `Math.random | Date.now() | crypto.*` calls inside `engine/*`, and on `@sentry/* | @opentelemetry/*` strings in the main entry chunk.
2. **Two scenes have become one.** `Level01Scene.ts` is deleted (Path A) or both scenes consume a shared controller (Path B fallback). No file in `src/scenes/` exceeds 800 LOC.
3. **Engine is deterministic.** Seeded RNG produces a reproducible question sequence; misconception rules are data; detector unit-test coverage ≥ 90%.
4. **Persistence is consolidated.** `/c5-check` returns only `lastUsedStudentId`; v5→v6 migration callback is wired; all level state flows through `levelProgressionRepo`.
5. **Defensive boundaries are real.** Zod validation at curriculum loader and backup restore; `QuotaExceededError` handled at every write site; `window.error` listener installed.
6. **Tests are gated.** 80% line coverage on `engine/`, `validators/`, `persistence/`. Full-level happy-path E2E parameterized for L1, L5, L9. Unit tests ≥ 450.
7. **Bundle is gated.** Main entry ≤ 560 KB gzipped; CI assertion enforces.
8. **Pipeline parity is eliminated** (Phase 9, optional) **or fully gated in CI** (Phase 0.2 fallback).
9. **`CLAUDE.md` reflects ground truth.** Active bug list is empty. Source map is accurate. C5 exception list is current. Decision log includes D-25 (and D-26 if Phase 9 lands).
10. **All 48 items in `harden-and-polish-2026-04-30.md` are closed or explicitly deferred with reason.**

---

## 9. Risk register

| Risk                                                                                       | Mitigation                                                                                       |
| ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------ |
| Path B never gets to "delete `Level01Scene`" — both scenes drift again                    | Add CI lint counting duplicated method names across scene files; budget = 0.                    |
| Phase 2 lint rule breaks existing tests (engine reaches for globals during test setup)    | Default `RngPort` to `Math.random` at scene call sites; only seed in tests. Lint rule allows imports from `tests/`. |
| Phase 4.2 misconception rule refactor changes detector behavior                            | Snapshot tests on the *outputs* (flagged misconceptions) of a fixed attempt-history fixture before and after the refactor. |
| Phase 5 migration loses user state in v5→v6                                                | Stage migration in a feature branch with fixtures simulating both pre-v6 and post-v6 starting states. |
| Phase 9 (pipeline TS migration) introduces subtle semantic differences                     | Re-run all 9 levels through both pipelines; require byte-identical output before merging.       |
| Phase 10 expands scope beyond the 48 items                                                 | Hard-cap at the items listed in `harden-and-polish-2026-04-30.md`; new findings → new plan doc. |
| Plan duration exceeds 2 weeks; new sprint priorities arrive                                | Phases 0, 1, 2, 5, 7 are independently shippable. Pause at any sprint boundary without leaving work in an inconsistent state. |

---

## 10. Out of scope

Explicitly **not** in this plan:

- New features, new levels, new archetypes, new mechanics.
- Curriculum content edits (those flow through the pipeline per `curriculum-update-2026-04-30.md`).
- UX elevation work (owned by `ux-elevation-2026-04-30.md`).
- Audio system rework (owned by `audio-2026-04-30.md`).
- Backend, accounts, multi-student, parental view (locked out per C1, C2).
- Persistent `LevelHostScene` for cross-level continuity (§2.3 — flagged for the master backlog, not in this plan).
- Migrating `lastUsedStudentId` off localStorage (§1.8 noted; deferred — the C5 exception is documented and the cost of removing it is high).

---

## 11. Outputs

If approved, this plan produces:

1. `docs/00-foundation/decision-log.md` D-25 (Level01 sunset) and optionally D-26 (pipeline TS migration).
2. ~10 dated branches and PRs per the sequencing diagram in §7.
3. Updated `CLAUDE.md` (active bugs, source map, constraints exception list).
4. Updated `PLANS/INDEX.md` referencing this plan.
5. Closure of `harden-and-polish-2026-04-30.md` (Phase 10).

---

**End of plan.**

