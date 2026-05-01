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
   - **`PLANS/PLAN.md`** — were any active blockers resolved?
   - **`CHANGELOG.md`** `[Unreleased]` — any user-visible change missing?
   - **`docs/00-foundation/decision-log.md`** — was a new architectural decision made? Needs a `D-NN` entry?

3. Output a structured proposal in this exact shape. The `### .claude/learnings.md` section is **required** — never omit it.

```
## Retro proposal

### CLAUDE.md / nested CLAUDE.md
- [path:section] proposed change — one-line reason

### .claude/learnings.md   (REQUIRED — propose ≥1 candidate or explain why none qualify)
- YYYY-MM-DD <area>: <one-line gotcha> [#commit-or-branch]
  rationale: cost N min of debugging / contradicted CLAUDE.md / hidden invariant

### PLANS/PLAN.md
- ✅ mark <bug-id> done — reason

### CHANGELOG.md [Unreleased]
- "Added/Changed/Fixed: <line>"

### docs/00-foundation/decision-log.md
- proposed D-NN entry — title only
```

Skip any section other than `### .claude/learnings.md` that has nothing. Be concise — propose only updates that materially improve future agent context.

4. End with: "Apply any of these? Reply with the section names to apply (e.g. 'CLAUDE.md and learnings')."
