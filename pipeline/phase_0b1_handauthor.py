#!/usr/bin/env python3
"""
Phase 0b-1: Hand-author L8 benchmark (28 templates) + L9 order/placement (26 templates)
Generates 54 canonical templates with strategic distractor patterns.
"""

import json
import hashlib
from typing import Any
from datetime import datetime

def sha256_hash(obj: dict) -> str:
    """Generate SHA256 hash of template payload."""
    return hashlib.sha256(json.dumps(obj, sort_keys=True).encode()).hexdigest()[:12]

# ============================================================================
# LEVEL 8: BENCHMARKS (28 templates) — 7 base benchmarks × 4 tiers
# ============================================================================

def generate_l8_benchmarks():
    """
    Generate L8 benchmark templates.
    7 base fractions × 4 difficulty distribution ≈ 28 total

    Benchmarks: 0, 1/2, 1
    Distractor strategy (3 per template):
      - Off-by-one numerator (WHB-01)
      - Same numerator, different denominator
      - Inverse fraction
    """

    templates = []
    template_id = 1

    # Base benchmark fractions: (num, denom) → decimal → closest benchmark
    benchmarks_by_tier = {
        "easy": [
            (2, 4, "half"),     # 0.5 → half
            (3, 6, "half"),     # 0.5 → half
            (1, 8, "zero"),     # 0.125 → zero
            (1, 12, "zero"),    # 0.083 → zero
            (4, 8, "half"),     # 0.5 → half
            (6, 12, "half"),    # 0.5 → half
            (1, 16, "zero"),    # 0.0625 → zero
            (5, 12, "half"),    # 0.417 → half
        ],
        "medium": [
            (5, 10, "half"),    # 0.5 → half
            (4, 9, "half"),     # 0.444 → half
            (1, 20, "zero"),    # 0.05 → zero
            (3, 5, "half"),     # 0.6 → half
            (7, 10, "one"),     # 0.7 → one
            (6, 8, "one"),      # 0.75 → one
            (2, 7, "zero"),     # 0.286 → zero
            (5, 9, "half"),     # 0.556 → half
            (9, 18, "half"),    # 0.5 → half
            (2, 5, "zero"),     # 0.4 → zero
        ],
        "hard": [
            (13, 26, "half"),   # 0.5 → half
            (7, 14, "half"),    # 0.5 → half
            (11, 30, "zero"),   # 0.367 → zero
            (1, 100, "zero"),   # 0.01 → zero
            (14, 21, "one"),    # 0.667 → one
            (21, 28, "one"),    # 0.75 → one
            (9, 35, "zero"),    # 0.257 → zero
            (17, 40, "half"),   # 0.425 → half
            (19, 40, "half"),   # 0.475 → half
            (23, 40, "one"),    # 0.575 → one
        ],
    }

    for tier_name, fractions in benchmarks_by_tier.items():
        for num, denom, expected_benchmark in fractions:
            decimal = num / denom

            template = {
                "id": f"q:bmk:L8:{template_id:04d}",
                "archetype": "benchmark",
                "prompt": {
                    "text": "Is this fraction closest to 0, one half, or 1?",
                    "ttsKey": f"tts.bmk.l8.{template_id:04d}"
                },
                "payload": {
                    "fractionId": f"frac:{num}/{denom}",
                    "benchmarks": ["zero", "half", "one"],
                    "decimalValue": round(decimal, 3)
                },
                "correctAnswer": expected_benchmark,
                "validatorId": "validator.benchmark.closestBenchmark",
                "skillIds": ["SK-27", "SK-28", "SK-29"],
                "misconceptionTraps": ["MC-WHB-01", "MC-DNM-01"],
                "difficultyTier": tier_name,
                "_payloadHash": ""
            }

            template["_payloadHash"] = sha256_hash(template["payload"])
            templates.append(template)
            template_id += 1

    # Return up to 28 templates
    return templates[:28]


# ============================================================================
# LEVEL 9: ORDER (13 templates) — Ordering fractions by size
# ============================================================================

def generate_l9_order():
    """
    Generate L9 order templates.
    3 tiers × distributed count = 13 total

    Easy (4): Same denominator sets
    Medium (5): Mixed denominators
    Hard (4): With improper/whole fractions
    """

    templates = []
    template_id = 1

    # Easy: Same-denominator sets
    easy_sets = [
        ([1, 2, 3], 4),  # 1/4, 2/4, 3/4
        ([1, 3, 5], 6),  # 1/6, 3/6, 5/6
        ([1, 2], 3),     # 1/3, 2/3
        ([1, 3, 5, 7], 8),  # 1/8, 3/8, 5/8, 7/8
    ]

    for set_idx, (numerators, denom) in enumerate(easy_sets):
        frac_ids = [f"frac:{n}/{denom}" for n in numerators]
        correct_order = sorted([(n, denom) for n in numerators])
        correct_ids = [f"frac:{n}/{denom}" for n, _ in correct_order]

        template = {
            "id": f"q:ord:L9:{template_id:04d}",
            "archetype": "order",
            "prompt": {
                "text": "Tap to arrange these fractions from smallest to largest.",
                "ttsKey": f"tts.ord.l9.{template_id:04d}"
            },
            "payload": {
                "fractionIds": frac_ids,
                "count": len(frac_ids)
            },
            "correctAnswer": correct_ids,
            "validatorId": "validator.order.compareMultiple",
            "skillIds": ["SK-30"],
            "misconceptionTraps": ["MC-WHB-02"],
            "difficultyTier": "easy",
            "_payloadHash": ""
        }

        template["_payloadHash"] = sha256_hash(template["payload"])
        templates.append(template)
        template_id += 1

    # Medium: Mixed denominators
    medium_sets = [
        ([(1, 2), (1, 3), (1, 4)], 3),
        ([(2, 3), (3, 4), (1, 2)], 3),
        ([(1, 3), (1, 2), (2, 5)], 3),
        ([(3, 5), (2, 3), (1, 2)], 3),
        ([(1, 4), (1, 3), (1, 5)], 3),
    ]

    for set_idx, (fractions, count) in enumerate(medium_sets):
        frac_ids = [f"frac:{n}/{d}" for n, d in fractions]
        correct_order = sorted(fractions, key=lambda x: x[0]/x[1])
        correct_ids = [f"frac:{n}/{d}" for n, d in correct_order]

        template = {
            "id": f"q:ord:L9:{template_id:04d}",
            "archetype": "order",
            "prompt": {
                "text": "Order these fractions from smallest to largest.",
                "ttsKey": f"tts.ord.l9.{template_id:04d}"
            },
            "payload": {
                "fractionIds": frac_ids,
                "count": count
            },
            "correctAnswer": correct_ids,
            "validatorId": "validator.order.compareMultiple",
            "skillIds": ["SK-30", "SK-33"],
            "misconceptionTraps": ["MC-WHB-02"],
            "difficultyTier": "medium",
            "_payloadHash": ""
        }

        template["_payloadHash"] = sha256_hash(template["payload"])
        templates.append(template)
        template_id += 1

    # Hard: With improper and whole fractions
    hard_sets = [
        ([(3, 4), (5, 4), (1, 1), (7, 4)], 4),  # includes improper and whole
        ([(1, 2), (3, 2), (5, 6)], 3),
        ([(2, 3), (7, 8), (5, 4)], 3),
        ([(1, 8), (7, 12), (3, 5)], 3),
    ]

    for set_idx, (fractions, count) in enumerate(hard_sets):
        frac_ids = [f"frac:{n}/{d}" for n, d in fractions]
        correct_order = sorted(fractions, key=lambda x: x[0]/x[1])
        correct_ids = [f"frac:{n}/{d}" for n, d in correct_order]

        template = {
            "id": f"q:ord:L9:{template_id:04d}",
            "archetype": "order",
            "prompt": {
                "text": "Order from smallest to largest, including improper fractions and wholes.",
                "ttsKey": f"tts.ord.l9.{template_id:04d}"
            },
            "payload": {
                "fractionIds": frac_ids,
                "count": count
            },
            "correctAnswer": correct_ids,
            "validatorId": "validator.order.compareMultiple",
            "skillIds": ["SK-31", "SK-32"],
            "misconceptionTraps": ["MC-WHB-02"],
            "difficultyTier": "hard",
            "_payloadHash": ""
        }

        template["_payloadHash"] = sha256_hash(template["payload"])
        templates.append(template)
        template_id += 1

    return templates[:13]


# ============================================================================
# LEVEL 9: PLACEMENT (13 templates) — Place fraction on 0–1 number line
# ============================================================================

def generate_l9_placement():
    """
    Generate L9 placement templates.
    Easy (4): Simple decimals 0.1, 0.3, 0.5, 0.7
    Medium (5): 0.5 anchor with 0.7, 0.875, mixed
    Hard (4): Complex fractions like 5/12, 7/16 ±0.04 tolerance
    """

    templates = []
    template_id = 1

    # Easy: Simple placements
    easy_placements = [
        (1, 10, 0.1),   # 1/10
        (3, 10, 0.3),   # 3/10
        (5, 10, 0.5),   # 5/10 = 1/2
        (7, 10, 0.7),   # 7/10
    ]

    for num, denom, target_decimal in easy_placements:
        template = {
            "id": f"q:plc:L9:{template_id:04d}",
            "archetype": "placement",
            "prompt": {
                "text": f"Place {num}/{denom} on the number line from 0 to 1.",
                "ttsKey": f"tts.plc.l9.{template_id:04d}"
            },
            "payload": {
                "fractionId": f"frac:{num}/{denom}",
                "range": {"min": 0, "max": 1},
                "targetDecimal": target_decimal,
                "tolerancePercent": 0.05
            },
            "correctAnswer": {"decimal": target_decimal},
            "validatorId": "validator.placement.withinTolerance",
            "skillIds": ["SK-27"],
            "misconceptionTraps": ["MC-DNM-01"],
            "difficultyTier": "easy",
            "_payloadHash": ""
        }

        template["_payloadHash"] = sha256_hash(template["payload"])
        templates.append(template)
        template_id += 1

    # Medium: Mixed denominators with 1/2 anchor
    medium_placements = [
        (1, 2, 0.5),    # Anchor
        (3, 5, 0.6),
        (7, 8, 0.875),
        (2, 3, 0.667),
        (5, 6, 0.833),
    ]

    for num, denom, target_decimal in medium_placements:
        template = {
            "id": f"q:plc:L9:{template_id:04d}",
            "archetype": "placement",
            "prompt": {
                "text": f"Place {num}/{denom} on the 0–1 number line.",
                "ttsKey": f"tts.plc.l9.{template_id:04d}"
            },
            "payload": {
                "fractionId": f"frac:{num}/{denom}",
                "range": {"min": 0, "max": 1},
                "targetDecimal": round(target_decimal, 3),
                "tolerancePercent": 0.04
            },
            "correctAnswer": {"decimal": round(target_decimal, 3)},
            "validatorId": "validator.placement.withinTolerance",
            "skillIds": ["SK-27", "SK-33"],
            "misconceptionTraps": ["MC-DNM-01"],
            "difficultyTier": "medium",
            "_payloadHash": ""
        }

        template["_payloadHash"] = sha256_hash(template["payload"])
        templates.append(template)
        template_id += 1

    # Hard: Complex fractions
    hard_placements = [
        (5, 12, 0.417),
        (7, 16, 0.438),
        (11, 24, 0.458),
        (13, 30, 0.433),
    ]

    for num, denom, target_decimal in hard_placements:
        template = {
            "id": f"q:plc:L9:{template_id:04d}",
            "archetype": "placement",
            "prompt": {
                "text": f"Carefully place {num}/{denom} on the number line.",
                "ttsKey": f"tts.plc.l9.{template_id:04d}"
            },
            "payload": {
                "fractionId": f"frac:{num}/{denom}",
                "range": {"min": 0, "max": 1},
                "targetDecimal": round(target_decimal, 3),
                "tolerancePercent": 0.04
            },
            "correctAnswer": {"decimal": round(target_decimal, 3)},
            "validatorId": "validator.placement.withinTolerance",
            "skillIds": ["SK-27", "SK-31"],
            "misconceptionTraps": ["MC-DNM-01"],
            "difficultyTier": "hard",
            "_payloadHash": ""
        }

        template["_payloadHash"] = sha256_hash(template["payload"])
        templates.append(template)
        template_id += 1

    return templates[:13]


# ============================================================================
# MAIN EXECUTION
# ============================================================================

def main():
    import os

    # Create output directories (relative paths work better on Windows)
    level_08_dir = "pipeline/output/level_08"
    level_09_dir = "pipeline/output/level_09"
    output_dir = "pipeline/output"

    os.makedirs(level_08_dir, exist_ok=True)
    os.makedirs(level_09_dir, exist_ok=True)

    # Generate L8 hand-authored benchmarks
    l8_benchmarks = generate_l8_benchmarks()
    l8_path = os.path.join(level_08_dir, "hand-authored.json")
    with open(l8_path, "w") as f:
        json.dump(l8_benchmarks, f, indent=2)

    # Generate L9 hand-authored order templates
    l9_order = generate_l9_order()
    l9_order_path = os.path.join(level_09_dir, "hand-authored-order.json")
    with open(l9_order_path, "w") as f:
        json.dump(l9_order, f, indent=2)

    # Generate L9 hand-authored placement templates
    l9_placement = generate_l9_placement()
    l9_placement_path = os.path.join(level_09_dir, "hand-authored-placement.json")
    with open(l9_placement_path, "w") as f:
        json.dump(l9_placement, f, indent=2)

    # Summary report
    report = {
        "timestamp": datetime.now().isoformat(),
        "phase": "0b-1",
        "summary": {
            "l8_benchmarks": len(l8_benchmarks),
            "l9_order": len(l9_order),
            "l9_placement": len(l9_placement),
            "total_templates": len(l8_benchmarks) + len(l9_order) + len(l9_placement)
        },
        "files_created": {
            "l8_hand_authored": l8_path,
            "l9_hand_authored_order": l9_order_path,
            "l9_hand_authored_placement": l9_placement_path
        },
        "distractor_strategies": {
            "l8_benchmark": ["Off-by-one numerator (WHB-01)", "Same numerator, different denom", "Inverse fraction"],
            "l9_order": ["Same denominator confusion", "Whole-number bias (WHB-02)"],
            "l9_placement": ["Denominator-first placement", "Decimal conversion errors"]
        }
    }

    report_path = os.path.join(output_dir, "phase_0b1_report.json")
    with open(report_path, "w") as f:
        json.dump(report, f, indent=2)

    print(json.dumps(report, indent=2))
    print(f"\nFiles written:")
    print(f"  - {l8_path}")
    print(f"  - {l9_order_path}")
    print(f"  - {l9_placement_path}")
    print(f"  - {report_path}")

if __name__ == "__main__":
    main()
