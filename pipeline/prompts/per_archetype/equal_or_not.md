# Archetype: equal_or_not

## Validator
`validator.equal_or_not.areaTolerance` — checks whether partitioned areas are equal within tolerance.

## Payload shape
```json
{
  "shapeType":      "rectangle" | "circle",
  "partitionLines": [[[0.5, 0.0], [0.5, 1.0]]],
  "rotation":       0
}
```
`correctAnswer`: `true` (equal) | `false` (not equal)

## Typical combos by difficulty
- easy: exact 50/50 split (correct=true) or obvious 25/75 split (correct=false), rotation=0
- medium: 50/50 split with rotation 0–15°, correct=true
- hard: visually near-equal partitions differing by 5–8% (correct=false) — targets MC-EOL-03

## Misconception triggers to surface
- MC-EOL-01: student says "equal" whenever shape is symmetrical
- MC-EOL-03: student cannot distinguish visually near-equal from actually equal

## Prompt patterns
- "Are these two parts the same size?"
- "Did this shape get split into equal pieces?"
- "Do both parts look equal to you?"
