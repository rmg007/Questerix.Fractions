# Activity Archetypes Registry

This registry defines the core interaction models used in the Questerix curriculum. Each archetype is a contract between the content (payload) and the interaction engine.

## Summary

| Archetype | Description | Primary Mechanic | Levels |
|---|---|---|---|
| `partition` | Split a shape into N equal parts | Manipulation | L1, L4, L5 |
| `identify` | Select the correct fraction from 2-4 options | Selection | L1, L2, L3, L5, L7 |
| `equal_or_not` | Determine if a partitioned shape has equal parts | Selection | L1, L3 |
| `label` | Drag a numeric label to a shape | Matching | L5 |
| `make` | Construct a fraction by tapping/dragging | Manipulation | L4, L5 |
| `snap_match` | Match shapes to labels or other shapes | Matching | L5, L6 |
| `compare` | Determine which of two fractions is greater | Comparison | L6, L7 |
| `benchmark` | Place or categorize a fraction relative to 0, 1/2, 1 | Placement | L8 |
| `order` | Sequence 3+ fractions from least to greatest | Sequencing | L9 |

---

## `partition`
**Description:** The student sees a whole shape and must divide it into a target number of equal parts.
**Design Principles:**
- Use for foundational concepts (halves, quarters).
- Tolerance should be tight enough to require precision but loose enough for small motor skills.
- Scaffolding: Start with axis-aligned snapping (horizontal/vertical).

## `identify`
**Description:** Traditional multiple-choice identification of a fraction representation.
**Design Principles:**
- Distractors must be pedagogically motivated (e.g., unequal parts, wrong count).
- Visual salience of all options should be equal.

## `equal_or_not`
**Description:** A binary check on the fundamental property of fractions: equal parts.
**Design Principles:**
- Crucial for diagnosing "Equal-parts blindness" (MC-EOL-01).
- Use varied shapes and rotations to ensure generalization.

## `compare`
**Description:** Side-by-side magnitude comparison.
**Design Principles:**
- "Which is more?" is the preferred prompt.
- Crucial for diagnosing "Whole-number bias" (MC-WHB-01, MC-WHB-02).

## `benchmark`
**Description:** Placing a fraction on a number line or categorizing it by its proximity to 0, 1/2, or 1.
**Design Principles:**
- Bridges area models to the number line.
- Use landmarks (0, 1/2, 1) to build magnitude intuition.

## `order`
**Description:** Arranging three or more fractions in sequence.
**Design Principles:**
- The final assessment of magnitude and equivalence.
- Requires both visual and symbolic reasoning.
