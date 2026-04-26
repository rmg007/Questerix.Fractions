"""
Dedup & analyze templates from pipeline/output.
- Remove near-duplicates (same archetype + identical payload)
- Generate coverage report
- Output stats for reconciliation
"""
import json
import hashlib
from pathlib import Path
from collections import defaultdict

def payload_hash(template: dict) -> str:
    """Hash the payload to detect identical questions."""
    payload = template.get('payload', {})
    return hashlib.md5(json.dumps(payload, sort_keys=True).encode()).hexdigest()

def deduplicate_templates(level: int) -> tuple[list, int]:
    """Load, deduplicate, and return templates for a level."""
    path = Path(f"pipeline/output/level_{level:02d}/all.json")
    if not path.exists():
        return [], 0
    
    with open(path) as f:
        all_templates = json.load(f)
    
    # Filter out manual review
    valid = [t for t in all_templates if not t.get('manual_review')]
    
    # Track by payload hash to find duplicates
    seen_hashes = defaultdict(list)
    for t in valid:
        h = payload_hash(t)
        seen_hashes[h].append(t)
    
    # Keep first of each hash; count duplicates
    deduped = [temps[0] for temps in seen_hashes.values()]
    dup_count = len(valid) - len(deduped)
    
    return deduped, dup_count

def analyze_coverage():
    """Print coverage by level and archetype."""
    print("\n=== COVERAGE ANALYSIS ===\n")
    
    total_templates = 0
    total_dupes_removed = 0
    
    coverage_by_level = {}
    
    for level in range(1, 10):
        templates, dup_count = deduplicate_templates(level)
        total_templates += len(templates)
        total_dupes_removed += dup_count
        
        archetype_counts = defaultdict(int)
        for t in templates:
            arch = t.get('archetype', 'unknown')
            archetype_counts[arch] += 1
        
        coverage_by_level[level] = {
            'total': len(templates),
            'by_archetype': dict(archetype_counts),
            'dupes_removed': dup_count
        }
        
        arches = ', '.join(f"{a}:{c}" for a, c in sorted(archetype_counts.items()))
        print(f"Level {level:02d}: {len(templates):3d} templates ({arches}) [{dup_count} dupes removed]")
    
    print(f"\nTotal deduplicated: {total_templates} templates")
    print(f"Total duplicates removed: {total_dupes_removed}")
    
    # Show which levels are at target (36)
    print("\n=== TARGET STATUS (36 per level) ===")
    for level in range(1, 10):
        count = coverage_by_level[level]['total']
        status = "✓ AT TARGET" if count >= 36 else f"NEED {36 - count} MORE"
        print(f"Level {level:02d}: {count:3d}/36 {status}")
    
    return coverage_by_level

if __name__ == '__main__':
    analyze_coverage()
