#!/usr/bin/env python3
"""Phase 0: Fix validator IDs, duplicate IDs, math errors, and standardIds in curriculum v1.json"""

import json
import sys
from pathlib import Path
from collections import defaultdict
from typing import Dict, List, Tuple, Set

# Mapping of old validator IDs to new ones
VALIDATOR_ID_MAPPING = {
    'validator.label.exactMatch': 'validator.label.matchTarget',
    'validator.make.foldAlignment': 'validator.make.foldAndShade',
    'validator.compare.greaterThan': 'validator.compare.relation',
    'validator.snap_match.equivalence': 'validator.snap_match.allPairs',
    'validator.benchmark.closestBenchmark': 'validator.benchmark.sortToZone',
}

# Standard ID mapping by level
STANDARD_MAPPING = {
    '01': ['K.NF.A.1', 'K.G.A.1'],
    '02': ['1.NF.A.1', '1.NF.A.3a'],
    '03': ['2.NF.A.1', '2.NF.A.3a'],
    '04': ['2.NF.A.1', '2.NF.A.2'],
    '05': ['2.NF.A.1', '2.NF.A.2'],
    '06': ['2.NF.A.2', '2.NF.A.3a'],
    '07': ['2.NF.A.2', '2.NF.A.3a'],
    '08': ['2.NF.A.3', '2.NF.A.4'],
    '09': ['2.NF.A.3', '2.NF.A.4'],
}

# L6 skill IDs fix
L6_SKILL_IDS = ['SK-21', 'SK-22', 'SK-23']

def fix_validator_ids(curriculum: dict) -> int:
    """Fix C0.0 validator ID renames"""
    count = 0
    for level, templates in curriculum['levels'].items():
        for template in templates:
            old_id = template.get('validatorId')
            if old_id in VALIDATOR_ID_MAPPING:
                template['validatorId'] = VALIDATOR_ID_MAPPING[old_id]
                count += 1
    print("[C0.0] Fixed %d validator IDs" % count)
    return count

def fix_duplicate_ids(curriculum: dict) -> int:
    """Fix C0.0c duplicate IDs by adding tier suffix"""
    # Build a map of occurrence counts per (template_id, level)
    occurrence_count = defaultdict(int)
    count = 0

    # First pass: count occurrences and identify which ones need fixing
    for level, templates in curriculum['levels'].items():
        for template in templates:
            template_id = template['id']
            key = (template_id, level)
            occurrence_count[key] += 1

    # Second pass: fix duplicates
    occurrence_idx = defaultdict(int)  # Track which occurrence we're at
    for level, templates in curriculum['levels'].items():
        for template in templates:
            template_id = template['id']
            key = (template_id, level)

            # If this template_id appears multiple times in this level
            if occurrence_count[key] > 1:
                # This is a duplicate within the level, add tier suffix
                tier = template.get('difficultyTier', 'easy')
                # Only add suffix if not already present
                if '-' not in template_id:
                    new_id = "%s-%s" % (template_id, tier)
                    template['id'] = new_id
                    count += 1

    print("[C0.0c] Fixed %d duplicate IDs" % count)
    return count

def fix_l1_fractions(curriculum: dict) -> int:
    """Fix C0.0b L1 identify templates to use only halves"""
    count = 0
    l1_templates = curriculum['levels'].get('01', [])

    for template in l1_templates:
        if template.get('archetype') == 'identify':
            payload = template.get('payload', {})
            fraction_id = payload.get('fractionId', '')

            # Replace non-binary fractions with halves
            if fraction_id in ['frac:1/3', 'frac:2/3', 'frac:1/4', 'frac:3/4']:
                payload['fractionId'] = 'frac:1/2'
                # Adjust distractors to be other halves variants
                payload['distractors'] = ['frac:0/2', 'frac:1/2', 'frac:2/2']
                count += 1

    print("[C0.0b L1] Fixed %d L1 identify templates" % count)
    return count

def fix_l9_order_hard(curriculum: dict) -> int:
    """Fix C0.0b L9 order hard fractions to descending"""
    count = 0
    l9_templates = curriculum['levels'].get('09', [])

    for template in l9_templates:
        if (template.get('archetype') == 'order' and
            template.get('id') == 'q:ord:L9:0001' and
            template.get('difficultyTier') == 'hard'):

            payload = template.get('payload', {})
            if payload.get('direction') == 'descending':
                # Expected order should be descending
                expected = payload.get('expectedOrder', [])
                if expected == ['frac:1/2', 'frac:2/3', 'frac:1/3', 'frac:3/4', 'frac:1/4']:
                    payload['expectedOrder'] = ['frac:3/4', 'frac:2/3', 'frac:1/2', 'frac:1/3', 'frac:1/4']
                    template['correctAnswer'] = ['frac:3/4', 'frac:2/3', 'frac:1/2', 'frac:1/3', 'frac:1/4']
                    count += 1

    print("[C0.0b L9] Fixed %d L9 order hard templates" % count)
    return count

def fix_l6_skillids(curriculum: dict) -> int:
    """Fix C0.0d L6 templates to use correct skillIds"""
    count = 0
    l6_templates = curriculum['levels'].get('06', [])

    for template in l6_templates:
        archetype = template.get('archetype', '')
        if archetype in ['compare', 'snap_match']:
            template['skillIds'] = L6_SKILL_IDS
            count += 1

    print("[C0.0d L6] Fixed %d L6 skillIds" % count)
    return count

def add_standard_ids(curriculum: dict) -> int:
    """Fix C0.0e add standardIds to all templates"""
    count = 0
    for level, templates in curriculum['levels'].items():
        standard_ids = STANDARD_MAPPING.get(level, [])

        for template in templates:
            if 'standardIds' not in template:
                template['standardIds'] = standard_ids
                count += 1
            elif not template.get('standardIds'):
                template['standardIds'] = standard_ids
                count += 1

    print("[C0.0e] Added standardIds to %d templates" % count)
    return count

def validate_all_validator_ids(curriculum: dict, valid_ids: Set[str]) -> Tuple[int, List[str]]:
    """Validate that all validatorIds exist in registry"""
    errors = []
    count = 0

    for level, templates in curriculum['levels'].items():
        for template in templates:
            validator_id = template.get('validatorId')
            if validator_id not in valid_ids:
                errors.append("Level %s, Template %s: unknown validatorId '%s'" % (level, template.get('id'), validator_id))
                count += 1

    return count, errors

def main():
    curriculum_path = Path('public/curriculum/v1.json')

    if not curriculum_path.exists():
        print("ERROR: %s not found" % curriculum_path)
        sys.exit(1)

    # Load curriculum
    with open(curriculum_path) as f:
        curriculum = json.load(f)

    print("Phase 0 Fixes Starting...\n")

    # C0.0: Validator ID fixes
    fix_validator_ids(curriculum)

    # C0.0c: Duplicate ID fixes
    fix_duplicate_ids(curriculum)

    # C0.0b: Math fixes
    fix_l1_fractions(curriculum)
    fix_l9_order_hard(curriculum)

    # C0.0d: L6 skillIds
    fix_l6_skillids(curriculum)

    # C0.0e: standardIds
    add_standard_ids(curriculum)

    # Validate
    valid_validator_ids = {
        'validator.benchmark.sortToZone',
        'validator.compare.relation',
        'validator.equal_or_not.areaTolerance',
        'validator.identify.exactIndex',
        'validator.label.matchTarget',
        'validator.make.foldAndShade',
        'validator.make.halvingByLine',
        'validator.order.sequence',
        'validator.partition.equalAreas',
        'validator.partition.equalCount',
        'validator.placement.snap8',
        'validator.placement.snapTolerance',
        'validator.snap_match.allPairs',
    }

    error_count, errors = validate_all_validator_ids(curriculum, valid_validator_ids)

    # Check for duplicate IDs
    all_ids = []
    for level, templates in curriculum['levels'].items():
        for template in templates:
            all_ids.append(template['id'])

    unique_ids = set(all_ids)
    duplicate_id_count = len(all_ids) - len(unique_ids)

    print("\nValidation Results:")
    print("  Total templates: %d" % len(all_ids))
    print("  Unique IDs: %d" % len(unique_ids))
    print("  Duplicate IDs: %d" % duplicate_id_count)
    print("  Invalid validatorIds: %d" % error_count)

    if errors:
        print("\nValidator ID Errors:")
        for err in errors[:5]:
            print("  %s" % err)
        if len(errors) > 5:
            print("  ... and %d more" % (len(errors) - 5))

    if error_count == 0 and duplicate_id_count == 0:
        # Save fixed curriculum
        with open(curriculum_path, 'w') as f:
            json.dump(curriculum, f, indent=2)
        print("\nAll fixes applied and validated successfully!")
        print("Curriculum saved to %s" % curriculum_path)
    else:
        print("\nValidation failed. Not saving.")
        sys.exit(1)

if __name__ == '__main__':
    main()
