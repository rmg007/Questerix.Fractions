# Archetype: snap_match

## Validator
`validator.snap_match.equivalence` — checks that snapped fraction is equivalent (same decimal value).

## Payload shape
```json
{
  "sourceFractionId": "frac:2/4",
  "snapTargets":      [
    { "fractionId": "frac:1/2", "targetDecimal": 0.5 },
    { "fractionId": "frac:3/6", "targetDecimal": 0.5 }
  ]
}
```
`correctAnswer`: decimal value of the equivalent fraction (e.g. 0.5)

## Typical combos by difficulty
- easy: 2/4 → 1/2 (halves family only)
- medium: 2/6 → 1/3 (thirds and sixths)
- hard: 4/8 → 1/2, 2/6 → 1/3 with extra distractors

## Misconception triggers to surface
- MC-EQV-01: student matches by numerator alone (picks 2/3 for 2/4)
- MC-WHB-01: student picks fraction with same denominator, not same value

## Prompt patterns
- "Drag the fraction that matches {fraction}."
- "Find the equal fraction and snap it into place."
- "Which fraction has the same value as {fraction}?"
