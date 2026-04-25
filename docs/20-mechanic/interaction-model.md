---
title: Interaction Model
status: draft
owner: solo
last_reviewed: 2026-04-24
applies_to: [mvp]
constraint_refs: [C6, C7, C9]
related: [activity-archetypes.md, design-language.md, ../00-foundation/constraints.md]
---

# Interaction Model

How student input becomes a validated answer, uniformly across mechanics. This is the *behavioral* contract; `activity-archetypes.md` is the *per-mechanic* contract; `design-language.md` is the *visual* contract.

The goal: a K–2 student who learns the gestures in Level 1 carries that gesture vocabulary intact through Level 9. Drag means the same thing in `partition_halves` as it does in `magnitude_scales:L8`.

---

## 1. Universal Input Vocabulary

The MVP uses a deliberately small set of gestures. Each mechanic in `activity-archetypes.md` selects from this vocabulary; no mechanic invents new gestures.

| Gesture | Behavior | Used by mechanics |
|---------|----------|-------------------|
| **Tap** | Single click/touch; submits a discrete choice | identify, equal_or_not, compare |
| **Drag** | `pointerdown` → move → `pointerup`; relocates an object | partition, label, make/fold, snap_match, benchmark, order, placement |
| **Long-press** | `pointerdown` held ≥ 350 ms; engages secondary action (e.g., re-pick a placed card) | order |
| **Hint-request** | Tap on the dedicated hint button (icon: `help-circle`) | All mechanics |
| **Audio-replay** | Tap on the dedicated speaker button (icon: `volume-2`) | All mechanics |

### 1.1 Drag semantics

- **Pickup zone:** entire visual surface of the draggable element (no tiny grab handles)
- **Drag preview:** the original object scales to 1.05× and lifts (drop shadow, 4 px elevation, no glow)
- **Drop affordance:** any valid drop target tints with `primary-soft` (`#D9E5FB`) on hover
- **Snap behavior:** if the snap engine (see §3 below) registers a snap, the dragged object decelerates into the target — no separate "release" required for auto-snap targets
- **Cancel drag:** drag terminates outside any valid target → object animates back to origin in 350 ms

### 1.2 Tap targets

All tap targets respect `design-language.md §5` minimums (44 × 44 hit area). A tap is registered on `pointerup` *inside* the same target the `pointerdown` started on. Sliding off cancels the tap (avoids accidental fires from finger drift).

### 1.3 Multi-touch policy

The MVP supports **only one active touch point at a time**. Second touches are ignored. This avoids accidental two-finger pinches on tablets and prevents the engine from juggling concurrent drags.

---

## 2. Feedback Timing

Per cognitive-science research on novice learners (e.g., Anderson 1989, Shute 2008): feedback within **< 1 second** of the action keeps the action–consequence link in working memory. Beyond ~3 seconds, the student must reconstruct what they did, which adds extraneous load.

The MVP feedback budget:

| Stage | Max latency | What happens |
|-------|-------------|--------------|
| **Visual acknowledge** | 100 ms | Submit button depresses; dragged object freezes |
| **Validation** | 200 ms | Validator returns outcome (in-process; no I/O) |
| **Outcome animation begins** | 300 ms total | Snap pulse / shake / etc. starts |
| **Outcome animation ends** | < 1000 ms total | Student is ready for next action |

If validation cannot return in 200 ms (it always should — validators are pure functions over local state), the system shows a "thinking…" indicator. This should be a debugging signal, not an expected user experience.

### 2.1 Anti-double-tap

Once an answer is submitted, the inputs are disabled until the outcome animation completes. Re-enabled when the next question loads or the student taps "Try Again" on a CLOSE/WRONG result.

---

## 3. The Snap Engine

The prototype already implements a magnetic snap engine in `src/data/config.ts ENGINE_SETTINGS.snap` and `src/systems/DragSystem.ts`. The MVP retains this engine's behavior (it works), but tunes the parameters for the new design language and removes the neon glow effects (per C6).

### 3.1 Snap zones (per current prototype, retained)

| Phase | Range | Behavior |
|-------|-------|----------|
| Detection | 320 px | Drop target is highlighted with `primary-soft` |
| Magnetic pull | 220 px | Dragged object accelerates toward target center (cubic ease) |
| Auto-snap | 40 px | Object locks into target without requiring `pointerup` |
| Manual drop | 90 px on `pointerup` | Object locks if released within this radius |

### 3.2 What changes from the prototype

- Glow trails (`ENGINE_SETTINGS.feedback.trailParticleCount`, `glowScale`) are **removed** per C6.
- Snap haptics (`haptic.light/medium/heavy`) are **retained** — short vibrations on supported devices reinforce the snap moment without visual noise.
- Snap visuals become a single 200 ms `success-soft` pulse on the slot.

### 3.3 Snap is mechanic-aware

Some mechanics (e.g., `placement` on a number line) deliberately disable snap so that the student's actual placement determines the answer. The mechanic's `payload.snapMode` field (defined per archetype) is the authoritative switch.

---

## 4. Hint Escalation Ladder

Three tiers, escalating in directness. Each `QuestionTemplate` has up to three associated `Hint` records (per `data-schema §2.9`); each tap on the hint button reveals the next tier.

| Tier | Type | Cost (points) | Example for `partition_halves` |
|------|------|---------------|-------------------------------|
| 1 | **Verbal** prompt re-phrased + concept reminder | 5 pts | "Equal parts means each piece is the same size." |
| 2 | **Visual overlay** — semi-transparent ghost showing target structure | 15 pts | A faint dashed line appears at the centerline, hinting where to draw |
| 3 | **Worked example / animation** — the answer is demonstrated, not delivered | 30 pts | The dividing line animates into the correct position; student must then re-create it themselves |

> **Cross-reference (audit §2.1 fix):** `Hint.type` values (`"verbal"` | `"visual_overlay"` | `"worked_example"`) are defined in `data-schema.md §2.9` and map 1:1 to the three tiers above.

### 4.1 Hint UX rules

- **Hint button is always present**, even before any wrong attempt. Asking for help is encouraged, not a recovery action.
- **Tier 3 never auto-completes the answer.** After the demonstration, the canvas resets and the student attempts the action themselves.
- **Hint cost is deducted from the question's potential points**, not from the student's running XP. Asking for help reduces what you *can earn*, never what you *have earned*.
- **One hint per question per tier.** Repeated hint button taps after Tier 3 do nothing (or re-show the same Tier 3 demo).
- **Hint usage is recorded** as a `HintEvent` (per `data-schema §3.4`) tied to the current `Attempt`.

### 4.2 Hint budget per difficulty tier

Per `level-01.md §4` examples:

| Difficulty | Available tiers |
|------------|----------------|
| Easy | All 3 |
| Medium | 1 and 2 only |
| Hard | 1 only |

This forces increasingly independent reasoning as scaffolding decreases.

---

## 5. Failure Feedback (Gentle, Non-Shaming)

K–2 learners are particularly sensitive to negative feedback framing. The MVP's failure feedback follows three rules:

### 5.1 Rules

1. **Never use the word "wrong."** Use "Not quite," "Almost!", or "Try again." The validator's `outcome: "WRONG"` is an internal label, never student-facing copy.
2. **Show, don't tell, the error.** When a `compare` answer is wrong, don't display "WRONG"; instead, animate the bar models to align so the student *sees* the magnitude difference (per `activity-archetypes §5`).
3. **Always allow retry.** No question is marked permanently incorrect after one attempt. Retry is free except for any hint costs already incurred.

### 5.2 Visual treatment

- Error color (`#E5484D`) appears for **at most 600 ms**, then the UI returns to neutral.
- No persistent red borders, no error icons that linger.
- The student's incorrect input either bounces back to its origin (drag mechanics) or stays in place with a brief shake (tap mechanics).

### 5.3 Audio treatment

- A single soft tone (~200 ms, falling pitch). Never a buzzer or harsh sound.
- Optional TTS: "Not quite — try one more time" (only if `DeviceMeta.preferences.audio === true`).
- Audio failure cue is suppressed entirely if the student gets the same question wrong 3+ times in a row (avoids reinforcement of frustration).

### 5.4 Streak handling

After 3 consecutive wrong attempts on the same question:
- Hint button auto-pulses to draw attention (one-time, 1 second pulse, then static)
- A "Show me how" prompt appears, offering the Tier 3 hint immediately if not already used
- The session-level progression engine is notified (potential `regress` recommendation; see `runtime-architecture.md §progression-engine`)

---

## 6. Success Feedback (Celebratory, Brief)

Success feedback should feel earned, not constant. Over-celebration (every correct answer triggering confetti and trumpets) trains students to expect external validation rather than internal mastery.

### 6.1 Per-question success

- 200 ms scale-up to 1.05× on the answered element
- `success-soft` color fill on the answered element for 400 ms
- A single ✓ icon (24 × 24) appears for 600 ms, then fades
- A short audio cue (~150 ms, rising pitch). One tone, not a fanfare.
- No screen-wide overlay; no full-screen "GREAT JOB!"

### 6.2 Per-session success

When a session ends (5+ problems attempted, per C9), a single end-of-session card appears showing:

- Total problems attempted
- Accuracy percentage
- A simple star or two-star indicator if mastery criteria advanced
- A "Keep going" or "Take a break" CTA

The session-end card is the *one* place where slightly more elaborate visual celebration (a brief star animation) is appropriate, since the student has earned 10–15 minutes of focused effort.

### 6.3 Per-level success

When a student first reaches `MASTERED` on the gating skills for a level (per `level-01.md §7`):

- A "You did it!" modal appears with the level number unlocked
- Includes a 2–3 second animation of the new shape primitive (e.g., a circle splitting into thirds for L3)
- Modal can be dismissed with a single tap
- This is *the* big celebration moment; it should feel meaningfully different from per-question feedback

---

## 7. Reduced Motion Mode

When `DeviceMeta.preferences.reduceMotion === true` (or the OS-level `prefers-reduced-motion: reduce` media query is set), the following changes apply uniformly:

| Default | Reduced Motion |
|---------|----------------|
| Snap pulse (200 ms) | Instant color change |
| Card return-to-tray (350 ms ease) | 80 ms fade-and-reposition |
| Shake on wrong (160 ms) | Single border flash, 80 ms |
| Reorder slide animation (600 ms) | Instant reorder |
| Success scale-up (200 ms) | Instant ✓ icon, no scale |
| Magnetic pull cubic ease | Object teleports on drop |
| Partition demonstration (hint Tier 3) | Static dashed overlay |
| Level-success animation (2–3 s) | Static graphic + text |

The `prefers-reduced-motion` query is the *upstream* signal; the in-app preference can override either direction (force reduce, or force allow regardless of OS setting). The in-app preference is stored in `DeviceMeta.preferences.reduceMotion` (per `data-schema §3.8`).

---

## 8. Audio Model

### 8.1 Audio replay

Every question prompt is paired with a TTS-generated audio rendering of `prompt.text` via the browser `SpeechSynthesis` API (per `scope-and-sequence §7` recommendation).

- A `volume-2` icon button sits adjacent to the prompt text
- Tapping replays the prompt audio
- No auto-replay; no auto-play on first display unless `DeviceMeta.preferences.audio === true` *and* this is the first display of the question
- Audio is paused when the user begins any interaction (tap or drag start)

### 8.2 Sound effects

The MVP ships ~5 sound effects total:

- Snap (when an object docks): short tick, ~100 ms
- Success (correct answer): rising 2-tone, ~150 ms
- Failure (wrong answer): falling 1-tone, ~200 ms
- Tap (UI buttons): soft click, ~50 ms
- Level complete: 4-tone fanfare, ~600 ms

All effects honor the global `audio` preference. All are cached by the service worker on first load.

### 8.3 Audio is never required

A student with audio disabled or off can complete every level. All prompts have visible text; all feedback has a visual equivalent.

---

## 9. Keyboard and Switch Access (Stretch)

While K–2 students primarily use touch, the MVP retains baseline keyboard access for:

- Adult helpers (per `level-01.md §10` open question 4)
- Switch-control assistive devices (iOS Switch Control, Android Switch Access)
- Future keyboard-based playtest sessions

Minimum keyboard support:

- Tab cycles through interactive elements
- Space/Enter activates buttons and tap-targets
- Arrow keys move a focused draggable in 8-px increments; Enter "drops" it
- Escape cancels an active drag

Full keyboard *parity* with touch is not an MVP goal — only baseline access is.

---

## 10. Telemetry Hooks (Local Only)

Every interaction generates structured records in IndexedDB (per `persistence-spec`):

- Drag start → `Attempt.startedAt` set
- Submit / drop / tap → `Attempt` row written with `studentAnswerRaw`
- Hint tap → `HintEvent` row written
- Misconception detected → `MisconceptionFlag` upserted

No remote telemetry per C1. Inspection happens by exporting the IndexedDB snapshot during playtests (per `persistence-spec §6`).

---

## 11. Cross-References

- Per-mechanic input mappings: `activity-archetypes.md`
- Visual styling of all states: `design-language.md`
- Where these interactions get persisted: `../30-architecture/persistence-spec.md`
- Why short sessions matter (informs the per-question feedback budget): C9 in `../00-foundation/constraints.md`
