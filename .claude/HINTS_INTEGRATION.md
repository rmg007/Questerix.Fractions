# Hints Integration Guide

## Overview

The Questerix Fractions hint system provides a 3-tier progressive disclosure framework for guiding students through problem-solving without direct answers. All 71 question templates in Level 1 (Parts, Identity) have complete hint cascades, totaling 213 hints.

**Status**: Production-ready. Validation: 100% pass rate (71/71 templates complete, 3 unique hints per template).

---

## Architecture

### Hint Cascade Structure

Each question template has exactly 3 hints in a **Tier 1 → Tier 2 → Tier 3 progression**:

| Tier | Type | Purpose | Example |
|------|------|---------|---------|
| **1** | Verbal | Questioning / metacognitive prompt | "What does it mean for parts to be equal?" |
| **2** | Verbal | Guided instruction / procedural nudge | "Make sure both pieces are the same size." |
| **3** | Verbal | Explicit solution / demonstration | "Draw a line through the middle so both halves look the same." |

### ID Scheme

Hint IDs follow the pattern: `h:<archetype>:<level>:<template_id>:T<tier>`

Example: `h:pt:L1:0001:T1`
- `h` = hint artifact type
- `pt` = archetype (Parts/Thirds, Identity, etc.)
- `L1` = Level 1
- `0001` = question template index
- `T1` = Tier 1 (first hint)

---

## Data Format

### hints.json Structure

```json
[
  {
    "id": "h:pt:L1:0001:T1",
    "questionTemplateId": "q:pt:L1:0001",
    "type": "verbal",
    "order": 1,
    "content": {
      "text": "What does it mean for parts to be equal?",
      "assetUrl": null,
      "ttsKey": "tts.hint.pt.l1.0001.t1"
    },
    "pointCost": 0.0
  }
]
```

### Field Reference

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| `id` | string | Unique identifier | Concatenation of archetype, level, template, tier |
| `questionTemplateId` | string | FK to question template | Links hint to question |
| `type` | enum | `"verbal"` \| `"visual_overlay"` \| `"worked_example"` | Currently: all verbal |
| `order` | number | 1, 2, or 3 | Tier sequence (immutable) |
| `content.text` | string | Max 15 words (avg 9.2w) | Pedagogically concise |
| `content.assetUrl` | URL \| null | Optional external asset | Reserved for future visual hints |
| `content.ttsKey` | string | Dot-notation path | References audio asset in TTS system |
| `pointCost` | number | ≥ 0 (currently 0.0) | Cost to reveal hint in game |

---

## Validation & Quality Assurance

### Validation Script

Location: `pipeline/validate_and_report.py`

Automated checks:
- **Structural**: All required fields present
- **Cascade integrity**: Each template has exactly 3 hints
- **Ordering**: Hints ordered 1, 2, 3 with no gaps
- **Uniqueness**: No duplicate texts within a cascade
- **Type validation**: Type in allowed enum
- **Word count**: All hints ≤ 15 words
- **Point cost**: Consistent (all 0.0)

### Running Validation

```bash
python3 pipeline/validate_and_report.py pipeline/output/hints.json
```

Output: Printed report + JSON report at `pipeline/output/hint_validation_report.json`

### Validation Results (Current)

- Total hints: 213 (expected: 213) ✓
- Cascades passed: 71/71 (100.0%) ✓
- Validation errors: 0 ✓
- Word count: Min 5, Max 12, Avg 9.2 ✓
- All ≤ 15 words: Yes ✓
- Point costs: All 0.0 (zero-cost) ✓

---

## Integration with UI

### Discovery & Usage

1. **Question Render**: When a question template is displayed, the UI queries hints by `questionTemplateId`.
2. **Hint Revelation**: On student request or trigger, hints are revealed in tier order (1 → 2 → 3).
3. **Point Deduction**: If gamification is enabled, reveal cost is applied (currently 0).
4. **TTS Rendering**: The `ttsKey` is used to fetch audio from the TTS system for accessible delivery.

### Example Integration (Pseudocode)

```typescript
// Load hints for a question
const hints = hintsDatabase.getByTemplateId("q:pt:L1:0001");
// hints = [Tier 1, Tier 2, Tier 3] sorted by order

// Reveal hint on demand
if (student.requestsHint()) {
  const nextHintIndex = student.hintsRevealed[question.id] || 0;
  if (nextHintIndex < hints.length) {
    const hint = hints[nextHintIndex];
    
    // Apply cost
    student.points -= hint.pointCost;
    
    // Display hint
    ui.showHint(hint.content.text);
    
    // Optionally: trigger TTS
    tts.play(hint.content.ttsKey);
    
    // Track
    student.hintsRevealed[question.id] = nextHintIndex + 1;
  }
}
```

---

## Future Enhancements

### Visual & Worked Example Hints (Tier Expansion)

The framework supports additional hint types beyond verbal:

- **`visual_overlay`**: Transparent guide overlays on canvas (e.g., symmetry lines, grid subdivisions)
- **`worked_example`**: Step-by-step worked solutions with student-paced progression

Current state: All 213 hints are `type: "verbal"`. Video hints or visual overlays can be added by:

1. Creating assets (video files, SVG guides)
2. Populating `content.assetUrl` with external links
3. Changing `type` to `"visual_overlay"` or `"worked_example"`
4. Re-running validation (framework is type-agnostic)

### Scaling to Additional Levels

As new levels are created (L2, L3, etc.):

1. Generate question templates for the new level
2. Run `pipeline/generate.py` with the new level in scope
3. Validate with `pipeline/validate_and_report.py`
4. Merge hints.json into production database

The pipeline scales linearly: N templates → 3N hints.

### Gamification Tuning

Currently, all hints have `pointCost: 0.0` (free). To implement cost:

1. Update pipeline generation to assign costs per tier (e.g., Tier 1 = 0, Tier 2 = 5, Tier 3 = 10)
2. Recalculate student point scenarios
3. Test with gamification system (if integrated)

---

## Maintenance & Debugging

### Common Tasks

**Add or modify a hint**:
1. Edit or regenerate `pipeline/output/hints.json`
2. Re-run validation: `python3 pipeline/validate_and_report.py pipeline/output/hints.json`
3. If pass rate = 100%, safe to commit

**Audit hint quality**:
1. Check `pipeline/output/hint_validation_report.json` for samples
2. Review word counts (target: 8–12 words for clarity and cognitive load)
3. Ensure Tier 1 is questioning, Tier 2 is procedural, Tier 3 is explicit

**Troubleshoot validation failures**:
- **"Expected 3 hints, got N"**: Template is incomplete; regenerate
- **"Word count exceeds 15"**: Rewrite hint to be more concise
- **"Invalid type"**: Check enum; ensure type ∈ [`"verbal"`, `"visual_overlay"`, `"worked_example"`]
- **"Duplicate hint texts"**: Ensure each tier has unique content

### Performance Considerations

- **File size**: 213 hints ≈ 35 KB (JSON). Negligible for loading/caching.
- **Query speed**: Hints indexed by `questionTemplateId`; O(1) lookup.
- **TTS asset loading**: Lazy-load audio only when hint is revealed.

---

## Pedagogy & Design Rationale

### Three-Tier Structure

- **Tier 1 (Questioning)**: Reactivates prior knowledge; prompts reflection without prescribing method
- **Tier 2 (Procedural)**: Guides action; scaffolds the problem-solving process
- **Tier 3 (Explicit)**: Provides complete walkthrough; eliminates ambiguity if student is stuck

**Student Agency**: Tier 1 first respects learner autonomy; progressing to Tier 3 balances this with support.

### Word Limits (≤15 words)

- **Cognitive load**: Concise hints reduce extraneous processing; students focus on math, not reading
- **Accessibility**: Short hints are easier to read aloud and process in real-time
- **Scaffolding integrity**: Longer hints risk becoming solutions

---

## Files & References

| File | Purpose |
|------|---------|
| `pipeline/output/hints.json` | Production hints dataset (213 hints, 71 templates) |
| `pipeline/validate_and_report.py` | Validation script; generates reports |
| `pipeline/output/hint_validation_report.json` | Detailed validation results (JSON) |
| `.claude/CLAUDE.md` | Project conventions; hints status summary |
| `.claude/HINTS_INTEGRATION.md` | This document |

---

## Checklist for New Contributors

- [ ] Understand hint cascade structure (Tier 1 = question, Tier 2 = guide, Tier 3 = explicit)
- [ ] Run validation before committing: `python3 pipeline/validate_and_report.py pipeline/output/hints.json`
- [ ] Verify 100% pass rate (cascades_passed == total_templates)
- [ ] Check word counts (target 8–12w per hint, max 15w)
- [ ] If adding new levels, regenerate and validate in the same PR
- [ ] Update `.claude/CLAUDE.md` if hints scope or structure changes

---

**Last updated**: 2026-04-26  
**Validation status**: 100% pass rate (213/213 hints across 71 templates)  
**Owner**: Engineering team (hint system maintenance)
