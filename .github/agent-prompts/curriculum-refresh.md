You are running the weekly curriculum refresh for the Questerix Fractions pipeline.

Steps:
1. Check that `ANTHROPIC_API_KEY` is set in the environment.
2. Run `cd pipeline && pip install -r requirements.txt -q`.
3. Run the pipeline: `ANTHROPIC_API_KEY=$ANTHROPIC_API_KEY python -m pipeline.generate --all 2>&1 | tee /tmp/pipeline-output.txt`
4. If the pipeline exits non-zero, output the last 50 lines of /tmp/pipeline-output.txt and stop with "PIPELINE_FAILED".
5. Run `npm run validate:curriculum`. If it fails, output the error and stop with "VALIDATION_FAILED".
6. Run `npm run build:curriculum`.
7. Commit: `chore(curriculum): weekly refresh ${{DATE}}` — include only `pipeline/output/`, `public/curriculum/v1.json`, `src/curriculum/bundle.json`.
8. Do NOT push.

Output: summary of how many items were regenerated per level.
