# Forensic Deep-Dive — Questerix Fractions

**Status:** Companion to `code-quality-2026-05-01.md`. Deeper layer.
**Last updated:** 2026-05-01
**Scope:** Code archaeology · concurrency forensics · counter-argument to v3 Ideal State · revised migration proposal.

---

## Why this file exists

`code-quality-2026-05-01.md` v3 contains a 16-phase tactical plan plus a forensic synthesis (§12) proposing a 4-stage migration to a hexagonal + event-sourced Ideal State. That file is already substantial.

**This file is not a continuation of v3** — it is a deeper, more honest re-examination of three questions v3 only partly answered:

1. **How did the Original Sin happen?** Was it accidental drift or a deliberate trade-off? Where exactly did it lock in?
2. **What is the codebase's actual concurrency contract** — the rules implicit in how Phaser's sync frame loop interfaces with Dexie's async persistence layer? (v3 enumerated 10 pathological scenarios; it did not articulate the underlying contract that produces them.)
3. **Is the v3 Ideal State proposal correct, or is it pattern-matching "what a senior architect builds for a 5-year SaaS" against a solo K-2 validation prototype?**

Answering #3 honestly required dispatching an agent specifically to **counter-argue against my own proposal**. The result is significant: the v3 Ideal State is partially overkill, and a much lighter pivot captures most of its value at ~25% of the cost.

The migration roadmap in v3 §12.6 should be revised. This document supplies the revision.

---

## 1. Code archaeology — the Original Sin was deliberate, not accidental

The v3 synthesis named the Original Sin (Phaser Scene as application architecture) but did not investigate its origin. A git-history audit on 2026-05-01 produces a clear narrative.

### 1.1 The pre-decision: D-08 (2026-04-24)

**Decision-log entry D-08:** *"No new code in `src/` until the `/docs` foundation suite (28 documents) is complete and reviewed. The unanswered questions are pedagogical, not technical."*

This was the founding choice: **prioritize pedagogical specification over architectural specification**. The decision-log between D-01 and D-08 covers constraints (no backend, no teacher surface, no frontend framework), content strategy (9-KC taxonomy, parity contract), and persistence stack (Dexie 4 + PWA + `navigator.storage.persist()` per D-07). **It contains zero entries about application architecture.**

When implementation began on 2026-04-26, the team had no architectural decision on how to structure the application *once the pedagogy was settled*. The default won: Phaser Scenes absorbed all the orchestration logic.

### 1.2 The inflection cascade (2026-04-26)

Three commits on a single day locked in the Original Sin:

| Commit    | Time           | Effect |
| --------- | -------------- | ------ |
| `2bfd7c5` | 08:27 UTC      | `LevelScene.ts` introduced as **"generic config-driven scene for levels 1–9. Receives `{ levelNumber: 1..9 }` via init(), loads templates from Dexie, and drives one Interaction per question."** Purpose-built as a generic router from day one. |
| `d620e21` | 09:00 UTC      | `LevelScene` registered in scene config; system shipped L1. |
| `4e10460` | 10:27 UTC      | **Phase 7 commit — "Engine wiring — misconception detection, session management, hint telemetry"** — wired BKT, `runAllDetectors`, and session management into `LevelScene` only. Level01Scene was left as a frozen artifact with a different orchestration path. |

**Commit `4e10460` is the bifurcation point.** From that moment, the codebase had two scenes with divergent contracts. `LevelScene.recordAttempt` calls `runAllDetectors`. `Level01Scene.recordAttempt` does not. **The BKT mastery store silently bifurcates into two namespaces:** `LevelScene` writes `skill.level_${n}`; `Level01Scene` writes `skill.partition_halves`. A real student playing L1 then L2 acquires two unrelated mastery records under different skill IDs.

### 1.3 The deferred fix: ports.ts (2026-04-28)

Commit `3dd038b` added `src/engine/ports.ts` with the message: *"Introduces the dependency-inversion foundation for Phase 2 architectural integrity… Remaining Phase 2 items (Application layer, detector/selection/calibration refactor to accept ports, C5 localStorage breach) are **larger architectural changes deferred to follow-up.**"*

The author saw the problem two days after it was committed and proposed the fix. **The fix was never executed.** `engine/ports.ts` shipped as scaffolding (0 injection sites today, 6 interfaces defined, 5 production adapters never wired). The Application layer was never built.

### 1.4 What this means for remediation

**The Original Sin was a deliberate trade-off under time pressure**, not an unconsidered mistake. The team:

- Knew the codebase needed an Application layer (`3dd038b` commit message proves this)
- Chose to defer it in favor of pedagogy speed (per D-08)
- Documented the decision as temporary
- Then never followed through

This distinction matters. **A team that *accidentally* embedded orchestration in scenes will resist the architectural fix** ("but it works"). **A team that *deliberately* deferred the architectural fix will accept it** ("we always knew this was coming"). The remediation conversation should reference `3dd038b` directly: "you wrote this. We're finishing it now."

**The post-hoc diagnosis exists.** Quote from the master_audit_roadmap (2026-04-27, one day after the cascade): *"Every other vulnerability in this report is downstream of the missing Application layer. Fixing telemetry, portability, or UX without first introducing it entrenches the rot rather than excises it."*

That sentence was written 3 days before this plan. **The team has known.** What's been missing is a credible remediation path that doesn't blow the schedule. §4 of this document supplies one.

## 2. Concurrency forensics — the implicit contract

The v3 plan listed 10 pathological scenarios and verified 9 of them. This section steps back and articulates the **underlying concurrency contract** the codebase has accidentally adopted. Once the contract is named, the failures become predictable — they are not 10 separate bugs but a few violations of a small set of rules the codebase doesn't realize it depends on.

### 2.1 The contract the codebase has by accident

The Phaser frame loop is **single-threaded synchronous**, running at 60Hz. Dexie is **Promise-based async**, dispatching to IndexedDB which has its own browser-managed transaction lifecycle. The codebase's scene methods routinely `await` Dexie operations from inside event handlers. This sets up four implicit rules the codebase needs to honor and currently does not:

| Rule (currently implicit)                                                        | Where it's violated                                                                                                       |
| -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| **R-A:** A pending write must complete before the UI advances state.             | `Level01Scene.ts:949-950` — `showOutcome(result)` is sync (UI advances); `await recordAttempt(...)` happens *after*. User sees "Correct!" before the DB write completes. If the write fails, the feedback is a lie. |
| **R-B:** Re-entry guards must release on transaction completion, not on UI animation. | `Level01Scene.ts:870-873, 1046-1048` — `inputLocked = true` on entry; released inside the feedback-overlay onComplete callback (~600 ms later), independent of whether the Dexie write actually committed. |
| **R-C:** Scene destruction must abort or await in-flight Promises.                | `Level01Scene.ts:1596-1603` — `preDestroy()` is sync; outstanding `recordAttempt` Promises continue executing in the background. Phaser destroys `tapZone`, `mascot`, `dragHandle`; Promise resolution may try to call `.setAlpha()` on the destroyed objects. Phaser silently no-ops in non-strict mode. |
| **R-D:** Sequentially-dependent writes must share failure isolation.              | `Level01Scene.ts:1276-1428` — attempt-insert → hint-update → mastery-upsert → detector-fan-out is a sequential chain; if step 1 throws, steps 2-4 never run, but each subsequent step has its own try/catch that masks the upstream failure. |

**Concurrency state inventory (2026-05-01 measurement):** 3 UNGUARDED failure modes, 3 PARTIAL guards, 3 GUARDED. The 3 UNGUARDED ones — feedback-before-persist (R-A), shutdown-vs-Promise (R-C), destroyed-object access — each correspond to a real user-visible bug class.

### 2.2 The single most consequential ordering: feedback before persist

This deserves its own callout because it is **the worst defensive-engineering bug in the codebase** and v3 didn't name it cleanly.

```
// Level01Scene.ts:949-950
this.showOutcome(result);                     // SYNC — overlay tween fires immediately
await this.recordAttempt(result, responseMs); // ASYNC — DB write happens *after*
```

Timeline of a single submit:

| t (ms) | Event                                                  |
| ------ | ------------------------------------------------------ |
| 0      | User taps "Check"                                      |
| 0      | `inputLocked = true`; submit button dims               |
| 0      | `showOutcome("correct")` → FeedbackOverlay starts tween |
| 0–600  | User sees "Correct!" overlay animating                 |
| 100–250 | (typical) Dexie attempt write begins                   |
| 600    | Overlay onComplete fires → `inputLocked = false`        |
| 600+   | (still pending) Mastery upsert + misconception detection running |
| 800–1500 | All Dexie writes complete (best case)                |

**The user sees "Correct!" between t=0 and t=600 ms while the DB is still pending.** If `QuotaExceededError` fires at t=300 ms, the catch block logs it and silently swallows. The student has just been told their answer was correct on a question that was never recorded. Their mastery state did not update. Their progress bar advanced in memory and rolled back on next session. **This is BUG-02's family.** The progress-bar pre-increment is the visible symptom; the deeper invariant — "user-visible state must lag persistence, not lead it" — is violated systemwide.

**The fix is one line of ordering**: `await recordAttempt(...)` must happen **before** `showOutcome`. The user sees a brief "Saving..." shimmer for 100-300 ms; the feedback overlay is honest. This change alone closes the worst concurrency hole. It does not require a Domain layer.

### 2.3 The full surface

| #   | Concern                                                  | Status     | Recommendation (for Stage 1)                                   |
| --- | -------------------------------------------------------- | ---------- | -------------------------------------------------------------- |
| C1  | Frame loop continues during `await`                      | PARTIAL    | Document the boundary; add timeout if Dexie unreachable        |
| C2  | Re-entry guard ties to overlay, not to transaction       | PARTIAL    | Decouple guard release from animation                          |
| C3  | preDestroy doesn't await pending writes                  | UNGUARDED  | Track in-flight Promises; await or abort in preDestroy         |
| C4  | Sequential await chain has uneven failure isolation      | PARTIAL    | Wrap critical chain in single `db.transaction`                 |
| C5  | `update(time, delta)` does not touch async state         | GUARDED    | None; pattern is correct                                       |
| C6  | Feedback shown before persistence                        | UNGUARDED  | **One-line ordering fix** at `Level01Scene:949-950` and mirror |
| C7  | Dexie ops sequential, not nested in single transaction   | GUARDED    | None; pattern is safe                                          |
| C8  | `loadQuestion` waits for templates before scene interactive | GUARDED | None                                                           |
| C9  | Promise resolution after scene destruction               | UNGUARDED  | Check `this.scene.isShutdown` before scene-state writes        |

**The remediation for ~80% of the concurrency risk is two changes in Stage 1:**

1. Reorder `await recordAttempt(...)` before `showOutcome(result)` (closes R-A and significantly reduces R-B/R-D blast radius).
2. Tag scene-state writers with `if (this.scene.isShutdown) return` (closes R-C).

Both are 1-line edits, replicated to both `Level01Scene` and `LevelScene`. **Total effort: <1 hour. Total risk reduction: most of the concurrency surface.** This belongs in Phase 1 of the tactical plan, not in some future Stage.


## 3. Counter-argument: is the v3 Ideal State the right tool for *this* job?

Code-quality v3 §12.5 proposes a 4-layer hexagonal architecture with an event log. A separate forensic pass on 2026-05-01 was tasked with **arguing against that proposal** — not for the sake of contrarianism, but to test whether the prescription survives scrutiny. The result is significant: **most of v3's Ideal State is the wrong tool for this codebase**, despite the diagnosis being correct.

This section reproduces the critique. The next section translates it into a revised migration roadmap.

### 3.1 Q1 — Is event sourcing overkill for a single-user offline app?

**Yes.** Event sourcing's canonical justifications are: distributed consistency, multi-writer ordering, regulatory audit, time-travel debugging across opaque systems. **All of these are forbidden by C1-C10.** C1 forbids backends (no second writer). C2 forbids teacher/admin views (no audit consumer). The "replay" benefit is not load-bearing: a 5–10 attempt session (per C9) is already cheap to reproduce from the existing append-only `Attempt` rows.

The structural wins v3 attributes to the event log can be obtained without one:

- **P6 (detector throw cascade):** wrap each detector in `safe(d, snapshot)`. Three lines of code, not a Stage.
- **Misconception detection isolation:** pass an immutable `AttemptSnapshot` to a pure-function detector array. Same isolation guarantees as event handlers; no event log; no projection rebuild logic.
- **Replay:** seed the RNG (already in v3 Phase 4); replay walks the existing Attempt table and re-runs detectors. No event log needed.

**The event log delivers ~$200 of value for ~$4,000 of complexity.** Skip it.

### 3.2 Q2 — Is a Domain layer the right abstraction for 9 similar levels?

**No, not at the proposed scope.** Hexagonal architecture earns its keep when (a) the domain has many independent concepts, (b) the application outlives its first stack, or (c) multiple delivery channels share business rules. **None of this applies here.**

- 9 levels share one loop (load → drag → validate → record → next).
- 10 archetypes already share a `validators/registry.ts`.
- One delivery channel (Phaser canvas).
- C3 caps content at L9; the domain is **not going to grow**.

The §12.5 deletion table claims ~3,400 LOC removed / ~1,200 added (net –2,200). But ~2,400 of those deletions (Level01Scene + LevelScene dupes + detector imperative code + Python parity) are **achievable in v3 Stage 1 alone, without a Domain layer**. The Domain-layer-specific net is closer to neutral — entity factories + FSM transitions + port wiring + domain events all add boilerplate that has to live somewhere.

The abstraction earns itself only if you commit to many more levels post-2029. C3 forbids that.

### 3.3 Q3 — Is the proposed FSM imposed or observed?

**Imposed, not observed.** Searching the codebase and PR history for v3's proposed states (`loading | ready | presenting | awaiting | validating | feedback | recording | complete`) yields nothing. The team's actual mental model — visible in `Level01Scene.ts`, `master-plan-2026-04-26.md`, and the active bug list — is **two states**: "showing question" and "showing feedback", plus a re-entry guard (`isSubmitting`).

BUG-02's root cause is a state-mutation ordering issue. It is fixable with **one explicit transition function**, not eight states. The 8-state FSM is what an architect *would* design from scratch; it is not how implementers describe their bugs.

A **3-state FSM (`presenting | submitting | feedback`)** captures the BUG-02 invariant without ceremony. Imposing more states means every contributor pays a translation tax forever (debug log says `state=awaiting`, mental model says "waiting for drag").

### 3.4 Q4 — What is genuinely lost by skipping Stages 2–4?

Concretely under the current architecture, the K-2 game **cannot**:

- **Replay a session for QA.** Recoverable today via Attempt rows + seeded RNG (v3 Phase 4 already plans seeded RNG).
- **Add a misconception in 1 line.** True gap. New misconceptions arrive ~quarterly, not weekly. v3 Phase 4.x (data-table refactor of `misconceptionDetectors.ts`, ~6 hr) gets 80% of this without a Domain layer.
- **Test scenes without a canvas.** Real gap. v3 Phase 2 (DIP enforcement) extracts business logic into testable modules; the residual untested surface is rendering, which is what Playwright is for.
- **Compose two scenes from one Session.** Not a current requirement.

What is **not** lost: shipping the MVP, validating the mechanic (C10), persisting student progress, deploying to Cloudflare Pages, hitting the bundle budget. **All MVP exit criteria are achievable on Stage 1 alone.**

Trading 100+ hours against a solo-validation project that may be rewritten post-2029 is a poor expected-value bet. **C10 says don't optimize for that yet.**

### 3.5 Q5 — The 20% pivot that captures 80% of the value

A `SessionService` class (~300 LOC, ~25 hr to extract) with:

- Explicit state-transition methods: `presentQuestion`, `submitAnswer`, `recordResult`, `advance`
- Injected ports (clock, RNG, repos)
- Snapshot-passing detector signature: `detect(snapshot: AttemptSnapshot): MisconceptionFlag[]`

…captures most of the structural wins:

| v3 Ideal State claim                        | `SessionService` pivot delivers? |
| ------------------------------------------- | -------------------------------- |
| BUG-02 pre-increment race becomes impossible | ✅ State lives behind transitions, not on scene fields |
| P6 detector throw cascade fixed             | ✅ Each detector wrapped in `safe()` |
| Scene duplication dissolved                  | ✅ Both scenes consume `SessionService` |
| Testing trivial without Phaser              | ✅ `SessionService` is plain TS  |
| Branded IDs enforced                         | ✅ At service boundary, not everywhere |
| Replay-from-event-log                        | ❌ But Attempt rows + seeded RNG give 90% of the benefit |
| Declarative misconception rules              | ⚠️ Separate small refactor; orthogonal to architecture |
| Pipeline parity dissolution                  | ⚠️ Recommendation A2 stands; orthogonal |

**Estimated effort: ~25 hours**, vs. ~130 hr for v3 Stages 2 + 3.

### 3.6 Synthesis: what the counter-argument actually says

The Ideal State proposal is **partially correct**:

- ✅ **Original Sin diagnosis is right.** Scenes accreted application logic. Path A (cleanly delete Level01Scene) is preferable to Path B.
- ✅ **A4 (delete or finish, never scaffold) is right.** Half-built abstractions are worse than no abstractions.
- ✅ **Recommendation A2 (eliminate Python parity) is right.** Orthogonal to the architectural debate; just correct.
- ❌ **Full hexagonal layering with event sourcing pattern-matches "what a senior architect would build for a 5-year SaaS"** rather than "what a K-2 validation prototype with a 2029 horizon and a 16-hour-to-MVP backlog needs."
- ❌ **The 8-state FSM is over-modelled.** A 3-state FSM is sufficient.
- ❌ **The event log is overkill.** Snapshot-passing detectors deliver the same isolation.

**The lighter `SessionService` pivot** solves the named pathologies (BUG-02, P1, P6, P9, scene duplication, untestability) without committing to abstractions whose canonical justifications (distribution, audit, replay-as-load-bearing) the constraints document explicitly excludes.


## 4. Revised proposal: the SessionService pivot

This section supersedes v3 §12.6 Stages 2–4 with a lighter, more honest migration that respects the constraints (C1–C10, especially C10: every change must serve validation, not polish).

### 4.1 Migration shape

```
Stage 1 ──────► Stage 2 (revised) ─────► Stage 3 (optional)
(115 hr)         (~30 hr)                  (~12 hr)

[stabilize]      [SessionService          [pipeline TS
                  + detector              parity dissolution
                  refactor +              — recommendation A2]
                  3-state FSM]
```

**Dropped from v3:** the Domain layer with full entity hierarchy; the event log; the 8-state FSM; the projection/replay tooling. These were over-modelled for a K-2 single-user offline app with a fixed scope.

**Total commitment to architecturally-sound state: ~145 hr / 4 weeks** for one engineer. (Down from v3's ~245 hr / 7 weeks.)

### 4.2 Stage 1 modifications informed by this audit

The 16-phase tactical plan in `code-quality-2026-05-01.md` stands, with two additions:

1. **Insert two 1-line concurrency fixes into Phase 1** (or a new Phase 1.5):
   - **C6:** reorder `await recordAttempt(...)` before `showOutcome(result)` at `Level01Scene.ts:949-950` (and mirror in `LevelScene.ts`). Closes the worst defensive-engineering bug in the codebase.
   - **C9:** add `if (this.scene.isShutdown) return` guard at every scene-state writer that runs after an `await`. Closes the destroyed-object access surface.
   - **Combined effort: ~1 hour. Combined risk reduction: ~80% of concurrency surface.**
2. **Apply recommendation A4 retroactively** to the v3 plan's Phase 7 (bundle / observability): **delete the 10 `@opentelemetry/*` packages, not just lazy-load them**, until a consumer exists. Same for `engine/ports.ts` adapters and the i18n ICU/tone helpers (per v3 §12.4).

Stage 1 outcome with these additions: shippable MVP with the bugs fixed, the security baseline current, the C5 closeout complete, the bundle trim earned, and the worst concurrency holes plugged. **Does not address the Original Sin** but reduces the rate of new findings to near zero so Stage 2 can proceed without firefighting.

### 4.3 Stage 2 (revised) — The `SessionService` pivot (~30 hr · 1 week)

Build a single class. It owns the question loop. Both scenes consume it. No new layers, no event log, no domain entities beyond what already exists in `src/types/runtime.ts`.

**Proposed shape:**

```ts
// src/app/SessionService.ts (~300 LOC)

type SessionState = 'presenting' | 'submitting' | 'feedback';

type SessionTransition =
  | { from: 'presenting'; cmd: 'submit'; payload: ValidatorInput }
  | { from: 'submitting'; cmd: 'recorded'; payload: ValidatorResult }
  | { from: 'feedback'; cmd: 'advance'; payload: void };

interface Ports {
  rng: () => number;
  clock: () => number;
  attempts: AttemptRepo;
  mastery: SkillMasteryRepo;
  hints: HintEventRepo;
  flags: MisconceptionFlagRepo;
  detect: (snapshot: AttemptSnapshot) => MisconceptionFlag[]; // pure
  log: (event: string, data: unknown) => void;
}

export class SessionService {
  private state: SessionState = 'presenting';
  private current: { templateId: TemplateId; presentedAt: number } | null = null;

  constructor(
    private readonly sessionId: SessionId,
    private readonly studentId: StudentId,
    private readonly levelNumber: number,
    private readonly ports: Ports,
  ) {}

  // === Transitions ===
  presentQuestion(template: QuestionTemplate): void {
    this.assert('presenting');
    this.current = { templateId: template.id, presentedAt: this.ports.clock() };
    this.ports.log('question.presented', { templateId: template.id });
  }

  async submitAnswer(input: ValidatorInput, validator: Validator): Promise<ValidatorResult> {
    this.assert('presenting');
    this.state = 'submitting';

    const result = validator(input, /* ... */);
    const responseMs = this.ports.clock() - this.current!.presentedAt;

    // CRITICAL: persist FIRST. Feedback comes after.
    await this.recordAttempt(result, responseMs);

    this.state = 'feedback';
    return result;
  }

  advance(): void {
    this.assert('feedback');
    this.state = 'presenting';
    this.current = null;
  }

  // === Internals ===
  private async recordAttempt(result: ValidatorResult, responseMs: number): Promise<void> {
    // Sequential awaits, all within a single try/catch with
    // explicit failure isolation per write.
    // …
    const snapshot = await this.buildSnapshot();
    const flags = safe(this.ports.detect, snapshot, []); // pure
    await this.ports.flags.upsertAll(flags);
  }

  private assert(expected: SessionState): void {
    if (this.state !== expected) {
      throw new Error(`SessionService: state=${this.state}, expected=${expected}`);
    }
  }
}
```

**Migration steps:**

1. **Extract `SessionService`** from the duplicated logic in `Level01Scene.recordAttempt` (1276–1428) and `LevelScene.recordAttempt` (899–1019). The class is plain TS; tests run in Vitest without Phaser. ~6 hr.
2. **Define `Ports` interface** at `src/app/ports.ts`. Wire production adapters in `src/main.ts`. **Delete `src/engine/ports.ts` and `src/engine/adapters/*`** — they are replaced by `app/ports.ts`. ~3 hr.
3. **Refactor misconception detectors** to a snapshot-passing pure-function array (per v3 Phase 4.2 and counter-argument §3.1). 16 detectors become 16 pure functions with unit tests. ~6 hr.
4. **Refactor both scenes** to construct a `SessionService` in `init` and dispatch commands. Scenes own *only* rendering and input. Each scene drops to ≤500 LOC. ~10 hr.
5. **Delete `Level01Scene.ts`** (Path A). With `SessionService` in place, the scene's L1-specific logic collapses into a `LEVEL_META` entry and a couple of conditional renders. ~3 hr.
6. **Add scene-mount tests with `jest-canvas-mock`** for the rendering paths that remain. The business-logic paths are already tested via `SessionService` Vitest. ~2 hr.

**Acceptance:**

- `Level01Scene.ts` deleted.
- `LevelScene.ts` ≤ 500 LOC.
- `SessionService` has ≥ 90% Vitest coverage with zero Phaser/Dexie mocks (uses `Ports` test doubles).
- Adding a misconception is a single-row addition to a rule table.
- BUG-02 family is structurally impossible (state lives behind transitions; UI cannot read pre-increment state).
- All pathological scenarios P1, P3, P6, P9 from v3 are CONFIRMED-FIXED via the new tests.

### 4.4 Stage 3 — Pipeline TS dissolution (~12 hr · optional)

Identical to v3 Phase 9 / recommendation A2. Move pipeline validation to TypeScript; delete `pipeline/validators_py.py` and `pipeline/parity_test.py`; decommission the `validator-parity-checker` subagent. **Independent of Stages 1-2.**

Acceptance: one validator implementation, executed in two contexts.

### 4.5 What gets explicitly NOT built

The following items from v3 §12 are **rejected** by this revised proposal and should not be implemented:

| Rejected item                              | Reason                                                                                                       |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------ |
| Full Domain layer (`src/domain/*`)         | Over-abstraction for 9 levels with C3 cap; entity factories add boilerplate without proportional benefit.   |
| Event log / event sourcing                 | Canonical justifications (distribution, audit, replay-as-load-bearing) all forbidden by C1-C10.             |
| Misconception detectors as event handlers   | Snapshot-passing pure functions deliver the same isolation guarantees.                                      |
| 8-state FSM                                | 3-state FSM matches the team's actual mental model; 8 states impose translation tax forever.                |
| Projection rebuild + replay tooling        | Replay from `Attempt` rows + seeded RNG gives 90% of the benefit.                                           |
| `src/app/UseCase/*` files (CQRS-style)      | Single `SessionService` class is sufficient at this scale.                                                   |

**These items can be revisited if and only if a future requirement justifies them.** Today's scope does not.


## 5. Final reconciliation

This deep-dive document and `code-quality-2026-05-01.md` v3 disagree about Stages 2–4. **This document supersedes v3 on the migration roadmap.** Specifically:

- v3 §12.5 (Ideal State) — keep as **aspirational reference**. Annotated with this document's pushback.
- v3 §12.6 Stage 2 (Domain layer extraction, ~60 hr) — **replaced** by Stage 2 (revised) here: `SessionService` pivot (~30 hr).
- v3 §12.6 Stage 3 (event log, ~40 hr) — **dropped**.
- v3 §12.6 Stage 4 (parity dissolution, ~30 hr) — **kept** as Stage 3 here (~12 hr).
- v3 §12.7 closing argument — **replaced** by §5.1 below.

### 5.1 Three commitments to make today

These supersede v3 §12.7's three commitments.

1. **Stage 1 (the v2 plan as written, with §4.2 modifications).** Tactical, ~115 hr / ~3 weeks, ships independently. Add the two 1-line concurrency fixes (~1 hr) to Phase 1. Apply recommendation A4 retroactively to Phase 7.
2. **Commit to Stage 2 (revised).** ~30 hr / ~1 week, scheduled immediately after Stage 1. Delivers a single `SessionService` class that closes the Original Sin's blast radius without committing to a Domain layer or event log. **Decision needed: yes/defer/no.** "Defer" is the most likely answer; this document's purpose is to make sure that defer is documented as a deliberate choice, not a never-considered absence — repeating the D-08 mistake.
3. **Apply recommendation A4 retroactively.** Audit every "Phase 2 partial" abstraction in the codebase (`engine/ports.ts`, `engine/adapters/*`, OpenTelemetry, i18n ICU/tone helpers, branded-ID smart constructors, misconception write-only path). Each must be either **completed** in the next sprint or **deleted** with a documented decision. **No more scaffolding-as-permanent-state.** This is structural; it does not need a new phase.

### 5.2 What changes in `code-quality-2026-05-01.md`

The companion plan should receive a small update (not a rewrite):

- **§12.6 Migration staging** — replace Stages 2-4 narrative with a pointer to this document.
- **§12.7 Closing argument** — replace with the three commitments in §5.1 above.
- **Phase 1 task list** — add C6 (feedback ordering) and C9 (shutdown guard) as two new sub-tasks.
- **Risk inventory** — add a new finding for the feedback-before-persist invariant (the worst defensive bug).

These are surgical edits. The 16-phase tactical plan is unaffected.

### 5.3 What this document is *not*

It is not a green light to start Stage 2. It is the homework needed to decide whether Stage 2 should start at all:

- **If MVP ships and validates:** Stage 2 may be unnecessary. The K-2 product reaches its 2029 horizon with the current architecture and a few stage-1 polish layers. Defer indefinitely; document the decision.
- **If MVP ships and the team commits to a sustained product:** Stage 2 is the right scope. The Domain layer is **not**.
- **If MVP fails to validate:** the question is moot. Stage 2 was the wrong investment.

The v3 closing argument framed this as "yes / defer / no on Stage 2." That framing is correct; what was wrong was the **size** of Stage 2 being voted on. Voting on a 60-hour Domain layer is hard. Voting on a 30-hour `SessionService` extraction with concrete deletion targets is much easier.

### 5.4 The honest summary

The codebase has a clean, fixable architectural defect. The defect is well-understood (the team wrote the diagnosis themselves in commit `3dd038b`). The fix is smaller than v3 made it look. **The lighter fix preserves shipping velocity, closes the worst bugs, and respects the constraints document's anti-over-engineering stance (C10).**

The work that survives across all three plan iterations:

- Sunset `Level01Scene.ts` cleanly (Path A).
- Make engine deterministic (seeded RNG, injected clock).
- Close C5 (localStorage outside `lastUsedStudentId`).
- Eliminate Python parity (pipeline → TS validation step).
- Delete or finish, never scaffold (recommendation A4).
- Fix the feedback-before-persist invariant (concurrency C6).

Everything else is negotiable. The Domain layer, the event log, the FSM with 8 states — those were architectural ambition that the constraints don't pay for.

**End of deep-dive.**
