# Autonomous Workflows — 2026-04-30

## Operating principle

**Always optimize for maximum autonomy.** Detection-only is not enough; resolution-only is not enough — the goal is *human-out-of-the-loop* until human judgment is genuinely needed.

This plan is sequenced by autonomy ceiling, highest first. Risk is managed through scoped permissions and per-SHA limits, not by deferring the most autonomous workflows.

## Goal

Add five GitHub Actions workflows that turn this repo into a self-maintaining system: agents fix CI, agents audit every PR, agents implement issues described in English, agents heal recurring footguns. The solo developer becomes a reviewer of agent work, not a doer of mechanical work.

Aligned with the project's reality: solo developer, agent-driven workflow, locked C1–C10 constraints, LLM-generated curriculum, four specialist subagents already defined and underused.

## Out of scope

- Copilot Code Review action — advisory only, not autonomous
- Lighthouse assertions, npm audit, branch-name linting — detection only, not aligned with the operating principle
- Visual regression, CodeQL, stale-PR bots — don't fit C10
- Implementation in this plan (plan only; build in subsequent sessions)

## Sequence — by autonomy ceiling, highest first

| Order | Workflow | Tier | Autonomy ceiling |
|---|---|---|---|
| 1 | **G — Issue-to-PR agent** | 4 | Human writes English in an issue. Agent implements, tests, opens PR. Highest possible autonomy short of unsupervised commits to main. |
| 2 | **F — CI-failure-to-agent dispatch** | 4 | Failing CI triggers an agent that diagnoses the log, attempts the fix, opens a fix PR back into the failing branch. Self-healing CI. |
| 3 | **E — Subagent-on-PR** | 4 | Every PR is audited by the matching specialist subagent (`c1-c10-auditor`, `bundle-watcher`, `validator-parity-checker`, `a11y-auditor`) with no human invocation. |
| 4 | **A — Auto-rebuild curriculum bundles** | 3 | Pipeline output changes → bundles auto-sync and auto-commit back. Mechanical self-heal of a documented footgun. |
| 5 | **D — Dependabot auto-merge (patch + minor)** | 3 | Dependency updates merge themselves when CI is green. |

The sequencing logic: build the highest-ceiling workflows first. They define the contract. The mechanical self-heals (A, D) drop in trivially once the agent dispatch infrastructure exists.

---

## Workflow G — Issue-to-PR agent (highest autonomy)

### Problem
Today, the human writes English describing a change, then opens the editor and implements it. The agent infrastructure can absorb the implementation step.

### Trigger
`issues` event with label `claude:implement`. Also `issue_comment` with `/claude implement` from the repo owner.

### Action
1. Read the issue body
2. Dispatch a Claude Code agent with: the issue text, the repo at `main`, full tool access (Read, Edit, Bash for tests/lint)
3. Agent creates a branch `feat/<YYYY-MM-DD>-<slug>` per the CLAUDE.md branch convention
4. Agent implements, runs `npm run preflight` until green, commits
5. Agent opens a PR linked to the issue, with description summarizing the changes and listing tests run
6. Agent posts a comment on the issue with the PR link

### Scope
- Issue must be labeled `claude:implement` by the repo owner (don't trigger on arbitrary contributor labels)
- Hard timeout: 30 min agent runtime
- One agent run per issue; subsequent attempts require explicit re-trigger via comment

### Acceptance criteria
- Issue: "Fix BUG-04 — hint tiers never advance past Tier 1" → agent opens a PR with the fix and `preflight` green
- Issue with vague description triggers a comment from the agent asking for clarification before attempting work
- Agent run that fails to reach green CI opens a draft PR with notes on what it tried and where it got stuck (so the human inherits the partial work)

### Risks
- Agent implements the wrong thing → mitigated by PR-not-direct-commit; human reviews before merging
- Agent thrashes for 30 min on an impossible task → mitigated by hard timeout and draft-PR fallback
- Cost: API tokens per issue → bounded by timeout; expected $1–5 per issue
- Permissions: agent needs branch-create + PR-create + write to non-protected branches → standard `GITHUB_TOKEN` is sufficient

### Pre-flight requirements
- `ANTHROPIC_API_KEY` secret set
- Claude Code CLI installable in CI runner
- Active bug list in CLAUDE.md becomes the de facto issue tracker for this workflow

---

## Workflow F — CI-failure-to-agent dispatch

### Problem
When `ci.yml` fails on a PR, the human reads the log, diagnoses, fixes, pushes. All of that is dispatch-able.

### Trigger
`workflow_run` event for `ci.yml`, `conclusion == 'failure'`, only on `pull_request` runs (not `push` to main).

### Action
1. Fetch failing job log via GitHub API
2. Identify failing step (typecheck, lint, unit, e2e, a11y, build, bundle)
3. Dispatch a Claude Code agent with: failing log + PR diff + repo at PR head
4. Agent attempts fix on `claude-fix/<pr-number>-<short-sha>`
5. Agent opens a PR *into the original PR's head branch* with the proposed fix
6. Agent comments on the original PR linking the fix PR

### Scope
- Only triggers on `ci.yml` failures, not other workflows
- Hard limit: 1 auto-fix attempt per PR head SHA — if it fails again, the human takes over
- Skips if the failing PR is already authored by the bot (prevents recursive thrash)

### Acceptance criteria
- Lint failure on a missing semicolon → auto-fix PR with the fix, green CI
- Real logic-bug test failure → auto-fix PR that *attempts* a fix; the attempt is visible regardless of correctness
- Same SHA fails CI twice → no second auto-fix attempt
- Auto-fix PR clearly identifies as bot-authored

### Risks
- Agent commits wrong fix that masks a real bug → mitigated by separate PR (not direct push); human reviews
- Cost: every CI failure spawns an agent run → mitigated by per-SHA limit and PR-only trigger
- Agent obscures the real bug by overfitting to the test → mitigated by reviewer scrutiny + the per-SHA limit forcing the human to engage if the first attempt is bad

---

## Workflow E — Subagent-on-PR

### Problem
Four specialist subagents (`c1-c10-auditor`, `bundle-watcher`, `validator-parity-checker`, `a11y-auditor`) are defined in `.claude/agents/`. They were designed for audit-on-change. They only fire when a human invokes them. They are sitting idle on every PR.

### Trigger
`pull_request` (opened, synchronize, reopened) — single workflow, multiple jobs gated by changed-paths filters.

### Action — path-routed dispatch

| Changed paths | Subagent invoked |
|---|---|
| `src/validators/**` | `validator-parity-checker` |
| `src/components/**`, `src/scenes/interactions/**`, `src/scenes/**Scene.ts` | `a11y-auditor` |
| `package.json`, `package-lock.json` | `bundle-watcher` |
| Any meaningful diff (excluding docs-only) | `c1-c10-auditor` |

Each subagent runs in its own job. Findings post as a single PR review comment scoped to the agent's domain. Multiple agents can fire on a single PR. Subsequent pushes update the existing comment in place (no spam).

### Execution model
Local execution in CI: install Claude Code CLI in the runner, invoke the subagent there, requires `ANTHROPIC_API_KEY` secret. Self-contained; no external service.

### Scope
- Findings post as PR review comments, not failing checks (Tier 2 first)
- Promote to blocking only after first 5 PRs of output validate signal-to-noise
- Subagent failure (API outage) does NOT fail the PR — graceful degradation

### Acceptance criteria
- PR touching `src/validators/registry.ts` → `validator-parity-checker` fires, posts a comment
- PR touching only `docs/**` → no subagent jobs fire
- Re-pushing updates existing comment in place
- Subagent crash → PR check is yellow, not red

### Risks
- Cost per PR → mitigated by path filtering and short prompts
- Noise: low-value findings every PR → mitigated by SNR review of first 5 PRs, then prompt tightening, then promotion to blocking
- Token leakage in logs → repo secret, never echoed

---

## Workflow A — Auto-rebuild curriculum bundles

### Problem
CLAUDE.md hard rule: `public/curriculum/v1.json` and `src/curriculum/bundle.json` must always match. Only correct way to update them: `npm run build:curriculum`. Humans forget. Files drift. CI catches it after the fact.

### Trigger
`pull_request` paths matching:
- `pipeline/output/**`
- `pipeline/schemas.py`
- `pipeline/validators_py.py`

### Action
1. Checkout PR branch with write access
2. Install Node + Python deps
3. Run `npm run build:curriculum`
4. If `git diff --quiet` non-zero on the two bundle files, commit `chore(curriculum): auto-sync bundles [bot]` and push back to PR branch
5. If no diff, exit success silently

### Scope
- Only the two bundle files. No other auto-edits.
- Skip on PRs from forks (no write token)
- Skip if latest commit on the PR is itself the bot commit (loop guard)

### Acceptance criteria
- PR editing `pipeline/output/level_03/all.json` → automatic follow-up commit syncing both bundle files
- PR not touching curriculum files → no run
- Re-running on a synced PR → no commit
- Existing `content-validation.yml` still passes after auto-commit

### Risks
- Loop: bot commit triggers another bot run → mitigated by skip-if-bot-author guard
- Race with human pushes → mitigated by `concurrency: pr-${PR_NUMBER}` with `cancel-in-progress: true`

---

## Workflow D — Dependabot auto-merge (patch + minor)

### Problem
Solo dev. Patch and minor dependency updates pile up. Each requires a click. Hours/quarter lost to mechanical reviews.

### Trigger
`pull_request_target` for PRs authored by `dependabot[bot]`, after `ci.yml` reports success.

### Action
1. Verify PR author is `dependabot[bot]`
2. Parse Dependabot metadata; extract semver bump type
3. Patch or minor + green CI → enable auto-merge with squash
4. Major → comment `Major bump — manual review required` and stop

### Scope
- Patch + minor only
- Production deps and devDeps both eligible

### Acceptance criteria
- `vitest` patch bump → auto-merges within ~25 min of green CI
- `phaser` major bump → does not auto-merge; manual-review comment posted
- Patch bump that fails CI → does not auto-merge

### Risks
- Bad patch sneaks past tests → that's a test-coverage problem, not an auto-merge problem
- Token scope → standard `GITHUB_TOKEN` is sufficient

---

## Decision points before implementation

1. **Workflow G** — confirm appetite for issue-driven autonomous implementation. Recommendation: yes; this is the highest-leverage workflow in the repo.
2. **Workflow F** — confirm appetite for agent thrash on hard CI failures. Recommendation: yes, with the per-SHA limit.
3. **Workflow E** — confirm willingness to spend API budget per PR (~$0.10–$0.50/PR depending on diff size). Recommendation: yes.
4. **Workflow A** — confirm auto-commit pattern is acceptable on PR branches vs. blocking. Recommendation: auto-commit.
5. **Workflow D** — confirm minor (not just patch) is auto-merge-eligible. Recommendation: minor + patch given solo dev and existing test coverage.

## Pre-flight requirements (one-time setup)

- Set `ANTHROPIC_API_KEY` repo secret (used by E, F, G)
- Verify `GITHUB_TOKEN` default permissions are sufficient (or grant repo `contents: write`, `pull-requests: write`, `issues: write`)
- Document agent budget cap and revoke-key procedure in `docs/00-foundation/`

## Success metrics — one month after all five live

- ≥ 1 issue per week resolved end-to-end via Workflow G with no human implementation work
- ≥ 30% of CI-failure PRs get a viable auto-fix proposal (Workflow F)
- Each subagent fires on every applicable PR; SNR judged useful (Workflow E)
- Zero "forgot to run build:curriculum" CI failures (Workflow A)
- ≥ 80% of Dependabot patch/minor PRs merge without human touch (Workflow D)

## Estimated effort

| Workflow | Effort |
|---|---|
| G | ~6–10 hr — agent invocation, PR-creation, branch-naming compliance, draft-PR fallback |
| F | ~4–8 hr — workflow_run wiring, agent dispatch, PR-back logic, thrash guards |
| E | ~3–5 hr — path routing, agent invocation, comment update logic |
| A | ~1 hr — single workflow, well-known pattern |
| D | ~30 min — standard recipe |

Total: ~15–25 hr of build, sequenced as listed above.

## Notes on existing workflows

These plans don't replace any existing workflow:
- `ci.yml` remains the hard gate (and the trigger for F)
- `content-validation.yml` remains the curriculum schema check (consumes A's output)
- `deploy.yml`, `lighthouse.yml`, `synthetic-playtest.yml` unchanged

Pre-existing inconsistency to fix opportunistically: `synthetic-playtest.yml` uses Node 20 while the rest use Node 24. Trivial; not part of this plan.
