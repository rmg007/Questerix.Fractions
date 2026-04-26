#!/usr/bin/env python3
"""Validate and report on hint generation results."""
from __future__ import annotations

import json
import sys
from pathlib import Path
from collections import Counter, defaultdict


def count_words(text: str) -> int:
    """Count words in text."""
    return len(text.split())


def validate_hints_file(hints_file: Path) -> dict:
    """Validate a hints.json file and generate a report."""
    with open(hints_file) as f:
        hints = json.load(f)

    report = {
        "total_hints": len(hints),
        "validation_errors": [],
        "stats": {
            "by_type": Counter(),
            "by_order": Counter(),
            "word_counts": [],
            "point_costs": [],
        },
        "cascades": defaultdict(list),
        "samples": [],
    }

    # Group by template
    by_template = defaultdict(list)
    for hint in hints:
        tid = hint.get("questionTemplateId")
        by_template[tid].append(hint)

    # Validate cascades
    cascade_pass = 0
    cascade_fail = 0

    for tid, hints_for_template in by_template.items():
        # Should have 3 hints
        if len(hints_for_template) != 3:
            report["validation_errors"].append(
                {"template_id": tid, "error": f"Expected 3 hints, got {len(hints_for_template)}"}
            )
            cascade_fail += 1
            continue

        cascade_pass += 1

        # Check each hint
        sorted_hints = sorted(hints_for_template, key=lambda h: h.get("order", 0))
        texts = []
        valid_cascade = True

        for hint in sorted_hints:
            # Required fields
            if not all(k in hint for k in ["id", "questionTemplateId", "type", "order", "content"]):
                valid_cascade = False
                report["validation_errors"].append(
                    {"template_id": tid, "error": f"Missing required fields in {hint.get('id')}"}
                )

            # Type validation
            if hint.get("type") not in ["verbal", "visual_overlay", "worked_example"]:
                valid_cascade = False
                report["validation_errors"].append(
                    {"template_id": tid, "error": f"Invalid type: {hint.get('type')}"}
                )

            # Order validation
            if hint.get("order") not in [1, 2, 3]:
                valid_cascade = False
                report["validation_errors"].append(
                    {"template_id": tid, "error": f"Invalid order: {hint.get('order')}"}
                )

            # Word count
            content = hint.get("content", {})
            text = content.get("text", "")
            wc = count_words(text)
            if wc > 15:
                valid_cascade = False
                report["validation_errors"].append(
                    {"template_id": tid, "error": f"Word count exceeds 15: {wc}"}
                )

            texts.append(text)
            report["stats"]["by_type"][hint.get("type")] += 1
            report["stats"]["by_order"][hint.get("order")] += 1
            report["stats"]["word_counts"].append(wc)
            report["stats"]["point_costs"].append(hint.get("pointCost", 0))

        # Uniqueness
        if len(texts) != len(set(texts)):
            valid_cascade = False
            report["validation_errors"].append(
                {"template_id": tid, "error": "Duplicate hint texts in cascade"}
            )

        # Sample collection (first valid cascade from each order)
        if valid_cascade and len(report["samples"]) < 5:
            report["samples"].append({
                "template_id": tid,
                "hints": sorted_hints,
            })

    report["stats"]["cascades_passed"] = cascade_pass
    report["stats"]["cascades_failed"] = cascade_fail
    report["stats"]["validation_errors"] = len(report["validation_errors"])

    return report, hints


def print_report(report: dict, hints: list):
    """Print a formatted report."""
    print("\n" + "=" * 60)
    print("HINT GENERATION REPORT")
    print("=" * 60)

    stats = report["stats"]
    print(f"\nTotal Hints Generated: {report['total_hints']}")
    print(f"Expected Hints: {stats['cascades_passed'] * 3}")
    print(f"Cascades Passed: {stats['cascades_passed']}")
    print(f"Cascades Failed: {stats['cascades_failed']}")
    print(f"Validation Pass Rate: {100 * stats['cascades_passed'] / (stats['cascades_passed'] + stats['cascades_failed']):.1f}%")

    print(f"\nDistribution by Type:")
    for hint_type, count in sorted(stats["by_type"].items()):
        print(f"  - {hint_type}: {count}")

    print(f"\nDistribution by Order (Tier):")
    for order in sorted(stats["by_order"].keys()):
        count = stats["by_order"][order]
        print(f"  - Tier {order}: {count}")

    print(f"\nWord Count Statistics:")
    word_counts = stats["word_counts"]
    if word_counts:
        print(f"  - Min: {min(word_counts)}")
        print(f"  - Max: {max(word_counts)}")
        print(f"  - Avg: {sum(word_counts) / len(word_counts):.1f}")
        print(f"  - All <= 15: {all(w <= 15 for w in word_counts)}")

    print(f"\nPoint Cost Statistics:")
    costs = stats["point_costs"]
    if costs:
        print(f"  - Min: {min(costs)}")
        print(f"  - Max: {max(costs)}")
        print(f"  - Avg: {sum(costs) / len(costs):.1f}")

    print(f"\nValidation Errors: {stats['validation_errors']}")
    if report["validation_errors"]:
        print("\n  First 5 errors:")
        for err in report["validation_errors"][:5]:
            print(f"    - {err['template_id']}: {err['error']}")

    print(f"\n5 Sample Hint Cascades:")
    for i, sample in enumerate(report["samples"][:5], 1):
        print(f"\n  Sample {i}: {sample['template_id']}")
        for hint in sample["hints"]:
            order = hint.get("order")
            hint_type = hint.get("type", "unknown")
            text = hint.get("content", {}).get("text", "")
            wc = count_words(text)
            print(f"    [{order}] {hint_type} ({wc}w): {text[:60]}...")

    print("\n" + "=" * 60)


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python validate_and_report.py <hints.json>")
        sys.exit(1)

    hints_file = Path(sys.argv[1])
    if not hints_file.exists():
        print(f"File not found: {hints_file}")
        sys.exit(1)

    report, hints = validate_hints_file(hints_file)
    print_report(report, hints)

    # Save report
    report_file = hints_file.parent / "hint_validation_report.json"
    with open(report_file, "w") as f:
        # Make report JSON-serializable
        report_clean = {
            **report,
            "stats": {
                **report["stats"],
                "by_type": dict(report["stats"]["by_type"]),
                "by_order": dict(report["stats"]["by_order"]),
            },
            "samples": report["samples"],
        }
        json.dump(report_clean, f, indent=2)
    print(f"\nReport saved to: {report_file}")
