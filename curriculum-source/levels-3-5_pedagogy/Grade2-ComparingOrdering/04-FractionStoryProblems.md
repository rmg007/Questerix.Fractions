# Fraction Story Problems

## Overview

Real-world contexts make fraction comparisons meaningful. Kids choose an answer ("Which serving is bigger: 2/3 cup or 3/4 cup?") and explain their reasoning using a model or number line.

## Core Mechanics

### Prompt Library

Categories of problems:

1. **Cooking/Food**: "Which recipe uses more vanilla: 2/3 tsp or 3/4 tsp?"
2. **Time**: "Is 2/5 hour longer than 1/3 hour?"
3. **Distance**: "Who ran farther: 3/5 mile or 4/7 mile?"
4. **Sharing/Portions**: "Which friend gets a bigger slice: 1/3 pizza or 2/5 pizza?"
5. **School supplies**: "Does Emma need more: 3/4 yard of ribbon or 2/3 yard?"

Data structure:

```json
{
  "storyId": "cooking_01",
  "context": "Cooking",
  "prompt": "Grandma's cookie recipe calls for 2/3 cup of sugar. The new smaller recipe calls for 3/4 cup of sugar. Which recipe uses MORE sugar?",
  "fractionA": { "num": 2, "den": 3, "label": "Grandma's recipe" },
  "fractionB": { "num": 3, "den": 4, "label": "Smaller recipe" },
  "correctAnswer": "B",
  "decimal_A": 0.667,
  "decimal_B": 0.75,
  "visualization": "measuring_cups"
}
```

### Input Validation

- Single-select radio buttons: "A is bigger" or "B is bigger"
- Validation: Check answer is selected before allowing submission
- After selection, require explanation (see below)

### Feedback Engine

#### Correctness Feedback

- **Correct**: "Yes! 3/4 cup is more than 2/3 cup. Good job using [model/number line]!"
- **Incorrect**: "Hmm, let's check using a model. [Show visual comparison]. [Correct fraction] is actually bigger."

#### Explanation Modes (Choose One)

1. **Model-based explanation**:
   - Show two pie charts or bar models side-by-side
   - Shade the fractions, show which is bigger
   - Kid confirms: "This shows 3/4 is bigger than 2/3"

2. **Number-line explanation**:
   - Show 0–1 number line with both fractions marked
   - Kid confirms visual positions

3. **Written explanation** (optional for advanced kids):
   - Text box: "Explain how you know 3/4 > 2/3"
   - Examples: "Because 3/4 = 0.75 and 2/3 = 0.666..." or "3 out of 4 is more than 2 out of 3"

### Scaffolding by Level

- **Level 1**: Same denominator (1/2 vs. 2/4), model always shown
- **Level 2**: Related denominators (1/2 vs. 2/3), one model, one number line option
- **Level 3**: Unrelated denominators (3/7 vs. 4/9), kid chooses model or number line
- **Level 4**: 3 fractions to compare, pick the biggest/smallest

## Progression & Hints

- **First attempt**: "Think about how many parts each fraction has"
- **Second attempt**: Option to see model or number line
- **Third attempt**: Show answer and explanation
- **Advancement**: After 4 consecutive correct answers, move to next story category

## Data Structure

```json
{
  "activity": "story_problems",
  "problem": {
    /* as above */
  },
  "userAnswer": "B",
  "correct": true,
  "explanationMode": "model",
  "timeSpent": 12.3,
  "attempts": 1,
  "category": "cooking"
}
```

## Accessibility

- Text read aloud (screen reader friendly)
- Model and number-line buttons clearly labeled
- High-contrast models (no subtle shading)
- Keyboard navigation: Tab to select answer and explanation method
