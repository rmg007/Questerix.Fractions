# UX Improvement Ideas — Questerix Fractions

> **Status**: Backlog — ideas for prioritisation
> **Created**: 2026-05-03
> **Source**: Post-review brainstorm session

---

## Overview

Ideas are grouped into four tiers based on estimated impact. Tier 1 targets
adult decision-makers (parents, teachers) who choose whether the app stays on
the device. Tier 2 targets kid retention. Tier 3 deepens content so kids don't
exhaust the curriculum in a few sessions. Tier 4 is polish that signals
production quality.

All data dependencies noted below already exist in the Dexie database (BKT
mastery estimates, session records, streak counts). Most features are
primarily UI work.

---

## Tier 1 — Makes Adults Choose and Keep the App

### T1-A: Progress Snapshot for Parents

**What:** A single screen (reachable from SettingsScene) that translates BKT
`masteryEstimate` values into plain English a parent or teacher can read at a
glance.

**Example output:**
> "Emma has mastered Halves and Equal Parts. Currently working on Thirds.
> 12 sessions total · 3-day streak · Last played today"

**Why it matters:** K-2 apps are installed and deleted by adults, not children.
Giving parents a legible view of real learning data is the single highest-value
feature the app is missing. The underlying data (BKT per skill, session count,
streak) is already in Dexie — this is a read-only display layer.

**Key files to touch:**
- `src/scenes/SettingsScene.ts` — add "View Progress" button
- New: `src/scenes/ProgressScene.ts` — read from `skillMasteryRepo`,
  `sessionRepo`, `streakLib` and render a clean summary card per level

**Effort estimate:** Medium (2–3 sessions)

---

### T1-B: Shareable Mastery Certificate

**What:** A button that renders a congratulatory certificate image to the
screen — child's name, the skill mastered, and the date — which the parent
can screenshot or print.

**Example:**
> "🌟 Emma mastered Level 3: Equal Parts! — May 3, 2026"

**Why it matters:** Teachers hang these up. Parents post them. It creates an
offline social loop that drives word-of-mouth installs. Zero server cost.

**Implementation notes:**
- Use Phaser's `game.renderer.snapshot()` to export the certificate panel as
  a PNG data URL, then open it in a new tab for save/print.
- Trigger from the PostSessionOverlay when a level is first mastered
  (BKT estimate crosses 0.85 threshold).
- Only show once per skill mastery event; store a `certificateIssuedAt` flag
  in `levelProgressionRepo` to prevent repeat prompts.

**Key files to touch:**
- `src/components/PostSessionOverlay.ts` — add "Get Certificate 🎓" button
- New: `src/components/MasteryCertificate.ts` — renders the canvas panel

**Effort estimate:** Medium (1–2 sessions)

---

## Tier 2 — Keeps Kids Coming Back

### T2-A: Trophy Room

**What:** A collection screen showing 12–15 badges, earned for real in-game
milestones. Unearned badges appear as grey silhouettes with a hint of what
they are.

**Example badges:**
| Badge | Trigger |
|---|---|
| 🌟 First Star | Answer first question correctly |
| 🔥 On Fire | 3-day login streak |
| 🏆 Half-Master | Master Level 1 (BKT ≥ 0.85) |
| 💯 Perfect Round | Session with 5/5 correct, no hints |
| 🗺 Explorer | Complete all 9 levels at least once |
| 🚀 Speed Run | Answer 3 questions in a row in under 8s each |
| 🎯 Sharpshooter | 10 consecutive correct answers across any sessions |

**Why it matters:** Badges give kids a goal that persists across sessions.
The streak system already exists — this is the natural extension of it.
Children in the K-2 age group respond strongly to visible collection mechanics.

**Key files to touch:**
- New: `src/lib/badgeEngine.ts` — evaluates badge triggers against Dexie data
- New: `src/scenes/TrophyScene.ts` — grid layout of earned/unearned badges
- `src/scenes/MenuScene.ts` — add "Trophies 🏆" pill button
- `src/components/PostSessionOverlay.ts` — surface newly earned badges here

**Effort estimate:** Large (3–4 sessions)

---

### T2-B: Mascot Personalisation

**What:** During onboarding, let the child pick a name for the mascot and one
of four colour themes (default blue, sunny yellow, rosy pink, leafy green).
The chosen name and colour persist in `deviceMeta.preferences`.

**Why it matters:** A named character feels like a friend. Emotional attachment
to the mascot is a direct driver of voluntary re-engagement ("I want to see
Zippy again"). Implementation cost is low — the `Mascot` component already
takes a tint parameter.

**Key files to touch:**
- `src/scenes/OnboardingScene.ts` — add name-input step + colour picker step
- `src/components/Mascot.ts` — accept `tintColor` and `name` props
- `src/persistence/repositories/deviceMeta.ts` — add `mascotName`,
  `mascotColor` preference fields
- `src/scenes/MenuScene.ts` — display mascot name in a small speech bubble
  on idle

**Effort estimate:** Small–Medium (1–2 sessions)

---

### T2-C: Full-Canvas Session Celebration

**What:** When a session ends with a perfect score (5/5 correct) or a level is
mastered for the first time, play a 1.5-second full-canvas celebration before
the PostSessionOverlay appears: confetti particles, mascot dancing, big star
burst from the centre.

**Why it matters:** The current transition straight to PostSessionOverlay is
functional but emotionally flat. The celebration is the peak moment — making
it feel big is the difference between "I want to do that again" and "okay,
what's next?" This is especially important for a K-2 audience.

**Implementation notes:**
- Use Phaser's built-in particle emitter for confetti (colour-matched to the
  level theme).
- Mascot dance: 3-frame sprite or tween sequence (scale bounce + rotation).
- Gate on `prefers-reduced-motion`: if set, skip particles, show a static
  star burst graphic instead.
- Trigger point: inside `showSessionCompleteForLevel` (LevelScene) and
  `PostSessionOverlay` mount path in LevelMapScene.

**Key files to touch:**
- New: `src/components/CelebrationBurst.ts`
- `src/lib/levelSceneSessionComplete.ts` — call CelebrationBurst before
  showing overlay
- `src/components/Mascot.ts` — add `dance` state

**Effort estimate:** Medium (1–2 sessions)

---

## Tier 3 — Content Depth

The app currently has 54 question templates across 2 archetypes (partition,
compare). A child who plays daily exhausts the distinct content in roughly
3–5 sessions. New archetypes dramatically increase longevity.

### T3-A: Word-Problem Archetype

**What:** Short reading-comprehension fraction problems presented as text +
a simple illustration, with 3 multiple-choice fraction answers.

**Example:**
> "Mia cut a sandwich into 2 equal pieces and ate 1.
> What fraction of the sandwich did she eat?"
> ① 1/2  ② 1/3  ③ 2/3

**Why it matters:** Targets a completely different sub-skill (reading fractions
in a real-world context) not covered by the drag mechanic. Explicitly aligns
with Common Core 1.G.A.3 and 2.G.A.2. Doubles the curriculum surface area for
levels 3–9 with minimal engine changes.

**Key files to touch:**
- New: `src/scenes/interactions/WordProblemInteraction.ts`
- `src/curriculum/bundle.json` — add ~18 word-problem templates (2 per level)
- `src/validators/wordProblem.ts` — simple option-match validator
- `src/scenes/LevelScene.ts` — route archetype `"word_problem"` to new
  interaction class

**Effort estimate:** Large (3–4 sessions)

---

### T3-B: Number Line Placement Archetype

**What:** A fraction is shown (e.g. "½"). A number line runs from 0 to 1.
The student drags a marker bead to the correct position. Snaps to nearby
correct position if within tolerance.

**Why it matters:** Number line reasoning is a distinct cognitive skill from
partitioning shapes, explicitly covered in Common Core K.CC and 2.MD.6.
The existing drag-and-snap mechanic in Level01Scene transfers directly.
High teacher credibility — number lines are a classroom staple.

**Key files to touch:**
- New: `src/scenes/interactions/NumberLineInteraction.ts`
- New: `src/validators/numberLine.ts` — proximity-threshold validator
- `src/curriculum/bundle.json` — add ~12 number-line templates
- `src/scenes/LevelScene.ts` — route archetype `"number_line"`

**Effort estimate:** Large (2–3 sessions)

---

## Tier 4 — Polish That Signals Quality

### T4-A: Real-Time Adaptive Difficulty

**What:** Within a session, the question difficulty adjusts based on the
student's current-session performance, not just their long-term BKT estimate.

**Rules:**
- 3 correct in a row with no hints → next question steps up one difficulty
  tier (easy → medium → hard).
- 2 wrong answers on the same difficulty → step back one tier and offer a hint
  automatically.

**Why it matters:** The BKT engine already tracks mastery per skill across
sessions. This adds within-session responsiveness so the game never feels
too easy (boredom) or too hard (frustration) for more than 2 questions in
a row — the "flow channel" principle.

**Key files to touch:**
- `src/lib/levelSceneQuestionFlow.ts` — expose current-session streak/wrong
  count to the template selector
- `src/lib/levelSceneTemplates.ts` — `loadTemplatesForLevel` currently ignores
  in-session state; add difficulty-band parameter
- `src/scenes/LevelScene.ts` — pass session streak to template loader

**Effort estimate:** Medium (1–2 sessions)

---

### T4-B: Background Music

**What:** A gentle looping adventure theme that plays throughout gameplay.
Respects the existing audio master toggle in Settings and
`prefers-reduced-motion` (mutes on reduce-motion per spec).

**Why it matters:** Silence makes a children's app feel unfinished. A 30-second
royalty-free loop running on repeat transforms the atmosphere without requiring
complex audio engineering. The `SFXService` and audio preference plumbing
already exist.

**Implementation notes:**
- Source a royalty-free loop (e.g. from OpenGameArt.org or Pixabay) and place
  in `public/audio/`.
- Use Phaser's `this.sound.add('bgm', { loop: true, volume: 0.25 }).play()`
  in MenuScene and LevelScene.
- Fade out on scene transition (`fadeAndStart` wrapper can call
  `this.sound.stopAll()` after the fade-out completes).
- Gate on `meta.preferences.audio` already read in LevelScene.

**Key files to touch:**
- `public/audio/bgm-loop.mp3` — add the audio asset
- `src/scenes/MenuScene.ts` — start BGM
- `src/scenes/LevelScene.ts` — continue or restart BGM
- `src/scenes/utils/sceneTransition.ts` — fade BGM on departure

**Effort estimate:** Small (0.5–1 session)

---

## Priority Order (Recommended)

| # | Feature | Tier | Effort | Recommended next? |
|---|---|---|---|---|
| 1 | Progress Snapshot for Parents | 1 | Medium | ✅ Yes |
| 2 | Trophy Room | 2 | Large | ✅ Yes (pair with #1) |
| 3 | Background Music | 4 | Small | ✅ Quick win |
| 4 | Full-Canvas Celebration | 2 | Medium | After music |
| 5 | Mascot Personalisation | 2 | Small–Med | After celebration |
| 6 | Mastery Certificate | 1 | Medium | After personalisation |
| 7 | Real-Time Adaptive Difficulty | 4 | Medium | Standalone sprint |
| 8 | Word-Problem Archetype | 3 | Large | Curriculum sprint |
| 9 | Number Line Archetype | 3 | Large | Curriculum sprint (pair with #8) |

---

## Notes

- All Tier 1 and Tier 2 features use data already stored in Dexie.
  No backend required.
- Tier 3 (new archetypes) requires new curriculum JSON templates in addition
  to new interaction classes. Plan for content-writing time alongside engineering.
- Tier 4 features are independently shippable and can fill gaps between larger
  sprints.
