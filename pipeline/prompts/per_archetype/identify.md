# Archetype: identify

## Validator
`validator.identify.exactIndex` — checks that selectedIndex matches targetIndex.

## Payload shape
```json
{
  "fractionId":   "frac:1/2",
  "distractors":  ["frac:1/3", "frac:1/4", "frac:2/3"],
  "targetIndex":  0
}
```
`correctAnswer`: integer index of the correct option in the rendered choice list (target + distractors, ordered as the runtime presents them — the runtime shuffles, so `targetIndex` only documents authoring intent, not display order).

## Required by every record
- **At least 3 distractors.** No fewer.
- All distractors must be distinct from each other AND from `fractionId`.
- Distractors must come from the fraction pool provided in the user message.

## Typical combos by difficulty
- **easy:** target is the level's central fraction (e.g., `1/2` at L1). Distractors are visually different denominators (`1/3`, `1/4`).
- **medium:** target shares a denominator with one distractor to force attention to numerator (`1/2` vs `1/3` and `2/3`).
- **hard:** distractors include a near-miss that triggers a known misconception (e.g., `2/4` as a distractor when target is `1/2` — surfaces equivalence confusion). Tag `misconceptionTraps` accordingly.

## Misconception triggers to surface
- **MC-WHB-01** (whole-number bias): include a distractor with the largest numerator the pool allows; student picks it because "bigger number = bigger".
- **MC-NOM-01** (numerator-only): include a distractor with the same numerator but different denominator; student picks based on numerator alone.

## Prompt patterns (vary across the batch)
- "Tap the picture that shows {fraction}."
- "Which shape has {fraction} shaded?"
- "Find the picture showing {fraction}."
- "Pick the shape with {fraction} colored in."
- "Choose the one that shows {fraction}."

Vary shape nouns: circle, rectangle, square, bar.
