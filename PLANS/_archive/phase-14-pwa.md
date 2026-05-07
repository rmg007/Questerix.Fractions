# Phase 14: PWA Manifest Correctness & SW Update Awareness

## Context

The project has PWA infrastructure in place (vite-plugin-pwa, registerSW.js, UpdateBanner component), but two gaps remain:

1. **Manifest duplication & inconsistencies**: Both `public/manifest.json` (36 lines) and `vite.config.ts` (lines 61–83) define the manifest. Icon path naming diverges (vite: `icon-maskable-192.png` vs. public: `icon-192-maskable.png`). Missing fields that improve Lighthouse PWA score: `categories`, `screenshots`, orientation hints.

2. **SW update UX gaps**:
   - No on-demand refresh button (only auto-reload on MenuScene or manual curriculum cache clear)
   - No error surface for failed SW registration (console-only)
   - Settings page doesn't expose update affordance

**Target:** Lighthouse PWA audit ≥95 + Android Chrome install prompt works.

---

## Design Decisions

### Manifest Deduplication Strategy: *Delete public/manifest.json, use vite.config.ts only*

**Rationale:**
- `vite.config.ts` manifest is the source of truth (generated into `dist/manifest.json` by vite-plugin-pwa)
- Single source of truth prevents sync drift
- vite plugin handles icon inlining, workbox config, and cache strategies
- `public/manifest.json` becomes redundant once vite config is complete

**Risk mitigation:**
- `index.html` line 13 references `/manifest.json` (correct — vite outputs to dist/)
- Icon paths in vite.config must be verified (line 71: `icon-maskable-192.png` vs. actual `public/icons/icon-192-maskable.png`)

**Action:** 
1. Verify icon naming in vite.config matches actual files
2. Enhance vite manifest with categories + screenshots
3. Delete `public/manifest.json`

---

### Manifest Completeness: Add Educational Metadata

Add to `vite.config.ts` manifest object (lines 61–83):

```typescript
categories: ['education', 'games'],

screenshots: [
  {
    src: '/screenshots/mobile-540x720.png',
    sizes: '540x720',
    form_factor: 'narrow',
    type: 'image/png',
  },
  {
    src: '/screenshots/tablet-1024x768.png',
    sizes: '1024x768',
    form_factor: 'wide',
    type: 'image/png',
  },
],
```

**Screenshot creation:** Use Lighthouse simulations (mobile: 540×720, tablet: 1024×768) or static exports from Level01 or MenuScene. Can be placeholders initially (Level screen + fraction UI). Actual files → `public/screenshots/`.

**Orientation:** Keep `portrait` (matches mobile-first, K–2 device usage).

---

### SW Update Button in SettingsScene

**Current state:** SettingsScene line 880 has "Refresh Curriculum" button (curriculum cache only).

**New button location:** Add after line 132 ("Reset Device"), before line 134 ("Refresh Curriculum"):

```
Preferences (y=190)
├─ Reduced Motion toggle (y=228)
├─ Audio toggle (y=320)
├─ TTS toggle (y=412)
└─ Storage Permission toggle (y=504)

Data (y=560)
├─ Export My Backup (y=630)
├─ Restore from Backup (y=720)
├─ Reset Device (y=820) [EXISTING]
├─ Check for App Update (y=910) [NEW]  ← Insert here
└─ Refresh Curriculum (y=880) [SHIFT DOWN TO y=1000]
```

**Implementation:**
- `doCheckForAppUpdate()` method (new):
  1. Call `navigator.serviceWorker.ready.then(reg => reg.update())`
  2. Show loading toast: "Checking for app updates..."
  3. Listen to `navigator.serviceWorker` `controllerchange` event (fires when new SW activates)
  4. On change: show success toast "New version loaded — restart to apply" + reload button inline
  5. On timeout (5s): dismiss toast

- Uses existing `displayMessage()` helper from SettingsScene for consistency (line 468)
- Respects accessibility: button is labeled, aligned with other data buttons

---

### registerSW.js: Error Surface + Update Availability Signal

**Current behavior** (line 7–19): Only logs errors to console.

**Enhancement:**
1. On `.catch()` (registration failure), dispatch to window custom event: `window.dispatchEvent(new CustomEvent('sw-register-failed', { detail: err }))`
2. In `src/main.ts` (lines 165–214), listen to this event and show error toast on BootScene/PreloadScene
3. Error toast: "Offline features unavailable — please reload" (non-blocking, dismissible)

**Reasoning:**
- SW registration failure = no offline support, no cache, no install prompt
- User should know why their app isn't fully functional
- Toast on early scenes (before/during preload) catches errors before gameplay

---

## Implementation Steps

### Step 1: Verify & Fix Icon Paths (vite.config.ts, line 71)
- Read actual `public/icons/` directory
- Confirm: `icon-192-maskable.png` and `icon-512-maskable.png` exist
- vite.config line 71 references `icon-maskable-192.png` (wrong order)
- Fix: Update vite.config to match actual naming

### Step 2: Enhance Manifest in vite.config.ts (lines 61–83)
- Add `categories: ['education', 'games']`
- Add `screenshots` array (2 entries: mobile 540×720, tablet 1024×768)
- Verify `orientation: 'portrait'` stays
- Verify `display: 'standalone'` stays

### Step 3: Create Screenshot Placeholders
- Create `public/screenshots/` directory
- Generate 540×720 PNG (mobile) and 1024×768 PNG (tablet) — can use existing UI or static fallbacks
- Build output will include these via `includeAssets` in vite.config

### Step 4: Delete public/manifest.json
- Remove file (no longer needed; vite generates from config)
- Verify `index.html` still references `/manifest.json` (correct)

### Step 5: Add SW Update Button to SettingsScene.ts
- Insert new method `doCheckForAppUpdate()` (after line 384, after `doRefreshCurriculum`)
- Add button in constructor (y=910, between "Reset Device" and "Refresh Curriculum")
- Shift "Refresh Curriculum" button down (y=880 → y=1000)
- Update all button y-coordinates if needed (verify layout doesn't overflow)

### Step 6: Enhance registerSW.js
- On registration `.catch()`, dispatch `sw-register-failed` custom event with error
- Keep hourly polling + auto-reload on updates (already working)

### Step 7: Wire Error Toast in src/main.ts
- Add listener for `sw-register-failed` event (lines 165–214 area)
- Show error toast on BootScene/PreloadScene if registration fails
- Toast message: "Offline features unavailable — please reload"

### Step 8: Verify & Test
- `npm run build` — Check dist/manifest.json includes categories + screenshots
- `npm run test:a11y` — Ensure new button is keyboard-accessible
- Lighthouse PWA audit on built dist (should report ≥95)
- Manual test: Open DevTools → Application → Manifest, verify all fields present
- Manual test: On Chrome (Android or desktop), verify install prompt appears
- Manual test: SettingsScene button triggers `reg.update()`, watch for toast

---

## Files to Modify

| File | Lines | Change |
|------|-------|--------|
| `vite.config.ts` | 61–83, 71 | Fix icon paths, add categories + screenshots, remove public/manifest.json reference |
| `src/scenes/SettingsScene.ts` | Constructor (buttons), 384+ | Add doCheckForAppUpdate() method, insert button, shift existing buttons |
| `public/registerSW.js` | 7–19 (catch block) | Dispatch sw-register-failed event on error |
| `src/main.ts` | 165–214 | Add listener for sw-register-failed, show error toast |
| `public/manifest.json` | — | **DELETE** |
| `public/screenshots/` | — | **CREATE** (add 2 PNG files) |

---

## Verification Checklist

- [ ] `npm run build` succeeds, dist/manifest.json has categories + screenshots
- [ ] Icon paths in vite.config match actual `public/icons/` files
- [ ] SettingsScene button renders, y-coordinate layout is correct (no overflow)
- [ ] `doCheckForAppUpdate()` calls `reg.update()` and shows toast on SW change
- [ ] `registerSW.js` error event fires if registration fails
- [ ] `src/main.ts` error toast appears on register failure
- [ ] `npm run test:a11y` passes (new button has ARIA label)
- [ ] Lighthouse PWA audit ≥95 on built dist
- [ ] Android Chrome install prompt appears (requires manifest + icons + SW)

---

## Gate Criteria (from Phase 14 brief)

✅ Lighthouse PWA audit ≥95  
✅ Install prompt works on Android Chrome  
✅ Manifest deduplication (no public/manifest.json)  
✅ Manifest completeness (categories, screenshots)  
✅ SW update button in SettingsScene with feedback  
✅ Error surface for SW register failures
