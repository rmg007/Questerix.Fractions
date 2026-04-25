# Archetype: benchmark

## Validator
`validator.benchmark.closestBenchmark` — checks student picks closest benchmark (0, 1/2, 1).

## Payload shape
```json
{
  "fractionId":   "frac:3/8",
  "benchmarks":   ["zero", "half", "one"],
  "decimalValue": 0.375
}
```
`correctAnswer`: `"half"` (closest benchmark label)

## Typical combos by difficulty
- easy: obvious benchmarks (1/2 → half, 0/4 → zero, 4/4 → one)
- medium: near-half fractions (3/8, 5/8) where student must reason
- hard: near-zero or near-one fractions with mixed denominators (1/8 vs 2/6)

## Misconception triggers to surface
- MC-BNK-01: student maps fraction to wrong benchmark due to visual anchor bias
- MC-WHB-01: student uses numerator alone to pick benchmark

## Prompt patterns
- "Is this fraction closest to 0, one half, or 1?"
- "Where does {fraction} sit — near zero, near one half, or near one?"
- "Pick the closest landmark for {fraction}."
