# Questerix Fractions — Hint Generation System

**Status:** ✅ Complete & Ready for Use  
**Date:** April 25, 2025

## Overview

This directory now contains a complete hint-generation system for Questerix Fractions. The system automatically generates 3-tier hint cascades (Tier 1: mild, Tier 2: moderate, Tier 3: heavy scaffolding) for all 216+ question templates across Levels 1–9.

**Key Facts:**
- Templates: 216 (across 9 levels, 10 archetypes)
- Hints to generate: 648 (3 per template)
- Cost estimate: ~$0.60 (Anthropic Haiku)
- Time estimate: 18–40 minutes (8 API batches)
- Status: All components built, tested, documented

---

## Quick Start

### 1. Prerequisites

Ensure you have an Anthropic API key:

```bash
export ANTHROPIC_API_KEY=sk-ant-...
```

Or create `pipeline/.env`:

```
ANTHROPIC_API_KEY=sk-ant-...
```

### 2. Verify the System

Run the test suite (no API calls required):

```bash
python3 test_hints.py
```

### 3. Generate All Hints

```bash
python3 -c "
from pathlib import Path
from pipeline.llm import make_client
from pipeline.hints import generate_hints_batch

client = make_client()
result = generate_hints_batch(
    client=client,
    out_dir=Path('pipeline/output'),
    model='claude-3-5-haiku-20241022',
    batch_size=30,
    max_retries=3,
    dry_run=False
)

print(f'Generated: {result[\"hints_generated\"]} hints')
print(f'Tokens: {result[\"input_tokens\"]:,} in, {result[\"output_tokens\"]:,} out')
"
```

### 4. Review Results

```bash
# Check validation stats
cat pipeline/output/hint_generation_report.json | python3 -m json.tool

# Sample a hint
python3 -c "import json; h=json.load(open('pipeline/output/hints.json')); print(json.dumps(h[0], indent=2))"
```

---

## System Architecture

### Core Components

1. **Hint Generation Prompt** (`pipeline/prompts/hint-generation.md`)
   - 9.3 KB system prompt
   - Tier definitions and constraints
   - Per-archetype guidance
   - Misconception-aware patterns

2. **Hints Module** (`pipeline/hints.py`)
   - 8 functions for hint generation
   - Validation pipeline
   - API call orchestration

3. **Test Suite** (`test_hints.py`)
   - Pre-flight verification
   - All 5 tests PASSING

### Validation Pipeline

Load → Batch → API Call → Parse → Validate → Output

---

## Output Format

### hints.json

648 HintTemplate records in JSON array format:

```json
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
}
```

### hint_generation_report.json

Summary with validation stats and token usage

---

## Cost & Time

**Haiku (default):**
- Cost: ~$0.60
- Time: 18–40 minutes
- Batches: 8 (30 templates each)

**Sonnet (higher quality):**
- Cost: ~$2.27
- Time: 30–60 minutes

---

## Integration

After generation, merge hints into the curriculum:

```python
import json

with open("public/curriculum/v1.json") as f:
    curriculum = json.load(f)

with open("pipeline/output/hints.json") as f:
    hints = json.load(f)

curriculum["hints"] = hints

with open("public/curriculum/v1.json", "w") as f:
    json.dump(curriculum, f, indent=2)

print(f"Merged {len(hints)} hints")
```

---

## Files

**Created:**
- `pipeline/prompts/hint-generation.md` — System prompt
- `pipeline/hints.py` — Core module
- `test_hints.py` — Verification script
- `HINT_GENERATION.md` — Detailed guide
- `HINTS_README.md` — This file
- `.claude/reports/hint_system_delivery.md` — Technical report
- `.claude/reports/HINT_SYSTEM_SUMMARY.txt` — Quick reference
- `HINT_SYSTEM_FILES.md` — File manifest

---

## Status

✅ All components complete  
✅ All tests passing (5/5)  
✅ Documentation complete  
✅ Ready for production use

See [HINT_GENERATION.md](HINT_GENERATION.md) for detailed documentation.
