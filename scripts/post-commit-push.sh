#!/bin/sh
# Automatically push to GitHub after each commit.
# This script is called by .git/hooks/post-commit.
# Install the hook by running: cp scripts/post-commit-push.sh .git/hooks/post-commit && chmod +x .git/hooks/post-commit

if [ -n "$GITHUB_TOKEN" ]; then
  AUTH_URL="https://${GITHUB_TOKEN}@github.com/rmg007/Questerix.Fractions"
  git push "$AUTH_URL" main 2>&1 | sed "s/${GITHUB_TOKEN}/***REDACTED***/g"
else
  echo "[post-commit] GITHUB_TOKEN not set — skipping auto-push to GitHub."
fi
