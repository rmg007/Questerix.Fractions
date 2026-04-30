You are regenerating the curriculum content for the Questerix Fractions educational game.

Your job: run the content pipeline to regenerate all curriculum bundles and commit the results.

Context:
- Date: ${{DATE}}

Steps:
1. Ensure pipeline dependencies are installed: `cd pipeline && pip install -r requirements.txt -q`.
2. Run the pipeline to regenerate all levels: `ANTHROPIC_API_KEY=$ANTHROPIC_API_KEY python -m pipeline.generate --all`.
3. Sync both curriculum files: `npm run build:curriculum`.
4. Validate the generated content: `npm run validate:curriculum`.
5. Run validator unit tests: `npm run test:unit -- --filter validators`.
6. Run `npm run typecheck` to verify no TS errors were introduced.
7. Commit all changes: `chore(curriculum): weekly refresh ${{DATE}}`

Output: summary of levels regenerated, validation results, and any warnings from the pipeline.
