"""
Generate final coverage report after build.
Shows: templates per level, per archetype, skills covered.
"""
import json
from pathlib import Path
from collections import defaultdict

print("\n=== FINAL CURRICULUM COVERAGE REPORT ===\n")

with open('public/curriculum/v1.json') as f:
    bundle = json.load(f)

total = 0
by_level = {}

for level_key in sorted(bundle['levels'].keys()):
    templates = bundle['levels'][level_key]
    arch_counts = defaultdict(int)
    for t in templates:
        arch = t.get('archetype', 'unknown')
        arch_counts[arch] += 1
    
    total += len(templates)
    by_level[level_key] = {
        'count': len(templates),
        'by_archetype': dict(arch_counts)
    }
    
    arches = ', '.join(f"{a}:{c}" for a, c in sorted(arch_counts.items()))
    status = "TARGET" if len(templates) >= 36 else f"UNDER"
    print(f"Level {level_key}: {len(templates):3d}/36 [{status}] {arches}")

print(f"\nTotal templates in v1.json: {total}")
print(f"Target: 288 (9 levels x 36)")
target_reached = total >= 288
print(f"Status: {'REACHED' if target_reached else 'NOT REACHED'}")

# Check what's missing
print("\n=== SHORTFALL ANALYSIS ===")
shortfall_per_level = {}
for level_key in sorted(bundle['levels'].keys()):
    count = by_level[level_key]['count']
    need = max(0, 36 - count)
    if need > 0:
        shortfall_per_level[level_key] = need

if shortfall_per_level:
    total_shortfall = sum(shortfall_per_level.values())
    for level_key, need in sorted(shortfall_per_level.items()):
        print(f"Level {level_key}: needs {need} more")
    print(f"Total shortfall: {total_shortfall}")
else:
    print("All levels at or above target!")
