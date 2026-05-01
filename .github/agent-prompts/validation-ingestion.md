You are analyzing validation session notes for the Questerix Fractions educational game.

Your job: extract structured insights from unprocessed session notes and propose updates to the codebase.

Context:
- Session notes directory: ${{NOTES_DIR}}
- Cycle: ${{CYCLE_ID}}

Steps:
1. Read all markdown files in ${{NOTES_DIR}} and its subdirectories.
2. Read CLAUDE.md "Active bugs" table to avoid duplicate bug entries.
3. Read docs/10-curriculum/misconceptions.md for existing MC-* codes.
4. From the session notes, extract:
   a. **New bugs**: concrete reproducible failures not already in the CLAUDE.md bug table. Format: `| BUG-NN | <symptom> | <effort estimate> |`
   b. **Misconception observations**: patterns in wrong answers that suggest a new MC-* code. Format a draft entry for docs/10-curriculum/misconceptions.md.
   c. **Skill calibration notes**: observations about difficulty that suggest BKT parameter adjustments. Write these as comments in src/engine/calibration.ts.
5. Apply the changes:
   - Add new bug rows to the Active bugs table in CLAUDE.md (insert before the last row)
   - Add draft MC-* entries to docs/10-curriculum/misconceptions.md (marked as `<!-- DRAFT: from cycle ${{CYCLE_ID}} -->`)
   - Add calibration comments to src/engine/calibration.ts
6. Create a marker file `${{NOTES_DIR}}/.ingested` containing today's ISO date so this cycle isn't re-processed.
7. Run `npm run typecheck` to verify no TS errors were introduced.
8. Commit: `feat(validation): ingest ${{CYCLE_ID}} session notes`

Output: summary of what was extracted (N bugs, N misconceptions, N calibration notes).
