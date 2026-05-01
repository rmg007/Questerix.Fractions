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

Four primary dimensions per the audit prompt (Architectural Cohesion · Computational Performance · Defensive Engineering · Modularity & Future-Proofing), plus a **fifth cross-cutting pass** (§4.5) covering security, PWA correctness, i18n readiness, observability conventions, and hidden coupling/state-management discipline. Findings carry severity (CRITICAL / HIGH / MEDIUM / LOW), file:line citation, and a remediation phase reference. **No finding is included unless it carries a concrete remediation** — diagnosis without prescription is noise.

The cross-cutting pass was added in v2 after three follow-up agent investigations; it surfaced 25 issues the v1 plan missed entirely, including 8 unpatched npm CVEs, 3 new C5 violations, and an undocumented session-crash recovery contract. **The cross-cutting findings significantly reshape the plan's risk profile**, which is why this v2 supersedes the original.

---

## Executive summary

The codebase is **healthier than it looks at first glance**. The pure layers — validators (`src/validators/`), BKT engine math (`src/engine/bkt.ts`), persistence repositories (`src/persistence/repositories/`) — are well-engineered: pure functions, branded ID types, property tests with `fast-check`, consistent repo pattern, lazy-loaded telemetry. TypeScript strictness is enforced and largely respected (7 `any` uses across 132 files, all defensible at the call sites).

**The architectural risk concentrates in three seams:**

1. **Scene layer** — `Level01Scene.ts` (1604 LOC) and `LevelScene.ts` (1155 LOC) share **9 method clusters with ~500 LOC of near-verbatim duplication** (45% overlap). Each scene independently owns ≥7 responsibilities (question loop, validation, attempt recording, mastery update, hint coordination, feedback overlay, summary, transitions). This is a textbook SRP violation that has produced two co-evolving forks of the same logic. **Decision D-4 (sunset Level01Scene) is overdue.**

2. **Engine ↔ Persistence boundary** — `src/engine/ports.ts` was added in commit `3dd038b` ("Phase 2 partial — engine port interfaces"). **Adoption is partial.** Engine code still reaches for global side-effects (`Math.random` in `selection.ts:86-88`, `crypto.randomUUID()` and `Date.now()` in `misconceptionDetectors.ts:9-15`), and scenes still import Dexie repositories directly. The DIP abstraction exists; it is just not wired through. The result: engine is non-deterministic (cannot replay a learning session), and the architecture lies about its own dependency direction.

3. **Pipeline parity contract** — TS validators (`src/validators/`) are hand-mirrored in Python (`pipeline/validators_py.py`) with **no codegen, no shared schema, and no CI gate**. Of 15 validator variants, only 5 have parity fixtures (33% coverage). `.github/workflows/ci.yml` does not invoke `pipeline/parity_test.py`. Every validator edit silently risks parity drift.

### Four architectural recommendations (substantive pushback)

These are the plan's load-bearing positions. The prior plans hedge on each; this plan does not.

- **A1 — Sunset `Level01Scene.ts`.** Path B from my prior synthesis ("keep both scenes with a shared `QuestionLoopController`") was a hedge that preserves the duplication risk over time. Recommendation: **resolve D-4 as Path A**. Migrate L1 to `LevelScene` via `LEVEL_META`; delete `Level01Scene.ts` (1604 LOC removed, no replacement). Rationale: a "shared controller" is structurally indistinguishable from "the LevelScene path with L1 entered into the meta table" — the latter is simpler and removes the parallel scaffold instead of formalizing it. **KISS over extracted abstraction.**

- **A2 — Replace Python parity with a single executable contract.** Hand-mirroring TS validators in Python is a permanent labor tax with negative leverage: every validator edit means writing it twice, every CI gap means silent drift. Three options ordered by elegance: (a) move the pipeline's validation step to TypeScript (the pipeline's *content generation* stays in Python; only the validation step moves), (b) execute TS validators from Python via Pyodide at pipeline time, (c) generate Python from TS via codegen. **Recommendation: option (a).** It eliminates parity entirely rather than enforcing it.

- **A3 — Enforce engine dependency direction at lint level.** Adoption of `engine/ports.ts` is voluntary today. Make it mandatory: add an `eslint-plugin-import` rule (or a custom rule) that **fails the build if `src/engine/*` imports from `src/persistence/*`, `src/scenes/*`, or calls `Math.random` / `Date.now()` / `crypto.randomUUID` directly**. The lint rule is the architecture; without it, the architecture is a suggestion.

- **A4 (NEW v3 · forensic): Delete or finish, never scaffold.** Multiple abstractions are in a "Phase 2 partial" state — `ports.ts` (0 injection sites despite 6 interfaces), `engine/adapters/*` (50 LOC of unused production adapters), the OpenTelemetry stack (3 spans across 10 packages, no consumer), the i18n ICU/tone-tag helpers (multi-locale infrastructure for an English-only app per D-27), the branded-ID smart constructors (0 callers vs. 126 `as` casts), and the misconception detectors (write-only — UI consumes 0 flags). **~1,500 LOC of speculative over-engineering.** Each Stage 1 PR must either complete an abstraction or delete it. The half-built state is worse than no abstraction because future readers assume it works.

> **§12 Forensic Synthesis (v3) names the deeper finding:** the Original Sin of this codebase is that the Phaser `Scene` became the application architecture. There is no Domain layer; scenes accreted ~77% non-rendering responsibility (state, persistence, business logic, lifecycle); duplication, untyped boundaries, scattered state, and 9 of 10 verified pathological scenarios all trace back to this single missing seam. The 16-phase plan above is now framed as **Stage 1 of a 4-stage architectural evolution** — see §12 for the Ideal State, the migration staging (Stages 1→4, ~245 hr total), and the substantive critique of recommendations A1–A3 from a structural rather than tactical lens.

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


## 4.5 Cross-cutting findings (security, PWA, i18n, observability, hidden coupling)

These dimensions span multiple SOLID/SRP buckets but are coherent enough to surface separately. **None of these were captured in the v1 plan**; they emerged from three follow-up agent passes (security/privacy, PWA/i18n/observability, hidden-coupling/state).

### 4.5.A Security & supply chain (HIGH–CRITICAL)

- **CRITICAL: 8 unpatched npm vulnerabilities** including `esbuild ≤0.24.2` (dev-server bypass — GHSA-67mh-4wv8-2f99) and `serialize-javascript ≤7.0.4` (RCE via RegExp.flags + CPU DoS). All in dev dependencies, but exploitable during CI/CD if the build environment is compromised. **Remediation (Phase 0.6):** `npm audit fix`; pin post-upgrade; add `npm audit` to the pre-commit hook (`scripts/residual-lint.mjs` already exists as a hook home).
- **HIGH: Three new C5 violations** beyond the ones the v1 plan tracks:
  - `src/lib/streak.ts:25,43,72` — stores `questerix.streak:${studentId}` JSON (count + lastDate) in localStorage. Plan Phase 5 must absorb this; `streakRecord` table goes into the Dexie v7 migration.
  - `src/scenes/OnboardingScene.ts:415` — writes `questerix.onboardingSeen` flag.
  - The `Level01Scene.ts:1435,1477` `suggestedLevel` write was already in plan Phase 5; this audit confirms the comment at `:1461` acknowledges the issue but the code persists.
- **MEDIUM: Sentry `setUser({ id: studentId })`** at `src/lib/observability/errorReporter.ts:49-52`. Even with lazy-loading and `sendDefaultPii: false`, the studentId UUID is sent as a Sentry user identifier — correlatable across events. **Remediation:** hash the ID or omit it; document in pre-deploy checklist that K-2 production builds must not configure `VITE_SENTRY_DSN`.
- **MEDIUM: CSP `style-src 'self' 'unsafe-inline'`** in `public/_headers:6`. Index.html has inline `<style>` (lines 18-112) by design; broader policy is unnecessary. **Remediation:** extract to a separate stylesheet + nonce-based CSP at build time.
- **MEDIUM: Source-map files generated** (`vite.config.ts:129` uses `sourcemap: 'hidden'`). The "hidden" mode strips `//# sourceMappingURL` references but leaves `.map` files in `dist/`. If the deploy step doesn't filter them, source code leaks. **Remediation:** add a pre-deploy validation in CI that fails if `dist/**/*.map` exists.
- **MEDIUM: Backup restore accepts any JSON without confirmation** (`src/persistence/backup.ts:125-140`). User downloads a malicious backup → silent state replacement. **Remediation:** confirmation modal with diff preview; transactional restore (already in Phase 7.4 as Zod boundary; extend with UX confirmation).
- **MEDIUM: Service worker caches curriculum JSON for 30 days** (`vite.config.ts:36-46` uses `CacheFirst`). A patched-misconception curriculum cannot reach users for a month if they go offline after one online visit. **Remediation:** reduce to 7 days; add a manual "Refresh Curriculum" affordance in Settings.
- **LOW: PWA manifest missing `screenshots` and `categories`** (`public/manifest.json`). Not a security issue; documented for completeness.

### 4.5.B PWA correctness (MEDIUM)

- **MEDIUM: No offline error affordance.** If a student attempts to load a level whose curriculum JSON has never been cached, `src/curriculum/loader.ts:80-121` emits a cryptic console error and the scene hangs. **Remediation:** wrap fetch in try/catch; surface a "This level is not available offline — please connect to download" toast; fall back to safe state.
- **MEDIUM: No update-available UI.** The service worker uses `registerType: 'autoUpdate'` with `skipWaiting`. When a new bundle ships, the old tab keeps running until the user closes it. No banner prompts a refresh at a safe checkpoint. **Remediation:** subscribe to `oncontrollerchange`; render a banner; let the user accept the reload at the menu (not mid-level).
- **MEDIUM: TTS voice not locale-aware.** `src/audio/TTSService.ts:57-60` accepts an optional `opts.voice` but never sets it; defaults to system voice. **Remediation (Phase 11 + Phase 12 if i18n is on roadmap):** select voice from `speechSynthesis.getVoices()` matching the active locale.

### 4.5.C i18n readiness — RESOLVED: English-only (D-27)

**Decision D-27 (2026-05-01): App ships English-only. Multi-locale is not on the roadmap and will not be revisited at v2 unless explicitly reopened.**

Implications:
- Q47–Q50 (pipeline locale tagging, fraction formatting, RTL prep, locale persistence) **demoted to LOW · deferred indefinitely**.
- The runtime i18n catalog (`src/lib/i18n/catalog.ts` + 445+ entries in `keys/quest.ts`) is **retained for its non-localization value**: centralized string management, tone tags, ICU plural support, easier content review and QA. Do **not** dismantle it.
- Phase 14 is **DEFERRED** as an entire phase. The plan's effort total drops by ~8 hr.
- TTS voice locale-awareness (Q46) collapses to "use English voice if available, fall back to system default" — a 15-minute task absorbed into Phase 11.
- The pipeline parity re-architecture (Phase 9 / recommendation A2) is now safe to execute without coordinating with i18n design.

**Findings retained for documentation only** (in case the decision is reopened): pipeline output is English-only literal strings; fraction notation is hardcoded ("1/2"); ordinals at `src/lib/i18n/keys/quest.ts:113-158` are English-literal. None require remediation under D-27 = English-only.

### 4.5.D Observability conventions (HIGH instrumentation gap)

The infrastructure is solid (lazy-loaded OTel + Sentry, IndexedDB telemetry buffer in `logger.ts`, consent-gated). **The instrumentation is sparse and the conventions are absent.**

- **HIGH: Only three callsites emit spans**, all in `src/persistence/middleware.ts:19,42,59` (`db.mutate`, `db.get`, `db.query`). No spans on scene lifecycle, question flow, mastery updates, or hint usage. The instrumentation exists; it's not wired anywhere meaningful.
- **HIGH: Span names and attribute names are scattered string literals.** Middleware uses `{ table, type }` (unqualified); `phaserInstrumentation.ts:17-18` uses `{ scene }` (also unqualified). No central `SPAN_NAMES` registry, no naming convention document. A typo creates a silent dead span.
- **MEDIUM: No client-side sampling.** When `VITE_OTLP_URL` is set, every Dexie operation traces. A 100-question session emits hundreds of spans per student.
- **MEDIUM: Error severity contract is implicit.** `logger.error/warn/info` exist but routing is informal — only top-level catches reach Sentry; warnings stay in console. No documented `fatal | error | warn | info` mapping to destinations.

### 4.5.E Hidden coupling & state-management (HIGH–CRITICAL)

Findings from the third audit pass (cross-referenced against existing plan items to extract only what is **new**):

- **CRITICAL (new): Session crash recovery contract is undocumented.** Plan Q5 captures "session creation silent collapse" but does **not** document the post-crash recovery semantics. If a scene is destroyed mid-attempt (before Dexie writes complete), what does the next session see? Current behavior: silently resumes from the last *persisted* attempt, dropping the in-memory partial. Safe but non-obvious; under 30-min sessions on flaky devices, this is a real loss vector. **Remediation (Phase 0.5 / Phase 1):** add an architectural test that pre-state, kills the scene mid-attempt, and asserts the recovery is correct + visible to the student.
- **HIGH (new): Branded-ID `as` casts are widespread and unvalidated.** `attemptRepo.ts:38` casts `String(key) as AttemptId` (Dexie auto-increment key — a behavior assumption). `misconceptionDetectors.ts` does `evidenceIds as AttemptId[]` ×11 — batch cast without item validation. The plan (§1.8) only brands `MisconceptionId`; this audit shows StudentId/SessionId/AttemptId have the same hole. **Remediation (Phase 8):** audit every `as *Id` site; replace with smart-constructor calls or boundary-Zod validation. Acceptance: zero `as *Id` outside test fixtures.
- **HIGH (new): Scene `init(data)` is untyped.** `fadeAndStart(this, 'Level01Scene', { studentId, levelNumber })` (LevelMapScene.ts:363) passes a free-form object; `Level01Scene.init(data)` accepts `any`. A caller can pass `levelNumber: 100` and the receiver accepts silently. **Remediation (Phase 8):** define `SceneContract<T>` per scene; ESLint rule that fails `fadeAndStart(..., data: any)` without a type guard.
- **MEDIUM (new): Scene-layer `Date.now()` calls** at `Level01Scene.ts:1364,1373,1376` are outside Phase 2's engine-only lint scope. The mastery-update path reads wall clock directly. **Remediation (Phase 4 / Phase 6):** scene injects clock into mastery write; engine `ClockPort` is the only source.
- **MEDIUM (new): Typed event bus is incomplete.** One typed event constant exists (`FEEDBACK_DISMISSED_EVENT` at `FeedbackOverlay.ts:51`); inter-scene/inter-component communication otherwise uses Phaser's loosely typed emitter. **Remediation (Phase 8):** introduce `SceneEventBus` interface; enforce named-constant event keys.
- **MEDIUM (new): Hardcoded particle colors.** `FeedbackOverlay.ts:260`, `SessionCompleteOverlay.ts:357`, `QuestCompleteOverlay.ts:287` all embed hex literals (`[0xfcd34d, 0xfbbf24, ...]`) bypassing `levelTheme.ts`. Theme palette change won't propagate. **Remediation (Phase 8):** replace with theme tokens.

---

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
| Q36 | CRITICAL | 4.5.A | 8 unpatched npm vulnerabilities (esbuild, serialize-javascript)                          | `package.json`, lockfile                        | 0.6   |
| Q37 | HIGH     | 4.5.A | C5 violation — `streak.ts` localStorage writes                                            | `src/lib/streak.ts:25,43,72`                    | 5     |
| Q38 | HIGH     | 4.5.A | C5 violation — `OnboardingScene` writes `questerix.onboardingSeen`                        | `src/scenes/OnboardingScene.ts:415`             | 5     |
| Q39 | MEDIUM   | 4.5.A | Sentry `setUser({ id: studentId })` — UUID exfiltration via correlation                   | `src/lib/observability/errorReporter.ts:49-52`  | 0.6,13 |
| Q40 | MEDIUM   | 4.5.A | CSP `style-src 'unsafe-inline'` broader than necessary                                    | `public/_headers:6`                             | 13    |
| Q41 | MEDIUM   | 4.5.A | `dist/**/*.map` files generated; no deploy-gate filter                                    | `vite.config.ts:129`, `.github/workflows/deploy.yml` | 0.6 |
| Q42 | MEDIUM   | 4.5.A | Backup restore has no confirmation + diff preview                                          | `src/persistence/backup.ts:125-140`             | 13    |
| Q43 | MEDIUM   | 4.5.A | SW caches curriculum JSON 30 days (`CacheFirst`)                                          | `vite.config.ts:36-46`                          | 11    |
| Q44 | MEDIUM   | 4.5.B | No offline error affordance for un-cached level                                            | `src/curriculum/loader.ts:80-121`               | 11    |
| Q45 | MEDIUM   | 4.5.B | No update-available UI when SW receives new bundle                                        | service worker + UI                             | 11    |
| Q46 | MEDIUM   | 4.5.B | TTS voice not locale-aware                                                                 | `src/audio/TTSService.ts:57-60`                 | 11,12 |
| Q47 | LOW (deferred) | 4.5.C | Pipeline emits English-only prompts; no locale tagging — **deferred per D-27**            | `pipeline/output/level_NN/all.json`, schema     | (none) |
| Q48 | LOW (deferred) | 4.5.C | Number/fraction formatting hardcoded — **deferred per D-27**                              | `src/lib/i18n/keys/quest.ts:113-158`, callsites | (none) |
| Q49 | LOW (deferred) | 4.5.C | RTL layout not prepared — **deferred per D-27**                                            | CSS / scene layout                              | (none) |
| Q50 | LOW (deferred) | 4.5.C | Locale not persisted; no UI selector — **deferred per D-27**                              | `levelProgression` schema, MenuScene            | (none) |
| Q51 | HIGH     | 4.5.D | Only 3 spans emitted (all Dexie middleware); no scene/question/mastery instrumentation    | `src/persistence/middleware.ts:19,42,59`        | 12    |
| Q52 | HIGH     | 4.5.D | Span names / attribute names scattered + untyped                                           | observability callsites                          | 12    |
| Q53 | MEDIUM   | 4.5.D | No client-side OTel sampling                                                               | `src/lib/observability/tracer.ts:51-57`         | 12    |
| Q54 | MEDIUM   | 4.5.D | Error severity contract implicit                                                           | `src/lib/log.ts`, `errorReporter.ts`            | 12    |
| Q55 | CRITICAL | 4.5.E | Session crash recovery contract undocumented                                              | `Level01Scene.ts:314-379, 1276-1428`            | 0.5,1 |
| Q56 | HIGH     | 4.5.E | Branded-ID `as` casts widespread (StudentId/SessionId/AttemptId)                          | `attemptRepo.ts:38`, `misconceptionDetectors.ts` ×11 | 8 |
| Q57 | HIGH     | 4.5.E | Scene `init(data)` is untyped — caller/receiver contract not enforced                     | scene init signatures + `fadeAndStart`          | 8    |
| Q58 | MEDIUM   | 4.5.E | Scene-layer `Date.now()` outside engine lint scope                                         | `Level01Scene.ts:1364,1373,1376`                | 4,6  |
| Q59 | MEDIUM   | 4.5.E | Typed event bus incomplete; custom events risk string-literal scattering                  | `FeedbackOverlay.ts:51`                         | 8    |
| Q60 | MEDIUM   | 4.5.E | Hardcoded particle colors bypass `levelTheme.ts`                                          | `FeedbackOverlay.ts:260`, `SessionCompleteOverlay.ts:357`, `QuestCompleteOverlay.ts:287` | 8 |

**Severity rollup (v2, post cross-cutting, post D-27):** 10 CRITICAL, 14 HIGH, 23 MEDIUM, 9 LOW (4 of which are i18n-deferred) = **56 actionable issues**. `harden-and-polish-2026-04-30.md` independently lists 48; ~10 of those duplicate plan items and are sequenced via the H&P rollup in Phase 10. **Net unique scope of this plan: ~46 distinct findings (excluding the 4 deferred-i18n items).**


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

### Phase 0.6 — Immediate security hygiene (≈3 hr · ship first)

Highest urgency. The 8 npm CVEs and source-map deploy-gate are pre-merge for everything else; sentry-id scrub is a privacy obligation.

| #     | Task                                                                                                                       | File:line / artifact                                  | Effort  |
| ----- | -------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- | ------- |
| 0.6.1 | `npm audit fix`. If breaking changes are required for `vitest` / `workbox-build`, take them. Pin post-upgrade.            | `package.json`, `package-lock.json`                   | 30 min  |
| 0.6.2 | Add `npm audit --omit=optional --audit-level=high` step to `scripts/residual-lint.mjs` (already pre-push). Fail on HIGH+. | `scripts/residual-lint.mjs`                           | 30 min  |
| 0.6.3 | Strip `studentId` from Sentry `setUser({})`. Replace with a per-session hash (or omit entirely). Document in pre-deploy checklist that production must not configure `VITE_SENTRY_DSN` for K-2 audience. | `src/lib/observability/errorReporter.ts:49-52`        | 30 min  |
| 0.6.4 | Add a deploy-time guard: fail CI/deploy if `dist/**/*.map` exists. Either filter at build (`build.sourcemap: false`) or prune in deploy step. | `.github/workflows/deploy.yml`, `vite.config.ts:129`  | 1 hr    |
| 0.6.5 | Document in `SECURITY.md` (new, repo root) the dependency-audit + telemetry-DSN policies. Link from `CLAUDE.md`.          | `SECURITY.md` (new), `CLAUDE.md`                      | 30 min  |

**Acceptance:** `npm audit` reports 0 HIGH/CRITICAL. `npm run build && ls dist/**/*.map` returns nothing OR is gated. Sentry user-context contains no raw studentId. `SECURITY.md` exists.

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

### Phase 5 — Persistence consolidation + C5 closeout (≈7 hr)

Structural fix for Q9, Q16, Q27, Q29.

| #   | Task                                                                                                                       | File:line / artifact                                  | Effort  |
| --- | -------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- | ------- |
| 5.1 | Add `.upgrade()` callback to v6 schema that migrates `unlockedLevels:*` and `completedLevels:*` localStorage keys, then deletes them. | `src/persistence/db.ts:176-204`                       | 1.5 hr  |
| 5.2 | Add `suggestedNextLevel` to `levelProgression` shape and a repo method `setSuggestedNext(studentId, level)`. Migrate `Level01Scene.ts:1435,1477` writers. | `src/types/runtime.ts`, `levelProgression.ts`         | 1 hr    |
| 5.3 | Migrate `MenuScene.ts:434-441` localStorage reads to `levelProgressionRepo`.                                              | `MenuScene.ts`                                        | 30 min  |
| 5.4 | Migrate `src/lib/log.ts:40,113,118,122` `LOG` key off localStorage (per H&P R27). Either to IndexedDB or remove if not load-bearing. | `src/lib/log.ts`                                      | 1 hr    |
| 5.5 | Integration test: pre-populate v5 localStorage fixture, open the v6 DB, assert `levelProgression` rows match and localStorage keys are absent. | `tests/integration/2026-05-01-v5-to-v6.test.ts`       | 1 hr    |
| 5.6 | Migrate `src/lib/streak.ts:25,43,72` `questerix.streak:*` localStorage off to a Dexie `streakRecord` table (v7 schema bump).                   | `src/lib/streak.ts`, `src/persistence/db.ts`         | 1 hr    |
| 5.7 | Migrate `src/scenes/OnboardingScene.ts:415` `questerix.onboardingSeen` flag to Dexie (`appState` row or `levelProgression.onboardingSeen` field). | `src/scenes/OnboardingScene.ts`                      | 30 min  |
| 5.8 | After 5.6 + 5.7 + Phase 5.1-5.4 land, extend the migration callback in `db.ts` to absorb the streak/onboarding keys too. Bump schema to v7.    | `src/persistence/db.ts`                               | 30 min  |

**Acceptance:** `/c5-check` returns only `lastUsedStudentId` (the documented exception). `npm run test:integration` includes a v5→v7 migration test (single test verifies both jumps). The `levelProgressionRepo` and the new `streakRepo` are the single read/write paths for their respective state.

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


### Phase 8 — Type-system rigor + DRY pass (≈13 hr)

Structural fix for Q13, Q22, Q23, Q24, Q25, Q30.

| #   | Task                                                                                                                       | File:line / artifact                                  | Effort  |
| --- | -------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- | ------- |
| 8.1 | Brand `MisconceptionId` per the existing pattern in `src/types/branded.ts`. Add a smart constructor that validates the `MC-XXX-NN` shape. | `src/types/branded.ts`, `src/types/validator.ts:22`   | 1 hr    |
| 8.2 | Eliminate `as never`, `as unknown as`, `as any` casts at the 6+ identified sites. Replace with discriminated unions or type-narrowing helpers. | scattered (per H&P R5, R15)                           | 2 hr    |
| 8.3 | Convert `levelRouter.ts:42-43` hardcoded validator branch to a metadata-driven factory keyed by `validatorId`.            | `src/scenes/utils/levelRouter.ts`                     | 1 hr    |
| 8.4 | Segregate `Interaction` interface into `MountableInteraction` + optional `HintAware` + optional `OverlayCapable`. Update the 10 archetype implementations to declare the optional capabilities they provide. | `src/scenes/interactions/types.ts`, all 10 archetypes | 2.5 hr  |
| 8.5 | Extract `deriveLevelGroup()` to `src/curriculum/levelGroup.ts`; remove the duplicate. Extract `skillMapping` to `src/scenes/utils/skillMapping.ts`; remove the duplicate. | per H&P R14, audit Q25                                 | 1 hr    |
| 8.6 | Enable `noUncheckedIndexedAccess` in `tsconfig.json` (per H&P R41). Fix resulting type errors.                            | `tsconfig.json`                                       | 30 min  |
| 8.7 | **Branded-ID hardening (Q56).** Audit every `as StudentId | SessionId | AttemptId | LevelId | SkillId` cast. Replace with smart-constructor calls or boundary Zod-validate at the parse site. Cited hot-spots: `attemptRepo.ts:38`, `lastUsedStudent.ts`, `BootScene.ts` (×2), `misconceptionDetectors.ts` (×11 batch casts). | branded.ts callers across `src/`                      | 2 hr    |
| 8.8 | **Scene init typing (Q57).** Define `SceneContract<T>` per scene; convert `init(data)` signatures to typed inputs. ESLint rule that fails `fadeAndStart(scene, key, data)` if `data` is not a typed object. | scene init signatures + `fadeAndStart` callsites      | 1.5 hr  |
| 8.9 | **Typed event bus (Q59).** Introduce `SceneEventBus` interface; centralize event keys in `src/scenes/events.ts`; convert `events.emit('foo', payload)` to `events.emit(EVT.FOO, payload)`.    | `src/scenes/events.ts` (new), emitters                 | 1 hr    |
| 8.10 | **Theme-token sweep (Q60).** Replace hardcoded particle hex literals in `FeedbackOverlay.ts:260`, `SessionCompleteOverlay.ts:357`, `QuestCompleteOverlay.ts:287` with `levelTheme` tokens.   | three component files                                 | 1 hr    |

**Acceptance:** zero `as never | as unknown as | as any | as *Id` outside well-commented test fixtures; `noUncheckedIndexedAccess` enabled and clean; `Interaction` interface segregated; new archetype registration is one row; scene init contracts are compile-checked; event keys are constants; particle colors flow from theme.

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

### Phase 11 — PWA hardening (≈3 hr)

Structural fix for Q43, Q44, Q45.

| #    | Task                                                                                                                       | File:line / artifact                                  | Effort  |
| ---- | -------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- | ------- |
| 11.1 | Reduce SW curriculum cache TTL from 30d to 7d. Add a "Refresh Curriculum" affordance in Settings that calls `caches.delete('curriculum-cache')` + reloads. | `vite.config.ts:36-46`, `src/scenes/SettingsScene.ts` | 1 hr    |
| 11.2 | Wrap curriculum fetch in try/catch; render a user-facing "This level isn't available offline" toast; fall back to a safe state (menu or last cached level). | `src/curriculum/loader.ts:80-121`                     | 1 hr    |
| 11.3 | Subscribe to `oncontrollerchange`; render a non-blocking "A new version is ready" banner; let the user accept the reload at a safe checkpoint (menu, never mid-level). | `src/main.ts`, new `UpdateBanner.ts` component        | 1 hr    |
| 11.4 | TTS voice selection (absorbed from former Phase 14): pick an English voice from `speechSynthesis.getVoices()` (e.g., `lang.startsWith('en')`); fall back to system default. Skip locale-awareness per D-27. | `src/audio/TTSService.ts:57-60`                       | 15 min  |

**Acceptance:** Playwright spec — turn off network mid-session, attempt to load an un-cached level, assert the toast surfaces. Second spec — simulate SW update event, assert the banner appears, accept it, assert reload happens at menu only. TTS plays a sample line on iOS Safari with an English voice if one is enumerated.

### Phase 12 — Observability conventions + instrumentation (≈7 hr)

Structural fix for Q51, Q52, Q53, Q54.

| #    | Task                                                                                                                       | File:line / artifact                                  | Effort  |
| ---- | -------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- | ------- |
| 12.1 | Create `src/lib/observability/span-names.ts` with a `SPAN_NAMES` registry (DB / SCENE / QUESTION / MASTERY / HINT / TTS). | new file                                              | 1 hr    |
| 12.2 | Create `src/lib/observability/README.md` documenting attribute-naming convention (`db.*`, `scene.*`, `question.*`, `student.*`) and severity contract (`fatal` → Sentry; `error` → Sentry-if-consent; `warn` → local; `info` → local-if-category-enabled). | new file                                              | 1 hr    |
| 12.3 | Apply naming convention retroactively at `src/persistence/middleware.ts:20-22` (`{ 'db.table': ..., 'db.operation': ... }`). | `src/persistence/middleware.ts`                       | 30 min  |
| 12.4 | Add span instrumentation at: scene init/create/shutdown; question load/validate/submit; mastery update; hint request. | scene + repo callsites                                | 2 hr    |
| 12.5 | Wire `logger.fatal()` to call `errorReporter.report()` (currently only top-level catches reach Sentry).                  | `src/lib/log.ts`, `errorReporter.ts`                  | 30 min  |
| 12.6 | Add `TraceIdRatioBasedSampler` to the OTel provider with `VITE_SAMPLING_RATE` env (default 0.1).                          | `src/lib/observability/tracer.ts:51-57`               | 1 hr    |
| 12.7 | Acceptance test: trace view in a local OTel collector shows `question.load → question.validate → question.submit → mastery.update` as a single trace. | `tests/integration/observability.test.ts`             | 1 hr    |

**Acceptance:** zero bare-string spans in `src/` (lint check via grep); a critical-path trace visible end-to-end; sampling rate respected; `logger.fatal` reaches Sentry when configured; severity contract documented and linked from CLAUDE.md.

### Phase 13 — Security hardening (≈4 hr)

Structural fix for Q40, Q42 (the v1 plan's Phase 7.4 already covers Q14/Q15 Zod boundaries; Phase 13 extends with UX confirmation + CSP + dependency-audit gate).

| #    | Task                                                                                                                       | File:line / artifact                                  | Effort  |
| ---- | -------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- | ------- |
| 13.1 | Extract inline CSS from `index.html` (lines 18-112) to a separate stylesheet `public/splash.css`. Compute build-time nonce; inject into both the `<style>` tag and the `style-src` CSP. Drop `'unsafe-inline'`. | `index.html`, `public/_headers`, vite plugin          | 2 hr    |
| 13.2 | Backup-restore confirmation modal: pre-restore diff dialog (records to merge / records to skip / unknown shape errors); two-button confirm/cancel; transactional restore (roll back on failure). | `src/persistence/backup.ts:125-210`, `src/scenes/SettingsScene.ts` | 2 hr |

**Acceptance:** CSP report-only in CI shows zero violations on the styles surface; restoring a malicious backup file is blocked at confirmation; `npm audit` step (added Phase 0.6.2) gates HIGH+ vulnerabilities on every push.

### Phase 14 — i18n preparedness · DEFERRED (D-27 = English-only)

**Decision D-27 confirms the app is English-only.** Phase 14 is removed from the plan's effort total. The entire phase is documented here for traceability only.

If a future product decision reopens multi-locale, the deferred work (≈8 hr) is: pipeline locale-keyed prompts; `Intl.NumberFormat` for fractions; RTL CSS path; locale selector + persistence; locale-aware TTS voice. None of it has to ship before v2.

**Action under current decision:** TTS voice selection collapses to a 15-minute task — pick an English voice from `speechSynthesis.getVoices()` if available; fall back to system default. **Absorbed into Phase 11.4.**

---

## 7. Sequencing & branching

```
Phase 0   (unblock — D-25, parity CI, doc cleanup, harden CRITs)
Phase 0.6 (security hygiene — npm audit fix, sentry scrub, sourcemap gate) ── ship FIRST
              ↓
  ┌──── parallel-safe band ────────────────────────────────────┐
  │  Phase 1   (bug fixes — BUG-02, G-C7)                       │
  │  Phase 2   (DIP enforcement — engine lint rules)            │── enables Phase 4
  │  Phase 5   (persistence consolidation + C5 closeout)        │
  │  Phase 7   (bundle / observability lazy / resilience)       │
  │  Phase 11  (PWA hardening — offline + update banner + TTS)  │
  │  Phase 13  (security hardening — CSP nonce + backup UX)     │
  └─────────────────────────────────────────────────────────────┘
              ↓
              Phase 3   (sunset Level01Scene)         ← gated by D-25 from Phase 0.1
              ↓
              Phase 4   (engine determinism + misconception rules) ← needs Phase 2 lint
              ↓
              Phase 6   (test pyramid + coverage gate)
              ↓
              Phase 8   (type rigor + DRY + branded IDs + scene contracts + event bus)
              ↓
              Phase 12  (observability conventions + instrumentation rollout)
              ↓
              Phase 9   (pipeline parity re-architecture) ← optional / deferrable
              ↓
              Phase 10  (harden-and-polish rollup)

Phase 14  (i18n)  · DEFERRED per D-27 (English-only)
```

Phases 0, 0.6, 1, 2, 5, 7, 11, 13 are **parallel-safe** and can ship in any order. Phase 3 gates on D-25. Phase 4 gates on Phase 2's lint enforcement. Phase 12 (observability instrumentation) sits late because it benefits from the cleaner scene/engine boundaries delivered by Phases 3, 4, and 8. Phase 9 is **deferrable** — the conservative fallback is Phase 0.2 with full fixture coverage.

Each phase is its own dated branch:
- `fix/2026-05-01-bug02-gc7` (Phase 1)
- `refactor/2026-05-01-engine-dip` (Phase 2)
- `refactor/2026-05-01-sunset-l01` (Phase 3)
- ...etc.

Total effort estimate (v2, post cross-cutting findings, Path A, English-only):

| Scope                                                                       | Hours  |
| --------------------------------------------------------------------------- | ------ |
| Phase 0 (unblock) + Phase 0.6 (security hygiene)                            | 7      |
| Phase 1 (bug fixes)                                                         | 3      |
| Phase 2 (DIP lint enforcement)                                              | 6      |
| Phase 3 (sunset Level01Scene)                                               | 14     |
| Phase 4 (engine determinism + misconception rules)                          | 10     |
| Phase 5 (persistence + C5 closeout — incl. streak.ts + onboarding)          | 7      |
| Phase 6 (test pyramid + coverage gate)                                      | 9      |
| Phase 7 (bundle / observability lazy / resilience)                          | 6      |
| Phase 8 (type rigor + DRY + branded IDs + scene contracts + event bus)      | 13     |
| Phase 9 (pipeline parity re-arch — optional)                                | 12     |
| Phase 10 (harden-and-polish rollup absorption)                              | 14     |
| Phase 11 (PWA hardening — incl. English TTS voice)                          | 3.25   |
| Phase 12 (observability conventions + instrumentation)                      | 7      |
| Phase 13 (security hardening — CSP + backup UX)                             | 4      |
| Phase 14 (i18n) — DEFERRED per D-27                                         | 0      |
| **Total (all phases except deferred Phase 14)**                              | **~115 hr** |

Effort by sub-scope:
- Core code-quality work, Phases 0 / 0.6 / 1 / 2 / 5 / 6 / 8: **~50 hr** (~1.5 weeks for one engineer)
- Plus structural refactors, Phase 3 + 4: **+24 hr** (~3 days)
- Plus cross-cutting hardening, Phases 7 / 11 / 12 / 13: **+20.25 hr** (~2.5 days)
- Plus optional Phase 9 (pipeline TS migration): **+12 hr**
- Plus Phase 10 (harden-and-polish absorption): **+14 hr**

Two engineers can compress the parallel-safe band (Phases 0, 0.6, 1, 2, 5, 7, 11, 13) into ~3 days; the dependent chain (Phase 3 → 4 → 6 → 8 → 12) takes ~1.5 weeks serially. **Realistic shipping window: 3 weeks for one engineer; 2 weeks for two.**

---

## 8. Definition of Done

This plan is complete when:

1. **Architectural seams enforced.** ESLint fails the build on `engine/*` → `persistence/*` imports, on direct `Math.random | Date.now() | crypto.*` calls inside `engine/*`, and on `@sentry/* | @opentelemetry/*` strings in the main entry chunk.
2. **Two scenes have become one.** `Level01Scene.ts` is deleted (Path A) or both scenes consume a shared controller (Path B fallback). No file in `src/scenes/` exceeds 800 LOC.
3. **Engine is deterministic.** Seeded RNG produces a reproducible question sequence; misconception rules are data; detector unit-test coverage ≥ 90%.
4. **Persistence is consolidated.** `/c5-check` returns only `lastUsedStudentId`; v5→v7 migration callback is wired (covering streak + onboarding); all level state flows through `levelProgressionRepo`; streak state through `streakRepo`.
5. **Defensive boundaries are real.** Zod validation at curriculum loader and backup restore; `QuotaExceededError` handled at every write site; `window.error` listener installed; backup restore requires confirmation modal.
6. **Tests are gated.** 80% line coverage on `engine/`, `validators/`, `persistence/`. Full-level happy-path E2E parameterized for L1, L5, L9. Unit tests ≥ 450.
7. **Bundle is gated.** Main entry ≤ 560 KB gzipped; CI assertion enforces; no `dist/**/*.map` ships.
8. **Pipeline parity is eliminated** (Phase 9, optional) **or fully gated in CI** (Phase 0.2 fallback).
9. **`CLAUDE.md` reflects ground truth.** Active bug list is empty. Source map is accurate. C5 exception list is current. Decision log includes D-25, D-27 (English-only confirmation), and D-26 if Phase 9 lands.
10. **All 48 items in `harden-and-polish-2026-04-30.md` are closed or explicitly deferred with reason.**
11. **Security baseline is current.** `npm audit --audit-level=high` returns clean; Sentry user-context contains no raw studentId; `SECURITY.md` exists and documents policy; CSP drops `'unsafe-inline'` for styles via build-time nonce.
12. **PWA degrades gracefully.** Offline access to un-cached level surfaces a user-facing toast; SW update emits a banner the user accepts at menu only; curriculum cache TTL is 7 days.
13. **Observability has conventions.** `SPAN_NAMES` registry exists; attribute names follow the documented `db.* | scene.* | question.* | student.*` prefix convention; spans cover scene lifecycle + question flow + mastery; sampling is configurable via `VITE_SAMPLING_RATE`.
14. **Type system is rigorous.** Zero `as *Id` casts outside test fixtures; scene `init(data)` is typed; event keys are constants; `noUncheckedIndexedAccess` enabled and clean.
15. **Session crash recovery is documented and tested.** Architectural test pre-states a session, kills the scene mid-attempt, and asserts the user re-entry produces a recoverable, non-data-losing state.

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
| Plan duration exceeds 2 weeks; new sprint priorities arrive                                | Phases 0, 0.6, 1, 2, 5, 7, 11, 13 are independently shippable. Pause at any sprint boundary without leaving work in an inconsistent state. |
| Phase 0.6 `npm audit fix` cascades into a Vitest or Workbox major-version upgrade           | Take the upgrade in a dedicated branch; don't bundle with security fix. Verify CI green before merge. If breaking, schedule the upgrade as Phase 0.6.x sub-task with own rollback plan. |
| Phase 12 (observability instrumentation) generates trace volume that exceeds backend quota | Default `VITE_SAMPLING_RATE=0.1`; documentation states production rate. CI sets `VITE_OTLP_URL` only in the synthetic-playtest workflow. |
| Phase 13 CSP nonce extraction breaks the splash screen on browsers that don't read meta-CSP  | Stage CSP changes in `report-only` mode for one PR cycle; verify zero violations across Chromium + WebKit before promoting to enforcing. |
| Branded-ID hardening (Phase 8.7) breaks tests that constructed IDs from raw strings         | Fix tests; do not weaken the type. The whole point is to surface those construction sites. |

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

1. `docs/00-foundation/decision-log.md` entries:
   - **D-25** — Level01Scene sunset (Phase 3 / recommendation A1)
   - **D-26** — Pipeline parity re-architecture (Phase 9 / recommendation A2; optional)
   - **D-27** — English-only commitment (resolves §4.5.C; defers Phase 14)
2. ~14 dated branches and PRs per the sequencing diagram in §7.
3. Updated `CLAUDE.md` (active bugs cleared; source map accurate; C5 exception list current; pre-deploy security checklist linked).
4. Updated `PLANS/INDEX.md` referencing this plan.
5. New `SECURITY.md` (repo root) with dependency-audit + Sentry-DSN policy.
6. New `src/lib/observability/README.md` (Phase 12) with span-naming convention and severity contract.
7. Closure of `harden-and-polish-2026-04-30.md` (Phase 10).

---

---

## 12. Forensic synthesis: the Original Sin, ripple effects, and Ideal State

The v2 plan above is **tactical**: 60 findings, 16 phases, file:line precision. This section is **strategic**: it names the single foundational design choice that is producing the cascade of secondary issues, and contrasts the current architecture with an Ideal State.

This synthesis was added in v3 after a fourth audit pass (forensic / systemic). It includes substantive pushback against three of v2's own recommendations.

### 12.1 The Original Sin: the Phaser Scene became the application architecture

**Claim:** every CRITICAL and HIGH finding in §1–§4.5 traces back to a single foundational design choice — **the Phaser `Scene` was loaded with non-rendering responsibilities that don't belong on a View object, because there is no Domain layer to hold them.**

**Evidence (forensic measurement of `Level01Scene.ts`, 1604 LOC):**

| Responsibility | LOC | What lives here |
| --- | --- | --- |
| State management | ~500 | `studentId`, `sessionId`, `attemptCount`, `currentQuestion`, `currentMasteryEstimate`, `hintLadder`, `currentQuestionHintIds` as scene-class fields |
| Persistence orchestration (CRUD) | ~280 | `openSession` (408–474), `recordAttempt` (1276–1428), `closeSession` (1537–1575), `hintEvent` record (1173–1191), `mastery upsert` (1343–1397), `misconceptionFlag` write (1399–1423) |
| Business logic | ~200 | BKT-aware question selection (600–662), snap tolerance (611–615), difficulty-tier mapping (601–605), misconception detection orchestration (1405), next-level routing (1464–1480) |
| Lifecycle orchestration | ~150 | `init`, `create`, `loadQuestion`, `showSessionComplete`, `closeSession`, `preDestroy` (1331–1338) |
| UI rendering & input | ~450 | shape drawing (724–812), drag handles (816–865), partition lines (788–812), hint visualization (1124–1257), prompt/feedback text |
| Validation & feedback | ~180 | `onSubmit` (869–951), `showOutcome` (1024–1078), feedback overlay orchestration |

**~77% of the file is non-rendering work.** Scenes were a Phaser implementation detail (a way to organize render passes, input handlers, and tween lifecycles); the codebase upgraded them to "the application unit." Once that happened, four pathologies followed by structural necessity:

1. **Scenes don't compose.** Phaser scenes are containers, not classes you can `extends` or compose. You can have a scene reference another scene, but you cannot share *behavior* across them. So the question loop, the hint ladder, the mastery update, and the attempt recording each got **copy-pasted** between `Level01Scene` and `LevelScene` — that's the ~500 LOC, 9-cluster duplication from §1.1.

2. **Scenes are hard to test.** Mounting a scene requires a Phaser game instance, a canvas, a renderer. So the codebase tests *around* scenes (validators pure, BKT pure, repos pure) and only smoke-tests the scenes via Playwright. Hence the test-pyramid imbalance from §6 (50 unit tests well-covering pure layers; 4 scene tests; everything else E2E). The `MenuScene.test.ts:5` TODO ("add a lightweight canvas shim") is the literal scar of this constraint.

3. **State scattered across three tiers.** Without a domain entity owning it, session state lives simultaneously in scene fields (the live truth), in Dexie rows (the persisted truth, written async), and in localStorage (the legacy side-channel). When the scene crashes mid-write, the three tiers disagree, and the recovery contract is undocumented (Q55). **BUG-02 is exactly what happens when there is no entity with a state-transition invariant** — the scene's pre-incremented `attemptCount` is read before the post-increment, and no FSM is there to forbid that ordering.

4. **Domain logic leaks into the View.** When a designer wants to change BKT priors, the diff lands in the scene file. When a curriculum author wants a new misconception, the diff lands in `misconceptionDetectors.ts:9-15` — a module that already mixes ID generation, 16 detector functions, and an aggregator. **Adding a misconception requires editing a 850-LOC file because there is no domain entity called `Misconception` with a registry table and a `detect(snapshot)` method.**

**The surface findings are symptoms of one disease:** there is no Domain layer. The scene is the only place behavior lives, and the scene is the wrong place. Every other finding — the duplication, the untyped scene init, the branded-ID bypass, the localStorage side-channels, the silent validator-registry fallback — is downstream of this single missing seam.

### 12.2 Ripple-effect cascade

Visual map of how the Original Sin propagates outward through the codebase. Read top-to-bottom: each layer is *caused by* the layer above.

```
                    ┌─────────────────────────────────────┐
                    │  ORIGINAL SIN: no Domain layer.     │
                    │  Phaser Scene = application unit.   │
                    └─────────────────┬───────────────────┘
                                      │
        ┌─────────────────────────────┼─────────────────────────────┐
        ▼                             ▼                             ▼
  ┌─────────────┐            ┌────────────────┐           ┌──────────────────┐
  │ Scenes can't│            │ Scenes hard to │           │ Domain logic must│
  │   compose   │            │     test       │           │ live somewhere   │
  └──────┬──────┘            └────────┬───────┘           └────────┬─────────┘
         │                            │                            │
         ▼                            ▼                            ▼
  Copy-paste duplication      Test pyramid skews          Logic leaks into:
  — 9 method clusters          — 50 unit tests on          • engine/* (BKT, detectors)
  — ~500 LOC, 45% overlap        pure layers               • scene fields (state)
  — L01 vs LevelScene          — 4 scene tests             • engine/ports.ts (half-built)
                               — rest E2E (slow,           • lib/observability/* (dormant)
         │                       brittle)                   • lib/i18n/* (over-spec)
         ▼                            │                            │
  Maintenance multiplier            ▼                              ▼
  every behavior change       MenuScene.test.ts:5         Adding behavior touches
  needs 2x edits              "TODO add canvas shim"      the wrong layer:
                              never resolved.             — new archetype: 8 files
                                                          — new misconception: edits
                                                            850-LOC detectors file
                                                          — new selection strategy:
                                                            modifies a function body
```

**Concrete ripple measurements (from forensic dependency map, 2026-05-01):**

| If you change…                                  | Touch sites                                                 |
| ----------------------------------------------- | ----------------------------------------------------------- |
| `Level01Scene.ts` rename                        | 4 sites (3 `fadeAndStart` literal-string callers + 1 barrel export). Phaser's dynamic `scene.start(key, data)` doesn't catch typos at build time. |
| `updateMastery()` signature                     | 2 sites (Level01Scene:1369, LevelScene:965). Must adapt in lockstep. Neither uses `engine/ports.ts`. |
| `Attempt` type (29 fields)                      | 1 constructor (Level01Scene:1297-1325) + 1 mirror (LevelScene). Manual object literal — easy to forget a field. |
| `ValidatorResult` shape                         | 3 consumers per scene × 2 scenes (Level01 + Level) = 6 sites; pervasive. |
| `SkillId` brand                                 | 5+ `as SkillId` cast sites; **0** smart-constructor calls. The brand is theater. |
| Dexie `levelProgression` schema                 | 4 consumers (Menu, Level01, Level, LevelMap). Cross-cutting; v6 has no migration callback. |
| Pipeline `questionTemplate` shape               | 2 scene-level destructurings × 8 archetypes; payload schema is opaque. |
| Scene transition data                           | 6 distinct contracts, 0 type validation. Phaser's `init(data)` is `unknown`. |

**Hidden coupling hot spots** (no static import; only discoverable by grep):

1. **Skill-ID literal duplicated 3 times.** `MenuScene.ts:75-78`, `LevelMapScene.ts:55-58`, `Level01Scene.ts:1346` each independently compute `if (level === 1) return 'skill.partition_halves'`. Three places must change in lockstep when the skill schema changes.
2. **Scene-key magic strings.** `'Level01Scene'` appears in 3 callers + 1 class definition. Rename = grep + pray.
3. **Validator registry silent fallback.** `Level01Scene.ts:912-922` looks up `validatorRegistry.get(currentQuestion.id)`; on miss, **silently falls back to `partitionEqualAreas`**. Wrong validator runs, no error surfaces.
4. **localStorage side-channels.** `suggestedLevel:*` (Level01:1477), `streak:*` (streak.ts), `onboardingSeen` (OnboardingScene:415), `LOG` (lib/log.ts:40). Each is a state-leak that bypasses repos.
5. **`HintEvent.attemptId` placeholder.** Hints are recorded with `attemptId: '' as unknown as AttemptId` *before* the attempt exists; a retroactive update at `Level01Scene:1334` links them. If the update throws, the hint orphans permanently.

This is the cascade. Fixing the surface findings one at a time (the v2 phase plan) is correct, but it leaves the Original Sin in place. **Future change will keep generating findings at the same rate** unless the underlying seam is repaired.

### 12.3 Pathological state — verified failure simulations

Ten high-entropy scenarios were traced through the actual code paths on 2026-05-01. **9 of 10 are CONFIRMED**: they produce silent data loss, corrupt state, or unrecoverable UI conditions under realistic conditions on a K-2 student device. The Original Sin makes each one harder to fix than it should be, because the failure boundary cuts across scene + persistence + engine all at once.

| #   | Scenario                                | Status     | Effect                                                                 | Where                                           |
| --- | --------------------------------------- | ---------- | ---------------------------------------------------------------------- | ----------------------------------------------- |
| P1  | Rapid double-tap submit race            | CONFIRMED  | Two attempt rows; `updateMastery` runs twice with stale priors        | `Level01Scene.ts:869-873, 1047-1048` (re-entry guard releases on async feedback callback, not on transaction completion) |
| P2  | Scene tear-down mid-write               | CONFIRMED  | In-flight Dexie write orphaned; attempt may be lost                   | `Level01Scene.ts:1276-1428` await; `:1596-1603` preDestroy doesn't await pending promises |
| P3  | `QuotaExceededError` mid-session        | CONFIRMED  | UI shows success; DB has no record; mastery state diverges from DB    | `Level01Scene.ts:1424-1426` — error logged via `log.error` and ignored |
| P4  | localStorage cleared mid-session        | CONFIRMED  | Stale `studentId` on in-flight scene; insert fails silently           | `SettingsScene.ts:276-284` deletes DB; `Level01Scene.ts:1281` reads stale field |
| P5  | Schema upgrade tab-close                | PARTIAL    | v6 has no `.upgrade()` callback; safe today (metadata-only) but **fragile** for v7 | `db.ts:176-204` |
| P6  | Detector throw cascades                 | CONFIRMED  | First throwing detector aborts the pass; #2-16 skipped silently        | `misconceptionDetectors.ts:791-848` — sequential calls, no per-detector try/catch |
| P7  | SW update mid-session                   | REFUTED    | Validators are bundled, not DB-resident; fallback path absorbs        | `Level01Scene.ts:914-924` |
| P8  | Memory leak via preDestroy gaps          | CONFIRMED  | 4 components untracked: `dragHandle`, `shapeGraphics`, `partitionLine`, `mascot` | `Level01Scene.ts:1596-1603`; created at `:310, 314-315, 829` |
| P9  | Hint event orphaned                     | CONFIRMED  | Hints recorded with `attemptId: '' as unknown as AttemptId`; retroactive link can fail silently | `Level01Scene.ts:1177-1185` (placeholder), `:1334-1339` (link can throw and is swallowed) |
| P10 | Replay determinism                      | CONFIRMED  | `Math.random` at 4+ sites blocks reproducibility for any debug session | `selection.ts:86-88`; `Level01Scene.ts:632, 642`; user drag input |

**The pattern:** every failure mode is a **boundary failure** — the thing that crosses scene ↔ persistence, scene ↔ engine, or scene ↔ side-channel localStorage. A Domain layer with explicit state-transition invariants and an event log would make each one structurally hard:

- **P1** would be impossible if attempt submission were a `Session.submit(answer)` command on a domain entity that emits `AttemptSubmitted` exactly once per call (FSM blocks re-entry until the previous transition completes).
- **P2** would be impossible if the scene didn't own the persistence write — the application service would, and the scene's destruction would have no effect on the in-flight command.
- **P3** would surface to UI if the application service treated `QuotaExceededError` as a domain failure (`SessionWriteRefused` event) rather than a swallowed try/catch.
- **P9** would be impossible because `HintShown` would emit before the attempt exists; the event log would order them naturally and the linking would be a projection, not a retroactive update.
- **P10** would be trivially fixable because the application service's `selectNextQuestion` use case would receive an injected RNG.

These are not coincidences. They are the structural footprint of the missing Domain layer.

### 12.4 Architectural debt vs velocity — what's earning, what's speculative

A separate forensic pass (2026-05-01) measured eight major abstractions for "complexity tax vs. value delivered." **Total speculative over-engineering: ~1,500 LOC across 6 abstractions that are dormant, half-built, or theatrical.**

This is direct **pushback on the v2 plan**, which assumed all eight abstractions were earning their cost. They are not.

| Abstraction                                  | LOC  | Actual usage                                  | Verdict          | Recommended action                                                          |
| -------------------------------------------- | ---- | --------------------------------------------- | ---------------- | --------------------------------------------------------------------------- |
| **`engine/ports.ts`** (DIP interfaces)       | 85   | **0** injected; 114 direct global calls bypass it | **HALF-BUILT**   | Either complete the port-injection refactor (Phase 2, 4, 12) or **delete** until ready. Current state creates false confidence of an abstraction that doesn't exist. |
| **OpenTelemetry stack** (10 npm packages)    | ~80  | **3 spans** (all Dexie middleware). Zero traces consumed. `VITE_OTLP_URL` never set. | **DORMANT**      | **Delete the 10 packages and `tracer.ts`.** Re-introduce when there is an actual consumer. The dormant build cost is real even with lazy imports (~50 KB API ships). |
| **Sentry (`errorReporter.ts`)**              | 91   | 21 emission sites; lazy-loaded; gated by `VITE_SENTRY_DSN` | **EARNING**      | Keep. Only observability primitive earning its cost. |
| **i18n catalog + format helpers**            | 572  | Centralized strings used (good); ICU plurals, tone tags, copyLinter all unused | **HALF-BUILT**   | Keep the catalog (centralized strings still earn). **Strip ICU/tone-tag/linter complexity** — saves ~150 LOC. Re-add when multi-locale ships (per D-27, never). |
| **BKT (`engine/bkt.ts`)**                    | 137  | 2 call sites; **K-2 sessions feed 5-10 observations**, BKT converges at ~20+ | **EARNING but OVER-SPEC** | Keep. Document priors as placeholder. **Add a convergence test** for K-2 skill ladders. If it fails, replace with `recentAccuracy > 0.8 ∧ consecutiveCorrect ≥ 2` heuristic. |
| **Misconception detectors** (16 functions)   | 849  | runAllDetectors called per submit, **but UI consumes 0 flags** (no hint adjustment, no mastery boost, no UX surfacing) | **DORMANT (write-only)** | **Lazy-import behind a flag.** Stop writing flags to Dexie until the consumer exists. Reclaim the 849 LOC when the hint-adjustment feature ships. |
| **Branded-ID system** (`types/branded.ts`)   | 55   | 0 smart-constructor calls; 126 `as` casts bypass | **OVER-SPEC**    | **Delete the smart-constructor functions.** Keep the type definitions (cheap nominal-typing). The brand was a compile-time guardrail; the casts are everywhere. The illusion is worse than no brand. |
| **Engine adapters** (commit `3dd038b`)       | 50   | 0 wired to scenes                             | **HALF-BUILT**   | Same fate as `ports.ts`: complete the wiring or delete the scaffolding. Do not ship "partial Phase 2" as a permanent state. |

**Total speculative debt:** ~1,500 LOC across ports, OTel, half of i18n, misconception write-only path, branded constructors, and adapters. **Genuinely earning:** Sentry (91 LOC), BKT math (137 LOC, conditionally), and the i18n catalog *as a centralized strings registry* (~400 LOC).

#### Substantive pushback on v2 recommendations

The v2 plan made three recommendations (A1–A3). The forensic audit reveals that two of them are **tactically correct but strategically incomplete**:

- **A1 — Sunset Level01Scene.** Still correct as a deletion target. But framing matters: the duplication is *caused by* the Original Sin, not the cause itself. Deleting Level01Scene removes the symptom. **The deeper fix is extracting a Domain layer; once that exists, Level01Scene and LevelScene become identical thin views and the deletion is mechanical.**

- **A2 — Eliminate Python parity.** Correct under the current architecture. But under the Ideal State (§12.5), validators become **domain methods on the `Question` entity**, executed by the same TS code in both runtime and pipeline contexts via Pyodide or a Node subprocess. The parity question doesn't get *enforced*; it *dissolves*.

- **A3 — Lint-enforce engine DIP.** Correct as a backstop. But lint rules are how you *prevent* drift in a properly layered system; they're a poor substitute for the layering itself. **The real fix is moving engine logic into the Domain layer, where DIP is structural rather than lint-enforced.** Lint as a boundary is a smell — it means the module structure didn't make the wrong code uncompileable.

#### New architectural recommendation A4: delete or finish, but stop scaffolding

The codebase has multiple "phase 2 partial" states (commit `3dd038b`, the i18n catalog over-spec, the OTel dormancy). **Each partial abstraction is worse than no abstraction** because future readers assume it works. Either complete each one in this plan's scope or delete it explicitly. **No more "we'll finish it later" scaffolding** — the half-built state is the trap.

### 12.5 The Ideal State: layered architecture with domain events

The Ideal State is not exotic. It is the **standard four-layer hexagonal architecture** with an event log on top. Most of the building blocks already exist in the codebase — they are just in the wrong layer.

```
╔══════════════════════════════════════════════════════════════════════╗
║                    PRESENTATION LAYER (Phaser)                        ║
║   src/scenes/*  src/components/*                                      ║
║   • Render. Input. Tween lifecycle.                                   ║
║   • Subscribe to domain events. Dispatch commands.                    ║
║   • Zero state ownership. Zero persistence calls. Zero business rules.║
╚════════════════════════════╤══════════════════════════════╤══════════╝
                             │ commands                     │ events
                             ▼                              ▲
╔══════════════════════════════════════════════════════════════════════╗
║                   APPLICATION LAYER (use-cases)                       ║
║   src/app/*  (NEW)                                                    ║
║   • SessionCoordinator (FSM)                                          ║
║   • SubmitAnswerUseCase, ShowHintUseCase, AdvanceLevelUseCase         ║
║   • Threads ports through to the domain. Owns transactions.          ║
╚════════════════════════════╤══════════════════════════════╤══════════╝
                             │                              │
                             ▼                              ▲
╔══════════════════════════════════════════════════════════════════════╗
║                          DOMAIN LAYER                                 ║
║   src/domain/*  (NEW)                                                 ║
║   • Session: entity with FSM (loading→ready→presenting→awaiting→     ║
║     validating→feedback→recording→complete). Invariant: state         ║
║     transitions are explicit; UI cannot read pre-increment state.    ║
║   • Question: entity with .validate(input) method (replaces validator ║
║     registry). Holds payload + validator + skill context.            ║
║   • Attempt: entity. Constructed by Session.submit(); immutable.      ║
║   • Mastery: aggregate root over a skill. updateWith(attempt) method.║
║   • MisconceptionRule: data table interpreted by domain service.     ║
║   • Hint: entity. emitted before attempt; orphaning impossible.      ║
║   • All domain types use branded IDs constructed via factories.       ║
║   • Pure: no Phaser, no Dexie, no globals. Tests: zero mocks needed. ║
╚════════════════════════════╤══════════════════════════════╤══════════╝
                             │                              │
                             ▼                              ▲
╔══════════════════════════════════════════════════════════════════════╗
║                       INFRASTRUCTURE LAYER                            ║
║   src/persistence/*  src/curriculum/*  src/lib/observability/*        ║
║   • Dexie repositories (already exist)                                ║
║   • Curriculum loader (already exists)                                ║
║   • Sentry / OTel (lazy, gated; OTel deletable per §12.4)             ║
║   • Pipeline (Python content gen; TS validation per A2)               ║
║   • Adapters: ClockAdapter, RngAdapter, IdGeneratorAdapter            ║
╚══════════════════════════════════════════════════════════════════════╝

                    ┌──────────────────────────────────┐
                    │  CROSS-CUTTING: DOMAIN EVENT LOG │
                    │  src/domain/events/* (NEW)       │
                    │  Append-only. Every transition   │
                    │  emits a typed event:            │
                    │   • SessionStarted               │
                    │   • QuestionPresented            │
                    │   • HintShown                    │
                    │   • AttemptSubmitted             │
                    │   • AttemptValidated             │
                    │   • MasteryUpdated               │
                    │   • MisconceptionFlagged         │
                    │   • SessionCompleted             │
                    │  Repositories become projections │
                    │  off this log. Misconception     │
                    │  detection is an event handler.  │
                    │  BKT update is an event handler. │
                    │  Replay = re-process the log.    │
                    └──────────────────────────────────┘
```

#### Why this resolves the cascade

- **Scene duplication (§1.1) → vanishes.** Both scenes become thin views over the same `SessionCoordinator`. Their only differences are visual (the L1 scene has a colorful tutorial mascot; L9 doesn't). Deleting Level01Scene becomes a 1-PR cleanup, not a 14-hour migration.
- **Untyped scene init (Q57) → vanishes.** Scenes don't pass session state to each other; they subscribe to the application service. Scene constructors take only the `SessionId` to render.
- **Branded-ID bypass (Q56) → vanishes.** Domain entities are constructed only via factories; `as *Id` casts become impossible because the types never escape the persistence boundary as raw strings.
- **State scattered (Q55) → vanishes.** The domain `Session` entity is the single source of truth. Scene fields cache *projections* of it for rendering, never the truth.
- **BUG-02 progress-bar pre-increment → impossible.** The FSM forbids reading post-increment state until the transition completes. The UI subscribes to `AttemptSubmitted` events, which carry the new count; pre-increment state is unreachable.
- **Detector throw cascade (P6) → vanishes.** Detectors become event handlers; each subscribes independently to `AttemptValidated`. One handler's exception cannot affect the others.
- **Replay (P10) → free.** Replay is "process the event log into a fresh projection state." Math.random gets injected at the application service boundary; given a seed and an event log, the entire session reproduces.
- **Pipeline parity (Q11) → dissolves.** Validators are domain methods on `Question`. The pipeline calls the same TS code as the runtime via Pyodide or Node subprocess. There is nothing to mirror.

#### What gets deleted

- `engine/ports.ts` (85 LOC) — replaced by domain interfaces
- `engine/adapters/index.ts` (50 LOC) — replaced by infrastructure adapters
- `engine/misconceptionDetectors.ts` 850 LOC of imperative code → ~50 LOC interpreter + a data table
- `Level01Scene.ts` (1604 LOC) — entire file
- ~600 LOC of duplicated state/persistence/business logic from `LevelScene.ts`
- `pipeline/validators_py.py` (~400 LOC) and `pipeline/parity_test.py` — Python parity machinery
- OpenTelemetry stack (~80 LOC + 10 npm packages) — until a consumer exists
- ICU/tone-tag/copyLinter complexity in i18n (~150 LOC) — until multi-locale ships
- Branded-ID smart constructors (10 functions, ~30 LOC) — replaced by domain factories

**Total deletion:** ~3,400 LOC removed. **Total addition** (domain layer + application layer + event types): ~1,200 LOC. **Net:** ~2,200 LOC smaller, with significantly more behavior expressed declaratively.

### 12.6 Migration staging — current 16 phases mapped to a 4-stage evolution

The v2 plan's 16 phases are not invalidated by this synthesis; they are **re-contextualized as Stage 1 of a 4-stage architectural evolution**. The forensic findings above don't replace the tactical work — they situate it.

#### Stage 1 — Stabilize the current architecture (≈115 hr · v2 plan as written)

Ship Phases 0, 0.6, 1, 2, 5, 7, 11, 13 in parallel. Then 3, 4, 6, 8, 12. Then 9, 10. Acceptance criteria per the v2 §8 Definition of Done.

**Strategic value:** keeps the codebase shippable, fixes the active bugs, gates the security CVEs, closes C5, makes the engine deterministic. **Does not address the Original Sin**, but reduces the rate of new findings to roughly zero so Stage 2 can proceed without firefighting.

**Critical Stage 1 modifications informed by §12.4:**
- **Phase 4.x (misconception data-ification):** mark detectors as DORMANT in `CLAUDE.md`; lazy-import them; **stop writing flags to Dexie until the consumer exists.** Reclaim 849 LOC at Stage 3.
- **Phase 7 (bundle/observability):** **delete the 10 `@opentelemetry/*` packages** rather than just lazy-loading them. Sentry stays. -50 KB unpacked, -8 chunks, simpler bundle picture.
- **Phase 8.7 (branded-ID hardening):** **delete the smart-constructor functions** (currently 0 callers). Keep the type definitions. The casts are everywhere; there's no point pretending otherwise. Real validation happens at the persistence/curriculum boundary.
- **Phase 8 i18n cleanup (NEW):** strip ICU format, tone tags, and copyLinter from `lib/i18n/`. Keep the catalog as a centralized strings registry. Saves ~150 LOC.
- **Recommendation A4 (NEW):** every Stage 1 PR must either complete an abstraction or delete it. **No more "Phase 2 partial" merges.**

#### Stage 2 — Extract the Domain layer (≈60 hr · 2-3 weeks)

Build `src/domain/*` and `src/app/*`. Start narrow:

1. Define domain types: `Session`, `Question`, `Attempt`, `Mastery`, `Hint`, `MisconceptionRule`. ~400 LOC.
2. Build `SessionCoordinator` FSM. States: `loading | ready | presenting | awaiting | validating | feedback | recording | complete`. State transitions are explicit functions; preconditions enforced.
3. Build use cases: `SubmitAnswer`, `ShowHint`, `AdvanceLevel`. Each one accepts injected ports (RNG, clock, repositories).
4. Migrate validation logic out of `engine/` into `Question.validate(input)`. The validator registry becomes a domain factory.
5. Migrate BKT update out of `engine/bkt.ts` into `Mastery.updateWith(attempt)`.
6. **Refactor LevelScene** to consume the application layer. Scene becomes ~400 LOC of pure rendering + input.
7. **Delete Level01Scene** (its entire content collapses into `LevelScene` + a domain `Session` with L1 metadata).
8. Production wiring: scenes inject the application service via Phaser scene `init(data)`; data carries a `SessionId`, not a state bag.

**Acceptance:**
- `LevelScene.ts` ≤ 500 LOC
- `Level01Scene.ts` deleted
- `src/domain/*` is testable in pure Vitest with zero Phaser, zero Dexie
- Unit-test coverage on domain ≥ 90%
- All v2 §8 Definition of Done #1-15 still hold

#### Stage 3 — Introduce the event log (≈40 hr · 1-2 weeks)

1. Define event types in `src/domain/events/*`. Each event is a typed record (`SessionStarted`, `AttemptSubmitted`, `MasteryUpdated`, etc.).
2. Add an append-only `eventLog` table in Dexie. Every command emits one or more events. Repositories become projections off the log.
3. Migrate misconception detectors from imperative aggregator to **event handlers** subscribed to `AttemptValidated`. Each detector is a 20-LOC handler.
4. Migrate BKT update from synchronous call to event handler subscribed to `AttemptValidated`.
5. Replay tooling: a `replaySession(sessionId)` command rebuilds projection state from the event log. Used for QA, support, and audit.
6. Delete `engine/misconceptionDetectors.ts` (850 LOC of imperative pattern-matching).
7. Delete `engine/ports.ts` and `engine/adapters/*` — replaced by domain interfaces and infrastructure adapters in their proper layers.

**Acceptance:**
- Replay test: a recorded session reproduces byte-for-byte deterministically
- Adding a new misconception is a single-row addition to a rule table + a 1-line event handler subscription
- ~1,000 LOC net deletion from this stage

#### Stage 4 — Polish & dissolve parity (≈30 hr · optional, 1 week)

1. Move pipeline validation to TypeScript (recommendation A2 from v2 / Phase 9). Pyodide or Node subprocess.
2. Delete `pipeline/validators_py.py` and `pipeline/parity_test.py`.
3. Decommission `validator-parity-checker` subagent.
4. Convergence-test BKT for K-2 ladder. If priors don't converge in 5-10 observations, swap for the recent-accuracy heuristic. Either keep the rich BKT (validated) or simplify (replaced) — no more theoretical pseudo-correctness.

**Acceptance:**
- One validator implementation, executed in two contexts
- BKT either validated for K-2 sample size or replaced with a heuristic
- Phase 9 of v2 fully closed

#### Stage timeline

```
Stage 1 ─────────────► Stage 2 ─────► Stage 3 ──► Stage 4
(115 hr · 3 weeks)    (60 hr · 2 wk)  (40 hr · 1 wk) (30 hr · 1 wk)
                                              
[stabilize]            [domain layer]   [event log]    [parity]
```

**Total commitment:** ~245 hr / ~7 weeks for one engineer to reach the Ideal State. This is a real investment; it should be weighed against the cost of *not* doing it (every new feature compounds the Original Sin).

**Stage 1 alone is shippable** — it does not commit to Stages 2-4. But it should be designed to *not block* them. The largest risk: shipping Stage 1 phase 3 (sunset Level01Scene) via Path B (`QuestionLoopController` extraction) creates a *new* abstraction in the wrong layer, which then has to be unwound during Stage 2. **Recommend Stage 1 Phase 3 = Path A (delete Level01Scene cleanly), not Path B.** Path B is a Stage-1 hedge that costs Stage-2 velocity.

### 12.7 Closing argument

The codebase is healthier than its surface suggests, but its trajectory is not. The Original Sin (Phaser Scene as application unit, no Domain layer) is generating findings at a steady rate; each sprint that doesn't address it raises the cost of the eventual fix.

**Three things to commit to today:**

1. **Stage 1 (the v2 plan as written, with the §12.4 modifications).** Tactical, ~3 weeks, ships independently.
2. **A decision on Stage 2** — yes / defer / no. If yes, scope it now so Stage 1's choices don't preclude it. If no, document the architectural ceiling that is being accepted (which would mean: every new level, every new mechanic, every new interaction will accrue duplication and state-leak debt at the current rate).
3. **Recommendation A4 (delete or finish, never scaffold).** Apply retroactively to ports.ts, adapters, OTel, ICU helpers, branded-ID constructors. The half-built state is the problem.

The rest follows.

**End of plan.**

