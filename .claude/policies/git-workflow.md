---
title: Git Workflow Policy (Agent-Facing)
applies_to: [all-agents]
---

# Git Workflow — Agent Rules

## Branch name

Format: `<type>/YYYY-MM-DD-<slug>` (today's date, not merge date).

Types: `feat` `fix` `refactor` `plans` `chore` `docs` `test`

Exempt from the format: `main`, `claude/*`, `worktree-agent-*`.

```
feat/2026-05-02-hint-tier3
fix/2026-05-02-nan-guard
plans/2026-05-02-sprint-2-checkpoint
```

Violation is caught by `.husky/pre-push` locally and `ci.yml` branch-compliance step remotely.

## One concern per branch

Never mix `src/` changes with `PLANS/` or `docs/` changes on the same branch.

## Pre-push checklist

```bash
npm run typecheck   # must be clean
npm run lint        # 0 warnings
npm run test:unit   # all green
npm run build       # succeeds
```

If any check fails, fix it before pushing. Never use `--no-verify` without justification.

## Commit message format

`<type>(<scope>): <imperative summary>`

Examples:
- `fix(validators): guard NaN inputs in partition`
- `feat(hints): add worked-example tier`
- `chore(ci): pin E2E to chromium project`

## PR and merge

After local checks pass:
1. `git push -u origin <branch>`
2. Create PR with `mcp__github__create_pull_request` — body: Summary + Test plan.
3. Squash-merge with `mcp__github__merge_pull_request` (merge_method: "squash").

Skip step 2–3 only if: head is `main`, diff touches `.env*` or CI infra, or force-push is involved — always confirm with the user in those cases.

## Stale branch policy

Branches older than 14 days with no open PR are abandoned. Create a fresh dated branch rather than reopening stale ones.

## Full reference

`docs/00-foundation/git-workflow.md`
