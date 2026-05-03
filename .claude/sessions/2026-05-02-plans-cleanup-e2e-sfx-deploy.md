# Session: Plans cleanup, E2E fixes, SFX OGG, deploy
**Date:** 2026-05-02  
**Branch at start:** `chore/2026-05-02-consolidate-plans`  
**Branch at end:** `main` (all branches deleted)  
**PRs merged:** #83, #85  

---

## What was done

### Plans — full cleanup
- `PLANS/` reduced to a single file: `PLAN.md`
- All plan files archived to `PLANS/_archive/`
- Archived this session: `MANUAL_VERIFICATION.md`, `ui-audit.md`, `ux-elevation.md`, `refactor-god-objects-2026-05-01.md`, `visual-overlay-hints.md`, `E2E_FOLLOWUPS.md`
- All remaining tasks extracted into `PLAN.md` backlog sections (E2E clusters, UI/UX, god-object refactor LOC targets)

### E2E fixes (PR #83)
- **Cluster G** — skip-link test re-enabled; updated from `<a href>` assertion to `<button>` assertion (R12 changed `SkipLink.ts`)
- **Cluster F** — touch-target audit re-enabled; filters `#qf-testhooks` overlays (e2e affordances, not production controls)
- **T1** — `½` Unicode glyph → `'1/2'` in `LevelVignette.ts` (Fredoka One lacks precomposed fraction glyphs)

### SFX OGG (PR #85)
- `SFXService.ts` rewritten from Web Audio API oscillators to OGG file playback via `fetch + decodeAudioData + Map` cache
- 6 game events mapped: correct→`phaserUp1.ogg`, incorrect→`phaserDown1.ogg`, complete→`powerUp11.ogg`, perfectFanfare→`powerUp12.ogg`, streak→`threeTone1.ogg`, snap→`pepSound1.ogg`
- `sfx.preload()` added to `PreloadScene.create()` to warm buffers at boot
- 62 OGG files in `public/audio/sfx/`

### Deploy
- Fixed corrupted `fs-extra` install (empty `lib/fs/` dir) causing PWA `closeBundle` failure
- Added `fs-extra` as explicit devDependency in `package.json`
- `npm run build` → clean, `sw.js` + `workbox` generated
- Bundle: **487 KB gzip (47.6% of 1 MB budget)**
- Deployed to: https://3b0147be.questerix-fractions.pages.dev

### Infra
- `chore(github)`: simplified PR template (Summary + Constraint References + Test Plan)
- Normalized LF line endings in CI workflows

---

## Known pre-existing issue
`LevelVignette.ts` violates `max-lines: 300` ESLint rule (~893 lines, budget 300). Pre-existing since `ef1f37b`. Tracked in `PLAN.md §God-object Backlog` as sub-phase 4.7 (`SessionCompleteOverlay.ts` is the wrong file — this is actually a components god-file separate from that plan entry; note for future agent).

---

## What's next (from PLAN.md)

**Critical correctness (before external playtest):**
- C0.0 — Validator ID mismatch (`LevelScene.ts:322-327`)
- C0.0b — 3 math errors in shipped content (L9, L6, L1)
- C0.0c — 51 duplicate template IDs
- C0.0d — L6–L9 skill ID drift

**E2E clusters remaining (A–E):**
- A: Mascot state sentinels (`mascot-reactions.spec.ts`)
- B: Quest catalog ARIA-live (`quest-wiring.spec.ts`)
- C: L6/L7 menu shortcuts (`levels-2-9.spec.ts`)
- D: 5-attempt session flake (`level01.spec.ts`, `happy-path.spec.ts`)
- E: ProgressBar a11y-snap-center (`progress-bar.spec.ts:32`)

**God-object refactor (serial, LOC budget):**
- 4.1 `Level01Scene.ts` ~1648 → ≤600
- 4.2 `LevelScene.ts` ~801 → ≤600
- 4.3 `MenuScene.ts` ~923 → ≤600
- 4.4 `Mascot.ts` ~760 → ≤300
- 4.5 `SettingsScene.ts` ~602 → ≤600
- 4.7 `SessionCompleteOverlay.ts` ~527 → ≤300

---

## Recurring Windows git gotcha
On this Windows repo, `.github/PULL_REQUEST_TEMPLATE.md` (uppercase) and `.github/pull_request_template.md` (lowercase) are the same file but git tracks them separately. `git checkout -- .` and `git stash` cannot clear the ghost. Workaround: `git update-index --skip-worktree` before rebase, then `--no-skip-worktree` after.
