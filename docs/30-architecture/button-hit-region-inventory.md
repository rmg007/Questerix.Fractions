# Button Hit-Region Inventory

Generated from Phase 1 audit (2026-05-05). Updated by Phase 2 remediation.

`visualBounds` = rendered size of the visual element.  
`currentHitArea` = actual pointer-event target after any fix.  
`minTarget` = WCAG 2.5.5 success criterion (44×44 CSS px).  
`status` = `ok` (never violated), `fixed` (repaired in Phase 2), `deferred` (out of scope), `partial` (size ok, other issues remain).

| file | line | symbol | visualBounds | currentHitArea | minTarget | status | testCoverage |
|------|------|--------|--------------|----------------|-----------|--------|--------------|
| `src/scenes/MenuScene.ts` | 247–264 | Settings Button | 100×100 | 100×100 Rectangle | 44×44 | ok | `settings-btn` |
| `src/scenes/MenuScene.ts` | 268–287 | Continue Button | 360×90 | 360×90 Rectangle | 44×44 | ok | `continue-btn` |
| `src/scenes/MenuScene.ts` | 290–312 | Play Button | 440×110 | 440×110 Rectangle | 44×44 | ok | `level-card-L1` |
| `src/scenes/MenuScene.ts` | 319 | Choose Level Button (Pill) | 220×48 | 220×48 Rectangle | 44×44 | partial | — (test hook missing) |
| `src/scenes/SettingsScene.ts` | 105–112 | Export Backup Button | 360×60 | 360×60 Rectangle | 44×44 | ok | `settings-export-btn` |
| `src/scenes/SettingsScene.ts` | 115–127 | Restore from Backup Button | 360×60 | 360×60 Rectangle | 44×44 | ok | `settings-restore-btn` |
| `src/scenes/SettingsScene.ts` | 130–140 | Reset Device Button | 360×60 | 360×60 Rectangle | 44×44 | ok | `settings-reset-btn` |
| `src/scenes/SettingsScene.ts` | 144–157 | Check for App Update Button | 360×60 | 360×60 Rectangle | 44×44 | ok | `settings-update-btn` |
| `src/scenes/SettingsScene.ts` | 164–181 | Refresh Curriculum Button | 360×60 | 360×60 Rectangle | 44×44 | ok | `settings-refresh-curriculum-btn` |
| `src/scenes/SettingsScene.ts` | 193 | Back Button | 360×60 | 360×60 Rectangle | 44×44 | ok | `settings-back-btn` |
| `src/scenes/SettingsScene.ts` | 287–318 | Privacy Notice Link | ~180×16 (text) | 220×44 Zone (Phase 2 fix) | 44×44 | fixed | — |
| `src/scenes/LevelMapScene.ts` | 173 | Back to Menu Button | unknown | unknown | 44×44 | deferred | `a11y-back-menu` (A11yLayer) |
| `src/components/LevelCard.ts` | 1–300+ | Level Cards L1–L9 | 220×160 (scaled 0.65×→143×104) | 220×160 Container | 44×44 | ok | `level-card-L{N}` |
| `src/components/SessionCompleteOverlay.ts` | 157–167 | Next Level Button | 300×64 | 300×64 Rectangle | 44×44 | partial | `next-level-btn` |
| `src/components/SessionCompleteOverlay.ts` | 169–177 | Play Again Button | 300×64 | 300×64 Rectangle | 44×44 | partial | — (test hook missing) |
| `src/components/SessionCompleteOverlay.ts` | 178–219 | Back to Menu Button | 300×54 | 300×54 Rectangle | 44×44 | partial | `session-complete-menu` |
| `src/components/sessionComplete/scaffoldBanner.ts` | — | Scaffold Banner Buttons | unknown | unknown | 44×44 | deferred | — |
| `src/lib/levelSceneChrome.ts` | 226 | Submit Answer Button (Check) | 320×64 | 320×64 Rectangle | 44×44 | ok | — |
| `src/lib/levelSceneChrome.ts` | 207 | Hint Button | 160×60 | 160×60 Rectangle | 44×44 | ok | — |
| `src/scenes/OnboardingScene.ts` | 182–229 | Skip Tutorial Link | ~180×20 (text) | 200×44 Zone (Phase 2 fix) | 44×44 | fixed | `onboarding-skip-btn` |
| `src/scenes/interactions/BenchmarkInteraction.ts` | 102–105 | Benchmark Zone Buttons | varies | ×64 Rectangle per zone | 44×44 | ok | — |
| `src/scenes/interactions/CompareInteraction.ts` | 157–160 | Relation Buttons (<, =, >) | 180×56 | 180×56 Rectangle | 44×44 | ok | `compare-lt-btn`, `compare-eq-btn`, `compare-gt-btn` |
| `src/scenes/interactions/EqualOrNotInteraction.ts` | 69–72 | Equal/Not-Equal Buttons | btnW×88 | btnW×88 Rectangle | 44×44 | ok | `equal-btn`, `not-equal-btn` |
| `src/scenes/interactions/ExplainYourOrderInteraction.ts` | 116–123 | Drag Handles (ordering) | cardW×(cardH+8) | Math.max(cardW,44)×Math.max(cardH+8,44) | 44×44 | ok | — |
| `src/scenes/interactions/ExplainYourOrderInteraction.ts` | 178–181 | Check Order Button | 220×56 | 220×56 Rectangle | 44×44 | ok | `order-check` |
| `src/scenes/interactions/ExplainYourOrderInteraction.ts` | 251–254 | Rule Option Buttons | (width-100)×60 | (width-100)×60 Rectangle | 44×44 | ok | `rule-option-{key}` |
| `src/scenes/interactions/ExplainYourOrderInteraction.ts` | 292–295 | Submit Reasoning Button | 220×56 | 220×56 Rectangle | 44×44 | ok | `explain-submit` |
| `src/scenes/interactions/IdentifyInteraction.ts` | 128–131 | Option Card Hit Zones | cardW×160 | cardW×160 Rectangle | 44×44 | ok | — |
| `src/scenes/interactions/LabelInteraction.ts` | 94–97 | Label Drag Tiles | 120×48 | 120×48 Rectangle | 44×44 | ok | `label-tile-{i}` |
| `src/scenes/interactions/LabelInteraction.ts` | 177–180 | Submit Button | 240×52 | 240×52 Rectangle | 44×44 | ok | `label-submit` |
| `src/scenes/interactions/MakeInteraction.ts` | 108 | Left/Right Region Hit Zones | dynamic | SHAPE_H (≥44 in practice) | 44×44 | ok | — |
| `src/scenes/interactions/MakeInteraction.ts` | 153–154 | Submit Button | 240×52 | 240×52 Rectangle | 44×44 | ok | — |
| `src/scenes/interactions/OrderInteraction.ts` | 120–127 | Drag Handle (order cards) | cardW×(cardH+8) | Math.max(cardW,44)×Math.max(cardH+8,44) | 44×44 | ok | — |
| `src/scenes/interactions/OrderInteraction.ts` | 180–183 | Submit Button | 200×52 | 200×52 Rectangle | 44×44 | ok | — |
| `src/scenes/interactions/SnapMatchInteraction.ts` | 111–112 | Drag Tiles | varies | draggable Rectangle | 44×44 | ok | — |
| `src/scenes/interactions/SnapMatchInteraction.ts` | 175–176 | Submit Button | 200×52 | 200×52 Rectangle | 44×44 | ok | — |

## Notes

### Fixed in Phase 2

- **Privacy Notice Link** (`SettingsScene.ts`): Text had ~16px line-height → only ~24px hit height. Replaced with a transparent 220×44 Zone as the interactive target. Press feedback via `applyState('pressed')` + double-tap debounce via `Gesture.doubleTapWindowMs`.
- **Skip Tutorial Link** (`OnboardingScene.ts`): Text had ~20px line-height; even with `padding: {x:12, y:12}` the Phaser Text hit-area does not expand to the padding rect in all devices. Replaced with a transparent 200×44 Zone. Press feedback and debounce applied.

### Deferred

- **Back to Menu Button** (`LevelMapScene.ts` line 173): `_drawBackButton` implementation was not read during Phase 1 audit; size unknown. Requires a follow-up read + potential fix.
- **Scaffold Banner Buttons** (`sessionComplete/scaffoldBanner.ts`): Not audited during Phase 1; unknown hit-area size. Requires separate audit pass.

### Partial (size OK, other issues)

- **Choose Level Pill**, **SessionComplete buttons**: All meet the 44×44 minimum but lack hover/pressed visual feedback and focus rings — these are Phase 5 concerns (visual state migration).
