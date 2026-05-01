You are maintaining the archetype × level coverage matrix for Questerix Fractions.

Steps:
1. Read src/scenes/utils/levelMeta.ts — extract the LEVEL_META array to get the declared (level, archetype) pairs.
2. Read all Playwright test files in tests/e2e/ — extract which (level, archetype) combinations are actually tested. A test covers a combination if it navigates to that level and exercises that archetype type.
3. Build a markdown table: rows = levels (L1–L9), columns = archetypes (partition, identify, label, make, compare, snap_match, benchmark, placement, order, equal_or_not, explain_your_order). Cell = ✅ (declared + tested), ⚠️ (declared, not tested), ❌ (not declared).
4. Write the table to docs/40-validation/coverage-matrix.md. Overwrite if it exists.
5. For each ⚠️ cell (declared but not tested): create a stub Playwright test file at tests/e2e/level-$LEVEL-$ARCHETYPE.spec.ts with a TODO comment. Just the file skeleton — no real test logic.
6. Run `npm run typecheck` to verify.
7. Commit: `docs(validation): regenerate archetype×level coverage matrix`

Output: count of ✅ / ⚠️ / ❌ cells and list of new stub files created.
