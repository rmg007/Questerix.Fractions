# Archetype: compare

## Validator
`validator.compare.greaterThan` — checks student picks the larger fraction.

## Payload shape
```json
{
  "fractionA": "frac:1/2",
  "fractionB": "frac:1/4",
  "sameDenominator": false
}
```
`correctAnswer`: `"A"` | `"B"` | `"equal"`

## Typical combos by difficulty
- easy: same denominator (1/4 vs 3/4), halves family
- medium: same numerator different denominator (1/3 vs 1/4)
- hard: cross-denominator near-benchmark pairs (3/8 vs 1/3)

## Misconception triggers to surface
- MC-WHB-01: student picks fraction with larger denominator as "bigger"
- MC-WHB-03: student picks fraction with larger numerator regardless of denominator

## Prompt patterns

Every prompt must be at least 5 words. Vary structure across the batch.

- "Tap the fraction that is bigger."
- "Which fraction shows more of the whole?"
- "Pick the larger fraction of these two."
- "Choose the fraction that is greater."
- "Which one is the bigger fraction?"
- "Find the fraction with the larger value."
- "Tap the bigger of the two fractions."

Always reference both options conceptually ("of these two", "between these"). Never use a 4-word prompt. The verifier rejects any prompt under 5 words.
