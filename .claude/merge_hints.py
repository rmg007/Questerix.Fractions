#!/usr/bin/env python3
"""
Merge hints from pipeline/output/hints.json into public/curriculum/v1.json
Validates structure and reports integration metrics.
"""

import json
import sys
from pathlib import Path
from collections import defaultdict

def load_json(path):
    """Load JSON file."""
    with open(path, 'r', encoding='utf-8') as f:
        return json.load(f)

def save_json(path, data):
    """Save JSON file with formatting."""
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

def main():
    project_root = Path("C:/dev/Questerix.Fractions")
    hints_path = project_root / "pipeline/output/hints.json"
    curriculum_path = project_root / "public/curriculum/v1.json"

    # Load both files
    print("Loading hints and curriculum...")
    hints = load_json(hints_path)
    curriculum = load_json(curriculum_path)

    # Group hints by questionTemplateId
    hints_by_template = defaultdict(list)
    for hint in hints:
        qtid = hint.get("questionTemplateId")
        if qtid:
            hints_by_template[qtid].append(hint)

    # Sort hints by order for each template
    for qtid in hints_by_template:
        hints_by_template[qtid].sort(key=lambda h: h.get("order", 0))

    # Track metrics
    templates_with_hints = 0
    templates_without_hints = []
    total_hints_added = 0
    unmatched_hints = []

    # Merge hints into curriculum
    all_templates = set()
    for level_id, questions in curriculum.get("levels", {}).items():
        for question in questions:
            q_id = question.get("id")
            all_templates.add(q_id)

            if q_id in hints_by_template:
                question["hints"] = hints_by_template[q_id]
                templates_with_hints += 1
                total_hints_added += len(hints_by_template[q_id])
            else:
                templates_without_hints.append(q_id)

    # Find unmatched hints
    matched_template_ids = set()
    for level_id, questions in curriculum.get("levels", {}).items():
        for question in questions:
            if question.get("id") in hints_by_template:
                matched_template_ids.add(question.get("id"))

    for hint in hints:
        qtid = hint.get("questionTemplateId")
        if qtid not in matched_template_ids:
            unmatched_hints.append(qtid)

    # Validate: check for duplicates in curriculum
    template_ids = []
    for level_id, questions in curriculum.get("levels", {}).items():
        for question in questions:
            template_ids.append(question.get("id"))

    duplicates = [tid for tid in template_ids if template_ids.count(tid) > 1]
    unique_duplicates = list(set(duplicates))

    # Save updated curriculum
    save_json(curriculum_path, curriculum)

    # Generate report
    total_templates = len(all_templates)
    validation_status = "PASSED"
    validation_issues = []

    if unmatched_hints:
        validation_status = "FAILED"
        validation_issues.append(f"Unmatched hint template IDs: {len(set(unmatched_hints))}")

    if unique_duplicates:
        validation_status = "FAILED"
        validation_issues.append(f"Duplicate template IDs in curriculum: {len(unique_duplicates)}")

    if templates_without_hints:
        # This is not an error, just info
        pass

    report = {
        "status": validation_status,
        "summary": {
            "total_templates": total_templates,
            "templates_with_hints": templates_with_hints,
            "templates_without_hints": len(templates_without_hints),
            "total_hints_added": total_hints_added,
            "unmatched_hints": len(set(unmatched_hints)),
            "duplicate_templates": len(unique_duplicates),
        },
        "validation": {
            "status": validation_status,
            "issues": validation_issues if validation_issues else ["None"],
        },
        "details": {
            "templates_without_hints_sample": templates_without_hints[:10],
            "unmatched_hint_templates_sample": list(set(unmatched_hints))[:10],
            "duplicate_template_ids": unique_duplicates[:10],
        }
    }

    # Print report
    print("\n" + "="*70)
    print("MERGE HINTS INTEGRATION REPORT")
    print("="*70)
    print(f"\nValidation Status: {report['validation']['status']}")
    if report['validation']['issues']:
        print(f"Issues: {', '.join(report['validation']['issues'])}")

    print(f"\nMetrics:")
    print(f"  Total question templates: {report['summary']['total_templates']}")
    print(f"  Templates with hints: {report['summary']['templates_with_hints']}")
    print(f"  Total hints added: {report['summary']['total_hints_added']}")
    print(f"  Templates without hints: {report['summary']['templates_without_hints']}")
    print(f"  Unmatched hints: {report['summary']['unmatched_hints']}")
    print(f"  Duplicate templates: {report['summary']['duplicate_templates']}")

    if templates_without_hints and len(templates_without_hints) <= 10:
        print(f"\nTemplates without hints:")
        for tid in templates_without_hints:
            print(f"  - {tid}")
    elif templates_without_hints:
        print(f"\nTemplates without hints (showing first 10 of {len(templates_without_hints)}):")
        for tid in templates_without_hints[:10]:
            print(f"  - {tid}")

    if unmatched_hints:
        print(f"\nUnmatched hint template IDs (showing first 10):")
        for tid in sorted(set(unmatched_hints))[:10]:
            print(f"  - {tid}")

    if unique_duplicates:
        print(f"\nDuplicate template IDs in curriculum (showing first 10):")
        for tid in unique_duplicates[:10]:
            print(f"  - {tid}")

    print("\n" + "="*70)
    print(f"Curriculum file updated: {curriculum_path}")
    print("="*70 + "\n")

    # Save detailed report
    report_path = project_root / ".claude/reports/merge_hints_report.json"
    report_path.parent.mkdir(parents=True, exist_ok=True)
    save_json(report_path, report)
    print(f"Detailed report saved: {report_path}")

    return 0 if validation_status == "PASSED" else 1

if __name__ == "__main__":
    sys.exit(main())
