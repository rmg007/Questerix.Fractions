# Archetype: placement

## Validator

`validator.placement.snap8` — EXACT if |placed - target| <= exactTolerance, CLOSE if <= closeTolerance, else WRONG.

## Payload shape

```json
{
  "numerator": 1,
  "denominator": 2,
  "targetLabel": "1/2",
  "snapCount": 8,
  "exactTolerance": 0.0625,
  "closeTolerance": 0.125
}
```

- `numerator` + `denominator`: the fraction to place (required)
- `targetLabel`: display label shown to student (e.g. "1/2") — defaults to numerator/denominator if omitted
- `snapCount`: number of snap divisions on the number line (default 8; use 4 for halves/quarters, 6 for thirds/sixths, 8 for eighths)
- `exactTolerance`: maximum distance for EXACT (default 0.0625 = 1/16)
- `closeTolerance`: maximum distance for CLOSE (default 0.125 = 1/8)

`correctAnswer`: decimal value of the fraction (numerator / denominator)

## Typical fraction/decimal combos by level

- L8: benchmark fractions — 1/4 (0.25), 1/2 (0.5), 3/4 (0.75), use snapCount=4
- L9: mixed families — 1/3, 2/3, 1/8, 3/8, 5/8, 7/8, use snapCount=8 or 6

## Misconception triggers to surface

- MC-WHB-01: student places 1/3 at 0.5 (half-bias)
- MC-PRX-01: student places close to benchmark but wrong side (proximity rule error)

## Prompt patterns

- "Place {fraction} on the number line."
- "Drag {fraction} to where it belongs on the line."
- "Drop {fraction} in the right spot."
