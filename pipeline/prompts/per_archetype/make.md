# Archetype: make

## Validators
- `validator.make.foldAlignment` — checks partition equality then shaded count.
- `validator.make.halvingByLine` — specialised halves-only variant.

## Payload shape
```json
{
  "shapeType":        "rectangle" | "square",
  "targetPartitions": 2 | 3 | 4,
  "targetNumerator":  1,
  "areaTolerance":    0.05,
  "fractionId":       "frac:1/4"
}
```
`correctAnswer`: `{ "targetPartitions": 4, "targetNumerator": 1 }`

## Typical combos by difficulty
- easy: halves — fold once to make 2 equal parts, shade 1
- medium: quarters — fold twice, shade 1 of 4
- hard: thirds — fold to 3 equal parts, shade 2 of 3

## Misconception triggers to surface
- MC-EOL-01: student folds unevenly and assumes it is still correct
- MC-WHB-02: student shades correct count but partitions are unequal

## Prompt patterns
- "Fold this shape to show {fraction}."
- "Shade {fraction} of this rectangle."
- "Make {fraction} by folding and shading."
