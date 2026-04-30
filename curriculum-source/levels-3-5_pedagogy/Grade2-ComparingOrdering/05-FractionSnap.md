# Fraction Snap

## Overview

Fast-paced card game where kids compare two fractions as quickly as possible. Fastest correct answer wins. Builds quick intuition and fluency with fraction comparison under time pressure.

## Core Mechanics

### Game Loop

1. **Display Phase**: Show two fraction cards (e.g., 3/7 vs. 4/9) with simple pie or bar models
2. **Question**: "Which fraction is bigger?"
3. **Answer Phase**: Two buttons: "Left" or "Right" (or A vs. B)
4. **Timer**: 15 seconds per round (early), 10 seconds (mid), 5 seconds (hard)
5. **Scoring**:
   - Correct in < 3 sec: +10 points + 5 bonus
   - Correct in 3–7 sec: +10 points
   - Correct in 7–15 sec: +5 points
   - Wrong or timeout: 0 points, show correct answer

### Card Deck

#### Easy Mode (Rounds 1–3)

- Fractions: 1/2, 1/3, 2/3, 1/4, 3/4, 1/5, 4/5
- Comparisons: easy (1/2 vs. 1/4, 1/3 vs. 2/3)
- Time per card: 15 seconds

#### Medium Mode (Rounds 4–7)

- Fractions: 1/6, 2/5, 3/7, 4/9, 5/8, 3/10
- Comparisons: mixed denominators, trickier (2/5 vs. 3/7)
- Time per card: 10 seconds

#### Hard Mode (Rounds 8+)

- Fractions: 4/11, 5/12, 7/13, 6/11, 5/9
- Comparisons: very close fractions (5/9 vs. 4/7)
- Time per card: 5 seconds
- No models shown (visual removed, kids must visualize)

### Difficulty Progression

```
Win 3 in a row → advance difficulty
Wrong answer → stay at same difficulty
Time runs out → skip, stay at difficulty
```

### Score System

#### Round Scoring

```
Correct in:
  0–3 sec: +10 (fast) + 5 (speed bonus) = +15
  3–7 sec: +10
  7–15 sec: +5
  Wrong/Timeout: +0, show answer for 2 sec
```

#### Game Scoring

- Track accuracy: correct / total
- Track speed: average time per correct answer
- Leaderboard: (accuracy × speed multiplier)
- Example: 8 correct in 25 seconds = 80% \* 2.0x = 1.6x multiplier

### Balancing for Mixed Denominators

- **Early pairing**: Avoid very close fractions (e.g., 5/9 vs. 4/7 too hard initially)
- **Difficulty curve**: Gradually introduce harder pairs (separated by 0.1 → 0.05 → 0.02)
- **Pair database** with difficulty scores:

```json
{
  "pair": [
    { "num": 1, "den": 2 },
    { "num": 1, "den": 4 }
  ],
  "difficulty": 1,
  "timingRecommendation": 15
}
```

## Data Structure

```json
{
  "activity": "fraction_snap",
  "gameId": "snap_2024_04_24_001",
  "mode": "easy",
  "rounds": [
    {
      "roundNum": 1,
      "fractionA": { "num": 1, "den": 2 },
      "fractionB": { "num": 1, "den": 4 },
      "correct": "A",
      "userAnswer": "A",
      "timeToAnswer": 2.3,
      "points": 15
    }
  ],
  "totalScore": 145,
  "totalCorrect": 14,
  "totalWrong": 1,
  "accuracy": 0.933,
  "avgTimePerCard": 4.2
}
```

## Leaderboard & Progression

- Session leaderboard: Show top 5 high scores from today
- Weekly leaderboard: Cumulative points
- Badges: "Speed Demon" (avg < 3 sec), "Accuracy Master" (100% in Hard mode)
- Unlock Hard mode: Achieve 80%+ accuracy in Medium

## Accessibility

- High-contrast cards
- Larger button targets (60px min)
- Option to use keyboard: A/Left Arrow for left, D/Right Arrow for right
- Audio cue on correct (beep/chime) and wrong (error sound)
- Speech option: Read fractions aloud before showing ("Comparing three-sevenths and four-ninths")
