# Fraction Magnitude Scales

## Overview

Kids place fractions (1/2, 1/4, 3/4, 1/3, 2/3, etc.) on a number line 0–1, with visual guides to build intuition about fraction magnitude.

## Core Mechanics

### Number Line Rendering

- Horizontal line from 0 to 1 with major tick marks (0, 1/4, 1/2, 3/4, 1)
- Optional: Minor ticks for tenths (0.1, 0.2, ..., 0.9)
- Start with fewer ticks; remove as difficulty increases
- Visual feedback: highlight when card is "close enough" to target position

### Drag & Snapping

- Touch/mouse drag to position fraction card on line
- Snap-to-grid: snap to nearest tick (configurable tolerance: 5px at 1/16 precision, 10px at 1/4)
- Visual preview: show where fraction will snap _before_ release
- Feedback: "Too far left" / "Getting closer" when dragging

### Range Validation

- Accept placement within ±1 tick of exact position (configurable)
- Color feedback: green ✓ (correct), yellow ≈ (close), red ✗ (wrong)
- Allow retry until correct; count attempts

### Adaptive Scaffolding

- **Level 1**: 2–3 fractions (1/2, 1/4, 3/4), all ticks visible
- **Level 2**: 4–5 fractions mixed denominators, major ticks only
- **Level 3**: 6+ fractions, minimal ticks, include 1/3 and 2/3
- Auto-advance after 3 consecutive correct placements

## Data Structure

```json
{
  "activity": "magnitude_scales",
  "level": 1,
  "targetFractions": [
    { "num": 1, "den": 2, "decimal": 0.5 },
    { "num": 1, "den": 4, "decimal": 0.25 },
    { "num": 3, "den": 4, "decimal": 0.75 }
  ],
  "tickMarks": ["0", "1/4", "1/2", "3/4", "1"],
  "snapTolerance": 10,
  "acceptanceTolerance": 1
}
```

## Progression

1. Visual reference: show pie chart of each fraction before placement
2. Remove pie chart; rely on number line and previous placements
3. Challenge: place fractions in random order (not left-to-right)
4. Randomize starting positions each round

## Accessibility

- Keyboard support: arrow keys to move card, Enter to confirm
- Screen reader: announce current position as percentage and fraction
- High contrast mode for ticks and labels
