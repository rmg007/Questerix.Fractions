import os
import re
import json

def parse_misconceptions_doc(file_path):
    mc_ids = []
    if not os.path.exists(file_path):
        return mc_ids
    
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
        
    # Match both old #### format and new ## format
    matches = re.finditer(r'##+ (MC-[A-Z]+-[0-9]+) — (.*)', content)
    for match in matches:
        mc_id = match.group(1)
        # Find the Detector field in the following text
        next_pos = content.find('##', match.end())
        if next_pos == -1:
            next_pos = len(content)
        
        section = content[match.end():next_pos]
        detector_match = re.search(r'\*\*Detector:\*\* (.*)', section)
        detector = detector_match.group(1).strip() if detector_match else "unknown"
        
        mc_ids.append({
            "id": mc_id,
            "detector_name": detector
        })
    return mc_ids

def parse_detectors(file_path):
    detectors = {}
    if not os.path.exists(file_path):
        return detectors
    
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
        
    # Find exported functions detectXXX
    matches = re.finditer(r'export function (detect[A-Z0-9]+)\((.*?)\)', content)
    for match in matches:
        name = match.group(1)
        # Check if it's a placeholder (very short body or returns null always)
        # For simplicity, we'll check if it has more than a few lines of logic
        start_pos = content.find('{', match.end())
        # Basic curly brace matching
        depth = 0
        end_pos = -1
        for i in range(start_pos, len(content)):
            if content[i] == '{': depth += 1
            elif content[i] == '}': depth -= 1
            if depth == 0:
                end_pos = i
                break
        
        body = content[start_pos:end_pos+1]
        is_placeholder = "return null;" in body and len(body.splitlines()) < 10
        
        detectors[name] = "placeholder" if is_placeholder else "active"
        
    return detectors

def count_baiting_templates(bundle_path):
    counts = {}
    if not os.path.exists(bundle_path):
        return counts
    
    with open(bundle_path, 'r', encoding='utf-8') as f:
        bundle = json.load(f)
        
    for level, templates in bundle.get('levels', {}).items():
        for t in templates:
            traps = t.get('misconceptionTraps', [])
            if isinstance(traps, str):
                traps = [traps]
            for mc_id in traps:
                counts[mc_id] = counts.get(mc_id, 0) + 1
                
    return counts

def main():
    root = "."
    mc_doc = os.path.join(root, "docs/10-curriculum/misconceptions.md")
    detector_file = os.path.join(root, "src/engine/misconceptionDetectors.ts")
    bundle_file = os.path.join(root, "src/curriculum/bundle.json")
    
    mcs = parse_misconceptions_doc(mc_doc)
    detectors = parse_detectors(detector_file)
    counts = count_baiting_templates(bundle_file)
    
    report = []
    all_ids = set([m['id'] for m in mcs] + list(counts.keys()))
    
    for mc_id in sorted(all_ids):
        doc_entry = next((m for m in mcs if m['id'] == mc_id), None)
        has_doc = doc_entry is not None
        detector_name = doc_entry['detector_name'] if doc_entry else "unknown"
        
        detector_status = detectors.get(detector_name, "missing")
        if detector_name == "unknown":
             detector_status = "unknown"
             
        baiting_count = counts.get(mc_id, 0)
        
        status = "ok"
        if not has_doc:
            status = "fail: missing doc"
        elif detector_status == "placeholder":
            status = "fail: detector placeholder"
        elif detector_status == "missing":
            status = f"fail: detector {detector_name} missing"
        elif baiting_count < 5:
            status = f"fail: insufficient baiting ({baiting_count} < 5)"
            
        report.append({
            "mc_id": mc_id,
            "doc": has_doc,
            "detector": detector_status,
            "templates_baiting": baiting_count,
            "status": status
        })
        
    output_path = os.path.join(root, "pipeline/output/parity-report.json")
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(report, f, indent=2)
        
    print(f"Parity report generated at {output_path}")
    
    # Print a summary table
    print("\n| MC ID | Doc | Detector | Baiting | Status |")
    print("|---|---|---|---|---|")
    for r in report:
        print(f"| {r['mc_id']} | {r['doc']} | {r['detector']} | {r['templates_baiting']} | {r['status']} |")

if __name__ == "__main__":
    main()
