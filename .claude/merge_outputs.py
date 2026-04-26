"""
Merge multiple generations into pipeline/output while deduplicating.
Reads from pipeline/output/level_NN/all.json files and does in-place merge.
"""
import json
import hashlib
from pathlib import Path
from collections import defaultdict

def payload_hash(template):
    payload = template.get('payload', {})
    return hashlib.md5(json.dumps(payload, sort_keys=True).encode()).hexdigest()

def deduplicate_and_save(level):
    path = Path(f"pipeline/output/level_{level:02d}/all.json")
    if not path.exists():
        return 0, 0
    
    with open(path) as f:
        all_templates = json.load(f)
    
    valid = [t for t in all_templates if not t.get('manual_review')]
    
    seen_hashes = defaultdict(list)
    for t in valid:
        h = payload_hash(t)
        seen_hashes[h].append(t)
    
    deduped = [temps[0] for temps in seen_hashes.values()]
    dup_count = len(valid) - len(deduped)
    
    path.write_text(json.dumps(deduped, indent=2), encoding='utf-8')
    
    return len(deduped), dup_count

print("=== DEDUPLICATING PIPELINE OUTPUTS ===\n")

total = 0
removed = 0
for level in range(1, 10):
    count, dupes = deduplicate_and_save(level)
    if count > 0:
        total += count
        removed += dupes
        print(f"Level {level:02d}: {count} templates (removed {dupes} duplicates)")

print(f"\nTotal: {total} templates (removed {removed} duplicates)")
