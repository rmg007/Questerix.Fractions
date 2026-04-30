# Archetype: partition

## Validator

`validator.partition.equalAreas` — checks that all regions have equal area within tolerance.

## Payload shape

```json
{
  "shapeType":        "rectangle" | "circle" | "square",
  "targetPartitions": 2 | 3 | 4 | 6 | 8,
  "areaTolerance":    0.05
}
```

`correctAnswer`: `true` (student drew equal partitions — verifier checks geometry)

## Typical partition combos by difficulty (level-appropriate)

- **L1 (halves only):** all records target `targetPartitions: 2`. Vary shape across rectangle, circle, and square. Do not emit records with N != 2.
- **easy tier (L1):** rectangle, vertical or horizontal split obvious.
- **medium tier (L1):** circle or rotated rectangle; the equal-cut isn't axis-aligned.
- **hard tier (L1):** irregular but still symmetric shape (e.g., wide rectangle with subtle off-center marker that must be ignored).
- L2+: introduces thirds, fourths, etc. — see per-level prompts.

`fractionId` is **not** used by partition; the field can be omitted from payload. Use `targetPartitions` and `shapeType` only.

## Misconception triggers to surface

- MC-WHB: student treats partitioned shape as whole-number count
- MC-EOL: student guesses "equal" when parts look similar but differ by 5–8%

## Prompt patterns

- "Split this shape into {N} equal parts."
- "Draw {N} equal pieces on the rectangle."
- "Divide the circle into {N} equal parts."
