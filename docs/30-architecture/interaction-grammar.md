# Interaction Grammar: Gesture Specifications

**Date:** 2026-05-05  
**Part of:** [Phase 0 — Interaction & Motion Design System](../../PLANS/2026-05-04-roadmap.md)  
**Source:** `src/scenes/utils/interaction.ts`

Every interaction in the app follows one of the documented gestures. This is the single source of truth for tap/drag/snap timings, radii, and debounce windows.

## Core Principle

**Release outside a valid region is never an error.**  
Bounce back, no penalty, no attempt counter increment, no hint progression, no audio "wrong" sting. K–2 children abandon apps that punish exploration.

## Gesture Tokens

All values are calibrated for K–2 motor skills. Source: `src/scenes/utils/interaction.ts`

| Name | Value | Use |
|---|---|---|
| `tapCancelRadiusPx` | 8 px | Pointer drift before a tap becomes a drag |
| `tapMaxDurationMs` | 250 ms | Maximum hold time for a press to count as tap |
| `longPressMs` | 500 ms | Duration before held press triggers long-press |
| `dragEngageThresholdPx` | 6 px | Distance before drag officially begins |
| `dragCancelRevertMs` | 200 ms | Snap-back animation when drag is released off-target |
| `doubleTapWindowMs` | 300 ms | Debounce window for accidental double-taps |
| `snapRadiusPx` | 28 px | Magnetic snap range (K–2 fine motor requirement) |
| `fingerRestTolerancePx` | 4 px | Ignore tremor movements smaller than this |

## Per-Archetype Gesture Map

Each of the 10 activity archetypes uses one primary gesture. Deviations are noted in the "Notes" column and documented inline in code.

| Archetype | Primary Gesture | Cancel Path | Snap Behaviour | Notes |
|---|---|---|---|---|
| `partition` | drag-divide | release outside snap radius → snap to nearest line | magnetic to halves/thirds/fourths grid | K–2 fine motor: snap radius ≥ 28 px |
| `identify` | tap | tap outside any choice → no-op (not "wrong") | n/a | No penalty for exploration |
| `label` | drag-to-target or tap-then-tap | release outside drop zones → bounce back | per-zone snap | Tap path required for screen-reader users |
| `make` | drag-to-build | tap on placed piece to remove (no error) | grid snap | |
| `compare` | tap-tap (two choices) | tap third choice → replaces selection, not error | n/a | Selection is a state, not an error |
| `snap_match` | drag-and-drop | release in empty space → bounce back | strong snap to matched pair | |
| `benchmark` | drag-on-line | release → snap to nearest sixteenth | tick snap | |
| `placement` | drag-to-region | release outside any region → bounce back | region-edge snap | |
| `order` | drag-to-reorder | release outside grid → bounce to original | slot snap | |
| `equal_or_not` | tap (binary) | tap other choice → swap, not error | n/a | State-based, not penalty-based |
| `explain_your_order` | tap (multi-select) | unselect by re-tap | n/a | |

## Gesture Definitions

### Tap

A pointer press and release within `tapMaxDurationMs` (250 ms) and `tapCancelRadiusPx` (8 px) of the initial press location.

**Characteristics:**
- Duration: ≤ 250 ms
- Drift tolerance: 8 px
- Debounce: ignore second tap within 300 ms (double-tap prevention)

**Use cases:**
- `identify`, `compare`, `equal_or_not`, `explain_your_order` archetypes
- Button presses in MenuScene, SettingsScene, overlays

### Long-Press

A pointer held down for ≥ `longPressMs` (500 ms). Escalates from a tap if the duration is exceeded.

**Characteristics:**
- Duration: ≥ 500 ms
- Signals: visual state, haptic feedback (if available)

**Use cases:**
- Context menu triggers (not currently used; reserved for future)

### Drag

A pointer movement > `dragEngageThresholdPx` (6 px) before officially engaging the drag. Once engaged, motion is tracked until release.

**Characteristics:**
- Engage threshold: 6 px
- Snap range: 28 px (or archetype-specific)
- Cancel revert time: 200 ms

**Release behaviors:**
- **On-target:** snap to target (with spring easing), increment attempt counter, fire correct/incorrect feedback
- **Off-target:** bounce back to origin (no error, no penalty)

**Use cases:**
- `partition`, `label`, `make`, `snap_match`, `benchmark`, `placement`, `order` archetypes

### Snap

Automatic alignment of a dragged object to a target within `snapRadiusPx` (28 px).

**Characteristics:**
- Snap distance: 28 px
- Animation: 200 ms revert, spring easing on success

**Snap targets vary by archetype:**
- `partition`: halves/thirds/fourths grid lines
- `label`: drop zones
- `make`: grid slots
- `snap_match`: pair locations
- `benchmark`: sixteenth marks
- `placement`: region edges
- `order`: slot positions

## Deviation Log

Deviations from this grammar require a one-line code comment with justification. None currently documented.

## Testing

- Unit tests: `src/scenes/utils/interaction.test.ts`
- Integration tests: Playwright `ipad-touch-drag.spec.ts` (real tablet hardware)
- Gesture baseline: `tests/e2e/gesture-baselines.spec.ts` (Playwright snapshot regression)

## See Also

- [Motion Tokens](./motion-tokens.md)
- [Visual State Language](./state-language.md)
- [Activity Archetypes](./activity-archetypes.md)
