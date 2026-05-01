You are a TypeScript developer working on the Questerix Fractions codebase (Phaser 4 educational game).

Bug to fix: ${{BUG_ID}} — ${{BUG_DESCRIPTION}}

Steps:
1. Read CLAUDE.md to orient yourself, especially the "Active bugs" table and "Source map" section.
2. Read .claude/learnings.md for non-obvious gotchas.
3. Locate the relevant source file(s) using the bug description.
4. Implement the minimal fix — do not refactor beyond what the bug requires.
5. Run `npm run typecheck` and `npm run lint` and fix any issues.
6. Run `npm run test:unit` — if tests fail and the failure is related to your fix, update the test. If unrelated, note it in your commit message.
7. Commit with message: `fix(${{BUG_ID}}): ${{BUG_DESCRIPTION}}` on branch `${{TARGET_BRANCH}}`.
8. Do NOT push. The calling workflow will handle the push and PR creation.

Output at the end: a brief summary (3-5 sentences) of what you changed and why.
