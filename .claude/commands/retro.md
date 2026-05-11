---
description: End-of-session retro — apply CLAUDE.md / learnings.md / PLANS updates based on what changed
---

Review what happened in this session and apply targeted documentation updates. **Apply all warranted changes autonomously** — do not just propose.

## Steps

1. Run in parallel:
   - `git diff --stat $(git merge-base HEAD origin/main 2>/dev/null || git log --oneline -20 | tail -1 | awk '{print $1}')..HEAD`
   - `git log --oneline -10`
   - `head -30 .claude/learnings.md`

2. Cross-reference what changed against each destination:
   - **`CLAUDE.md`** (root + nested) — does any architectural rule or pattern in the diff belong here?
   - **`.claude/learnings.md`** — what non-obvious gotcha surfaced? **At least one entry is required.** If nothing qualifies, explain why.
   - **`PLANS/PLAN.md`** — were any active blockers resolved? Mark them done.
   - **`CHANGELOG.md`** `[Unreleased]` — any user-visible change missing?
   - **`docs/00-foundation/decision-log.md`** — was a new architectural decision made? Needs a `D-NN` entry?

3. **Apply changes directly.** For each destination:
   - **`.claude/learnings.md`**: prepend new entries after the marker comment.
   - **`CLAUDE.md` / nested CLAUDE.mds**: edit the relevant section in-place.
   - **`PLANS/PLAN.md`**: mark resolved items done.
   - **`CHANGELOG.md`**: append under `[Unreleased]`.
   - **`docs/00-foundation/decision-log.md`**: append new `D-NN` entry if warranted.

4. Run `npm run sync:claude-md` after any CLAUDE.md edit.

5. Output a brief summary in this shape:

```
## Retro applied

### .claude/learnings.md
- <date> <area>: <entry text>
  (or: "Nothing qualified — <reason>")

### CLAUDE.md / nested
- [path:section] <what changed>  (or: "No changes")

### PLANS/PLAN.md
- ✅ <id> marked done  (or: "No changes")

### CHANGELOG.md
- "Added/Changed/Fixed: <line>"  (or: "No changes")

### decision-log.md
- D-NN — <title>  (or: "No new decision")
```

Skip sections with nothing to apply. Be concise — apply only updates that materially improve future agent context.
