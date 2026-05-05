# A11y Announcement Order Audit

**Date:** 2026-05-05  
**Scope:** Phase 1 of the Screen-Reader, Keyboard & Cognitive A11y Parity plan.  
**Method:** Walk every scene file and list the order in which `A11yLayer.mountAction()` is called, then compare against visual order at 360 px viewport (top → bottom, left → right).

---

## MenuScene (`src/scenes/MenuScene.ts`)

Visual layout at 360 px: title (y=140) → tagline (y=270) → **Settings gear** (y=SET_Y ≈ 330) → **Continue** (y=CONT_Y ≈ 570, conditional) → **Play** (y=PLAY_Y ≈ 900) → streak pill → "Choose Level" pill.

| # | Mount order (code) | ID | Visual position | Notes / fixes needed |
|---|---|---|---|---|
| 1 | `mountAction('a11y-play', 'Open Adventure Map', …)` | a11y-play | **Bottom** (Play button, y≈900) | **MISMATCH** — mounted first but visually third/bottom |
| 2 | `mountAction('a11y-continue', '…', …)` *(conditional)* | a11y-continue | **Middle** (Continue, y≈570) | **MISMATCH** — mounted second but visually between Settings and Play |
| 3 | `mountAction('a11y-settings', 'Open Settings', …)` | a11y-settings | **Top** (Settings gear, y≈330) | **MISMATCH** — mounted third but visually first (top) |
| 4 | `mountAction('a11y-choose-level', '…', …)` | a11y-choose-level | **Below Play** (bottom pill) | OK relative to its canvas position |

**Correct visual order:** `a11y-settings` → `a11y-continue` → `a11y-play` → `a11y-choose-level`

**Fix needed:** Reorder `mountAction` calls in `MenuScene.create()` to: settings → continue → play → choose-level.

**Additional note:** `A11yLayer.announce(get('menu.welcome.announce'))` fires after all four mounts — this is correct (announce the scene after registering controls).

---

## LevelMapScene (`src/scenes/LevelMapScene.ts`)

Visual layout at 360 px: title "Adventure Map" (y=72) → streak pill (top-right) → nine level cards (y=148…y=1130, winding path) → Back button (y=CH-60=1220).

| # | Mount order (code) | ID | Visual position | Notes / fixes needed |
|---|---|---|---|---|
| 1 | `mountAction('a11y-back-menu', 'Back to main menu', …)` | a11y-back-menu | **Bottom** (Back button, y≈1220) | **MISMATCH** — mounted before level buttons but visually last |
| 2…N | `mountAction('a11y-map-level-${N}', …)` for each unlocked level in `LEVEL_META` order (L1→L9) | a11y-map-level-N | L1=bottom-left (y=1130) → L9=top-right (y=148) | Loop iterates L1→L9 but visual order top→bottom is L9→L1 |

**Correct visual order (top → bottom):** L9 → L8 → L7 → L6 → L5 → L4 → L3 → L2 → L1 → Back

**Fix needed:** Mount level actions in reverse order (L9 first, L1 last) to match top→bottom reading. Move `a11y-back-menu` mount to *after* all level mounts (back button is visually at the bottom).

**Note:** `A11yLayer.announce(…)` fires after all mounts — correct placement.

---

## SettingsScene (`src/scenes/SettingsScene.ts`)

`SettingsScene` does **not** call `A11yLayer.mountAction()` at all. Preferences use `PreferenceToggle` (real DOM `<button role="switch">` elements — natively accessible). Action buttons (Export, Restore, Reset, Update, Refresh Curriculum, Back) use `TestHooks.mountInteractive` + Phaser hit-zones, but have no A11y DOM mirror.

**Fix needed:** Add `A11yLayer.mountAction()` calls for each action button in visual top→bottom order:
1. `a11y-settings-export` — Export My Backup (y=640)
2. `a11y-settings-restore` — Restore from Backup (y=760)
3. `a11y-settings-reset` — Reset Device (y=880)
4. `a11y-settings-update` — Check for App Update (y=1060)
5. `a11y-settings-refresh` — Refresh Curriculum (y=1180)
6. `a11y-settings-back` — Back (y=1240)

*(PreferenceToggle buttons at y≈250–520 are already natively keyboard-accessible; no A11yLayer mount needed for them.)*

---

## OnboardingScene (`src/scenes/OnboardingScene.ts`)

Visual layout: title "How to Play" (top) → step badge → instruction text → shape/practice area → action button (bottom) → skip link.

| # | Mount order (code) | ID | Visual position | Notes / fixes needed |
|---|---|---|---|---|
| 1 | `mountAction('a11y-skip-onboarding', 'Skip tutorial, …', …)` | a11y-skip-onboarding | **Bottom-ish** (skip link, near action button) | Single action; no ordering conflict. OK. |

**Note:** The primary action button ("Check ✓" / "Next" / "Let's Play!") changes between steps but there is no `mountAction` call for it — the scene uses a Phaser `Container`-based button. **Fix needed:** Add `mountAction` for the primary action button and update its label/handler per step.

---

## RecoveryScene / DBRecoveryScene

Both files were not found in `src/scenes/` — they may be embedded in other modules or not yet implemented. No audit needed.

---

## SessionCompleteOverlay (`src/components/SessionCompleteOverlay.ts`)

`SessionCompleteOverlay` calls `A11yLayer.pushLayer(…)` then mounts buttons via the `createButton` helper (which calls `A11yLayer.mountAction` internally). Visual order:

| # | Button | Position (canvas y) | Notes |
|---|---|---|---|
| 1 | `a11y-session-complete-next` (when `onNextLevel` exists) | btnBaseY=800 | OK — mounted in visual top-to-bottom order |
| 2 | `a11y-session-complete-again` | btnBaseY+110=910 | OK |
| 3 | `a11y-session-complete-menu` | btnBaseY+220=1020 | OK |

**Assessment:** Mounting order matches visual order. No fix needed.

---

## HintLadder (`src/components/HintLadder.ts`)

`HintLadder` is a pure state-machine class — it has no DOM rendering and makes no `A11yLayer.mountAction()` calls. Hint content is rendered by scene code that consumes `HintLadder.state`. No audit issue.

---

## Summary table

| Scene | Status | Priority fix |
|---|---|---|
| MenuScene | **Mismatch** (3 of 4 mounts in wrong visual order) | Reorder: settings → continue → play → choose-level |
| LevelMapScene | **Mismatch** (back button mounted first; level order reversed vs visual) | Move back to last; iterate levels top→bottom (reverse LEVEL_META) |
| SettingsScene | **Missing** (no A11yLayer mounts for action buttons) | Add 6 `mountAction` calls in visual order |
| OnboardingScene | **Partial** (skip button only; primary action missing) | Add primary action button mount, update per step |
| SessionCompleteOverlay | OK | None |
| HintLadder | N/A | None |
