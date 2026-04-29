# Hint Generation System

## Overview

This document describes the hint-generation pipeline for Questerix Fractions. The system automatically generates 3-tier hint cascades (Tier 1: mild, Tier 2: moderate, Tier 3: heavy scaffolding) for all 216 question templates across Levels 1–9.

**Current Status:**

- Hint prompt: ✓ Created (`pipeline/prompts/hint-generation.md`)
- Extended generate.py: ✓ Added `--hints-only` mode with batch generation
- Validation: ✓ Built-in word count, uniqueness, cascade checks
- Cost estimate: ~$0.60 (Haiku pricing) for all 648 hints
- Wall-clock time: ~18–40 minutes (depending on API concurrency)

---

## Quick Start

### Prerequisites

Ensure you have:

- ANTHROPIC_API_KEY in `.env` or environment
- Pipeline dependencies: `python -m pip install -r pipeline/requirements.txt`

### Test Run (2 templates → 6 hints)

```bash
python -m pipeline.generate --hints-only --hints-batch 2 --dry-run
```

This generates 6 sample hints (3 for each of 2 templates) and prints them to stdout without making API calls. Useful for verifying the prompt and formatting.

### Full Generation (216 templates → 648 hints)

```bash
python -m pipeline.generate --hints-only --out pipeline/output
```

This generates all 648 hints across 9 batches (~30 templates per batch) and writes to:

- `pipeline/output/hints.json` — all 648 HintTemplate records
- `pipeline/output/hint_generation_report.json` — stats and validation results

### Dry-run (no API calls, but format checking)

```bash
python -m pipeline.generate --hints-only --dry-run
```

---

## System Architecture

### Hint-Generation Prompt

Location: `pipeline/prompts/hint-generation.md`

The system prompt instructs Claude to:

1. Generate exactly 3 hints per input template (one per tier)
2. Respect word-count limits (≤15 words per hint)
3. Counter misconception traps listed in the template
4. Avoid spoiling the answer in Tiers 1–2
5. Use K–2 vocabulary and conversational tone

**Tier Definitions:**

- **Tier 1 (order: 1):** Mild scaffolding. Ask a guiding question; do NOT reveal the answer.
  - Example: "What does 'equal parts' mean to you?"
  - Target: 5–10 words

- **Tier 2 (order: 2):** Moderate scaffolding. Reference a part of the problem; suggest an approach.
  - Example: "Try dividing the shape so each piece looks the same size."
  - Target: 10–15 words

- **Tier 3 (order: 3):** Heavy scaffolding. Nearly explicit; guide toward success.
  - Example: "Draw a straight line through the middle so both halves are the same."
  - Target: 12–15 words

### Extended generate.py

New functions added to `pipeline/generate.py`:

| Function                         | Purpose                                                   |
| -------------------------------- | --------------------------------------------------------- |
| `_load_hint_generation_prompt()` | Load system prompt from markdown                          |
| `_extract_archetype_short()`     | Map archetype to 2–4 char code (e.g., `partition` → `pt`) |
| `_count_words()`                 | Count words in hint text                                  |
| `_validate_hint()`               | Validate single hint against schema + constraints         |
| `_validate_hint_cascade()`       | Validate 3-hint cascade (uniqueness, progression)         |
| `_load_curriculum_templates()`   | Load all 216 templates from `public/curriculum/v1.json`   |
| `_build_hints_user_message()`    | Build user message for Claude API                         |
| `_try_generate_hints()`          | Call Claude API with retries & rate-limit handling        |
| `generate_hints()`               | Main orchestration: batch, validate, report               |

### Validation Checks

Each hint is validated against:

1. **Schema compliance** — Pydantic `HintTemplate` model
2. **Word count** — ≤15 words (hard constraint)
3. **Uniqueness** — Not identical to prompt or other hints in cascade
4. **Format** — ID follows `h:<short>:L{N}:NNNN:T{1|2|3}`
5. **Complexity progression** — T1 ≤ T2 ≤ T3 (by word count proxy)
6. **Required fields** — All fields present and valid type

---

## Output Format

### hints.json

A JSON array of 648 `HintTemplate` records:

```json
[
  {
    "id": "h:pt:L1:0001:T1",
    "questionTemplateId": "q:pt:L1:0001",
    "type": "verbal",
    "order": 1,
    "content": {
      "text": "What does equal parts mean to you?",
      "assetUrl": null,
      "ttsKey": "tts.hint.pt.l1.0001.t1"
    },
    "pointCost": 0.0
  },
  ...
]
```

Each `HintTemplate` record includes:

- **id** — Unique hint ID (format: `h:<archetype-short>:L{level}:NNNN:T{tier}`)
- **questionTemplateId** — Reference to the question it hints for
- **type** — Always "verbal" (visual_overlay and worked_example reserved for future)
- **order** — Tier: 1 (mild), 2 (moderate), 3 (heavy)
- **content.text** — Hint text (≤15 words)
- **content.ttsKey** — Key for text-to-speech lookups
- **pointCost** — Always 0.0 (no point system yet)

### hint_generation_report.json

Summary of generation run:

```json
{
  "generated_at": "2025-04-25T16:30:45.123Z",
  "total_templates": 216,
  "total_hints_generated": 648,
  "validation": {
    "passed": 216,
    "failed": 0,
    "errors": []
  },
  "stats_by_archetype": {
    "partition": { "total": 36, "passed": 36, "failed": 0 },
    "identify": { "total": 36, "passed": 36, "failed": 0 },
    ...
  },
  "usage": {
    "input_tokens": 108000,
    "output_tokens": 129600
  }
}
```

---

## CLI Reference

### `--hints-only`

Generate hints instead of templates.

```bash
python -m pipeline.generate --hints-only [OPTIONS]
```

**Options:**

- `--out DIR` (default: `pipeline/output`) — Output directory
- `--model {haiku|sonnet}` (default: `haiku`) — Model tier
- `--hints-batch N` (default: `30`) — Templates per API call batch
- `--max-retries N` (default: `3`) — Retry attempts per batch
- `--dry-run` — Print to stdout, don't write files

**Examples:**

```bash
# Dry-run: test with 2 templates, print to stdout
python -m pipeline.generate --hints-only --hints-batch 2 --dry-run

# Full generation: all 216 templates, save to pipeline/output
python -m pipeline.generate --hints-only --out pipeline/output

# Using Sonnet for higher quality (slower, more expensive)
python -m pipeline.generate --hints-only --model sonnet --out pipeline/output

# Smaller batches for finer granularity (more API calls, more errors visible)
python -m pipeline.generate --hints-only --hints-batch 10 --out pipeline/output
```

---

## Cost & Timing Estimates

### Full Generation (All 648 Hints)

Using **Anthropic Haiku** (early 2025 pricing):

| Metric                           | Value                |
| -------------------------------- | -------------------- |
| Templates                        | 216                  |
| Hints                            | 648 (3 per template) |
| Est. input tokens                | ~108,000             |
| Est. output tokens               | ~129,600             |
| Input cost                       | $0.09                |
| Output cost                      | $0.52                |
| **Total cost**                   | **~$0.60**           |
| API batches (30 templates/batch) | 8                    |
| Est. wall-clock time             | 18–40 minutes        |

**Note:** Actual costs vary based on:

- Model tier (Sonnet is ~3–5x more expensive)
- Batch size (smaller batches = more API calls = higher overhead)
- Token efficiency of Claude's output
- Rate-limit backoff times

### Cost Breakdown by Archetype

Per-template estimates (assuming 3 hints per template):

```
partition    (36 templates) = 108 hints ≈ 5¢
identify     (36 templates) = 108 hints ≈ 5¢
label        (36 templates) = 108 hints ≈ 5¢
make         (24 templates) = 72 hints ≈ 3¢
compare      (24 templates) = 72 hints ≈ 3¢
benchmark    (12 templates) = 36 hints ≈ 2¢
order        (12 templates) = 36 hints ≈ 2¢
snap_match   (12 templates) = 36 hints ≈ 2¢
placement    (24 templates) = 72 hints ≈ 3¢
equal_or_not (12 templates) = 36 hints ≈ 2¢
---
TOTAL (216 templates)          648 hints ≈ 60¢
```

---

## Troubleshooting

### "No ANTHROPIC_API_KEY found"

Set the API key:

```bash
# Option 1: .env file
echo "ANTHROPIC_API_KEY=sk-ant-..." > pipeline/.env

# Option 2: Environment variable
export ANTHROPIC_API_KEY=sk-ant-...

# Option 3: On Windows (PowerShell)
$env:ANTHROPIC_API_KEY = "sk-ant-..."
```

### Batch fails with "Rate limited"

The system will automatically backoff and retry. If the full run hits rate limits:

- Reduce `--hints-batch` (fewer templates per call, slower but more resilient)
- Increase `--max-retries` (default is 3)
- Wait a few minutes before retrying

### Validation errors in report

Check `hint_generation_report.json` for details. Common issues:

1. **Word count exceeded** — Hint text has >15 words
   - Solution: Claude may have been verbose. Check the hint text in `hints.json` and either regenerate or manually trim.

2. **Duplicate hints** — Two hints in same cascade are identical
   - Solution: Regenerate that batch. Likely a model quirk; usually resolves on retry.

3. **Schema validation failed** — JSON doesn't match HintTemplate schema
   - Solution: Check `errors` array in report for specifics. May need to retry the batch.

---

## Integration with Curriculum Seed

Once hints are generated and validated, they can be merged into the curriculum seed file:

```python
import json

# Load existing curriculum
with open("public/curriculum/v1.json") as f:
    curriculum = json.load(f)

# Load generated hints
with open("pipeline/output/hints.json") as f:
    hints = json.load(f)

# Merge into curriculum (if hints array doesn't exist, add it)
if "hints" not in curriculum:
    curriculum["hints"] = []

curriculum["hints"].extend(hints)

# Validate with Pydantic SeedFile model
from pipeline.schemas import SeedFile
SeedFile.model_validate(curriculum)

# Write back
with open("public/curriculum/v1.json", "w") as f:
    json.dump(curriculum, f, indent=2)

print(f"✓ Merged {len(hints)} hints into curriculum")
```

---

## Quality Assurance

### Manual Review Checklist

After generation, spot-check a few hints for each archetype:

- [ ] **partition** — Hints emphasize "same size", not counting
- [ ] **identify** — Hints guide "which shape shows...", not "pick X"
- [ ] **label** — Hints help count parts and match numerator/denominator
- [ ] **make** — Hints guide shading strategy
- [ ] **compare** — Hints suggest "which takes up more space?"
- [ ] **benchmark** — Hints reference visual landmarks (0, 1/2, 1)
- [ ] **order** — Hints guide comparison strategy
- [ ] **snap_match** — Hints guide pattern recognition
- [ ] **equal_or_not** — Hints guide comparison method
- [ ] **placement** — Hints reference 0–1 number line landmarks

### Automated QA

Run the test suite:

```bash
python test_hints.py
```

This verifies:

- Curriculum loads correctly
- Hint prompt exists and has required sections
- Validation functions work
- Cost estimation is reasonable
- CLI accepts `--hints-only` flag

---

## Advanced Options

### Batch Size Tuning

The default `--hints-batch 30` means ~30 templates (90 hints) per API call.

```bash
# Smaller batches: more API calls, better error visibility
python -m pipeline.generate --hints-only --hints-batch 10

# Larger batches: fewer API calls, higher throughput (if supported)
python -m pipeline.generate --hints-only --hints-batch 50
```

**Tradeoff:**

- Smaller batch = more granular progress updates, easier to debug failures
- Larger batch = lower total API calls, faster overall (if rate limits allow)

### Model Selection

```bash
# Use Sonnet for higher quality (3–5x more expensive, slower)
python -m pipeline.generate --hints-only --model sonnet --out pipeline/output

# Use Haiku for faster, cheaper generation (default)
python -m pipeline.generate --hints-only --model haiku --out pipeline/output
```

Sonnet may produce more nuanced, age-appropriate hints at the cost of higher latency and expense.

### Dry-run for Format Validation

```bash
# Generate without API calls; test JSON formatting and schema
python -m pipeline.generate --hints-only --dry-run
```

This runs the full batch logic but mocks the API call, printing JSON to stdout. Useful for:

- Testing the system before committing to API costs
- Validating the prompt structure
- Benchmarking batch processing speed

---

## Development Notes

### Adding Archetype-Specific Guidance

The system prompt (`hint-generation.md`) includes guidance per archetype. To add or refine:

1. Edit `pipeline/prompts/hint-generation.md` → "Archetype-Specific Guidance" section
2. Re-run generation (hints will automatically incorporate changes)

Example:

```markdown
### new_archetype (nx)

- Focuses on [concept].
- Hints should emphasize [key insight].
- Reference [domain-specific terminology].
```

### Tweaking Tier Definitions

To adjust the scaffolding levels:

1. Edit `pipeline/prompts/hint-generation.md` → "Tier Definitions & Constraints" section
2. Adjust word-count targets or example hints
3. Re-run generation

### Custom Misconception Handling

If a new misconception is added to templates:

1. Add to `pipeline/prompts/hint-generation.md` → "Misconception Traps & Hint Design" section
2. Provide counter-hint strategy
3. Re-run generation

---

## Performance Profiling

To understand token usage:

1. Run generation and check `hint_generation_report.json`
2. Token usage = input_tokens + output_tokens
3. Actual cost = (input_tokens × input_price) + (output_tokens × output_price)

Example calculation (Haiku pricing):

```
input_tokens = 108,000
output_tokens = 129,600
input_price = $0.80 per 1M
output_price = $4.00 per 1M

cost = (108,000 / 1M) × $0.80 + (129,600 / 1M) × $4.00
     = $0.0864 + $0.5184
     = ~$0.60
```

If actual cost is significantly higher:

- Check that batches aren't too large (more tokens per batch)
- Verify API key is using Haiku tier (not Opus/Sonnet)
- Reduce `--hints-batch` to lower tokens per call

---

## See Also

- `pipeline/generate.py` — Main generation script
- `pipeline/prompts/hint-generation.md` — Hint system prompt
- `pipeline/schemas.py` — HintTemplate Pydantic model
- `public/curriculum/v1.json` — Curriculum seed file
- `test_hints.py` — Quick verification script

---

**Last Updated:** 2025-04-25
