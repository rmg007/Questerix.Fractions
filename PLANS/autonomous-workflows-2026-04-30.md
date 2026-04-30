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
