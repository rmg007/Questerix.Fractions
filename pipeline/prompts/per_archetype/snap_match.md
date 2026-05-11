# Archetype: snap_match

## Validator

`validator.snap_match.equivalence` — checks that snapped pairs match the expectedPairs list.

## Payload shape

```json
{
  "leftItems": [
    { "id": "a", "label": "2/4", "numerator": 2, "denominator": 4 },
    { "id": "b", "label": "1/3", "numerator": 1, "denominator": 3 }
  ],
  "rightItems": [
    { "id": "c", "label": "1/2", "numerator": 1, "denominator": 2 },
    { "id": "d", "label": "2/6", "numerator": 2, "denominator": 6 }
  ],
  "expectedPairs": [["a", "c"], ["b", "d"]]
}
```

`correctAnswer`: list of matched pair IDs, e.g. `[["a","c"],["b","d"]]`

## Typical combos by difficulty

- easy: one pair — 2/4 → 1/2 (halves family only)
- medium: two pairs — 2/6 → 1/3, 2/4 → 1/2 (thirds and sixths)
- hard: three pairs with extra distractors — mixed families

## Rules

- All IDs must be unique across leftItems and rightItems.
- Each left item pairs with exactly one right item in expectedPairs.
- Include at least one distractor item per side that has no valid match.

## Misconception triggers to surface

- MC-EQV-01: student matches by numerator alone (picks 2/3 for 2/4)
- MC-WHB-01: student picks fraction with same denominator, not same value

## Prompt patterns

- "Drag each fraction on the left to its equal match on the right."
- "Match the fractions that have the same value."
- "Find the equal pairs and snap them together."
