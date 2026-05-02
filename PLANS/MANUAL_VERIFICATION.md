# Manual verification — items that require a human

**Created:** 2026-05-02 alongside the PLAN.md archive.
**Why this file exists:** the multi-phase sprint plan is closed out, but
three items can't be finished from the terminal. They live here so the next
agent doesn't lose them.

---

## 1 — Phase 0 happy-path walkthrough

**Effort:** 30–60 min in a Chromium tab.
**When:** before tagging a release; re-verify after every merge train ≥ 5 PRs.

```bash
npm run dev:app
# Open http://localhost:5000 in a Chromium-based browser.
```

Walk the flow and tick each line:

- [ ] Menu loads, Play button visible.
- [ ] Tap Level 1 → partition question appears with the correct prompt
      (not "identify" text).
- [ ] Drag handle moves freely, releases at position.
- [ ] Submit a correct answer → green feedback overlay appears
      (panel 260px tall, 32px corner radius, 72px icon — the T1 specs from
      `feat/2026-05-02-feedback-overlay-t1-specs`); counter increments
      (1/5 → 2/5).
- [ ] Submit a wrong answer → red overlay, shake animation, counter does
      NOT increment.
- [ ] Hint `?` button → tier-1 text shows; press again → tier-2; press
      again → tier-3.
- [ ] Complete 5 correct → session-complete card appears with
      "Keep Going" + "Back to Menu".
- [ ] DevTools → Application → IndexedDB → `questerix-fractions`:
      `attempts` has 5 rows; `skillMastery` has a row with
      `masteryEstimate > 0.1`; `streakRecord` has 1 row
      (`currentStreak: 1`).
- [ ] "Back to Menu" returns to menu without crashing.

If anything fails, fix only that specific failure on a `fix/YYYY-MM-DD-<slug>`
branch. Do not refactor in passing — per C10, every change must serve
validation, not polish.

---

## 2 — iPad Safari touch-drag verification

**Effort:** 30 min on actual iPad hardware (any iPad Mini and up).
**When:** before tagging the first public release.

iOS Safari is the primary K–2 device target (per C7). The full flow has
never been touched-tested there. Replit/Chromium DevTools touch emulation
is not a substitute — past bugs in Phaser 4 pointer handling on iOS show
up only on real hardware.

Repeat the Phase 0 walkthrough above on iPad Safari. Pay extra attention
to:
- partition handle drag: snap behavior, fling momentum, accidental scrolls.
- feedback overlay: shake animation doesn't desync the canvas at 60 fps.
- audio: TTS unlocks correctly after the first user gesture.

Document any iOS-only bugs in a new `fix/2026-MM-DD-ipad-<slug>` branch.

---

## 3 — Cloudflare Pages deploy

**Effort:** ~10 min once auth is in hand.
**Auth required:** Cloudflare account API token in env (`ask`-tier per
`.claude/settings.json`).

```bash
npm run build
npx wrangler pages deploy dist
```

Pre-deploy gates (already enforced in CI; re-run locally to catch drift):
- `npm run typecheck`
- `npm run lint`
- `npm run test:unit`
- `npm run test:e2e -- --project=chromium`
- `npm run measure-bundle` — must be under the 1.0 MB gzipped budget.

After deploy:
- Visit the published URL once in Chromium and once in iOS Safari.
- Open DevTools → Network → confirm zero non-CDN HTTP calls
  (per C1: no external data egress).
- Confirm IndexedDB `questerix-fractions` is created on first load.

If the deploy fails, do not retry destructively. Read the wrangler output,
fix locally, and re-run.
