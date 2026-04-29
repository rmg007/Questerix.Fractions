# Archetype: label

## Validator

`validator.label.exactMatch` — checks all label→region mappings match expected.

## Payload shape

```json
{
  "shapeType":   "rectangle" | "circle",
  "regionIds":   ["r0", "r1", "r2"],
  "labelOptions": ["1/2", "1/3", "1/4"],
  "expectedLabelForRegion": { "r0": "1/3", "r1": "1/3", "r2": "1/3" }
}
```

`correctAnswer`: same `expectedLabelForRegion` dict.

## Typical combos by difficulty

- easy: 2 regions with 2 label options (halves)
- medium: 3 regions, one distractor label included
- hard: 4 regions with 2 label options and equal/unequal traps

## Misconception triggers to surface

- MC-NOM-02: student labels by count of parts, not by shaded proportion
- MC-WHB-01: student matches visual size rather than fraction value

## Prompt patterns

- "Drag the right label onto each part."
- "Match each label to the correct region."
- "Label each shaded part with its fraction."
