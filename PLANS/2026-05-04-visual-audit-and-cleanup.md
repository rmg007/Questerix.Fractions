# Plan: Comprehensive Visual Audit, Screenshot Inventory & Asset Cleanup

**Date:** 2026-05-04
**Branch (when started):** `audit/2026-05-04-visual-audit`
**Status:** Draft — not yet implemented

## Problem

The app has multiple scenes and screens (MenuScene, LevelMapScene, 9 levels, SettingsScene, OnboardingScene, SessionCompleteOverlay, etc.) that have never been systematically audited for visual consistency, usability, or design quality. Additionally:

- No screenshot inventory exists for reference, testing, or regression detection
- Asset filenames in `public/` may be unclear or include orphaned/unused images
- Visual regressions are hard to detect without baseline screenshots
- Design inconsistencies across scenes go unnoticed

## Goals

1. **Screenshot every screen** in the game (all scenes, all difficulty tiers, all states)
2. **Use descriptive naming:** `<scene>-<state>-<variant>.png` (e.g., `MenuScene-default.png`, `Level01-easy-correct-feedback.png`)
3. **Audit each screenshot** for: WCAG AA compliance, touch usability, readability, visual consistency, layout integrity
4. **Identify improvements:** font sizes, button spacing, colors, alignment, component hierarchy
5. **Clean up assets:** remove unused images from `public/` and document what remains
6. **Create baseline:** store screenshots in `.claude/screenshots/` for future regression testing

## Non-goals

- Implementing visual improvements (Phase 2+).
- Redesigning layouts (defer unless critical).
- Changing game mechanics or content.

## Phases

### Phase 1 — Screenshot inventory & naming convention (gate: naming spec committed)

Define a descriptive naming convention:

```
<scene>-<state>-<variant>-<viewport>.png

<scene>:
  - MenuScene
  - LevelMapScene
  - Level01 through Level09
  - SettingsScene
  - OnboardingScene
  - SessionCompleteOverlay
  - FeedbackOverlay (if standalone testable)

<state>:
  - default / initial
  - with-hint-tier1 / with-hint-tier2 / with-hint-tier3
  - correct-feedback
  - incorrect-feedback
  - loading (if any)
  - error (if any)

<variant>:
  - easy / medium / hard (if tier-dependent)
  - reduced-motion / normal (if motion-dependent)
  - high-contrast / default (if theme-dependent)
  - english / spanish (if i18n variant)
  - (omit if not applicable)

<viewport>:
  - mobile-360 (narrow, iPhone SE)
  - tablet-768 (portrait)
  - desktop-1024 (landscape / desktop)
```

**Examples:**
- `MenuScene-default-mobile-360.png`
- `Level01-default-easy-mobile-360.png`
- `Level01-incorrect-feedback-easy-mobile-360.png`
- `SettingsScene-default-mobile-360.png`
- `OnboardingScene-default-mobile-360.png`
- `SessionCompleteOverlay-default-mobile-360.png`

**Storage:** `.claude/screenshots/<scene>/` subdirectories for organization.

**Checklist of all screens to capture:**
- [ ] MenuScene (default state)
- [ ] LevelMapScene (default, showing unlocked levels)
- [ ] Level01–Level09 (each at easy, medium, hard; initial + hints + feedback)
- [ ] SettingsScene (default + reduced-motion toggle + high-contrast toggle)
- [ ] OnboardingScene (default + after "Skip tutorial")
- [ ] SessionCompleteOverlay (with different accuracy scores)
- [ ] FeedbackOverlay (correct flash, incorrect flash)

At minimum: **3 viewports × 7 scenes × 3 tiers = 63 base screenshots**. With hints + feedback states, expect 150–200 total.

### Phase 2 — Capture all screenshots (gate: inventory complete, all images committed)

Using Playwright:

1. **For each scene:**
   - Load the scene at 360 px viewport
   - Interact to reach initial state (skip tutorial if applicable)
   - Capture screenshot with descriptive filename
   - Advance through hint tiers (if applicable) and capture each
   - Trigger correct feedback, capture
   - Trigger incorrect feedback, capture
   - Resize to 768 px, repeat key states
   - Resize to 1024 px, repeat key states

2. **For interactions (levels):**
   - Each level's default question at easy tier (mobile-360)
   - Easy question with Tier 1 hint visible
   - Easy question with Tier 2 hint visible
   - Easy question with Tier 3 hint visible
   - Easy question with correct feedback
   - Easy question with incorrect feedback
   - Repeat for medium and hard tiers (or sample medium/hard if time-limited)

3. **For settings:**
   - Default SettingsScene
   - With reduced-motion enabled
   - With high-contrast enabled
   - With both toggles on

4. **Playwright spec template:**
   ```ts
   describe('Visual Audit: Full Screenshot Inventory', () => {
     it('captures MenuScene in all viewport sizes', async () => {
       await page.setViewportSize({ width: 360, height: 812 });
       await page.goto('http://localhost:5000');
       await page.screenshot({ path: '.claude/screenshots/MenuScene/MenuScene-default-mobile-360.png' });
       
       await page.setViewportSize({ width: 768, height: 1024 });
       await page.screenshot({ path: '.claude/screenshots/MenuScene/MenuScene-default-tablet-768.png' });
     });
   });
   ```

5. **Output:** All screenshots in `.claude/screenshots/<scene>/` with consistent naming.

### Phase 3 — Visual audit of all screenshots (gate: audit report with findings)

For **each screenshot**, audit against:

1. **WCAG AA Compliance:**
   - Text contrast ≥4.5:1 (normal), ≥3:1 (large)
   - Touch targets ≥44×44 px
   - Icons have accessible labels (not testable from screenshot, but note if icon-only buttons are present)

2. **Typography & Readability:**
   - Body text ≥16 px
   - Button labels ≥14 px
   - Line height ≥1.5 (body), ≥1.2 (headings)
   - Font family consistent across scenes

3. **Layout & Spacing:**
   - Margins & padding consistent (multiples of 8 px)
   - No content overflow at 360 px
   - Whitespace proportional (no cramped, no wasteful)
   - Button spacing ≥8 px apart

4. **Visual Consistency:**
   - Color palette matches `levelTheme.ts` / `colors.ts`
   - Component styles (buttons, cards, etc.) uniform across scenes
   - No orphaned / misaligned elements

5. **Responsive Scaling:**
   - 360 px: readable, usable, no overflow
   - 768 px: layout adapts gracefully
   - 1024 px: efficient use of space

6. **Interaction States:**
   - Hint tiers visually distinct (each tier darker / more explicit than prior)
   - Correct feedback visually clear (green highlight, checkmark, or similar)
   - Incorrect feedback visually clear (red highlight, X, or similar)

**Report format:**
```
## Summary
- Overall visual health: PASS / FAIL
- Scenes audited: 7
- Issues found: 23 (10 critical, 8 warning, 5 info)

## By Scene
### MenuScene
- ✓ Spacing consistent (8 px grid)
- ✓ Buttons 50×50 px
- ✓ Title font 28 px
- ⚠ Station button text could be larger (12 px → 14 px)

### Level01
- ✓ Question text 16 px
- ⚠ Hint button 40×40 px (should be 44×44)
- ✗ CRITICAL: Incorrect feedback red (#FF0000) fails contrast on some backgrounds

## By Category
### Critical Issues (block release)
1. Level01: Incorrect feedback contrast fail
2. SettingsScene: "Privacy" link unclickable at 360 px (too small)
3. SessionComplete: Button spacing <8 px on mobile

### Warnings (should fix)
1. MenuScene: Station text could be larger
2. LevelMapScene: Level cards could have more padding
3. OnboardingScene: Body text near minimum

### Info (nice-to-have)
1. Consistent icon sizing (currently mixed 20–24 px)
2. Heading hierarchy could be stronger
3. Card shadows could be more prominent
```

### Phase 4 — Asset cleanup: Remove unused images (gate: asset inventory committed, old files deleted)

1. **Inventory all assets in `public/`:**
   - List every image, icon, sprite, font file
   - Check which ones are referenced in code (`grep -r "public/" src/`)
   - Mark used vs. unused

2. **Delete unused assets:**
   - Remove any orphaned images
   - Rename any unclear filenames to be descriptive (e.g., `icon.png` → `icon-settings.png`)
   - Keep only what's actually loaded

3. **Document asset manifest:**
   - Create `public/ASSETS.md` listing all remaining assets with their purpose
   - Example:
     ```
     ## Sprites
     - `backgrounds/menu-bg.png` — MenuScene background
     - `buttons/btn-start.png` — (deprecated, replaced with Phaser Graphics)
     
     ## Fonts
     - `fonts/OpenSans-Regular.ttf` — body text
     - `fonts/OpenSans-Bold.ttf` — headings
     ```

4. **Verify no regressions:**
   - Run `npm run build` to confirm no missing assets
   - Spot-check a few scenes to ensure images still load

### Phase 5 — Improvement recommendations (gate: prioritized action list)

Based on audit findings, prioritize improvements:

**Critical (Phase 6+):**
- Fix any contrast failures
- Fix any unclickable elements (<44×44)
- Fix any overflow at 360 px

**High (Phase 6+):**
- Increase fonts where flagged (12→14 px, etc.)
- Adjust button/card spacing to 8 px grid
- Ensure consistent component styles

**Medium (future):**
- Stronger heading hierarchy
- More prominent card shadows
- Icon sizing standardization

**Low (polish):**
- Whitespace optimization
- Typography refinement

Create a `.claude/screenshots/AUDIT_FINDINGS.md` with prioritized list and line-number references to source files needing changes.

### Phase 6 — Implementation (gate: all critical + high fixes committed)

Implement improvements identified in Phase 5, coordinating with:
- **plan-button-hit-regions.md** — ensure button fixes align
- **plan-touchscreen-a11y-audit.md** — ensure font/spacing fixes align

Update screenshots after each major change to track visual progress.

### Phase 7 — Baseline & regression testing (gate: baseline screenshots committed)

1. **Establish baseline:** Tag all screenshots in `.claude/screenshots/` with a `BASELINE-2026-05-04` label or commit message.
2. **Document snapshot strategy:** Add to `docs/30-architecture/` a brief note on how to use screenshots for regression detection.
3. **Playwright regression spec:** Optional—build a spec that compares future screenshots against baseline (requires image-diff library like `pixelmatch`).

### Phase 8 — Phase-close docs (gate: PR merged)

- Append to `.claude/learnings.md`: "Visual audit with descriptive screenshots is key to catching regressions and inconsistencies. Naming convention: `<scene>-<state>-<variant>-<viewport>.png`. Store in `.claude/screenshots/`. Update on every major visual change."
- Update `CLAUDE.md` or create `docs/30-architecture/visual-audit-process.md` with snapshot strategy and improvement priorities.
- Run `npm run sync:claude-md` if any agent/command frontmatter changed.

## Risk / rollback

- **Risk:** Capturing 150–200 screenshots is time-consuming. Mitigate by automating with Playwright and batching viewport sizes.
- **Risk:** Large image files can bloat the repo. Mitigate by storing in `.claude/screenshots/` (gitignored or LFS) and committing only a summary/manifest.
- **Rollback:** Screenshots are non-functional; no code changes in Phase 2, so no rollback needed until Phase 6 (improvements).

## Out-of-scope follow-ups

- Automated visual regression testing (future, after baseline is established).
- Dark mode screenshots (defer unless dark mode is implemented).
- Localization screenshots (Spanish, etc. — defer unless i18n is active).
- Performance profiling by screenshot (separate audit).

## Integration with related plans

- **plan-button-hit-regions.md:** Critical findings from this audit (e.g., unclickable buttons) will drive Phase 2 of that plan.
- **plan-touchscreen-a11y-audit.md:** This audit provides the visual evidence (screenshots) for that plan's touch-target findings.
- **plan-worked-example-flow.md:** If that plan is implemented before this audit, screenshots should capture the "Show me how" button in all states.

---

## Storage & naming (quick reference)

```
.claude/screenshots/
├── MenuScene/
│   ├── MenuScene-default-mobile-360.png
│   ├── MenuScene-default-tablet-768.png
│   └── MenuScene-default-desktop-1024.png
├── Level01/
│   ├── Level01-default-easy-mobile-360.png
│   ├── Level01-with-hint-tier1-easy-mobile-360.png
│   ├── Level01-correct-feedback-easy-mobile-360.png
│   └── ...
├── SettingsScene/
│   ├── SettingsScene-default-mobile-360.png
│   ├── SettingsScene-reduced-motion-mobile-360.png
│   └── ...
├── AUDIT_FINDINGS.md (Phase 5 output)
└── BASELINE-2026-05-04.txt (Phase 7 marker)
```
