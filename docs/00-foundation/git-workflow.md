# Git Workflow

Applies to all contributors and all agents. Follow this every time you create a branch or open a PR.

---

## Branch naming

**Required format:** `<type>/YYYY-MM-DD-<slug>`

| Type | When to use |
|------|-------------|
| `feat` | New user-facing behaviour |
| `fix` | Bug fix |
| `refactor` | Code restructure with no behaviour change |
| `plans` | Plan / doc / checkpoint updates only — no src changes |
| `chore` | Tooling, CI, deps, infra |

**Examples:**
```
feat/2026-04-30-hint-ladder-tier3
fix/2026-04-30-partition-nan-guard
plans/2026-04-30-sprint-2-checkpoint
chore/2026-04-30-drop-nanoid
```

**Rules:**
- Date is the day the branch is created, not the day it is merged.
- Slug is lowercase, hyphen-separated, ≤ 40 characters.
- No random suffixes (e.g. `-Z5xQz`), no bare slugs without a date.
- A branch that violates the format must be renamed before the first push to origin.

---

## Branch lifetime

- Keep branches short-lived — open a PR within the same session when possible.
- Rebase onto `main` before opening a PR. Never let a branch accumulate stale drift.
- One concern per branch. Do not mix feature work with plan-doc updates.

---

## PR checklist (every PR)

Before pushing and opening a PR:

```bash
npm run typecheck       # must be clean
npm run lint            # 0 warnings
npm run test:unit       # all green
npm run build           # succeeds
```

PR title format: `<type>(<scope>): <imperative summary>` — e.g. `fix(validators): guard NaN inputs in partition`.

---

## Merge strategy

- Squash-merge plan/chore branches to keep `main` history readable.
- Merge-commit (no squash) feature and fix branches so individual commits are traceable.

---

## Stale branch policy

- Any branch older than **14 days** with no PR is considered abandoned.
- Review it: either open a PR or delete it.
- Agents must not reuse or reopen stale branches — create a fresh dated branch instead.

---

## Why dates in branch names?

Without dates, branches accumulate silently. A branch named `claude/add-tts-narration-Z5xQz` gives no signal about when it was created or whether it is still relevant. A date makes staleness visible at a glance and forces a decision — merge it or drop it — before the next sprint.
