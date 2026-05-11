---
description: Print active sprint blockers and their current status in compact form
---

Read `PLANS/PLAN.md` and extract all active blockers, open items, and in-progress work. Cross-reference against the codebase.

```bash
# Find all open/in-progress items in PLAN.md
grep -n "❌\|🔴\|TODO\|BLOCKED\|in.progress\|pending" PLANS/PLAN.md | head -30
```

For each blocker found:
1. Extract its ID and description from `PLANS/PLAN.md`.
2. Run one `grep` against `src/` to check current state.
3. Report ✅ (addressed) or ❌ (still open) with brief evidence.

Output a compact table (≤ 20 lines):

```
Sprint status — <today's date>

| ID | Description | Fixed? | Evidence |
|----|-------------|--------|----------|
| XX | <desc>      | ✅/❌   | file:line or "not found in src/" |

Overall: 🔴 BLOCKED / 🟡 IN PROGRESS / 🟢 ALL CLEAR
```

If `PLANS/PLAN.md` has no open items, say "No active blockers — PLANS/PLAN.md is clean."

Use one `grep` + one `read` per blocker max — stay fast.
