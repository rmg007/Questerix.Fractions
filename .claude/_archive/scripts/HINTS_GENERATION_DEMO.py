#!/usr/bin/env python3
"""Generate demo hints to show expected output format."""
import json
from pathlib import Path

# Load first 5 templates
data = json.load(open('public/curriculum/v1.json'))
templates = []
for level, questions in list(data['levels'].items())[:2]:
    templates.extend(questions[:5])

hints = []
hint_id_counter = 1

for template in templates[:5]:  # Demo with 5 templates
    tid = template['id']
    parts = tid.split(':')
    arch = parts[1] if len(parts) > 1 else 'unknown'
    level = parts[2].replace('L', '') if len(parts) > 2 else '1'

    # Generate 3 tier hints per template
    tier_definitions = [
        {
            "order": 1,
            "tier_name": "Mild Scaffolding (Encourage reflection)",
            "examples": [
                "What does the prompt ask you to do?",
                "How many parts should you make?",
                "Look at the shape again carefully.",
            ]
        },
        {
            "order": 2,
            "tier_name": "Moderate Scaffolding (Guide toward strategy)",
            "examples": [
                "Try using a straight line to divide it.",
                "Can you make pieces that are the same size?",
                "Count how many equal parts you created.",
            ]
        },
        {
            "order": 3,
            "tier_name": "Heavy Scaffolding (Worked example or specific instruction)",
            "examples": [
                "Draw a line from the top to the bottom.",
                "Each part should be exactly the same size.",
                "You have now split it into 2 equal pieces.",
            ]
        },
    ]

    for tier_def in tier_definitions:
        order = tier_def['order']
        example = tier_def['examples'][hash(tid + str(order)) % len(tier_def['examples'])]

        hint = {
            "id": f"h:{arch}:L{level}:{hint_id_counter:04d}:T{order}",
            "questionTemplateId": tid,
            "type": "verbal",  # Could be verbal, visual_overlay, or worked_example
            "order": order,
            "content": {
                "text": example,
                "assetUrl": None,
                "ttsKey": f"tts.hint.{arch}.l{level}.{hint_id_counter:04d}.t{order}"
            },
            "pointCost": 5 + (order * 5)  # Tier 1: 10, Tier 2: 15, Tier 3: 20
        }
        hints.append(hint)

    hint_id_counter += 1

# Write demo output
output_dir = Path('pipeline/output')
output_dir.mkdir(exist_ok=True)

demo_file = output_dir / 'hints_demo.json'
with open(demo_file, 'w') as f:
    json.dump(hints, f, indent=2)

print(f"Demo hints written: {len(hints)} hints for {len(set(h['questionTemplateId'] for h in hints))} templates")
print(f"File: {demo_file}")
print(f"\nSample hint cascade for {templates[0]['id']}:")
for h in hints[:3]:
    text = h['content']['text']
    print(f"  Tier {h['order']}: {text} ({len(text.split())} words)")
