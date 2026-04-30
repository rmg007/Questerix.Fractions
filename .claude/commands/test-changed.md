---
description: Run Vitest only on tests related to files changed since main — faster inner loop than full test:unit
---

Find changed source files and run only their corresponding tests.

```bash
# Files changed vs main
CHANGED=$(git diff --name-only $(git merge-base HEAD origin/main 2>/dev/null || git log --oneline | tail -1 | awk '{print $1}')..HEAD -- src/ | grep '\.ts$' | grep -v '\.test\.' | grep -v CLAUDE)

echo "Changed source files:"
echo "$CHANGED"

# Derive test file names (strip src/ prefix, build grep pattern)
PATTERN=$(echo "$CHANGED" | sed 's|src/||;s|\.ts$||' | tr '\n' '|' | sed 's/|$//')

if [ -z "$PATTERN" ]; then
  echo "No changed source files found — running full test:unit"
  npm run test:unit
else
  echo "Running tests matching: $PATTERN"
  npx vitest run --reporter=verbose 2>&1 | grep -E "$PATTERN|PASS|FAIL|✓|✗|×"
fi
```

If no pattern matches or the pattern is too broad, fall back to `npm run test:unit`. Always run `npm run test:unit` before committing — this command is for the inner loop only.
