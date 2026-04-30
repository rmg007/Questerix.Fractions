# Fraction Ordering Tournament

## Overview

Kids sort 4–6 fractions (mixed denominators) from smallest to largest. This builds fluency in multi-fraction comparison and requires strategic thinking about which fractions to compare first.

## Core Mechanics

### Drag-Sort UI

- Display fractions as draggable cards in random order
- Target order shown as numbered slots below (1, 2, 3, 4, 5, 6)
- Kids drag cards into slots to arrange them
- Visual feedback: slot highlights on drag-over, shows "drop here"
- Snap behavior: card snaps to nearest empty slot on release

### Model Toggle

- Default: show pie-chart model for each fraction (takes up space)
- Toggle button: "Hide Models" to reduce visual clutter for advanced kids
- Toggle button: "Show Number Line" to display all fractions on a 0–1 number line as reference
- Models update dynamically if fractions change position

### Validation & Feedback

- **On drop**: Check if order is correct so far
  - All correct: "Perfect! Next round."
  - Partially correct: "Getting closer! [n] out of [total] in right order."
  - Completely wrong: "Not quite. Try swapping [A] and [B]."
- **Tie-breaking logic**: If two fractions are equal (e.g., 2/4 = 1/2), accept either order

### Tie-Breaking Logic

```pseudocode
if fraction[i] == fraction[i+1]:
  // Both orders are acceptable
  acceptOrder(either)
else:
  // Enforce strict order
  require(fraction[i] < fraction[i+1])
```

## Progression

### Level 1: Simple Denominators (4–5 fractions)

- Fractions: 1/4, 1/2, 3/4, 1/5, 4/5
- Models shown by default
- Feedback generous ("Getting closer")

### Level 2: Mixed Denominators (4–6 fractions)

- Fractions: 1/6, 1/3, 3/5, 2/8, 4/6
- Models shown; number-line toggle available
- Feedback more concise ("Not quite")

### Level 3: Challenge Round (5–6 fractions, trickier)

- Fractions: 2/7, 3/8, 4/9, 5/10, 6/11
- Models hidden by default (toggle available)
- Feedback: Just "correct" or "incorrect", encourage retry

### Level 4: Speed Round (Bonus)

- 6 fractions, 60-second timer
- No models; number line available
- Leaderboard: fastest correct time

## Data Structure

```json
{
  "activity": "ordering_tournament",
  "level": 2,
  "fractions": [
    { "num": 1, "den": 6, "position": 2 },
    { "num": 1, "den": 3, "position": 3 },
    { "num": 3, "den": 5, "position": 5 },
    { "num": 2, "den": 8, "position": 1 },
    { "num": 4, "den": 6, "position": 4 }
  ],
  "correctOrder": [
    { "num": 2, "den": 8 },
    { "num": 1, "den": 6 },
    { "num": 1, "den": 3 },
    { "num": 4, "den": 6 },
    { "num": 3, "den": 5 }
  ],
  "timeSpent": 45.2,
  "attempts": 1
}
```

## Accessibility

- Keyboard support: Tab to navigate cards, Arrow keys to move, Enter to place
- Screen reader: Announce current order and suggested moves
- Alternative: Spoken order via audio button instead of visual arrangement
