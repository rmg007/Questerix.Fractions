# Archetype: snap_match

## Validator

`validator.snap_match.equivalence` — checks that snapped pair is correct.

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

- `leftItems` and `rightItems`: arrays of items to match. Each item has `id` (unique string), `label` (e.g. "1/2"), and optionally `numerator`/`denominator`.
- `expectedPairs`: array of `[leftId, rightId]` pairs that are correct matches.
- `correctAnswer`: decimal value of the primary correct match (e.g. 0.5 for 1/2).

## Typical combos by difficulty

- easy: 2 left + 2 right, same denominator family (halves/fourths)
- medium: 2 left + 3 right (one distractor), cross-family (halves/sixths)
- hard: 3 left + 4 right (two distractors), full pool

## Misconception triggers to surface

- MC-EQV-01: student matches by numerator alone (picks 2/3 for 2/4)
- MC-WHB-01: student picks fraction with same denominator, not same value

## Prompt patterns

- "Match each fraction on the left to its equal on the right."
- "Drag each fraction to its matching partner."
- "Find the equal pairs and connect them."
