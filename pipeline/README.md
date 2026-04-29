# Questerix Fractions — Content Authoring Pipeline

Build-time tool that uses the Anthropic API to generate ~300–340 QuestionTemplate records
for Levels 1–9. Outputs JSON that the runtime loads via Dexie `bulkPut`.
per content-pipeline.md

---

## Setup

```bash
cd pipeline
python -m venv .venv
# Windows
.venv\Scripts\activate
# macOS/Linux
source .venv/bin/activate

pip install -r requirements.txt

cp .env.example .env
# Edit .env and set ANTHROPIC_API_KEY=sk-ant-...
```

---

## Commands

### Generate — all levels (full build)

```bash
python -m pipeline generate --model haiku --count 4
```

Estimated runtime: ~30–45 min. Estimated cost: ~$4–$11.
(per content-pipeline.md §6.4, audit §2.5 fix)

### Generate — targeted rebuild (one level, one archetype)

```bash
python -m pipeline generate --level 3 --archetype placement --model haiku
```

### Generate — dry run (stdout only, no files written)

```bash
python -m pipeline generate --level 1 --archetype placement --dry-run
```

### Verify a seed file (no LLM, safe for CI)

```bash
python -m pipeline verify --in src/assets/curriculum/v1.0.0.json
python -m pipeline verify --in pipeline/output/level_01/all.json --templates-only
```

### Parity test (Python↔TS validator conformance)

```bash
python -m pipeline parity
# or via pytest:
pytest pipeline/parity_test.py -v
```

---

## Output

Generated files land in `pipeline/output/level_NN/<archetype>.json`.

The final assembled seed file goes to `src/assets/curriculum/v{N}.json`.
(assembly step not yet implemented — see content-pipeline.md §2.2)

---

## Model notes

| Stage      | Model                       | Tier   |
| ---------- | --------------------------- | ------ |
| Generation | `claude-haiku-4-5-20251001` | haiku  |
| Polish     | `claude-sonnet-4-6`         | sonnet |

Fallback: if a slug is deprecated, the next-newest in the same tier is tried automatically.
Cross-tier fallback is forbidden. (per content-pipeline.md §6.3, audit §5 fix)

---

## §13 Checklist Before First Run

per content-pipeline.md §13

- [ ] Schema is locked (don't run against a schema in flux)
- [ ] At least one level spec (`docs/10-curriculum/levels/level-01.md`) is final
- [ ] At least one Python validator passes parity test vs TS counterpart
- [ ] At least one per-archetype prompt exists for every in-scope archetype
- [ ] Golden fixture set exists (`pipeline/fixtures/parity/*.json`)
- [ ] `ANTHROPIC_API_KEY` set; budget alarm configured at $20
- [ ] Verify model slugs still available: `claude-haiku-4-5-20251001`, `claude-sonnet-4-6`
      (audit §5 fix — check before kickoff)

---

## Files

```
pipeline/
  cli.py                     argparse wrapper (subcommands: generate, verify, parity)
  generate.py                LLM generation with retries (max 3, audit §2.6 fix)
  verify.py                  Programmatic checks, no LLM (per content-pipeline.md §4)
  validators_py.py           Python parity validators — 12 implementations, 10 archetypes
  parity_test.py             Pytest + standalone runner for Python↔TS parity
  schemas.py                 Pydantic v2 models mirroring src/types/entities.ts
  prompts/
    system.md                Claude system prompt (JSON-only, archetype enum, no type/mechanic)
    per_archetype/           10 per-archetype guidance files
  fixtures/
    sample_template.json     One valid QuestionTemplate smoke test
    parity/                  Input/expected/outcome cases for parity test
  output/                    Generated templates land here (gitignored)
  requirements.txt
  pyproject.toml             Python 3.11+, black, ruff, pytest, pydantic v2
  .env.example
```
