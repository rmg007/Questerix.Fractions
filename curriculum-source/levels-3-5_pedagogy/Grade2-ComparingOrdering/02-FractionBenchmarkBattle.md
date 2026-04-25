# Fraction Benchmark Battle

## Overview
Kids compare two fractions using 1/2 as a reference point. They answer: "Is this fraction bigger or smaller than 1/2?" This builds the critical skill of using benchmarks for quick fraction comparison.

## Core Mechanics

### Question Structure
- Display Fraction A (e.g., 3/7) with visual model (pie chart, bar)
- Ask: "Is 3/7 bigger or smaller than 1/2?"
- Two buttons: "Bigger than 1/2" and "Smaller than 1/2"
- After selection, show Fraction B (1/2 visual), explain why, show exact positions on number line

### Benchmark System
- Always compare to 1/2 (anchor fraction shown at top of screen)
- Fractions to compare:
  - **Easy**: 1/4, 3/4, 1/3, 2/3, 4/5, 1/5
  - **Medium**: 3/8, 5/8, 2/5, 3/5, 5/7, 2/7
  - **Hard**: 4/9, 5/9, 3/10, 7/10, 4/7, 5/9

### Hint Strategies (Progressive Removal)
- **Hint 1**: Show 1/2 model side-by-side with target fraction
- **Hint 2**: Highlight numerator/denominator relationship ("If den = 8, numerator must be > 4 for bigger than 1/2")
- **Hint 3**: Show number line with both fractions marked
- After 3 hints used, provide answer but flag for review

### Progression to Harder Comparisons
1. **Round 1–3**: Simple denominators (4, 6, 8), easy comparisons
2. **Round 4–6**: Mixed denominators (5, 7, 9), trickier pairs
3. **Round 7+**: Benchmark Challenge—same rules, harder pairs and/or shorter time limit (15 sec vs. unlimited)

## Data Structure
```json
{
  "activity": "benchmark_battle",
  "round": 1,
  "targetFraction": { "num": 3, "den": 7, "decimal": 0.428 },
  "benchmark": { "num": 1, "den": 2, "decimal": 0.5 },
  "correctAnswer": "smaller",
  "hintsUsed": 0,
  "timeSpent": 8.5,
  "difficulty": "medium"
}
```

## Feedback Engine
- **Correct**: "Great! 3/7 is less than 1/2. Since 7 ÷ 2 = 3.5, you need more than 3.5 sevenths."
- **Incorrect**: "Not quite. Let's look at the model. [Show both models side by side]. 3/7 has fewer parts filled than 1/2."
- **After wrong answer**: Offer retry or move to next question

## Scaffolding Removal
- Early rounds: show model, longer think time (no timer)
- Mid rounds: model optional (toggle button), 20-second timer appears
- Late rounds: no model shown; 15-second timer; leaderboard bonus for fast answers

## Accessibility
- Option to replace models with description ("numerator is 3, denominator is 7")
- Keyboard: arrow keys to select answer, Enter to submit
- Audio explanation of comparisons available
