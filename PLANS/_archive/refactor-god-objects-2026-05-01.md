# Phase 4 — Systemic Refactoring of God Objects

**Created:** 2026-05-01
**Status:** ACTIVE
**Owner:** working branch per phase, `claude/refactor-<file>-YYYY-MM-DD`
**Parent:** PLANS/PLAN.md (Phase 4 — Harden)

> Strict serial execution. **Do not begin sub-phase N+1 until sub-phase N is merged to main and the post-phase rituals are committed.** The hardcoded LOC-budget hook (`.husky/pre-commit`) refuses edits to any file already over its budget unless the diff is *net-LOC-negative AND brings the file under budget*; that constraint forces one-file-at-a-time discipline anyway.

---

## Objective

Reduce eight known god files to **≤ their architectural LOC budget** by extracting non-core logic into focused, unit-testable modules. The primary file should serve as a high-level orchestrator (lifecycle, state machine, child wiring), not the implementation site.

LOC budgets (per `.husky/pre-commit`):
- **Scenes** (`src/scenes/**`) — 600 LOC hard cap.
- **Components** (`src/components/**`) — 300 LOC hard cap.

Forty-percent reduction is a **floor**, not a goal. The real goal is "under budget"; some files need >60 % extraction.

---

## Target inventory (LOC at 2026-05-01 23:18 UTC)

| Sub-phase | File | Current | Budget | Required reduction | Notes |
|---|---|---|---|---|---|
| **4.1** | `src/scenes/Level01Scene.ts` | **2040** | 600 | ≥ 70 % | Slated for deprecation in favor of `LevelScene`; refactor sets the extraction template the next phases reuse |
| **4.2** | `src/scenes/LevelScene.ts` | **1558** | 600 | ≥ 62 % | Active config-driven router for L2–L9; touched by every level addition |
| **4.3** | `src/scenes/MenuScene.ts` | **912** | 600 | ≥ 35 % | Documented C5 deviation lives here (`unlockedLevels:<sid>`); R13 will move it to Dexie soon, plan for that |
| **4.4** | `src/components/Mascot.ts` | **658** | 300 | ≥ 55 % | Use `mascot.setState('idle')` API; ESLint enforces it. Keep API stable |
| **4.5** | `src/scenes/SettingsScene.ts` | **602** | 600 | ≥ 1 % | Just over budget; modest extraction (export/restore handlers) is sufficient |
| **4.6** | `src/scenes/LevelMapScene.ts` | **541** | 600 | 0 % (under budget) | **Deferred unless LOC grows.** Listed for visibility, not action |
| **4.7** | `src/components/SessionCompleteOverlay.ts` | **527** | 300 | ≥ 44 % | High visual + state churn; extract animation + scoring math |
| **4.8** | `src/scenes/OnboardingScene.ts` | **523** | 600 | 0 % (under budget) | **Deferred unless LOC grows.** Listed for visibility, not action |

> **4.6 and 4.8 are deferred.** Don't refactor for refactoring's sake — the rule is *budget compliance + maintainability*, and both files are already under their scene budget. If a future change pushes either over 600, promote the deferred sub-phase to ACTIVE; until then, leave them.

---

## Per-sub-phase execution template

Each active sub-phase (4.1 – 4.5, 4.7) follows this five-step template. **Stop at the gate.** The gate criteria are mechanical — typecheck/lint/tests must pass, LOC must be under budget, and the human has confirmed before the next sub-phase starts.

### Step 1 — Analysis (no code changes)

Open the target file and identify the **three largest functional clusters**. Common candidates:

- **Layout / camera / responsive math** → extract to `<file>Layout.ts` or `<file>Geometry.ts`
- **DOM / A11yLayer wiring** → extract to `<file>A11y.ts`
- **Animation choreography** → extract to `<file>Animations.ts` (alongside `FeedbackAnimations.ts`)
- **Persistence / progression read-write** → extract to `src/lib/<feature>.ts` (pure functions, no Phaser; pattern: `unlockGate.ts`)
- **Validation / scoring math** → extract to `src/lib/<feature>.ts`
- **Event handler bodies** → extract to a private dispatcher object or a sibling controller class

**Output of Step 1:** a 5–10 line proposal posted in chat naming the three target clusters, the proposed module names, and the rough LOC each will absorb. Wait for confirmation before Step 2.

### Step 2 — Refactor (one cluster at a time)

For each of the three clusters, in order:

1. Create the new file with the extracted logic.
2. Add unit tests for any pure logic (validators, math, gating predicates) under `tests/unit/<area>/<file>.test.ts`.
3. Wire the new module into the original file via composition (constructor injection or `import` + call site).
4. Delete the now-dead code from the original.
5. Run `npm run typecheck && npm run lint && npm run test:unit` after **every** cluster — do not let three clusters' worth of breakage stack up.

**Public APIs remain intact.** External callers (scenes, the scene registry in `main.ts`, tests) must keep importing the same symbols. If the public surface needs to change, surface that as a separate decision before the refactor begins.

### Step 3 — Verification

- [ ] `npm run typecheck` — clean
- [ ] `npm run lint` — clean
- [ ] `npm run test:unit` — all green, no skipped tests added
- [ ] `npm run test:integration` — all green
- [ ] `wc -l <target-file>` — under budget
- [ ] Original file is now an orchestrator: lifecycle methods (`create`, `update`, `preDestroy`) + child wiring + small handlers; no inline math or DOM construction
- [ ] Manual smoke: open the affected scene in `npm run dev:app` and walk the happy path

### Step 4 — Commit + push + draft PR

Branch: `refactor/YYYY-MM-DD-<sub-phase-id>-<slug>` (e.g. `refactor/2026-05-02-4.1-level01-scene`).

Commit boundaries: one logical extraction per commit. Avoid mixing extractions inside a single commit (per `commit-scope-discipline` learning) — the rebase, review, and revert paths all benefit from clean isolation.

Open the PR as **draft** with a description that includes:
- Before/after LOC for the target file
- New files created with their LOC and test counts
- Confirmation that public APIs are unchanged

### Step 5 — Post-phase rituals (the gate)

Per CLAUDE.md "End-of-phase = update docs", before requesting human confirmation:

- [ ] Sweep this sub-phase's chat for non-obvious lessons → append to `.claude/learnings.md` (one line each, `/learn` command or direct edit)
- [ ] If a durable rule changed → update `CLAUDE.md` and any nested `CLAUDE.md` whose surface was touched (`src/scenes/CLAUDE.md`, `src/components/CLAUDE.md`, etc.)
- [ ] If subagent or skill behavior should evolve → update `.claude/agents/*.md` or `.claude/commands/*.md`
- [ ] `npm run sync:claude-md` — refresh the auto-generated tables; commit the result
- [ ] All doc updates ride **inside this PR**, not deferred to a "cleanup" branch
- [ ] Mark PR ready for review, squash-merge to main once green

**Then and only then** request human confirmation to start the next sub-phase.

---

## Cross-cutting rules

These apply to every active sub-phase and override anything in the per-phase template if there's a conflict.

### File-touch guards (anti-conflict)

A sub-phase touches its target file plus any new files it creates. **It does not touch other god files.** Specifically:

- Sub-phase 4.1 (Level01Scene) — do NOT edit `LevelScene.ts`, `MenuScene.ts`, `Mascot.ts` even if the temptation arises.
- Sub-phase 4.2 (LevelScene) — same guard, in reverse.
- If a god file genuinely needs a coordinated change (e.g. an interface lives in two places), surface it as a tiny prep PR before the sub-phase starts.

(Why: per the `swarm-orchestration` learnings, two parallel edits to the same god file = guaranteed merge mess. Even sequential, mixing them confuses the LOC budget hook and bisects badly.)

### LOC budget hook constraint

The pre-commit hook on saturated files only allows commits that are **net-LOC-negative AND bring the file under budget**. In practice this means:

- The **first** commit in a sub-phase often cannot land — it adds the new module file and removes nothing yet. **Stage the extraction in the commit's diff: in a single commit, add the new file *and* delete the old code.**
- Plan for 2–3 iterations on first contact with a saturated file (per `loc-budget-friction` learning).

### Existing extraction patterns to reuse

Don't reinvent these — they were extracted exactly for this purpose:

- `src/lib/unlockGate.ts` — pure level-unlock predicate, used by both `Level01Scene` and `LevelScene`
- `src/components/FeedbackAnimations.ts` — extracted from `FeedbackOverlay`; same pattern works for `Mascot` animations
- `src/lib/streak.ts` — pure streak math, no Phaser
- `src/lib/cognitiveLoad.ts` — heuristic, no Phaser
- `src/scenes/utils/levelTheme.ts` — color / font tokens

Prefer extending these over creating parallel modules.

### Test coverage minimum

Any extracted pure-logic module **must** have a unit test file under `tests/unit/<area>/<file>.test.ts`. Property-based tests with `fast-check` are preferred for math / validator code (per `tests/CLAUDE.md`). Phaser-touching extractions can skip unit tests but the orchestrator must be exercised by an existing E2E or integration test.

---

## Phase 4 sequence (active set)

Execute in order. Re-evaluate priority before starting each sub-phase — if a higher-impact bug surfaces, pause this plan.

1. **4.1 Level01Scene** — sets the template; biggest absolute payoff
2. **4.2 LevelScene** — applies the 4.1 template to the active scene
3. **4.3 MenuScene** — coordinates with R13 (localStorage migration); confirm R13 is either done or explicitly deferred before starting
4. **4.4 Mascot** — purely visual extraction; lowest risk
5. **4.5 SettingsScene** — smallest delta, can be a quick win after 4.4
6. **4.7 SessionCompleteOverlay** — highest extraction percentage among the components

4.6 LevelMapScene and 4.8 OnboardingScene remain deferred.

---

## Status tracker

Update inline as sub-phases complete. Don't open the next sub-phase's section until the prior one is merged.

| Sub-phase | Status | PR | Final LOC | Modules created | Notes |
|---|---|---|---|---|---|
| 4.1 Level01Scene | PENDING | — | — | — | — |
| 4.2 LevelScene | PENDING | — | — | — | — |
| 4.3 MenuScene | PENDING | — | — | — | — |
| 4.4 Mascot | PENDING | — | — | — | — |
| 4.5 SettingsScene | PENDING | — | — | — | — |
| 4.7 SessionCompleteOverlay | PENDING | — | — | — | — |
| 4.6 LevelMapScene | DEFERRED | — | 541 | — | Under budget; promote if it grows |
| 4.8 OnboardingScene | DEFERRED | — | 523 | — | Under budget; promote if it grows |

---

## Exit criterion (whole plan)

All six active sub-phases merged. `npm run lint:ci` reports every active target under its budget without `--no-verify` overrides. Phase 4 closes when this row is true:

```
$ wc -l src/scenes/Level01Scene.ts src/scenes/LevelScene.ts src/scenes/MenuScene.ts \
        src/components/Mascot.ts src/scenes/SettingsScene.ts src/components/SessionCompleteOverlay.ts
# → every value ≤ its budget (600 for scenes, 300 for components)
```
