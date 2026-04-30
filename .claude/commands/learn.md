---
description: Append a one-line gotcha or pattern to .claude/learnings.md
argument-hint: <area>: <text>
---

Capture a non-obvious lesson while it's fresh. The user passes the substance; you handle date + branch tagging and append after the marker line in `.claude/learnings.md`.

Insert exactly one line after the comment marker `<!-- Append new lines below this marker. /learn handles the date prefix. -->`, in this format:

```
YYYY-MM-DD <text> [#<short-branch-or-commit>]
```

Use today's date (`date +%F`) and the current branch (`git branch --show-current`). Trim the branch prefix if it's a long claude-generated name (`claude/`, `agent/`).

If `$ARGUMENTS` is empty, ask the user what to capture.

If the proposed line is longer than three lines wrapped, push back: it probably belongs in `CLAUDE.md` (architectural) or a nested `CLAUDE.md` (subtree-specific) instead. Suggest the right home and don't append.

After appending, show the new entry and confirm in one line. Don't commit — leave that to the user.
