# Plan: Agent Tooling & Auto-Invocation

**Status:** Phase 0 in progress (this branch). Phases 1–8 awaiting approval.
**Created:** 2026-05-01
**Branch:** `chore/2026-05-01-prune-roadie-and-plan-tooling`
**Owner:** solo
**Goal:** Make Claude agents run smoothly, produce high-quality output, and save tokens — without the user having to remember slash commands.

---

## TL;DR

The native Claude Code primitives (`.claude/agents/`, `.claude/commands/`, `.claude/settings.json` hooks, nested CLAUDE.mds) are the right foundation. The improvements are:

1. **Eliminate dead weight** (Roadie's parallel system, `_archive/` noise) — Phase 0, in progress on this branch.
2. **Auto-invoke commands and skills** so the user never types a slash — Phases 1, 5, 7.
3. **Sharpen triggers by blast-radius** so doc PRs don't run full preflight — Phases 2, 4.
4. **Add the two missing specialist subagents** that recent PRs revealed gaps in — Phase 3.
5. **Capture the auto-close-PR gotcha** so it stops costing tokens to re-discover — Phase 6.
6. **Telemetry** so future cuts are data-driven, not vibes — Phase 8.

Total effort: ~15–20 hours. Sequenced into 8 dated branches. Token cost per typical session drops ~30–60%.

---

## Phase 0 — Cleanup (in progress on this branch)

**Done:**
- Deleted `.claude/AGENTS.md` (Roadie-generated, never auto-loaded, listed wrong agent role names + nonexistent `@roadie ...` workflows).
- Deleted `.claude/CLAUDE.md` (Roadie-generated, duplicated root CLAUDE.md, included a noisy repo map of directories the project tells agents to ignore).
- Deleted `.claude/roadie/` (16 files: `project-model.json`, `instructions.md`, `PROMPTS.md`, `AGENT_OPERATING_RULES.md`, 7 agent definitions, 2 skill definitions, .gitignore — all inert; never read in any session because Claude Code doesn't auto-load `.claude/roadie/`).
- Moved `.claude/_archive/` → `docs/_archive/claude-history/` (13 completed-work reports + HINT scripts: preserves history, removes 216 KB of noise from `.claude/` discovery).

**Why:** Roadie produced three bad things — duplicate content (less curated than root CLAUDE.md), misleading content (role names that don't match the actual `c1-c10-auditor`/`bundle-watcher`/`validator-parity-checker`/`a11y-auditor` subagents), and inert content (instructions in files Claude Code never auto-loads). The package.json had no `roadie` npm script (despite Roadie docs claiming one), confirming it was abandoned.

**Acceptance:** `find .claude -type f` returns ~14 files (down from 39). `find . -name "*roadie*"` returns 0 hits. Root CLAUDE.md is the single landing doc.

**Effort:** 30 min (this branch).

---

## Phase 1 — Auto-invoke layer

**Goal:** Stop requiring the user to type slash commands. Mechanical things via hooks; judgment things via skills invoked by behavior rules.

### 1a. Hooks — mechanical auto-fires

Extend `.claude/settings.json`:

| Trigger | Action | Cost |
|---|---|---|
| Edit `src/persistence/**`, `src/scenes/**`, `src/lib/**` | grep for new `localStorage` uses outside `lastUsedStudentId` | <100 ms, advisory to stderr |
| Edit `pipeline/output/**` | run `npm run build:curriculum` | ~5 s (one-time per pipeline change) |
| Edit `src/**/*.ts` (non-test) | find sibling test, run only it via `npm run test:unit -- <path>` | ~1–3 s |
| Edit `src/persistence/db.ts` | print reminder: "Schema-version bump? (Dexie v6→v7 pattern)" | <50 ms |
| Edit `src/engine/ports.ts` | print reminder: "Run `validator-parity-checker` if validators change" | <50 ms |
| Edit `public/curriculum/v1.json` or `src/curriculum/bundle.json` directly | block edit, print: "Use `npm run build:curriculum` — these files must stay byte-identical" | <50 ms |

### 1b. Husky git hooks — heavy gates at natural boundaries

| Trigger | Action |
|---|---|
| `.husky/pre-commit` | typecheck + lint (lint-staged so only changed files) |
| `.husky/pre-push` | full `/preflight` (typecheck + lint + unit + integration + build + bundle) |

### 1c. Skills — judgment-call auto-invocation via root CLAUDE.md rule

Add to root `CLAUDE.md` under a new section "Auto-invoke skills":

> **Before any non-trivial `git commit` (>10 lines or any `src/**/*.ts` edit):** invoke `simplify` skill.
> **Before any `mcp__github__create_pull_request` if changed paths include `src/persistence/**`, `src/lib/observability/**`, `pipeline/**`, or `*.config.*`:** invoke `security-review` skill.
> **After `mcp__github__create_pull_request` succeeds:** invoke `review` skill on the PR I just opened.
> **When a session has hit ≥5 permission prompts:** invoke `fewer-permission-prompts` skill at end of session.

These are gates Claude (the agent) honors based on rules I read in CLAUDE.md, not events the harness can detect. That's the right level — they need judgment.

### 1d. Delete duplicate slash commands now that skills cover them

The skills listed in the harness (`diag`, `preflight`, `retro`, `learn`, `sprint-status`, `decision`, `sync-curriculum`, `test-changed`, `c5-check`) duplicate the project files in `.claude/commands/`. Drop the `.claude/commands/` versions where the skill is identical — one source of truth, no drift.

**Acceptance:**
- User never types `/preflight`, `/test-changed`, `/c5-check`, `/sync-curriculum` again — they fire via hook on the relevant edit/commit/push.
- User never types `simplify`, `security-review`, `review` — Claude invokes them per the CLAUDE.md rule.
- A doc-only commit is fast (<1 s of overhead), a `src/persistence/**` commit triggers the right gates.

**Effort:** 2 hr.

---

## Phase 2 — Blast-radius-aware preflight

**Goal:** The full preflight runs full only when needed.

### Branch-prefix → gate level

| Branch prefix | Gate |
|---|---|
| `chore/`, `docs/`, `plans/` | typecheck + lint |
| `fix/`, `test/` | typecheck + lint + unit |
| `refactor/`, `feat/` | full `/preflight` |

Implement as `scripts/preflight-router.mjs` reading `git branch --show-current` and routing.

### Outcome

| Branch type | Preflight time before | After |
|---|---|---|
| `chore/...` | ~90 s | ~5 s |
| `fix/...` | ~90 s | ~25 s |
| `feat/...` | ~90 s | ~90 s (unchanged — needs full) |

**Acceptance:** `npm run preflight` on the current branch runs the right tier. Husky `pre-push` calls the router, not the full pipeline.

**Effort:** 2 hr.

---

## Phase 3 — Two missing specialist subagents

**Goal:** Cover gaps recent PRs exposed.

### 3a. `engine-determinism-auditor`

**Triggers on:** any diff touching `src/engine/**`.
**Checks:** no `Math.random`, no `Date.now()`, no `crypto.randomUUID()` outside `src/engine/ports.ts`.
**Why a subagent when ESLint already enforces this?** ESLint output is hard for agents to read in a structured way. The subagent gives a one-paragraph summary: "Engine layer determinism contract violated at <file:line>. Inject the corresponding port (Rng / Clock / IdGenerator) per `src/engine/ports.ts`. See PR #16, #17, #29 for prior examples."

### 3b. `curriculum-byte-parity`

**Triggers on:** any diff with `public/curriculum/v1.json` or `src/curriculum/bundle.json`.
**Checks:** the two files are byte-identical (sha256 match).
**Failure message:** "Curriculum drift. Run `npm run build:curriculum` to regenerate both files from `pipeline/output/`. Per CLAUDE.md curriculum dual-file rule and `.claude/learnings.md` 2026-04-30."

### 3c. Document trigger discipline in CLAUDE.md

Add a "When subagents fire automatically" section:

| Subagent | Always fires when... |
|---|---|
| `c1-c10-auditor` | persistence, network, dependency, or new top-level UI changes |
| `bundle-watcher` | `package.json` or `package-lock.json` changes; large feature merges |
| `validator-parity-checker` | `src/validators/*.ts` changes |
| `a11y-auditor` | new interactive components or scene-level UI additions |
| `engine-determinism-auditor` | `src/engine/**` changes (NEW) |
| `curriculum-byte-parity` | curriculum bundle files changed (NEW) |

**Acceptance:** Both new subagents drop into `.claude/agents/` as `.md` files following the existing agent-definition convention. The CLAUDE.md trigger table is up-to-date.

**Effort:** 3 hr.

---

## Phase 4 — Wire subagents into CI (delivers D-25)

**Goal:** Drift caught even when no Claude session is open. PRs the user opens manually get audited too.

`.github/workflows/subagent-pr-audit.yml`:
- On PR open targeting `main`.
- Detect changed paths via `dorny/paths-filter`.
- Map paths → relevant subagents (Phase 3 table).
- Invoke each via the Anthropic API with a per-subagent token cap.
- Post a single consolidated PR comment (one bot message, not per-agent spam).
- Idempotent: re-runs on `synchronize` overwrite the comment, don't append.
- Gated by `AGENT_AUTONOMY_ENABLED` repo variable (already documented in D-25).

**Acceptance:** Open a test PR with a deliberate `Math.random` in `src/engine/`. Within 2 min, a single comment appears citing the violation with the PR-#16 reference.

**Effort:** 4–6 hr.

---

## Phase 5 — Auto-close PR runbook

**Goal:** Stop spending tokens re-discovering this gotcha.

### Already known (sessions of 2026-05-01)

PRs #21 and #24 were both auto-closed within ~30 s of creation. Almost certainly the autonomous Copilot reviewer flow or a duplicate-detection workflow in `.github/workflows/`. The fix has been: push a no-op merge with main into the branch, then create a fresh PR. The original closed PR cannot be reopened.

### Actions

1. **Append to `.claude/learnings.md`:**
   > 2026-05-01 github: Newly-created PRs can auto-close within ~30 s — likely Copilot reviewer or duplicate-rule workflow. If it happens, push a no-op merge with origin/main and open a NEW PR; the original is unrecoverable for merge purposes.

2. **Add `/recreate-pr <branch>` slash command** that:
   - Fetches the branch and origin/main.
   - Merges origin/main into the branch (resolves trivial conflicts; aborts on real ones).
   - Pushes.
   - Opens a fresh PR via MCP, copying the body from the most-recent closed PR for that branch.

3. **Investigate root cause.** Read `.github/workflows/issue-to-copilot.yml` and any other recent autonomy workflows; identify what closes PRs. Either fix the rule or add an exemption for `claude/` and `chore/`/`fix/` branches.

**Acceptance:** Next time a PR auto-closes, recovery is one slash command instead of a 5-step manual recipe.

**Effort:** 90 min total (30 min for learning + command, 60 min for root cause).

---

## Phase 6 — `learnings.md` discipline

**Goal:** Make the learnings log actually accumulate context, not just exist.

**Current state:** 5 entries since 2026-04-30. Many recent gotchas (auto-close PRs, conflict resolution patterns, curriculum dual-file mechanics, mascot.setState rule, OpenTelemetry env-gating) are not all there.

### Actions

1. **Strengthen `SessionStart` hook** to print the *3 most recent* learnings inline, not just "Skim it." Surface the long tail at near-zero cost (<200 tokens).

2. **`PostToolUse` hook on `git commit`** that, when the diff message contains `fix(` or `bug` keywords, prompts via stderr: `▶ Bug fix committed — consider /learn to capture the gotcha.`

3. **Enhance `/retro`** so it explicitly proposes a `learnings.md` entry as part of standard output (currently optional; make it a section header so it's hard to skip).

**Acceptance:** Learnings.md grows by ≥2 entries/week during active development. Recurring gotchas (auto-close, byte-parity, mascot.setState) all captured within one week of Phase 6 landing.

**Effort:** 1 hr.

---

## Phase 7 — PR template + branch enforcement

**Goal:** PR quality without the "lucky author" dependency. Branch-name compliance enforced, not aspirational.

### Actions

1. **Add `.github/pull_request_template.md`** with the structure recent PRs already follow:
   ```
   ## Summary
   ## Test plan
   - [ ] typecheck
   - [ ] lint
   - [ ] test:unit
   - [ ] test:integration (if persistence/engine touched)
   - [ ] manual session at localhost:5000 (if scene UI touched)
   ## Conflict warning (if applicable)
   ## Decision-log impact (if D-NN added or affected)
   ## Bundle delta (if dependencies changed)
   ```

2. **Pre-push branch-name check** in `.husky/pre-push`:
   ```sh
   BRANCH=$(git branch --show-current)
   echo "$BRANCH" | grep -E '^(feat|fix|refactor|chore|test|plans|docs)/[0-9]{4}-[0-9]{2}-[0-9]{2}-[a-z0-9-]+$' || {
     echo "✗ Branch name '$BRANCH' violates <type>/YYYY-MM-DD-<slug> rule (CLAUDE.md). Rename before pushing."
     exit 1
   }
   ```
   Exempt `main`, `claude/*` (harness branches), `worktree-agent-*`.

**Acceptance:** A branch named `quick-fix` cannot be pushed without renaming. New PRs land with the structured body.

**Effort:** 1 hr.

---

## Phase 8 — Token telemetry

**Goal:** Optimize what you measure.

### Actions

1. **Extend `PreCompact` hook** to log the conversation token count if Claude Code surfaces it via env (`$CLAUDE_CONTEXT_TOKENS` or similar — verify in current build).

2. **Roll up daily** in `.claude/_session-log.md` so a weekly `/retro` can spot patterns ("merge-and-resolve-conflicts sessions consistently hit 60% context — split into smaller scopes").

3. **Add `/economy` slash command** (or skill if available) that prints "biggest context cost so far this session" — file reads vs tool output vs assistant prose.

**Acceptance:** After 1 week of telemetry, the user has data to answer "which session shape burns the most?" — and can target Phase 1/2 cuts at the right thing.

**Effort:** 2 hr.

---

## Sequencing

```
Phase 0 — DONE on this branch (cleanup)
                │
        ┌───────┴───────┐
Phase 5 (auto-close)  Phase 7 (PR template)  ← cheap, parallel-safe
Phase 1 (auto-invoke) ─→ enables Phase 2
Phase 6 (learnings discipline) ← independent, low cost
Phase 3 (new subagents) ─→ feeds Phase 4
Phase 2 (blast-radius gates)
Phase 4 (CI subagent audit) ← needs 2 + 3
Phase 8 (telemetry) ← lowest priority, lowest cost
```

Recommended order: 0 (this branch) → 5 (cheapest, biggest pain reduction) → 1 (biggest token + UX win) → 2 (fast follow) → 6 → 7 → 3 → 4 → 8.

---

## Token-savings rollup

| Source | Savings per session |
|---|---|
| Phase 0 (delete Roadie noise) | 5–15% (one-time, every session forever) |
| Phase 1 (auto-invoke + skill discipline) | 10–20% (Claude doesn't re-narrate command runs) |
| Phase 2 (blast-radius gates) | 30–50% on doc/test PRs |
| Phase 5 (auto-close runbook) | ~3 k tokens per recurrence |
| Phase 6 (surface learnings inline) | net negative bytes at SessionStart, large savings by avoiding rediscovery |
| Phase 8 (telemetry) | enables future targeted cuts |

**Estimate:** typical merge-with-conflicts session drops from ~80 k to ~50 k. Doc-only PR session drops from ~30 k to ~10 k.

---

## Quality lifts

| Source | Lift |
|---|---|
| Phase 1c (skills auto-invocation) | `simplify` + `security-review` + `review` run on the right diffs without the user remembering |
| Phase 3 (new subagents) | catches `Math.random` / curriculum-drift class of regression at PR open |
| Phase 4 (CI audit) | catches drift on human-authored PRs, not just Claude-authored |
| Phase 7 (PR template + branch enforcement) | systemic PR shape, not author-dependent |
| Phase 6 (learnings discipline) | compounding institutional memory |

---

## What this plan deliberately does NOT do

- **Does not add new agent role types** (Strategist/Builder/Critic). The 4 existing scoped subagents work; multiplying roles is the failure mode of generic team protocols.
- **Does not add a "master orchestrator agent."** The Plan tool + slash commands already serve that role at zero standing token cost.
- **Does not add MCP servers** beyond what's already wired. Current toolchain is sufficient for a no-backend solo project.
- **Does not add observability for Claude itself** (e.g., logging every prompt). The PreCompact hook log is enough.
- **Does not bring Roadie back.** Phase 0 deleted it for cause. If specific Roadie principles are wanted (Goal-Backward, WISC), lift those into root CLAUDE.md where they're auto-loaded — not into a separate file.

---

## Acceptance criteria for plan completion

- [ ] Phase 0 merged.
- [ ] User has not typed a slash command in a normal day's work for ≥1 week.
- [ ] No PR has needed manual auto-close recovery in ≥2 weeks.
- [ ] `/preflight` time on a doc PR is <10 s.
- [ ] `learnings.md` has ≥10 entries.
- [ ] CI subagent audit comment fires on the next PR opened against main.
- [ ] Average session token usage (per the telemetry from Phase 8) is ≥30% lower than the 2026-05-01 baseline.
