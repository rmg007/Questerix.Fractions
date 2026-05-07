---
name: ci
description: Show CI status for current branch — recent runs, failures, and open PRs
---

Run the following and print a compact summary:

```bash
echo "=== CI runs (last 6) ===" && gh run list --limit 6 --json status,conclusion,name,headBranch,createdAt,url --jq '.[] | "\(.conclusion // .status) | \(.name) | \(.headBranch) | \(.url)"'
echo "" && echo "=== Open PRs ===" && gh pr list --json number,title,headRefName,statusCheckRollup --jq '.[] | "#\(.number) \(.title) [\(.headRefName)] checks:\(.statusCheckRollup // [] | map(.conclusion // .state) | unique | join(","))"'
echo "" && echo "=== Current branch ===" && BRANCH=$(git branch --show-current) && echo "Branch: $BRANCH" && gh run list --branch "$BRANCH" --limit 3 --json status,conclusion,name,url --jq '.[] | "\(.conclusion // .status) \(.name) \(.url)"'
```

If any run is `failure`, also run:
```bash
gh run view <run-id> --log-failed 2>&1 | tail -30
```
to surface the failure reason inline.
