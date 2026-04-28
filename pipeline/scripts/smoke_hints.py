#!/usr/bin/env python3
"""
Test script for hint generation.
Runs verification to ensure the system is ready for full generation.
"""
import json
import sys
from pathlib import Path

# Ensure UTF-8 output on Windows
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# Test 1: Load curriculum
print("=" * 60)
print("Test 1: Load curriculum templates")
print("=" * 60)

curriculum_path = Path("public/curriculum/v1.json")
if not curriculum_path.exists():
    print(f"ERROR: Curriculum not found at {curriculum_path}")
    sys.exit(1)

with open(curriculum_path) as f:
    curriculum = json.load(f)

templates_list = []
for level, questions in curriculum.get("levels", {}).items():
    templates_list.extend(questions)

print(f"Loaded {len(templates_list)} templates from curriculum")

# Count by archetype
archetypes = {}
for q in templates_list:
    arch = q.get("archetype")
    archetypes[arch] = archetypes.get(arch, 0) + 1

print("\nTemplates by archetype:")
for arch, count in sorted(archetypes.items()):
    print(f"  {arch:15} : {count:3} templates")

print(f"\nTotal hints needed: {len(templates_list) * 3} (3 tiers per template)")

# Test 2: Verify prompt exists
print("\n" + "=" * 60)
print("Test 2: Verify hint-generation.md prompt exists")
print("=" * 60)

prompt_path = Path("pipeline/prompts/hint-generation.md")
if not prompt_path.exists():
    print(f"ERROR: Prompt not found at {prompt_path}")
    sys.exit(1)

prompt = prompt_path.read_text()
print(f"Loaded hint-generation.md ({len(prompt)} bytes)")
print(f"  Has Tier definitions: {'Tier 1' in prompt}")
print(f"  Has word count limits: {'15 words' in prompt}")
print(f"  Has HintTemplate schema: {'HintTemplate' in prompt}")

# Test 3: Verify pipeline.hints module
print("\n" + "=" * 60)
print("Test 3: Verify pipeline.hints module")
print("=" * 60)

try:
    import pipeline.hints as hints_module
    print("Imported pipeline.hints successfully")
except ImportError as e:
    print(f"ERROR: Could not import pipeline.hints: {e}")
    sys.exit(1)

functions = [
    "load_hint_prompt",
    "count_words",
    "validate_hint",
    "validate_hint_cascade",
    "load_curriculum_templates",
    "build_hints_user_message",
    "try_generate_hints",
    "generate_hints_batch",
]

missing = []
for func_name in functions:
    if hasattr(hints_module, func_name):
        print(f"  {func_name} OK")
    else:
        print(f"  {func_name} MISSING")
        missing.append(func_name)

if missing:
    print(f"\nERROR: Missing functions: {missing}")
    sys.exit(1)

# Test 4: Test validation helpers
print("\n" + "=" * 60)
print("Test 4: Test validation helpers")
print("=" * 60)

# Test word count
test_text = "What does equal parts mean to you?"
word_count = hints_module.count_words(test_text)
print(f"Word counter: '{test_text}' = {word_count} words")

# Test hint validation
sample_template = templates_list[0]
sample_hint = {
    "id": f"h:pt:L1:0001:T1",
    "questionTemplateId": sample_template["id"],
    "type": "verbal",
    "order": 1,
    "content": {
        "text": "What do equal parts mean?",
        "assetUrl": None,
        "ttsKey": "tts.hint.pt.l1.0001.t1",
    },
    "pointCost": 0.0,
}

is_valid, error_msg = hints_module.validate_hint(sample_hint, sample_template)
if is_valid:
    print(f"Hint validation: sample hint is valid")
else:
    print(f"Hint validation failed: {error_msg}")
    sys.exit(1)

# Test 5: Cost estimation
print("\n" + "=" * 60)
print("Test 5: Cost estimation for full run")
print("=" * 60)

avg_input_tokens_per_template = 500
avg_output_tokens_per_hint = 200

total_templates = len(templates_list)
total_hints = total_templates * 3

estimated_input_tokens = total_templates * avg_input_tokens_per_template
estimated_output_tokens = total_hints * avg_output_tokens_per_hint

# Anthropic Haiku pricing (as of early 2025)
haiku_input_cost_per_1m = 0.80
haiku_output_cost_per_1m = 4.00

input_cost = (estimated_input_tokens / 1_000_000) * haiku_input_cost_per_1m
output_cost = (estimated_output_tokens / 1_000_000) * haiku_output_cost_per_1m
total_cost = input_cost + output_cost

print(f"Estimated tokens:")
print(f"  Input:  {estimated_input_tokens:,} ({estimated_input_tokens / 1_000_000:.1f}M)")
print(f"  Output: {estimated_output_tokens:,} ({estimated_output_tokens / 1_000_000:.1f}M)")
print(f"\nEstimated cost (Haiku @ early 2025 pricing):")
print(f"  Input cost:  ${input_cost:.2f}")
print(f"  Output cost: ${output_cost:.2f}")
print(f"  Total:       ${total_cost:.2f}")
print(f"\nWall-clock time estimate (~2-3s per batch):")
batch_time = 2.5
num_batches = (total_templates + 30 - 1) // 30
estimated_time_seconds = num_batches * batch_time
estimated_time_minutes = estimated_time_seconds / 60
print(f"  {num_batches} batches × {batch_time}s = ~{estimated_time_minutes:.1f} minutes")

print("\n" + "=" * 60)
print("System ready for hint generation!")
print("=" * 60)
print("\nTo generate all hints:")
print("  python -m pipeline.generate --hints-only --out pipeline/output")
print("\nOr test with a smaller batch:")
print("  python -m pipeline.generate --hints-only --hints-batch 2 --dry-run")
