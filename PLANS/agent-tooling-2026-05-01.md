# Plan: Agent Tooling & Auto-Invocation

**Status:** Phase 0 in progress (this branch). Phases 1–8 awaiting approval.
**Created:** 2026-05-01
**Branch:** `chore/2026-05-01-prune-roadie-and-plan-tooling`
**Owner:** solo
**Goal:** Make Claude agents run smoothly, produce high-quality output, and save tokens — without the user having to remember slash commands.

---

## TL;DR

The native Claude Code primitives (subagents, slash commands, hooks, nested CLAUDE.mds) plus the autonomous CI workflows (`subagent-pr-audit`, `coverage-matrix`, `claude-md-maintenance`, etc., all gated by `AGENT_AUTONOMY_ENABLED`) are the right foundation. **Most of what an enterprise multi-agent protocol would propose to build, this repo already has.** The plan is to refine, not rebuild:

1. **Phase 0 — Cleanup** (this branch). Roadie removed (16 files; never auto-loaded, contained wrong agent role names). `_archive/` moved out of `.claude/` discovery.
2. **Phase 1 — Auto-invoke layer.** Hooks for mechanical things (curriculum sync, c5-check, sibling-test); skills via CLAUDE.md rule for judgment things (`simplify`, `security-review`, `review`). User stops typing slashes.
3. **Phase 2 — Blast-radius preflight.** Branch-prefix routes to gate level. Doc PRs stop running full preflight.
4. **Phase 3 — Two missing subagents** (`engine-determinism-auditor`, `curriculum-byte-parity`). Cover gaps recent PRs revealed.
5. **Phase 4 — Refine existing `subagent-pr-audit.yml`.** Add path filters for engine + curriculum; tune token budgets. Not a new workflow.
6. **Phase 5 — Auto-close PR runbook.** PRs close themselves within 30s in two of three sessions (#21, #24). Document, recover, find root cause.
7. **Phase 6 — `learnings.md` discipline.** Surface inline at SessionStart; prompt for entry on `fix(...)` commits.
8. **Phase 7 — PR template + branch enforcement.** Codify the structure recent PRs already follow.
9. **Phase 8 — Token telemetry.** Measure first, then cut.

Total effort: ~15–20 hours, sequenced into 8 dated branches. Estimated session-token cost reduction: 30–60% depending on session shape.

---

## Lessons from this session that drive the plan

This plan responds to seven concrete pain points observed across the merge sessions of 2026-05-01. Every phase ties back to at least one.

1. **PRs auto-close within ~30 s of creation when the title contains `phaser`/`dexie`/`vite` substrings** (PR #21, PR #24). Root cause **confirmed** (Phase 5 investigation): `.github/workflows/dependabot-auto-merge.yml` has a broken step-level author guard at lines 17–19 that uses `run: exit 0` — this exits the *step*, not the *job*, so the pin-check substring match at lines 32–52 runs for every PR author and closes any PR whose lowercased title contains a pinned-package name. PR #24's title was "wrap attempt+mastery in single Dexie transaction" → contained "dexie" → matched → closed. Fix is one line: lift the guard to job-level `if: github.actor == 'dependabot[bot]'`. Each occurrence cost ~3 k tokens in narration + recovery. See Phase 5 + Appendix A.

2. **GitHub's `mergeable_state` lies briefly** after a base-branch update. Calling `merge_pull_request` 30 s after another merge returned `mergeable_state: unknown` then 405. Local `git merge` was clean. Workaround used twice: push merge commit to PR branch, retry. Pattern worth a learning entry.

3. **D-NN decision renumbering** is a recurring merge conflict. PR #10 collided with main on D-25/D-26 because both branches added decisions in parallel. The plan needs a write-lock convention or a numbering helper.

4. **Curriculum dual-file byte-equality** (`public/curriculum/v1.json` ≡ `src/curriculum/bundle.json`) is enforced only by author discipline. No subagent or hook checks it. Phase 3 adds the subagent.

5. **Engine determinism is ESLint-enforced but not explained in-context.** When `Math.random` lands in `src/engine/`, the failure is a cryptic ESLint message, not a structured "inject the Rng port at line N per `src/engine/ports.ts`" advisory. PR #16 caught it only because the human author noticed. Phase 3 adds the subagent that explains.

6. **`/preflight` is one-size-fits-all.** Doc-only PRs (#10, #11, #23) ran the full typecheck + lint + unit + integration + build + bundle pipeline at ~90 s each. The blast-radius router in Phase 2 cuts this to ~5 s for `chore/`/`docs/` prefixes.

7. **MCP `github` server token expired mid-session** during the final verification of the PR-merge batch. The retry path was unclear and cost ~2 k tokens to reorient. Phase 5 adds a runbook entry.

---

## What already exists (do NOT recreate)

The autonomous infrastructure is significantly more mature than the prior plan acknowledged. The phases below assume this surface and refine it.

**Subagents** (`.claude/agents/`, 4 files, frontmatter `name`/`description`/`tools`):
- `c1-c10-auditor` — locked-constraints C1–C10 audit
- `bundle-watcher` — 1 MB gzipped JS budget enforcement
- `validator-parity-checker` — TS ↔ Python parity for `src/validators/*.ts`
- `a11y-auditor` — WCAG 2.1 AA across new interactive elements

**Slash commands** (`.claude/commands/`, 9 files, frontmatter `description`):
- `/preflight`, `/sync-curriculum`, `/diag`, `/learn`, `/retro`, `/sprint-status`, `/c5-check`, `/test-changed`, `/decision`

**Hooks in `.claude/settings.json`**:
- `SessionStart` → orientation banner (branch, dirty count, slash command list, subagent list, sprint pointer)
- `PreCompact` → appends `branch/dirty/last-commit` line to `.claude/_session-log.md`
- `PostToolUse(Bash)` → nudges to `/retro` when a `git commit` touches `src/` without `CHANGELOG`/`PLANS/`/`learnings.md` in the same commit
- `PostToolUse(Edit|Write)` → runs `npm run gen:workflows` and warns on drift, but only for a hardcoded file list (`vite.config.ts`, `playwright.config.ts`, `src/config/shared.ts`, `scripts/workflows/generator.mjs`)

**Husky git hooks** (`.husky/`):
- `pre-commit` → `npm run typecheck` (~3 s, lightweight)
- `pre-push` → `npm run gen:workflows` + drift check + `npm run lint:ci`

**GitHub Actions workflows** (`.github/workflows/`, 18 files, all autonomy-gated):
- `ci.yml` — typecheck + lint + tests + build + bundle on every PR
- **`subagent-pr-audit.yml`** — already exists; computes path filters and dispatches subagent runs (Phase 4 refines, doesn't create)
- `coverage-matrix.yml`, `claude-md-maintenance.yml`, `auto-rebuild-bundles.yml`, `bug-burndown.yml`, `ci-fix.yml`, `content-validation.yml`, `curriculum-loop.yml`, `dependabot-auto-merge.yml`, `deploy.yml`, `issue-to-copilot.yml`, `lighthouse.yml`, `misconception-synthesis.yml`, `synthetic-playtest.yml`, `telemetry-weekly.yml`, `validation-ingest.yml`
- All gated by `AGENT_AUTONOMY_ENABLED` repo variable per **D-25**.

**Tooling**:
- `scripts/agent-doctor.mjs` — validates that every `CLAUDE.md`, `.claude/agents/*.md`, and `.claude/commands/*.md` has the required structure. Phase 1 leans on this.
- 11 nested `CLAUDE.md` files (`src/components/`, `src/persistence/`, `src/engine/`, `src/validators/`, `src/lib/`, `src/scenes/interactions/`, `tests/`, `pipeline/`, `install/.claude/`, root) — auto-loaded by directory.
- `docs/00-foundation/decision-log.md` — 29 entries, D-NN format, append-only newest-at-top.
- `.claude/learnings.md` — 5 entries since 2026-04-30. Underused (Phase 6 fixes).

**The implication for the rest of this plan:** every phase below assumes this surface is the baseline. "Create" verbs are reserved for things that genuinely don't exist (the two new subagents, the blast-radius router, the PR template, the LOC-budget enforcer); everything else is "refine," "extend," or "wire."

---

## Core principle: Proactive over reactive

The four existing subagents (`c1-c10-auditor`, `bundle-watcher`, `validator-parity-checker`, `a11y-auditor`) are all **reactive** — they audit *after* a diff exists. That's how `Level01Scene.ts` reached 1727 LOC despite four scoped subagents existing: nothing prevented it; the auditors only commented on it after the fact, by which time the cost of unwinding exceeded the appetite to do so.

This plan adopts a stricter model: **prevent the failure mode at the moment it would be introduced, not after.** Each phase below is graded on whether it adds proactive prevention (good) or just better reactive auditing (acceptable but not the goal).

| Failure mode | Reactive (audit after) | Proactive (prevent at write-time) |
|---|---|---|
| God file (>budget LOC) | `bundle-watcher` reports it post-merge | PostToolUse Edit hook **blocks** writes that push a file past its LOC budget |
| Cross-layer import (engine → scenes) | ESLint flag at lint time | PreToolUse Read warns when opening a file already at 80% of budget; scaffolder doesn't generate cross-layer imports in the first place |
| New `localStorage` key outside C5 | `c1-c10-auditor` at PR open | PostToolUse hook warns inline at the edit |
| Curriculum dual-file drift | `curriculum-byte-parity` at PR open | PostToolUse hook auto-runs `build:curriculum` on `pipeline/output/**`; direct edits to either bundle file are **blocked** with `exit 2` |
| Branch-name drift | nightly review | `.husky/pre-push` regex rejects |
| Decision-log D-NN collision | merge conflict at PR | numbering helper or write-lock convention (Appendix B open question) |
| God-file *creation* (new monolith from scratch) | (none) | `npm run scaffold:scene <name>` generates `<name>Scene.ts` + `<name>Controller.ts` + `<name>State.ts` + tests; new scenes can't be born monolithic |

### Per-directory LOC budgets (proactive enforcement)

Enforced at three layers (write-time, lint-time, CI-time) so no single bypass loses the gate:

| Path glob | Budget (LOC) | Rationale |
|---|---|---|
| `src/scenes/*Scene.ts` | 600 | Phaser scenes that exceed this become god files (see `Level01Scene.ts` at 1727) |
| `src/components/*.ts` | 300 | UI components should be focused; >300 signals missed extraction |
| `src/validators/*.ts` | 200 | One archetype per file by convention; >200 means logic belongs in a helper |
| `src/engine/*.ts` | 400 | Engine modules should be small + composable |
| `src/lib/*.ts` | 300 | Same logic as components |

Enforced via:
1. **ESLint `max-lines` rule** scoped to each file group in `.eslintrc.json` (compile-time).
2. **PostToolUse Edit hook** that runs `wc -l` on the post-edit file and exits `2` (block) if the count exceeds budget — with a structured advisory pointing to the corresponding extraction pattern (Path A / controller pattern from D-27 for scenes; helper extraction for validators; etc.).
3. **CI gate in `subagent-pr-audit.yml`** that fails on PR if any in-scope file exceeds budget (PR-time backstop).

### Pre-existing god files: frozen, not grandfathered

- `src/scenes/Level01Scene.ts` (1727 LOC) — already on D-27's deletion list (Phase 3 of `code-quality-2026-05-01.md`).
- `src/scenes/LevelScene.ts` (also large) — sibling of the same Path-A migration.

These pre-date the budget. They are **frozen**: the LOC-budget hook rejects any net-LOC-positive edit until extraction lands. Bug-fix edits that delete more than they add are allowed. This forces the deferred sunset (D-27) to either happen or be explicitly waived per-PR with `--no-verify` plus a one-line justification in the PR body. The freeze is the proactive layer that makes the deferred sunset costless to defer (no additional rot accumulates).

### Scaffolding that enforces the split

- `npm run scaffold:scene <name>` → creates `<name>Scene.ts` + `<name>Controller.ts` + `<name>State.ts` + matching test files from templates at `templates/scene/`.
- `npm run scaffold:validator <archetype>` → creates `<archetype>.ts` + `<archetype>.test.ts` + parity fixture stub at `pipeline/fixtures/parity/`.
- `npm run scaffold:component <name>` → creates `<name>.ts` + `__tests__/<name>.test.ts` + the matching `A11yLayer.addElement` stub.

New work starts split. Existing god files don't replicate.

### Why this matters for token economy

A reactive audit on a 1727-LOC file consumes ~30 k tokens just to read the file. The same audit on three 600-LOC files consumes ~30 k tokens too — but the *editing* cost in subsequent sessions drops by ~3× because each file fits in a smaller context, and merge conflicts on parallel work drop because edits to different concerns no longer collide.

Proactive prevention pays compounding dividends: every god file we *don't* create saves tokens for the rest of the project's lifetime.

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
