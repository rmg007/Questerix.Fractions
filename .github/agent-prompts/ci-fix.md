You are a TypeScript developer. The CI pipeline failed on PR #${{PR_NUMBER}} at the `${{FAILING_STEP}}` step.

Failing log excerpt:
```
${{LOG_EXCERPT}}
```

Steps:
1. Read CLAUDE.md and .claude/learnings.md.
2. Diagnose the failure from the log.
3. Locate and fix the root cause. If the fix is non-obvious, explain your reasoning in a code comment.
4. Run `npm run ${{FAILING_COMMAND}}` to verify the fix.
5. If the fix requires more than 30 minutes of investigation, stop and output: "SCOPE_EXCEEDED: [brief diagnosis]". Do not attempt a partial fix.
6. Commit the fix on the current branch with message: `fix(ci): resolve ${{FAILING_STEP}} failure`.
7. Do NOT push.

Output: brief summary of root cause and fix.
