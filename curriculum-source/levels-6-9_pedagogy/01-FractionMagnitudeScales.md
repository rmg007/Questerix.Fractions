# Fraction Magnitude Scales — Full Design Document

## Table of Contents

1. Overview & Pedagogical Rationale
2. Number Line Rendering
3. Touch & Mouse Drag Mechanics
4. Snap Grid Calculation
5. Range Validation System
6. Visual Feedback System
7. Adaptive Scaffolding
8. Fraction Bank (Levels 1–5)
9. Hint System
10. Extension Variants
11. Edge Cases
12. Full Data Structures
13. UI Layout Mockups
14. Accessibility
15. Teacher Controls

---

## 1. Overview & Pedagogical Rationale

### Core Activity Summary

Students drag fraction cards onto a horizontal 0–1 number line, placing each fraction at its correct magnitude position. The activity scales from fully scaffolded (labeled tick marks, pie chart previews, direction hints) to independent (endpoint-only, no aids, optional timer).

### Why Number-Line Placement Beats Pie Charts Alone

Research in mathematics education consistently shows that circular area models (pie charts) develop part-whole understanding but do not reliably build **magnitude intuition** — the sense of how large a fraction is relative to other fractions. Pie charts are bounded representations: students learn that 3/4 fills more of the circle than 1/4, but they do not develop a feel for _where_ fractions live on a continuous scale.

The **mental number line** is a well-documented cognitive construct (Dehaene, 1997; Siegler & Booth, 2004) in which numerical magnitude is represented spatially, from left (small) to right (large). Interventions that directly train children to place numbers on a number line — rather than simply recognize or compare them — produce faster, more durable gains in number sense. The specific act of _dragging_ a fraction to a position forces students to commit to a magnitude estimate before receiving feedback, which strengthens encoding far more than passive observation.

For Grade 2, the 0–1 interval is the correct scope: students have not yet encountered improper fractions, and the benchmark 1/2 provides a natural splitting point that supports the benchmark strategy practiced in activity 02. Building the number-line representation early means that when students encounter mixed numbers in Grade 3, they already possess an internalized spatial scaffold.

### Learning Goals (CCSS Alignment)

- **2.G.A.3** — Partition circles and rectangles into equal shares; describe as halves, thirds, fourths (foundational)
- **3.NF.A.2** — Represent a fraction a/b on a number line diagram (direct target)
- **3.NF.A.3d** — Compare two fractions with the same numerator or same denominator (supported)

### Connection to Other Activities

This activity directly feeds **02-FractionBenchmarkBattle** (which formalizes the 1/2 anchor) and **03-FractionComparisons** (ordering multiple fractions). The placement heatmap collected here informs the diagnostic data used by the adaptive engine to sequence future activities.

---

## 2. Number Line Rendering

### SVG Layout

The number line is rendered as an SVG element inside a responsive container `div`. The SVG uses a fixed internal coordinate space of 1000 × 120 units, scaled to fill the available container width. This ensures consistent touch targets regardless of device width.

```
SVG viewBox="0 0 1000 120"
  Internal left margin:   60px  (space for "0" label)
  Internal right margin:  60px  (space for "1" label)
  Effective line span:    880px (x=60 to x=940)
  Line y-position:        60    (vertical center)
  Tick zone above line:   y=20 to y=60
  Label zone below line:  y=66 to y=90
  Card drop zone:         y=10 to y=110 (full hit zone)
```

### Tick System

Tick marks are grouped into three categories that are individually toggled per level:

**Major ticks** — appear at benchmark positions (0, 1/4, 1/2, 3/4, 1). Height: 28px above the line. Stroke width: 2.5px. Color: `#334155` (dark slate).

**Minor ticks** — appear at 1/8 intervals (1/8, 3/8, 5/8, 7/8). Height: 14px above the line. Stroke width: 1.5px. Color: `#94a3b8` (muted slate).

**Micro ticks** — appear at 1/16 intervals if denominator-16 fractions are in the bank. Only visible in Level 1 when denominator-16 fractions appear. Height: 7px. Stroke width: 1px. Color: `#cbd5e1`.

Labels sit 6px below the tick base, centered on the tick x-position. Font: `system-ui, sans-serif`, 16px, weight 600. Endpoint labels ("0" and "1") are always shown regardless of level.

#### Tick Visibility Table

| Level | Major (0 ¼ ½ ¾ 1) | Minor (⅛ intervals) | Micro (1/16) | Labels       |
| ----- | ----------------- | ------------------- | ------------ | ------------ |
| 1     | Shown             | Shown               | If needed    | All labeled  |
| 2     | Shown             | Hidden              | Hidden       | All major    |
| 3     | 0, ½, 1 only      | Hidden              | Hidden       | 0 and 1 only |
| 4     | 0 and 1 only      | Hidden              | Hidden       | 0 and 1 only |
| 5     | 0 and 1 only      | Hidden              | Hidden       | None (clean) |

### Color Zone Bands

Two passive background bands paint the line at render time:

- **Left band** `[0, 0.5)`: fill `#dbeafe` (light blue), opacity 0.4
- **Right band** `[0.5, 1]`: fill `#fed7aa` (light orange), opacity 0.4

The bands are `rect` elements behind all other SVG elements. They are never labeled; their purpose is perceptual priming — students naturally begin to associate "less than one-half" with the blue zone and "greater than one-half" with the orange zone before the benchmark concept is formally named.

At Level 4 and above, the band opacity reduces to 0.15 to minimize the cue without removing it entirely.

### Responsive Scaling

The SVG `viewBox` remains fixed at 1000 × 120. The outer container uses `width: 100%; max-width: 900px` with `aspect-ratio: 1000 / 120`. On devices narrower than 480px (phones), a vertical layout stacks the card tray above the number line and the line is rendered full-width. The minimum usable width is 320px; below that, a horizontal-scroll wrapper activates.

Font sizes within the SVG are specified in SVG user units (not CSS px), so they scale proportionally with the viewBox transform.

---

## 3. Touch & Mouse Drag Mechanics

### Pointer Event Handling

All drag interactions use the Pointer Events API to unify mouse, touch, and stylus inputs. There is no separate touch-event handler; `pointerdown`, `pointermove`, and `pointerup` cover all device types.

```typescript
card.addEventListener('pointerdown', onDragStart);
window.addEventListener('pointermove', onDragMove);
window.addEventListener('pointerup', onDragEnd);
```

On `pointerdown`, `setPointerCapture` is called on the card element so that `pointermove` events continue to fire even if the pointer leaves the card bounds. This prevents "drop on no-target" bugs during fast drags.

### Card Lift Animation

When drag begins (pointerdown confirmed for >80ms to distinguish from taps on mobile):

- Card scales from `1.0` to `1.08` over 120ms (CSS transition)
- Drop shadow increases: `0 8px 24px rgba(0,0,0,0.18)`
- Card z-index rises to 100
- The card's original slot in the tray shows a ghost placeholder (faded outline, same size) so the tray layout does not collapse

The 80ms hold threshold prevents accidental drag initiation when the student taps a fraction to read it.

### Ghost Preview System

During drag, a **ghost card** tracks the nearest snap position in real time:

- Ghost is a semi-transparent copy of the card (opacity 0.45)
- Ghost renders in the SVG `PlacedCardsGroup` layer at the snapped x-position
- Ghost shows the fraction label at the snapped position
- A thin dashed vertical line descends from the snap position on the number line to the tick zone, acting as a placement guide
- Ghost updates on every `pointermove` event; updates are throttled to 60fps via `requestAnimationFrame`

On `pointerup`, the real card animates from its dragged position to the ghost position over 200ms (cubic-bezier ease-out), then the ghost disappears.

### Direction Feedback Tooltip

While the card is being dragged (not yet released), a small tooltip above the ghost indicates proximity to the target. The tooltip is only shown after the first `pointermove` event — not immediately on `pointerdown` — to avoid visual noise.

| Distance from Target Decimal    | Tooltip Text                 |
| ------------------------------- | ---------------------------- |
| ≤ 0.10                          | "Almost there!"              |
| 0.10–0.25                       | "Getting closer"             |
| > 0.25, card is left of target  | "Move a little to the right" |
| > 0.25, card is right of target | "Move a little to the left"  |

Tooltip auto-dismisses on release. Tooltip is suppressed entirely at Level 4+ (it constitutes implicit scaffolding).

---

## 4. Snap Grid Calculation

### Design Rationale

The snap grid prevents students from placing a fraction at a nonsensical sub-pixel position. The grid resolution is tied to the level's denominator precision — finer at early levels (more guidance), coarser at later levels (more challenge).

### Full TypeScript Implementation

```typescript
interface SnapConfig {
  denominator: number; // grid divisions
  pixelTolerance: number; // px radius around snap point for acceptance
  clampToEndpoints: boolean; // prevent placement beyond 0 or 1
}

const SNAP_CONFIGS: Record<number, SnapConfig> = {
  1: { denominator: 8, pixelTolerance: 14, clampToEndpoints: true },
  2: { denominator: 8, pixelTolerance: 12, clampToEndpoints: true },
  3: { denominator: 12, pixelTolerance: 10, clampToEndpoints: true },
  4: { denominator: 12, pixelTolerance: 8, clampToEndpoints: true },
  5: { denominator: 24, pixelTolerance: 6, clampToEndpoints: true },
};

/**
 * Returns the SVG x-coordinate of the nearest snap position.
 *
 * @param pointerX     - current pointer x in SVG user units
 * @param lineStartX   - x of the "0" endpoint (typically 60)
 * @param lineEndX     - x of the "1" endpoint (typically 940)
 * @param level        - current game level (1–5)
 */
function nearestSnapPosition(
  pointerX: number,
  lineStartX: number,
  lineEndX: number,
  level: number
): number {
  const config = SNAP_CONFIGS[level] ?? SNAP_CONFIGS[5];
  const lineWidth = lineEndX - lineStartX;
  const unitWidth = lineWidth / config.denominator;

  // Convert pointer to a position relative to line start
  const relativeX = pointerX - lineStartX;

  // Find nearest grid index
  const rawUnit = relativeX / unitWidth;
  const nearestUnit = Math.round(rawUnit);

  // Clamp to valid range [0, denominator]
  const clampedUnit = config.clampToEndpoints
    ? Math.max(0, Math.min(config.denominator, nearestUnit))
    : nearestUnit;

  return lineStartX + clampedUnit * unitWidth;
}

/**
 * Converts a snap position back to a decimal fraction value [0, 1].
 */
function snapPositionToDecimal(snapX: number, lineStartX: number, lineEndX: number): number {
  return (snapX - lineStartX) / (lineEndX - lineStartX);
}
```

### Pixel Tolerance Table by Level

| Level | Snap Denominator | Pixel Tolerance | Notes                                       |
| ----- | ---------------- | --------------- | ------------------------------------------- |
| 1     | 8                | 14px            | 1/8 grid; very forgiving for first exposure |
| 2     | 8                | 12px            | Same grid, tighter window                   |
| 3     | 12               | 10px            | Supports thirds and sixths                  |
| 4     | 12               | 8px             | Precision required                          |
| 5     | 24               | 6px             | Supports 12ths; challenge precision         |

### Why Denominator 12 for Levels 3–4

Denominator 12 is the LCM of 3, 4, and 6 — the three denominator families introduced in Levels 3–4. Using 12 divisions means that fractions with denominators 3 (4/12 intervals), 4 (3/12 intervals), and 6 (2/12 intervals) all align to snap grid positions without remainder. This prevents frustrating near-misses where the correct decimal falls between snap points.

---

## 5. Range Validation System

### Acceptance Window Formula

After the card drops to its snap position, the placed decimal is compared against the target decimal:

```typescript
type PlacementState = 'EXACT' | 'CLOSE' | 'WRONG';

interface ValidationResult {
  state: PlacementState;
  error: number;
  placedDecimal: number;
  targetDecimal: number;
}

function validatePlacement(
  snapX: number,
  lineStartX: number,
  lineEndX: number,
  targetDecimal: number,
  level: number
): ValidationResult {
  const config = SNAP_CONFIGS[level] ?? SNAP_CONFIGS[5];
  const placedDecimal = snapPositionToDecimal(snapX, lineStartX, lineEndX);
  const error = Math.abs(placedDecimal - targetDecimal);

  // EXACT: placed decimal matches target to within floating-point precision
  // (i.e., they snapped to the same grid position)
  const exactThreshold = 0.5 / config.denominator;

  // CLOSE: within one grid division of target
  const closeThreshold = 1.0 / config.denominator;

  let state: PlacementState;
  if (error <= exactThreshold) {
    state = 'EXACT';
  } else if (error <= closeThreshold) {
    state = 'CLOSE';
  } else {
    state = 'WRONG';
  }

  return { state, error, placedDecimal, targetDecimal };
}
```

### State Definitions

**EXACT** — The placed snap position is the closest grid position to the true target decimal. The fraction is correct. This is the only state that earns full points.

**CLOSE** — The placed position is one snap division away from the target. The student is directionally correct but imprecise. Earns partial credit. Does not trigger retry on Levels 1–2 (encouragement mode), but does trigger retry on Levels 3–5.

**WRONG** — The placed position is two or more snap divisions from the target. Always triggers retry.

### Retry Logic

```
EXACT  → card locks, full points, next card activates
CLOSE  → Level 1-2: card locks (partial points, "Almost!"); Level 3-5: card bounces, retry
WRONG  → card bounces back to tray, attempt count increments
         3rd WRONG on same fraction → assisted placement mode (see below)
```

### Assisted Placement (3-Wrong Reveal)

After three failed attempts on the same fraction:

1. The ghost card moves to the correct position and pulses with a gold border
2. An audio cue plays: a soft chime to signal "here it is"
3. The text prompt reads: "Let's place it together. See where it goes?"
4. The student must still drag the card to the ghost position (not teleported) — the act of dragging reinforces the motor-spatial encoding
5. Placement recorded as `assisted: true`; score contribution is 10% of normal

### Score Model

```typescript
interface PlacementResult {
  fraction: { num: number; den: number };
  targetDecimal: number;
  placedDecimal: number;
  error: number;
  state: PlacementState;
  attempts: number; // 1 = first try, 2 = second try, 3+ = third+
  assisted: boolean; // true if ghost-guided after 3 fails
  hintsUsed: number; // 0–3
  timeMs: number; // milliseconds from card activation to placement
  pointsEarned: number; // see scoring table below
}

// Points earned by (state, attempts, hintsUsed):
//   EXACT, attempts=1, hints=0 → 100
//   EXACT, attempts=1, hints>0 → 70
//   EXACT, attempts=2, hints=0 → 60
//   EXACT, attempts=2, hints>0 → 40
//   CLOSE, any               → 25 (Level 1-2 only; 0 on Level 3+)
//   assisted                 → 10
```

---

## 6. Visual Feedback System

### Correct Placement (EXACT)

1. **Color Glow**: The card briefly flashes with a green glow (`box-shadow: 0 0 20px #22c55e`), expanding from the center over 180ms then fading over 300ms.
2. **Tick Mark Growth**: The nearest tick mark on the number line animates from its current height to full height (36px) in 200ms. The tick changes color to match the card's accent color.
3. **Label Materialization**: The fraction label appears below the grown tick mark with a fade-in over 150ms.
4. **Lock State**: Card's drag handlers are removed. Card receives `data-locked="true"` attribute. Cursor changes to `default`.
5. **Confirmation Sequence**: A small star particle effect (4 stars, CSS keyframe animation) radiates from the card center and fades over 400ms.

### Close Placement (CLOSE, Levels 1–2)

1. Yellow-gold glow (`box-shadow: 0 0 16px #eab308`).
2. Tooltip: "Almost! Just a tiny bit off."
3. Card locks with partial fill (tick mark grows to 60% height, color `#fbbf24`).
4. At Level 3+, the card instead bounces back (see WRONG behavior below) and a tooltip says "Not quite — try again!"

### Wrong Placement (WRONG)

1. **Red Flash**: Card flashes red-orange (`#ef4444`) for 80ms.
2. **Bounce Back**: Card animates from snap position back to the tray slot over 300ms (spring easing: tension 200, friction 20).
3. **Direction Indicator**: An arrow appears on the number line pointing left or right, indicating which direction the student needs to move. Arrow fades after 1.5 seconds.
4. **Attempt Counter**: Beneath the fraction in the tray, a small pip indicator shows attempt count (dot for each attempt, max 3 shown).

### Locked Card State

Once a card is locked (placed correctly), it is visually distinguished:

- Reduced opacity to 0.7 (still readable, but clearly "done")
- No hover effect
- Strikethrough on the fraction in the tray if a tray label is present
- The snap position on the number line shows a permanent label

---

## 7. Adaptive Scaffolding

### Overview

Scaffolding is dynamically adjusted across four axes: (a) visual aids on the number line, (b) hints and tooltips, (c) snap grid precision, and (d) the fraction bank complexity. The system tracks performance across rounds within a session and across sessions over time.

### Scaffold Level 1 — Fully Guided

**Visible aids:**

- All major ticks, all minor ticks, all labels
- Color bands at full opacity (0.4)
- Pie chart thumbnail beside each fraction card (always visible)
- Direction instruction on first card: "1/4 goes near the first mark to the right of 0"
- Snap grid: denominator 8 (very forgiving)

**Fraction bank:** 1/4, 1/2, 3/4 only (halves and fourths).

**Typical session duration:** 5–8 minutes. Goal: build the basic spatial mapping before any strategy is required.

### Scaffold Level 2 — Semi-Guided

**Visible aids:**

- Major ticks only (0, 1/4, 1/2, 3/4, 1), with labels
- Color bands at 0.3 opacity
- Pie chart available via toggle button (not shown by default)
- Direction tooltips during drag remain active
- Snap grid: denominator 8, tighter tolerance

**Fraction bank:** 1/4, 1/2, 3/4, 1/3, 2/3.

**Auto-advancement from Scaffold 1 to 2:** 3 consecutive EXACT placements at Scaffold 1, or 5 correct (any quality) in one session.

### Scaffold Level 3 — Benchmark-Aware

**Visible aids:**

- 0, 1/2, 1 ticks with labels
- Color bands at 0.2 opacity (subtle priming only)
- No pie chart in any form
- Direction tooltips during drag: active
- Snap grid: denominator 12

**Fraction bank:** 1/4, 1/3, 1/2, 2/3, 3/4, 1/6, 5/6.

**Strategy prompting:** A collapsible tip card says "Fractions less than 1/2 go in the blue zone. Is your fraction bigger or smaller than 1/2?" This surfaces the benchmark strategy explicitly.

### Scaffold Level 4 — Independent

**Visible aids:**

- 0 and 1 endpoints only (no 1/2 tick)
- Color bands removed (opacity 0)
- No tooltips during drag
- No pie charts, no direction aids
- Snap grid: denominator 12, tolerance 8px
- Optional timer: 90 seconds for full round (timer unlocks leaderboard)

**Fraction bank:** All Level 1–3 fractions plus 1/8, 3/8, 5/8, 7/8.

### Scaffold Level 5 — Expert

**Visible aids:**

- Endpoint labels only ("0" and "1"), no tick marks at all
- Clean white number line
- Snap grid: denominator 24
- Timer: always active (90 seconds), required for scoring

**Fraction bank:** Adds 1/12, 5/12, 7/12, 11/12, and random mixed selections from all lower levels.

### Auto-Advancement Logic

```typescript
interface SessionPerformance {
  consecutiveExact: number;
  consecutiveAssisted: number;
  totalCorrect: number;
  totalAttempts: number;
}

function evaluateAdvancement(
  perf: SessionPerformance,
  currentScaffold: number
): 'advance' | 'stay' | 'regress' {
  // Advance criteria
  if (perf.consecutiveExact >= 3) return 'advance';
  if (perf.totalCorrect >= 5 && perf.totalAttempts <= 7) return 'advance';

  // Regression criteria
  if (perf.consecutiveAssisted >= 2 && currentScaffold > 1) return 'regress';
  if (perf.totalCorrect < 2 && perf.totalAttempts >= 6) return 'regress';

  return 'stay';
}
```

After two consecutive 'regress' evaluations across separate sessions, the system shows a teacher notification: "Student may need targeted review of [denominator family]."

### Session-to-Session Scaffold Removal Schedule

| Session Number | Default Scaffold Level  | Pie Chart | Minor Ticks | Color Bands    |
| -------------- | ----------------------- | --------- | ----------- | -------------- |
| 1st            | 1                       | Always on | Shown       | Full (0.4)     |
| 2nd            | 1 or 2 (by performance) | Toggle    | Shown       | Full (0.4)     |
| 3rd            | 2                       | Toggle    | Hidden      | Reduced (0.25) |
| 4th            | 2 or 3                  | Hidden    | Hidden      | Subtle (0.15)  |
| 5th+           | By performance          | Hidden    | Hidden      | Phase out      |

---

## 8. Fraction Bank (Levels 1–5)

### Design Principles

Fractions are introduced in denominator families, ordered by cognitive difficulty:

1. **Halves and fourths** — symmetrical, easy to visualize
2. **Thirds** — requires non-symmetric partitioning; introduces repeating decimals
3. **Sixths** — LCM of 2 and 3; connects halves and thirds
4. **Eighths** — extends fourths; binary subdivision
5. **Twelfths** — LCM of 3 and 4; appears in clocks and music notation

### Level 1 Fraction Bank

| Fraction | Decimal | Notes                      |
| -------- | ------- | -------------------------- |
| 1/2      | 0.500   | The anchor benchmark       |
| 1/4      | 0.250   | Leftmost visible tick mark |
| 3/4      | 0.750   | Rightmost labeled position |

### Level 2 Fraction Bank (adds thirds)

| Fraction | Decimal | Notes                 |
| -------- | ------- | --------------------- |
| 1/2      | 0.500   | Retained from Level 1 |
| 1/4      | 0.250   | Retained              |
| 3/4      | 0.750   | Retained              |
| 1/3      | 0.333   | Between 1/4 and 1/2   |
| 2/3      | 0.667   | Between 1/2 and 3/4   |

Why thirds here: After fourths are mastered, thirds provide the first example of a fraction that does not align to a binary subdivision. Placing 1/3 (0.333) near but not at the 1/4 tick requires the student to reason beyond tick-mark matching.

### Level 3 Fraction Bank (adds sixths)

| Fraction              | Decimal | Notes             |
| --------------------- | ------- | ----------------- |
| All Level 2 fractions |         |                   |
| 1/6                   | 0.167   | Between 0 and 1/4 |
| 5/6                   | 0.833   | Between 3/4 and 1 |

Why sixths: 1/6 and 5/6 are mirror images about 1/2, reinforcing symmetry. They also extend the thirds family (1/6 = half of 1/3), giving students a connection back to known fractions.

### Level 4 Fraction Bank (adds eighths)

| Fraction              | Decimal | Notes               |
| --------------------- | ------- | ------------------- |
| All Level 3 fractions |         |                     |
| 1/8                   | 0.125   | Quarter of 1/2      |
| 3/8                   | 0.375   | Between 1/4 and 1/2 |
| 5/8                   | 0.625   | Between 1/2 and 3/4 |
| 7/8                   | 0.875   | Between 3/4 and 1   |

### Level 5 Fraction Bank (adds twelfths)

| Fraction              | Decimal | Notes                             |
| --------------------- | ------- | --------------------------------- |
| All Level 4 fractions |
| 1/12                  | 0.0833  | Close to 1/8; fine discrimination |
| 5/12                  | 0.4167  | Just below 1/2                    |
| 7/12                  | 0.5833  | Just above 1/2                    |
| 11/12                 | 0.9167  | Close to 1; near-endpoint         |

Each round at Level 5 draws 5 fractions randomly from the full bank, with the constraint that at least one fraction falls on each side of 1/2 and no two fractions are within 0.08 decimal distance of each other (to prevent perceptual ambiguity in placement).

---

## 9. Hint System

### Hint 1 — Pie Chart Reveal

Available at all levels; costs 0 points at Levels 1–2, costs 5 points at Levels 3–5.

A circular pie chart (80px diameter) pops up above the fraction card showing the fraction as a shaded sector. The label beneath reads: "This fraction fills [n] out of [d] equal parts of a circle."

The pie chart is animated: the sector sweeps from 0 to the correct angle over 600ms, then pulses once.

Trigger: student taps the fraction card and holds for 500ms (hold-to-hint pattern, avoids accidental activation).

### Hint 2 — Number Line Ghost

Available at Levels 2+; costs 0 points at Level 2, costs 10 points at Levels 3–5.

The ghost card moves to the correct position on the number line and pulses (opacity oscillates between 0.3 and 0.7, period 800ms). The student can see exactly where the fraction belongs without having dragged there. A tooltip reads: "This is where [fraction] lives on the number line."

After this hint is shown, the student has 5 seconds to drag the card to the ghost position. If they do not act, the hint fades and they continue normally.

### Hint 3 — Arrow Direction

Available at all levels; costs 0 points at Level 1, costs 15 points at Levels 2–5.

A directional arrow appears on the number line pointing toward the correct region. The arrow is rendered as an SVG path with an animated pulse. If the placed card is to the left of the target, the arrow points right (and vice versa). The arrow is region-based, not exact-position:

- Far left of target (error > 0.25): "Your fraction is much further right"
- Slightly left of target (error 0.10–0.25): "Move a little to the right"
- Same applies mirrored for rightward errors.

### Hint Escalation Logic

```typescript
type HintType = 'pie' | 'ghost' | 'arrow';

function getNextHint(
  wrongAttempts: number,
  hintsUsedTypes: HintType[],
  level: number
): HintType | null {
  const allHints: HintType[] = ['pie', 'ghost', 'arrow'];
  const remaining = allHints.filter((h) => !hintsUsedTypes.includes(h));

  // At Level 1: all hints free, offer immediately
  if (level <= 2 && wrongAttempts >= 1 && remaining.length > 0) {
    return remaining[0];
  }

  // At Levels 3–5: escalate by wrong attempt count
  if (wrongAttempts === 1 && !hintsUsedTypes.includes('pie')) return 'pie';
  if (wrongAttempts === 2 && !hintsUsedTypes.includes('arrow')) return 'arrow';
  if (wrongAttempts >= 3 && !hintsUsedTypes.includes('ghost')) return 'ghost';

  return null;
}
```

### Hint Cost Per Level Summary

| Hint Type  | Level 1 | Level 2 | Level 3 | Level 4 | Level 5 |
| ---------- | ------- | ------- | ------- | ------- | ------- |
| Pie Chart  | 0 pts   | 0 pts   | 5 pts   | 5 pts   | 10 pts  |
| Arrow Dir. | 0 pts   | 5 pts   | 10 pts  | 15 pts  | 20 pts  |
| Ghost Pos. | 0 pts   | 0 pts   | 10 pts  | 15 pts  | 25 pts  |

---

## 10. Extension Variants

### Reverse Mode

**Mechanic:** Instead of being given a fraction label to place, the student is given a position (a marked dot on the number line) and must identify which fraction card belongs there. Cards are shown in a grid; student drags the matching card to the marked dot.

**Why:** Reverses the cognitive direction — from magnitude-to-symbol rather than symbol-to-magnitude. Research suggests bidirectional training accelerates number-line fluency.

**Availability:** Unlocks after student completes Level 3 in standard mode.

**Scoring:** Same EXACT/CLOSE/WRONG states, same snap tolerance, same hint system.

### Speed Scales

**Mechanic:** Standard drag-and-drop, but a 60-second timer runs for the whole round. Points are scored per correct placement; bonus multiplier (1.2x) applies if the round is completed with time remaining.

**Visual:** A progress bar at the top of the screen depletes left-to-right in 60 seconds. Color transitions: green (>30s) → yellow (15–30s) → red (<15s). The progress bar pulses at 10 seconds remaining.

**Timer pause:** One pause per round, for accessibility. Pausing freezes the timer and overlays a dim screen. Resuming restarts with a 3-second countdown.

**Availability:** Unlocks after Level 2 completion.

### Estimation Mode

**Mechanic:** Snap grid is disabled. The student drops the card anywhere on the continuous line. Scoring uses a tolerance window scaled to the level. The goal is to develop analog (non-symbolic) fraction magnitude intuition.

**Scoring:** Error is measured in decimal distance. Tiers: |error| ≤ 0.05 → EXACT (100 pts); ≤ 0.10 → CLOSE (60 pts); ≤ 0.20 → NEAR (30 pts); > 0.20 → WRONG (0 pts).

**Availability:** Unlocks after Level 4 completion. Most cognitively demanding mode.

---

## 11. Edge Cases

### Fractions Equal to 0 or 1

Fractions 0/n (= 0) and n/n (= 1) may appear in the bank at Level 5 as "trick" cards. They snap exactly to the endpoints. Visual behavior: the card lands on the "0" or "1" label position; the endpoint label pulses to indicate correct placement. Score: full EXACT credit.

### Near-1 Mixed Numbers

The activity scope is 0–1 only. Fractions like 7/6 (> 1) are not included. If the adaptive engine mistakenly surfaces one (e.g., due to a data entry error in the teacher's custom fraction pool), the engine clamps it to 1.0 and logs a warning to the teacher dashboard.

### Duplicate Fractions in the Same Round

Equivalent fractions (e.g., 2/4 and 1/2) are prevented from appearing in the same round by the round-builder validation step:

```typescript
function hasDuplicateDecimal(fractions: Fraction[], tolerance = 0.001): boolean {
  const decimals = fractions.map((f) => f.num / f.den);
  for (let i = 0; i < decimals.length; i++) {
    for (let j = i + 1; j < decimals.length; j++) {
      if (Math.abs(decimals[i] - decimals[j]) < tolerance) return true;
    }
  }
  return false;
}
```

If the teacher's custom pool forces a duplicate, the UI renders both cards but locks them to the same snap position and awards full points for either placement, with a note: "These fractions are equivalent — they go in the same spot!"

### Very Close Fractions (< 0.05 apart)

At Level 5, fractions within 0.05 decimal distance of each other are intentional challenges (e.g., 5/12 = 0.417 vs 3/7 = 0.429). The snap grid at Level 5 (denominator 24) has a snap interval of ~0.042, which is fine enough to distinguish them. The ghost preview becomes especially important here; students are encouraged to count snap steps from a known anchor.

---

## 12. Full Data Structures

### Activity Config (JSON)

```json
{
  "activity": "magnitude_scales",
  "version": "2.1.0",
  "level": 3,
  "scaffoldLevel": 3,
  "targetFractions": [
    { "num": 1, "den": 4, "decimal": 0.25, "denominatorFamily": "fourths" },
    { "num": 1, "den": 3, "decimal": 0.3333, "denominatorFamily": "thirds" },
    { "num": 1, "den": 2, "decimal": 0.5, "denominatorFamily": "halves" },
    { "num": 2, "den": 3, "decimal": 0.6667, "denominatorFamily": "thirds" },
    { "num": 5, "den": 6, "decimal": 0.8333, "denominatorFamily": "sixths" }
  ],
  "tickConfig": {
    "major": [0, 0.5, 1],
    "minor": [],
    "showLabels": ["0", "1"]
  },
  "snapConfig": {
    "denominator": 12,
    "pixelTolerance": 10,
    "clampToEndpoints": true
  },
  "colorBands": {
    "left": { "range": [0, 0.5], "color": "#dbeafe", "opacity": 0.2 },
    "right": { "range": [0.5, 1], "color": "#fed7aa", "opacity": 0.2 }
  },
  "showPieChart": false,
  "pieChartToggleAvailable": false,
  "directionTooltipsActive": true,
  "timer": null,
  "hintCosts": { "pie": 5, "arrow": 10, "ghost": 10 }
}
```

### Round Record (JSON)

```json
{
  "roundId": "ms_round_00042",
  "sessionId": "ms_2026_04_24_001",
  "studentId": "s_abc123",
  "level": 3,
  "fractionSequence": [
    {
      "fraction": { "num": 1, "den": 3, "decimal": 0.3333 },
      "targetDecimal": 0.3333,
      "placedDecimal": 0.3333,
      "snapPositionX": 353.3,
      "state": "EXACT",
      "attempts": 1,
      "assisted": false,
      "hintsUsed": 0,
      "hintTypes": [],
      "pointsEarned": 100,
      "timeMs": 4120
    },
    {
      "fraction": { "num": 5, "den": 6, "decimal": 0.8333 },
      "targetDecimal": 0.8333,
      "placedDecimal": 0.75,
      "snapPositionX": 720,
      "state": "WRONG",
      "attempts": 2,
      "assisted": false,
      "hintsUsed": 1,
      "hintTypes": ["arrow"],
      "pointsEarned": 60,
      "timeMs": 9840
    }
  ],
  "totalPoints": 160,
  "maxPoints": 200,
  "accuracy": 0.8
}
```

### Session Summary (JSON)

```json
{
  "sessionId": "ms_2026_04_24_001",
  "studentId": "s_abc123",
  "date": "2026-04-24",
  "startLevel": 3,
  "endLevel": 3,
  "advancedLevel": false,
  "rounds": 3,
  "totalFractionsPlaced": 15,
  "exactPlacements": 10,
  "closePlacements": 3,
  "wrongPlacements": 2,
  "assistedPlacements": 1,
  "totalHintsUsed": 4,
  "hintBreakdown": { "pie": 2, "arrow": 1, "ghost": 1 },
  "totalPoints": 1080,
  "avgTimePerPlacementMs": 5300,
  "denominatorFamiliesPracticed": ["thirds", "sixths", "fourths"],
  "placementHeatmap": {
    "0.333": { "attempts": [0.333, 0.333, 0.25] },
    "0.833": { "attempts": [0.75, 0.833] }
  },
  "scaffoldRecommendation": "stay"
}
```

---

## 13. UI Layout Mockups

### Level 1 (Full Scaffolding, 480px wide phone)

```
┌──────────────────────────────────────────┐
│  Fraction Magnitude Scales    [?] Help   │
├──────────────────────────────────────────┤
│                                          │
│  Place the fraction on the number line!  │
│                                          │
│  0────┬────┬────┬────┬────┬────┬────1  │
│       ⅛   ¼   ⅜   ½   ⅝   ¾   ⅞       │
│       [blue zone] [orange zone]          │
│                                          │
│  ┌──────────────────────────────────┐    │
│  │ Fraction Tray                    │    │
│  │  [¼][pie]  [½][pie]  [¾][pie]   │    │
│  └──────────────────────────────────┘    │
│                                          │
│  [💡 Hint]          Round 1 of 3        │
└──────────────────────────────────────────┘
```

### Level 2 (Semi-Guided, 768px tablet)

```
┌─────────────────────────────────────────────────────┐
│  Fraction Magnitude Scales              [👁 Pie? 🔇] │
├─────────────────────────────────────────────────────┤
│                                                     │
│  Where does each fraction go?                       │
│                                                     │
│  0─────────────¼─────────────½─────────────¾────1  │
│  [      blue zone            ][   orange zone     ] │
│                                                     │
│  ┌───────────────────────────────────────────────┐  │
│  │  [1/3]  [2/3]  [1/4]  [3/4]  [1/2]          │  │
│  └───────────────────────────────────────────────┘  │
│  [💡 Hint]    2 placed    Round 2 of 4    [⏸ Pause] │
└─────────────────────────────────────────────────────┘
```

### Level 4 (Independent, 1024px desktop)

```
┌──────────────────────────────────────────────────────────────────┐
│  Fraction Magnitude Scales                     ⏱ 00:72 remaining │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  0────────────────────────────────────────────────────────────1  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │  [1/8]  [3/8]  [5/8]  [7/8]  [1/3]  [2/3]  [1/6]      │    │
│  └──────────────────────────────────────────────────────────┘    │
│  [💡 -5pts]    5 placed    Round 3 of 5    Score: 420 ★★★☆☆     │
└──────────────────────────────────────────────────────────────────┘
```

### Level 5 / Expert Mode (1280px desktop with heatmap panel)

```
┌────────────────────────────────────────────────────────────────────────┐
│  Fraction Magnitude Scales — Expert Mode              ⏱ 00:58          │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  0──────────────────────────────────────────────────────────────────1  │
│                                                                        │
│  ┌────────────────────────────────────────────────────────────────┐    │
│  │  [1/12] [5/12] [7/12] [11/12] [3/8] [5/8] [1/3] [2/3] [3/4] │    │
│  └────────────────────────────────────────────────────────────────┘    │
│                                                                        │
│  Score: 840     Accuracy: 87%     Best Streak: 6     [🏆 Leaderboard]  │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 14. Accessibility

### Keyboard Navigation

The activity is fully operable without a mouse or touchscreen.

| Key             | Action                                         |
| --------------- | ---------------------------------------------- |
| Tab / Shift+Tab | Move focus between fraction cards in the tray  |
| Enter / Space   | Pick up the focused card (begin keyboard drag) |
| Left Arrow      | Move card one snap step to the left            |
| Right Arrow     | Move card one snap step to the right           |
| Enter / Space   | Confirm placement at current position          |
| Escape          | Cancel placement, return card to tray          |
| H               | Request next hint for currently active card    |
| P               | Pause timer (Speed Scales and Level 4+)        |

When a card is "picked up" via keyboard, a focus ring surrounds the snap position cursor on the number line, and a live region announces the current decimal position as the student moves ("one-eighth, twelve percent of the way").

### Screen Reader Announcements

The activity maintains a visually hidden `aria-live="polite"` region that announces:

- Card activation: "Picked up [fraction name]. Use left and right arrow keys to move."
- Position during movement: "At one-quarter, twenty-five percent."
- Placement result: "Correct! One-third placed at thirty-three percent." or "Not quite. Try moving to the right."
- Hint activation: full hint text including instruction.

Fraction names use full English words in announcements: "one-third", "five-sixths", "seven-eighths".

### High Contrast Mode

Detected via `prefers-color-scheme: high-contrast` and a manual toggle in the accessibility panel.

- Color zone bands replaced with diagonal hatch patterns (SVG `pattern` fills), not colors
- Tick marks increase to 3px stroke width
- Fraction cards use border-only style (no fill color) with thick 3px border
- Glow feedback replaced with bold stroke animations (border thickness pulses from 2px to 6px)
- All interactive elements meet WCAG AA 4.5:1 contrast minimum

### Motor Accessibility

For students with limited fine motor control:

- **Large snap tolerance mode**: snap tolerance increases to 24px (configurable in teacher settings)
- **Dwell click**: student can hold the pointer still for 800ms at a snap position to trigger placement (avoids needing to release)
- **Switch access**: compatible with 1-switch and 2-switch scanning via the keyboard navigation system
- **Card size**: cards can be enlarged to 1.5x via accessibility panel (scales all touch targets proportionally)

### Audio Descriptions

When audio descriptions are enabled (in accessibility panel):

- Each fraction card is read aloud when focused, including its full name and an optional contextual phrase ("one-third — that's less than one-half")
- Number line zones are described at the start of each round: "The number line goes from zero on the left to one on the right."
- Placement confirmation includes the position as a percentage: "Placed correctly at thirty-three percent."

All audio uses the device's speech synthesis API with fallback to pre-recorded audio clips for unreliable network environments.

---

## 15. Teacher Controls

### Dashboard Panel: Level & Fraction Management

Teachers access a per-student or per-class configuration panel with the following controls:

**Level Locking**

- Lock a student to a specific scaffold level (prevents auto-advancement and auto-regression)
- Unlock specific levels (e.g., allow a student to skip straight to Level 3)
- Set a "ceiling level" (student cannot advance beyond a chosen level until teacher unlocks)

**Custom Fraction Pool**

- Replace the default fraction bank with a custom set
- Input format: comma-separated fraction strings, e.g., `1/2, 1/4, 3/4, 1/3`
- Validation: engine checks for decimal uniqueness (no equivalents in same pool), range [0,1], denominator ≤ 24
- Custom pools are saved per student; class-level defaults are also configurable

### Placement Heatmap

The teacher dashboard displays a visual heatmap of where each student has placed each fraction across all sessions. The heatmap overlays placement dots on a small number line thumbnail:

- Green dot: EXACT placement
- Yellow dot: CLOSE placement
- Red dot: WRONG placement
- Grey dot: assisted placement

Cluster analysis flags fractions where a student consistently places in the wrong direction (e.g., always places 1/3 to the right of 1/2), which suggests a specific misconception rather than random error.

**Export:** Heatmap data is exportable as CSV with columns: studentId, fraction, placedDecimal, targetDecimal, state, date, sessionId.

### Class-Level Reports

- Per-denominator-family accuracy aggregated across class
- "Fraction Misconception Report": lists which fractions have the highest wrong-attempt rates across the class, with suggested intervention activities
- Progress timeline: chart showing each student's scaffold level over time

### Notification Triggers

Teachers receive in-app notifications when:

- A student triggers two consecutive 'regress' evaluations (may need direct support)
- A student completes Level 5 (candidate for advanced activities)
- A student's session accuracy drops below 40% for two sessions in a row

All notifications link directly to the relevant student's placement heatmap.
