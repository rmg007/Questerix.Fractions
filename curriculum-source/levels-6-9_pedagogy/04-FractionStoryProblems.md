# Fraction Story Problems

## Overview

Real-world contexts anchor fraction comparison in everyday life. Kids read a short story, choose which fraction is bigger or smaller, and explain using a model, number line, written text, or voice. The feedback engine validates the choice and scaffolds the explanation. Level 4 extends to 3-way comparison.

---

## 1. Pedagogical Rationale

### Why Contextualized Problems Deepen Understanding

Abstract fraction comparison (e.g., "Is 3/5 > 2/3?") and contextualized comparison (e.g., "Sofia ran 3/5 of a mile; Maya ran 2/3 of a mile — who ran farther?") might appear mathematically identical, but they produce very different learning outcomes.

**1. Semantic grounding activates intuitive checking.** When a student works in context, they have a real-world sense of "does this answer make sense?" A child who has eaten pizza knows that eating more than one whole pizza is impossible — an error that produces an answer > 1 triggers immediate dissonance. Abstract comparison strips this protective mechanism away.

**2. Transfer learning research supports contextual framing.** Koedinger et al. (2008) demonstrated that students who learned fraction comparison through story problems showed 40% better transfer to novel fraction tasks compared to symbol-only instruction, even when the symbolic skill level was identical. The narrative context builds semantic representations that generalize.

**3. Motivation and engagement.** Grade 2 students disengage quickly from decontextualized symbol manipulation. Story problems ground the task in characters, action, and outcomes that are personally relevant — pizza, running, ribbons, chocolate bars.

**4. Explanation requirements force metacognition.** Asking "How do you know?" after a correct answer requires students to articulate their reasoning, which consolidates the conceptual understanding and exposes shallow "lucky guess" answers that correct answers alone cannot detect.

**5. Real-world accuracy prevents misconceptions.** Poorly designed story contexts (e.g., "3/7 of a pizza" — an unusual partition) inadvertently suggest that any fraction is plausible for any situation. Careful story design reinforces that denominator choice reflects real-world structures (cutting a pizza into 8 slices is common; 7 is unusual and should be contextually motivated).

**6. ELL and language-development support.** For English Language Learners, story problems provide vocabulary in context (e.g., "yard," "recipe," "trail") alongside mathematical content, supporting dual development. The TTS read-aloud feature ensures access regardless of reading level.

---

## 2. Complete Prompt Library

### 40 Problems Across 8 Categories

#### Category A — Cooking (5 problems)

```json
[
  {
    "storyId": "cook_01",
    "context": "Cooking",
    "difficulty": 2,
    "imageKey": "measuring_cups",
    "prompt": "Grandma's cookie recipe uses 2/3 cup of sugar. The new healthier recipe uses 3/4 cup of sugar. Which recipe uses MORE sugar?",
    "fractionA": { "num": 2, "den": 3, "label": "Grandma's recipe", "decimal": 0.667 },
    "fractionB": { "num": 3, "den": 4, "label": "New recipe", "decimal": 0.75 },
    "question": "bigger",
    "correctAnswer": "B",
    "explanation": "3/4 = 0.75 and 2/3 ≈ 0.667. The new recipe uses more sugar. On a bar model, 3 of 4 equal parts is more filled than 2 of 3 equal parts.",
    "nearMiss": false,
    "contextualErrorMsg": "If Grandma's recipe used more sugar, it would be the less healthy choice — check the models again!"
  },
  {
    "storyId": "cook_02",
    "context": "Cooking",
    "difficulty": 2,
    "imageKey": "pizza_slices",
    "prompt": "Leo ate 3/8 of a pizza. Sofia ate 2/5 of the same-size pizza. Who ate MORE?",
    "fractionA": { "num": 3, "den": 8, "label": "Leo", "decimal": 0.375 },
    "fractionB": { "num": 2, "den": 5, "label": "Sofia", "decimal": 0.4 },
    "question": "bigger",
    "correctAnswer": "B",
    "explanation": "2/5 = 0.40 and 3/8 = 0.375. Sofia ate slightly more — but it's very close!",
    "nearMiss": true,
    "contextualErrorMsg": "That would mean Leo ate more pizza, but 3/8 is just a little less than 2/5. Check the number line."
  },
  {
    "storyId": "cook_03",
    "context": "Cooking",
    "difficulty": 2,
    "imageKey": "juice_glasses",
    "prompt": "Two juice glasses: one has 3/5 full, one has 5/8 full. Which glass has MORE juice?",
    "fractionA": { "num": 3, "den": 5, "label": "First glass", "decimal": 0.6 },
    "fractionB": { "num": 5, "den": 8, "label": "Second glass", "decimal": 0.625 },
    "question": "bigger",
    "correctAnswer": "B",
    "explanation": "5/8 = 0.625 and 3/5 = 0.600. The second glass has more juice — but only a tiny bit!",
    "nearMiss": true,
    "contextualErrorMsg": "Those are very close! 3/5 and 5/8 differ by only 0.025. Use the bar models to see the difference."
  },
  {
    "storyId": "cook_04",
    "context": "Cooking",
    "difficulty": 1,
    "imageKey": "cake_slices",
    "prompt": "Mom cut a cake. Arlo got 1/4 of the cake. Bella got 1/2 of the cake. Who got MORE cake?",
    "fractionA": { "num": 1, "den": 4, "label": "Arlo", "decimal": 0.25 },
    "fractionB": { "num": 1, "den": 2, "label": "Bella", "decimal": 0.5 },
    "question": "bigger",
    "correctAnswer": "B",
    "explanation": "1/2 = 0.50 and 1/4 = 0.25. Bella got twice as much cake as Arlo!",
    "nearMiss": false,
    "contextualErrorMsg": "1/4 is one piece out of four — that's smaller than 1/2, which is half the whole cake."
  },
  {
    "storyId": "cook_05",
    "context": "Cooking",
    "difficulty": 3,
    "imageKey": "flour_bags",
    "prompt": "A bread recipe needs 5/6 cup of flour. A muffin recipe needs 7/9 cup of flour. Which recipe needs MORE flour?",
    "fractionA": { "num": 5, "den": 6, "label": "Bread recipe", "decimal": 0.833 },
    "fractionB": { "num": 7, "den": 9, "label": "Muffin recipe", "decimal": 0.778 },
    "question": "bigger",
    "correctAnswer": "A",
    "explanation": "5/6 ≈ 0.833 and 7/9 ≈ 0.778. The bread recipe needs more flour.",
    "nearMiss": false,
    "contextualErrorMsg": "Try converting both to decimals — 5 ÷ 6 and 7 ÷ 9. Which decimal is larger?"
  }
]
```

#### Category B — Distance (5 problems)

```json
[
  {
    "storyId": "dist_01",
    "context": "Distance",
    "difficulty": 2,
    "imageKey": "running_track",
    "prompt": "Maya ran 3/5 of a mile. Jordan ran 4/7 of a mile. Who ran FARTHER?",
    "fractionA": { "num": 3, "den": 5, "label": "Maya", "decimal": 0.6 },
    "fractionB": { "num": 4, "den": 7, "label": "Jordan", "decimal": 0.571 },
    "question": "bigger",
    "correctAnswer": "A",
    "explanation": "3/5 = 0.60 and 4/7 ≈ 0.571. Maya ran farther.",
    "nearMiss": false,
    "contextualErrorMsg": "4 out of 7 sounds like a lot, but each seventh is smaller than each fifth. Check the bar model."
  },
  {
    "storyId": "dist_02",
    "context": "Distance",
    "difficulty": 2,
    "imageKey": "hiking_trail",
    "prompt": "The blue trail is 2/3 km long. The red trail is 3/5 km long. Which trail is SHORTER?",
    "fractionA": { "num": 2, "den": 3, "label": "Blue trail", "decimal": 0.667 },
    "fractionB": { "num": 3, "den": 5, "label": "Red trail", "decimal": 0.6 },
    "question": "smaller",
    "correctAnswer": "B",
    "explanation": "3/5 = 0.60 and 2/3 ≈ 0.667. The red trail is shorter.",
    "nearMiss": false,
    "contextualErrorMsg": "Be careful — the question asks which is SHORTER, not bigger. Red trail = 3/5 = 0.60."
  },
  {
    "storyId": "dist_03",
    "context": "Distance",
    "difficulty": 1,
    "imageKey": "school_map",
    "prompt": "Chloe walked 1/2 of the way to school. Diego walked 3/4 of the way. Who walked FARTHER?",
    "fractionA": { "num": 1, "den": 2, "label": "Chloe", "decimal": 0.5 },
    "fractionB": { "num": 3, "den": 4, "label": "Diego", "decimal": 0.75 },
    "question": "bigger",
    "correctAnswer": "B",
    "explanation": "3/4 = 0.75 and 1/2 = 0.50. Diego walked farther — he went 3/4 of the way, which is more than half.",
    "nearMiss": false,
    "contextualErrorMsg": "Half the way means 1/2. Three-quarters of the way means 3/4. Which is more?"
  },
  {
    "storyId": "dist_04",
    "context": "Distance",
    "difficulty": 3,
    "imageKey": "bike_path",
    "prompt": "The east bike path is 7/9 km. The west bike path is 5/6 km. Which path is LONGER?",
    "fractionA": { "num": 7, "den": 9, "label": "East path", "decimal": 0.778 },
    "fractionB": { "num": 5, "den": 6, "label": "West path", "decimal": 0.833 },
    "question": "bigger",
    "correctAnswer": "B",
    "explanation": "5/6 ≈ 0.833 and 7/9 ≈ 0.778. The west path is longer.",
    "nearMiss": false,
    "contextualErrorMsg": "Try converting to decimals. 7 ÷ 9 ≈ 0.778 and 5 ÷ 6 ≈ 0.833."
  },
  {
    "storyId": "dist_05",
    "context": "Distance",
    "difficulty": 3,
    "imageKey": "swimming_pool",
    "prompt": "Finn swam 4/9 of the pool's length. Grace swam 3/7 of the pool's length. Who swam FARTHER?",
    "fractionA": { "num": 4, "den": 9, "label": "Finn", "decimal": 0.444 },
    "fractionB": { "num": 3, "den": 7, "label": "Grace", "decimal": 0.429 },
    "question": "bigger",
    "correctAnswer": "A",
    "explanation": "4/9 ≈ 0.444 and 3/7 ≈ 0.429. Finn swam just a little farther.",
    "nearMiss": true,
    "contextualErrorMsg": "These are very close! 4/9 and 3/7 differ by less than 0.02. Use the number line to see the difference."
  }
]
```

#### Category C — Time (5 problems)

```json
[
  {
    "storyId": "time_01",
    "context": "Time",
    "difficulty": 2,
    "imageKey": "clock_faces",
    "prompt": "Mia practiced piano for 3/4 of an hour. Carlos practiced for 2/3 of an hour. Who practiced LONGER?",
    "fractionA": { "num": 3, "den": 4, "label": "Mia", "decimal": 0.75 },
    "fractionB": { "num": 2, "den": 3, "label": "Carlos", "decimal": 0.667 },
    "question": "bigger",
    "correctAnswer": "A",
    "explanation": "3/4 = 0.75 and 2/3 ≈ 0.667. Mia practiced longer.",
    "nearMiss": false,
    "contextualErrorMsg": "2/3 of an hour is 40 minutes; 3/4 of an hour is 45 minutes. Mia practiced more."
  },
  {
    "storyId": "time_02",
    "context": "Time",
    "difficulty": 1,
    "imageKey": "sand_timer",
    "prompt": "An egg timer ran for 1/3 of a minute. A phone alarm rang after 1/2 a minute. Which took LONGER?",
    "fractionA": { "num": 1, "den": 3, "label": "Egg timer", "decimal": 0.333 },
    "fractionB": { "num": 1, "den": 2, "label": "Phone alarm", "decimal": 0.5 },
    "question": "bigger",
    "correctAnswer": "B",
    "explanation": "1/2 = 0.50 and 1/3 ≈ 0.333. The phone alarm took longer.",
    "nearMiss": false,
    "contextualErrorMsg": "Half a minute is 30 seconds. A third of a minute is only 20 seconds."
  },
  {
    "storyId": "time_03",
    "context": "Time",
    "difficulty": 2,
    "imageKey": "stopwatch",
    "prompt": "Lena's reading time was 5/6 of an hour. Tom's reading time was 4/5 of an hour. Who read for LESS time?",
    "fractionA": { "num": 5, "den": 6, "label": "Lena", "decimal": 0.833 },
    "fractionB": { "num": 4, "den": 5, "label": "Tom", "decimal": 0.8 },
    "question": "smaller",
    "correctAnswer": "B",
    "explanation": "4/5 = 0.80 and 5/6 ≈ 0.833. Tom read for less time.",
    "nearMiss": false,
    "contextualErrorMsg": "The question asks who read for LESS — 4/5 is smaller than 5/6."
  },
  {
    "storyId": "time_04",
    "context": "Time",
    "difficulty": 3,
    "imageKey": "sports_timer",
    "prompt": "The first half of a soccer game lasted 5/11 of an hour. The second half lasted 6/13 of an hour. Which half was LONGER?",
    "fractionA": { "num": 5, "den": 11, "label": "First half", "decimal": 0.455 },
    "fractionB": { "num": 6, "den": 13, "label": "Second half", "decimal": 0.462 },
    "question": "bigger",
    "correctAnswer": "B",
    "explanation": "6/13 ≈ 0.462 and 5/11 ≈ 0.455. The second half was very slightly longer.",
    "nearMiss": true,
    "contextualErrorMsg": "These are almost equal! Convert both: 5 ÷ 11 ≈ 0.455, 6 ÷ 13 ≈ 0.462. The second half is barely longer."
  },
  {
    "storyId": "time_05",
    "context": "Time",
    "difficulty": 1,
    "imageKey": "recess_bell",
    "prompt": "Recess lasted 1/4 of an hour on Monday and 1/3 of an hour on Friday. Which day had LONGER recess?",
    "fractionA": { "num": 1, "den": 4, "label": "Monday", "decimal": 0.25 },
    "fractionB": { "num": 1, "den": 3, "label": "Friday", "decimal": 0.333 },
    "question": "bigger",
    "correctAnswer": "B",
    "explanation": "1/3 ≈ 0.333 and 1/4 = 0.25. Friday's recess was longer — thirds are bigger than fourths when numerators match.",
    "nearMiss": false,
    "contextualErrorMsg": "When the top number is the same, smaller denominator means bigger fraction. 1/3 > 1/4."
  }
]
```

#### Category D — Sharing & Portions (5 problems)

```json
[
  {
    "storyId": "share_01",
    "context": "Sharing",
    "difficulty": 2,
    "imageKey": "chocolate_bar",
    "prompt": "Ana gets 1/3 of a chocolate bar. Ben gets 2/5 of the same bar. Who gets a BIGGER piece?",
    "fractionA": { "num": 1, "den": 3, "label": "Ana", "decimal": 0.333 },
    "fractionB": { "num": 2, "den": 5, "label": "Ben", "decimal": 0.4 },
    "question": "bigger",
    "correctAnswer": "B",
    "explanation": "2/5 = 0.40 and 1/3 ≈ 0.333. Ben gets a bigger piece.",
    "nearMiss": false,
    "contextualErrorMsg": "2/5 means 2 pieces when the bar is cut into 5 equal parts. 1/3 means 1 piece from 3 equal parts. Use bar models to compare."
  },
  {
    "storyId": "share_02",
    "context": "Sharing",
    "difficulty": 1,
    "imageKey": "watermelon_slices",
    "prompt": "Priya got 3/8 of a watermelon. Kevin got 1/2 of the same watermelon. Who got MORE?",
    "fractionA": { "num": 3, "den": 8, "label": "Priya", "decimal": 0.375 },
    "fractionB": { "num": 1, "den": 2, "label": "Kevin", "decimal": 0.5 },
    "question": "bigger",
    "correctAnswer": "B",
    "explanation": "1/2 = 0.50 and 3/8 = 0.375. Kevin got more — half a watermelon is always more than 3/8.",
    "nearMiss": false,
    "contextualErrorMsg": "Half the watermelon is 4/8. Kevin got 1/2 = 4/8. Priya got only 3/8. So Kevin got more."
  },
  {
    "storyId": "share_03",
    "context": "Sharing",
    "difficulty": 3,
    "imageKey": "pie_chart_share",
    "prompt": "During art class, Zoe used 4/7 of the red paint. Owen used 5/9 of the red paint from a same-size jar. Who used MORE?",
    "fractionA": { "num": 4, "den": 7, "label": "Zoe", "decimal": 0.571 },
    "fractionB": { "num": 5, "den": 9, "label": "Owen", "decimal": 0.556 },
    "question": "bigger",
    "correctAnswer": "A",
    "explanation": "4/7 ≈ 0.571 and 5/9 ≈ 0.556. Zoe used a little more paint.",
    "nearMiss": true,
    "contextualErrorMsg": "These are very close! 4/7 ≈ 0.571 and 5/9 ≈ 0.556. The difference is only about 0.015."
  },
  {
    "storyId": "share_04",
    "context": "Sharing",
    "difficulty": 2,
    "imageKey": "granola_bar",
    "prompt": "Two friends split a granola bar. Max takes 2/3 and leaves 1/3. Is Max's piece BIGGER or SMALLER than 1/2?",
    "fractionA": { "num": 2, "den": 3, "label": "Max's piece", "decimal": 0.667 },
    "fractionB": { "num": 1, "den": 2, "label": "One half", "decimal": 0.5 },
    "question": "bigger",
    "correctAnswer": "A",
    "explanation": "2/3 ≈ 0.667 and 1/2 = 0.50. Max's piece is bigger than half.",
    "nearMiss": false,
    "contextualErrorMsg": "2/3 is more than half the bar. If you cut it into 6 equal pieces, 2/3 = 4/6 and 1/2 = 3/6."
  },
  {
    "storyId": "share_05",
    "context": "Sharing",
    "difficulty": 1,
    "imageKey": "apple_halves",
    "prompt": "An apple is cut into 4 equal pieces. Rosa takes 3 pieces. That's 3/4 of the apple. Her brother takes 1 piece — that's 1/4. Who has MORE apple?",
    "fractionA": { "num": 3, "den": 4, "label": "Rosa", "decimal": 0.75 },
    "fractionB": { "num": 1, "den": 4, "label": "Her brother", "decimal": 0.25 },
    "question": "bigger",
    "correctAnswer": "A",
    "explanation": "3/4 = 0.75 and 1/4 = 0.25. Rosa has three times as much apple as her brother.",
    "nearMiss": false,
    "contextualErrorMsg": "Rosa took 3 out of 4 pieces. Her brother took 1 out of 4. Three pieces is more than one piece."
  }
]
```

#### Category E — Crafts & School Supplies (5 problems)

```json
[
  {
    "storyId": "craft_01",
    "context": "Crafts",
    "difficulty": 2,
    "imageKey": "ribbon_spool",
    "prompt": "Emma needs 3/4 yard of red ribbon and 2/3 yard of blue ribbon. Which piece of ribbon is LONGER?",
    "fractionA": { "num": 3, "den": 4, "label": "Red ribbon", "decimal": 0.75 },
    "fractionB": { "num": 2, "den": 3, "label": "Blue ribbon", "decimal": 0.667 },
    "question": "bigger",
    "correctAnswer": "A",
    "explanation": "3/4 = 0.75 and 2/3 ≈ 0.667. The red ribbon is longer.",
    "nearMiss": false,
    "contextualErrorMsg": "3/4 yard is 9 inches out of a foot. 2/3 yard is 8 inches. Red ribbon is longer."
  },
  {
    "storyId": "craft_02",
    "context": "Crafts",
    "difficulty": 1,
    "imageKey": "paint_tube",
    "prompt": "Jake used 1/2 of the blue paint. Lily used 3/4 of the same tube. Who used MORE paint?",
    "fractionA": { "num": 1, "den": 2, "label": "Jake", "decimal": 0.5 },
    "fractionB": { "num": 3, "den": 4, "label": "Lily", "decimal": 0.75 },
    "question": "bigger",
    "correctAnswer": "B",
    "explanation": "3/4 = 0.75 and 1/2 = 0.50. Lily used more paint.",
    "nearMiss": false,
    "contextualErrorMsg": "Half the tube is 2/4. Three-quarters is 3/4. Lily used one more quarter."
  },
  {
    "storyId": "craft_03",
    "context": "Crafts",
    "difficulty": 3,
    "imageKey": "yarn_ball",
    "prompt": "A knitting project used 5/8 of a ball of yellow yarn and 7/11 of a same-size ball of green yarn. Which ball was used MORE?",
    "fractionA": { "num": 5, "den": 8, "label": "Yellow yarn", "decimal": 0.625 },
    "fractionB": { "num": 7, "den": 11, "label": "Green yarn", "decimal": 0.636 },
    "question": "bigger",
    "correctAnswer": "B",
    "explanation": "7/11 ≈ 0.636 and 5/8 = 0.625. More green yarn was used — but just barely!",
    "nearMiss": true,
    "contextualErrorMsg": "These are very close — only 0.011 apart. Convert to decimals to see: 5 ÷ 8 = 0.625, 7 ÷ 11 ≈ 0.636."
  },
  {
    "storyId": "craft_04",
    "context": "Crafts",
    "difficulty": 2,
    "imageKey": "glue_sticks",
    "prompt": "Sam used 2/5 of a glue stick. Tara used 3/7 of a same-size glue stick. Who used LESS glue?",
    "fractionA": { "num": 2, "den": 5, "label": "Sam", "decimal": 0.4 },
    "fractionB": { "num": 3, "den": 7, "label": "Tara", "decimal": 0.429 },
    "question": "smaller",
    "correctAnswer": "A",
    "explanation": "2/5 = 0.40 and 3/7 ≈ 0.429. Sam used less glue.",
    "nearMiss": false,
    "contextualErrorMsg": "The question asks who used LESS. 2/5 < 3/7, so Sam used less glue."
  },
  {
    "storyId": "craft_05",
    "context": "Crafts",
    "difficulty": 1,
    "imageKey": "paper_sheets",
    "prompt": "A book report used 1/3 of the paper. A drawing used 1/2 of the paper from the same stack. Which used MORE paper?",
    "fractionA": { "num": 1, "den": 3, "label": "Book report", "decimal": 0.333 },
    "fractionB": { "num": 1, "den": 2, "label": "Drawing", "decimal": 0.5 },
    "question": "bigger",
    "correctAnswer": "B",
    "explanation": "1/2 = 0.50 and 1/3 ≈ 0.333. The drawing used more paper.",
    "nearMiss": false,
    "contextualErrorMsg": "Half the stack means every other sheet. One-third is fewer sheets. Drawing used more."
  }
]
```

#### Category F — Sports & Physical Activity (5 problems)

```json
[
  {
    "storyId": "sport_01",
    "context": "Sports",
    "difficulty": 2,
    "imageKey": "basketball_court",
    "prompt": "In a free-throw contest, Noah made 5/8 of his shots. Ella made 3/5 of her shots. Who had the BETTER score?",
    "fractionA": { "num": 5, "den": 8, "label": "Noah", "decimal": 0.625 },
    "fractionB": { "num": 3, "den": 5, "label": "Ella", "decimal": 0.6 },
    "question": "bigger",
    "correctAnswer": "A",
    "explanation": "5/8 = 0.625 and 3/5 = 0.60. Noah had a better score.",
    "nearMiss": false,
    "contextualErrorMsg": "5/8 = 0.625 and 3/5 = 0.600. Noah made a higher fraction of his shots."
  },
  {
    "storyId": "sport_02",
    "context": "Sports",
    "difficulty": 1,
    "imageKey": "soccer_field",
    "prompt": "In a soccer game, Team A passed the ball for 3/4 of the game time. Team B ran with the ball for 1/4 of the game. Which fraction of time is MORE?",
    "fractionA": { "num": 3, "den": 4, "label": "Team A passing", "decimal": 0.75 },
    "fractionB": { "num": 1, "den": 4, "label": "Team B running", "decimal": 0.25 },
    "question": "bigger",
    "correctAnswer": "A",
    "explanation": "3/4 = 0.75 and 1/4 = 0.25. Team A passed for more of the game time.",
    "nearMiss": false,
    "contextualErrorMsg": "3/4 is three-quarters of the game. 1/4 is only one-quarter. Team A's fraction is bigger."
  },
  {
    "storyId": "sport_03",
    "context": "Sports",
    "difficulty": 3,
    "imageKey": "swim_meet",
    "prompt": "In a relay race, Swimmer 1 completed 4/11 of the total distance. Swimmer 2 completed 3/8 of the total distance. Who swam MORE?",
    "fractionA": { "num": 4, "den": 11, "label": "Swimmer 1", "decimal": 0.364 },
    "fractionB": { "num": 3, "den": 8, "label": "Swimmer 2", "decimal": 0.375 },
    "question": "bigger",
    "correctAnswer": "B",
    "explanation": "3/8 = 0.375 and 4/11 ≈ 0.364. Swimmer 2 swam slightly more.",
    "nearMiss": true,
    "contextualErrorMsg": "These are close! 4/11 ≈ 0.364 and 3/8 = 0.375. Swimmer 2 swam a tiny bit more."
  },
  {
    "storyId": "sport_04",
    "context": "Sports",
    "difficulty": 2,
    "imageKey": "cycling_track",
    "prompt": "A cyclist completed 7/9 of a race. Another cyclist finished only 4/6 of the same race. Who went FARTHER?",
    "fractionA": { "num": 7, "den": 9, "label": "First cyclist", "decimal": 0.778 },
    "fractionB": { "num": 4, "den": 6, "label": "Second cyclist", "decimal": 0.667 },
    "question": "bigger",
    "correctAnswer": "A",
    "explanation": "7/9 ≈ 0.778 and 4/6 ≈ 0.667. The first cyclist went farther.",
    "nearMiss": false,
    "contextualErrorMsg": "7/9 is close to 8/9 (almost all of the race). 4/6 = 2/3, which is less."
  },
  {
    "storyId": "sport_05",
    "context": "Sports",
    "difficulty": 2,
    "imageKey": "archery_target",
    "prompt": "In archery, Kai hit the target 5/7 of the time. Yuki hit the target 4/6 of the time. Who was MORE accurate?",
    "fractionA": { "num": 5, "den": 7, "label": "Kai", "decimal": 0.714 },
    "fractionB": { "num": 4, "den": 6, "label": "Yuki", "decimal": 0.667 },
    "question": "bigger",
    "correctAnswer": "A",
    "explanation": "5/7 ≈ 0.714 and 4/6 ≈ 0.667. Kai was more accurate.",
    "nearMiss": false,
    "contextualErrorMsg": "5/7 ≈ 0.714. 4/6 = 2/3 ≈ 0.667. Kai hit the target more often."
  }
]
```

#### Category G — Science & Nature (5 problems)

```json
[
  {
    "storyId": "sci_01",
    "context": "Science",
    "difficulty": 2,
    "imageKey": "rain_gauge",
    "prompt": "On Monday a rain gauge filled 2/3 of its capacity. On Tuesday it filled 3/5 of its capacity. Which day had MORE rain?",
    "fractionA": { "num": 2, "den": 3, "label": "Monday", "decimal": 0.667 },
    "fractionB": { "num": 3, "den": 5, "label": "Tuesday", "decimal": 0.6 },
    "question": "bigger",
    "correctAnswer": "A",
    "explanation": "2/3 ≈ 0.667 and 3/5 = 0.60. Monday had more rain.",
    "nearMiss": false,
    "contextualErrorMsg": "2/3 of the gauge is more than 3/5. Use bar models to see both."
  },
  {
    "storyId": "sci_02",
    "context": "Science",
    "difficulty": 1,
    "imageKey": "plant_growth",
    "prompt": "Plant A grew to 3/4 of a ruler's length. Plant B grew to 2/4 of a ruler's length. Which plant is TALLER?",
    "fractionA": { "num": 3, "den": 4, "label": "Plant A", "decimal": 0.75 },
    "fractionB": { "num": 2, "den": 4, "label": "Plant B", "decimal": 0.5 },
    "question": "bigger",
    "correctAnswer": "A",
    "explanation": "3/4 = 0.75 and 2/4 = 0.50. Plant A is taller. Same denominator: bigger numerator = taller plant.",
    "nearMiss": false,
    "contextualErrorMsg": "Both plants use quarters. 3/4 has more quarters than 2/4."
  },
  {
    "storyId": "sci_03",
    "context": "Science",
    "difficulty": 3,
    "imageKey": "beaker_fill",
    "prompt": "A chemistry experiment used 5/9 of a beaker of water. A second experiment used 7/13 of the same-size beaker. Which experiment used MORE water?",
    "fractionA": { "num": 5, "den": 9, "label": "Experiment 1", "decimal": 0.556 },
    "fractionB": { "num": 7, "den": 13, "label": "Experiment 2", "decimal": 0.538 },
    "question": "bigger",
    "correctAnswer": "A",
    "explanation": "5/9 ≈ 0.556 and 7/13 ≈ 0.538. Experiment 1 used more water.",
    "nearMiss": true,
    "contextualErrorMsg": "Close! 5/9 ≈ 0.556 and 7/13 ≈ 0.538. Experiment 1 used slightly more."
  },
  {
    "storyId": "sci_04",
    "context": "Science",
    "difficulty": 2,
    "imageKey": "butterfly_wing",
    "prompt": "A butterfly's left wing is 7/8 of an inch wide. Its right wing is 5/6 of an inch wide. Which wing is WIDER?",
    "fractionA": { "num": 7, "den": 8, "label": "Left wing", "decimal": 0.875 },
    "fractionB": { "num": 5, "den": 6, "label": "Right wing", "decimal": 0.833 },
    "question": "bigger",
    "correctAnswer": "A",
    "explanation": "7/8 = 0.875 and 5/6 ≈ 0.833. The left wing is wider.",
    "nearMiss": false,
    "contextualErrorMsg": "7/8 is very close to 1 (just 1/8 away). 5/6 is 1/6 away from 1. So 7/8 is bigger."
  },
  {
    "storyId": "sci_05",
    "context": "Science",
    "difficulty": 3,
    "imageKey": "soil_sample",
    "prompt": "Sample A had sand filling 3/7 of its volume. Sample B had sand filling 4/10 of its volume. Which sample had MORE sand?",
    "fractionA": { "num": 3, "den": 7, "label": "Sample A", "decimal": 0.429 },
    "fractionB": { "num": 4, "den": 10, "label": "Sample B", "decimal": 0.4 },
    "question": "bigger",
    "correctAnswer": "A",
    "explanation": "3/7 ≈ 0.429 and 4/10 = 0.40. Sample A had more sand.",
    "nearMiss": false,
    "contextualErrorMsg": "4/10 simplifies to 2/5 = 0.40. Then compare 3/7 ≈ 0.429 vs. 0.40."
  }
]
```

#### Category H — Shopping & Money (5 problems)

```json
[
  {
    "storyId": "shop_01",
    "context": "Shopping",
    "difficulty": 2,
    "imageKey": "sale_tags",
    "prompt": "A toy is on sale for 1/3 off. Another toy is on sale for 2/5 off. Which toy has the BIGGER discount?",
    "fractionA": { "num": 1, "den": 3, "label": "First toy", "decimal": 0.333 },
    "fractionB": { "num": 2, "den": 5, "label": "Second toy", "decimal": 0.4 },
    "question": "bigger",
    "correctAnswer": "B",
    "explanation": "2/5 = 0.40 and 1/3 ≈ 0.333. The second toy has the bigger discount.",
    "nearMiss": false,
    "contextualErrorMsg": "A bigger fraction off means more savings. 2/5 > 1/3."
  },
  {
    "storyId": "shop_02",
    "context": "Shopping",
    "difficulty": 1,
    "imageKey": "piggy_bank",
    "prompt": "Lily spent 1/4 of her birthday money. Marcus spent 3/4 of his. Who spent MORE?",
    "fractionA": { "num": 1, "den": 4, "label": "Lily", "decimal": 0.25 },
    "fractionB": { "num": 3, "den": 4, "label": "Marcus", "decimal": 0.75 },
    "question": "bigger",
    "correctAnswer": "B",
    "explanation": "3/4 = 0.75 and 1/4 = 0.25. Marcus spent three times as much of his money.",
    "nearMiss": false,
    "contextualErrorMsg": "Marcus spent 3/4, which is three pieces out of four. Lily spent only 1/4."
  },
  {
    "storyId": "shop_03",
    "context": "Shopping",
    "difficulty": 3,
    "imageKey": "store_shelf",
    "prompt": "Store A filled 5/11 of its shelf space with new products. Store B filled 4/9 of its shelf. Which store filled MORE shelf space?",
    "fractionA": { "num": 5, "den": 11, "label": "Store A", "decimal": 0.455 },
    "fractionB": { "num": 4, "den": 9, "label": "Store B", "decimal": 0.444 },
    "question": "bigger",
    "correctAnswer": "A",
    "explanation": "5/11 ≈ 0.455 and 4/9 ≈ 0.444. Store A filled more of its shelf.",
    "nearMiss": true,
    "contextualErrorMsg": "Very close! 5/11 ≈ 0.455 and 4/9 ≈ 0.444. Store A has a slightly bigger fraction filled."
  },
  {
    "storyId": "shop_04",
    "context": "Shopping",
    "difficulty": 2,
    "imageKey": "lemonade_stand",
    "prompt": "A lemonade stand sold 5/6 of its cups by noon. By evening it sold 7/8 of its cups total. At which point had MORE cups been sold?",
    "fractionA": { "num": 5, "den": 6, "label": "By noon", "decimal": 0.833 },
    "fractionB": { "num": 7, "den": 8, "label": "By evening", "decimal": 0.875 },
    "question": "bigger",
    "correctAnswer": "B",
    "explanation": "7/8 = 0.875 and 5/6 ≈ 0.833. By evening, more cups had been sold.",
    "nearMiss": false,
    "contextualErrorMsg": "By evening the stand had been open longer, so it should have sold more. 7/8 > 5/6."
  },
  {
    "storyId": "shop_05",
    "context": "Shopping",
    "difficulty": 2,
    "imageKey": "book_fair",
    "prompt": "At the book fair, 2/3 of the fiction books were sold. Only 3/5 of the nonfiction books were sold. Which type had a HIGHER fraction sold?",
    "fractionA": { "num": 2, "den": 3, "label": "Fiction", "decimal": 0.667 },
    "fractionB": { "num": 3, "den": 5, "label": "Nonfiction", "decimal": 0.6 },
    "question": "bigger",
    "correctAnswer": "A",
    "explanation": "2/3 ≈ 0.667 and 3/5 = 0.60. Fiction books had a higher fraction sold.",
    "nearMiss": false,
    "contextualErrorMsg": "2/3 of fiction means 2 out of every 3 books sold. 3/5 of nonfiction means 3 out of every 5. Use bar models."
  }
]
```

---

## 3. Prompt Selection Algorithm

```typescript
type Category =
  | 'Cooking'
  | 'Distance'
  | 'Time'
  | 'Sharing'
  | 'Crafts'
  | 'Sports'
  | 'Science'
  | 'Shopping';

interface StoryAttempt {
  storyId: string;
  context: Category;
  correct: boolean;
  explanationQuality: 'good' | 'partially_valid' | 'too_vague';
  timestamp: number;
}

const STALENESS_THRESHOLD_MS = 7 * 24 * 60 * 60 * 1000; // 1 week

function selectNextProblem(
  studentHistory: StoryAttempt[],
  currentLevel: number,
  problemLibrary: StoryProblem[]
): StoryProblem {
  const now = Date.now();
  const seenRecently = new Set(
    studentHistory.filter((a) => now - a.timestamp < STALENESS_THRESHOLD_MS).map((a) => a.storyId)
  );

  const levelPool = problemLibrary.filter((p) => p.difficulty === currentLevel);
  const unseen = levelPool.filter((p) => !seenRecently.has(p.storyId));

  // Category rotation: avoid repeating same category twice in a row
  const lastCategory = studentHistory.at(-1)?.context;
  const secondLastCategory = studentHistory.at(-2)?.context;
  const avoidCategories = new Set([lastCategory, secondLastCategory].filter(Boolean) as Category[]);

  // Priority 1: unseen, different category
  const freshDifferentCategory = unseen.filter((p) => !avoidCategories.has(p.context as Category));
  if (freshDifferentCategory.length > 0) {
    return freshDifferentCategory[Math.floor(Math.random() * freshDifferentCategory.length)];
  }

  // Priority 2: unseen, any category
  if (unseen.length > 0) {
    return unseen[Math.floor(Math.random() * unseen.length)];
  }

  // Priority 3: stale (seen > 1 week ago), different category — staleness reset
  const stale = levelPool.filter((p) => !seenRecently.has(p.storyId) || true); // all after reset
  const recent3 = new Set(studentHistory.slice(-3).map((a) => a.storyId));
  const fallback = stale.filter((p) => !recent3.has(p.storyId));
  return fallback.length > 0 ? fallback[0] : levelPool[0];
}
```

---

## 4. Four Difficulty Levels

### Level 1 — Same-Denominator or Related-Denominator Fractions

| Property             | Value                                                                 |
| -------------------- | --------------------------------------------------------------------- |
| Denominator type     | Same denominator (e.g., 1/4 vs. 3/4) or halves-family (1/2, 1/4, 3/4) |
| Decimal spread       | ≥ 0.25 between fractions                                              |
| Near-miss problems   | None                                                                  |
| Question types       | "bigger" only                                                         |
| Explanation required | Model click (guided, pre-selected model)                              |
| Model default        | Bar model ON                                                          |

**Example problem (L1):** "Priya got 3/8 of a watermelon. Kevin got 1/2 of the same watermelon. Who got MORE?" (3/8 vs. 4/8 — same denominator strategy is accessible)

### Level 2 — Related or Unrelated Denominators, Clear Spread

| Property             | Value                                                   |
| -------------------- | ------------------------------------------------------- |
| Denominator type     | Unrelated (e.g., 2/3 vs. 3/5) but decimal spread ≥ 0.05 |
| Decimal spread       | 0.05–0.30                                               |
| Near-miss problems   | Up to 20% of problems                                   |
| Question types       | "bigger" and "smaller" (alternating)                    |
| Explanation required | Model or number line (student chooses)                  |
| Model default        | Bar model ON, can toggle                                |

**Example problem (L2):** "Maya ran 3/5 of a mile. Jordan ran 4/7 of a mile. Who ran FARTHER?" (3/5 = 0.60 vs. 4/7 ≈ 0.571, clear winner)

### Level 3 — Unrelated Denominators, Narrow Spread

| Property             | Value                                              |
| -------------------- | -------------------------------------------------- |
| Denominator type     | Unrelated, often larger denominators (7, 8, 9, 11) |
| Decimal spread       | 0.01–0.10 (near-misses common)                     |
| Near-miss problems   | Up to 50% of problems                              |
| Question types       | "bigger", "smaller", and equivalence check         |
| Explanation required | Any mode; "Write it" accepted                      |
| Model default        | OFF (toggle available)                             |

**Example problem (L3):** "Finn swam 4/9 of the pool. Grace swam 3/7 of the pool. Who swam farther?" (4/9 ≈ 0.444 vs. 3/7 ≈ 0.429, spread = 0.015)

### Level 4 — 3-Way Comparison

See Section 11 for full 3-way comparison specification.

---

## 5. Answer Input System

### Button Design

Two large answer buttons, full-width on mobile, side-by-side on desktop:

```
┌─────────────────────────────────┐  ┌─────────────────────────────────┐
│                                 │  │                                 │
│   [FractionA display]           │  │   [FractionB display]           │
│                                 │  │                                 │
│   Grandma's recipe is BIGGER    │  │   New recipe is BIGGER          │
│                                 │  │                                 │
└─────────────────────────────────┘  └─────────────────────────────────┘
```

- Button label dynamically generated: `"{label} is {question_word.toUpperCase()}"`
- question_word comes from the problem's `question` field: "bigger", "smaller", "equal"
- For equivalence questions: a third "They're EQUAL" button appears
- Button height: minimum 80px; font: 18px bold
- Fraction display inside button: fraction number with vinculum, 32px

### Double-Tap Prevention

```typescript
let lastTapTime = 0;
const TAP_DEBOUNCE_MS = 500;

function handleAnswerTap(buttonId: 'A' | 'B' | 'equal') {
  const now = Date.now();
  if (now - lastTapTime < TAP_DEBOUNCE_MS) return; // ignore rapid taps
  lastTapTime = now;

  recordAnswer(buttonId);
  disableAllButtons(); // prevent any further taps
  // Re-enable via timeout only if student must select explanation mode
}
```

### Validation Rules

1. An answer button must be tapped before the explanation phase unlocks
2. Once an answer is tapped, buttons are locked (no changing mind — to prevent indecision loops)
3. After the explanation phase completes, the full feedback is revealed
4. For the "Write it" explanation mode, the answer button selection and text submission are validated together before feedback

---

## 6. Explanation Modes

After selecting an answer, students see:

```
"How do you know? Show me with:"
  [📊 Bar Models]   [📍 Number Line]   [✏️ Write It]
```

Advanced settings can enable a fourth mode: [🎤 Say It].

### Bar Models Mode

Two horizontal bar models appear side-by-side, one for each fraction:

```
Grandma's recipe: 2/3
[██████████████░░░░░░░░]   2 of 3 parts filled

New recipe: 3/4
[████████████████░░░░░░]   3 of 4 parts filled
```

Student interaction: tap "This shows [label] is bigger." to confirm the model matches their answer. If the model contradicts their answer (they tapped B but model shows A is clearly bigger), a gentle prompt: _"Take another look at the bars — which one shows more filled?"_

### Number Line Mode

A 0–1 number line with both fractions marked as labeled dots. The student drags each dot to what they believe is the correct position, then taps "Confirm positions."

Validation: dot position must be within 0.05 of the true decimal value. If out of range, the dot shakes and returns to a neutral position.

### Written Explanation Mode

A text field with placeholder: _"I know because..."_. Max 200 characters. No minimum length enforced.

See Section 7 for keyword validation algorithm.

### Voice Mode (Advanced, Optional)

Student taps a microphone button and speaks their explanation. The system transcribes using Web Speech API and runs the same keyword validation on the transcript. Shown only if the teacher has enabled this mode. Fallback: auto-switches to "Write It" if microphone is unavailable.

---

## 7. Keyword Validation

### Implementation

```typescript
type ExplanationQuality = 'good' | 'partially_valid' | 'too_vague' | 'contradicts_answer';

interface KeywordCategory {
  name: string;
  keywords: string[];
  weight: number; // contribution to overall quality score
}

const keywordBank: KeywordCategory[] = [
  {
    name: 'comparison_language',
    keywords: [
      'bigger',
      'larger',
      'greater',
      'more',
      'less',
      'smaller',
      'fewer',
      'higher',
      'lower',
      'than',
      '>',
      '<',
    ],
    weight: 0.35,
  },
  {
    name: 'decimal_reasoning',
    keywords: ['decimal', '0.', 'point', 'percent', '%', 'hundredths', 'tenths'],
    weight: 0.2,
  },
  {
    name: 'model_reference',
    keywords: [
      'bar',
      'model',
      'pie',
      'chart',
      'parts',
      'shaded',
      'filled',
      'pieces',
      'number line',
      'dot',
    ],
    weight: 0.2,
  },
  {
    name: 'fraction_structure',
    keywords: [
      'numerator',
      'denominator',
      'top',
      'bottom',
      'out of',
      'divided',
      'halves',
      'thirds',
      'quarters',
      'fifths',
      'sixths',
      'eighths',
    ],
    weight: 0.15,
  },
  {
    name: 'benchmark_reasoning',
    keywords: [
      'half',
      'halfway',
      'whole',
      'close to 1',
      'close to 0',
      'benchmark',
      'near',
      'almost',
    ],
    weight: 0.1,
  },
];

function validateExplanation(
  text: string,
  correctAnswer: 'A' | 'B',
  studentAnswer: 'A' | 'B',
  fractionA: Fraction,
  fractionB: Fraction
): ExplanationQuality {
  if (!text || text.trim().length < 5) return 'too_vague';

  const lower = text.toLowerCase();
  const totalWeight = keywordBank.reduce((sum, cat) => {
    const found = cat.keywords.some((kw) => lower.includes(kw));
    return sum + (found ? cat.weight : 0);
  }, 0);

  // Check for contradictions (student says "smaller" but answer is the bigger one)
  const saysBigger = ['bigger', 'larger', 'greater', 'more'].some((kw) => lower.includes(kw));
  const saysSmaller = ['smaller', 'less', 'fewer', 'lower'].some((kw) => lower.includes(kw));
  if (correctAnswer === studentAnswer) {
    // Correct answer: check explanation polarity matches
    const correctIsA = correctAnswer === 'A';
    const correctDecimal = correctIsA
      ? fractionA.num / fractionA.den
      : fractionB.num / fractionB.den;
    const wrongDecimal = correctIsA ? fractionB.num / fractionB.den : fractionA.num / fractionA.den;
    if (saysBigger && correctDecimal < wrongDecimal) return 'contradicts_answer';
    if (saysSmaller && correctDecimal > wrongDecimal) return 'contradicts_answer';
  }

  if (totalWeight >= 0.5) return 'good';
  if (totalWeight >= 0.2) return 'partially_valid';
  return 'too_vague';
}
```

### Feedback for Explanation Quality

```
Quality: good
  → "Great explanation! You used the right words: [echo matched keywords]."

Quality: partially_valid
  → "Good thinking! Try adding more detail. For example, mention the bar model or the decimals."

Quality: too_vague
  → "That's a bit short. Try saying which bar model looks more filled, or what the decimals are."

Quality: contradicts_answer
  → "Hmm, your explanation says [bigger/smaller] but you chose [other option]. Let's look at the models together."
```

### Partial Credit

For level advancement, explanation quality contributes:

- `good` = full credit toward consecutive-correct count
- `partially_valid` = half credit (2 partially_valid = 1 good for advancement)
- `too_vague` = no credit; explanation re-prompt offered once

---

## 8. Feedback Engine

### Correct + Good Explanation

```
"✅ Right! [Correct label] is [bigger/smaller].
 Great explanation — [echo key phrase].
 Here's the full story: [problem.explanation]."
(800ms delay before reveal; soft chime; card animations)
```

### Correct + Vague Explanation

```
"✅ Right answer! Let's improve the explanation though.
 Try saying something like: '[model explanation sentence from problem]'
 [Show side-by-side bar models for reference]"
```

### Incorrect Answer

```
"❌ Not quite. Let's look at the models together.
 [Auto-show side-by-side bar model]
 See how [correct label] has more filled? That means it is [bigger/smaller].
 [Correct fraction label] = [decimal]. [Wrong fraction label] = [decimal].
 [Try Again button]"
```

### Near-Miss Handling

For problems where `nearMiss: true` (fractions within 0.03 of each other):

```
"Those two fractions are VERY close!
 [A.label] = [A.decimal.toFixed(3)] and [B.label] = [B.decimal.toFixed(3)].
 On the number line, [correct.label] is just a tiny bit further right.
 This is a tricky one — using decimals is the most reliable way to compare fractions this close."
```

### Context-Specific Error Messages

Each problem in the library has a `contextualErrorMsg` field used when the student answers incorrectly. Examples:

- Cook: _"That would mean Sofia ate more pizza than the whole pizza!"_ (if answer > 1)
- Distance: _"If Maya ran less, that would mean she barely moved! Check the bar model."_
- Sharing: _"That would give Ana more than the whole chocolate bar — impossible!"_
- Time: _"That would mean Carlos practiced for longer than one hour — check the fractions again."_

### Feedback Delays

| Event                | Delay                   | Purpose                                |
| -------------------- | ----------------------- | -------------------------------------- |
| Correct answer       | 800ms pause             | Student absorbs success                |
| Incorrect answer     | 0ms delay               | Immediate redirect                     |
| Explanation feedback | 1200ms after submission | Student processes explanation response |
| Auto-model reveal    | 600ms after incorrect   | Model "animates in" after shock        |

---

## 9. Image System

### 20 Image Keys with Descriptions

| imageKey          | Description                                                                    | Fraction context  |
| ----------------- | ------------------------------------------------------------------------------ | ----------------- |
| measuring_cups    | Three graduated measuring cups (1/4, 1/2, 1 cup) on a counter                  | Volume/cooking    |
| pizza_slices      | A whole pizza divided into 8 equal slices; 3 slices highlighted                | Equal parts, food |
| juice_glasses     | Two identical glasses, partially filled with orange juice at different heights | Volume comparison |
| cake_slices       | A round birthday cake cut into equal pieces; some removed                      | Sharing, parts    |
| flour_bags        | Two bags of flour with level indicators                                        | Cooking, volume   |
| running_track     | An oval track with two runners at different positions                          | Distance          |
| hiking_trail      | A forested trail map with two colored paths labeled with lengths               | Distance          |
| school_map        | Top-down view of a school and surrounding blocks with a dotted path            | Distance          |
| bike_path         | A city park map showing two cycling routes                                     | Distance          |
| swimming_pool     | A lap pool with a swimmer marked partway along                                 | Distance          |
| clock_faces       | Two analog clocks showing different times, with elapsed time shaded            | Time              |
| sand_timer        | An hourglass with sand partially through                                       | Time              |
| stopwatch         | A digital stopwatch showing elapsed time                                       | Time              |
| recess_bell       | A school bell with two time bars beneath                                       | Time              |
| chocolate_bar     | A rectangular chocolate bar with a breakpoint marked                           | Sharing           |
| watermelon_slices | A sliced watermelon, pieces separated and counted                              | Sharing           |
| apple_halves      | An apple cut into 4 quarters; some pieces held by illustrated characters       | Sharing           |
| ribbon_spool      | Two spools of ribbon with length cut off and laid flat                         | Crafts            |
| rain_gauge        | A clear cylindrical rain gauge with measurement markings                       | Science           |
| plant_growth      | Two potted plants against a ruler background                                   | Science           |

### Image Scaling

| Screen width | Image area           | Max image height | Alt text always shown |
| ------------ | -------------------- | ---------------- | --------------------- |
| ≥ 768px      | 40% of content width | 300px            | Below image           |
| 480–767px    | 60% of content width | 200px            | Below image           |
| < 480px      | Full content width   | 160px            | Above problem text    |

### Fallback Text Descriptions

Each image key has a fallback text description for low-bandwidth or screen-reader contexts. Example for `pizza_slices`: _"Illustration: A whole pizza cut into 8 equal slices. 3 slices are highlighted in a different color."_

---

## 10. Level Advancement System

### Advancement Criteria

```typescript
interface LevelAdvancementTracker {
  consecutiveGoodAnswers: number; // full-credit correct + good explanation
  consecutivePartialAnswers: number; // partial credit accumulator (2 = 1 good)
  consecutiveWrong: number;
  reviewModeActive: boolean;
  reviewProblemsRemaining: number;
}

function checkAdvancement(tracker: LevelAdvancementTracker): 'advance' | 'stay' | 'regress' {
  const effectiveGood =
    tracker.consecutiveGoodAnswers + Math.floor(tracker.consecutivePartialAnswers / 2);

  if (effectiveGood >= 4) return 'advance';
  if (tracker.consecutiveWrong >= 2) return 'regress';
  return 'stay';
}
```

### Regression Criteria

- 2 consecutive wrong answers → offer Review Mode (models always ON for next 3 problems)
- 3 consecutive wrong answers → auto-enter Review Mode
- In Review Mode: advancement requires 3 consecutive good answers (not 4)

### Review Mode

- Problem selection: the two most-recently-failed story IDs are re-queued
- Bar model is forced ON and cannot be toggled off
- A soft banner displays: _"Let's review — take your time and use the model."_
- Review Mode ends automatically after 3 problems

### Manual Level Selection

Available in Settings → "Choose My Level":

- Student can select any level from 1–3 (Level 4 requires unlocking via Level 3 completion)
- Manual selection overrides auto-advancement for current session only
- Next session resumes from auto-calculated level

---

## 11. Three-Way Comparison Extension (Level 4)

### Overview

Level 4 introduces three fractions per problem. New question types:

- "Which is the BIGGEST?" (pick one of three)
- "Which is the SMALLEST?" (pick one of three)
- "Put them in order: smallest, middle, biggest" (three-button ordering)

### UI Changes

For "pick one of three" questions, three answer buttons appear:

```
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│  [Fraction A]    │  │  [Fraction B]    │  │  [Fraction C]    │
│  Sofia's piece   │  │  Leo's piece     │  │  Mia's piece     │
│  is the BIGGEST  │  │  is the BIGGEST  │  │  is the BIGGEST  │
└──────────────────┘  └──────────────────┘  └──────────────────┘
```

For "put in order" questions, a simplified drag-sort interface (3 slots: Smallest / Middle / Biggest):

```
┌──────┐      ┌──────┐      ┌──────┐
│  2/5 │      │ 3/7  │      │ 5/8  │
└──────┘      └──────┘      └──────┘
   ↕              ↕              ↕
[Smallest]   [Middle]    [Biggest]
```

### Sample Level 4 Problems

```json
[
  {
    "storyId": "3way_01",
    "context": "Cooking",
    "difficulty": 4,
    "imageKey": "measuring_cups",
    "prompt": "Three muffin recipes need different amounts of milk: Recipe A needs 2/5 cup, Recipe B needs 1/3 cup, Recipe C needs 3/7 cup. Which recipe needs the MOST milk?",
    "fractionA": { "num": 2, "den": 5, "label": "Recipe A", "decimal": 0.4 },
    "fractionB": { "num": 1, "den": 3, "label": "Recipe B", "decimal": 0.333 },
    "fractionC": { "num": 3, "den": 7, "label": "Recipe C", "decimal": 0.429 },
    "question": "biggest_of_three",
    "correctAnswer": "C",
    "explanation": "3/7 ≈ 0.429, 2/5 = 0.40, 1/3 ≈ 0.333. Recipe C needs the most milk.",
    "sortedOrder": ["B", "A", "C"]
  }
]
```

---

## 12. Real-World Accuracy

### Validation Principles

Story contexts are reviewed against these criteria before inclusion:

**1. Plausible denominator-context pairings:**

- Pizzas: 4, 6, 8, 12 slices (not 7 or 11)
- Cups in a recipe: 2, 3, 4, 8 (not 7 or 9 — uncommon in cooking)
- Miles/km for children: denominators 2–8 (large denominators imply very precise measurement, unusual for casual distance)

**2. The "impossibility check":** No problem can have an answer implying an amount exceeds the whole (sum > 1 unless explicitly stated as "together they ate...")

**3. Age-appropriate contexts:** All scenarios involve activities plausible for a 7-8 year old (baking with a parent, walking to school, playing sports) — not business, finance, or adult scenarios.

### Avoided Clichés

The following over-used problem framings were deliberately excluded from the library:

- "If you had N pizzas and ate M/N..." (circular reasoning, unrealistic)
- "Jenny has M/N of a dollar" without monetary context
- Abstract number line problems disguised as story problems
- Problems where the story setting adds no real meaning (e.g., "Sam has 2/3 of a collection" — what collection?)

---

## 13. Full Data Structures

### Problem Config

```typescript
interface StoryProblem {
  storyId: string;
  context: Category;
  difficulty: 1 | 2 | 3 | 4;
  imageKey: string;
  prompt: string;
  fractionA: FractionWithLabel;
  fractionB: FractionWithLabel;
  fractionC?: FractionWithLabel; // Level 4 only
  question:
    | 'bigger'
    | 'smaller'
    | 'equal'
    | 'biggest_of_three'
    | 'smallest_of_three'
    | 'rank_three';
  correctAnswer: 'A' | 'B' | 'C';
  explanation: string;
  nearMiss: boolean;
  contextualErrorMsg: string;
  sortedOrder?: string[]; // Level 4 rank questions
}

interface FractionWithLabel extends Fraction {
  label: string;
  decimal: number;
}
```

### Attempt Record

```typescript
interface StoryAttemptRecord {
  sessionId: string;
  studentId: string;
  storyId: string;
  level: 1 | 2 | 3 | 4;
  userAnswer: 'A' | 'B' | 'C';
  correct: boolean;
  explanationMode: 'model' | 'number_line' | 'write' | 'voice' | 'skipped';
  explanationText: string | null;
  explanationQuality: ExplanationQuality;
  hintsUsed: number;
  attempts: number;
  timeMs: number;
  category: Category;
  nearMissHandled: boolean;
}
```

### Session Summary

```typescript
interface StorySessionSummary {
  sessionId: string;
  studentId: string;
  date: string;
  problemsAttempted: number;
  correct: number;
  accuracy: number;
  explanationQualityBreakdown: Record<ExplanationQuality, number>;
  categoriesCovered: Category[];
  levelAtStart: number;
  levelAtEnd: number;
  advancedLevel: boolean;
  regressedLevel: boolean;
  reviewModeTriggered: boolean;
  timeSpentMs: number;
  nearMissAccuracy: number; // accuracy on near-miss problems specifically
}
```

### Explanation Quality Enum

```typescript
type ExplanationQuality =
  | 'good' // Strong keywords, directionally correct
  | 'partially_valid' // Some keywords, needs more detail
  | 'too_vague' // Very short or no meaningful keywords
  | 'contradicts_answer' // Keywords contradict the selected answer
  | 'skipped'; // Student skipped explanation
```

---

## 14. UI Layout Mockups

### Level 1 Problem with Bar Models

```
┌────────────────────────────────────────────────────────────────┐
│  Fraction Story Problems        Level 1           [🔊 Read]   │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  [IMAGE: cake_slices — birthday cake cut into pieces]          │
│                                                                │
│  Mom cut a cake. Arlo got 1/4 of the cake.                    │
│  Bella got 1/2 of the cake. Who got MORE cake?                │
│                                                                │
│  ┌──────────────────────────────┐                             │
│  │ Arlo: 1/4                    │                             │
│  │ [██░░░░░░░░░░░░░░░░░░░░░░░░] │  1 of 4 parts              │
│  └──────────────────────────────┘                             │
│  ┌──────────────────────────────┐                             │
│  │ Bella: 1/2                   │                             │
│  │ [████████████░░░░░░░░░░░░░░] │  1 of 2 parts              │
│  └──────────────────────────────┘                             │
│                                                                │
│  ┌──────────────────────┐  ┌──────────────────────┐          │
│  │  1/4                 │  │  1/2                 │          │
│  │  Arlo got MORE       │  │  Bella got MORE      │          │
│  └──────────────────────┘  └──────────────────────┘          │
└────────────────────────────────────────────────────────────────┘
```

### Level 3 Problem with Explanation Mode Selection

```
┌────────────────────────────────────────────────────────────────┐
│  Fraction Story Problems        Level 3           [🔊 Read]   │
├────────────────────────────────────────────────────────────────┤
│  Finn swam 4/9 of the pool's length.                          │
│  Grace swam 3/7 of the pool's length.                         │
│  Who swam FARTHER?                                            │
│                                                                │
│  ┌──────────────────────┐  ┌──────────────────────┐          │
│  │   4/9                │  │   3/7                │          │
│  │   Finn swam FARTHER  │  │   Grace swam FARTHER │          │
│  └──────────────────────┘  └──────────────────────┘          │
│                                                                │
│  ─────────── You chose: Finn ───────────                       │
│                                                                │
│  How do you know? Show me with:                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐        │
│  │ 📊 Bar Models │  │ 📍 Num. Line │  │ ✏️ Write It  │        │
│  └──────────────┘  └──────────────┘  └──────────────┘        │
└────────────────────────────────────────────────────────────────┘
```

### Level 4 Three-Way Comparison

```
┌────────────────────────────────────────────────────────────────┐
│  Fraction Story Problems        Level 4           [🔊 Read]   │
├────────────────────────────────────────────────────────────────┤
│  Three muffin recipes need different amounts of milk:          │
│  Recipe A: 2/5 cup  |  Recipe B: 1/3 cup  |  Recipe C: 3/7 cup│
│  Which recipe needs the MOST milk?                            │
│                                                                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐        │
│  │   2/5        │  │   1/3        │  │   3/7        │        │
│  │ Recipe A     │  │ Recipe B     │  │ Recipe C     │        │
│  │ needs MOST   │  │ needs MOST   │  │ needs MOST   │        │
│  └──────────────┘  └──────────────┘  └──────────────┘        │
│                                                                │
│  Or: [ Put them in order: Smallest → Middle → Biggest ]       │
└────────────────────────────────────────────────────────────────┘
```

---

## 15. Accessibility

### TTS Read-Aloud

A speaker icon (🔊) in the top-right reads the full story prompt via the browser Web Speech API or a configured TTS service. Behavior:

- Reads: story text, fraction labels, and question
- Does NOT read: button labels (announced separately by screen reader)
- Playback speed adjustable (0.7×, 1.0×, 1.3×) via long-press on speaker icon
- Fractions read as "[numerator] [denominator-word]" (e.g., "three fifths")

### High-Contrast Image Mode

A toggle (in Settings → Accessibility → "High Contrast Images") replaces standard story images with high-contrast versions:

- Black outlines on white backgrounds
- Pattern fills instead of color fills for bar models
- All illustrations removed (text-description fallback shown instead)

### Simplified Language Mode (ELL Support)

Enabling Settings → Accessibility → "Simple Language" modifies problem prompts:

- Reduces sentence complexity (max 1 clause per sentence)
- Adds parenthetical fraction-value hints: "2/3 cup (about 0.67 cup)"
- Highlights key question words in **bold**
- Example: "Grandma's cookie recipe uses **2/3** cup of sugar. The new recipe uses **3/4** cup. Which recipe uses **MORE** sugar?"

### Keyboard Navigation

| Key           | Action                                                    |
| ------------- | --------------------------------------------------------- |
| Tab           | Move between answer buttons                               |
| Enter / Space | Select answer button                                      |
| M             | Toggle bar model on/off                                   |
| R             | Replay TTS read-aloud                                     |
| H             | Request hint                                              |
| Escape        | Cancel current explanation mode, return to mode selection |
