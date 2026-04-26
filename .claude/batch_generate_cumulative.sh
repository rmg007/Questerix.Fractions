#!/bin/bash
cd "C:/dev/Questerix.Fractions"

# For each level and archetype, we need to:
# 1. Back up existing output
# 2. Run generate.py
# 3. Merge with backup
# 4. Deduplicate

python3 << 'PYTHON'
import json
import hashlib
import subprocess
from pathlib import Path
from collections import defaultdict

def payload_hash(t):
    payload = t.get('payload', {})
    return hashlib.md5(json.dumps(payload, sort_keys=True).encode()).hexdigest()

def load_templates(path):
    """Load templates, return dict keyed by payload hash."""
    if not path.exists():
        return {}
    with open(path) as f:
        data = json.load(f)
    
    result = {}
    for t in data:
        if not t.get('manual_review'):
            h = payload_hash(t)
            if h not in result:  # Keep first of duplicates
                result[h] = t
    return result

def save_templates(path, templates_dict):
    """Save templates from dict."""
    templates = list(templates_dict.values())
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(templates, indent=2), encoding='utf-8')

def run_and_merge(level, archetype, count):
    """Generate and merge with existing templates."""
    path = Path(f"pipeline/output/level_{level:02d}/all.json")
    
    # Load existing
    existing = load_templates(path)
    
    # Generate
    cmd = ['python3', '-m', 'pipeline.generate',
           '--level', str(level),
           '--archetype', archetype,
           '--count', str(count)]
    
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        print(f"L{level} {archetype}: FAILED")
        return 0
    
    # Load new output
    new = load_templates(path)
    
    # Merge (new overrides existing by payload hash)
    merged = {**existing, **new}
    
    # Save
    save_templates(path, merged)
    
    new_count = len(new)
    print(f"L{level:02d} {archetype:15s}: +{new_count:2d} templates (total now {len(merged)})")
    return new_count

print("=== CUMULATIVE GENERATION ===\n")

# Generation plan - focusing on highest needs
plans = [
    (8, 'benchmark', 10),
    (8, 'placement', 10),
    (1, 'partition', 10),
    (1, 'identify', 10),
    (4, 'make', 10),
    (4, 'partition', 10),
    (7, 'compare', 10),
    (7, 'label', 10),
    (3, 'identify', 10),
    (3, 'label', 10),
    (2, 'identify', 10),
    (2, 'label', 5),
    (5, 'make', 5),
    (5, 'partition', 3),
    (6, 'compare', 3),
    (6, 'snap_match', 3),
    (9, 'order', 3),
    (9, 'placement', 3),
]

for level, arch, count in plans:
    run_and_merge(level, arch, count)

print("\n=== FINAL STATE ===\n")

LEVEL_ARCHETYPES = {
    1: ['partition', 'identify'],
    2: ['identify', 'label'],
    3: ['identify', 'label'],
    4: ['make', 'partition'],
    5: ['make', 'partition'],
    6: ['compare', 'snap_match'],
    7: ['compare', 'label'],
    8: ['benchmark', 'placement'],
    9: ['order', 'placement'],
}

total = 0
for level in range(1, 10):
    path = Path(f"pipeline/output/level_{level:02d}/all.json")
    templates = load_templates(path)
    
    approved = LEVEL_ARCHETYPES[level]
    valid = [t for h, t in templates.items() if t.get('archetype') in approved]
    
    arch_counts = defaultdict(int)
    for t in valid:
        arch_counts[t.get('archetype')] += 1
    
    arches = ', '.join(f"{a}:{c}" for a, c in sorted(arch_counts.items()))
    total += len(valid)
    need = max(0, 36 - len(valid))
    status = "AT TARGET" if len(valid) >= 36 else f"NEED {need}"
    print(f"Level {level}: {len(valid):2d}/36 [{status}] {arches}")
    
    # Save filtered version
    save_templates(path, {h: t for h, t in templates.items() if t.get('archetype') in approved})

print(f"\nTotal: {total} templates")

PYTHON
