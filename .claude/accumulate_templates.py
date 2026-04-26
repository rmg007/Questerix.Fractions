"""
Run generate.py multiple times and ACCUMULATE outputs instead of overwriting.
"""
import subprocess
import json
import hashlib
from pathlib import Path
from collections import defaultdict

def payload_hash(t):
    payload = t.get('payload', {})
    return hashlib.md5(json.dumps(payload, sort_keys=True).encode()).hexdigest()

def run_generate(level, archetype, count):
    """Run generate.py and return the generated templates."""
    cmd = [
        'python3', '-m', 'pipeline.generate',
        '--level', str(level),
        '--archetype', archetype,
        '--count', str(count),
    ]
    result = subprocess.run(cmd, capture_output=True, text=True, cwd=".")
    
    # Check return code
    if result.returncode != 0:
        print(f"  ERROR: {result.stderr[:200]}")
        return []
    
    # Extract count from output
    for line in result.stdout.split('\n'):
        if 'Templates generated' in line:
            parts = line.split(':')
            if len(parts) > 1:
                try:
                    count = int(parts[1].strip())
                    print(f"  Generated {count} templates")
                    return count
                except:
                    pass
    return 0

def accumulate_and_deduplicate(level):
    """Load all templates for a level and deduplicate by payload."""
    path = Path(f"pipeline/output/level_{level:02d}/all.json")
    
    if not path.exists():
        return []
    
    with open(path) as f:
        all_templates = json.load(f)
    
    # Deduplicate
    seen_hashes = {}
    deduped = []
    for t in all_templates:
        if t.get('manual_review'):
            continue
        h = payload_hash(t)
        if h not in seen_hashes:
            seen_hashes[h] = True
            deduped.append(t)
    
    # Rewrite
    path.write_text(json.dumps(deduped, indent=2), encoding='utf-8')
    return deduped

print("=== ACCUMULATING TEMPLATES BY ARCHETYPE ===\n")

# Strategy: For each under-seeded level, generate each required archetype
# in multiple batches

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

# Generation plan: For levels needing more, request more from each archetype
gen_plan = {
    1: {'partition': 5, 'identify': 5},
    2: {'identify': 5, 'label': 3},
    3: {'identify': 5, 'label': 4},
    4: {'make': 6, 'partition': 6},
    7: {'compare': 6, 'label': 6},
    8: {'benchmark': 7, 'placement': 7},
}

for level, arch_counts in gen_plan.items():
    print(f"\nLevel {level}:")
    for arch, count in arch_counts.items():
        print(f"  Generating {arch} x {count}...", end="")
        run_generate(level, arch, count)

print("\n\n=== FINAL DEDUPLICATION ===\n")

for level in range(1, 10):
    templates = accumulate_and_deduplicate(level)
    
    arch_counts = defaultdict(int)
    for t in templates:
        arch = t.get('archetype')
        arch_counts[arch] += 1
    
    arches = ', '.join(f"{a}:{c}" for a, c in sorted(arch_counts.items()))
    need = max(0, 36 - len(templates))
    status = "AT TARGET" if len(templates) >= 36 else f"NEED {need}"
    print(f"Level {level}: {len(templates):2d}/36 [{status}] {arches}")
