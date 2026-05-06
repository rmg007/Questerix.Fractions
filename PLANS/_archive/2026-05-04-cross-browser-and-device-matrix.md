# Plan: Cross-Browser & Real-Device Test Matrix

**Date:** 2026-05-04
**Branch (when started):** `test/2026-05-04-cross-browser-and-device-matrix`
**Status:** COMPLETED 2026-05-06 — WebKit + iOS Playwright specs live in CI
**Part of:** [2026-05-04-roadmap.md](2026-05-04-roadmap.md) — Phase 1. Provides the validation surface for plans 1–3 and the perf plan; should be in place before plan 1 Phase 4 ships so its hit-area fixes are validated on real touch devices.

## Problem

C7 mandates iOS Safari + Android Chrome + desktop across 360–1024 px. The current CI runs Playwright against Chromium only. Real-device pain points that Chromium emulation does not catch:

- **iOS Safari 100vh / dynamic toolbar.** The viewport height changes when the address bar collapses; layouts pinned to `100vh` jump.
- **Android Chrome bottom URL bar resize.** Same class of bug, different trigger (scroll direction).
- **iOS pointer events + Phaser.** iOS has historical bugs with multi-touch event ordering inside a `<canvas>` that desktop Chromium will not reproduce.
- **Android low-end Chrome WebGL fallback.** On budget devices, Chrome may fall back to software WebGL silently. Frame rate cliffs.
- **Font rendering differences.** iOS Safari renders the same font ~2 px taller in line height than Chromium. Layouts validated only in Chromium can clip on iOS.
- **Safari `prefers-reduced-motion` scope.** iOS respects it but exposes it slightly differently (system-level only, no per-tab override). Reduced-motion guards must be tested on the OS, not just emulated.
- **Tab visibility & background throttling.** Android Chrome throttles `requestAnimationFrame` aggressively in background tabs; resume-from-background can leave tweens stuck mid-frame.

Without a plan for this, the app passes CI and fails on the only devices children actually use.

## Goals

1. CI runs Playwright against WebKit (Safari proxy) and Chromium for every PR; Firefox as advisory.
2. A documented **real-device validation matrix** of 4 reference devices is run pre-release: iPhone SE 1st gen (iOS 15 floor), iPhone 14 (current), $50 Android (Moto G Power class), iPad 9th gen.
3. Each reference device has a checklist run executed by a human (or recorded screen capture) per release; results live in `audit/device-matrix-<release>.md`.
4. The most common cross-browser footguns (100vh, multi-touch, font-line-height, background throttling) have automated regression tests where possible.

## Non-goals

- BrowserStack / Sauce Labs cloud test farms. Cost-prohibitive for a solo project; we use local devices + Playwright WebKit.
- IE / legacy browsers. Modern evergreen only.
- Pixel-perfect visual parity across browsers — only functional and layout parity (text not clipped, controls reachable, no broken interactions).

## Definition of done

- Playwright project config lists Chromium + WebKit; both run on PR.
- Reference-device checklist exists in `docs/30-architecture/device-matrix.md` with the 4 devices and the per-release run procedure.
- iOS-specific Playwright specs cover 100vh, multi-touch ordering, reduced-motion compliance.
- Background throttling regression test in place.
- One full real-device pass executed and committed to `audit/`.

---

## Phases

### Phase 1 — Add WebKit to Playwright (gate: CI green on both projects)

- Update `playwright.config.ts` to include the WebKit project; mirror viewport matrix (360 / 768 / 1024).
- Run the existing E2E suite on WebKit; expect a few failures around hit-area edge clicks (WebKit's pointer model differs); triage and fix.
- Add `test:e2e:webkit` script. CI runs both projects; failures on either block PR.
- Firefox added as `experimental` project (advisory only — does not block PR yet).

### Phase 2 — iOS-specific regression tests (gate: specs green)

- `tests/e2e/ios/viewport-100vh.spec.ts` — load on a Safari user agent, simulate toolbar collapse, assert no scene element jumps > 4 px.
- `tests/e2e/ios/multi-touch.spec.ts` — drive two simultaneous `touchstart` streams against `MakeInteraction` and confirm the resting finger does not cancel the active drag (depends on plan 1 Phase 4c — multi-touch input config).
- `tests/e2e/ios/reduced-motion.spec.ts` — set the WebKit project to `reducedMotion: 'reduce'` and assert ceremony tweens take the instant path.
- `tests/e2e/ios/safe-area.spec.ts` — viewport with simulated notch insets; assert no UI lives under the notch or home indicator.

### Phase 3 — Background throttling resilience (gate: spec green)

- Background-tab regression: hide the page (`page.bringToFront(other)`), wait 2 s, return; assert no tweens are mid-frame stuck and no input is dropped.
- Add a fix in `src/main.ts` Phaser config: on `'visibilitychange'`, pause all tweens and audio; on resume, fast-forward tweens to their final state (children should not see "the wand finishes drawing itself" 5 s after they came back to the tab).

### Phase 4 — Reference-device matrix (gate: doc + first run committed)

`docs/30-architecture/device-matrix.md`:

| # | Device | OS floor | Why |
|---|---|---|---|
| 1 | iPhone SE 1st gen | iOS 15 | The C7 minimum 360 px and oldest still-supported Safari |
| 2 | iPhone 14 | iOS 17 | Current dominant iOS |
| 3 | Moto G Power (or equivalent <$200 Android) | Android 12 | Realistic K–2 home device |
| 4 | iPad 9th gen | iPadOS 16 | Common school device |

Per-release checklist (one page, ~10 min per device):

1. Cold start time vs. budget.
2. L1 partition drag — does the line snap correctly? Does the visual stay under the finger?
3. Hint Tier 1 / 2 / 3 reveals visible at 360 px (iPhone SE)?
4. SessionCompleteOverlay buttons reachable, no occlusion under the home indicator?
5. Reduced-motion toggled at OS level → ceremony skips animation?
6. Multi-touch test — rest finger + drag does not cancel?
7. Background the app for 30 s, return — state preserved?
8. Audio plays on first user-tap (iOS gating)?
9. Long question text wraps, doesn't clip?
10. Privacy notice link reaches the privacy doc?

Result format: `audit/device-matrix-<YYYY-MM-DD>-<release>.md` with PASS / FAIL / NOTES per row × column. Commit before each release tag.

### Phase 5 — Local device protocol (gate: doc committed)

Document for Ryan:

- How to wire iOS Safari to a desktop Safari Web Inspector for local debugging.
- How to enable Chrome remote inspect for Android.
- How to capture a 60-second screen recording of each device run (so audit trail does not depend on memory).
- A scripted `npm run dev:expose` that binds Vite to `0.0.0.0` so a phone on the same network can hit the dev server (dev only — never for production).

### Phase 6 — Phase-close docs (gate: PR merged)

- Append to `.claude/learnings.md`: most-painful cross-browser bug found during the first matrix run (likely 100vh or multi-touch — TBD by execution).
- Update `docs/30-architecture/test-strategy.md` to declare the WebKit + reference-device gates.
- Run `npm run sync:claude-md`.

---

## Risk / rollback

- **Risk:** WebKit project doubles CI time. Mitigate by running smoke subset on WebKit per PR, full suite on main and tags only.
- **Risk:** Real-device matrix is manual; gets skipped under deadline. Mitigate by making the doc the release checklist (no merge to `main` without it for tagged releases).
- **Rollback:** Phase 1 is the most impactful; if WebKit destabilizes CI, demote to advisory while issues are triaged.

## Out-of-scope follow-ups

- Cloud device farms (BrowserStack / Sauce). Revisit if the solo-validation phase ends.
- Older Android (< 12) or older iOS (< 15). Out of C7's reasonable support floor.
- Smart TV / desktop touch hybrid. Not the K–2 use case.
