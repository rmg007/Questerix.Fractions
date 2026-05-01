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

## Phase 1 — Auto-invoke layer (concrete artifacts)

**Goal:** Stop requiring the user to type slash commands. Mechanical things via hooks; judgment things via skills invoked by behavior rules. The LOC-budget hook (1.4) is the proactive piece — it blocks god-file growth at write-time, not post-merge.

### 1.1 `.claude/settings.json` — extended `PostToolUse(Edit|Write|MultiEdit)` hook

Replace the existing `Edit|Write|MultiEdit` matcher block (currently at `.claude/settings.json:135-143`) with the entry below. The single existing concern (workflow-config drift) is preserved as the first `case` arm; new arms are appended. Each arm is a single `case` pattern in one bash one-liner so the hook stays under one process spawn.

```json
{
  "matcher": "Edit|Write|MultiEdit",
  "hooks": [
    {
      "type": "command",
      "command": "FILE=$(jq -r '.tool_input.file_path // empty' 2>/dev/null); [ -z \"$FILE\" ] && exit 0; case \"$FILE\" in *public/curriculum/v1.json|*src/curriculum/bundle.json) echo 'BLOCKED: curriculum bundles are generated artifacts. Edit pipeline/output/level_*/all.json then run: npm run build:curriculum' >&2; exit 2 ;; *vite.config.ts|*playwright.config.ts|*src/config/shared.ts|*scripts/workflows/generator.mjs) echo '▶ config touched — checking workflow drift...'; npm run gen:workflows >/dev/null 2>&1 || true; git diff --exit-code .github/workflows >/dev/null 2>&1 || echo 'WARNING: workflow drift — run npm run gen:workflows && git add .github/workflows' >&2 ;; *pipeline/output/*) echo '▶ pipeline output changed — syncing curriculum bundles...'; npm run build:curriculum 2>&1 | tail -n 8 >&2 || true ;; *src/persistence/db.ts) echo '◇ db.ts edited — Dexie schema-version bump? Add a new .version(N).stores({...}).upgrade(tx => ...) block; never mutate an existing version. See src/persistence/CLAUDE.md.' >&2 ;; *src/persistence/*|*src/scenes/*|*src/lib/*) HITS=$(grep -nE 'localStorage\\.(get|set|remove)Item\\(' \"$FILE\" 2>/dev/null | grep -vE \"['\\\"](lastUsedStudentId|unlockedLevels:|completedLevels:)\" || true); [ -n \"$HITS\" ] && { echo '◇ C5 advisory: new localStorage usage in this file — only lastUsedStudentId is permitted (unlockedLevels:/completedLevels: are grandfathered in MenuScene/LevelMapScene only). Run /c5-check to verify.' >&2; echo \"$HITS\" >&2; } ;; esac; case \"$FILE\" in *.test.ts|*.test.tsx|*__tests__/*|*.spec.ts) : ;; *src/*.ts|*src/*.tsx) DIR=$(dirname \"$FILE\"); BASE=$(basename \"$FILE\" | sed 's/\\.tsx\\?$//'); SIBLING=\"$DIR/$BASE.test.ts\"; NESTED=\"$DIR/__tests__/$BASE.test.ts\"; TEST=''; [ -f \"$SIBLING\" ] && TEST=\"$SIBLING\"; [ -z \"$TEST\" ] && [ -f \"$NESTED\" ] && TEST=\"$NESTED\"; [ -n \"$TEST\" ] && { echo \"▶ running sibling test: $TEST\"; npx vitest run \"$TEST\" --reporter=basic 2>&1 | tail -n 10 >&2 || true; } ;; esac; exit 0"
    }
  ]
}
```

Behavior summary (in evaluation order):

| Trigger glob | Action | Exit |
|---|---|---|
| `public/curriculum/v1.json`, `src/curriculum/bundle.json` | **Hard block** — generated artifacts; route through `build:curriculum` | `2` |
| `vite.config.ts`, `playwright.config.ts`, `src/config/shared.ts`, `scripts/workflows/generator.mjs` | Run `gen:workflows`, warn if `.github/workflows` drifts (preserved from current hook) | `0` |
| `pipeline/output/**` | Auto-run `npm run build:curriculum`, tail 8 lines (enforces dual-file byte-equality) | `0` |
| `src/persistence/db.ts` | Reminder about additive Dexie `.version(N)` bump pattern | `0` |
| `src/persistence/**`, `src/scenes/**`, `src/lib/**` | Grep for non-allowlisted `localStorage` calls; print advisory | `0` |
| Any `src/**/*.ts(x)` non-test edit | Find `<base>.test.ts` sibling or `__tests__/<base>.test.ts`, run it, tail 10 lines | `0` |

**Properties:** fail-soft (every internal failure suffixed `|| true`; only the dual-file write uses `exit 2`); idempotent (pure read/diff except for `build:curriculum`, which is itself idempotent); fast for advisories (C5 grep, schema reminder, drift check each <50 ms; the heavier `build:curriculum` and per-file `vitest` only fire on narrow paths).

### 1.2 CLAUDE.md "Auto-invoke skills" section

Insert immediately after the existing **Specialist subagents** section in root CLAUDE.md:

```markdown
## Auto-invoke skills

The harness exposes user-invocable skills that overlap our slash commands. The hooks above cover *mechanical* triggers (file paths). The triggers below are *semantic* and live with me — when the condition is met I invoke the skill via the Skill tool **before** finalizing a response, without waiting to be asked.

| Skill | Auto-invoke when… | Rationale |
|---|---|---|
| `simplify` | I just wrote >40 net new LOC to a single file under `src/` (any path), or my change touched ≥3 files in `src/scenes/interactions/`, `src/validators/`, or `src/engine/`. | God-file drift is empirically validated (Level01Scene 1604→1727 in one session). A pre-flight simplify pass catches duplication before it lands. |
| `security-review` | The diff touches `src/persistence/**`, `src/lib/observability/**`, `src/lib/i18n/**`, anything that reads `import.meta.env`, or adds a `WebFetch` / `fetch(` call. | C1 (no egress), C5 (localStorage scope), and the env-gated OTel/Sentry contract all live in these surfaces. |
| `review` | I am about to ask the user to open a PR, or the working tree contains a commit on a `feat/`, `fix/`, or `refactor/` branch with no review yet. | Catches issues that the husky pre-push gate can't (semantic regressions, missing tests, scope creep). |
| `fewer-permission-prompts` | A session has hit ≥3 permission prompts for read-only `Bash`/`Grep`/`Read` invocations not yet in `.claude/settings.json`. | Friction-reduction; expands `permissions.allow` for the patterns I keep retyping. |

**Recursion guard:** auto-invoke fires once per skill per turn; never auto-invoke from inside a skill response. Any skill response can write `[no-auto-followup]` to suppress the next auto-invocation.

If a skill fires, I cite it in the final response (`▶ ran simplify on src/scenes/Level01Scene.ts — 0 findings`) so the user sees the audit trail.
```

### 1.3 Slash commands — keep vs. delete

Every project slash command in `.claude/commands/` listed in CLAUDE.md has a same-named harness skill. Recommendation:

| Command file | Recommendation | Reason |
|---|---|---|
| `.claude/commands/preflight.md` | **Delete** | Replaced by Phase 2 router invoked from husky + the `preflight` skill. |
| `.claude/commands/sync-curriculum.md` | **Delete** | The PostToolUse hook auto-runs `build:curriculum` on `pipeline/output/**` writes. |
| `.claude/commands/diag.md` | **Delete** | SessionStart hook prints the same; the `diag` skill covers ad-hoc need. |
| `.claude/commands/test-changed.md` | **Delete** | The PostToolUse hook now runs sibling tests automatically on every Edit. |
| `.claude/commands/learn.md` | **Keep** | Project-specific entry format (`YYYY-MM-DD <area>: …`, newest below the marker at `.claude/learnings.md:19`) isn't in the generic skill. |
| `.claude/commands/retro.md` | **Keep** | Project-specific update targets (CLAUDE.md, nested CLAUDE.mds, PLANS, CHANGELOG, decision-log) — generic skill won't know the right files. Phase 6 enhances it. |
| `.claude/commands/sprint-status.md` | **Keep** | Pulls from `PLANS/master-plan-2026-04-26.md` and the bug table in CLAUDE.md; project-specific. |
| `.claude/commands/c5-check.md` | **Keep** | Permitted-key allowlist is project-specific; the hook above uses the same list. |
| `.claude/commands/decision.md` | **Keep** | Targets `docs/00-foundation/decision-log.md` with project-specific D-NN format. |

Net: delete 4, keep 5. Surface area shrinks ~45% with no capability loss.

### 1.4 Proactive LOC-budget hook (the keystone proactive piece)

This is the gate that prevents god files from forming. Adds a second `PostToolUse(Edit|Write|MultiEdit)` stanza after 1.1:

```json
{
  "matcher": "Edit|Write|MultiEdit",
  "hooks": [
    {
      "type": "command",
      "command": "FILE=$(jq -r '.tool_input.file_path // empty' 2>/dev/null); [ -z \"$FILE\" ] || [ ! -f \"$FILE\" ] && exit 0; LOC=$(wc -l < \"$FILE\" 2>/dev/null | tr -d ' '); BUDGET=0; case \"$FILE\" in *src/scenes/*Scene.ts) BUDGET=600 ;; *src/components/*.ts) BUDGET=300 ;; *src/validators/*.ts) BUDGET=200 ;; *src/engine/*.ts) BUDGET=400 ;; *src/lib/*.ts) BUDGET=300 ;; esac; if [ \"$BUDGET\" -gt 0 ] && [ \"$LOC\" -gt \"$BUDGET\" ]; then case \"$FILE\" in *Level01Scene.ts|*LevelScene.ts) PRE=$(git show HEAD:\"$FILE\" 2>/dev/null | wc -l | tr -d ' ' || echo 0); if [ \"$LOC\" -gt \"$PRE\" ]; then echo \"BLOCKED: $FILE is $LOC LOC, exceeding the $BUDGET LOC budget for $(echo $FILE | sed 's|.*/||') files. This is a frozen god file (D-27 deferred sunset) — net-LOC-positive edits are rejected until extraction lands. Bug-fix edits that delete more than they add are allowed. To bypass with justification: git commit --no-verify with a one-line rationale in the PR body.\" >&2; exit 2; fi ;; *) echo \"BLOCKED: $FILE is $LOC LOC, exceeding the $BUDGET LOC budget for $(echo $FILE | sed 's|.*/||') files. Extract before adding more. See PLANS/agent-tooling-2026-05-01.md → Core principle: Proactive over reactive.\" >&2; exit 2 ;; esac; fi; if [ \"$BUDGET\" -gt 0 ] && [ \"$LOC\" -gt $((BUDGET * 8 / 10)) ]; then echo \"◇ LOC advisory: $FILE is at $LOC/$BUDGET (>80%). Consider extracting before next addition.\" >&2; fi; exit 0"
    }
  ]
}
```

Behavior:
- Files in budgeted globs that exceed the budget after the edit → **block** (`exit 2`) with extraction guidance.
- Pre-existing god files (`Level01Scene.ts`, `LevelScene.ts`) are **frozen** — only net-LOC-negative edits allowed (compares post-edit `wc -l` to `git show HEAD`'s line count). Bug fixes that delete more than they add are accepted.
- Files at 80–100% of budget print an advisory but don't block.
- Non-budgeted paths (tests, docs, configs) are untouched.

### 1.5 ESLint `max-lines` rule (compile-time backstop)

Add per-file-group rules in `.eslintrc.json`:

```json
{
  "overrides": [
    {
      "files": ["src/scenes/*Scene.ts"],
      "excludedFiles": ["src/scenes/Level01Scene.ts", "src/scenes/LevelScene.ts"],
      "rules": { "max-lines": ["error", { "max": 600, "skipBlankLines": true, "skipComments": true }] }
    },
    {
      "files": ["src/components/*.ts"],
      "rules": { "max-lines": ["error", { "max": 300, "skipBlankLines": true, "skipComments": true }] }
    },
    {
      "files": ["src/validators/*.ts"],
      "rules": { "max-lines": ["error", { "max": 200, "skipBlankLines": true, "skipComments": true }] }
    },
    {
      "files": ["src/engine/*.ts"],
      "rules": { "max-lines": ["error", { "max": 400, "skipBlankLines": true, "skipComments": true }] }
    }
  ]
}
```

The two pre-existing god files are exempted (the hook handles them with the freeze policy). All new scenes inherit the budget at the lint layer too — three independent gates (write-time hook, lint-time eslint, PR-time CI) so no single bypass loses the protection.

### 1.6 Acceptance for Phase 1

- Editing `pipeline/output/level_3/all.json` triggers `build:curriculum` automatically.
- Editing `public/curriculum/v1.json` directly is blocked with a clear remediation message.
- Editing `src/scenes/MenuScene.ts` adding `localStorage.setItem('foo', ...)` prints a C5 advisory.
- Editing `src/engine/bkt.ts` runs `src/engine/bkt.test.ts` and tails 10 lines.
- Adding LOC to a 1727-LOC `Level01Scene.ts` is **blocked** unless the diff is net-negative.
- Creating a 700-LOC `MenuScene.ts` is **blocked** at write-time, not at PR-time.
- Root CLAUDE.md contains an "Auto-invoke skills" section with at least 4 rules and a recursion guard.

**Effort:** 3 hr (was 2 hr; the LOC-budget hook adds ~1 hr).

---

## Phase 2 — Blast-radius preflight (concrete artifacts)

**Goal:** The full preflight runs full only when needed. The proactive piece: when a `chore/` or `docs/` branch unexpectedly touches `src/**`, the router auto-escalates to the full tier rather than trusting the prefix.

### 2.1 `scripts/preflight-router.mjs` — full source

```javascript
#!/usr/bin/env node
/**
 * preflight-router.mjs
 *
 * Branch-aware preflight gate. Reads the current branch name and runs the
 * tier of checks proportional to the branch's blast radius:
 *
 *   chore/* docs/* plans/*       → light   (typecheck + lint)
 *   fix/*   test/*               → medium  (light + unit)
 *   feat/*  refactor/*           → full    (medium + integration + build + bundle)
 *   claude/* worktree-agent-* …  → full    (defensive default)
 *
 * Auto-escalation: a chore/docs/plans branch that touches src/** is
 * escalated to full tier with a stderr note. The branch prefix is a hint,
 * not a contract.
 *
 * Invoked by .husky/pre-push. Fails fast on the first failing step.
 *
 * Exit 0 = all checks passed
 * Exit 1 = a check failed (message printed) or git unavailable
 */

import { execSync, spawnSync } from 'node:child_process';

const TIERS = {
  light: ['typecheck', 'lint'],
  medium: ['typecheck', 'lint', 'test:unit'],
  full: ['typecheck', 'lint', 'test:unit', 'test:integration', 'build', 'measure-bundle'],
};

function currentBranch() {
  try {
    return execSync('git branch --show-current', { encoding: 'utf8' }).trim();
  } catch {
    return '';
  }
}

function changedSrcPaths() {
  try {
    const base = execSync('git merge-base HEAD origin/main', { encoding: 'utf8' }).trim();
    const out = execSync(`git diff --name-only ${base}..HEAD`, { encoding: 'utf8' });
    return out.split('\n').filter((p) => p.startsWith('src/'));
  } catch {
    return [];
  }
}

function tierFor(branch) {
  if (/^(chore|docs|plans)\//.test(branch)) return 'light';
  if (/^(fix|test)\//.test(branch)) return 'medium';
  if (/^(feat|refactor)\//.test(branch)) return 'full';
  // claude/*, worktree-agent-*, main, detached, unknown — defensive default
  return 'full';
}

function run(script) {
  process.stdout.write(`  → npm run ${script}\n`);
  const r = spawnSync('npm', ['run', script], { stdio: 'inherit' });
  if (r.status !== 0) {
    console.error(`\n✗ preflight failed at: npm run ${script}`);
    process.exit(1);
  }
}

const branch = currentBranch() || '(detached)';
let tier = tierFor(branch);

// Proactive auto-escalation: a "doc-only" branch that touched src/** is
// suspicious. Escalate to full tier rather than trusting the prefix.
if (tier === 'light') {
  const srcPaths = changedSrcPaths();
  if (srcPaths.length > 0) {
    console.error(`◇ auto-escalating: branch '${branch}' is prefixed for light tier but touches src/**:`);
    srcPaths.slice(0, 5).forEach((p) => console.error(`  - ${p}`));
    if (srcPaths.length > 5) console.error(`  - … and ${srcPaths.length - 5} more`);
    tier = 'full';
  }
}

const steps = TIERS[tier];

console.log(`▶ tier: ${tier}  (branch: ${branch})`);
for (const step of steps) run(step);
console.log(`✓ all checks passed (${tier})`);
```

Notes:
- Pure Node; no new dependencies.
- Auto-escalation is the proactive piece — it catches the case where someone (human or agent) mislabels a branch.
- `measure-bundle` is gated to `full` because it requires a fresh `dist/`.

### 2.2 Updated `.husky/pre-push`

```sh
#!/usr/bin/env sh
# Pre-push guard:
#   1. Branch-name compliance (per CLAUDE.md git-workflow rule)
#   2. Workflow regen drift check
#   3. Tiered preflight router (see scripts/preflight-router.mjs)
# Bypass with: git push --no-verify (CI consistency gate is backstop)

# 1. Branch-name compliance ---------------------------------------------------
BRANCH=$(git branch --show-current)
case "$BRANCH" in
  main|claude/*|worktree-agent-*) ;;
  *)
    if ! echo "$BRANCH" | grep -qE '^(feat|fix|refactor|chore|test|plans|docs)/[0-9]{4}-[0-9]{2}-[0-9]{2}-[a-z0-9][a-z0-9-]*$'; then
      echo ""
      echo "ERROR: branch name '$BRANCH' is non-compliant."
      echo "Required shape: <type>/YYYY-MM-DD-<slug>"
      echo "  type ∈ {feat, fix, refactor, plans, chore, docs, test}"
      echo "  slug: lowercase, kebab-case"
      echo "See docs/00-foundation/git-workflow.md and CLAUDE.md → 'Git workflow'."
      exit 1
    fi
    ;;
esac

# 2. Workflow drift -----------------------------------------------------------
echo "▶ pre-push: checking workflow consistency..."
npm run gen:workflows
if ! git diff --exit-code .github/workflows > /dev/null 2>&1; then
  echo ""
  echo "ERROR: Workflow drift detected — run 'npm run gen:workflows' and commit the updated YAML."
  exit 1
fi

# 3. Tiered preflight ---------------------------------------------------------
node scripts/preflight-router.mjs || exit 1

echo "✓ pre-push checks passed"
```

The standalone `npm run lint:ci` line that used to live at `.husky/pre-push:14-15` is removed because `lint` is now a member of every tier in the router.

### 2.3 Updated `.husky/pre-commit`

Already minimal — keep typecheck only:

```sh
#!/usr/bin/env sh
# Quick pre-commit check — typecheck only (~3s).
# Heavy gates (lint, unit, integration, build, bundle) run on pre-push via
# scripts/preflight-router.mjs. Do NOT add work here — it slows every commit
# and an aborted commit loses the staged diff. Push-time is the right tier.
npm run typecheck
```

### 2.4 Outcome

| Branch type | Preflight time before | After |
|---|---|---|
| `chore/...` (no src/ touched) | ~90 s | ~5 s |
| `chore/...` (touches src/ — auto-escalated) | ~90 s | ~90 s (correct! prefix lied) |
| `fix/...` | ~90 s | ~25 s |
| `feat/...`, `refactor/...` | ~90 s | ~90 s (unchanged — needs full) |

### 2.5 Acceptance for Phase 2

- `git push` from `plans/2026-05-15-agent-tooling` runs only typecheck + lint (~5 s).
- `git push` from `feat/2026-05-15-hint-ladder` runs the full tier (~90 s).
- `git push` from `feat/hint-ladder` (no date) is rejected before any check runs.
- A `chore/...` branch that touches `src/persistence/db.ts` is auto-escalated with a stderr note explaining why.

**Effort:** 2 hr.

---

## Phase 3 — Two missing specialist subagents (concrete artifacts)

**Goal:** Cover gaps recent PRs exposed. Both subagents add VALUE by *explaining what to do* (which port to inject, which command to run), not by re-running existing automation.

### 3.1 New file: `.claude/agents/engine-determinism-auditor.md`

```markdown
---
name: engine-determinism-auditor
description: Audits diffs touching src/engine/** for direct host-global calls (Math.random, Date.now, crypto.randomUUID) and points to the correct port in src/engine/ports.ts. Use proactively whenever engine code changes.
tools: Read, Grep, Glob, Bash
---

You are the engine determinism auditor. The engine layer (`src/engine/**`) is the bottom of the dependency graph and must remain pure and deterministic so replays, property-based tests, and calibrated fixtures stay reproducible. ESLint already blocks the three forbidden host calls — your job is to translate any violation (or near-miss) into a structured advisory the author can act on without re-reading lint output.

## Forbidden host calls and the ports that replace them

The bans are encoded in `.eslintrc.json` under the `src/engine/**` override (excluding `src/engine/ports.ts`):

| Forbidden call           | ESLint message anchor                                                | Port to inject (from `src/engine/ports.ts`) | Threaded via       |
|--------------------------|----------------------------------------------------------------------|---------------------------------------------|--------------------|
| `Date.now()`             | "Engine code must consume a Clock port … breaks deterministic replay." | `Clock.now()` / `Clock.monotonic()`         | `DetectorContext.clock` |
| `crypto.randomUUID()`    | "Engine code must consume an IdGenerator port … prevents test-time fixtures." | `IdGenerator.generate()`                    | `DetectorContext.ids`   |
| `Math.random` (member)   | "Engine code must inject a seedable Rng port … breaks determinism and replay." | `Rng.random()`                              | explicit `rng` param    |

Each rule references `PLANS/forensic-deep-dive-2026-05-01.md` §1.5 / §4.2 / Phase 4.4 for context.

Prior PRs that established or applied this pattern (cite when relevant):
- **PR #16** introduced the `Rng` port + first `Math.random` removal in selection logic.
- **PR #17** introduced `Clock` and `IdGenerator` ports and threaded `DetectorContext`.
- **PR #29** converted misconception detectors to a rules-data interpreter that consumes the same context — the canonical example for new engine code.

## Process

1. Identify the diff scope: `git diff --name-only main...HEAD -- 'src/engine/**'`. If empty, report "no engine changes" and stop.
2. For every changed engine file (excluding `src/engine/ports.ts`), grep for the three forbidden patterns:
   ```bash
   git diff main...HEAD -- 'src/engine/**' | grep -nE '\b(Math\.random|Date\.now|crypto\.randomUUID)\b'
   ```
   Also scan added lines for indirect leaks: `new Date()` (use `clock.now()`), `performance.now()` (use `clock.monotonic()`), `Math.floor(Math.random()*n)` (still `Math.random`).
3. For every hit, locate the surrounding function/class and determine which port should be injected. If the function does not yet receive a `DetectorContext` or `rng` parameter, the fix is two-step (thread the dep through the call site, then consume).
4. Confirm `src/engine/ports.ts` itself is unchanged — or, if it changed, note that adapters in `src/lib/adapters/` and the composition root in `src/main.ts` must be updated in lockstep.
5. Sanity-run the engine ESLint slice locally if the environment allows: `npx eslint 'src/engine/**/*.ts' --max-warnings 0`. Surface the verbatim ESLint message alongside the structured advisory.

## Report format

```
## Engine Determinism Audit — <scope>

### Violations
- <file:line> — `<offending call>` inside `<function/class>`
  - Port to inject: <Clock|IdGenerator|Rng>  (member: clock.now / ids.generate / rng.random)
  - Threading: <already has DetectorContext> | <needs DetectorContext added to signature> | <needs explicit rng param>
  - Reference: PR #<16|17|29>

### Near-misses (advisory)
- <file:line> — `new Date()` / `performance.now()` / etc. — prefer the Clock port for symmetry.

### Verified clean
- <files scanned with no host-global calls>

### Action required
1. <minimal patch description per violation>
2. <if signature change needed> Update call sites: <list>
3. Re-run `npx eslint 'src/engine/**/*.ts' --max-warnings 0` to confirm.
```

Read and report only — never edit the engine files. If the diff has no engine changes, say so plainly in one line.
```

### 3.2 New file: `.claude/agents/curriculum-byte-parity.md`

```markdown
---
name: curriculum-byte-parity
description: Confirms public/curriculum/v1.json and src/curriculum/bundle.json are byte-identical (sha256 match). Use whenever a diff touches either curriculum bundle file or pipeline output.
tools: Read, Bash, Grep
---

You are the curriculum byte-parity auditor. The runtime fetches `public/curriculum/v1.json`; the static-import fallback uses `src/curriculum/bundle.json`. They MUST be byte-identical, and the only sanctioned writer is `npm run build:curriculum` (which is also wired as `prebuild` in `package.json`). Hand-edits silently desync the two bundles and produce loader behavior that depends on which path Vite resolves first.

References:
- Root `CLAUDE.md` → "Architecture" → curriculum dual-file rule.
- `.claude/learnings.md` 2026-04-30 setup entry: *"Curriculum lives in TWO files … They MUST be byte-identical — only `npm run build:curriculum` writes them."*

## Process

1. Identify the trigger: `git diff --name-only main...HEAD | grep -E '^(public/curriculum/v1\.json|src/curriculum/bundle\.json|pipeline/output/)'`. If empty, report "no curriculum changes" and stop.
2. Compute and compare hashes on the working tree:
   ```bash
   PUB=$(sha256sum public/curriculum/v1.json | awk '{print $1}')
   SRC=$(sha256sum src/curriculum/bundle.json | awk '{print $1}')
   echo "public: $PUB"
   echo "src:    $SRC"
   [ "$PUB" = "$SRC" ] && echo "MATCH" || echo "DRIFT"
   ```
3. If `DRIFT`: also compare sizes (`wc -c`) and the top-level keys (`jq -r 'keys[]' <file> | sort | diff …`) so the report names what diverged (whole-file vs. key-set vs. tail-bytes).
4. If `DRIFT`: confirm whether either side was hand-edited by checking the diff for both files. A diff on only one of the two is the typical fingerprint.
5. Run `npm run validate:curriculum` to confirm the schema is at least intact on both copies (catches the case where an editor saved a half-broken JSON).

## Report format

```
## Curriculum Byte-Parity Audit

### Hashes
- public/curriculum/v1.json:   <sha256>  (<bytes> B)
- src/curriculum/bundle.json:  <sha256>  (<bytes> B)
- Result: MATCH | DRIFT

### Schema validation
- npm run validate:curriculum: PASS | FAIL — <error>

### Diff fingerprint (only if DRIFT)
- Files changed in PR: <one-of-two | both>
- Top-level keys diverging: <list, or "identical key-set; payload differs">

### Action required (only if DRIFT)
- DO NOT hand-edit either file. Run:
    npm run build:curriculum
  This is the only sanctioned writer (also runs as `prebuild`). It regenerates BOTH files from `pipeline/output/`.
- After regeneration, re-run this auditor to confirm MATCH.
- Per root CLAUDE.md curriculum dual-file rule and `.claude/learnings.md` 2026-04-30.
```

Read and report only — never write either curriculum file directly. The single allowed remediation is the documented npm script.
```

### 3.3 CLAUDE.md trigger-table replacement

Replace the current "Specialist subagents" section in root `CLAUDE.md` with:

```markdown
## Specialist subagents (in `.claude/agents/`)

Delegate to these via the Agent tool when scope warrants. Auto-fire triggers (Phase 4 wires CI to match):

| Subagent                       | Auto-fires when…                                                              |
|--------------------------------|-------------------------------------------------------------------------------|
| `c1-c10-auditor`               | persistence, network, dependency, or new top-level UI changes                |
| `bundle-watcher`               | `package.json` / `package-lock.json` change; large feature merge             |
| `validator-parity-checker`     | any `src/validators/*.ts` change                                             |
| `a11y-auditor`                 | new interactive component or scene-level UI addition                         |
| `engine-determinism-auditor`   | any `src/engine/**` change (excluding `src/engine/ports.ts`)                 |
| `curriculum-byte-parity`       | `public/curriculum/v1.json` or `src/curriculum/bundle.json` (or pipeline output) changes |
```

### 3.4 Acceptance for Phase 3

- Both new subagent files exist at `.claude/agents/engine-determinism-auditor.md` and `.claude/agents/curriculum-byte-parity.md`.
- `node scripts/agent-doctor.mjs` exits 0 (frontmatter validates).
- A test PR introducing `Math.random()` in `src/engine/router.ts` produces an `engine-determinism-auditor` finding citing the file and line.
- Root CLAUDE.md "Specialist subagents" table lists all 6 agents with trigger conditions.

**Effort:** 3 hr.

---

## Phase 4 — Refine existing `subagent-pr-audit.yml` (concrete patches)

**Goal:** Drift caught even when no Claude session is open. The workflow already exists; this phase wires the two new Phase 3 subagents and consolidates per-agent comment spam.

### 4.1 Diagnosis of current state

The current workflow (`.github/workflows/subagent-pr-audit.yml`, 347 lines) triggers on `pull_request: [opened, synchronize, reopened]` with a per-PR concurrency group that cancels in-progress runs (lines 11–13 — idempotent on `synchronize`).

Job 1 `get-changed-files` (lines 19–82) calls `pulls.listFiles` (capped at 100 files) and uses an inline `match()` helper to compute four boolean outputs: `validators_changed` (`src/validators/**`), `interactions_changed` (`src/components/**`, `src/scenes/interactions/**`, top-level `src/scenes/*Scene.ts`), `bundle_changed` (`package.json` / `package-lock.json`), and `any_src_changed`.

Jobs 2–5 (lines 87–346) each call the reusable `./.github/workflows/_shared/agent-dispatch.yml` with `timeout_minutes: 15` (no per-subagent token cap) and post one comment per subagent via `./.github/actions/pr-comment-update` keyed on a per-agent `comment-tag` (`c1-c10-audit`, `a11y-audit`, `bundle-audit`, `validator-parity-audit`).

### 4.2 Gaps relative to Phase 3

- **No `engine_changed` filter.** New `engine-determinism-auditor` has no trigger.
- **No `curriculum_changed` filter.** New `curriculum-byte-parity` has no trigger.
- **One PR comment per subagent.** Phase 3 brings the count to six separate threaded comments; needs consolidation into a single `subagent-audit-summary` upserted comment.
- **No per-subagent token budget.** Reusable dispatcher gets `timeout_minutes: 15` only; one runaway agent could drain monthly key budget.
- **Idempotency on `synchronize` is OK** (concurrency cancels in-flight; comment action upserts by tag).

### 4.3 Patch A — extend Job 1 path filters

```yaml
   get-changed-files:
     runs-on: ubuntu-latest
     outputs:
       validators_changed:    ${{ steps.check.outputs.validators_changed }}
       interactions_changed:  ${{ steps.check.outputs.interactions_changed }}
       bundle_changed:        ${{ steps.check.outputs.bundle_changed }}
+      engine_changed:        ${{ steps.check.outputs.engine_changed }}
+      curriculum_changed:    ${{ steps.check.outputs.curriculum_changed }}
       any_src_changed:       ${{ steps.check.outputs.any_src_changed }}
       changed_files_list:    ${{ steps.check.outputs.changed_files_list }}
       diff_summary:          ${{ steps.check.outputs.diff_summary }}
```

Inside the `script:` block, after `bundle_changed`:

```yaml
+            // Engine determinism — exclude the ports file itself, which is the boundary that may legally hold host calls.
+            const engine_changed = paths.some(
+              p => p.startsWith('src/engine/') && p !== 'src/engine/ports.ts'
+            );
+
+            // Curriculum byte-parity — both bundle paths plus pipeline output (a pipeline-only change still requires `npm run build:curriculum`).
+            const curriculum_changed =
+              paths.includes('public/curriculum/v1.json') ||
+              paths.includes('src/curriculum/bundle.json') ||
+              paths.some(p => p.startsWith('pipeline/output/'));
+
             const any_src_changed = paths.some(
```

And at the bottom:

```yaml
             core.setOutput('bundle_changed',       String(bundle_changed));
+            core.setOutput('engine_changed',       String(engine_changed));
+            core.setOutput('curriculum_changed',   String(curriculum_changed));
             core.setOutput('any_src_changed',      String(any_src_changed));
```

### 4.4 Patch B — Job 6 (engine-determinism-auditor)

```yaml
+  audit-engine-determinism:
+    needs: get-changed-files
+    if: needs.get-changed-files.outputs.engine_changed == 'true'
+    continue-on-error: true
+    uses: ./.github/workflows/_shared/agent-dispatch.yml
+    with:
+      prompt_template: subagent-audit
+      context_json: >-
+        {
+          "SUBAGENT_NAME": "engine-determinism-auditor",
+          "CHANGED_FILES": "${{ needs.get-changed-files.outputs.changed_files_list }}",
+          "PR_NUMBER": "${{ github.event.pull_request.number }}",
+          "DIFF_SUMMARY": "${{ needs.get-changed-files.outputs.diff_summary }}"
+        }
+      working_branch: ${{ github.event.pull_request.head.ref }}
+      pr_number: ${{ github.event.pull_request.number }}
+      timeout_minutes: 10
+      max_tokens: 8000
+    secrets:
+      ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
+      GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

### 4.5 Patch C — Job 7 (curriculum-byte-parity)

```yaml
+  audit-curriculum-parity:
+    needs: get-changed-files
+    if: needs.get-changed-files.outputs.curriculum_changed == 'true'
+    continue-on-error: true
+    uses: ./.github/workflows/_shared/agent-dispatch.yml
+    with:
+      prompt_template: subagent-audit
+      context_json: >-
+        {
+          "SUBAGENT_NAME": "curriculum-byte-parity",
+          "CHANGED_FILES": "${{ needs.get-changed-files.outputs.changed_files_list }}",
+          "PR_NUMBER": "${{ github.event.pull_request.number }}",
+          "DIFF_SUMMARY": "${{ needs.get-changed-files.outputs.diff_summary }}"
+        }
+      working_branch: ${{ github.event.pull_request.head.ref }}
+      pr_number: ${{ github.event.pull_request.number }}
+      timeout_minutes: 5
+      max_tokens: 6000
+    secrets:
+      ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
+      GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

> **Prerequisite for Patches B & C:** `max_tokens` must be added as an optional input to `_shared/agent-dispatch.yml` (default e.g. `15000`) and threaded into the Anthropic call. Apply the same input to the existing four dispatcher invocations to retire the unbudgeted state across the board.

### 4.6 Patch D — Consolidate per-agent comments into one

Replace the six `post-*-comment` jobs with one aggregator that runs `if: always()` after every `audit-*` job, collects each `outputs.summary`, and upserts a single comment under tag `subagent-audit-summary`. Strip comment steps from per-agent jobs; the aggregator is the only writer.

```yaml
+  post-consolidated-comment:
+    needs:
+      - get-changed-files
+      - audit-c1-c10
+      - audit-a11y
+      - audit-bundle
+      - audit-validator-parity
+      - audit-engine-determinism
+      - audit-curriculum-parity
+    if: always() && needs.get-changed-files.outputs.any_src_changed == 'true'
+    runs-on: ubuntu-latest
+    continue-on-error: true
+    steps:
+      - uses: actions/checkout@v4
+      - name: Upsert consolidated PR comment
+        uses: ./.github/actions/pr-comment-update
+        with:
+          comment-tag: subagent-audit-summary
+          pr-number: ${{ github.event.pull_request.number }}
+          github-token: ${{ secrets.GITHUB_TOKEN }}
+          content: |
+            ## Subagent Audit Summary
+
+            ${{ needs.get-changed-files.outputs.diff_summary }}
+
+            <details><summary>C1–C10 Constraint Audit</summary>
+
+            ${{ needs.audit-c1-c10.result == 'skipped' && '_skipped (no relevant changes)_' || needs.audit-c1-c10.outputs.summary || '_auditor errored — manual review recommended_' }}
+            </details>
+
+            <details><summary>Engine Determinism Audit</summary>
+
+            ${{ needs.audit-engine-determinism.result == 'skipped' && '_skipped (no engine changes)_' || needs.audit-engine-determinism.outputs.summary || '_auditor errored — run `npx eslint src/engine/**/*.ts` locally_' }}
+            </details>
+
+            <details><summary>Curriculum Byte-Parity Audit</summary>
+
+            ${{ needs.audit-curriculum-parity.result == 'skipped' && '_skipped (no curriculum changes)_' || needs.audit-curriculum-parity.outputs.summary || '_auditor errored — run `sha256sum public/curriculum/v1.json src/curriculum/bundle.json` locally_' }}
+            </details>
+
+            *Consolidated by [subagent-pr-audit](/.github/workflows/subagent-pr-audit.yml). Re-runs on every push to this PR; this comment is upserted, not duplicated.*
```

(Full version includes `<details>` blocks for a11y, bundle, validator-parity too — same pattern.)

### 4.7 Acceptance for Phase 4

- `subagent-pr-audit.yml` has `engine_changed` and `curriculum_changed` outputs from Job 1.
- A test PR introducing `Math.random()` in `src/engine/router.ts` produces a single bot comment (not six) within 2 min.
- A `synchronize` event overwrites the comment in place — `gh api repos/.../issues/<n>/comments` returns one bot comment.
- `_shared/agent-dispatch.yml` accepts `max_tokens` input; all six dispatcher invocations pass an explicit budget.

**Effort:** 4–6 hr.

---

## Phase 5 — Auto-close PR runbook (root cause confirmed)

**Goal:** Stop the auto-close at its source. Recovery becomes one command in the rare cases where the patch can't be applied first.

### 5.1 Investigation findings — confirmed root cause

**Culprit: `.github/workflows/dependabot-auto-merge.yml`** — specifically the "Handle pinned packages and determine bump type" step at lines 21–52.

**The bug:**
- Trigger: `pull_request_target: [opened, synchronize]` (line 4–5) — fires on **every** PR, not just Dependabot PRs.
- Step 1 "Author guard" (line 17–19): `if: github.actor != 'dependabot[bot]'` then `run: exit 0`. **This exits the step, not the job.** Subsequent steps run for every PR author including humans. **This is the load-bearing bug.**
- Step 2 "Handle pinned packages" (lines 32–52): does a substring match of the **PR title (lowercased)** against `['phaser', 'dexie', 'vite']`. On a hit, posts a "Closing without merge" comment and calls `github.rest.pulls.update({ state: 'closed' })`. No author check inside this script — relies entirely on Step 1 having stopped the job, which it doesn't.

**Why PR #24 was closed:** title was `refactor(persistence): wrap attempt+mastery in single Dexie transaction` (verified via merged commit `c183b80`). Lowercased contains `dexie` → match → auto-closed within seconds. The closer appears as `github-actions[bot]`, not Copilot.

**Why PR #21 was likely closed by the same path:** branch `refactor/2026-05-01-c5-streak-onboarding` was a localStorage→Dexie migration; its PR title or auto-merge-into-main commits very likely contained "Dexie." The existing learning at `.claude/learnings.md:21` confirms PR #13 (a Dexie v6→v7 schema change) hit the same pattern.

**Copilot reviewer is a red herring.** `requested_reviewers: [Copilot]` is set on PR creation but Copilot the reviewer service does not have permission to close PRs. The `closed_by` field on the API is `github-actions[bot]` from this workflow.

`grep -n "state.*closed\|gh pr close\|pulls.update"` over all workflows returns **only** `dependabot-auto-merge.yml:44` and `:48`. There is exactly one auto-close path in the repo.

### 5.2 Mitigation 1 — Root-cause patch (apply this first)

Convert the broken step-level guard into a job-level one:

```yaml
 jobs:
   auto-merge:
     runs-on: ubuntu-latest
+    # Job-level guard: skip entirely for non-dependabot PRs.
+    # Fixes the auto-close-on-substring bug where a step-level `exit 0`
+    # only stopped the author-guard step, letting the pin-check step
+    # close any human PR whose title contained "phaser"/"dexie"/"vite".
+    if: github.actor == 'dependabot[bot]'
     env:
       GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
     steps:
-      - name: Author guard — only run for dependabot
-        if: github.actor != 'dependabot[bot]'
-        run: exit 0
-
       - name: Handle pinned packages and determine bump type
         uses: actions/github-script@v7
```

**Defense-in-depth** (recommended in the same PR): inside the github-script at line 26, add a second guard:

```javascript
const author = context.payload.pull_request.user.login;
if (author !== 'dependabot[bot]') {
  core.notice(`PR #${prNumber} author is ${author}, not dependabot. Skipping pin check.`);
  return;
}
```

**Note:** this workflow is generated by `npm run gen:workflows`. Patch the **template/source** (search for the YAML's `name: R5 — Dependabot auto-merge` string), then run `npm run gen:workflows` and commit both source and generated YAML, otherwise the consistency gate fails.

### 5.3 Mitigation 2 — Recovery runbook (for incidents before/during the patch)

When a PR auto-closes within ~30 s of opening:

1. Check the closing comment. If it says "This package is pinned per C4 constraint" you've hit the substring guard. Confirm via `gh pr view <N> --json title,closedAt,comments` — look for the bot comment and `closedAt - createdAt < 1 min`.
2. Locally rebase/merge the head branch onto current main: `git fetch origin && git checkout <branch> && git merge origin/main` (resolve any conflicts), then push.
3. Open a new PR with a **title that does not contain `phaser`, `dexie`, or `vite` as a substring** (case-insensitive). Examples: "Dexie transaction" → "DB transaction", "vite config" → "build config." Workaround until the patch lands.
4. Copy the original PR's body verbatim into the new PR, prefixed with `(re-open of #<N> — auto-closed by dependabot-auto-merge title-substring guard)`.
5. Verify the new PR has `closedAt: null` after 60 s; once green, proceed with normal review/merge.

### 5.4 Mitigation 3 — `/recreate-pr` slash command

Drop in at `.claude/commands/recreate-pr.md`:

````markdown
---
description: Re-open an auto-closed PR with a merged-with-main head and rephrased title.
---

# /recreate-pr <pr-number>

Recovers from the dependabot-auto-merge title-substring auto-close (see `.claude/learnings.md` 2026-05-01 github). Opens a fresh PR off the same head ref with the original body and a safe title.

## Steps

1. **Fetch the closed PR's metadata** via the GitHub MCP:
   ```
   mcp__github__pull_request_read pullNumber=<N> owner=<owner> repo=<repo>
   ```
   Capture `title`, `body`, `head.ref`, `base.ref`, `closed_by.login`, `created_at`, `closed_at`.

2. **Sanity check** that this is a same-cause auto-close:
   - `closed_at - created_at < 120 s`
   - `closed_by.login == "github-actions[bot]"` OR a comment from `github-actions[bot]` containing "pinned per C4"
   - PR title (lowercased) contains `phaser`, `dexie`, or `vite`
   If any fails, **stop and ask the user** — do not blindly recreate.

3. **Merge origin/main into the head ref locally**:
   ```bash
   git fetch origin
   git checkout <head.ref>
   git merge --no-edit origin/<base.ref>
   git push origin <head.ref>
   ```
   If conflicts arise, surface them to the user and stop.

4. **Compute a safe title.** Replace each pinned-package substring (case-insensitive):
   - `dexie` → `IndexedDB` or `DB`
   - `phaser` → `scene engine` or `runtime`
   - `vite` → `build`
   Keep the conventional-commit prefix intact; only rewrite words inside the description.

5. **Open the new PR** via:
   ```
   mcp__github__create_pull_request \
     title="<safe_title>" \
     head=<head.ref> \
     base=<base.ref> \
     body="(re-open of #<N> — auto-closed by dependabot-auto-merge title-substring guard. Original title: <original_title>)\n\n<original_body>"
   ```

6. **Verify and report.** Wait 60 s, then `mcp__github__pull_request_read` the new PR and confirm `state == "open"` and `closed_at == null`. Print the new PR URL plus a one-line note: `"Re-opened #<N> as #<M>. Apply Phase 5 root-cause patch to stop this recurring."`

## Refuse if

- Original PR was closed by a human (not `github-actions[bot]`).
- The closing comment doesn't mention C4 / pinned packages.
- Title doesn't contain any trigger substring — the cause is something else.
````

### 5.5 Mitigation 4 — `learnings.md` entry

Insert at top of entries (under the marker at `.claude/learnings.md:19`):

```
2026-05-01 github-pr: PRs auto-close in <30 s when title contains substrings `phaser`/`dexie`/`vite` — `.github/workflows/dependabot-auto-merge.yml` author guard at lines 17-19 uses `run: exit 0` which exits the step, not the job, so the pin-check step (32-52) runs for every author. Fix: lift guard to job-level `if: github.actor == 'dependabot[bot]'`. Use `/recreate-pr <N>` to recover.
```

### 5.6 Acceptance for Phase 5

- `dependabot-auto-merge.yml` has a job-level `if: github.actor == 'dependabot[bot]'`.
- A test PR titled `chore: test dexie poke (delete me)` from a human account remains open (the workflow run shows as skipped, not run-then-no-op).
- `/recreate-pr` slash command exists at `.claude/commands/recreate-pr.md`.
- learnings.md entry lands at the top of the entries list.

### 5.7 Verification spike (before patching)

Open a controlled test PR titled `test: dexie poke (delete me)` from a non-dependabot account, **before** applying the patch, while running `gh run watch --exit-status` against `R5 — Dependabot auto-merge` and `gh pr view --json closedAt,comments` in a 5-second polling loop. The expected observation is the workflow run completes successfully (not skipped), the PR closes within ~20 s, and the closing comment matches `"This package is pinned per C4 constraint"`. That confirms the diagnosis with a single observable run.

**Effort:** 90 min (30 min for the patch, 30 min for the slash command, 30 min for verification spike + learnings).

---

## Phase 6 — `learnings.md` discipline (concrete artifacts)

**Goal:** Make the learnings log actually accumulate context, not just exist. 5 entries since 2026-04-30 — most recurring gotchas from the 2026-05-01 sessions are still unrecorded.

### 6.1 `SessionStart` hook patch — print 3 most-recent learnings inline

Drop-in replacement for the `SessionStart` hook in `.claude/settings.json`. The new tail (`grep -E ... | head -3`) costs <200 tokens at session open and surfaces gotchas the user would otherwise rediscover.

Updated `command` value (paste-ready, JSON-escaped):

```
BRANCH=$(git branch --show-current 2>/dev/null || echo 'detached'); DIRTY=$(git status --porcelain 2>/dev/null | wc -l | tr -d ' '); echo \"┌─ Questerix Fractions\"; echo \"├─ branch: $BRANCH  |  dirty: $DIRTY files\"; echo \"├─ Read CLAUDE.md first; nested CLAUDE.md auto-loads in src/scenes/interactions, src/validators, src/persistence, src/engine, src/components, src/lib, tests, pipeline\"; echo \"├─ Slash: /learn /retro /sprint-status /c5-check /decision /recreate-pr\"; echo \"├─ Subagents: c1-c10-auditor bundle-watcher validator-parity-checker a11y-auditor engine-determinism-auditor curriculum-byte-parity\"; echo \"├─ Active sprint: PLANS/master-plan-2026-04-26.md\"; echo \"├─ Recent learnings (3 newest):\"; grep -E '^[0-9]{4}-[0-9]{2}-[0-9]{2} ' .claude/learnings.md 2>/dev/null | head -3 | sed 's/^/│   • /'; echo \"└─ /learn <text> appends a new one\"
```

### 6.2 `PostToolUse(Bash)` — nudge on bug-fix commits

Add a stanza to the existing `PostToolUse(Bash)` hook in `.claude/settings.json`:

```json
{
  "matcher": "Bash",
  "hooks": [
    {
      "type": "command",
      "command": "CMD=$(jq -r '.tool_input.command // empty'); case \"$CMD\" in *'git commit'*) MSG=$(git log -1 --pretty=%B 2>/dev/null); if echo \"$MSG\" | grep -qE '(^|[^a-z])fix\\(|\\bbug\\b'; then echo '▶ Bug fix committed — consider /learn to capture the gotcha.' >&2; fi ;; esac; exit 0"
    }
  ]
}
```

The regex `(^|[^a-z])fix\(|\bbug\b` matches `fix(scope):` Conventional-Commit prefixes and the word `bug` as a token, while ignoring substrings like `prefix(` or `bugfix-runtime`. Always `exit 0` so a missed nudge never blocks a commit.

### 6.3 `/retro` enhancement — propose a candidate learnings.md entry every time

Replace `.claude/commands/retro.md` with the version below. The single behavioural change: the `### .claude/learnings.md` section is **mandatory** — agent must propose at least one candidate or write `*(no candidate this session — confirm none qualify)*`.

```markdown
---
description: End-of-session retro — propose CLAUDE.md / learnings.md / PLANS updates based on what changed
---

Review what happened in this session and propose targeted documentation updates. **Do not edit any docs in this command** — only propose. The user decides what to apply.

## Steps

1. Run in parallel:
   - `git diff --stat $(git merge-base HEAD origin/main 2>/dev/null || git log --oneline -20 | tail -1 | awk '{print $1}')..HEAD`
   - `git log --oneline -10`
   - `head -30 .claude/learnings.md`

2. Cross-reference what changed against:
   - **`CLAUDE.md`** (root + nested) — does any architectural rule or pattern in the diff belong here?
   - **`.claude/learnings.md`** — what non-obvious gotcha surfaced? **You must propose at least one candidate entry.** If nothing qualifies, say so explicitly with reasoning — do not omit the section.
   - **`PLANS/master-plan-2026-04-26.md`** — were any active blockers resolved?
   - **`CHANGELOG.md`** `[Unreleased]` — any user-visible change missing?
   - **`docs/00-foundation/decision-log.md`** — was a new architectural decision made? Needs a `D-NN` entry?

3. Output a structured proposal in this exact shape. The `### .claude/learnings.md` section is **required** — never omit it.

\`\`\`
## Retro proposal

### CLAUDE.md / nested CLAUDE.md
- [path:section] proposed change — one-line reason

### .claude/learnings.md   (REQUIRED — propose ≥1 candidate or explain why none qualify)
- YYYY-MM-DD <area>: <one-line gotcha> [#commit-or-branch]
  rationale: cost N min of debugging / contradicted CLAUDE.md / hidden invariant

### PLANS/master-plan-2026-04-26.md
- ✅ mark <bug-id> done — reason

### CHANGELOG.md [Unreleased]
- "Added/Changed/Fixed: <line>"

### docs/00-foundation/decision-log.md
- proposed D-NN entry — title only
\`\`\`

Skip any section other than `### .claude/learnings.md` that has nothing. Be concise — propose only updates that materially improve future agent context.

4. End with: "Apply any of these? Reply with the section names to apply (e.g. 'CLAUDE.md and learnings')."
```

### 6.4 Five learnings to seed immediately

Paste under the `<!-- Append new lines below this marker. -->` marker in `.claude/learnings.md`:

```
2026-05-01 github-pr: PRs auto-close in <30 s when title contains substrings `phaser`/`dexie`/`vite` — `.github/workflows/dependabot-auto-merge.yml` author guard at lines 17-19 uses `run: exit 0` which exits the step, not the job, so the pin-check step (32-52) runs for every author. Fix: lift guard to job-level `if: github.actor == 'dependabot[bot]'`. Use `/recreate-pr <N>` to recover.
2026-05-01 github-api: GitHub `mergeable_state` lies briefly after a base-branch update — calling `merge_pull_request` within ~30 s of another merge can return `unknown` then 405 even when local `git merge` is clean. Workaround: push the merge commit to the PR branch and retry the MCP merge.
2026-05-01 decision-log: D-NN renumbering is a recurring merge-conflict surface (PR #10 collided on D-25/D-26 because two branches added decisions in parallel). Until a numbering helper exists, treat D-NN slots as write-locked: rebase before adding, and bump the number on conflict rather than re-using.
2026-05-01 mcp: The `github` MCP server token can expire mid-session with no warning — symptom is opaque 401s on read calls that worked minutes earlier. Fix: re-auth the MCP server; do not retry the same call in a loop.
2026-05-01 god-files: New scenes must be created via `npm run scaffold:scene <name>` which generates Scene + Controller + State as separate files. Direct creation of monolithic *Scene.ts files is blocked by the LOC-budget hook (Phase 1.4). Pre-existing god files (`Level01Scene.ts`, `LevelScene.ts`) are frozen — only net-LOC-negative edits accepted until D-27 sunset lands.
```

### 6.5 Acceptance for Phase 6

- `SessionStart` banner prints exactly 3 learnings lines under "Recent learnings".
- A commit with message `fix(persistence): correct schema version bump` produces the stderr nudge.
- `.claude/commands/retro.md` has the `(REQUIRED — propose ≥1 candidate)` annotation.
- Five seed entries are in `.claude/learnings.md` at the top.

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
