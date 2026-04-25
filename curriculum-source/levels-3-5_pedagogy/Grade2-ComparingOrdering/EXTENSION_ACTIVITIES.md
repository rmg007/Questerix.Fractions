# Extension Activities (6–10+)

Five additional game variations and skill-builders beyond the core 5 activities. Can be unlocked after mastery or played independently.

---

## 6. FRACTION SNAP BATTLE (Multiplayer)

### Overview
Competitive 1v1 version of Fraction Snap. Two players see the same fraction comparison problem; first correct answer wins point. Real-time scoring and trash talk (emoji reactions).

### Game Flow
```
1. MATCHMAKING
   ├─ Play against: AI (Easy/Med/Hard) | Friend | Random | Class
   ├─ Difficulty sync: Match peer level automatically
   └─ Setup time: 5 seconds ("Waiting for opponent...")

2. ROUND (15 seconds each)
   ├─ Both see: "Which is bigger: 3/7 or 4/9?"
   ├─ Buttons: "LEFT" vs "RIGHT"
   ├─ First correct gets +10 points
   ├─ Opponent gets +0 (even if correct, it's slower)
   └─ Loser learns answer: "Right! 4/9 > 3/7 because..."

3. MATCH (5–7 rounds)
   ├─ First to win 3 rounds wins match
   ├─ Victory screen with stats
   ├─ XP & leaderboard points awarded
   └─ Option: Rematch or return to menu

4. FINAL STATS
   ├─ Accuracy: 80% vs 60%
   ├─ Avg speed: 2.5 sec vs 3.8 sec
   ├─ Streak: 3 wins vs 1 win
   └─ Rating change: +12 ELO points
```

### Real-Time Social Features
```
DURING GAME (Trash Talk Allowed)
├─ Chat (monitored for profanity)
├─ Emoji reactions: 🔥 ⚡ 💯 😅 🤔
├─ Quick phrases: "Nice try!" / "Too slow!" / "Got lucky!"
└─ Pause for connection issues (detected auto)

AFTER GAME
├─ High-five emoji reaction
├─ Share result: "Beat Marcus 4–1 at Fraction Snap Battle!"
├─ Send friend request
└─ Report offensive behavior (if needed)
```

### Matchmaking & Rating System
```
ELO Rating (Chess-style):
├─ Start: 1600 rating
├─ Win: +10–15 points (based on opponent strength)
├─ Loss: -10–15 points
├─ Upsets rewarded: Beat stronger player = +25 points
├─ Skill-matched: Play opponents within ±200 rating points

Divisions (for display):
├─ Bronze: 1000–1200 rating
├─ Silver: 1200–1400 rating
├─ Gold: 1400–1600 rating
├─ Platinum: 1600–1800 rating
└─ Diamond: 1800+ rating
```

### Progression & Unlocks
```
Level 1–2: AI opponents only (safe, no pressure)
Level 3–4: Optional peer play, ranked or casual
Level 5+: Access to rated ladder, seasonal tournament

Seasonal Tournament:
├─ April: Spring Cup (best of 5 rounds)
├─ Prizes: Digital badges, leaderboard ranking
├─ Bracket: Top 8 advance to finals
└─ Replay available for viewing
```

---

## 7. FRACTION WAR (Card Game)

### Overview
Turn-based card game where players flip fraction cards. Highest fraction wins the round. Teaches comparison quickly and suits hands-on learners.

### Gameplay
```
SETUP
├─ Deck: 40 cards (1/2, 1/3, 2/3, 1/4, 2/4, 3/4, 1/5, 2/5, etc.)
├─ Deal: 20 cards to each player (face down)
└─ Goal: Win the most cards

EACH ROUND
├─ Player A flips card (e.g., 3/7)
├─ Player B flips card (e.g., 2/5)
├─ Compare: Which is bigger?
├─ Winner gets both cards
└─ If tied: Tie-breaker rule (see below)

TIE-BREAKER (Fractions are equal)
├─ Rare case (2/4 = 1/2)
├─ Options:
│  ├─ WAR: Flip 3 more cards (higher wins all 10)
│  ├─ QUICK COMPARE: "Name a fraction between them"
│  └─ SKIP: Discard, move to next round
└─ Keeps game moving

GAME END
├─ When all cards played
├─ Winner: Whoever has more cards
├─ Count points: 10 cards = 10 points
└─ Stats: Accuracy on comparisons shown
```

### Variants
```
DOUBLE WAR (Harder)
├─ Each player flips 2 cards
├─ Add the fractions (if same denominator)
│  └─ e.g., 1/4 + 2/4 = 3/4
├─ Compare sums
└─ Requires addition skill prerequisite

SPEED WAR (Time Pressure)
├─ Standard rules
├─ 5-second limit per comparison
├─ Wrong = lose 2 cards (penalty)
└─ Fast = +1 bonus card

TARGET WAR (Reverse Challenge)
├─ Dealer shows target fraction (e.g., 2/3)
├─ Players race to flip closest fraction (not over)
├─ Reward points based on how close
└─ Builds estimation & comparison skill
```

### Learning Benefits
```
Quick Comparisons: Playing many rounds fast = fluency
Diverse Fractions: Deck variety builds broad mastery
Social: Game play encourages peer teaching
Retro Fun: Card games feel "real," boost engagement
```

---

## 8. BUILD-A-FRACTION (Inverse Problem)

### Overview
Given a constraint, kid builds the fraction. E.g., "Create a fraction bigger than 1/2 but smaller than 3/4." Develops number sense and inverse thinking.

### Gameplay
```
PROMPT 1: "Make a fraction bigger than 1/2"
├─ Kid types or drags: 3/5 (correct)
├─ Kid tries: 2/5 (incorrect, feedback shown)
├─ Multiple solutions accepted: 2/3, 3/5, 4/7, 5/9, etc.
└─ Constraint check: fraction > 0.5? ✅

PROMPT 2: "Create a fraction between 1/3 and 1/2"
├─ Lower bound: 0.333
├─ Upper bound: 0.5
├─ Valid answers: 2/5, 3/7, 4/9, 5/12, 7/15, etc.
├─ Invalid: 1/4 (too small), 1/2 (boundary)
└─ Feedback: "2/5 = 0.4, which is between 0.333 and 0.5 ✓"

PROMPT 3: "Build a fraction with denominator 8 that's bigger than 1/2"
├─ Numerator must be: > 4 (since 4/8 = 1/2)
├─ Valid: 5/8, 6/8, 7/8, 8/8
├─ Kid input: [_]/8 (numerator field)
└─ Feedback: "5/8 is correct! 5 > 4, so yes, bigger than 1/2"
```

### Input Methods
```
1. TYPE
   ├─ Input: "3/5" or "3 out of 5"
   └─ Validation: Parse & check

2. DRAG on Number Line
   ├─ Show 0–1 number line
   ├─ Drag to place fraction
   ├─ Snap to grid or free-form
   └─ Convert pixel position → fraction

3. NUMERATOR / DENOMINATOR SLIDERS
   ├─ Numerator slider: 0–denominator
   ├─ Denominator slider: 1–10 (or locked)
   └─ Watch position on number line update real-time

4. PIE CHART BUILDER
   ├─ Tap slices to shade
   ├─ System counts: "You shaded 3 of 5 = 3/5"
   └─ Works for simple fractions
```

### Scaffolding & Hints
```
NO HINTS (Advanced)
├─ Just prompt: "Make a fraction between 1/3 and 2/3"
├─ Student solves independently
└─ Feedback only after submission

HINT 1: Show number line
├─ Display 0–1 line with boundaries marked
├─ Student must choose position
└─ Feedback: "Check if your fraction is in the shaded region"

HINT 2: Show example solutions
├─ "Here are some correct answers: 2/5, 3/7, 4/9"
├─ Student must find another (different) one
└─ Teaches multiple solutions exist

HINT 3: Show constraint as equation
├─ "You need: numerator/denominator > 1/2"
├─ Simplify: "If denominator = 8, numerator must be > 4"
└─ Guide student to answer
```

### Progression
```
Level 1: Single constraint, simple fractions
├─ "Bigger than 1/2" → test with 2/3, 3/4, 1/3, etc.
└─ Accuracy: 70%+ to advance

Level 2: Two constraints (range)
├─ "Between 1/3 and 2/3"
└─ Requires careful estimation

Level 3: Denominator constraint + range
├─ "With denominator 7, between 1/2 and 3/4"
└─ Demands inverse calculation

Level 4: Creative building
├─ No constraints; kid creates & explains
├─ "Build a fraction that's close to 1/2"
└─ Open-ended = high cognitive demand
```

---

## 9. FRACTION DETECTIVE (Error Analysis)

### Overview
Metacognitive activity where kids diagnose mistakes in fraction comparisons. Builds understanding of errors and reasoning.

### Gameplay
```
SHOW ERROR (from real student work or AI-generated)
├─ Problem: "Compare 2/5 and 1/3"
├─ Student's answer: "2/5 < 1/3" (WRONG)
├─ Actual: 2/5 > 1/3
└─ Your task: "Why was this wrong?"

DIAGNOSE THE ERROR
Multiple-choice options:
├─ ☐ The student chose the wrong button (clicked < instead of >)
├─ ☐ The student misread the fractions (thought 1/5 instead of 2/5)
├─ ☑ The student didn't compare correctly (didn't think about common denom)
├─ ☐ The student guessed randomly
└─ ☐ The student was rushing (no good excuse, but hurried)

EXPLAIN THE CORRECT ANSWER
├─ Show models: 2/5 (2 parts of 5) vs 1/3 (1 part of 3)
├─ Visual: Pie charts side-by-side
├─ Text explanation: "2/5 = 0.4, but 1/3 = 0.333, so 2/5 > 1/3"
├─ Common denominator: "2/5 = 6/15, and 1/3 = 5/15, so 2/5 > 1/3"
└─ Prompt kid to write: "How would you explain this to a friend?"

KID'S REFLECTION
├─ Text box: "I would explain it by..."
└─ Types: "Because 2 parts of 5 is more than 1 part of 3"
```

### Error Types Catalogued
```
PROCEDURAL ERRORS
├─ Wrong button (clicked opposite answer)
├─ Didn't find common denominator
├─ Compared numerators only (2 > 1, so 2/5 > 1/3 ✗)
└─ Compared denominators only (5 > 3, so 2/5 > 1/3 ✓ by accident)

COMPREHENSION ERRORS
├─ Misunderstood what "fraction" means
├─ Confused 3/5 with "3 and 5" (not a fraction)
├─ Thought 1/2 means "1, then 2" (not a ratio)
└─ Didn't realize fractions are between 0–1

CARELESS ERRORS
├─ Read 2/5 as 2/3
├─ Clicked wrong button by accident
├─ Timed out, guessed
└─ Not paying attention

ATTRIBUTION ERRORS
├─ "I got lucky"
├─ "The problem was too hard"
├─ "I wasn't looking"
└─ "I didn't understand fractions before"
```

### Learning Benefits
```
Metacognition: Kids reflect on HOW they think
Error Normalization: "Everyone makes mistakes" → reduces anxiety
Peer Learning: Diagnose peers' errors to learn from them
Transfer: Apply error-pattern recognition to own work
```

### Difficulty Progression
```
Level 1: Simple errors, obvious wrong answers
├─ "Is 1/4 bigger than 1/2?" → Answered "yes"
└─ Error type: Procedure (compared denominator)

Level 2: Tricky errors, harder diagnosis
├─ "Is 3/8 bigger than 1/3?" → Answered "no"
└─ Error type: Procedure (tried convert, got confused)

Level 3: Subtle errors, requires deep thinking
├─ "Is 5/9 bigger than 4/7?" → Answered "yes"
└─ Error type: Careless (very close fractions, guessed)
```

---

## 10. EQUIVALENT FRACTIONS TOURNAMENT (Foundation Skill)

### Overview
Prerequisite to comparisons: finding & creating equivalent fractions. Builds the foundational concept that 1/2 = 2/4 = 4/8.

### Activities
```
MATCH EQUIVALENT FRACTIONS
├─ Show: 1/2
├─ Find matches from: 2/4, 3/5, 4/8, 1/3, 3/6, 2/5
├─ Correct: 2/4, 4/8, 3/6
├─ Model shown for each (all same size)
└─ Pattern: "Multiply top & bottom by same number"

COMPLETE THE EQUIVALENT FRACTION
├─ Show: 1/2 = __/6
├─ Kid solves: Numerator must be 3 (multiply top & bottom by 3)
├─ Model: Pie chart shows 1/2, then transforms to 3/6
└─ Check: Same shaded area = correct

SIMPLIFY FRACTIONS
├─ Show: 4/8
├─ Simplify to: 1/2 (divide top & bottom by 4)
├─ Model: 4/8 pie chart → crosses out 4 pairs → 1/2
└─ Teach GCD concept (greatest common divisor)

FRACTION FAMILY
├─ Show: 1/3 family = {1/3, 2/6, 3/9, 4/12, 5/15, ...}
├─ Kid extends: Pattern recognition
└─ Model: Visual family tree of equivalent fractions

EQUIVALENCE SNAP
├─ Fast-paced like Snap
├─ Show two fractions (e.g., 2/6 and 1/3)
├─ "Are these equal?"
├─ Yes/No buttons
└─ Speed challenges: 20 rounds in 3 minutes
```

### Why It Matters
```
Prerequisite for Comparisons:
├─ Can't compare 2/3 and 4/9 without finding common denominator
├─ Common denominator = create equivalent fractions
└─ E.g., 2/3 = 6/9, so now compare 6/9 > 4/9

Prerequisite for Addition:
├─ 1/3 + 1/4 requires equivalent fractions
├─ Find LCD: 12
├─ Convert: 4/12 + 3/12 = 7/12
└─ Foundation for later math
```

---

## 11. FUTURE EXTENSIONS (Phase 3+)

### Possible Activities
```
FRACTION GOLF
├─ Hole: Land fraction on target
├─ Score: How many hits to reach target exactly
└─ Levels: Easier (targets: 1/2, 3/4) to Harder (targets: 7/13)

FRACTION ESCAPE ROOM
├─ Solve fraction comparisons to unlock doors
├─ Each room = different challenge
├─ Narrative: "Escape the fraction maze!"

FRACTION BINGO
├─ Cards with fractions
├─ Teacher calls: "A fraction between 1/4 and 1/2"
├─ Students mark matching fraction
└─ First to 5 in a row wins

CUSTOMIZABLE GAMES (Student-Created)
├─ Kid creates their own fraction game
├─ Set rules, fractions, scoring
├─ Share with classmates
└─ Peer-play & feedback

REAL-WORLD FRACTION HUNTS
├─ AR/photo-based activity
├─ Find items in classroom/home with fractional portions
├─ "Take a pic of something that's 1/4 full"
└─ Builds real-world connection
```

---

## Implementation Checklist

- [ ] Snap Battle multiplayer system
  - [ ] Real-time network synchronization
  - [ ] ELO rating system
  - [ ] Social chat & emoji reactions
  
- [ ] Fraction War card game
  - [ ] Deck generation & shuffling
  - [ ] Variants (Double War, Speed, Target)
  
- [ ] Build-a-Fraction
  - [ ] Multiple input methods (type, drag, slider, pie)
  - [ ] Constraint validation system
  - [ ] Hint strategies
  
- [ ] Fraction Detective
  - [ ] Error database (real student errors)
  - [ ] Error-type classification
  - [ ] Reflection prompts & saving
  
- [ ] Equivalent Fractions Tournament
  - [ ] Model generation (visual equivalence proof)
  - [ ] GCD calculation engine
  - [ ] Snap variant implementation
