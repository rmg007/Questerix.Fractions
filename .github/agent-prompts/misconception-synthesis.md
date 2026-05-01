You are analyzing new curriculum content to identify gaps in misconception detector coverage.

Context:
- New curriculum output: ${{NEW_CURRICULUM_FILES}}
- Existing MC codes in docs/10-curriculum/misconceptions.md

Steps:
1. Read docs/10-curriculum/misconceptions.md for all existing MC-* codes.
2. Read src/engine/misconceptionDetectors.ts to understand the detector implementation pattern.
3. Read the new curriculum files listed in ${{NEW_CURRICULUM_FILES}} — focus on wrong_answer patterns and distractor rationale fields.
4. For each wrong-answer pattern NOT covered by an existing MC-* detector, draft:
   a. A new MC-* entry for docs/10-curriculum/misconceptions.md
   b. A matching detector stub in src/engine/misconceptionDetectors.ts (follow the existing pattern exactly)
   c. A fixture file at tests/fixtures/misconceptions/<MC-CODE>.json with a synthetic wrong answer that should fire the detector
5. Run `npm run typecheck` to verify no errors.
6. Run `npm run test:unit` to verify existing tests still pass.
7. Commit: `feat(misconceptions): synthesize detectors from curriculum refresh`

Output: list of new MC codes added and their trigger patterns.
