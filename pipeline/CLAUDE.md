# pipeline/ — Curriculum Generation

Python pipeline that authors `QuestionTemplate` records for every archetype × level. Output is consumed by the runtime via `public/curriculum/v1.json`.

## Run

```bash
cd pipeline
pip install -r requirements.txt
ANTHROPIC_API_KEY=sk-... python -m pipeline.generate --level <N>   # one level
ANTHROPIC_API_KEY=sk-... python -m pipeline.generate --all          # full regen
```

Output → `pipeline/output/level_<N>/all.json`.

After running, sync runtime bundles from the repo root:

```bash
npm run build:curriculum
npm run validate:curriculum
npm run test:unit -- --filter validators
```

## Models

- **Generation:** Claude Haiku 4.5 — bulk template authoring.
- **Editorial polish:** Claude Sonnet 4.6 — clarity + age-appropriate phrasing.

## Validators

`pipeline/validators_py.py` contains a Python clone of every validator in `src/validators/`. Output is checked against this clone before being written. **If you change a TS validator, mirror the change here** — parity is enforced by `pipeline/fixtures/parity/*.json`.

## Per-archetype prompts

`prompts/per_archetype/<archetype>.md` — one prompt per archetype. The system prompt at `prompts/system.md` sets global authoring constraints (CCSS-aligned, age K-2, no negative numbers, etc).

## Rules

- Never write to `public/curriculum/` or `src/curriculum/` directly. The repo-root `npm run build:curriculum` is the only allowed writer.
- Never check in `pipeline/output/` content unless the curriculum bundle already reflects it. The .gitignore excludes `pipeline/output/` for this reason.
- Schemas live in `pipeline/schemas.py` — keep aligned with `src/types/entities.ts`.
