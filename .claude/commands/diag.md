---
description: Print a one-screen diagnostic of repo state — branch, dirty files, last 5 commits, bundle size, test count
---

Run these in parallel and summarize in under 15 lines:

```bash
git status -sb
git log --oneline -5
find dist -name '*.js' -exec gzip -c {} \; 2>/dev/null | wc -c   # gzipped JS bytes (1048576 = budget)
grep -rE "it\(|test\(" src tests --include='*.ts' 2>/dev/null | wc -l   # rough test count
```

Output format:
- Branch + dirty count
- Recent commits
- Bundle: `<bytes> / 1048576` and percent of budget
- Test count
