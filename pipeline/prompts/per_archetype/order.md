# Archetype: order

## Validator
`validator.order.sequence` — uses Kendall tau distance; EXACT if 0 swaps, CLOSE if 1 swap.

## Payload shape
```json
{
  "fractionIds":   ["frac:1/4", "frac:1/2", "frac:3/4"],
  "direction":     "ascending" | "descending",
  "expectedOrder": ["frac:1/4", "frac:1/2", "frac:3/4"]
}
```
`correctAnswer`: array of fractionIds in correct order.

## Typical combos by difficulty
- easy: 3 fractions, same denominator, ascending
- medium: 4 fractions, mixed denominators, ascending
- hard: 4-5 fractions, mixed families (halves + thirds + eighths), descending

## Misconception triggers to surface
- MC-WHB-01: student orders by denominator size rather than value
- MC-ORD-01: student reverses order for "descending" instruction

## Prompt patterns
- "Put these fractions in order from smallest to biggest."
- "Sort these fractions from least to greatest."
- "Arrange these fractions from biggest to smallest."
