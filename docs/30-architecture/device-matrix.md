# Device Matrix — Cross-Browser & Device Reference

Constraint C7 mandates responsiveness across 360–1024 px, iOS Safari, Android Chrome, and desktop.
This document defines the four reference devices used for manual and automated validation.

## Reference Devices

| # | Device | OS Floor | Browser | Viewport (px) | Why |
|---|---|---|---|---|---|
| 1 | iPhone SE 1st gen | iOS 15 | Safari | 320 × 568 (360 logical) | 360 px minimum; oldest supported Safari engine |
| 2 | iPhone 14 | iOS 17 | Safari | 390 × 844 | Current dominant iOS handset, Dynamic Island |
| 3 | Moto G Power | Android 12 | Chrome | 412 × 915 | Realistic K–2 home device; budget Android |
| 4 | iPad 9th gen | iPadOS 16 | Safari | 810 × 1080 (landscape: 1080 × 810) | Common school / district-issued device |

### Notes on OS floors

- **iOS 15** is the minimum because WebKit on iOS 15 supports `env(safe-area-inset-*)`, `aspect-ratio`, and `gap` in flexbox — all used by the layout.
- **Android 12** covers the bulk of active K–2 household devices as of 2026. Chrome auto-updates independently of the OS, so Chrome version is not pinned.
- **iPadOS 16** ships Stage Manager; the game must not break under Stage Manager's windowed mode (1024 px max width is enforced by the Phaser canvas clamp).

---

## Playwright Project Mapping

| Playwright Project | Closest Reference Device |
|---|---|
| `webkit` (360 × 667) | iPhone SE 1st gen |
| `webkit-768` (768 × 1024) | iPad 9th gen (portrait) |
| `webkit-1024` (1024 × 768) | iPad 9th gen (landscape) |
| `iPhone SE 2020` (375 × 667) | iPhone SE 3rd gen |
| `iPhone 12` (390 × 844) | iPhone 14 |
| `Pixel 5` (393 × 851) | Moto G Power |
| `iPad Mini` (768 × 1024) | iPad 9th gen |
| `chromium` (1280 × 720) | Desktop fallback |

---

## Per-Release Manual Checklist

Run this checklist on every release candidate. Sign off in the PR description.

### All four reference devices

- [ ] App boots and reaches MenuScene within 5 seconds on a mid-range device (no preloading cold cache).
- [ ] All touch targets pass the 44 × 44 CSS px minimum (visual check + safe-area spec).
- [ ] Drag-and-drop mechanics work with finger input (not just mouse).
- [ ] No text is clipped or overflows its container at 360 px width.
- [ ] No interactive element falls under the notch or home indicator (iOS devices).
- [ ] Orientation change (portrait ↔ landscape) does not break layout or lose game state.
- [ ] Session completes in ≤ 15 minutes per level (C9).

### iOS Safari specific

- [ ] `env(safe-area-inset-top/bottom)` renders correctly — no content behind status bar or home indicator.
- [ ] 100vh toolbar-collapse does not cause scene elements to jump > 4 px.
- [ ] `prefers-reduced-motion: reduce` suppresses ceremony tweens (automated by `tests/e2e/ios/reduced-motion.spec.ts`).
- [ ] Back-swipe gesture does not accidentally trigger game interactions.

### Android Chrome specific

- [ ] Address bar collapse (bottom-tab Chrome) does not shift canvas.
- [ ] Physical back button does not break scene routing.
- [ ] Pinch-zoom is disabled (game is fixed-viewport).

### Desktop

- [ ] 1280 × 720 and 1440 × 900 — canvas centred, no orphaned whitespace outside game bounds.
- [ ] Mouse drag mechanics match expected magnetic-snap behaviour.
- [ ] Keyboard navigation reaches all interactive elements (A11y layer).

---

## Automated Coverage

| Scenario | Spec File | Projects |
|---|---|---|
| Viewport 100vh toolbar collapse | `tests/e2e/ios/viewport-100vh.spec.ts` | webkit, webkit-768, webkit-1024 |
| Reduced-motion preference | `tests/e2e/ios/reduced-motion.spec.ts` | webkit, webkit-768, webkit-1024 |
| Safe-area notch + home indicator | `tests/e2e/ios/safe-area.spec.ts` | webkit, webkit-768, webkit-1024 |
| Smoke / happy path | `tests/e2e/smoke.spec.ts` | chromium, all iPhone/Pixel/iPad projects |
| iPad touch drag | `tests/e2e/ipad-touch-drag.spec.ts` | iPad Mini |

Firefox is run advisory-only (`--project=firefox --grep @advisory`). It does not block merge.
