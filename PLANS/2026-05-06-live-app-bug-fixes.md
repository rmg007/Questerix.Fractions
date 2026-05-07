# Live App Bug Fixes — 2026-05-06

Findings from live testing of https://fractions.questerix.com immediately after deploy.
Tested with Chrome (DPR 1.25, Windows 125% scaling) at desktop (1036×614 CSS px) and mobile (500×662 CSS px).

---

## Test environment notes

- Canvas internal resolution: 800×1280. CSS rendered size at desktop: 383×613. Scale factor ≈ 2.086×.
- DPR 1.25 means screenshot px ÷ 1.25 = CSS px. MCP `left_click` sends physical-px coordinates; Phaser receives CSS-px pointer events via the browser's input pipeline — real users are unaffected by MCP coordinate math.
- Phaser game instance is module-scoped (not on `window`), so console-based probing required JS `dispatchEvent` on the canvas.
- A11y DOM layer (`#qf-a11y-layer-base`) exposes accessible buttons for main-menu navigation but does **not** update when navigating to SettingsScene.

---

## Bug inventory

### BUG-MOB-01 ★ CRITICAL — Blank screen at mobile/narrow viewport

**Symptom:** Loading `fractions.questerix.com` in a ≤500 CSS px wide window shows a blank grey canvas. The game boots (BootScene logs run to completion) but `PreloadScene` and `MenuScene` never start. Persists indefinitely — not a slow load.

**Reproduction:**
1. Resize Chrome to ≤625 physical px wide (≤500 CSS px at DPR 1.25).
2. Navigate to https://fractions.questerix.com.
3. Wait 10 s — console shows two full BootScene cycles but no PreloadScene log.

**Root cause (hypothesis):** `fadeAndStart` (`src/scenes/utils/sceneTransition.ts`) fires `cameras.main.fadeOut(300)` and waits for `camerafadeoutcomplete`. The `visibilitychange` handler in `main.ts:187–195` calls `s.tweens.pauseAll()` on every scene when the tab is hidden. Resizing the Chrome window can momentarily background the tab; the 300 ms camera-fade tween pauses before completion and never fires `camerafadeoutcomplete`, so `scene.scene.start('PreloadScene')` is never called. Screen stays stuck on BootScene's grey background.

**Impact:** C7 violation — game is completely non-functional on the primary target devices (iOS Safari, Android Chrome at 360–430 CSS px viewport).

**Fix — Phase 1 (safety timeout in `fadeAndStart`):**
```typescript
// src/scenes/utils/sceneTransition.ts
export function fadeAndStart(scene: Phaser.Scene, key: string, data?: object): void {
  if (checkReduceMotion()) {
    scene.scene.start(key, data);
    return;
  }
  let advanced = false;
  const advance = () => {
    if (advanced) return;
    advanced = true;
    scene.cameras.main.off('camerafadeoutcomplete', advance);
    scene.scene.start(key, data);
  };
  scene.cameras.main.fadeOut(300, 0, 0, 0);
  scene.cameras.main.once('camerafadeoutcomplete', advance);
  // Fallback: if tab was backgrounded during fade, tween pauses and event
  // never fires. Advance after 600 ms regardless.
  scene.time.delayedCall(600, advance);
}
```

**Fix — Phase 2 (don't pause scene transitions in `visibilitychange`):**  
The `visibilitychange` handler in `main.ts:187–195` is too broad — it pauses ALL tweens including fade transitions. Add a guard so it skips BootScene and PreloadScene (which are only ever active during initial load, never during a mid-session background):
```typescript
// main.ts:187
document.addEventListener('visibilitychange', () => {
  const TRANSITION_SCENES = new Set(['BootScene', 'PreloadScene']);
  game.scene.scenes.forEach((s) => {
    if (TRANSITION_SCENES.has(s.sys.settings.key)) return; // never pause boot transitions
    if (document.hidden) s.tweens?.pauseAll?.();
    else s.tweens?.resumeAll?.();
  });
});
```

**Files:** `src/scenes/utils/sceneTransition.ts`, `src/main.ts`

---

### BUG-STOR-01 HIGH — 4× "Access to storage is not allowed" EXCEPTION on every boot

**Symptom:** Every page load logs 4 red `[EXCEPTION]` entries:
```
Error: Access to storage is not allowed from this context.
```
These appear before Phaser even starts. They repeat on the service worker reload cycle (~90 s).

**Root cause:** The service worker (`sw.js`) is making IndexedDB or `localStorage` calls from within its `install`/`activate`/`fetch` event handlers in a context where storage is restricted (Cloudflare Pages sandboxes SW storage in certain origin configurations). The `unhandledrejection` handler in `main.ts:54–64` swallows async storage errors, but these are synchronous throws — not promise rejections — so they escape to the console as uncaught exceptions.

**Impact:** Red error spam in DevTools confuses debugging; may suppress legitimate storage error reports via the `unhandledrejection` filter. No visible user impact but degrades signal quality.

**Fix:**
1. Audit `public/sw.js` (or the vite-plugin-pwa generated SW) for any direct IndexedDB/storage access in `install`/`activate` event handlers — wrap in try/catch.
2. Add a synchronous `window.addEventListener('error', ...)` guard in `main.ts` that filters the "storage is not allowed" pattern before it hits the DevTools console, analogous to the `unhandledrejection` handler that already exists at line 54.

**Files:** `public/sw.js` (generated), `src/main.ts`, `vite.config.ts` (workbox config)

---

### BUG-A11Y-01 HIGH — A11y DOM layer stale in SettingsScene; Back button unreachable by keyboard

**Symptom:** The `#qf-a11y-layer-base` DOM overlay always shows the **MenuScene** navigation buttons (Open Adventure Map, Continue, Open Settings, Choose Level) regardless of which Phaser scene is active. When SettingsScene is active, there is no accessible DOM button for "Back". Keyboard users cannot leave Settings.

**Root cause:** `A11yLayer` registers its buttons once during MenuScene creation and never updates them on scene change.

**Impact:** WCAG 2.1 SC 2.1.1 (Keyboard) failure. Also means screen readers announce stale controls.

**Fix:** `SettingsScene` must call `A11yLayer.setButtons([{ label: 'Back', action: () => this.doBack() }])` in its `create()` method, and `MenuScene.create()` must restore the full menu button set when it becomes active. Introduce an `A11yLayer.clear()` + `A11yLayer.register(buttons)` API if not already present.

**Files:** `src/components/A11yLayer.ts`, `src/scenes/SettingsScene.ts`, `src/scenes/MenuScene.ts`

---

### BUG-A11Y-02 HIGH — Settings preference toggle buttons have no aria-label

**Symptom:** The 4 DOM toggle buttons in `#qf-pref-toggles` (Reduced Motion, Audio Enabled, Read Questions Aloud, Storage Permission) have `aria-label=undefined`. Screen readers announce them as unlabelled buttons.

**Root cause:** SettingsScene renders toggle buttons into a DOM div without setting `aria-label` or `aria-checked`.

**Impact:** WCAG 2.1 SC 4.1.2 (Name, Role, Value) failure.

**Fix:** When SettingsScene renders each toggle into `#qf-pref-toggles`, set:
```html
aria-label="Reduced Motion"
role="switch"
aria-checked="false"
```
Update `aria-checked` whenever the toggle state changes.

**Files:** `src/scenes/SettingsScene.ts`

---

### BUG-STOR-02 MEDIUM — "Storage Permission: Denied" label is misleading

**Symptom:** Settings shows "Storage Permission" toggle in the OFF position with the text **"Denied"** in red. This implies progress is NOT being saved. In reality, IndexedDB is fully functional (IDB v1 opens successfully); `Denied` only means `navigator.storage.persist()` returned `false` (browser won't pin the quota against eviction under storage pressure — normal for new sites).

**Root cause:** `ensurePersistenceGranted()` in `src/persistence/db.ts:567` returns `false` → stored as `persistGranted: false` in DeviceMeta → SettingsScene displays "Denied" in red at `src/scenes/SettingsScene.ts:100`.

**Impact:** Misleads parents/teachers into thinking the app has a data-loss problem. Could cause unnecessary support requests.

**Fix:**
1. Change the label from "Denied" to "Not pinned" or hide the row entirely when `false` (it's an internal storage API nuance irrelevant to end users).
2. Change color from red to grey/amber, or remove the red entirely.
3. Add a tooltip: "Your progress is saved. This just means the browser may clear it if your device runs out of space."

**Files:** `src/scenes/SettingsScene.ts`

---

### BUG-LEVEL-01 MEDIUM — "Choose Level" shows only L1 with no indication L2–L9 exist

**Symptom:** The "Choose a Level" dialog shows a single L1 card labeled "Suggested next". L2–L9 are completely absent — no locked cards, no indication more levels exist.

**Root cause:** `LevelMapScene` / the dialog renderer only shows unlocked levels. Since this test student has only played L1, only L1 is shown. This is _by design_ but the UX is poor: first-time users don't know the game has 9 levels.

**Impact:** Players don't know what they're working toward. May feel the game is very short.

**Fix (UX):** Show L2–L9 as greyed-out "locked" cards with a 🔒 icon. Add a tooltip: "Complete Level N to unlock". This is a pure rendering change in the Choose Level dialog — no business logic changes.

**Files:** `src/scenes/MenuScene.ts` (or wherever the Choose Level dialog is rendered)

---

### BUG-SW-CYCLE LOW — Service worker causes double BootScene cycle every ~90 seconds

**Symptom:** Console logs show two full BootScene boot sequences separated by ~90 seconds. The second is triggered by the SW `controllerchange` event forcing a page reload.

**Root cause:** vite-plugin-pwa is configured with `registerType: 'autoUpdate'` + `skipWaiting: true`. When the SW activates, all clients reload. This is acceptable for a silent update, but the 90-second gap (SW install → activate → clients.claim) means a user mid-lesson gets interrupted.

**Impact:** Low (user loses ~1 level question if they're mid-answer). But it disrupts the learning session.

**Fix:** Change to `registerType: 'prompt'` or add a session guard — delay the reload until `MenuScene` is active (the `UpdateBanner` logic in `main.ts:246–293` already attempts this but `skipWaiting` overrides it). Ensure `skipWaiting` in the SW only fires after the current game session ends, not immediately on activation.

**Files:** `vite.config.ts` (workbox/PWA config)

---

## Phase plan

### Phase 1 — Critical mobile fix (unblocks C7 compliance) — 1–2 hours
**Gate:** Grey-screen bug reproduced on real 360px mobile viewport, patch deployed, verified by reloading https://fractions.questerix.com on a real mobile device.

- [ ] `src/scenes/utils/sceneTransition.ts` — add 600 ms safety timeout to `fadeAndStart`
- [ ] `src/main.ts:187–195` — exclude BootScene/PreloadScene from tween-pause handler
- [ ] `npm run typecheck && npm run test:unit && npm run build`
- [ ] Deploy + verify on real mobile viewport

### Phase 2 — Accessibility fixes (WCAG compliance) — 2–3 hours
**Gate:** `npm run test:a11y` passes; a11y-auditor subagent reports no new WCAG 2.1 AA violations.

- [ ] `src/components/A11yLayer.ts` — add `register(buttons)` / `clear()` API
- [ ] `src/scenes/SettingsScene.ts` — call `A11yLayer.register([{ label: 'Back', ... }])` in `create()`; add `aria-label` + `aria-checked` to pref toggles
- [ ] `src/scenes/MenuScene.ts` — restore A11y buttons on `create()`
- [ ] Fire a11y-auditor subagent after changes

### Phase 3 — UX polish — 1–2 hours
**Gate:** Settings no longer shows scary red "Denied"; Choose Level shows locked level cards.

- [ ] `src/scenes/SettingsScene.ts` — fix "Storage Permission: Denied" label (BUG-STOR-02)
- [ ] `src/scenes/MenuScene.ts` (Choose Level dialog) — render locked L2–L9 cards (BUG-LEVEL-01)

### Phase 4 — Storage error cleanup + SW fix — 1 hour
**Gate:** Zero `[EXCEPTION]` entries on fresh load; no mid-session SW reload.

- [ ] Audit SW for synchronous storage throws; wrap in try/catch (BUG-STOR-01)
- [ ] Add synchronous `error` event filter in `main.ts` for "storage is not allowed"
- [ ] `vite.config.ts` — change SW update strategy to not reload mid-session (BUG-SW-CYCLE)

---

## Screenshot evidence

| State | Finding |
|---|---|
| Boot (desktop) | Loads in 180ms, MenuScene renders correctly |
| Settings page | "Storage Permission: Denied" in red; 4 pref toggles with no aria-label |
| Choose Level dialog | Only L1 visible, L2–L9 absent |
| Level 1 partition | Drag divider + Check button visible; game renders at correct scale |
| Mobile 390×844 | Black screen after resize; grey screen on fresh load; PreloadScene never starts |
| Console (every boot) | 4× "Access to storage is not allowed" EXCEPTION; "Persistence granted: false" |
