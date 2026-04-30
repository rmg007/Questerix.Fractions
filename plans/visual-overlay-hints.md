# Visual Overlay Hints Implementation Plan

## Overview
Implement optional visual hint overlays for 7 interaction archetypes. Hints appear when user taps the hint button and auto-fade after 3 seconds. Overlays use existing BarModel and NumberLine utilities to highlight key visual elements.

## Architecture
- **Trigger**: LevelScene.showHintForTier() dispatches to activeInteraction?.showHint(tier) when tier === 'visual_overlay'
- **Interface**: Add optional `showHint?(tier: HintTier): void` to Interaction interface
- **Storage**: Each interaction stores Phaser.Scene in mount() for access to add/tweens/time
- **Cleanup**: Overlays auto-destroy after 3s fade, or on scene shutdown

## Implementation Strategy

### Phase 1: Interface & Dispatch (1 file, ~10 lines)
**File**: `src/scenes/interactions/types.ts`
- Add optional method to Interaction interface: `showHint?(tier: HintTier): void;`
- Add dispatch in LevelScene.showHintForTier() (~5 lines):
  ```typescript
  if (tier === 'visual_overlay' && this.activeInteraction?.showHint) {
    this.activeInteraction.showHint(tier);
  }
  ```

### Phase 2: Scene Field Setup (7 files, ~3 lines each)
Add to each interaction's mount() method:
```typescript
this.scene = scene;
```
Files:
- CompareInteraction
- EqualOrNotInteraction
- OrderInteraction
- BenchmarkInteraction
- LabelInteraction
- MakeInteraction
- SnapMatchInteraction

### Phase 3: showHint() Implementation (7 files, ~25-40 lines each)

#### Batch 1: Bar Model Archetypes (4 files)

**1. CompareInteraction** (two bar models side-by-side)
- Overlay: Draw semi-transparent rectangles over both bar models with 2px dashed white outline
- Position: Aligned to model bounds, includes label area
- Duration: 3s fade

**2. EqualOrNotInteraction** (equal/not-equal check)
- Overlay: Highlight both comparison rectangles
- Visual: Dashed white outline, 0.7 opacity
- Message: "Compare the parts" label

**3. MakeInteraction** (drag-to-build target bar)
- Overlay: Highlight the target bar with highlight
- Position: Cover full target bar including label
- Visual: Golden glow on transparent overlay

**4. LabelInteraction** (parsed bar model with labels)
- Overlay: Draw colored rectangles over each parsed segment
- Each segment: Subtle color box matching segment theme
- Duration: 3s with smooth fade

#### Batch 2: NumberLine Archetypes (2 files)

**5. OrderInteraction** (NumberLine with multiple marks)
- Overlay: Draw hollow circles around each mark location
- Circles: 40px diameter, white 2px stroke, slight transparency
- Position: Centered on each mark
- Duration: 3s

**6. BenchmarkInteraction** (NumberLine with single benchmark)
- Overlay: Highlight the benchmark mark and its label
- Visual: Draw rectangle outline + label highlight
- Position: Aligned to mark and label bounds
- Duration: 3s fade

#### Batch 3: Pair Matching Archetype (1 file)

**7. SnapMatchInteraction** (color rings on pairs)
- Overlay: Highlight the first expected pair visually
- Visual: Draw semi-transparent colored rings + connecting line
- Position: Centered on pair locations
- Duration: 3s fade

## Implementation Details

### Common Pattern (all 7)
```typescript
private scene: Phaser.Scene | null = null;

showHint(tier: HintTier): void {
  if (!this.scene || tier !== 'visual_overlay') return;
  
  try {
    // Create overlay container/graphics at specific positions
    const overlay = this.scene.add.graphics();
    // ... draw hint geometry ...
    
    // Auto-fade and destroy after 3 seconds
    this.scene.tweens.add({
      targets: overlay,
      alpha: { from: 0.7, to: 0 },
      duration: 300,
      delay: 2700,
      onComplete: () => overlay.destroy(),
    });
  } catch (err) {
    console.warn('Failed to show hint:', err);
  }
}
```

### Defensive Coding
- Null-check this.scene (set during mount)
- Check tier === 'visual_overlay'
- Wrap in try/catch
- Optional interface (no guarantee showHint exists)
- Overlays self-destruct on scene shutdown

## Testing Strategy

### Unit Tests
- 363 existing tests must remain passing
- No new unit tests required (overlays are visual-only)

### Manual Verification
1. **Appearance**: Verify overlay appears at correct position
2. **Fade behavior**: Confirm 3-second fade duration
3. **Multiple hints**: Tap hint button repeatedly; overlays should queue/replace
4. **Scene cleanup**: Verify overlays destroy on scene shutdown
5. **Accessibility**: Ensure hint button remains keyboard-accessible

## Rollout Plan

1. **Batch 1** (4 files): CompareInteraction, EqualOrNotInteraction, MakeInteraction, LabelInteraction
2. **Batch 2** (2 files): OrderInteraction, BenchmarkInteraction
3. **Batch 3** (1 file): SnapMatchInteraction

Each batch is independently testable; later batches don't depend on earlier ones.

## Success Criteria

- [ ] All 7 archetypes implement showHint() method
- [ ] 363 existing tests pass
- [ ] Overlays appear at correct positions
- [ ] Overlays fade and destroy after 3 seconds
- [ ] Manual verification of all 7 interaction types
- [ ] No memory leaks (overlays cleanup on shutdown)
