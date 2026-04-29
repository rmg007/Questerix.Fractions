# Fraction Benchmark Battle — Full Design Document

## Table of Contents

1. Overview & Pedagogical Rationale
2. The 1/2 Rule System
3. Complete Fraction Bank
4. Equal-to-1/2 Detection
5. Hint Strategy System
6. Timer System
7. Progression & Gating
8. Feedback Engine
9. Multi-Benchmark Extension
10. Anchor Fraction Animation
11. Score System
12. Edge Cases
13. Full Data Structures
14. UI Layout Mockups
15. Accessibility & Keyboard Controls

---

## 1. Overview & Pedagogical Rationale

### Core Activity Summary

Students are shown a single fraction and must decide: is it **bigger than 1/2**, **smaller than 1/2**, or (at Level 3+) **equal to 1/2**? The benchmark 1/2 is always visible as a reference. The activity trains a rapid mental shortcut that bypasses the need to convert to decimals or find common denominators.

### The Benchmark Strategy in Numeracy Research

A **benchmark fraction** is a familiar, well-understood value used as an anchor for estimating or comparing unfamiliar fractions. Research in elementary mathematics (Moss & Case, 1999; Clarke & Roche, 2009) identifies 1/2 as the most developmentally appropriate first benchmark because:

1. **Universality of halving.** Children encounter halving in everyday contexts (splitting cookies, sharing equally) long before they learn formal fraction notation. The concept is pre-loaded.
2. **Visual symmetry.** 1/2 is the exact midpoint of the 0–1 range, making it easy to construct and verify visually using bar models or area models.
3. **Algebraic elegance of the benchmark rule.** The rule "numerator > denominator/2 means bigger than 1/2" is a direct consequence of fraction definition and can be verified by students without arithmetic beyond halving, which is a Grade 2 skill.

The benchmark strategy is important precisely because it is a **shortcut**: expert fraction reasoning skips the procedural steps (common denominator, decimal conversion) and goes straight to qualitative magnitude judgment. Training this shortcut at Grade 2 — before students learn the procedural methods — prevents over-reliance on algorithms and builds authentic number sense.

### Why 1/2 Specifically for Grade 2

Grade 2 CCSS introduces halves, thirds, and fourths. The 1/2 benchmark is reachable from all three denominator families using mental arithmetic Grade 2 students already possess: is 1 less than half of 2? Is 1 less than half of 4? Is 1 less than half of 3? These are comparisons to 1, 2, and 1.5 respectively — within second-grade arithmetic scope.

Using 1/4 or 3/4 as primary benchmarks would require comparing numerators to non-integer half-denominators (half of 8 = 4, fine; half of 7 = 3.5, harder) which is more appropriate for Grade 3–4.

### Connection to Activity 01 (Magnitude Scales)

The benchmark intuition trained here is the cognitive engine that drives accurate number-line placement in activity 01. When a student in activity 01 must place 5/8, asking "is 5/8 bigger or smaller than 1/2?" (5 vs 4 = bigger) tells them the card belongs in the right (orange) zone. The two activities are designed to be practiced in alternating sessions to reinforce each other.

---

## 2. The 1/2 Rule System

### Formal Rule Statement

> A fraction a/b is greater than 1/2 if and only if a > b/2.
> Equivalently: 2a > b.

This is displayed to students in age-appropriate language:

> "A fraction is **bigger than 1/2** when the top number is more than half the bottom number.
> A fraction is **smaller than 1/2** when the top number is less than half the bottom number."

### Visual Proof Using Bar Model

The rule card shows a two-panel proof:

```
Is 3/7 bigger or smaller than 1/2?

[Bar of 1/2]   ████░░░░░░░░  ← exactly half
[Bar of 3/7]   ███░░░░░░░░░  ← 3 out of 7 parts

Half of 7 is 3.5
The top number (3) is LESS than 3.5
So 3/7 is SMALLER than 1/2  ✓
```

The bars are rendered at identical width with equal-height segments so the visual comparison is immediate. A thin red dashed line runs vertically at the 1/2 position across both bars as a persistent alignment guide.

### Worked Examples

**Even denominator (easy):** Is 3/8 bigger or smaller than 1/2?

- Half of 8 = 4. Is 3 more or less than 4? Less. → Smaller.
- Bar model: 3 of 8 parts vs 4 of 8 parts — visually clear.

**Odd denominator (requires rounding):** Is 4/9 bigger or smaller than 1/2?

- Half of 9 = 4.5. Is 4 more or less than 4.5? Less. → Smaller.
- The rule card says: "Half of 9 is about 4.5. Is 4 more or less than 4.5?"
- For Grade 2, "about 4.5" is simplified to "between 4 and 5" with the instruction: "If the number is between 4 and 5, a top number of 4 is smaller and a top number of 5 is bigger."

### Scaffold Removal Timeline for the Rule Card

| Round Range | Rule Card Visibility                         |
| ----------- | -------------------------------------------- |
| Round 1     | Fully expanded, uncollapssable               |
| Rounds 2–4  | Collapsed by default; tap to expand          |
| Rounds 5–8  | Rule card hidden; "Show rule" button present |
| Round 9+    | No rule card or button; student must recall  |

The escalation is per-session within a difficulty tier, not global. If a student regresses to an easier tier, the rule card reappears at its Round 1 state for that tier.

### Odd-Denominator Special Handling

When the denominator is odd, the rule card includes a second step: "b/2 is not a whole number — that's okay. We compare to b/2 anyway."

For Grade 2 students who haven't learned fractions of fractions, the Denominator Spotlight hint (see Section 5) provides a visual bridge: it shows b/2 on a mini number line between two integers, making the comparison concrete.

---

## 3. Complete Fraction Bank

### Tier Structure

The bank is organized into four tiers based on distance from 1/2 and denominator complexity. The tier assignment for each fraction is fixed; the adaptive engine selects from tiers based on the current difficulty setting.

### Easy Pool (distance from 1/2 ≥ 0.20)

Fractions clearly on one side of 1/2; denominator halving gives a whole number.

| Fraction | Decimal | Distance from 0.5 | Answer  | Why this tier                           |
| -------- | ------- | ----------------- | ------- | --------------------------------------- |
| 1/4      | 0.250   | 0.250             | smaller | Iconic; matches tick mark in act.01     |
| 3/4      | 0.750   | 0.250             | bigger  | Mirror of 1/4; symmetric                |
| 1/5      | 0.200   | 0.300             | smaller | Far left; den. halving: 2.5 (half rule) |
| 4/5      | 0.800   | 0.300             | bigger  | Mirror of 1/5                           |
| 1/6      | 0.167   | 0.333             | smaller | Very small; easy visually               |
| 5/6      | 0.833   | 0.333             | bigger  | Mirror of 1/6                           |
| 1/3      | 0.333   | 0.167             | smaller | Common denominator; den=3, half=1.5     |
| 2/3      | 0.667   | 0.167             | bigger  | Mirror of 1/3                           |

### Medium Pool (distance from 1/2: 0.08–0.20)

Requires applying the rule; denominator halving may be non-integer.

| Fraction | Decimal | Distance | Answer  | Why this tier                  |
| -------- | ------- | -------- | ------- | ------------------------------ |
| 3/8      | 0.375   | 0.125    | smaller | Half of 8 = 4; 3 < 4 → smaller |
| 5/8      | 0.625   | 0.125    | bigger  | Half of 8 = 4; 5 > 4 → bigger  |
| 2/5      | 0.400   | 0.100    | smaller | Half of 5 = 2.5; 2 < 2.5       |
| 3/5      | 0.600   | 0.100    | bigger  | Half of 5 = 2.5; 3 > 2.5       |
| 3/7      | 0.429   | 0.071    | smaller | Half of 7 = 3.5; 3 < 3.5       |
| 4/7      | 0.571   | 0.071    | bigger  | Half of 7 = 3.5; 4 > 3.5       |
| 4/9      | 0.444   | 0.056    | smaller | Half of 9 = 4.5; 4 < 4.5       |
| 5/9      | 0.556   | 0.056    | bigger  | Half of 9 = 4.5; 5 > 4.5       |

### Hard Pool (distance from 1/2: 0.02–0.08)

Very close to 1/2; requires careful rule application; includes twist "Equal" cards.

| Fraction | Decimal | Distance | Answer  | Why this tier                        |
| -------- | ------- | -------- | ------- | ------------------------------------ |
| 5/11     | 0.454   | 0.046    | smaller | Half of 11 = 5.5; 5 < 5.5            |
| 6/11     | 0.545   | 0.045    | bigger  | Half of 11 = 5.5; 6 > 5.5            |
| 6/13     | 0.462   | 0.038    | smaller | Half of 13 = 6.5; 6 < 6.5            |
| 7/13     | 0.538   | 0.038    | bigger  | Half of 13 = 6.5; 7 > 6.5            |
| 7/15     | 0.467   | 0.033    | smaller | Half of 15 = 7.5; 7 < 7.5            |
| 8/15     | 0.533   | 0.033    | bigger  | Half of 15 = 7.5; 8 > 7.5            |
| 2/4      | 0.500   | 0.000    | equal   | Equal twist: 2 is exactly half of 4  |
| 3/6      | 0.500   | 0.000    | equal   | Equal twist: 3 is exactly half of 6  |
| 5/10     | 0.500   | 0.000    | equal   | Equal twist: 5 is exactly half of 10 |
| 4/8      | 0.500   | 0.000    | equal   | Equal twist: 4 is exactly half of 8  |

### Extreme Pool (distance from 1/2: < 0.02)

Reserved for Benchmark Challenge mode only. Not shown in standard rounds.

| Fraction | Decimal | Distance | Answer  |
| -------- | ------- | -------- | ------- |
| 10/21    | 0.476   | 0.024    | smaller |
| 11/21    | 0.524   | 0.024    | bigger  |
| 9/19     | 0.474   | 0.026    | smaller |
| 10/19    | 0.526   | 0.026    | bigger  |
| 12/25    | 0.480   | 0.020    | smaller |
| 13/25    | 0.520   | 0.020    | bigger  |

---

## 4. Equal-to-1/2 Detection

### Detection Logic

A fraction is equal to 1/2 when its numerator is exactly half its denominator:

```typescript
function isEqualToHalf(num: number, den: number): boolean {
  // Only applies to even denominators
  return den % 2 === 0 && num * 2 === den;
}

// Also handles equivalence via cross-multiplication:
function isEquivalentToHalf(num: number, den: number): boolean {
  // num/den == 1/2  ⟺  2*num == den
  return 2 * num === den;
}
```

Note: the two functions are equivalent for positive integers. `isEquivalentToHalf` is the canonical check used throughout the engine.

### Which Equal Fractions Appear in the Bank

Equal-to-1/2 fractions appear exclusively in the Hard pool and are introduced at Level 3. The bank includes four equal fractions: 2/4, 3/6, 4/8, 5/10. They are served one per session maximum in standard mode; in Benchmark Challenge, up to two may appear per round.

### When the "Equal" Button Appears

The "Equal to 1/2" button is completely absent at Levels 1–2. At Level 3, it appears for the first time with a pulsing gold border for two seconds to draw attention. At Level 4+, it is always visible but unstyled (same size and style as the other two buttons).

The reason for the staged introduction: presenting three options at Level 1 increases cognitive load and reduces the rate at which students learn the core binary rule. The binary (bigger/smaller) decision is mastered first; equality is introduced as a refinement.

### Scoring for Equal Pairs

| Answer Given   | Correct Answer | Result  | Points          |
| -------------- | -------------- | ------- | --------------- |
| Equal          | equal          | Correct | Full points     |
| Bigger/Smaller | equal          | Wrong   | 0 pts + explain |
| Equal          | bigger/smaller | Wrong   | 0 pts + explain |

When a student selects "Bigger" or "Smaller" for an equal fraction, the explanation modal shows:

```
"2/4 is actually EQUAL to 1/2!

Here's why:
 • The denominator is 4
 • Half of 4 is 2
 • The numerator is 2
 • 2 = 2, so 2/4 equals exactly 1/2

Another way to see it:  2/4 = 1/2  (divide top and bottom by 2)"
```

---

## 5. Hint Strategy System

### Design Principles

Hints are sequential and escalating. A student must receive Hint 1 before Hint 2 becomes available, and Hint 2 before Hint 3. This prevents students from jumping straight to the most revealing hint (the number line) and bypassing the reasoning process. The pedagogical goal is for hints to teach strategy, not provide answers.

Hints are triggered by wrong answers, not by request (at Level 1–2). At Level 3+, a manual "Hint" button is available but is gated behind one wrong attempt.

### Hint 1 — Bar Model Comparison

**What it shows:** The target fraction's bar model is placed beside the 1/2 bar model, both at identical scale and width. The shaded regions are visually compared.

**Prompt text:** "Look at the shaded part — which bar is filled more?"

**When triggered:**

- Level 1–2: automatically after the 1st wrong attempt
- Level 3+: available via Hint button after 1st wrong attempt

**Cost:** 0 points at all levels (it is an encouragement tool; students are learning to use bar models as a strategy, which is itself a learning goal).

**Rendering note:** Each bar is a `rect` in SVG, same width (200px), height 32px. The shaded region width = (num/den) × 200. The 1/2 bar is always shaded to 100px exactly. A vertical dashed line at 100px runs across both bars as a reference marker.

### Hint 2 — Denominator Spotlight

**What it shows:** The denominator in the fraction display pulses (2× scale, gold color, 600ms keyframe). A speech bubble appears:

- Even denominator: "The denominator is [den]. Half of [den] is [den/2]. Is [num] more or less than [den/2]?"
- Odd denominator: "The denominator is [den]. Half of [den] is between [floor(den/2)] and [ceil(den/2)]. Is [num] above or below that?"

**When triggered:** After the 2nd wrong attempt (any level).

**Cost:** 0 points at Levels 1–3. 5 points at Levels 4–5 (students should not need this hint at higher levels; the cost is mild discouragement without punishment).

### Hint 3 — Number Line Reveal

**What it shows:** A compact 0–1 number line (350px wide) appears below the fraction display. The 1/2 mark is clearly labeled. The target fraction is animated in (drops from above onto the number line) over 400ms.

**Purpose:** The student can now see the fraction's position relative to 1/2. This is the most revealing hint; it essentially shows the answer.

**When triggered:** After the 3rd wrong attempt.

**Cost:** 1 star deducted (stars are the session currency used for the leaderboard; this is meaningful but not devastating).

### Hint 4 — Rule Reminder

**What it shows:** The 1/2 Rule card re-expands (regardless of round number) with the worked example filled in for the current fraction.

**When triggered:** Only if Hint 3 has been used and the student answers wrong a 4th time.

**Cost:** 0 points (at this point the student is struggling; further penalty would be counterproductive).

After Hint 4, if the student still answers wrong, the correct answer is revealed, a full explanation is displayed, and the round auto-advances after 3 seconds.

### Hint Escalation TypeScript Function

```typescript
type HintLevel = 'bar_model' | 'denominator' | 'number_line' | 'rule_reminder' | null;

interface HintState {
  wrongAttempts: number;
  hintsUsed: HintLevel[];
}

function shouldOfferHint(state: HintState, gameLevel: number): HintLevel | null {
  const { wrongAttempts, hintsUsed } = state;

  const offered = (h: HintLevel) => hintsUsed.includes(h);

  // Auto-trigger at Level 1-2; manual button at Level 3+
  if (gameLevel <= 2) {
    if (wrongAttempts >= 1 && !offered('bar_model')) return 'bar_model';
    if (wrongAttempts >= 2 && !offered('denominator')) return 'denominator';
    if (wrongAttempts >= 3 && !offered('number_line')) return 'number_line';
    if (wrongAttempts >= 4 && !offered('rule_reminder')) return 'rule_reminder';
  } else {
    // Level 3+: hints only become available after wrong attempts
    // Student must click the Hint button to actually see them
    if (wrongAttempts >= 1 && !offered('bar_model')) return 'bar_model';
    if (wrongAttempts >= 2 && !offered('denominator')) return 'denominator';
    if (wrongAttempts >= 3 && !offered('number_line')) return 'number_line';
    if (wrongAttempts >= 4 && !offered('rule_reminder')) return 'rule_reminder';
  }

  return null;
}
```

### Hint Cost Model (Summary)

| Hint          | Level 1 | Level 2 | Level 3 | Level 4 | Level 5 |
| ------------- | ------- | ------- | ------- | ------- | ------- |
| Bar Model     | 0 pts   | 0 pts   | 0 pts   | 0 pts   | 0 pts   |
| Denominator   | 0 pts   | 0 pts   | 0 pts   | 5 pts   | 5 pts   |
| Number Line   | 0 pts   | 0 pts   | 1 star  | 1 star  | 1 star  |
| Rule Reminder | 0 pts   | 0 pts   | 0 pts   | 0 pts   | 0 pts   |

---

## 6. Timer System

### Per-Difficulty Timer Values

| Round Range         | Difficulty  | Timer  | Notes                           |
| ------------------- | ----------- | ------ | ------------------------------- |
| Rounds 1–3          | Easy        | None   | No time pressure, learning mode |
| Rounds 4–6          | Easy/Medium | None   | Still no timer                  |
| Rounds 7–9          | Medium      | 20 sec | First introduction of timer     |
| Rounds 10–12        | Medium/Hard | 15 sec | Increasing pressure             |
| Rounds 13+          | Hard        | 10 sec | Benchmark Challenge prep        |
| Benchmark Challenge | Extreme     | 10 sec | Fixed, no extensions            |

The timer value is per-question, not per-round. The countdown resets for each new fraction.

### Visual Countdown Bar Design

The countdown bar sits immediately below the question area, spanning the full width of the question panel (typically 480–600px depending on device).

```
[████████████████████████░░░░░░░░]  12.4 sec
```

The bar is a CSS-animated `div` with `width` transitioning from 100% to 0% over the timer duration. The transition uses `linear` timing to ensure the visual depletion is proportional to elapsed time.

**Color Transitions:**

| Time Remaining    | Bar Color          | Background Glow        |
| ----------------- | ------------------ | ---------------------- |
| > 50% of duration | `#22c55e` (green)  | None                   |
| 25%–50%           | `#eab308` (yellow) | None                   |
| 10%–25%           | `#f97316` (orange) | Subtle orange pulse    |
| < 10%             | `#ef4444` (red)    | Red pulse, 0.5s period |

The color transitions are implemented as CSS `@keyframes` triggered by JavaScript class additions when each threshold is crossed, rather than continuous property interpolation (which would cause performance issues on low-end tablets).

**Numeric Display:** The elapsed seconds are shown as a floating number above the right end of the bar, updating every 100ms. Format: `"12.4"` (one decimal, no trailing zero). At < 3 seconds, the number turns red and pulses.

### Pause Mechanic

Each round allows **one pause** (two pauses with accessibility settings enabled). The pause button is always visible in the UI but is only active when the timer is running.

On pause:

- Timer state is frozen
- All interactive elements become non-interactive
- A dim overlay covers the question panel (so students cannot read the fraction while paused)
- A "Resume" button in the center of the overlay is the only active control
- Screen reader announces: "Game paused. Press Resume to continue."

On resume:

- Overlay fades over 200ms
- A 3-2-1 countdown displays (1 second per number) before the timer restarts
- Timer continues from paused value

### Time Bonus Scoring Formula

When the student answers correctly before time expires, a time bonus is added:

```typescript
function timeBonus(
  timerDurationMs: number,
  timeUsedMs: number,
  difficulty: 'medium' | 'hard' | 'extreme'
): number {
  const timeRemainingFraction = (timerDurationMs - timeUsedMs) / timerDurationMs;
  const baseBonusMap = { medium: 20, hard: 40, extreme: 60 };
  const baseBonus = baseBonusMap[difficulty];
  return Math.floor(timeRemainingFraction * baseBonus);
}

// Examples:
// Medium, 20s timer, answered in 8s → (12/20) × 20 = 12 pts bonus
// Hard, 15s timer, answered in 3s  → (12/15) × 40 = 32 pts bonus
```

If time expires before the student answers, the response is treated as WRONG (no points, no time bonus), and the correct answer is briefly shown before the next question loads.

---

## 7. Progression & Gating

### Round Structure Table

| Rounds | Difficulty Pool | Timer  | Benchmark Rule | Equal Button |
| ------ | --------------- | ------ | -------------- | ------------ |
| 1–3    | Easy            | None   | Fully visible  | Hidden       |
| 4–6    | Easy + Medium   | None   | Collapsed      | Hidden       |
| 7–9    | Medium          | 20 sec | Hidden         | Hidden       |
| 10–12  | Medium + Hard   | 15 sec | Hidden         | Shown (L3+)  |
| 13+    | Hard            | 10 sec | Hidden         | Shown        |

Each "round" is one question (one fraction to judge). A "session" typically contains 12–18 rounds.

### Advancement Criteria

**Advance to next difficulty tier:** 4 consecutive correct answers at the current tier, answered without hints and within the timer limit (if a timer is active).

**Early advance:** If the student completes 8 correct at the current tier with ≥ 75% unassisted accuracy, they advance regardless of consecutive streak.

### Regression Criteria

**Regress one tier:** 3 consecutive wrong answers at the current tier (hint-assisted wrong answers do NOT count toward this counter). Regression is accompanied by a soft message: "Let's practice a little more at this level first." The rule card reappears at its Round 1 state for the target tier.

**Regression guard:** A student cannot regress below the starting tier of the session. This prevents a frustration spiral where a student keeps regressing to Level 1.

### Benchmark Challenge Mode

**Unlock condition:** Student completes Round 12+ in a session, with final difficulty reaching "Hard" and session accuracy ≥ 70%.

**Characteristics:**

- All fractions drawn from the Hard and Extreme pools
- 10-second timer (fixed, no extensions)
- No hints available (hint button is hidden)
- Equal button is always visible
- Leaderboard entry: score = (correct_count × 100) + total_time_bonus

**Leaderboard formula:**

```typescript
function challengeScore(correctCount: number, avgTimeUsedMs: number, timerMs: number): number {
  const base = correctCount * 100;
  const avgFractionRemaining = Math.max(0, (timerMs - avgTimeUsedMs) / timerMs);
  const timeBonus = Math.floor(avgFractionRemaining * 200);
  return base + timeBonus;
}
```

---

## 8. Feedback Engine

### Message Templates — Correct Responses

```typescript
const correctFeedback: Record<string, string> = {
  easy_smaller:
    'Right! {num}/{den} is smaller than 1/2. {num} is less than half of {den} ({halfDen}).',
  easy_bigger: 'Yes! {num}/{den} is bigger than 1/2. {num} is more than half of {den} ({halfDen}).',
  medium_any:
    "Nice work! {num}/{den} ≈ {decimal}. Half of {den} is {halfDen}. Since {num} {cmp} {halfDen}, it's {answer}.",
  hard_any:
    "Excellent — that was close! {num}/{den} ≈ {decimal}. {num} {cmp} {halfDen}, so it's {answer}.",
  equal: 'Exactly right! {num}/{den} = 1/2. {num} is exactly half of {den}.',
  timed_fast: 'Great — and fast! Only {timeSec} seconds. {num}/{den} is {answer} than 1/2.',
};
```

Variables: `{halfDen}` = b/2 formatted as decimal if odd denominator (e.g., 3.5), `{cmp}` = ">" or "<" or "=", `{decimal}` = two-decimal string, `{timeSec}` = seconds taken rounded to one decimal.

### Message Templates — Incorrect Responses

```typescript
const incorrectFeedback: Record<string, string> = {
  wrong_first: "Not quite. Let's use the model to check.",
  wrong_second:
    "Let's think about the denominator. Half of {den} is {halfDen}. Is {num} more or less?",
  wrong_third:
    "Here's where {num}/{den} lives on the number line — see if it's on the left or right of 1/2.",
  timed_out: "Time's up! The answer was {answer}. {num}/{den} ≈ {decimal}.",
};
```

### Near-Miss Handling

Fractions within 0.05 decimal distance of 1/2 (distance < 0.05) get a special near-miss message when answered incorrectly:

```typescript
const nearMissMessage = (
  fraction: Fraction,
  givenAnswer: string,
  correctAnswer: string
): string => {
  const distance = Math.abs(fraction.num / fraction.den - 0.5);
  if (distance < 0.05 && givenAnswer !== correctAnswer) {
    return (
      `That one was really close! {num}/{den} ≈ {decimal}, which is just {distPct}% away from 1/2. ` +
      `Half of {den} is {halfDen}. The numerator {num} is just barely ${correctAnswer === 'smaller' ? 'below' : 'above'} that.`
    );
  }
  return incorrectFeedback.wrong_first;
};
```

`{distPct}` = Math.round(distance \* 100), e.g., "4% away from 1/2".

### Explanation Template (Full Reveal)

When the answer is revealed after 3+ wrong attempts (or after time expires), the full explanation modal appears:

```
┌─────────────────────────────────────────────────────┐
│  3/7 is SMALLER than 1/2                            │
│                                                     │
│  Here's why:                                        │
│   • The denominator is 7                            │
│   • Half of 7 is 3.5                                │
│   • The numerator is 3                              │
│   • 3 < 3.5, so 3/7 is less than 1/2               │
│                                                     │
│  [Bar: 1/2 = ██████░░░░░░]                         │
│  [Bar: 3/7 = █████░░░░░░░]   3/7 is shorter        │
│                                                     │
│  [Got it — Next question →]                         │
└─────────────────────────────────────────────────────┘
```

The "Next question" button auto-activates after 4 seconds if not pressed, with a countdown: "Continuing in 3... 2... 1..."

---

## 9. Multi-Benchmark Extension

### Unlock Condition

The multi-benchmark extension (adding 1/4 and 3/4 as secondary benchmarks) activates at **Level 4** in the progression. It does not replace the 1/2 benchmark — it supplements it. Some rounds use 1/2 as the benchmark; others use 1/4 or 3/4. The benchmark in play for each question is displayed prominently at the top of the screen.

### How UI Changes

At Level 3 and below, the benchmark display shows only the 1/2 reference (pie chart and bar model). At Level 4+, the benchmark display becomes a **three-position selector** showing 1/4, 1/2, and 3/4 with the active benchmark highlighted.

```
Benchmark:  [ 1/4 ]  [ ★ 1/2 ★ ]  [ 3/4 ]
            (dim)    (highlighted)  (dim)
```

When a non-1/2 benchmark is active, the highlighted benchmark pulses once and the question text changes from "Bigger or smaller than 1/2?" to "Bigger or smaller than 1/4?" (or 3/4).

The answer buttons also update: "Bigger than 1/4" / "Smaller than 1/4" / "Equal to 1/4".

### How the Fraction Bank Adapts

For 1/4-benchmark rounds:

- "Smaller than 1/4" fractions: 1/6, 1/5, 1/8, 1/10
- "Bigger than 1/4" fractions: 1/3, 3/8, 2/5, 1/2, 3/5, 2/3, 3/4
- "Equal to 1/4" fractions: 2/8, 3/12

For 3/4-benchmark rounds:

- "Smaller than 3/4" fractions: 1/2, 2/3, 5/8, 7/10
- "Bigger than 3/4" fractions: 5/6, 7/8, 4/5, 9/10
- "Equal to 3/4" fractions: 6/8, 9/12

### How the Hint System Adapts

The Denominator Spotlight hint generalizes from "half of b" to "three-quarters of b" or "one-quarter of b":

- 1/4 benchmark: "One-quarter of [den] is [den/4]. Is [num] less than [den/4]?"
- 3/4 benchmark: "Three-quarters of [den] is [3*den/4]. Is [num] greater than [3*den/4]?"

For odd denominators where den/4 is not an integer, the hint provides the floor/ceiling: "One-quarter of 9 is between 2 and 3."

The bar model hint also generalizes: the reference bar now shows the benchmark fraction (not always 1/2), and the target fraction is compared to that.

---

## 10. Anchor Fraction Animation

### 1/2 Benchmark Visual Behavior

The 1/2 benchmark reference area sits at the top of the screen and is always visible. It displays:

- A circular pie chart (88px diameter) with exactly half shaded in `#3b82f6` (blue)
- A rectangular bar model (200px × 32px) with left half shaded in `#3b82f6`
- The label "1/2" in 24px bold between the two visuals

**Pulse on question load:** Each time a new question appears, the benchmark area pulses once — the pie chart scales from 1.0 to 1.06 and back over 400ms, and the bar model's border briefly turns gold. This reminds the student to look at the benchmark before judging the new fraction.

**Pulse on student answer submission:** After the student clicks an answer button, the benchmark area pulses a second time in the feedback color (green for correct, red for incorrect), providing a final frame of reference as the result is revealed.

**Idle animation:** While the student is thinking (>5 seconds without interaction), the benchmark area does a subtle slow pulse (opacity oscillates between 0.85 and 1.0, period 2s) to draw attention back to the reference.

### Transition When Secondary Benchmarks Appear

When Level 4 is first entered and multi-benchmark mode activates:

1. A celebratory animation plays: the single 1/2 benchmark slides to the center position of the three-benchmark row
2. The 1/4 and 3/4 benchmarks materialize from left and right respectively, sliding in over 400ms
3. A "New Challenge: Compare to different benchmarks!" banner appears for 2 seconds
4. All three benchmarks are briefly highlighted in sequence (left-to-right sweep, 200ms each) to introduce them

When switching benchmarks mid-session (one question uses 1/4, the next uses 1/2), the inactive benchmarks dim smoothly and the active one brightens with a scale-up (1.0 → 1.05) over 200ms.

---

## 11. Score System

### Base Points Per Question

| Outcome         | Attempts | Hints Used | Base Points |
| --------------- | -------- | ---------- | ----------- |
| Correct         | 1        | 0          | 100         |
| Correct         | 1        | 1          | 75          |
| Correct         | 2        | 0          | 60          |
| Correct         | 2        | 1–2        | 40          |
| Correct         | 3+       | any        | 20          |
| Correct (equal) | 1        | 0          | 120         |
| Time expired    | —        | —          | 0           |
| Auto-revealed   | —        | —          | 0           |

The +20 bonus for correctly identifying equal-to-1/2 fractions reflects the additional difficulty of the "equal" judgment.

### Streak Bonuses

```typescript
function streakBonus(consecutiveCorrect: number, unasissstedStreak: number): number {
  let bonus = 0;
  // 3-in-a-row: +25 pts (applied to next question's base)
  if (consecutiveCorrect >= 3) bonus += 25;
  // 5-in-a-row unassisted: +50 pts
  if (unasissstedStreak >= 5) bonus += 50;
  // 10-in-a-row unassisted: +100 pts (legendary streak)
  if (unasissstedStreak >= 10) bonus += 100;
  return bonus;
}
```

The streak bonus is displayed as a "+25 STREAK!" pop-up animation above the score counter for 1.5 seconds when earned.

### Star Rating

Each session earns 1–5 stars based on session accuracy and hint usage:

| Stars | Criteria                                                  |
| ----- | --------------------------------------------------------- |
| 5 ★   | ≥ 90% accuracy, ≤ 1 hint used, all timed rounds completed |
| 4 ★   | ≥ 80% accuracy, ≤ 3 hints used                            |
| 3 ★   | ≥ 70% accuracy                                            |
| 2 ★   | 50–70% accuracy                                           |
| 1 ★   | < 50% accuracy (session completed)                        |

### "Benchmark Master" Badge

A persistent badge (displayed on the student's profile) unlocks when:

- The student has completed 3 Benchmark Challenge sessions
- With an average session score ≥ 500 points in those sessions
- With no regressions during those sessions

Badge appearance: gold shield with "½" in the center. Clicking the badge shows the badge details and the best Benchmark Challenge score.

---

## 12. Edge Cases

### Fractions with Very Large Denominators (e.g., 1/100)

Fractions with denominators > 20 are restricted to the Extreme pool (Benchmark Challenge only). The denominator spotlight hint is modified for large denominators: "Half of 100 is 50. Is 1 more or less than 50?" — the comparison is trivially easy, but the experience builds confidence that the rule works for any denominator.

The bar model for very large denominators (e.g., 1/100) would show 100 segments, which is not visually useful. For denominators > 20, the bar model is replaced with a decimal approximation display: "1/100 ≈ 0.01" with an arrow pointing to the left end of a compact number line.

### Fractions Greater Than 1

Fractions > 1 are not valid inputs in the standard game. The fraction-bank validator rejects any fraction where num > den at Levels 1–3. At Levels 4–5 and Benchmark Challenge, fractions up to 1 are allowed, but fractions > 1 are blocked with a validator error:

```typescript
function isValidBankEntry(num: number, den: number): boolean {
  if (den === 0) return false;
  if (num < 0 || den < 0) return false;
  if (num / den > 1.0) return false; // block improper fractions
  return true;
}
```

If a teacher's custom pool includes an improper fraction, the engine skips it and logs a warning: "Fraction [num]/[den] skipped: value > 1 is outside the supported range."

### Whole Numbers (0/n or n/n)

Fraction 0/n (= 0) is skipped automatically (no meaningful benchmark comparison). Fraction n/n (= 1) is also skipped. If the teacher's pool forces one of these, a fallback message is displayed: "We don't compare whole numbers in this activity."

---

## 13. Full Data Structures

### Round Record TypeScript Interface

```typescript
interface RoundRecord {
  activity: 'benchmark_battle';
  roundNum: number;
  sessionId: string;
  studentId: string;
  targetFraction: {
    num: number;
    den: number;
    decimal: number;
    distanceFromBenchmark: number;
  };
  benchmark: {
    num: number;
    den: number;
    decimal: number;
  };
  correctAnswer: 'bigger' | 'smaller' | 'equal';
  userAnswer: 'bigger' | 'smaller' | 'equal' | 'timeout';
  correct: boolean;
  difficulty: 'easy' | 'medium' | 'hard' | 'extreme';
  timerActive: boolean;
  timerDurationMs: number | null;
  timeUsedMs: number;
  timeBonusPoints: number;
  basePoints: number;
  totalPoints: number;
  hintsUsed: number;
  hintSequence: Array<{
    type: 'bar_model' | 'denominator' | 'number_line' | 'rule_reminder';
    triggeredAtAttempt: number;
    pointsCost: number;
  }>;
  hintAssisted: boolean;
  attempts: number;
  ruleCardVisible: 'full' | 'collapsed' | 'hidden' | 'reopened';
}
```

### Session Summary TypeScript Interface

```typescript
interface SessionSummary {
  sessionId: string;
  studentId: string;
  activity: 'benchmark_battle';
  date: string; // ISO 8601
  startDifficulty: 'easy' | 'medium' | 'hard';
  finalDifficulty: 'easy' | 'medium' | 'hard' | 'extreme';
  advancedToChallenge: boolean;
  totalRounds: number;
  correctRounds: number;
  incorrectRounds: number;
  timedOutRounds: number;
  accuracy: number; // 0–1
  unasissstedCorrect: number;
  avgTimeMs: number;
  fastestCorrectMs: number;
  hintsTotal: number;
  hintBreakdown: {
    bar_model: number;
    denominator: number;
    number_line: number;
    rule_reminder: number;
  };
  starsEarned: number; // 1–5
  totalPoints: number;
  streakBonusPoints: number;
  timeBonusPoints: number;
  longestCorrectStreak: number;
  regressions: number;
  advancements: number;
  rounds: RoundRecord[];
  scaffoldRecommendation: 'advance' | 'stay' | 'regress';
}
```

### Hint Record TypeScript Interface

```typescript
interface HintRecord {
  hintId: string;
  sessionId: string;
  roundNum: number;
  hintType: 'bar_model' | 'denominator' | 'number_line' | 'rule_reminder';
  triggeredBy: 'auto' | 'button'; // auto = wrong answer trigger; button = student request
  triggeredAtAttempt: number;
  targetFraction: { num: number; den: number };
  benchmark: { num: number; den: number };
  pointsCost: number;
  resultAfterHint: 'correct' | 'wrong' | 'timeout' | 'pending';
}
```

---

## 14. UI Layout Mockups

### Level 1 (No Timer, Full Rule Card, 480px Phone)

```
┌──────────────────────────────────────────┐
│  Benchmark Battle              ❓ Help    │
├──────────────────────────────────────────┤
│  BENCHMARK:  1/2                         │
│  [Pie: ½◐]    [Bar: ████░░░░░░░░]       │
├──────────────────────────────────────────┤
│  ┌──────────────────────────────────┐    │
│  │ Rule Card                        │    │
│  │ Top number > half of bottom?     │    │
│  │ → BIGGER. Otherwise → SMALLER.   │    │
│  └──────────────────────────────────┘    │
│                                          │
│  Is   3/7   bigger or smaller?           │
│                                          │
│  [Bar: 3/7  ██████░░░░░░░░░░]           │
│                                          │
│  [  ✨ BIGGER  ]  [  ✨ SMALLER  ]       │
│                                          │
│  Round 1 of 12          Score: 0         │
└──────────────────────────────────────────┘
```

### Level 3 (Timed, Rule Hidden, Equal Button, 768px Tablet)

```
┌─────────────────────────────────────────────────────┐
│  Benchmark Battle                    Score: 340 ★★★  │
├─────────────────────────────────────────────────────┤
│  BENCHMARK:  1/2                                    │
│  [Pie: ½◐]    [Bar: █████████░░░░░░░░░]            │
│                                                     │
│  [████████████████░░░░░░░░░]  8.2 sec  ← timer bar │
│                                                     │
│  Is   5/9   bigger or smaller than 1/2?             │
│                                                     │
│  [Bar: 5/9  ███████████░░░░░░░]                    │
│                                                     │
│  [   BIGGER   ]  [   SMALLER   ]  [  EQUAL TO 1/2 ]│
│                                                     │
│  [💡 Hint]    Round 10 of 12    [⏸ Pause]          │
└─────────────────────────────────────────────────────┘
```

### Benchmark Challenge Mode (Hard + Extreme Pool, No Hints)

```
┌──────────────────────────────────────────────────────────────────┐
│  ⚡ BENCHMARK CHALLENGE ⚡               Score: 1240  🏆 #3 Today  │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  BENCHMARK:  1/2                                                 │
│  [Pie: ½◐]  [Bar: ████░░░░░]                                    │
│                                                                  │
│  [██████████░░░░]  4.8 sec remaining                             │
│                                                                  │
│        Is   7/15   bigger, smaller, or equal to 1/2?            │
│                                                                  │
│    [   BIGGER   ]    [   SMALLER   ]    [  EQUAL TO 1/2  ]      │
│                                                                  │
│    ← No hints in Challenge Mode →     Streak: 🔥 6 in a row     │
│                                                                  │
│    Question 8 / ∞    [End Challenge]                             │
└──────────────────────────────────────────────────────────────────┘
```

---

## 15. Accessibility & Keyboard Controls

### Full Keyboard Map

| Key           | Action                                              |
| ------------- | --------------------------------------------------- |
| B             | Press "Bigger than benchmark" button                |
| S             | Press "Smaller than benchmark" button               |
| E             | Press "Equal to benchmark" button (Level 3+ only)   |
| H             | Request next available hint                         |
| P             | Pause / resume timer                                |
| Enter / Space | Confirm currently focused button                    |
| Tab           | Move focus between Bigger / Smaller / Equal buttons |
| Escape        | Cancel any open hint overlay                        |
| R             | Replay the current fraction's audio description     |
| N             | Skip to next question (teacher/accessibility mode)  |

All keyboard shortcuts display in a collapsible "Keyboard shortcuts" panel accessible from the Help menu.

### Screen Reader Scripts

**On question load:**

```
"New question. Is [fraction name] bigger, smaller, or equal to one half?
 The fraction [fraction name] has [num] parts out of [den] equal parts.
 Benchmark is one half. Use B for Bigger, S for Smaller, [E for Equal at Level 3+]."
```

**On correct answer:**

```
"Correct! [fraction name] is [answer] than one half.
 [Full explanation, e.g.: 'Three is less than half of seven, which is three point five.']
 [Time bonus if applicable: 'Time bonus: plus [n] points.']
 Score is now [total points]."
```

**On incorrect answer:**

```
"Not quite. [hint instruction if auto-triggered]"
```

**On time expiry:**

```
"Time's up. The correct answer was [answer].
 [Explanation]. Loading next question."
```

**Hint announcements** read the full hint text, not a summary. The number-line hint announces: "Number line hint: [fraction name] is at approximately [decimal as percentage] percent. The one-half mark is at fifty percent. [Fraction name] is on the [left/right] side of one-half."

### Timer Pause for Accessibility

Students with documented accessibility needs (set by teacher in the accessibility panel) receive:

- **Unlimited pauses** per round (no one-pause restriction)
- **Extended time**: timer multiplied by 1.5× (configurable; 1.25×, 1.5×, 2×)
- **Timer-off mode**: timer bar is hidden and no time pressure is applied; leaderboard entry is disabled, but full scoring otherwise applies
- **Auto-pause on focus loss**: if the browser tab loses focus (e.g., a student using a screen reader switches windows), the timer pauses automatically and resumes on focus return

### Motor Accessibility

**Large button mode:** Answer buttons enlarge to full-width, stacked vertically (not side-by-side), minimum 72px height each. Activated in accessibility panel.

**Button spacing:** In standard mode, a 16px gap separates Bigger and Smaller buttons to prevent accidental double-presses. In large button mode, the gap increases to 32px.

**Confirmation mode:** An optional "Confirm before submitting" setting requires a second press (or a 500ms dwell) to confirm an answer. Prevents accidental button presses. Students see: "You pressed BIGGER. Press again to confirm, or press SMALLER to change."

**Reduced motion:** When `prefers-reduced-motion: reduce` is detected, all CSS animations (pulse effects, bar-model sweeps, streak pop-ups) are replaced with instant state changes. The timer color still changes, but no transitions occur.
