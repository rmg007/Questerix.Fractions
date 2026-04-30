# Fraction Ordering Tournament

## Overview

Kids sort 4–6 fractions (mixed denominators) from smallest to largest by dragging cards into numbered slots. Optional model views and a model toggle reduce cognitive load at lower levels. Tie-breaking logic handles equivalent fractions gracefully. A Speed Round and Tournament Mode extend the activity for advanced students and competitive classroom play.

---

## 1. Pedagogical Rationale

### Why Ordering 4–6 Fractions Builds Richer Skills Than Pairwise Comparison

Pairwise comparison (A vs. B) is the essential entry point for fraction understanding, but it has a cognitive ceiling. A student can master two-fraction comparison through memorized procedures — cross-multiply, convert to decimal, look at same-denominator numerators — without ever building intuitive _number sense_ about how fractions occupy the number line.

Ordering 4–6 fractions simultaneously demands qualitatively richer thinking:

**1. Relational reasoning across the full range.** The student must hold multiple values in working memory and reason about relative position, not just who wins a head-to-head. This mirrors the kind of quantitative reasoning used in everyday estimation.

**2. Landmark-based strategies emerge naturally.** Strong students quickly identify a "benchmark" fraction near 0, 1/2, or 1, then place others relative to it. This benchmark strategy is central to upper-elementary fraction fluency and cannot be taught through pairwise drills alone.

**3. Error detection from context.** When sorting six fractions, a mis-placed card creates a visible disruption — two adjacent cards that feel "too close together" or "in the wrong neighborhood." This visual dissonance is a powerful self-correction cue that is absent in isolated pairwise tasks.

**4. Forces estimation over slow algorithms.** Ordering 6 mixed-denominator fractions under time pressure makes exhaustive cross-multiplication infeasible. Students are pushed toward estimation, mental number-line reasoning, and strategic comparison — exactly the skills CCSS Grade 3 targets.

**5. Transfer preparation.** CCSS 3.NF.A.3d requires fluent comparison of fractions with unlike denominators by explaining using visual models. The tournament's model-toggle (number line always available) connects every drag action to number-line intuition, building the conceptual bridge the standard demands.

**6. Cognitive load management via progressive disclosure.** Starting with 4 fractions at Level 1 and scaling to 6 at Level 3 respects working memory limits while ensuring each level still demands qualitatively more than pairwise comparison.

**Research anchor:** Siegler & Pyke (2013) found that number-line placement tasks predicted fraction proficiency through Grade 8 better than symbolic manipulation tasks. The ordering tournament's visual model system is designed to replicate and scale this effect in a game context.

---

## 2. Drag-Sort UI

### Card Design

Each fraction card is a self-contained interactive element with the following specifications:

| Property              | Value                                                                   |
| --------------------- | ----------------------------------------------------------------------- |
| Minimum size          | 80×80px (touch) / 72×72px (mouse)                                       |
| Maximum size          | 120×120px (constrained by tray width)                                   |
| Shape                 | Rounded rectangle, border-radius 12px                                   |
| Background            | White, box-shadow 0 2px 8px rgba(0,0,0,0.15)                            |
| Fraction display      | Numerator over denominator with full vinculum line; font-size 28px bold |
| Model area            | Optional: 40px tall bar model or 56px pie chart below fraction          |
| Card state: default   | White background, dark border 2px solid #ccc                            |
| Card state: lifted    | Scale 1.08, shadow deepens, z-index 100, opacity 0.95                   |
| Card state: placed    | Light green tint (#f0fff4), solid green border                          |
| Card state: incorrect | Light red tint after submit, until corrected                            |
| Card state: dimmed    | Opacity 0.6 while another card is being dragged                         |

Cards start in a shuffled **tray** — a horizontal flex container at the top of the screen with spacing of 8px between cards. On narrow screens (< 480px), the tray wraps to two rows.

### Tray Layout

```
┌──────────────────────────────────────────────────────────────────┐
│  TRAY (unplaced cards, shuffled)                                  │
│  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐   │
│  │  3/7 │  │  1/2 │  │  5/9 │  │  2/5 │  │  7/8 │  │  1/3 │   │
│  └──────┘  └──────┘  └──────┘  └──────┘  └──────┘  └──────┘   │
└──────────────────────────────────────────────────────────────────┘
```

When a card is placed in a slot it disappears from the tray, leaving a ghost placeholder (dashed outline) so the tray maintains its width and other cards don't reflow mid-drag.

### Slot Layout

Below the tray sits a row of **N numbered slots** (N = count of fractions in the round):

```
┌──────────────────────────────────────────────────────────────────┐
│  SLOTS  (smallest → largest)                                      │
│  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐   │
│  │  1   │  │  2   │  │  3   │  │  4   │  │  5   │  │  6   │   │
│  │ (sm) │  │      │  │      │  │      │  │      │  │ (lg) │   │
│  └──────┘  └──────┘  └──────┘  └──────┘  └──────┘  └──────┘   │
│  ← Smallest                                        Largest →    │
└──────────────────────────────────────────────────────────────────┘
```

Slot labels: "1" through "N" with "Smallest" and "Largest" labels at the ends (hidden on narrow screens).

### Drag Behavior — Full Specification

**1. Pointer-down on a tray card:**

- Card lifts (scale 1.08, box-shadow deepens to 0 8px 24px rgba(0,0,0,0.25))
- All other tray cards dim to opacity 0.6
- Empty slots highlight with a dashed blue border (#4A90D9) and light fill (#EBF4FF)
- Occupied slots highlight with a dashed orange border (#E87B00)
- A semi-transparent ghost copy remains in the tray placeholder position

**2. Pointer-move (drag in progress):**

- Dragged card follows pointer at center; pointer-events: none on the card during drag
- The slot nearest to the card center-point gets a stronger highlight (solid blue border, deeper fill)
- If dragging over an occupied slot: show "swap" indicator — the occupant card briefly bobs upward 4px to signal it will return to tray

**3. Pointer-up over an empty slot:**

- Card animates from current pointer position into slot center (150ms spring animation, easing: cubic-bezier(0.34, 1.56, 0.64, 1))
- Tray ghost placeholder disappears
- Slot gains placed-card styling (no more dashed border)
- Evaluation runs (see Section 4)

**4. Pointer-up over an occupied slot (swap):**

- Existing card animates back to first available tray position (200ms ease-out)
- Dragged card snaps into the slot
- Swap counter increments in the attempt record

**5. Pointer-up over tray area or off-screen:**

- Dragged card returns to its original tray position (snap-back, 200ms)
- All highlights clear

**6. Double-tap / double-click on a placed card:**

- Card returns to tray (animates to first available tray slot, 200ms)
- Slot becomes empty again
- Evaluation re-runs

**7. Drag cancellation (Escape key, browser focus lost):**

- Active drag cancels, card returns to origin

### Touch vs Mouse Differences

| Behavior         | Mouse                                      | Touch                                             |
| ---------------- | ------------------------------------------ | ------------------------------------------------- |
| Hit target       | Card bounding box                          | Card bounding box + 16px buffer on all sides      |
| Drag threshold   | 4px movement                               | 8px movement (prevent accidental drags on scroll) |
| Cursor           | Grab cursor on hover, grabbing during drag | No cursor                                         |
| Hover highlights | Show on mouse-enter                        | Show on drag-enter only                           |
| Scroll conflict  | None (slots are non-scrolling)             | Touch-action: none on cards during drag           |

### Narrow Screen Adaptations (< 480px width)

- Tray wraps to 2 rows, cards sized down to 72×72px minimum
- Slots arranged 3-top + 3-bottom for 6-fraction rounds; 2-top + 2-bottom for 4-fraction rounds
- Model size reduced (bar model height 28px, pie chart 40px diameter)
- "Smallest" / "Largest" text labels hidden; arrows remain
- Font size for fraction numerals reduced to 22px

---

## 3. Model Toggle System

### Available Model Views

A control bar sits above the sort area (below the header, above the tray) with four toggle buttons:

| Button Label | Icon             | View Type   | Description                                                                      |
| ------------ | ---------------- | ----------- | -------------------------------------------------------------------------------- |
| Pies         | pie chart icon   | Pie chart   | Circle divided into `den` equal slices; `num` slices shaded in the card's color  |
| Bars         | bar chart icon   | Bar model   | Horizontal bar divided into `den` equal segments; leftmost `num` segments filled |
| Line         | number line icon | Number line | 0–1 number line below the sort area; all fractions shown as colored labeled dots |
| Off          | X icon           | Labels only | Fraction text only; no visual model on any card or below                         |

Only one view is active at a time. The currently active button is highlighted with a filled background.

### Default View by Level

| Level     | Default Model | Toggle Available |
| --------- | ------------- | ---------------- |
| 1         | Pies          | Yes              |
| 2         | Bars          | Yes              |
| 3         | Off           | Yes              |
| 4 (Speed) | Off           | No (hidden)      |

### Dynamic Update Algorithm for Number Line View

The number line model is special: it shows all fractions as dots on a 0–1 axis simultaneously, regardless of their tray or slot position. When any card moves, the number line updates:

```typescript
function updateNumberLineDisplay(
  trayCards: Fraction[],
  slotCards: (Fraction | null)[],
  numberLineEl: SVGElement
): void {
  const allFractions = [...trayCards, ...slotCards.filter(Boolean)] as Fraction[];

  // Map each fraction to its x-position on the number line (0–1 normalized)
  const positions = allFractions.map((f) => ({
    fraction: f,
    x: f.num / f.den,
    inSlot: slotCards.some((s) => s && fractionsEqual(s, f)),
    slotIndex: slotCards.findIndex((s) => s && fractionsEqual(s, f)),
  }));

  // Render: in-slot fractions get their slot color; tray fractions get gray
  // If in-slot fractions are in ascending x-order, their dots are connected
  // by a green line segment (implicit "correct so far" feedback)
  const inSlotPositions = positions
    .filter((p) => p.inSlot)
    .sort((a, b) => a.slotIndex - b.slotIndex);

  const isAscending = inSlotPositions.every((p, i) => i === 0 || inSlotPositions[i - 1].x <= p.x);

  renderDots(numberLineEl, positions, isAscending);
}
```

**Implicit feedback from number line:** If a student's partial order is correct so far, the placed-card dots appear in left-to-right ascending order on the number line, connected by a green line. This gives real-time positive feedback without explicit messages.

### Model Sizing at Different Fraction Counts

| Fraction Count | Pie Chart Diameter | Bar Model Height | Number Line Dot Size |
| -------------- | ------------------ | ---------------- | -------------------- |
| 4 fractions    | 56px               | 36px             | 12px                 |
| 5 fractions    | 48px               | 30px             | 10px                 |
| 6 fractions    | 40px               | 24px             | 8px                  |

### Toggle State Persistence

- Toggle state is saved per-student per-session in localStorage under key `ot_model_pref_{studentId}`
- If a student toggles models off, a "Show Models" affordance appears in the bottom-right corner (small, non-intrusive button) to allow re-enabling without hunting through the toolbar

---

## 4. Progressive Feedback System

### On-Drop Check Algorithm

After every card placement, the engine checks the current partial order:

```typescript
interface Fraction {
  num: number;
  den: number;
}

interface OrderFeedback {
  allCorrect: boolean;
  partialCorrectCount: number;
  totalPlaced: number;
  firstErrorSlot: number | null; // 0-indexed, null if no error yet
  swapSuggestion: [Fraction, Fraction] | null;
}

function fractionsEqual(a: Fraction, b: Fraction): boolean {
  return a.num * b.den === b.num * a.den;
}

function fractionDecimal(f: Fraction): number {
  return f.num / f.den;
}

function evaluateCurrentOrder(
  placed: (Fraction | null)[], // indexed by slot, null = empty
  acceptableOrders: Fraction[][] // all valid orderings (accounts for ties)
): OrderFeedback {
  const filledSlots = placed.map((f, i) => ({ f, i })).filter((x) => x.f !== null);

  // Check each filled slot against every acceptable ordering
  const correctCounts = acceptableOrders.map((order) =>
    filledSlots.reduce((count, { f, i }) => count + (f && fractionsEqual(f, order[i]) ? 1 : 0), 0)
  );

  const bestCorrectCount = Math.max(...correctCounts);
  const bestOrder = acceptableOrders[correctCounts.indexOf(bestCorrectCount)];

  const firstError = filledSlots.find(
    ({ f, i }) => !acceptableOrders.some((order) => f && fractionsEqual(f, order[i]))
  );

  // Find the best swap to suggest (pair most likely to fix the order)
  let swapSuggestion: [Fraction, Fraction] | null = null;
  if (firstError && filledSlots.length > 1) {
    const errorCard = firstError.f!;
    const expectedAtError = bestOrder[firstError.i];
    if (expectedAtError) {
      // Suggest swapping error card with the card that should be in its slot
      const currentlyHolding = filledSlots.find(({ f }) => f && fractionsEqual(f, expectedAtError));
      if (currentlyHolding) {
        swapSuggestion = [errorCard, expectedAtError];
      }
    }
  }

  return {
    allCorrect: filledSlots.length === placed.length && bestCorrectCount === placed.length,
    partialCorrectCount: bestCorrectCount,
    totalPlaced: filledSlots.length,
    firstErrorSlot: firstError ? firstError.i : null,
    swapSuggestion,
  };
}
```

### Feedback Verbosity by Level

| Level     | Mid-Sort Feedback                      | On Submit (Check!)            | Swap Suggestion      |
| --------- | -------------------------------------- | ----------------------------- | -------------------- |
| 1         | Per-slot after each placement; verbose | Full slot-by-slot breakdown   | Yes, named fractions |
| 2         | Silent unless first error detected     | Summary: "X of N correct"     | Yes, named fractions |
| 3         | Silent                                 | "Correct" or "Try again" only | No                   |
| 4 (Speed) | None                                   | Auto-reveal on timer end      | No                   |

### Feedback Message Templates

```
State: All N placed, all correct
  → "Perfect order! You sorted all {n} fractions from smallest to largest!"
  → (confetti animation, stars, celebratory sound)

State: All N placed, {k} of N correct (k > 0)
  → "Almost! {k} out of {n} in the right place."
  → If swapSuggestion: "Try swapping {fractionA} and {fractionB}."
  → (highlight incorrect slots in red, correct in green)

State: All N placed, 0 correct
  → "Let's try again. Here's a hint: use the model to compare each fraction to 1/2."
  → (auto-enable bar model if currently off; increment hint counter)

State: Mid-sort, partial correct (Level 1 only)
  → "Great start! Slot {i} looks right. Keep going!"

State: Mid-sort, first error detected (Level 1 only)
  → "Hmm, check slot {i}. Is {A} really smaller than {B}?"
```

### "Check!" Button Flow

The **Check!** button appears only after all N slots are filled. Tapping it:

1. Runs `evaluateCurrentOrder` one final time with full placement
2. Animates each slot: green border pulse for correct, red border pulse for incorrect (250ms stagger between slots, left to right)
3. Displays feedback message (see templates above)
4. If correct: shows completion modal (score, time, stars earned) after 1500ms
5. If incorrect: shows "Try Again" button (resets all slots, returns cards to tray) and optional "Show Answer" button (appears after 2nd failed attempt)

---

## 5. Tie-Breaking System

### Cross-Multiply Equivalence Detection

```typescript
function fractionsEqual(a: Fraction, b: Fraction): boolean {
  return a.num * b.den === b.num * a.den;
}

function groupEquivalents(fractions: Fraction[]): Fraction[][] {
  const groups: Fraction[][] = [];
  const assigned = new Set<number>();

  fractions.forEach((f, i) => {
    if (assigned.has(i)) return;
    const group = fractions.filter((g, j) => {
      if (assigned.has(j)) return false;
      return fractionsEqual(f, g);
    });
    group.forEach((_, j) => assigned.add(fractions.indexOf(group[j])));
    groups.push(group);
  });

  return groups;
}
```

### Building All Acceptable Orderings

If the fraction set contains equivalent pairs, all orderings that keep non-equivalent fractions in correct relative order are accepted:

```typescript
function permutations<T>(arr: T[]): T[][] {
  if (arr.length <= 1) return [arr];
  return arr.flatMap((item, i) =>
    permutations([...arr.slice(0, i), ...arr.slice(i + 1)]).map((rest) => [item, ...rest])
  );
}

function buildAcceptableOrders(fractions: Fraction[]): Fraction[][] {
  // Sort fractions by decimal value; group ties
  const sorted = [...fractions].sort((a, b) => fractionDecimal(a) - fractionDecimal(b));
  const groups = groupEquivalents(sorted);

  // For each group with > 1 member, generate all permutations of that group
  // Cross-product all group permutations to get all valid full orderings
  const groupPerms = groups.map((g) => (g.length > 1 ? permutations(g) : [g]));

  return groupPerms.reduce<Fraction[][]>(
    (acc, perms) => acc.flatMap((order) => perms.map((perm) => [...order, ...perm])),
    [[]]
  );
}
```

**Example:** Set `{1/4, 1/2, 2/4, 3/4}` — decimal values 0.25, 0.5, 0.5, 0.75.

- Equivalent group: `{1/2, 2/4}` (both = 0.5)
- Acceptable orders: `[1/4, 1/2, 2/4, 3/4]` OR `[1/4, 2/4, 1/2, 3/4]`

### Tie Badge UI

When a student places two equivalent fractions in either valid order:

- Both cards receive a small **"="** badge in their top-right corner (white circle with "=" symbol, 18px)
- A brief tooltip appears: _"Both equal the same amount!"_

### Tie Feedback Message

```
"Both {fractionA} and {fractionB} are equal — they have the same value!
 Either order works here. You found both of them!"
```

The "=" badge persists on placed equivalent cards for the rest of the round as a reference.

---

## 6. Level Definitions

### Level 1 — Simple (4 fractions, related denominators)

| Property           | Value                                  |
| ------------------ | -------------------------------------- |
| Fraction count     | 4                                      |
| Denominator family | Powers of 2 (2, 4, 8) or thirds (3, 6) |
| Model default      | Pie charts ON                          |
| Feedback mode      | Verbose (per-slot as placed)           |
| Timer              | None                                   |
| Hint button        | Visible and free                       |
| "Check!" threshold | All 4 slots filled                     |

**Example fraction sets for Level 1 (with decimal values):**

| Set ID | Fractions          | Decimal Values (sorted)    |
| ------ | ------------------ | -------------------------- |
| L1-A   | 1/8, 1/4, 1/2, 3/4 | 0.125, 0.25, 0.50, 0.75    |
| L1-B   | 1/3, 1/2, 2/3, 5/6 | 0.333, 0.50, 0.667, 0.833  |
| L1-C   | 1/4, 3/8, 1/2, 7/8 | 0.25, 0.375, 0.50, 0.875   |
| L1-D   | 1/6, 1/3, 2/3, 5/6 | 0.167, 0.333, 0.667, 0.833 |

### Level 2 — Mixed (5 fractions, unrelated denominators)

| Property           | Value                                    |
| ------------------ | ---------------------------------------- |
| Fraction count     | 5                                        |
| Denominator family | Mixed (primes: 3, 5, 7, or combinations) |
| Model default      | Bar charts ON                            |
| Feedback mode      | Summary only (after Check!)              |
| Timer              | None                                     |
| Hint button        | Available (costs 1 star)                 |
| Number line toggle | Available                                |

**Example fraction sets for Level 2 (with decimal values):**

| Set ID | Fractions               | Decimal Values (sorted)          |
| ------ | ----------------------- | -------------------------------- |
| L2-A   | 1/6, 1/4, 1/3, 3/5, 5/6 | 0.167, 0.25, 0.333, 0.60, 0.833  |
| L2-B   | 2/9, 1/3, 3/7, 4/5, 7/8 | 0.222, 0.333, 0.429, 0.80, 0.875 |
| L2-C   | 1/5, 2/7, 3/8, 5/9, 4/5 | 0.20, 0.286, 0.375, 0.556, 0.80  |
| L2-D   | 1/7, 1/4, 2/5, 5/8, 7/9 | 0.143, 0.25, 0.40, 0.625, 0.778  |

### Level 3 — Challenge (6 fractions, close decimal values, no default models)

| Property                   | Value                                                 |
| -------------------------- | ----------------------------------------------------- |
| Fraction count             | 6                                                     |
| Denominator family         | Unrelated, close decimals (spread < 0.65 total range) |
| Model default              | Off                                                   |
| Feedback mode              | "Correct" / "Try again" only                          |
| Timer                      | None                                                  |
| Hint button                | Available (costs 2 stars)                             |
| Max attempts before answer | 2                                                     |
| Model toggle               | Available (costs 1 star per toggle ON)                |

**Example fraction sets for Level 3 (with decimal values):**

| Set ID | Fractions                        | Decimal Values (sorted)                  |
| ------ | -------------------------------- | ---------------------------------------- |
| L3-A   | 2/7, 3/8, 4/9, 5/10, 6/11, 7/12  | 0.286, 0.375, 0.444, 0.50, 0.545, 0.583  |
| L3-B   | 3/11, 2/7, 1/3, 3/8, 5/12, 4/9   | 0.273, 0.286, 0.333, 0.375, 0.417, 0.444 |
| L3-C   | 4/9, 5/11, 1/2, 6/11, 7/12, 5/8  | 0.444, 0.455, 0.50, 0.545, 0.583, 0.625  |
| L3-D   | 5/13, 3/7, 4/9, 5/11, 7/15, 8/17 | 0.385, 0.429, 0.444, 0.455, 0.467, 0.471 |

### Level 4 — Speed Round (60-second timer, 6 fractions, no models)

See Section 7 for full Speed Round specification.

---

## 7. Speed Round System

### Overview

The Speed Round is a bonus level triggered after completing Level 3, or available as a standalone mode. Six fractions are presented; the student has 60 seconds to sort them correctly. Score is based on correctness and remaining time.

### Timer UI

```
┌────────────────────────────────────────────────────────┐
│  ⏱  00:47                                              │
│  ████████████████████████████░░░░░░░░░░░░░░░░░░░░░░░  │
└────────────────────────────────────────────────────────┘
```

- Full-width progress bar above the tray
- Bar drains left-to-right as time passes
- Color: green (#4CAF50) when > 40s, yellow (#FFC107) when 20–40s, red (#F44336) when < 20s
- Numeric countdown (MM:SS) shown at left of bar
- At 10s remaining: urgent pulse animation on bar (1Hz pulse)
- At 5s remaining: tick sound every second

### Timer Behavior

- Timer starts 1 second after fractions are revealed (give student time to read)
- Timer pauses if student taps the pause button (one pause allowed per round)
- On timeout: timer stops at 0, "Time's up!" overlay appears, correct order auto-fills (animated, one card per 300ms)
- On early correct submission: timer stops, score calculated

### Scoring Formula

```typescript
function calculateSpeedRoundScore(
  correctSlots: number,
  totalSlots: number,
  timeRemainingMs: number,
  totalTimeMs: number
): number {
  const accuracy = correctSlots / totalSlots;
  const timeBonus = timeRemainingMs / totalTimeMs; // 0–1

  // Base: 500 points for perfect accuracy
  // Time bonus: up to 500 additional points for speed
  const base = Math.round(accuracy * 500);
  const bonus = correctSlots === totalSlots ? Math.round(timeBonus * 500) : 0;

  return base + bonus;
}

// Example: 6/6 correct with 32s remaining → 500 + round(32/60 × 500) = 500 + 267 = 767 pts
// Example: 5/6 correct at timeout → round(5/6 × 500) + 0 = 417 pts
```

### Leaderboard Entry Format

```typescript
interface SpeedRoundLeaderboardEntry {
  studentId: string;
  displayName: string;
  score: number;
  correctSlots: number;
  totalSlots: number;
  timeRemainingMs: number;
  fractionSetId: string;
  achievedAt: string; // ISO 8601
  rank?: number; // populated when inserted into leaderboard
}
```

---

## 8. Fraction Set Generation

### Goal

Produce balanced sets of 4–6 fractions for a given level that:

- Avoid numerically clustered pairs (minimum spread between adjacent fractions)
- Ensure a clear, unambiguous ordering (no accidental near-ties unless that is the level's intent)
- Avoid all-same-denominator sets (trivially comparable)
- Guarantee no more than 2 equivalent pairs per set

### Algorithm

```typescript
interface FractionSetParams {
  count: 4 | 5 | 6;
  level: 1 | 2 | 3 | 4;
  minSpread: number; // minimum decimal difference between adjacent fractions
  maxSpread: number; // maximum decimal difference (prevents too-easy clustering)
  maxEquivPairs: number; // usually 0 for L1-L3, 1 for L4
  allowSameDenominator: boolean; // usually false
}

function generateFractionSet(params: FractionSetParams): Fraction[] {
  const candidates = buildCandidatePool(params.level);
  let attempts = 0;

  while (attempts < 1000) {
    attempts++;
    const selected = sampleWithoutReplacement(candidates, params.count);
    const sorted = selected.sort((a, b) => fractionDecimal(a) - fractionDecimal(b));
    const decimals = sorted.map(fractionDecimal);

    // Check minimum spread between all adjacent pairs
    const spreads = decimals.slice(1).map((d, i) => d - decimals[i]);
    if (spreads.some((s) => s < params.minSpread)) continue;
    if (spreads.some((s) => s > params.maxSpread)) continue;

    // Check no all-same-denominator
    const dens = new Set(selected.map((f) => f.den));
    if (!params.allowSameDenominator && dens.size === 1) continue;

    // Check equivalent pair count
    const equivPairs = countEquivalentPairs(selected);
    if (equivPairs > params.maxEquivPairs) continue;

    return sorted;
  }

  // Fallback: return a pre-validated set from the curated library
  return curatedSets[params.level][Math.floor(Math.random() * curatedSets[params.level].length)];
}

function buildCandidatePool(level: number): Fraction[] {
  const denominatorRanges: Record<number, number[]> = {
    1: [2, 3, 4, 6, 8],
    2: [3, 4, 5, 6, 7, 8],
    3: [5, 6, 7, 8, 9, 10, 11, 12],
    4: [7, 8, 9, 10, 11, 12, 13, 15, 17],
  };
  const dens = denominatorRanges[level];
  return dens.flatMap((den) => Array.from({ length: den - 1 }, (_, i) => ({ num: i + 1, den })));
}

function countEquivalentPairs(fractions: Fraction[]): number {
  let count = 0;
  for (let i = 0; i < fractions.length; i++) {
    for (let j = i + 1; j < fractions.length; j++) {
      if (fractionsEqual(fractions[i], fractions[j])) count++;
    }
  }
  return count;
}
```

### Level-Specific Generation Parameters

| Level     | Count | minSpread | maxSpread | maxEquivPairs | allowSameDen |
| --------- | ----- | --------- | --------- | ------------- | ------------ |
| 1         | 4     | 0.10      | 0.50      | 1             | No           |
| 2         | 5     | 0.07      | 0.45      | 0             | No           |
| 3         | 6     | 0.03      | 0.30      | 0             | No           |
| 4 (Speed) | 6     | 0.02      | 0.25      | 1             | No           |

---

## 9. Hint System

### Three Hint Levels

Hints are accessed via a "Hint" button in the top-right of the play area. Each press escalates to the next hint level. Hint usage is tracked in the attempt record.

**Hint Level 1 — Number Line Auto-Show:**

- If number line model is not currently active, it activates automatically
- A subtle animated arrow points from the fraction tray down to the number line
- Message: _"Use the number line to see where each fraction falls between 0 and 1."_
- Cost: 1 star (Level 2+), free (Level 1)

**Hint Level 2 — Swap Suggestion:**

- The engine identifies the two cards most likely out of position
- Those two cards pulse with a soft orange glow
- Message: _"Hint: Try swapping {fractionA} and {fractionB}."_
- If the student has already placed some cards correctly, only incorrect slots are hinted
- Cost: 2 stars (Level 2+), 1 star (Level 1)

**Hint Level 3 — Direct Position Reveal:**

- One card (the most-incorrectly-placed one) is highlighted in yellow
- Its correct slot also highlights in yellow
- Message: _"{fractionA} belongs in slot {n}."_
- Full point deduction: attempt recorded as "hint-assisted"
- Cost: 3 stars (Level 2+); not available in Level 4 / Speed Round

### Hint Escalation Logic

```typescript
function getNextHint(
  currentHintLevel: 0 | 1 | 2,
  placed: (Fraction | null)[],
  acceptableOrders: Fraction[][]
): HintAction {
  if (currentHintLevel === 0) return { type: 'show_number_line' };
  if (currentHintLevel === 1) {
    const feedback = evaluateCurrentOrder(placed, acceptableOrders);
    return { type: 'swap_suggestion', pair: feedback.swapSuggestion };
  }
  // Level 2: find worst-placed card
  const worstSlot = findWorstPlacedSlot(placed, acceptableOrders);
  return { type: 'direct_reveal', slot: worstSlot };
}
```

---

## 10. Tournament Mode

### Overview

Tournament Mode is a multi-round competitive format designed for classroom use or individual achievement goals. Three rounds, each with a harder fraction set, cumulative scoring, and a podium display at the end.

### Round Structure

| Round   | Level     | Fraction Count | Timer  | Base Points Available       |
| ------- | --------- | -------------- | ------ | --------------------------- |
| Round 1 | 2         | 5              | None   | 300 (accuracy) + time bonus |
| Round 2 | 3         | 6              | None   | 400 (accuracy) + time bonus |
| Round 3 | 4 (Speed) | 6              | 60 sec | 1000 (speed scoring)        |

### Scoring in Tournament Mode

```typescript
interface TournamentRoundResult {
  round: 1 | 2 | 3;
  fractionSet: Fraction[];
  slotsCorrect: number;
  totalSlots: number;
  attemptCount: number;
  hintsUsed: number;
  timeMs: number;
  baseScore: number;
  penaltyScore: number; // -20 per extra attempt, -10 per hint
  finalScore: number;
}

function calculateTournamentRoundScore(result: TournamentRoundResult): number {
  const accuracy = result.slotsCorrect / result.totalSlots;
  const base = Math.round(accuracy * result.baseScore);
  const penalty = (result.attemptCount - 1) * 20 + result.hintsUsed * 10;
  return Math.max(0, base - penalty);
}
```

### Podium Display

After Round 3, the cumulative score screen shows:

```
┌─────────────────────────────────────────────────────┐
│          🏆 TOURNAMENT COMPLETE!                    │
│                                                     │
│  Round 1: 285 pts   Round 2: 360 pts   Round 3: 612 pts │
│  ─────────────────────────────────────────────────  │
│               TOTAL: 1,257 pts                      │
│                                                     │
│  ┌────┐     ┌────────┐     ┌────┐                  │
│  │ 2nd│     │  1st   │     │ 3rd│                  │
│  │ 🥈 │     │  🥇    │     │ 🥉 │                  │
│  │ You│     │  [top] │     │[3rd]│                 │
│  └────┘     └────────┘     └────┘                  │
│                                                     │
│  [Play Again]          [View My Badge]              │
└─────────────────────────────────────────────────────┘
```

In single-player mode, the podium shows the student's score vs. their own personal best (1st place = beat PB; 2nd = within 10% of PB; 3rd = new player). In classroom mode, it shows top 3 class scores for that day's session.

### Tournament Badge Unlocks

| Badge               | Trigger                                            |
| ------------------- | -------------------------------------------------- |
| Tournament Novice   | Complete all 3 rounds                              |
| Tournament Champion | Total score ≥ 1,500                                |
| Perfect Rounds      | 100% accuracy in all 3 rounds (no penalties)       |
| Speed King/Queen    | Round 3 score ≥ 800 (requires near-perfect + fast) |

---

## 11. Edge Cases

### Case A: All Fractions with Same Denominator (Trivially Ordered by Numerator)

If the generated set has the same denominator (e.g., `{1/5, 2/5, 3/5, 4/5}`), the ordering is trivially readable by numerator alone — no genuine fraction reasoning required.

**Detection and handling:**

```typescript
if (new Set(fractionSet.map((f) => f.den)).size === 1) {
  // Reject set in generation algorithm
  // If somehow used: prepend a pedagogical note in the hint:
  // "When fractions share the same bottom number, the bigger numerator (top number) means bigger fraction."
}
```

These sets are intentionally avoided in generation (see Section 8) but may appear in Level 1 as a deliberate scaffolding step when the teacher explicitly selects "same-denominator introduction" mode.

### Case B: Fractions Very Close Together (Adjacent Decimals Within 0.01)

Example: `{5/13 ≈ 0.385, 3/7 ≈ 0.429, 4/9 ≈ 0.444, 5/11 ≈ 0.455, 7/15 ≈ 0.467, 8/17 ≈ 0.471}`

The last three fractions differ by at most 0.016. In this case:

- Number line model is recommended (shows the clustering visually)
- Feedback uses near-miss language: _"These fractions are very close! Even a small difference matters here."_
- On incorrect placement within a close cluster: _"Almost — {A} and {B} are only {delta:.3f} apart. Check them on the number line."_
- Sets with 3 or more fractions within 0.01 of each other are only used at Level 3+

### Case C: Three Equivalent Fractions in One Set

Example: `{1/4, 2/4, 3/6, 3/4}` where `2/4 = 1/2` and `3/6 = 1/2`.

```typescript
// buildAcceptableOrders handles this: equivalentGroup = [2/4, 3/6, 1/2 (if present)]
// All 3! = 6 permutations of the equivalent group are valid in positions 2-4
// Tie badge appears on all three cards
// Feedback: "Three fractions here are all equal! Any order among them is correct."
```

Sets with 3+ equivalent fractions are only used in special "equivalence focus" rounds, not in standard level sets.

---

## 12. Full Data Structures

### Round Config

```typescript
interface RoundConfig {
  activity: 'ordering_tournament';
  roundId: string; // e.g., "ot_L2_20260424_003"
  level: 1 | 2 | 3 | 4;
  fractionCount: 4 | 5 | 6;
  fractions: Fraction[]; // shuffled presentation order
  correctOrder: FractionWithDecimal[];
  acceptableOrders: Fraction[][]; // all valid orderings
  equivalentGroups: Fraction[][]; // groups of equivalent fractions
  timer: number | null; // milliseconds, null = no timer
  modelsDefault: 'pie' | 'bar' | 'line' | 'none';
  feedbackMode: 'verbose' | 'summary' | 'minimal' | 'none';
  hintsAllowed: number; // 0 = no hints (Level 4)
  fractionSetId: string; // references the curated or generated set
}

interface FractionWithDecimal extends Fraction {
  decimal: number;
}
```

### Attempt Record

```typescript
interface OrderingAttemptRecord {
  sessionId: string;
  studentId: string;
  roundId: string;
  level: 1 | 2 | 3 | 4;
  fractionSetId: string;
  attemptNumber: number; // 1 = first try, 2 = second, etc.
  submittedOrder: Fraction[];
  slotsCorrect: number;
  totalSlots: number;
  firstAttemptCorrect: boolean;
  modelUsedAtSubmit: 'pie' | 'bar' | 'line' | 'none';
  modelToggles: number; // how many times model was toggled
  hintsUsed: number;
  hintLevelsUsed: (1 | 2 | 3)[];
  swapsMade: number; // total drag interactions
  timeMs: number; // time from first interaction to Check! tap
  timerRemainingMs: number | null;
  score: number;
  earnedStars: 1 | 2 | 3;
}
```

### Session Summary

```typescript
interface OrderingSessionSummary {
  sessionId: string;
  studentId: string;
  date: string; // ISO 8601 date
  roundsCompleted: number;
  totalAttempts: number;
  firstAttemptCorrectRate: number; // 0–1
  averageSlotsCorrectOnFirst: number;
  hintsUsedTotal: number;
  modelsUsedRate: number; // fraction of rounds with model enabled
  levelReached: 1 | 2 | 3 | 4;
  tournamentScore: number | null; // null if not in tournament mode
  badgesEarned: string[];
  timeSpentMs: number;
}
```

### Leaderboard Entry

```typescript
interface OrderingLeaderboardEntry {
  studentId: string;
  displayName: string;
  score: number;
  level: 1 | 2 | 3 | 4;
  fractionSetId: string;
  slotsCorrect: number;
  totalSlots: number;
  timeMs: number;
  hintsUsed: number;
  rating: 'Bronze' | 'Silver' | 'Gold' | 'Diamond';
  achievedAt: string; // ISO 8601
  rank?: number;
}
```

---

## 13. UI Layout Mockups

### Level 1 (4 Fractions, Pie Models ON)

```
┌──────────────────────────────────────────────────────────────────┐
│  Fraction Ordering Tournament   Level 1       ⭐⭐⭐  [Hint]   │
├──────────────────────────────────────────────────────────────────┤
│  Sort from SMALLEST to LARGEST                                   │
│                                                                  │
│  TRAY                                                            │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐        │
│  │   3/4    │  │   1/8    │  │   1/2    │  │   1/4    │        │
│  │  (●●●○) │  │  (●○○○○) │  │  (●●○○) │  │  (●○○○) │        │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘        │
│                                                                  │
│  SLOTS                                                           │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐        │
│  │    1     │  │    2     │  │    3     │  │    4     │        │
│  │ (empty)  │  │ (empty)  │  │ (empty)  │  │ (empty)  │        │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘        │
│  ← Smallest                                        Largest →    │
│                                                                  │
│  [🥧 Pies ✓]  [📊 Bars]  [📍 Line]  [🚫 Off]                  │
│  ─────────────────────────────────────────────────────────────  │
│  0 ─────────────────────────────────────────────────────── 1    │
│     (number line shown when Line model is toggled ON)           │
└──────────────────────────────────────────────────────────────────┘
```

### Level 3 (6 Fractions, No Models)

```
┌──────────────────────────────────────────────────────────────────┐
│  Fraction Ordering Tournament   Level 3              [Hint ★★]  │
├──────────────────────────────────────────────────────────────────┤
│  Sort from SMALLEST to LARGEST                                   │
│                                                                  │
│  TRAY                                                            │
│  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐  │
│  │ 6/11 │  │ 3/8  │  │ 7/12 │  │ 2/7  │  │ 5/10 │  │ 4/9  │  │
│  └──────┘  └──────┘  └──────┘  └──────┘  └──────┘  └──────┘  │
│                                                                  │
│  SLOTS                                                           │
│  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐  │
│  │  1   │  │  2   │  │  3   │  │  4   │  │  5   │  │  6   │  │
│  │      │  │      │  │      │  │      │  │      │  │      │  │
│  └──────┘  └──────┘  └──────┘  └──────┘  └──────┘  └──────┘  │
│  ← Smallest                                        Largest →   │
│                                                                  │
│  [📊 Bars ★]  [📍 Line ★]  [🚫 Off ✓]                         │
│                                          [    Check!   ]        │
└──────────────────────────────────────────────────────────────────┘
```

### Speed Round (Level 4, 6 Fractions, 60-Second Timer)

```
┌──────────────────────────────────────────────────────────────────┐
│  ⚡ SPEED ROUND!                                    [⏸ Pause]   │
│  ⏱ 00:43  ████████████████████████████░░░░░░░░░░░░░░  (green) │
├──────────────────────────────────────────────────────────────────┤
│  Sort FASTEST — smallest to largest!                             │
│                                                                  │
│  TRAY                                                            │
│  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐  │
│  │ 5/9  │  │ 4/11 │  │ 3/7  │  │ 7/15 │  │ 8/17 │  │ 2/5  │  │
│  └──────┘  └──────┘  └──────┘  └──────┘  └──────┘  └──────┘  │
│                                                                  │
│  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐  │
│  │  1   │  │  2   │  │  3   │  │  4   │  │  5   │  │  6   │  │
│  └──────┘  └──────┘  └──────┘  └──────┘  └──────┘  └──────┘  │
│                                                                  │
│                                          [    Check!   ]        │
└──────────────────────────────────────────────────────────────────┘
```

---

## 14. Accessibility

### Keyboard Drag-Sort Flow

The complete keyboard interaction sequence for sorting without a pointer:

1. **Tab** — cycles through all cards in the tray (focus ring visible on each card)
2. **Enter / Space** — "picks up" the focused card (announces: _"Picked up [fraction]. Use arrow keys or Tab to select a slot."_)
3. **Tab / Shift-Tab** — moves focus through the numbered slots while holding a card
4. **Enter / Space** over a slot — drops the card into that slot; announces _"[fraction] placed in slot [N]."_
5. **Escape** — cancels the pick-up; card returns to tray; announces _"Cancelled. [fraction] returned to tray."_
6. **D** (double-action) — when a slot is focused with no card held, pressing D removes the placed card and returns it to tray

### Screen Reader Ordering Announcements

All state changes produce ARIA live-region announcements:

```
Card picked up: "Picked up fraction: three eighths. Select a slot."
Slot hovered:   "Slot 3 of 6: empty."
Slot hovered (occupied): "Slot 3 of 6: contains one half. Dropping here will swap."
Card placed:    "Three eighths placed in slot 3."
Card swapped:   "Swapped three eighths and one half."
Check! result:  "4 of 6 slots correct. Slots 1, 2, 4, 5 are correct. Slots 3 and 6 need adjustment."
All correct:    "Perfect! All 6 fractions in correct order. Well done!"
```

### Motor Accessibility — Tap-to-Select Mode

For students with motor difficulties who cannot reliably drag:

- Enable via Settings → Accessibility → "Tap to Sort Mode"
- **Tap 1** on a tray card: card becomes "selected" (larger border, color highlight)
- **Tap 2** on a numbered slot: selected card moves into that slot (no drag required)
- **Tap 2** on a tray card: swaps the two tray cards (for repositioning without slots)
- A selected card can be deselected by tapping it again

### Color-Blind and Low-Vision Accommodations

- Empty slot highlighted with dashed border pattern (not color alone)
- Occupied slot uses solid border + diagonal hatch fill as secondary indicator
- Correct slot (after Check!): green + checkmark icon
- Incorrect slot (after Check!): red + X icon
- Model toggle buttons have text labels, not just icons
- Minimum touch target for all interactive elements: 44×44px
- High-contrast mode available: card backgrounds use white; borders increase to 3px solid black; models use high-contrast fill patterns (stripes for filled, white for empty)
