# Phase 0b-1 Templates: Quick Reference

## At a Glance

| Level | Archetype | Count | File | Skills | Tiers |
|-------|-----------|-------|------|--------|-------|
| L8 | benchmark | 28 | `level_08/hand-authored.json` | SK-27, SK-28, SK-29 | E8/M10/H10 |
| L9 | order | 13 | `level_09/hand-authored-order.json` | SK-30, SK-31, SK-32, SK-33 | E4/M5/H4 |
| L9 | placement | 13 | `level_09/hand-authored-placement.json` | SK-27, SK-31, SK-33 | E4/M5/H4 |
| **TOTAL** | — | **54** | 3 files | 7 skills | **E16/M20/H18** |

## Sample IDs

**L8 Benchmarks:**
- `q:bmk:L8:0001` (easy) — 2/4 → half
- `q:bmk:L8:0009` (medium) — 5/10 → half
- `q:bmk:L8:0019` (hard) — 13/26 → half

**L9 Order:**
- `q:ord:L9:0001` (easy) — [1/4, 2/4, 3/4]
- `q:ord:L9:0005` (medium) — [1/4, 1/3, 1/2]
- `q:ord:L9:0010` (hard) — [3/4, 5/4, 1, 7/4]

**L9 Placement:**
- `q:plc:L9:0001` (easy) — 1/10 at 0.1
- `q:plc:L9:0005` (medium) — 1/2 at 0.5
- `q:plc:L9:0010` (hard) — 5/12 at 0.417

## Misconception Coverage

- **MC-WHB-01** (Whole-Number Bias): L8 only
- **MC-WHB-02** (Inverse Denominator): L9 Order only
- **MC-DNM-01** (Denominator Bias): L8 + L9 Placement

## Validators Used

- `validator.benchmark.closestBenchmark` (L8)
- `validator.order.compareMultiple` (L9 order)
- `validator.placement.withinTolerance` (L9 placement)

## Phase 2 Inputs

These 54 templates are inputs to Phase 2 (Bundle Merge):
- L3–L7 templates: TBD (Phase 1.1–1.5)
- L8–L9 templates: 54 (this phase, ready now)
- **Final bundle: 234–288 templates** (after L3–L7 generation)

## Status

✓ Generated  
✓ Validated  
✓ Schema-compliant  
✓ Ready for Phase 1.1–1.5  

---

For full details, see: `PLANS/phase_0b1_completion_report.md`
