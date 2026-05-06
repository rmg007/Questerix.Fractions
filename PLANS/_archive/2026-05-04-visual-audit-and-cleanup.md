# Plan: Comprehensive Visual Audit, Screenshot Inventory & Asset Cleanup

**Date:** 2026-05-04
**Branch (when started):** `audit/2026-05-04-visual-audit`
**Status:** COMPLETED 2026-05-06 — asset audit script + perf baseline + curriculum sync merged
**Part of:** [2026-05-04-roadmap.md](2026-05-04-roadmap.md) — Phase 2 (Touch + perf + reliability). Phase 0 (asset cleanup) runs anytime; Phases 1–2 (capture baselines) run after plans 1, 2, 4 land so baselines reflect the corrected UI. The state-language baseline from [2026-05-04-interaction-and-motion-system.md](2026-05-04-interaction-and-motion-system.md) (idle / hover / pressed / focused / disabled / error per component) is captured as part of this plan's Phase 2.

## Dependencies & blockers

| Plan | Relationship | Why |
|---|---|---|
| [interaction-and-motion-system](2026-05-04-interaction-and-motion-system.md) | Coordinates | This plan's Phase 2 captures the state-language baseline (idle / hover / pressed / focused / disabled / error) defined there. |
| [button-hit-regions](2026-05-04-button-hit-regions.md) | Soft prerequisite | Capture baselines after its Phase 4 lands so they reflect corrected hit areas + press feedback. |
| [touchscreen-a11y-audit](2026-05-04-touchscreen-a11y-audit.md) | Soft prerequisite | Capture baselines after its Phase 3 lands so font-size remediation is in. |
| [performance-and-drag-latency](2026-05-04-performance-and-drag-latency.md) | Soft prerequisite | Capture baselines after its Phase 3 (drag tuning) so any visual differences from rendering changes are absorbed. |
| [content-archetype-expansion](2026-05-04-content-archetype-expansion.md) | Coordinates | If content regen lands first, baselines reflect new questions; if baselines land first, plan 13's PR will need `--update-snapshots`. |

## Problem

The app has multiple scenes and screens (MenuScene, LevelMapScene, 9 levels, SettingsScene, OnboardingScene, SessionCompleteOverlay, etc.) that have never been systematically audited for visual consistency, usability, or design quality. Additionally:

- No automated visual-regression baseline exists in CI
- Asset filenames in `public/` may be unclear or include orphaned/unused images
- Visual regressions are hard to detect without baseline assertions
- Design inconsistencies across scenes go unnoticed

## C10 framing

C10 says every change must serve **validation**, not polish. A static PNG archive in `.claude/screenshots/` is an artifact, not a gate — it does nothing in CI. Reframe the deliverable: **Playwright `toHaveScreenshot()` baselines that assert pixel-diff regression in CI**. That turns this work from "polish" into a regression-prevention mechanism, which validates that changes don't break what already works. The asset cleanup (Phase 0) is independent and unambiguously aligned with C10 (smaller bundle, clearer code).

## Goals

1. **Create CI-enforced visual baselines** for the critical first-run and learning paths.
2. **Use descriptive naming:** `<scene>-<state>-<variant>-<viewport>.png` (e.g., `MenuScene-default-mobile-360.png`).
3. **Audit baseline screenshots** for WCAG AA evidence, touch usability, readability, visual consistency, and layout integrity.
4. **Identify improvements:** font sizes, button spacing, colors, alignment, component hierarchy.
5. **Clean up assets:** remove unused images from `public/` and document what remains.
6. **Keep one screenshot source of truth:** Playwright `toHaveScreenshot()` baselines checked into `tests/e2e/**`; do not maintain a parallel `.claude/screenshots/` archive.

## Non-goals

- Capturing every possible tier/state/viewport permutation in the first pass. Start with the 360 px critical path; expand only where layouts diverge or regressions have occurred.
- Redesigning layouts (defer unless critical).
- Changing game mechanics or content.
- Maintaining manually curated screenshot folders outside Playwright snapshots.

## Execution order

1. Phase 0 can run independently before any UI work.
2. Phase 1 defines the snapshot strategy and tolerance policy.
3. Phase 2 adds a small, stable first baseline set at 360 px.
4. Phase 3 audits that evidence and produces prioritized findings.
5. Phase 4 converts findings into implementation-ready tickets; Phase 5 only fixes critical/high items that serve validation.
6. Phase 6 documents how future PRs update snapshots.
7. Phase 7 closes docs and learnings.

## Definition of done

- `scripts/audit-unused-assets.ts`, `audit/unused-assets.json`, and `public/ASSETS.md` exist and agree.
- Visual baseline specs are deterministic locally and in CI, with animation/time/randomness stabilized.
- Snapshot names follow the convention and live only in Playwright's snapshot output tree.
- Audit findings link to source files and classify each issue as critical, high, medium, low, or deferred.

## Phases

### Phase 0 — Asset cleanup (gate: orphaned assets removed, manifest committed)

Run this **first** — it's independent, low-risk, and shows immediate value (smaller bundle, clearer `public/`) before the larger screenshot effort begins.

1. **Build the audit toolchain BEFORE anything is deleted.** Manual grep across a hundred files will miss dynamic references (template strings, computed paths, pipeline-generated names) and produce an incomplete cleanup. Add `scripts/audit-unused-assets.ts` that:
   - Walks `public/` and produces the canonical asset list (relative paths + filenames).
   - Walks `src/**/*.{ts,tsx,json}` and `pipeline/**/*.{py,json}` collecting every literal string that contains an asset filename or extension (`.png`, `.svg`, `.webp`, `.mp3`, `.json`, `.woff2`, etc.) — both bare filenames and full paths.
   - **Walks the curriculum bundle output** (`public/curriculum/v1.json`, `public/curriculum/level-*.json`, `pipeline/output/level_*/all.json`) and resolves every asset reference inside, including paths assembled from token strings such as `${level}-${variant}.png` — recompose by enumerating known level + variant + archetype values, plus any asset key field present in the schema. Pipeline-generated paths are the most common false-orphan source today.
   - Cross-references and emits `audit/unused-assets.json` listing: definitely-unreferenced, dynamically-constructed (suspicious — needs human review), and confirmed-used.
   - Exits non-zero if "definitely-unreferenced" is non-empty when run with `--ci`.
2. Run the script; commit `audit/unused-assets.json` for review.
3. After human review of the dynamic / suspicious bucket, delete the confirmed-orphan files in a single PR.
4. Add `public/ASSETS.md` listing every remaining asset with its purpose, generated by the same script (so it cannot drift).
5. Verify `npm run build` and `npm run test:e2e` still pass (no missing-asset 404s).
6. Add the script to CI as an advisory check so future drift is caught on PR.

Classification rules:
- `confirmed-used`: literal reference found, loaded by Phaser preload, referenced by generated curriculum, or documented in `public/ASSETS.md`.
- `dynamic-review`: filename/path appears to be constructed from tokens, referenced by curriculum generation, or loaded by convention. Human review required; never auto-delete.
- `definitely-unreferenced`: asset filename has no literal or dynamic reference and no documented external purpose.
- Initial CI mode should warn on `dynamic-review` and fail only on `definitely-unreferenced` after the first cleanup PR establishes the manifest.

### Phase 1 — Screenshot baseline strategy (gate: spec + naming committed, Playwright config updated)

**Mechanism:** use Playwright's built-in `await expect(page).toHaveScreenshot('<name>.png', { maxDiffPixels: N })`. Baselines live next to specs in Playwright's default `<spec>.spec.ts-snapshots/` directory, are checked into git, and produce real CI diffs on regression — not a static archive.

**Initial scope: 360 px viewport only.** This is the hardest case (per C7) and where regressions hurt most. 360 × ~30 baseline screens is maintainable; 1024 × 200 is not. Add 768 / 1024 viewports later, scene-by-scene, only where the layout actually diverges.

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

**Snapshot-name vs. Playwright reality.** Playwright's default `snapshotPathTemplate` appends `-{projectName}-{platform}{ext}` automatically — so a baseline registered as `MenuScene-default-mobile-360.png` lands on disk as `MenuScene-default-mobile-360-chromium-win32.png`. Two options:

1. **Accept the suffix.** Document that the on-disk file gets `-<project>-<platform>` appended and is the same file referenced in `expect(page).toHaveScreenshot('MenuScene-default-mobile-360.png', ...)`. The test author writes the short name; the file system stores the long one.
2. **Override `snapshotPathTemplate` in `playwright.config.ts`** to drop the project + platform suffix when the project is `chromium-mobile-360` (since the project name already encodes the variant). Risk: if we later add a WebKit project per [2026-05-04-cross-browser-and-device-matrix.md](2026-05-04-cross-browser-and-device-matrix.md), platform-disambiguation matters again.

Recommendation: take option 1 (default Playwright behavior). The cross-browser plan adds WebKit which makes platform suffixes load-bearing, and overriding the template now will need to be reverted later.

**Storage:** Playwright snapshot directories under `tests/e2e/**`. Do not copy snapshots to `.claude/screenshots/`; duplicate image stores drift.

**Checklist of all screens to capture:**
- [ ] MenuScene (default state)
- [ ] LevelMapScene (default, showing unlocked levels)
- [ ] Level01–Level09 (each at easy, medium, hard; initial + hints + feedback)
- [ ] SettingsScene (default + reduced-motion toggle + high-contrast toggle)
- [ ] OnboardingScene (default + after "Skip tutorial")
- [ ] SessionCompleteOverlay (with different accuracy scores)
- [ ] FeedbackOverlay (correct flash, incorrect flash)

**Initial baseline (this plan):** 360 px only, 1 tier per level (easy), default + key feedback states ≈ **25–30 screenshots**.

**Future expansion (separate plan, gated on baseline being maintained):** 768 px and 1024 px viewports for scenes whose layout actually changes responsively, plus medium/hard tier captures. The 150–200 number is a long-term ceiling, not a Phase-1 target.

### Phase 2 — Capture all screenshots (gate: inventory complete, all images committed)

Using Playwright:

1. **For each scene:**
   - Load the scene at 360 px viewport
   - Interact to reach initial state (skip tutorial if applicable)
   - Capture screenshot with descriptive filename
   - Advance through hint tiers (if applicable) and capture each
   - Trigger correct feedback, capture
   - Trigger incorrect feedback, capture
   - Add 768 px / 1024 px captures only for scenes whose layout changes materially or has known responsive risk

2. **For interactions (levels):**
   - Each level's default question at easy tier (mobile-360)
   - Easy question with Tier 1 hint visible
   - Easy question with Tier 2 hint visible
   - Easy question with Tier 3 hint visible
   - Easy question with correct feedback
   - Easy question with incorrect feedback
   - Sample medium/hard only when the generated layout or content shape differs enough to create a distinct visual risk

3. **For settings:**
   - Default SettingsScene
   - With reduced-motion enabled
   - With high-contrast enabled
   - With both toggles on

4. **Playwright spec template (regression-asserting, not archival):**
   ```ts
   test('MenuScene matches baseline at 360 px', async ({ page }) => {
     await page.setViewportSize({ width: 360, height: 812 });
     await page.goto('http://localhost:5000');
     await waitForAnimationsToSettle(page); // see §6 stabilization
     await expect(page).toHaveScreenshot('MenuScene-default-mobile-360.png', {
       maxDiffPixels: 0, // start strict
     });
   });
   ```

5. **`maxDiffPixels` policy.** Start at **0** for genuinely deterministic scenes (MenuScene with no idle animation, SettingsScene). Raise only after **two consecutive clean local runs** with the proposed value prove the baseline is stable; document the chosen value and the reason next to the spec ("100 px allowance for sub-pixel font hinting on Mascot speech bubble"). The `100` value used in earlier drafts was a placeholder, not a recommendation. Treat any baseline with `maxDiffPixels > 0` as a known-flaky candidate; if the value creeps up over time, the spec is unstable, not the system.

6. **Output:** Baselines live in `tests/e2e/<spec>.spec.ts-snapshots/` (Playwright default), checked into git. CI fails on unreviewed visual regressions. **Do not** also dump copies into `.claude/screenshots/` — single source of truth. **The update process described in Phase 6 is mandatory reading before committing any baseline; refer to it now.**

7. **Stabilization requirements:**
   - Force reduced motion or explicitly wait for animations to settle before screenshots — never capture a frame mid-tween. A blurry / mid-animated baseline in CI is a symptom of non-deterministic timing, which itself degrades real user UX (see Phase 3 §7 below).
   - Seed curriculum/question selection where possible so the same prompt appears every run.
   - Disable caret blinking, transient timers, and non-deterministic particles during visual specs.
   - `waitForAnimationsToSettle(page)` helper: polls for `scene.tweens.getAllTweens().length === 0` plus one paint frame; fail-fast if not settled within 2 s (likely an unguarded idle-loop tween).

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

7. **Animation-state consistency (no mid-tween captures):**
   - Every screenshot must show a stable end-of-tween state. Inspect every committed baseline for blurry edges, half-faded overlays, or mid-shake offsets — these are symptoms of capture before `waitForAnimationsToSettle` ran.
   - If you find any, treat it as a regression: the underlying animation is non-deterministic in timing (a real UX smell, not just a flaky screenshot). File against [2026-05-04-interaction-and-motion-system.md](2026-05-04-interaction-and-motion-system.md) for tween-token review.

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

### Phase 4 — Improvement recommendations (gate: prioritized action list)

Based on audit findings, prioritize improvements:

**Critical (Phase 5+):**
- Fix any contrast failures
- Fix any unclickable elements (<44×44)
- Fix any overflow at 360 px

**High (Phase 5+):**
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

Create `docs/30-architecture/visual-audit-findings.md` with prioritized list and line-number references to source files needing changes. Keep findings in docs, not beside generated image assets.

### Phase 5 — Implementation (gate: all critical + high fixes committed)

Implement improvements identified in Phase 4, coordinating with:
- **`2026-05-04-button-hit-regions.md`** — ensure button fixes align
- **`2026-05-04-touchscreen-a11y-audit.md`** — ensure font/spacing fixes align

Update screenshots after each major change to track visual progress.

### Phase 6 — Document the regression workflow + baseline-update process (gate: docs committed, owner assigned)

Baselines themselves come from Phase 2 (`toHaveScreenshot` writes them on first run). This phase documents how to *use* and *update* them, **and assigns an explicit owner for the update process** — without that, golden screenshots become a maintenance burden teams skip, and a stale-but-green baseline gives false confidence (worse than no baseline at all).

1. Add `docs/30-architecture/visual-regression.md` covering:
   - **Running locally:** `npm run test:e2e -- --grep visual` (define this script).
   - **Reviewing a diff in CI:** Playwright's HTML report shows expected/actual/diff side-by-side; reviewer attaches the diff PNG to the PR.
   - **Accepting an intentional visual change:** the author runs `npx playwright test --update-snapshots` locally, commits the regenerated PNGs **in the same PR as the source change** (never in a follow-up "snapshot bump" PR — that pattern decouples diff from cause and the review value collapses).
   - **The update-the-baseline rule of thumb:** if the diff looks correct to a human reviewer (intentional design change), update; if it looks wrong, treat as a regression. CI cannot make this judgment for you — that is the whole point of the human review step.
   - **Cap on stale-baseline rot:** any baseline >90 days old without a re-review must be regenerated and re-reviewed; add a CI advisory check that flags this.
2. Note in `CLAUDE.md`: any visual change requires running `--update-snapshots` and committing the updated baseline alongside the source change in the **same** PR.
3. **Owner:** the author of the change owns the baseline update for that PR; `code-review` agent enforces that any diff touching scenes/components has a corresponding `*.spec.ts-snapshots/*.png` change or an explicit "no visual change" claim from the author.
4. No image-diff library needed — Playwright ships pixel comparison built-in.

### Phase 7 — Phase-close docs (gate: PR merged)

- Append to `.claude/learnings.md`: "Visual audit screenshots only prevent regressions when they are Playwright `toHaveScreenshot()` baselines in CI. Naming convention: `<scene>-<state>-<variant>-<viewport>.png`. Update snapshots in the same PR as intentional visual changes."
- Update `CLAUDE.md` or create `docs/30-architecture/visual-audit-process.md` with snapshot strategy and improvement priorities.
- Run `npm run sync:claude-md` if any agent/command frontmatter changed.

## Risk / rollback

- **Risk:** Capturing too many screenshots makes reviews noisy and baselines stale. Mitigate by starting with the 360 px critical path and adding only risk-driven coverage.
- **Risk:** Large image files can bloat the repo. Mitigate by keeping the first baseline small, reviewing PNG sizes, and avoiding duplicate screenshot archives.
- **Risk:** Flaky snapshots create false alarms. Mitigate by stabilizing animation, randomness, viewport, and font loading before committing baselines.
- **Rollback:** Snapshot-only phases can be reverted without functional impact. Phase 5 source fixes should be separate enough to revert independently if E2E or screenshots regress.

## Out-of-scope follow-ups

- Dark mode screenshots (defer unless dark mode is implemented).
- Localization screenshots (Spanish, etc. — defer unless i18n is active).
- Performance profiling by screenshot (separate audit).

## Integration with related plans

- **`2026-05-04-button-hit-regions.md`:** Critical findings from this audit can feed its verified-target inventory, but input geometry fixes should still land there first.
- **`2026-05-04-touchscreen-a11y-audit.md`:** This audit provides visual evidence; that plan owns measured touch/readability compliance and remediation.
- **`2026-05-04-worked-example-flow.md`:** If implemented before this audit, include the "Show me how" button in the first-run visual baseline once the state is deterministic.

---

## Storage & naming (quick reference)

```
tests/e2e/
├── visual-baseline.spec.ts
├── visual-baseline.spec.ts-snapshots/
│   ├── MenuScene-default-mobile-360-chromium-win32.png
│   ├── Level01-default-easy-mobile-360-chromium-win32.png
│   ├── Level01-with-hint-tier1-easy-mobile-360-chromium-win32.png
│   ├── Level01-correct-feedback-easy-mobile-360-chromium-win32.png
│   ├── SettingsScene-default-mobile-360-chromium-win32.png
│   └── ...
└── helpers/

docs/30-architecture/
├── visual-audit-findings.md
└── visual-regression.md
```
