---
description: End-of-session retro — propose CLAUDE.md / learnings.md / PLANS updates based on what changed
---

Review what happened in this session and propose targeted documentation updates. **Do not edit any docs in this command** — only propose. The user decides what to apply.

## Steps

1. Run in parallel:
   - `git diff --stat $(git merge-base HEAD origin/main 2>/dev/null || git log --oneline -20 | tail -1 | awk '{print $1}')..HEAD`
   - `git log --oneline -10`
   - `cat .claude/learnings.md | tail -20`

2. Cross-reference what changed against:
   - **`CLAUDE.md`** (root + nested under `src/scenes/interactions`, `src/validators`, `src/persistence`, `src/engine`, `pipeline`) — does any architectural rule or pattern in the diff belong in one of these files?
   - **`.claude/learnings.md`** — was there a non-obvious gotcha that future agents would benefit from?
   - **`PLANS/master-plan-2026-04-26.md`** — were any active blockers (BUG-01, BUG-02, BUG-04, G-C7, G-E1) resolved? Do they need to be marked done?
   - **`CHANGELOG.md`** `[Unreleased]` — any user-visible change missing?
   - **`docs/00-foundation/decision-log.md`** — was a new architectural decision made? Needs a `D-NN` entry?

3. Output a structured proposal in this exact shape:

```
## Retro proposal

### CLAUDE.md / nested CLAUDE.md
- [path:section] proposed change — one-line reason

### .claude/learnings.md
- new entry text — one-line reason

### PLANS/master-plan-2026-04-26.md
- ✅ mark <bug-id> done — reason

### CHANGELOG.md [Unreleased]
- "Added/Changed/Fixed: <line>"

### docs/00-foundation/decision-log.md
- proposed D-NN entry — title only
```

Skip any section that has nothing. Be concise — propose only updates that materially improve future agent context.

4. End with: "Apply any of these? Reply with the section names to apply (e.g. 'CLAUDE.md and learnings')."
