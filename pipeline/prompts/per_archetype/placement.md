# Archetype: placement

## Validator

`validator.placement.snap8` — EXACT if |placed - target| <= exactTolerance (default 0.05), CLOSE if <= closeTolerance (default 0.15), else WRONG.

## Payload shape

```json
{
  "numerator": 1,
  "denominator": 2,
  "targetLabel": "1/2",
  "snapCount": 8,
  "exactTolerance": 0.05,
  "closeTolerance": 0.15
}
```

- `numerator` and `denominator`: define the fraction being placed.
- `targetLabel`: display label shown to the student (e.g. "1/2", "3/4").
- `snapCount`: number of snap divisions on the number line (default 8). Use 4 for fourths-only levels, 6 for sixths, 8 for mixed.
- `exactTolerance`: how close the drop must be for EXACT credit (default 0.05).
- `closeTolerance`: how close for CLOSE credit (default 0.15).
- `correctAnswer`: decimal value of the fraction (numerator / denominator).

## Typical fraction/decimal combos by level

- L8: benchmark fractions 1/2 (0.5), 1/4 (0.25), 3/4 (0.75), 1/3 (0.333), 2/3 (0.667), 1/8 (0.125), 3/8 (0.375)
- L9: mixed families including sixths and eighths, harder placements near benchmarks

## Misconception triggers to surface

- MC-PRX-01: student places fraction too close to nearest benchmark (e.g. places 3/8 at 1/2)
- MC-WHB-01: student mirrors fraction (places 3/4 at 0.25)

## Prompt patterns

- "Place {fraction} on the number line."
- "Drag {fraction} to where it belongs on the line."
- "Drop {fraction} in the right spot."
