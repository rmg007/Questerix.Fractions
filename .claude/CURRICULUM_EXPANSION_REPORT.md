# Curriculum Template Expansion Report

## Executive Summary

**Status:** Partial completion - curriculum expanded to 199 templates in v1.json

**Objective:** Expand from 24 templates/level (216 total) to 36 templates/level (288 target)

**Final State:**

- Total templates in v1.json: 199 (69% of 288 target)
- Levels at target (36+): 2/9 (L03, L04)
- Build status: SUCCESS (npm run build completes)

---

## Generation Process

### Approach

1. Cumulative merging strategy: Generated templates per-archetype and merged by payload hash
2. Deduplication: SHA256 hash of JSON payload to identify identical questions
3. Archetype filtering: Applied LEVEL_ARCHETYPES constraints at final bundle stage

### Final Distribution

```
Level 01: 12/36  identify:9, partition:3
Level 02: 18/36  identify:6, label:12
Level 03: 36/36  identify:18, label:18  [AT TARGET]
Level 04: 48/36  make:24, partition:24  [EXCEEDS TARGET]
Level 05: 27/36  make:12, partition:15
Level 06: 28/36  compare:14, snap_match:14
Level 07: 12/36  compare:6, label:6
Level 08:  8/36  benchmark:4, placement:4
Level 09: 10/36  order:6, placement:4
Total: 199 templates
```

---

## Shortfall Analysis

| Level | Current | Target | Gap | Status    |
| ----- | ------- | ------ | --- | --------- |
| 01    | 12      | 36     | -24 | 67% under |
| 02    | 18      | 36     | -18 | 50% under |
| 03    | 36      | 36     | 0   | OK        |
| 04    | 48      | 36     | +12 | EXCEEDS   |
| 05    | 27      | 36     | -9  | 25% under |
| 06    | 28      | 36     | -8  | 22% under |
| 07    | 12      | 36     | -24 | 67% under |
| 08    | 8       | 36     | -28 | 78% under |
| 09    | 10      | 36     | -26 | 72% under |

**Total shortfall:** 89 templates (31% below target)

---

## Root Causes

### 1. LLM Generation Diversity

- Claude/Llama-3.1 models produced many semantically similar templates
- Same fraction pools yielded similar payloads
- Exact payload deduplication was aggressive but necessary

### 2. Archetype Constraints

Levels with tight constraints suffered most:

- L01: Only partition + identify allowed (many other archetypes filtered)
- L07: Only compare + label allowed
- L08: Only benchmark + placement allowed
- When generation produced all 10 archetypes, 70-80% were filtered

### 3. Deduplication Losses

Critical archetype combos had high similarity rates:

- L08 benchmark: 80% of generated templates were payload-duplicates
- L01 partition: Only 3-6 unique partition templates per generation batch
- L09 order: Limited diversity in ordering puzzle variations

---

## Build Verification

npm run build completes successfully:

- TypeScript: 0 errors
- Vite: bundles in 1.38s
- Curriculum JSON: valid, loads in browser

---

## Recommendations

### Short Term

1. Manual authoring for high-gap levels (L01, L08, L09)
   - 12-15 templates per archetype with shape/difficulty variation
2. Relax archetype constraints if pedagogically sound
   - L01 could include label
   - L08 could include order

### Medium Term

1. Procedural generation: Parameterize templates to create N variations
2. Improve LLM prompts: Add explicit diversity and variation instructions
3. Implement similarity scoring: Filter to keep most diverse set

---

## Files

- public/curriculum/v1.json: Updated with 199 templates
- pipeline/output/level_NN/all.json: Generated templates (pre-filtering)
- .claude/CURRICULUM_EXPANSION_REPORT.md: This report

**Status:** Generated 2026-04-26
