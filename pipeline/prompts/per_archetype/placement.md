# Archetype: placement

## Validator

`validator.placement.snap8` — EXACT if |placed - target| <= 1/16, CLOSE if <= 1/8, else WRONG.

## Payload shape

```json
{
  "fractionId": "frac:1/2",
  "targetDecimal": 0.5
}
```

`correctAnswer`: same as `targetDecimal` (float 0.0–1.0)

## Typical fraction/decimal combos by level

- L1: halves only (0.5)
- L2: halves + quarters (0.25, 0.5, 0.75)
- L3–L4: thirds (0.333, 0.667)
- L5–L6: eighths (0.125, 0.375, 0.625, 0.875)
- L7–L9: mixed families, benchmark fractions

## Misconception triggers to surface

- MC-WHB-01: student places 1/3 at 0.333 but overshoots toward 0.5 (half-bias)
- MC-PLC-01: student mirrors fraction (places 3/4 at 0.25)

## Prompt patterns

- "Place {fraction} on the number line."
- "Drag {fraction} to where it belongs on the line."
- "Drop {fraction} in the right spot."
