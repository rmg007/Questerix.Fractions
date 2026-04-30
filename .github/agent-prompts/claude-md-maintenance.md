You are performing monthly CLAUDE.md self-maintenance for the Questerix Fractions repo.

Steps:
1. Read CLAUDE.md — the current agent guide.
2. Read .claude/learnings.md — gotchas discovered in prior sessions.
3. Read docs/00-foundation/decision-log.md — architectural decisions.
4. Read git log for the last 30 days: `git log --oneline --since="30 days ago"`.
5. For each entry in .claude/learnings.md:
   - If the gotcha is already addressed or made obsolete by recent code changes, note it as candidate for removal.
   - If the gotcha contradicts or is missing from CLAUDE.md, propose an addition.
6. Propose updates to CLAUDE.md:
   - Add any non-obvious patterns from learnings.md that don't belong in the doc yet.
   - Update the "Active bugs" table to remove bugs whose fixes have been merged (check git log for fix commits).
   - Update the key doc pointers table if any referenced files have moved.
7. Apply the updates to CLAUDE.md. Be surgical — only change what's necessary.
8. Remove stale entries from .claude/learnings.md (ones now covered by CLAUDE.md).
9. Run `npm run typecheck` (no-op check — ensures repo is still healthy).
10. Commit: `docs(claude-md): monthly self-maintenance`

Output: list of changes made to CLAUDE.md and learnings.md.
