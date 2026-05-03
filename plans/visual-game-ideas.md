# Visual Game Ideas — Questerix Fractions

> **Status**: Backlog — visual design + engineering ideas
> **Created**: 2026-05-03
> **Prerequisite reading**: `plans/ux-improvement-ideas.md`

---

## Context: What the Game Looks Like Today

All 10 existing archetypes use the same visual language:

| Visual element | Used by |
|---|---|
| Horizontal bar model (shaded segments) | compare, order, benchmark, snap_match, placement |
| Rectangle / circle shape with drag divider | partition, make |
| Plain number line with circle marker | placement, benchmark |
| Text option cards | identify, label, equal_or_not, snap_match |

Every representation is **abstract and geometric**. There are no real-world
objects, no story scenes, no animated environments, no physics feel. That is
the entire design gap this document addresses.

---

## Section 1 — New Real-World Visual Metaphors

Replace or supplement abstract bars with objects children encounter daily.
Each idea below maps directly onto an existing archetype or is a new standalone
mechanic.

---

### 1-A: Pizza Slicer

**Visual:** A round, fully illustrated pizza (tomato sauce, cheese dots, basil
leaves — drawn in Phaser Graphics with emoji accents). A glowing knife cursor
follows the player's drag. The pizza shows pre-scored dotted lines at legal
cut positions.

**Mechanic:** Drag the knife across the pizza. A cut line appears with a
satisfying "snick" animation (the two halves separate slightly). The student
must cut it into the exact number of equal slices requested.

```
  Prompt: "Cut the pizza into 4 equal slices"

        .-"""-.
       /  🍕   \       ← full pizza (draws with Graphics arcs)
      | . . . . |
      | . . . . |      Player drags knife →
       \       /       cut line animates (halves drift apart 2px)
        '-----'
  
  Check button appears after N cuts are made
```

**Why it beats the abstract circle:** Children know pizza. The drag gesture
is the same as the existing partition mechanic — no new engineering concept.
The emotional payoff (pizza slices separating) makes correct answers feel real.

**Builds on:** `PartitionInteraction` — swap the shape renderer for a `PizzaModel`
utility class. The drag/divider logic is unchanged.

**New files:** `src/scenes/interactions/utils/PizzaModel.ts`

**Effort:** Small–Medium

---

### 1-B: Chocolate Bar Snap

**Visual:** A large illustrated chocolate bar (grid of squares, rounded
corners, shiny gloss effect). The number of squares matches the denominator.
Dotted "snap lines" glow between columns.

**Mechanic:** Drag a "break line" left or right to snap between columns.
On commit, the bar physically snaps apart with a short scale-bounce tween.
The shaded portion (numerator) gets a warm amber fill; the remaining portion
goes grey.

```
  Prompt: "Break off 1/3 of the chocolate bar"

  ┌──┬──┬──┐
  │🍫│🍫│🍫│    ←  3-column bar (denominator = 3)
  └──┴──┴──┘
       ↑
  Drag line here → left portion goes amber, right stays grey
  Bar animates: left piece moves left 8px, right piece moves right 8px
```

**Why it matters:** Concrete, familiar. Chocolate bar partitioning is a
standard manipulative used in UK/US K-2 classrooms. The snap animation
is more satisfying than the current static divider line.

**Builds on:** `PartitionInteraction` with a `ChocolateBarModel` renderer.

**New files:** `src/scenes/interactions/utils/ChocolateBarModel.ts`

**Effort:** Small

---

### 1-C: Fill the Jar

**Visual:** A tall glass jar with visible level markings (0, ¼, ½, ¾, 1 — 
drawn as tick lines on the jar wall). A colored liquid pours in from the top
with a gentle wave animation.

**Mechanic:** The liquid rises continuously. The student taps "STOP" when the
liquid reaches the target fraction level. A ±10% tolerance zone around the
target registers as correct; outside it plays a gentle "too much / too little"
feedback.

```
  Prompt: "Fill the jar to 1/2"

   ┌──────┐
   │      │ ← target line (glowing amber dashes at ½)
   │~~~~~~│ ← liquid rises (wave shader via sin oscillation)
   │      │
   └──────┘
     STOP        ← big tap target button
```

**Why it matters:** Introduces continuous/proportional thinking rather than
discrete segment counting. New skill, new visual. The "stop the pour" mechanic
creates suspense — children hold their breath at the right moment.

**New files:**
- `src/scenes/interactions/FillInteraction.ts`
- `src/scenes/interactions/utils/JarModel.ts`

**Effort:** Medium

---

### 1-D: Ribbon / Rope Cutter

**Visual:** A colored ribbon stretches horizontally across the full width of
the screen, anchored by cartoon pins at each end. A small pair of animated
scissors follows the player's tap.

**Mechanic:** The student taps the ribbon at the correct fraction position.
The scissors animate to that point and cut. The two ribbon pieces drift apart
slightly (tween). A ruler/measurement overlay appears below as a hint (Tier 2).

```
  Prompt: "Cut the ribbon at 1/4 from the left"

  📌 ══════════════════════════════════════════════ 📌
     ↑
   Tap here       scissors ✂ animate to tap point
  
  Ribbon snaps apart; left piece = amber, right piece = blue
```

**Why it matters:** Fractions of a **length** rather than fractions of an area.
Distinct cognitive skill, directly maps to number-line placement but far more
concrete and tactile. Supports Common Core 2.MD.6.

**New files:** `src/scenes/interactions/CutInteraction.ts`

**Builds on:** `PlacementInteraction` (same snap-to-fraction logic, new visual)

**Effort:** Medium

---

### 1-E: Sharing Scene

**Visual:** An illustrated scene: two or more cartoon characters sit at a
table with a plate of items (cookies, apples, stars). The items sit in a pile
in the centre. The student drags items onto each character's plate.

**Mechanic:** Drag items one at a time onto character plates. The game checks
that each plate has the same count. On success, characters do a happy bounce
tween.

```
  Prompt: "Share 6 cookies equally between 2 friends"

   😀              😀
  ┌────┐          ┌────┐
  │    │  🍪🍪🍪🍪🍪🍪  │    │
  │    │  (pile)  │    │
  └────┘          └────┘
   Drag to each plate. Each plate shows running count.
```

**Why it matters:** Introduces the division/sharing meaning of fractions
(6 ÷ 2 = 3 each = 1/2 of the total). Real narrative. Characters reacting
creates emotional feedback. This is a distinct activity type not present
in any of the 10 archetypes.

**New files:** `src/scenes/interactions/SharingInteraction.ts`

**Effort:** Large

---

### 1-F: Measuring Cup / Recipe

**Visual:** An illustrated measuring cup with labelled tick marks (½ cup,
1 cup, etc.). A bag of an ingredient sits above it. The student taps the
bag repeatedly to pour one unit at a time, or holds to pour continuously.

**Mechanic:** Each tap adds a fixed unit. The target is the fraction shown
in the recipe card at top. Student must stop exactly on target. "Over-pour"
plays a gentle splash; under-pour shows an empty-cup shake.

```
  Recipe card: "Add 3/4 cup of flour"

     [flour bag 🌾]
         ↓ tap to pour
    ╔════════╗
    ║        ║ ← 1 cup line
    ║ ░░░░░░ ║ ← level rises
    ║        ║ ← 3/4 line (amber glow)
    ║        ║
    ╚════════╝
```

**Why it matters:** Real-world fractions in a cooking context. Extremely
relatable for K-2 (cooking with a parent). Continuous pour vs tap-by-tap
creates two difficulty tiers within one visual.

**New files:** `src/scenes/interactions/MeasureInteraction.ts`

**Effort:** Medium

---

## Section 2 — New Game Mechanics (No Analog in Current Archetypes)

---

### 2-A: Fraction Memory Match

**Visual:** A 3×4 grid of face-down cards (rounded rectangles with a star
pattern on the back). When tapped, a card flips with a perspective-tween
(scaleX 1→0→1 with content swap midway) to reveal a fraction on the front.

**Mechanic:** Classic concentration/memory game. Cards show equivalent
fractions in different representations — one card shows a bar model of 1/2,
its match shows the numeral "1/2", or "2/4", or a shaded circle. Student
finds all matching pairs.

```
  ┌───┐ ┌───┐ ┌───┐
  │ ★ │ │1/2│ │ ★ │     ← face-down / face-up cards
  └───┘ └───┘ └───┘
  ┌───┐ ┌───┐ ┌───┐
  │███│ │ ★ │ │2/4│     █ = bar model (shaded half)
  └───┘ └───┘ └───┘

  Matched pair → both cards glow green and stay face-up
  Mismatch → both flip back (0.5s delay)
```

**Why it matters:** Teaches equivalence (1/2 = 2/4 = shaded bar) through
repeated visual pairing. Completely different engagement pattern from all
current archetypes. Memory games have high replay value — kids want to
beat their own best time. No analogous mechanic exists in the game today.

**New files:** `src/scenes/interactions/MemoryMatchInteraction.ts`

**Effort:** Medium–Large

---

### 2-B: Fraction Quilt Painter

**Visual:** A 4×4 grid of white squares (like a quilt). A palette of 2–3
colours sits at the bottom. Student taps squares to cycle their colour.

**Mechanic:** "Paint exactly 3/4 of the quilt red." Student taps 12 of the
16 squares. A running counter shows "9/16 painted" and updates live. When
the target is hit, the quilt "stitches" itself with a border-draw animation.

```
  Prompt: "Color 3/4 of the quilt blue"

  ┌─┬─┬─┬─┐
  │■│■│■│□│   ■ = blue, □ = white
  ├─┼─┼─┼─┤   Counter: 7 / 12 painted
  │■│■│□│□│
  ├─┼─┼─┼─┤
  │■│■│■│□│
  ├─┼─┼─┼─┤
  │□│□│□│□│
  └─┴─┴─┴─┘
```

**Why it matters:** Teaches the relationship between numerator (how many
painted) and denominator (total squares) in a hands-on way. Highly visual
result — the finished quilt is satisfying. Allows free exploration (any 12
squares satisfy 3/4), which reduces anxiety compared to single-correct-answer
mechanics.

**New files:** `src/scenes/interactions/QuiltInteraction.ts`

**Effort:** Medium

---

### 2-C: Fraction Scales (Balance)

**Visual:** A large balance scale with two pans. Fraction "weight blocks"
drop from the top with a gentle fall animation. The scale arm tilts in real
time based on the fraction values on each side.

**Mechanic (Mode A — Compare):** A fraction block appears on the left pan.
Three blocks appear at the top. Student drags the correct one to the right
pan to balance (or outweigh) the left.

**Mechanic (Mode B — Balance):** Both pans have blocks. The scale is uneven.
Student must add one block from a set to make both sides equal.

```
          ⚖
      /‾‾‾‾‾‾‾\
  [1/4]      [   ]   ← drop 1/4 here to balance
     \___________/

  Choices at top: [1/3]  [1/4]  [1/2]
  Scale tilts as student hovers each choice (preview)
```

**Why it matters:** The balance scale is the most universal concrete model
for comparison and equivalence in mathematics education. The real-time tilt
preview gives immediate visual feedback before committing. No abstract
comparison buttons — the inequality is embodied in the physical tilt.

**New files:** `src/scenes/interactions/ScalesInteraction.ts`

**Effort:** Medium–Large (physics-style tween for arm rotation)

---

### 2-D: Fraction Race

**Visual:** Two cartoon characters stand on side-by-side race tracks. At
each gate, a fraction question appears. The player taps the correct answer.
Their character lunges forward; the opponent character shuffles back.

**Mechanic:** 5-gate race. The character with the most wins at gate 5 crosses
the finish line with a celebration animation. Single-player vs. a simple
AI opponent who is "correct" 60% of the time (adjustable difficulty).

```
  Gate 3 of 5:  "Which is bigger?"

  🐢 ────○───────────── finish
  🐇 ──────────○─────── finish

     [ 1/4 ]   [ 1/3 ]   ← tap the bigger one

  Correct: 🐇 leaps forward 80px with dust cloud
  Wrong:   🐇 stumbles back 20px
```

**Why it matters:** Competition and narrative forward motion are extremely
powerful motivators for K-2 children. The character metaphor makes the
abstract comparison feel like a consequential decision. Replay value is
very high — children want to win every time.

**New files:** `src/scenes/interactions/RaceInteraction.ts`

**Effort:** Medium–Large

---

### 2-E: Fraction Builder (Jigsaw Assembly)

**Visual:** Fraction pieces fly in from off-screen (animated). The centre
area shows an empty shape outline. Student drags pieces into the outline
to assemble a complete whole.

**Mechanic:** e.g. for 3/4: three quarter-pieces animate in. Student drags
them into the shape. A fourth "ghost" piece shows where the missing piece
would go. On assembly, a "snap" burst plays and the fraction notation appears.

```
  Prompt: "How much of the shape is filled?"

        [⅓]   [⅓]   [⅓]      ← three pieces animate in
          ↓    ↓    ↓
       ┌───────────────┐
       │░░░ │░░░ │     │     ← third slot is empty (ghost)
       └───────────────┘
  
  After all three placed: "3/3 = 1 whole!" animation
```

**Why it matters:** Teaches the part-to-whole relationship from the assembly
direction (parts → whole) rather than the division direction (whole → parts).
Develops spatial reasoning alongside fraction concepts.

**New files:** `src/scenes/interactions/BuilderInteraction.ts`

**Effort:** Large

---

## Section 3 — Visual Environment & Theming Upgrades

These don't require new archetypes — they are visual treatments applied to
existing interactions to make the game world feel alive.

---

### 3-A: Per-Level Scene Backgrounds

**Current state:** All levels use the same `drawAdventureBackground` sky
gradient with two soft glow circles.

**Idea:** Each level 1–9 gets a distinct illustrated background that matches
the level's concept:

| Level | Concept | Background scene |
|---|---|---|
| L1 | Halves | Kitchen table with a sandwich being cut |
| L2 | Thirds | Garden with three flower beds |
| L3 | Quarters | A square park with four sections |
| L4 | Identifying fractions | Library shelves |
| L5 | Equivalent fractions | Art studio with colour mixing |
| L6 | Comparing fractions | Sports field with two teams |
| L7 | Ordering fractions | A staircase climbing a mountain |
| L8 | Benchmark (½) | A seesaw on a playground |
| L9 | Mixed / review | A space station (ties to the Questerix rocket) |

Backgrounds are drawn with Phaser Graphics (layered shapes, no image assets
needed) so no extra network requests and no licensing concerns.

**New files:** `src/scenes/utils/levelBackgrounds.ts` — a `drawLevelBackground(scene, levelNumber)` function

**Effort:** Medium (art-direction intensive, low engineering complexity)

---

### 3-B: Animated Mascot Reactions

**Current state:** The mascot has `idle` and `wave` states. It sits in the
corner and does nothing during gameplay.

**Idea:** Add 6 new mascot states that fire automatically during gameplay:

| State | Trigger | Animation |
|---|---|---|
| `cheer` | Correct answer | Arms up, jump tween (scale bounce) |
| `sad` | Wrong answer | Head droops, colour briefly desaturates |
| `think` | Hint requested | Hand-to-chin gesture, thought bubble |
| `excited` | Streak of 3 correct | Rapid wiggle tween |
| `celebrate` | Session complete | Spins 360°, star particles burst |
| `sleep` | 30s idle | Eyes close, Zzz text floats up |

These use Phaser tweens on the existing mascot container — no new sprite
assets required, just tween compositions.

**Key files:** `src/components/Mascot.ts`

**Effort:** Small–Medium

---

### 3-C: Particle Reward System

**Current state:** Correct answers show the `FeedbackOverlay` (text-based).
No particles exist anywhere in the game.

**Idea:** Three tiers of particle bursts, fired from `FeedbackAnimations.ts`:

| Tier | Trigger | Effect |
|---|---|---|
| Small | Single correct answer | 6–8 star particles from the shape, fade in 0.4s |
| Medium | Hint-free correct | 12 stars + a brief golden ring expand |
| Large | Session complete (5/5) | Full confetti shower from top of screen |

Use Phaser's built-in `ParticleEmitter`. Gate on `prefers-reduced-motion`
(skip particles, show a brief ✨ text emoji instead).

**Key files:** `src/components/FeedbackAnimations.ts`

**Effort:** Small

---

### 3-D: Illustrated Fraction Cards (Replace Bar Model Text Cards)

**Current state:** `IdentifyInteraction` shows 3 text option cards with
fraction numerals ("1/2", "1/3") or a bar model.

**Idea:** Each card shows a small illustrated scene thumbnail instead of just
the bar. e.g., for 1/2: a tiny pizza with one slice highlighted. For 1/4:
a chocolate bar with one square broken off.

These are drawn with Phaser Graphics (tiny inline versions of the Section 1
visuals) at roughly 80×100px per card.

**Key files:** `src/scenes/interactions/IdentifyInteraction.ts`

**Effort:** Medium

---

### 3-E: Intro Vignette per Level (2-Second Animated Clip)

**Current state:** Levels start immediately with the question prompt.

**Idea:** Each level opens with a 2-second non-interactive illustrated scene
that sets the context for the session's questions:

- L1: A cartoon hand picks up a knife over a sandwich → "Help share the food!"
- L6: Two characters hold fraction banners → "Who has more?"
- L9: A rocket launches → "Navigate the fraction galaxy!"

These play once per session (not per question). Implemented as a
`LevelVignette` component using Phaser tweens and `Graphics` objects.
Auto-dismissed after 2s or on tap.

**New files:** `src/components/LevelVignette.ts`

**Effort:** Large (content-intensive — 9 unique mini-scenes)

---

## Section 4 — Quick Visual Wins (Low Effort, High Impact)

Things that can ship in a single session and immediately improve feel.

### 4-A: Pie Chart Shape (True Multi-Slice)

The existing `circle` shape in `PartitionInteraction` only supports halves
(one divider). Extend to support proper pie-slice rendering for thirds,
quarters, sixths using Phaser's `fillPath` arc drawing.

**Key files:** `src/scenes/interactions/PartitionInteraction.ts`

**Effort:** Small (2–3 hours)

---

### 4-B: Shape Hover Glow

When the student's finger is over the draggable shape or handle, add a
pulsing amber glow (scaled concentric ring, alpha tween). This makes the
interactive affordance clearer for younger children.

**Key files:** `src/components/DragHandle.ts`

**Effort:** Tiny (< 1 hour)

---

### 4-C: Animated Number Line Marker

The current number line marker is a static circle. Add:
- A subtle bounce when it snaps to a position
- A "trail" of fading dots showing where the student dragged from

**Key files:** `src/scenes/interactions/utils/NumberLine.ts`

**Effort:** Tiny (< 1 hour)

---

### 4-D: Question Counter as Stars

Replace the plain "1 / 5" text counter in the header with 5 star outlines.
As the student answers correctly, each star fills with gold (with a pop tween).
Wrong answer → star turns red briefly then resets to outline.

**Key files:** `src/lib/levelSceneChrome.ts` (createHeader)

**Effort:** Small (2–3 hours)

---

### 4-E: Fraction Notation Styling

The current fraction display is a plain text string ("1/2"). Replace it with
a proper stacked fraction (numerator over a horizontal rule over denominator)
using two `Text` objects and a `Graphics` line. Makes the notation look
mathematically correct and visually distinct from a division problem.

The `SymbolicFractionDisplay` component already exists and does this — ensure
it is used everywhere, including in prompt text.

**Key files:** `src/components/SymbolicFractionDisplay.ts` — audit usage

**Effort:** Tiny–Small

---

## Priority Order (Visual Ideas)

| # | Idea | Section | Effort | Recommended order |
|---|---|---|---|---|
| 1 | Particle reward system | 3-C | Small | ✅ Ship first — instant feel improvement |
| 2 | Animated mascot reactions | 3-B | Small–Med | ✅ Pairs with particles |
| 3 | True pie chart (multi-slice) | 4-A | Small | ✅ Fixes existing limitation |
| 4 | Shape hover glow | 4-B | Tiny | ✅ Quick win |
| 5 | Star question counter | 4-D | Small | ✅ Quick win |
| 6 | Animated number line marker | 4-C | Tiny | ✅ Quick win |
| 7 | Pizza Slicer (real-world shape) | 1-A | Small–Med | After quick wins |
| 8 | Chocolate Bar Snap | 1-B | Small | After pizza |
| 9 | Per-level backgrounds | 3-A | Medium | Visual art sprint |
| 10 | Fraction Memory Match | 2-A | Med–Large | New mechanic sprint |
| 11 | Fraction Scales | 2-C | Med–Large | New mechanic sprint |
| 12 | Fraction Quilt Painter | 2-B | Medium | New mechanic sprint |
| 13 | Fill the Jar | 1-C | Medium | New mechanic sprint |
| 14 | Ribbon / Rope Cutter | 1-D | Medium | New mechanic sprint |
| 15 | Measuring Cup / Recipe | 1-F | Medium | New mechanic sprint |
| 16 | Fraction Race | 2-D | Med–Large | Engagement sprint |
| 17 | Fraction Builder (Jigsaw) | 2-E | Large | Advanced sprint |
| 18 | Sharing Scene | 1-E | Large | Advanced sprint |
| 19 | Level intro vignette | 3-E | Large | Polish sprint |
| 20 | Illustrated fraction cards | 3-D | Medium | After real-world shapes |

---

## Engineering Notes

- **No image assets required** — all visuals described above use Phaser's
  `Graphics` API (arcs, fillPath, fillRect) plus emoji characters. This keeps
  the bundle small and avoids licensing issues.
- **Phaser `ParticleEmitter`** is already included in Phaser 4 and needs no
  new dependency.
- **All new `Interaction` classes** follow the existing `Interaction` interface
  (`mount`, `destroy`, `showHintOverlay`) — plug directly into `LevelScene`
  routing with a one-line archetype registration.
- **`prefers-reduced-motion`** gating is already pattern-established in the
  codebase (`checkReduceMotion()`). Every new animation must check this.
- **Touch targets** must remain ≥ 44×44 CSS px per accessibility spec.
