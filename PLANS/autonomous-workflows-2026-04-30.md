# Autonomous Workflows v2 — 2026-04-30

## Operating principle

**Always optimize for maximum autonomy.** Detection-only is not enough; resolution-only is not enough. The goal is *human-out-of-the-loop until human judgment is genuinely needed* — and the system must run continuously, not only on human-triggered events.

## What this plan replaces

The earlier v1 of this doc listed five parallel workflows. That was a list, not a system. v2 is structured as four composable phases that share substrate, lean on existing primitives, and target this project's unique autonomy surface (LLM curriculum, validation cycles, CLAUDE.md active-bug queue) — not generic CI hygiene.

## Goal

Turn this repo into a self-maintaining system with three autonomy modes:
- **Continuous** — a scheduled loop that picks work and ships PRs while no one is online
- **Reactive** — event-triggered workflows that respond to PRs, CI failures, and pipeline changes
- **Project-specific** — autonomy on the surfaces unique to this repo: curriculum, validation cycles, misconception detectors

The solo developer becomes a reviewer of agent work. The agent infrastructure (existing subagents, slash commands, learnings.md) becomes the worker.

---

## Phase 0 — Shared substrate (build once, used by everything)

Every agent-dispatching workflow needs the same five things. Build them as reusable workflows / composite actions in `.github/workflows/_shared/` and consume them from Phases 1–3.

### S1. Agent dispatch (reusable workflow)
Single entry point: takes a prompt template name + context (PR number, log excerpt, issue body, etc.) → returns a structured result (success / partial / failed, plus output artifacts). All Claude Code invocations go through this. One place to update model, timeout, retry policy, prompt registry.

### S2. PR-comment update (composite action)
Idempotent comment management keyed by `<workflow-name>:<role>`. Subsequent runs update the existing comment in place. No spam.

### S3. Budget guard
Two layers:
- Per-workflow token cap (declared in the calling workflow)
- Global daily cap stored in repo variable; once tripped, all agent dispatch short-circuits and posts "budget exhausted, retry tomorrow"

### S4. Kill switch
A repo variable `AGENT_AUTONOMY_ENABLED`. Set to `false` and every agent-dispatching workflow no-ops. Single off switch, no need to disable workflows individually.

### S5. Telemetry + learning loop
- Every agent run appends a JSONL line to `.claude/agent-runs/<YYYY-MM>.jsonl` (workflow, prompt, outcome, tokens, duration)
- A weekly scheduled workflow analyzes the log: agents whose PRs were rejected at high rates → propose `.claude/learnings.md` entries for the operator to accept or reject
- Closes the loop: rejected work makes future runs smarter without hand-curation

**Effort: ~6–10 hr.** Everything in Phases 1–3 depends on this.

---

## Phase 1 — Continuous agent loop (the main engine)

This is the *most* autonomous pattern in the plan. Event-triggered workflows still wait for the human to do something. A scheduled loop ships work while no one is online.

### L1. Active-bug burndown loop
- **Trigger:** schedule, every 4 hours; also `workflow_dispatch`
- **Action:**
  1. Parse the "Active bugs" table in CLAUDE.md
  2. Filter to entries that:
     - Are not already attached to an open PR
     - Have not failed an autonomy attempt in the last 7 days (per S5 telemetry)
     - Are below an effort threshold (e.g. ≤30 min stated effort) for the first wave
  3. Pick the highest-leverage entry
  4. Dispatch via S1 with a `bug-fix` prompt: read the bug description, locate the code, propose a fix on `feat/<date>-bug-<id>`, run `npm run preflight`, commit
  5. Open a PR via the GitHub Copilot Coding Agent primitive (`create_pull_request_with_copilot`) where possible; fall back to custom dispatch when Copilot can't handle the file types
  6. Log to S5
- **Halt conditions:** budget guard tripped, kill switch off, two consecutive failures on the same bug

### L2. Validation-cycle ingestion loop
- **Trigger:** schedule, daily; also when `validation-data/cycle-*/` is touched
- **Action:**
  1. Scan validation-cycle directories for unprocessed session notes (markdown + screenshots)
  2. For each unprocessed note: dispatch agent to extract structured bug reports, misconception observations, and skill calibration deltas
  3. Output: a single PR adding new bug entries to CLAUDE.md, new MC-* draft entries to `docs/10-curriculum/misconceptions.md`, and skill calibration adjustments to the engine config
  4. The L1 loop will then pick up the new bugs on its next run — autonomy composes
- This converts the project's *purpose* (validation) into a continuous process

### L3. Curriculum generation loop
- **Trigger:** schedule, weekly (Sunday 02:00 UTC); also `workflow_dispatch`
- **Action:**
  1. Run `pipeline.generate --all` (or rotating per-level) using existing pipeline
  2. Run validators
  3. If output passes: commit to `chore/<date>-curriculum-refresh`, run `npm run build:curriculum` (Workflow A from v1, now subsumed), open PR
  4. If validators fail: post a diff summary as an issue, dispatch L1 candidate fix
- The pipeline already exists. This converts content production from a human-prompted action to a continuous background process.

**Effort: ~8–14 hr** (L1: 4–6, L2: 3–5, L3: 1–3). Phase 0 substrate must be live first.

---

## Phase 2 — Reactive event-triggered augmentations

These augment the continuous loop with fast feedback on human-driven events. They consume Phase 0 substrate.

### R1. CI-failure-to-agent dispatch (was F)
`workflow_run` on `ci.yml` failure → S1 dispatch → fix PR into the failing PR's head branch. Per-SHA limit prevents thrash. Skips PRs already authored by bots.

### R2. Subagent-on-PR (was E)
`pull_request` events route by changed paths to the matching specialist subagent (`c1-c10-auditor`, `bundle-watcher`, `validator-parity-checker`, `a11y-auditor`). Findings post via S2. The subagents already exist in `.claude/agents/` — this just wires them to the PR event.

### R3. Issue-assign-to-coding-agent
**Use the existing primitive, don't reinvent.** Issue gets label `claude:implement` → workflow calls `mcp__github__assign_copilot_to_issue` (or equivalent for Claude Code coding agent). Custom dispatch only for issues Copilot rejects (e.g. multi-repo work). v1's "Workflow G" was a worse reinvention of this.

### R4. Auto-rebuild curriculum bundles (was A)
Mechanical, no agent needed. Pipeline output changes → run `build:curriculum`, commit back. Subsumed into L3 when curriculum changes are agent-authored; remains as standalone for human-authored pipeline edits.

### R5. Dependabot auto-merge (was D)
Mechanical, no agent needed. Patch + minor + green CI → auto-merge.

**Effort: ~4–6 hr total** (R1: 1–2, R2: 1–2, R3: 0.5, R4: 0.5, R5: 0.5).

---

## Phase 3 — Project-specific autonomy (highest unique leverage)

These are the workflows nobody else's repo would have. They target this project's specific surface.

### P1. Misconception detector synthesis
When L3 (curriculum loop) generates new wrong-answer patterns not covered by existing `MC-*` detectors, dispatch an agent to propose new detectors in `engine/misconceptionDetectors.ts` plus matching fixtures. Open as a PR. Catches the case where new content silently degrades misconception coverage.

### P2. Archetype × Level coverage matrix maintenance
Schedule reads `LEVEL_META` + Playwright test files, regenerates `docs/40-validation/coverage-matrix.md`, commits. When a level adds an archetype with no E2E test, agent dispatches a test-stub generator. The doc stays correct without human work; test gaps surface as PRs.

### P3. CLAUDE.md self-maintenance
Monthly schedule: dispatch agent to read `.claude/learnings.md`, the decision log, and recent commits → propose CLAUDE.md updates (new gotchas, retired ones, clarifications). Open as PR. Closes the loop on the "skim learnings.md at session start" instruction by making sure the canonical doc absorbs the learnings over time.

**Effort: ~6–10 hr total.** Phase 1 must be live first.

---

## Sequencing

```
Phase 0 (substrate)
    │
    ├──► Phase 1 (continuous loops)         ◄── highest autonomy
    │       L1 → L2 → L3
    │
    ├──► Phase 2 (reactive augmentations)
    │       R1 → R2 → R3 → R4 → R5
    │
    └──► Phase 3 (project-specific)
            P1 → P2 → P3
```

Strictly: Phase 0 first. Then any Phase 1 entry. Phase 2 and Phase 3 entries can land in any order once Phase 0 is live.

Recommended landing order: **S1–S5 → L1 → R1 → R2 → R5 → R4 → R3 → L2 → L3 → P1 → P2 → P3**. This front-loads the highest-autonomy continuous loop (L1) immediately after substrate, then fills in the reactive layer, then unlocks the project-specific stuff that depends on L1/L3 having run.

---

## Decision points

1. **Use Copilot Coding Agent or build custom dispatch?** Recommendation: Copilot first via the MCP primitives, custom Claude Code dispatch only where Copilot demonstrably fails. This is what v1 missed.
2. **Continuous-loop frequency?** L1 every 4 hr (≈6 PRs/day cap), L2 daily, L3 weekly. Tune via S3 budget.
3. **Kill-switch default?** Recommendation: ship with `AGENT_AUTONOMY_ENABLED=false`, flip to true after S1–S5 + L1 + R1 prove out for one week.
4. **Telemetry retention?** Recommendation: 12 months of JSONL in-repo (small), gives the learning loop in S5 enough history.
5. **Bug-table effort threshold for L1's first wave?** Recommendation: ≤15 min of stated effort. Raise to ≤2 hr after the first wave shows acceptable PR-acceptance rates.

---

## Pre-flight requirements (one-time, before Phase 0)

- `ANTHROPIC_API_KEY` repo secret
- Repo variable `AGENT_AUTONOMY_ENABLED` (default `false`)
- Repo variable `AGENT_DAILY_TOKEN_BUDGET` (initial: 5M tokens/day)
- `GITHUB_TOKEN` permissions: `contents: write`, `pull-requests: write`, `issues: write`
- New directories committed: `.claude/agent-runs/`, `.github/workflows/_shared/`
- Decision log entry (`/decision`) capturing the autonomy operating principle and kill-switch protocol

## Success metrics — three months after Phase 1 lands

- **Autonomy ratio:** ≥ 50% of merged PRs originate from agents (continuous loop + reactive)
- **Bug burndown rate:** L1 resolves ≥ 1 bug/week from the CLAUDE.md table without human implementation
- **Validation-cycle latency:** session notes turn into bug reports within 24 hr of being written (L2)
- **Curriculum freshness:** L3 ships at least one curriculum-refresh PR per month
- **Coverage matrix accuracy:** P2 keeps `docs/40-validation/coverage-matrix.md` < 7 days stale
- **PR acceptance rate (signal-to-noise):** ≥ 60% of agent PRs merge without major rework — gate for tightening prompts via S5

## Why this is meaningfully better than v1

- **Substrate first**: Phase 0 is built once and consumed by every dispatch. v1 had each workflow re-implementing dispatch.
- **Continuous loop, not just events**: Phase 1 ships work without human triggers. v1 was 100% event-triggered.
- **Leverages existing primitives**: Copilot Coding Agent (R3) replaces v1's custom "Workflow G". Existing subagents (R2). Existing pipeline (L3). Existing CLAUDE.md bug table (L1).
- **Targets project-unique surface**: Phase 3 is autonomy nobody else's repo would have — the validation cycles, the misconception catalog, the coverage matrix.
- **Kill switch + budget + telemetry as core**: Not "documented later"; built into S3–S5 before any agent fires.
- **Composes**: L2's output feeds L1's queue. L3's output feeds P1. Rejected PRs feed S5's learnings ingestion. v1's workflows didn't compose.

## Estimated total effort

| Phase | Effort |
|---|---|
| 0 — Substrate | 6–10 hr |
| 1 — Continuous loops | 8–14 hr |
| 2 — Reactive augmentations | 4–6 hr |
| 3 — Project-specific | 6–10 hr |
| **Total** | **24–40 hr** |

Roughly 1.5–2× the v1 estimate, in exchange for ~5× the autonomy ceiling and a system that composes instead of a list of disconnected workflows.

## Notes on existing workflows

- `ci.yml` — unchanged; remains the hard gate and the trigger for R1
- `content-validation.yml` — unchanged; consumes R4 / L3 output
- `deploy.yml`, `lighthouse.yml`, `synthetic-playtest.yml` — unchanged
- Pre-existing inconsistency: `synthetic-playtest.yml` uses Node 20 vs Node 24 elsewhere. Trivial; fix opportunistically, not part of this plan.

---

## Agent Work Queue

Everything remaining for this agent to execute. Updated 2026-04-30 after deep audit of all source files, tests, CI, workflows, curriculum, and plan documents.

**Other plan documents in scope** (don't duplicate, reference):
- `PLANS/master-plan-2026-04-26.md` — sprint backlog (S0–S5)
- `PLANS/harden-and-polish-2026-04-30.md` — 56 hardening bugs (R1–R56), all open
- `PLANS/ux-elevation-2026-04-30.md` — 10 UX tasks pending
- `PLANS/audio-2026-04-30.md` — audio pipeline not built
- `PLANS/curriculum-update-2026-04-30.md` — curriculum framework done; content gaps remain

---

### P0 — Broken environment (blocks all verification)

| ID | Item | Root cause | Effort |
|---|---|---|---|
| E-1 | `npm install` not run — `vitest` not found, phaser types missing | Node modules absent in shell | 2 min |
| E-2 | Typecheck: `Cannot find module 'phaser'` across all 13 interaction/utils files | Flows from E-1 | Resolves with E-1 |
| E-3 | 3 build scripts may not exist: `scripts/agent-doctor.mjs`, `scripts/postdeploy-check.mjs`, `scripts/validate-curriculum.mjs` | Never verified against filesystem | 10 min |
| E-4 | Kill switch variable inconsistency — `claude-md-maintenance.yml`, `coverage-matrix.yml`, `misconception-synthesis.yml` use `vars.AUTONOMY_DISABLED`; everything else uses `vars.AGENT_AUTONOMY_ENABLED` | Three agents independently implemented the check | 10 min |

---

### P1 — Critical bugs found in deep audit (new — not in other plans)

These are concrete issues discovered by this session's audit that are NOT captured in `harden-and-polish-2026-04-30.md`.

| ID | File | Location | Issue | Severity |
|---|---|---|---|---|
| N-1 | `src/scenes/LevelScene.ts` | Line 1092 | Accuracy uses `this.responseTimes.length` as denominator instead of `this.attemptCount`. If student submits multiple times per question, accuracy is wrong (understated or >100%). | CRITICAL |
| N-2 | `src/scenes/Level01Scene.ts` | Line 1025 | `showOutcome()` calls `AccessibilityAnnouncer` but never calls `tts.speak()` for feedback text. K-2 non-readers miss "Correct!" / "Try again" audio entirely. | HIGH |
| N-3 | `src/scenes/MenuScene.test.ts` | Line 5 | `TODO: add a lightweight canvas shim (jest-canvas-mock) to enable scene mount tests` — unresolved, blocking all scene unit tests. | MEDIUM |
| N-4 | `src/scenes/interactions/` | — | `ExplainYourOrderInteraction.ts` exists but has no matching validator in `src/validators/`. The registry doesn't cover it. Any L8/L9 question using this archetype will silently return undefined from `validatorRegistry.get()`. | CRITICAL |
| N-5 | `src/engine/bkt.ts` | ~line 80 | Export audit incomplete — `updateMastery()` called from scenes but unclear if cleanly exported. Verify `updateMastery` is in public exports, not just an internal alias. | HIGH |
| N-6 | `.lighthouserc.json` | — | Exists but has zero thresholds. Lighthouse CI collects scores but enforces nothing. Performance and a11y regressions pass silently. | MEDIUM |

---

### P2 — Autonomous workflows system (PR #9)

| ID | Item | Effort |
|---|---|---|
| A-1 | Fix E-4: standardise kill switch variable to `AGENT_AUTONOMY_ENABLED` in `claude-md-maintenance.yml`, `coverage-matrix.yml`, `misconception-synthesis.yml` | 10 min |
| A-2 | Audit `_shared/agent-dispatch.yml` end-to-end — S1 version kept via `--ours`; verify it handles all downstream callers (bug-burndown, ci-fix, subagent-pr-audit, validation-ingest, curriculum-loop, misconception-synthesis, coverage-matrix, claude-md-maintenance) | 20 min |
| A-3 | Expand `.github/workflows/_shared/README.md` into a full pre-flight runbook: exact secret names, variable names and defaults, GITHUB_TOKEN permission grants, label names + colours, how to test kill switch | 15 min |
| A-4 | Merge PR #9 — user action; depends on pre-flight runbook completion | user action |
| A-5 | After merge: manually trigger `bug-burndown` with `AGENT_AUTONOMY_ENABLED=false` to verify no-op; then flip to `true` and trigger again to verify agent fires | 15 min |

---

### P3 — Critical hardening (from `harden-and-polish-2026-04-30.md`)

56 open bugs. Do the critical and high items that are code-only (no UX polish or infrastructure). Full list in the harden plan — these are the highest-priority subset:

| Harden ID | File | Issue |
|---|---|---|
| R3 | `src/scenes/Level01Scene.ts:919` | Hint `attemptId` never linked — all hint events orphaned. Every hint recorded against a blank FK. |
| R4 | `src/persistence/repositories/hintEvent.ts:14` | `id` typed as `string`, Dexie stores `number`. Type mismatch causes silent failures on hint queries. |
| R5 | `src/scenes/Level01Scene.ts:752` | `validatorRegistry.get(id as never)` — `as never` hides undefined; validator silently missing returns undefined, session stalls. |
| R6 | `src/scenes/Level01Scene.ts:314` | Session creation has no error guard — silent collapse loses all 30-min session data |
| R7 | `src/scenes/Level01Scene.ts:1331` | `preDestroy()` doesn't destroy 4 components — timer and tween leaks per scene exit |
| R9 | all repos | `QuotaExceededError` unhandled — Safari Private mode silently loses data |
| R11 | `src/components/FeedbackOverlay.ts:35` | WCAG 1.4.3 fail — contrast 2.52:1 (need ≥4.5:1). Blocks WCAG AA compliance. |
| R12 | `src/components/SkipLink.ts:46` | Skip-link targets unfocusable `<canvas>`, not first interactive button. Broken for screen reader users. |
| R13 | `src/scenes/MenuScene.ts:348` | `localStorage unlockedLevels:${studentId}` — C5 constraint violation |
| R17 | `src/persistence/db.ts:82` | Schema versions 2–4 missing `upgrade()` re-index hooks. New indices not built on existing data. |
| R27 | `src/lib/log.ts:40` | `localStorage LOG` key violates C5 constraint |
| R28 | `src/curriculum/loader.ts:80` | Curriculum bundle not schema-validated on load. Malformed bundle crashes `loadQuestion()`. |
| R38 | 8 files | `checkReduceMotion()` reimplemented 8 times — centralise in `src/scenes/utils/easings.ts` |

Lower-priority harden items (R14–R16, R18–R26, R29–R56) to be tackled after critical items above, per the full harden plan sequencing.

---

### P4 — Sprint completion items (from `master-plan-2026-04-26.md`)

Code reportedly done; verification and remaining wiring pending.

| ID | Sprint ref | What to do | Needs Playwright |
|---|---|---|---|
| G-1 | S0-T5 | Round-trip screenshot: Menu → L1 → 5-correct → session-complete. Commit to `PLANS/screenshots/`. | Yes |
| G-2 | S1-T5 | Assert IndexedDB shows mastery state transitions after 5 questions | Yes |
| G-3 | S2-T1 + D-1 | Decide unlock model (BKT threshold vs completion vs free-play); add to decision log; implement | Code |
| G-4 | S4-T3 | Playwright parameterised smoke: L1–L9 each load, first question renders | Yes |
| G-5 | S4-T4 | Mastery-gated unlock wired into MenuScene — depends on G-3 decision | Code |
| G-6 | S5-T4 | Playwright happy-path E2E for L1 (TestHooks already in place) | Code |
| G-7 | S5-T7 | Deploy to Cloudflare Pages — verify CI secrets, trigger deploy | Infra |

---

### P5 — Test coverage gaps (new findings)

| ID | Missing test | Gap | Effort |
|---|---|---|---|
| T-1 | `tests/unit/validators/utils.test.ts` | `src/validators/utils.ts` has 3 exported functions (`lerp`, `manhattanDistance`, `polygonArea`) with zero tests (R39) | 20 min |
| T-2 | `tests/unit/engine/selection.test.ts` | `src/engine/selection.ts` — ZPD window, recency window, cold-start fallback — never tested (R40) | 45 min |
| T-3 | `tests/unit/engine/router.test.ts` | `src/engine/router.ts` — next-archetype picker — no test file confirmed | 30 min |
| T-4 | `tests/unit/persistence/` (15 files) | 15 of 16 persistence repos have zero unit tests — only `deviceMeta.test.ts` exists | 3–5 hr |
| T-5 | `tests/e2e/level02-l09.spec.ts` | L2–L9 have no dedicated E2E coverage; generic smoke only | 1–2 hr |
| T-6 | `tests/a11y/contrast.spec.ts` | Automated WCAG contrast checks not in a11y suite — only axe scan exists | 30 min |
| T-7 | `tests/unit/validators/explain-your-order.test.ts` | No validator exists for `ExplainYourOrderInteraction` (see N-4) — need both validator and test | 45 min |
| T-8 | `tests/unit/` canvas shim | `MenuScene.test.ts:5` TODO for jest-canvas-mock — blocks all scene unit tests | 20 min |

---

### P6 — Curriculum content gaps (from `curriculum-update-2026-04-30.md`)

| ID | Issue | Impact |
|---|---|---|
| CU-1 | All 255 templates use bare imperatives ("Split this rectangle"). Zero sharing-context prompts ("2 children share a pizza"). Contradicts pedagogical design. | HIGH — affects engagement with K-2 audience |
| CU-2 | Number-line representation missing from L1–L7; introduced only at L8 (SK-27). Pedagogical commitment violated. | HIGH |
| CU-3 | 5 of 7 misconception detectors have template mismatches with curriculum content — need re-audit (Phase A.5 in curriculum plan) | MEDIUM |
| CU-4 | 9 level spec docs missing: quantitative mastery thresholds, out-of-scope statements, reinforced-skill lists | MEDIUM |

---

### P7 — Audio pipeline (from `audio-2026-04-30.md`)

Decision made (OpenAI gpt-4o-mini-tts), nothing built. Entire pipeline is missing:

| ID | Item | File to create |
|---|---|---|
| AU-1 | Build script to generate audio clips from catalog | `scripts/build-audio.mjs` |
| AU-2 | Check script to detect missing clips | `scripts/check-audio.mjs` |
| AU-3 | Runtime audio catalog and player | `src/audio/AudioCatalog.ts` |
| AU-4 | Wire player into TTS service — replace Web Speech API fallback | `src/audio/TTSService.ts` |
| AU-5 | Generate clips for L1–L9 prompts (~255 clips, ~1.7 MB separate from JS budget) | `public/audio/` |

---

### P8 — UX elevation (from `ux-elevation-2026-04-30.md`)

10 tasks pending. Do only after P3 (critical bugs) are resolved — C10 constraint (every change must serve validation, not polish). Exceptions: items that directly affect validation data quality.

| ID | UX task | Validation relevance |
|---|---|---|
| UX-1 | Star progress bar rewrite (`src/components/ProgressBar.ts`) | Students need clear progress feedback to stay engaged through 5 questions |
| UX-2 | Trophy/session-complete screen with 1/2/3-star rating | Session completion signal; needed for G-1 screenshot |
| UX-3 | Mascot component (`src/components/Mascot.ts`) — procedural reactions | Emotional engagement; not validation-critical |
| UX-4 | Animations respect `prefers-reduced-motion` in MenuScene (R36) | A11y compliance; also blocks WCAG audit |
| UX-5–UX-10 | World map, loading screen, level cards, celebration effects, theme polish | Post-validation polish |

---

### P9 — Infrastructure hygiene

| ID | Item | File | Effort |
|---|---|---|---|
| I-1 | Fix `synthetic-playtest.yml` Node 20 → 24 | `.github/workflows/synthetic-playtest.yml` | 2 min |
| I-2 | Add Lighthouse thresholds: `a11y >= 90`, `performance >= 80`, `best-practices >= 90` | `.lighthouserc.json` | 10 min |
| I-3 | Add decision log entry: autonomy operating principle + kill-switch protocol | `docs/00-foundation/decision-log.md` | 10 min |
| I-4 | Centralise `checkReduceMotion()` into one util (R38) — 8 duplicates | `src/scenes/utils/easings.ts` + 8 callers | 30 min |
| I-5 | Add `noUncheckedIndexedAccess` to tsconfig (R41) — fix resulting errors | `tsconfig.json` | 1 hr |

---

### P10 — CLAUDE.md reconciliation

| ID | Item | Effort |
|---|---|---|
| C-1 | After G-1 (browser verification passes): remove BUG-01, BUG-02, BUG-04, G-E1, G-C7 from active bugs table (master plan marks these done) | 5 min |
| C-2 | Record D-1 decision in CLAUDE.md and decision log once chosen | 5 min |
| C-3 | Append session learnings: kill switch naming, worktree merge conflict pattern, accuracy denominator bug | 5 min |
| C-4 | Add `ExplainYourOrderInteraction` → missing validator to active issues | 5 min |

---

### Open decisions (user input needed before blocking items)

| ID | Decision | Blocks |
|---|---|---|
| D-1 | Level unlock model: BKT mastery threshold vs. session completion vs. always-unlocked free play | G-3, G-5 |
| D-2 | `ExplainYourOrderInteraction` — add validator now or remove/defer the archetype? | N-4, T-7 |
| D-3 | Audio pipeline timing — before or after first validation cycle? Affects AU-1 through AU-5 | P7 |
| D-4 | Sunset `Level01Scene.ts` after `LevelScene.ts` reaches parity, or maintain both? | Refactor scope |
| D-5 | Bug-burndown effort threshold after first wave — raise from ≤30 min to ≤2 hr? | L1 loop tuning |

---

### Execution order

Sequenced by: blockers first → data integrity → game completeness → coverage → infrastructure.

```
P0  E-1, E-2, E-3, E-4
P2  A-1, A-2, A-3
P1  N-1 (accuracy bug), N-4 (ExplainYourOrder validator), N-2 (TTS feedback)
P3  R5, R6, R3, R4, R7, R9, R11, R12, R13, R17, R27, R28, R38
P4  G-1, G-6 (write), G-4 (write) → run in CI → G-2
    D-1 decision → G-3, G-5
P5  T-1, T-2, T-3, T-8 → T-4 (persistence repos) → T-5 (L2–L9 e2e) → T-6, T-7
P6  CU-1, CU-2 (pipeline re-run with sharing context) → CU-3, CU-4
P8  UX-1, UX-2, UX-4 (validation-relevant only; defer UX-3, UX-5–UX-10)
P7  AU-1 through AU-5 (after D-3 decision)
P9  I-1, I-2, I-3, I-4, I-5
P10 C-1 through C-4
P2  A-4 (user: merge PR #9), A-5 (validate kill switch)
G-7 Deploy to Cloudflare Pages
```

**Total open items: ~85 across 10 priority buckets.** Critical path to Sprint 0 exit (playable game, green tests, deployed): P0 → P1(N-1, N-4) → P3(R5,R6) → P4(G-1,G-6) → P9(I-1) → G-7.
