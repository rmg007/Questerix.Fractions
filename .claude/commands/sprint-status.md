---
description: Print active sprint blockers and their current status in compact form
---

Read `PLANS/PLAN.md` and extract the active blockers/priority items. Cross-reference each item against the codebase to see if it's been addressed.

```bash
# Quick grep for each known blocker ID
grep -rn "BUG-01\|BUG-02\|BUG-04\|G-E1\|G-C7" src/ --include="*.ts" -l 2>/dev/null
```

Output a compact table (≤ 15 lines) in this format:

```
Sprint 0 status — <today's date>

| ID     | File              | Fixed? | Evidence |
|--------|-------------------|--------|----------|
| BUG-01 | Level01Scene.ts   | ✅/❌   | line X or "still uses 'identify' prompt" |
| BUG-02 | Level01Scene.ts   | ✅/❌   | brief reason |
| BUG-04 | Level01Scene.ts   | ✅/❌   | brief reason |
| G-E1   | Level01Scene.ts   | ✅/❌   | brief reason |
| G-C7   | LevelScene.ts     | ✅/❌   | brief reason |

Exit criteria: student completes 5-question session at localhost:5000
Overall: 🔴 NOT READY / 🟡 IN PROGRESS / 🟢 READY
```

Use one `grep` + one `read` per blocker max — stay fast.
