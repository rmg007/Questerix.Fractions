# Playtest Friction Watchlist — L1 → L2 → L3

**Date:** 2026-05-01 · **Audience:** observer running the first 6-year-old playtest · **Companion to:** observer-form

Keep this beside the form during the ~30 min session. It is a static-analysis primer — what an experienced K-2 UX colleague would whisper in your ear before the dry-run friction walk. Findings are inferred from source, not from play, so treat each bullet as a place to *look*, not a guaranteed bug. Skip anything that doesn't manifest. Add anything new you observe in the margins; the dry-run will overwrite this doc.

## L1 — Halves (Level01Scene)

- Watch for: kid drags the partition line near-centre, nothing snaps until they let go — `PartitionInteraction.ts:111` only commits on drag-end (`onCommit` inside the drop callback). A child who hovers at the midpoint expecting feedback gets none.
- Watch for: kid taps the trophy on the session-complete screen instead of "Next Level" — both are emoji-glossy on the same sky-blue card; trophy at y=320, Next Level button at y=780 (`SessionCompleteOverlay.ts:84,147`). The trophy springs (Elastic.Out) drawing the eye.
- ~~Watch for: kid solves Q1/Q2 quickly, then suddenly sees a 4-equal-parts prompt with one drag-line — `q:pt:L1:0003` "Split this shape into 4 equal parts" was a medium-tier template that violated C8 (L1=halves only).~~ **RESOLVED:** template removed from `pipeline/output/level_01/all.json`; curriculum bundles regenerated.
- Watch for: prompt narration starts before the kid has looked at the shape — `Level01Scene.ts:739` calls `tts.speak(promptText)` immediately after `setText`, before `drawShape()` runs at line 746.
- Watch for: silent wrong answers — `FeedbackOverlay.ts:137` only fires `sfx.playCorrect()`; there is no SFX on incorrect, so a kid not watching the screen misses the cue. The mascot switches to `think` (`Level01Scene.ts:1103`) but that's visual-only.
- Watch for: kid taps the Quest mascot in the upper-right thinking it's a button — Mascot is at (720, 160) at scale 0.75 with a glossy hat (`Level01Scene.ts:331`, `Mascot.ts:318-337`); it's purely decorative and has no `setInteractive`.

## L2 — Thirds & Fourths (LevelScene)

- Watch for: visual discontinuity at the L1→L2 hop — the "Next Level" tap calls `fadeAndStart(this, 'LevelScene', ...)` at `Level01Scene.ts:1591`; LevelScene re-builds chrome from scratch (`LevelScene.ts:172-191`) and the question counter pill *bounces* on every load (`LevelScene.ts:1281-1296`), where L1's pill (`Level01Scene.ts:546-563`) is static. Kid may interpret the bounce as "something I did wrong."
- Watch for: kid tries to drag a single line to make thirds — first L2 template prompt is "Cut the shape into 3 equal parts." (`v1.json` `q:pt:L2:0001`), but PartitionInteraction always renders one handle (`PartitionInteraction.ts:78-114`). Snap targets only include centre when `snapMode==='axis'` (`PartitionInteraction.ts:68`); medium-tier 3-part templates use `snapMode='free'`, so there's no scaffold telling the child where the second cut should go.
- Watch for: identify-archetype option cards feel "small and identical" — `IdentifyInteraction.ts:64` caps cardW at 180 and renders only the alt-text label (no actual fraction picture). The kid reads "Rectangle split into 3 parts, 2 shaded" vs "Rectangle split into 3 parts, 1 shaded" — both walls of text for a 6-year-old, no visual differentiator.
- Watch for: hint button at top-right (`LevelScene.ts:526` y=270) is far from the Check button at `CH-180=1100` — a kid who is stuck has to traverse the whole canvas to ask for help.
- Watch for: visual-overlay hint shows dashed *cut lines* but never animates the handle to one of them — `PartitionInteraction.ts:172-207` draws static dashed marks; the kid may not connect "those lines" with "drag your line *to* one of those lines."

## L3 — Equal-or-Not & Label (LevelScene)

- Watch for: Equal/Not-Equal buttons are far below the shape — buttons render at `centerY + 240` (`EqualOrNotInteraction.ts:37`) while the shape sits at `centerY` and is 260 px tall, so the kid's eyes have to skip past empty canvas. They may miss the buttons entirely.
- Watch for: tier-2 visual_overlay on equal_or_not shows a *crosshair* over the shape (`EqualOrNotInteraction.ts:126-134`) — the hint is "compare halves and quarters" but the crosshair only divides into 4 even quadrants, which is wrong for the 3-part templates (`v1.json` `q:eo:L3:0002`).
- ~~Watch for: kid drags a label tile, drops it anywhere, gets credit/no-credit unpredictably — `LabelInteraction.ts:90-94` snapToFirst always pinned to region 0 regardless of intent.~~ **RESOLVED:** function renamed to `snapToNearest`, factored shared `nearestRegionIndex(tileX)` closure used by canvas drag-end + TestHooks + A11yLayer; all three input paths agree.
- Watch for: label tiles have no visual "drop zone" affordance — regions are flat OPTION_BG rectangles (`LabelInteraction.ts:60`), no dashed outline or "drop here" copy until the tier-2 hint fires (`LabelInteraction.ts:169-179`).
- Watch for: prompt "Drag the label to match each shaded region" (`v1.json` `q:lb:L3:0001`) but no region is *visibly shaded* in the stub — `LabelInteraction.ts:60` draws boxes filled with OPTION_BG only; nothing distinguishes which region the kid should target. Listen for "which one?"
- Watch for: kid taps "Equal" on a clearly unequal shape just to advance — there is no "I don't know" path, no skip, and wrong answers re-prompt with the same hint copy via `quest.feedback.wrong.equal_or_not` (`LevelScene.ts:725`).

## Cross-level concerns

- TTS races itself: every prompt change calls `tts.speak(...)` which cancels the previous utterance (`Level01Scene.ts:1117,1200`, `LevelScene.ts:369`). Wrong-answer narration interrupts hint narration interrupts prompt narration. Listen for clipped audio mid-sentence.
- Hint-tier escalation is silent: after 3 wrong, the hint button pulses (`LevelScene.ts:833-836`, `Level01Scene.ts:1156-1157`) but no audio cue fires and the mascot stays in `think`. A kid not looking at the top-right misses the affordance.
- Reduced-motion is OS-level only (`preferences.ts` via `checkReduceMotion()` calls in `Level01Scene.ts:229`, `LevelScene.ts:147`, `Mascot.ts:49`). If the test device has it on, the L1→L2→L3 transitions skip fade and the trophy doesn't spring — playtest may feel "dead" without it being a bug.
- The Mascot state never voices anything — `Mascot.setState('cheer')` runs a tween (`Mascot.ts:129-164`) but emits no sound; correctness audio comes only from `sfx.playCorrect()` in FeedbackOverlay. Mascot timing thus has no auditory anchor.
- L1 uses `Level01Scene` (its own class with inline questions array `Level01Scene.ts:80-121`), L2/L3 use `LevelScene` (Dexie templates). Hint copy comes from different code paths (`Level01Scene.ts:1051-1063` vs `LevelScene.ts:743-778`); a kid who learns the L1 hint phrasing may not recognise L2's reworded version.

## Observer prompts (post-session debrief)

1. "On the screen with the trophy and the stars, what would you tap to keep playing?" — tests Next-Level vs trophy ambiguity (L1 SessionCompleteOverlay finding).
2. "When you got it wrong, how did you know it was wrong?" — surfaces the missing wrong-answer SFX. Listen for "I just saw the X" vs "the game told me."
3. "What does the wizard in the corner do?" — tests whether the kid expected the mascot to be tappable or to talk.
4. "On the [3-parts] question, where did you want the line to go?" — surfaces whether the single-handle metaphor breaks once denominators leave halves.
5. "Did you ever feel like the game was talking too fast or over itself?" — surfaces TTS race conditions across prompt/hint/feedback.
