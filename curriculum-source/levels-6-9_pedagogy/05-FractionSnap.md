# Fraction Snap

## Overview

Fast-paced card game where two fraction cards flip up and kids must tap the bigger (or smaller, as directed) fraction as quickly as possible. Speed and accuracy both score points. Difficulty scales by how close the fractions are in value.

---

## 1. Game Loop

```
Round Start
  └── Flip two fraction cards face-up (simultaneous reveal animation, 200ms)
  └── Question banner: "Tap the BIGGER fraction!"
  └── Timer bar starts counting down
  └── Player taps a card
        ├── Correct + fast → +points, card flashes green, next round
        ├── Correct + slow → +points (fewer), next round
        ├── Wrong → 0 points, card flashes red, correct card highlighted 2 sec, next round
        └── Timer expires → 0 points, reveal correct, next round
```

### Card Reveal Animation

- Cards start face-down (gray back with "?" center)
- On round start: 180° flip animation (150ms) reveals fraction and model
- Reveal is simultaneous for both cards — no sequential advantage
- Question direction (bigger/smaller) shown 200ms before flip to give reading time

### Timer Bar

- Full-width progress bar below the cards, drains left-to-right
- Color transitions: green (>60%) → yellow (30–60%) → red (<30%)
- Tick sound at 3s remaining; urgent tick at 1s

---

## 2. Score System

### Per-Round Scoring

```typescript
function calculateRoundScore(
  correct: boolean,
  timeMs: number,
  timerMs: number, // total time for this difficulty level
  difficulty: Difficulty
): number {
  if (!correct) return 0;

  const timeRatio = timeMs / timerMs; // 0 = instant, 1 = last second

  const baseScore = { easy: 10, medium: 15, hard: 20 }[difficulty];

  if (timeRatio <= 0.2) return baseScore + 10; // Lightning bonus
  if (timeRatio <= 0.4) return baseScore + 5; // Speed bonus
  if (timeRatio <= 0.75) return baseScore; // Standard
  return Math.floor(baseScore * 0.5); // Slow but correct
}
```

### Score Tiers

| Time Used      | Bonus     | Badge Label      |
| -------------- | --------- | ---------------- |
| ≤ 20% of timer | +10       | ⚡ Lightning     |
| 21–40%         | +5        | 🔥 Fast          |
| 41–75%         | +0        | ✅ Correct       |
| 76–100%        | half base | 🐢 Slow but Sure |

### Game Score Aggregation

```typescript
interface GameScore {
  totalPoints: number;
  correctCount: number;
  wrongCount: number;
  timeoutCount: number;
  accuracy: number; // correctCount / (correctCount + wrongCount)
  avgTimeMs: number; // avg time for correct answers only
  lightningCount: number;
  fastCount: number;
  finalRating: 'Bronze' | 'Silver' | 'Gold' | 'Diamond';
}

function calculateRating(score: GameScore): GameScore['finalRating'] {
  if (score.accuracy >= 0.95 && score.avgTimeMs < 3000) return 'Diamond';
  if (score.accuracy >= 0.85 && score.avgTimeMs < 5000) return 'Gold';
  if (score.accuracy >= 0.7) return 'Silver';
  return 'Bronze';
}
```

### Leaderboard Entry

```json
{
  "studentId": "s_abc123",
  "gameId": "snap_2026_04_24_001",
  "totalPoints": 310,
  "accuracy": 0.92,
  "avgTimeMs": 2800,
  "highestDifficulty": "hard",
  "rating": "Gold",
  "badges": ["Speed Demon", "Streak x5"],
  "date": "2026-04-24"
}
```

---

## 3. Difficulty Progression

### Difficulty Tiers

```typescript
const difficultyTiers: Record<Difficulty, DifficultyConfig> = {
  easy: {
    timerMs: 15000,
    pairDeltaMin: 0.25, // fraction values differ by at least 0.25
    showModel: true,
    modelType: 'bar',
    questionDirection: 'bigger_only', // always "tap the bigger"
  },
  medium: {
    timerMs: 10000,
    pairDeltaMin: 0.1,
    showModel: true, // bar model, smaller
    modelType: 'bar_small',
    questionDirection: 'mixed', // alternates bigger / smaller
  },
  hard: {
    timerMs: 6000,
    pairDeltaMin: 0.03,
    showModel: false,
    modelType: null,
    questionDirection: 'mixed',
  },
  extreme: {
    timerMs: 4000,
    pairDeltaMin: 0.01, // fractions within 1 percentage point
    showModel: false,
    modelType: null,
    questionDirection: 'random', // includes "equal" as trap
  },
};
```

### Auto-Advancement Rules

```
Win 3 consecutive rounds → advance to next tier (if not already at extreme)
Wrong answer → reset streak; stay at current tier
Timeout → reset streak; stay at current tier
Win 5 rounds at extreme → unlock "Legend" badge
```

### Manual Difficulty Selection

- Settings button (⚙️) allows student to select starting difficulty
- Overrides auto-advance only for this session
- Recommended for classroom use: teacher can lock difficulty

---

## 4. Pair Database & Balancing for Mixed Denominators

### Pair Difficulty Score

Every fraction pair has a precomputed `difficultyScore`:

```typescript
function pairDifficulty(a: Fraction, b: Fraction): number {
  const delta = Math.abs(a.num / a.den - b.num / b.den);
  const lcm = leastCommonMultiple(a.den, b.den);
  const denominatorComplexity = Math.log2(lcm); // higher LCM = harder to compare mentally
  return (1 - delta) * 0.7 + (denominatorComplexity / 10) * 0.3;
  // Score 0 = trivially easy, 1 = extremely hard
}
```

### Curated Pair Bank

```typescript
const pairBank: FractionPair[] = [
  // Easy (delta ≥ 0.25, score < 0.30)
  { a: { num: 1, den: 2 }, b: { num: 1, den: 4 }, difficulty: 0.15 },
  { a: { num: 3, den: 4 }, b: { num: 1, den: 4 }, difficulty: 0.1 },
  { a: { num: 2, den: 3 }, b: { num: 1, den: 3 }, difficulty: 0.12 },
  { a: { num: 4, den: 5 }, b: { num: 1, den: 5 }, difficulty: 0.08 },

  // Medium (delta 0.10–0.25, score 0.30–0.60)
  { a: { num: 3, den: 5 }, b: { num: 3, den: 7 }, difficulty: 0.42 },
  { a: { num: 2, den: 5 }, b: { num: 3, den: 8 }, difficulty: 0.45 },
  { a: { num: 5, den: 8 }, b: { num: 3, den: 5 }, difficulty: 0.38 },
  { a: { num: 4, den: 7 }, b: { num: 3, den: 5 }, difficulty: 0.5 },

  // Hard (delta 0.03–0.10, score 0.60–0.80)
  { a: { num: 5, den: 9 }, b: { num: 4, den: 7 }, difficulty: 0.68 },
  { a: { num: 3, den: 7 }, b: { num: 4, den: 9 }, difficulty: 0.72 },
  { a: { num: 7, den: 12 }, b: { num: 3, den: 5 }, difficulty: 0.65 },

  // Extreme (delta < 0.03 or equal, score > 0.80)
  { a: { num: 5, den: 11 }, b: { num: 6, den: 13 }, difficulty: 0.88 },
  { a: { num: 7, den: 15 }, b: { num: 8, den: 17 }, difficulty: 0.91 },
  // Equal traps
  { a: { num: 1, den: 2 }, b: { num: 2, den: 4 }, difficulty: 0.95, isEqual: true },
  { a: { num: 2, den: 3 }, b: { num: 4, den: 6 }, difficulty: 0.95, isEqual: true },
];
```

### Equal Fraction Handling

- Equal pairs appear only in Hard/Extreme tiers
- A third button "They're EQUAL" appears when equal pairs are possible
- Equal trap design: student must recognize equivalence, not just compare
- Equal correct answer: full points + "Equivalent fractions expert!" badge

### Pair Selection per Round

```typescript
function selectPair(tier: Difficulty, recentPairs: FractionPair[]): FractionPair {
  const pool = pairBank.filter(
    (p) => p.difficulty >= tierRange[tier].min && p.difficulty <= tierRange[tier].max
  );
  // Avoid repeating last 3 pairs
  const recentIds = new Set(recentPairs.slice(-3).map((p) => p.id));
  const candidates = pool.filter((p) => !recentIds.has(p.id));
  return candidates[Math.floor(Math.random() * candidates.length)] ?? pool[0];
}
```

---

## 5. Visual Design

### Card Layout

```
┌─────────────────────────────────────────────┐
│  ❓ Tap the BIGGER fraction!                 │  ← direction banner
├──────────────────┬──────────────────────────┤
│                  │                          │
│     3/7          │       4/9                │
│  [bar model]     │    [bar model]           │
│                  │                          │
└──────────────────┴──────────────────────────┘
│ ████████████████████░░░░░░░░░░░░░░░░░░░░░░ │  ← timer bar
└─────────────────────────────────────────────┘
│  Score: 145   Streak: 🔥3   Round 7/10      │
└─────────────────────────────────────────────┘
```

### Model Display

- Easy: full bar model, denominator ticks visible, colored fill
- Medium: compact bar model (50% height), no ticks, just fill ratio
- Hard/Extreme: no model; fraction label only, centered in card

### Card Tap Feedback

| Result         | Animation                                | Sound       |
| -------------- | ---------------------------------------- | ----------- |
| Correct (fast) | Green flash + ⚡ icon + bounce           | Chime       |
| Correct (slow) | Green flash + ✅                         | Short chime |
| Wrong          | Red flash + ✗ + correct card highlighted | Error tone  |
| Timeout        | Both cards gray + correct revealed       | Low buzz    |

---

## 6. Badges & Progression

### Session Badges

| Badge              | Trigger                              |
| ------------------ | ------------------------------------ |
| ⚡ Speed Demon     | Average time < 3 sec over 10 rounds  |
| 🎯 Accuracy Master | 100% correct in a Hard session       |
| 🔥 On Fire         | 5-round correct streak               |
| 🧠 Equal Expert    | Correctly identify 3 equal pairs     |
| 💎 Diamond Run     | 10 rounds all Lightning-tier correct |
| 🦁 Legend          | Win 5 rounds at Extreme tier         |

### Cumulative Progress

- Weekly points total tracked
- "Best score" per difficulty tier stored
- Unlock Hard mode: 80%+ accuracy in 2 Medium sessions
- Unlock Extreme mode: 80%+ accuracy in 2 Hard sessions

---

## 7. Data Structures

### Round Record

```json
{
  "roundNum": 7,
  "fractionA": { "num": 3, "den": 7, "decimal": 0.4286 },
  "fractionB": { "num": 4, "den": 9, "decimal": 0.4444 },
  "correctAnswer": "B",
  "userAnswer": "B",
  "correct": true,
  "timeMs": 3800,
  "timerMs": 6000,
  "scoreAwarded": 20,
  "bonusTier": "standard",
  "difficulty": "hard",
  "isEqualPair": false
}
```

### Full Session Record

```json
{
  "gameId": "snap_2026_04_24_001",
  "studentId": "s_abc123",
  "startedAt": "2026-04-24T09:15:00Z",
  "rounds": [
    /* array of round records */
  ],
  "totalPoints": 310,
  "correctCount": 14,
  "wrongCount": 1,
  "timeoutCount": 0,
  "accuracy": 0.933,
  "avgTimeMs": 3200,
  "longestStreak": 7,
  "maxDifficultyReached": "hard",
  "badges": ["Speed Demon", "On Fire"],
  "rating": "Gold"
}
```

---

## 8. Accessibility

- Cards: minimum 140×140px; full-card tap target (not just fraction label)
- Keyboard: `A`/`Left Arrow` = left card; `D`/`Right Arrow` = right card; `E` = Equal (when visible)
- Timer pause: single accessible pause button (once per round)
- Screen reader: announce both fractions before timer starts ("Comparing three sevenths and four ninths. Tap the bigger fraction. Timer begins now.")
- High contrast: card borders 3px solid; no color-only feedback (icon always accompanies color flash)
- Motion sensitivity: disable card flip animation if OS reduce-motion is set; use simple fade instead
