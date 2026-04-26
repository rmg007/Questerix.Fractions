# Questerix Fractions

An educational browser-based math game for K-2 students focused on fraction concepts (equal parts, halves, thirds, comparison). Built with tactile interactions using magnetic-drag mechanics.

## Tech Stack

- **Game Engine**: Phaser 4
- **Language**: TypeScript (strict mode)
- **Build Tool**: Vite 8
- **UI**: Tailwind CSS v4
- **Persistence**: Dexie.js (IndexedDB)
- **Package Manager**: npm

## Project Structure

- `src/` — Application source code
  - `main.ts` — Entry point
  - `scenes/` — Phaser scenes (Boot, Preload, Menu, Level)
  - `engine/` — Core game logic (BKT, router)
  - `components/` — UI components
  - `persistence/` — Dexie database schemas/repositories
  - `validators/` — Answer validators for activity archetypes
  - `types/` — TypeScript type definitions
- `public/` — Static assets including `curriculum/v1.json` (served for PWA cache)
- `src/curriculum/bundle.json` — Static copy of curriculum bundled at build time (avoids network fetch)
- `docs/` — Project documentation and curriculum specs
- `tests/` — Vitest unit tests and Playwright e2e tests
- `scripts/` — Build utilities

## Development

The app runs as a pure frontend (no backend). Use `npm run dev:app` to start the Vite dev server on port 5000.

## Deployment

Configured as a static site. Build with `npm run build` (output goes to `dist/`).
The `prebuild` step runs `build:curriculum` to generate `public/curriculum/v1.json`.

## Menu UI — Sunshine Split-Horizon

`MenuScene.ts` uses an illustrated "split-horizon" layout designed for ages 5–8:
sky-blue top zone with a chunky title and spinning sun, drifting clouds, a
yellow fraction-face mascot straddling a wavy horizon line, and big chunky
3D-shadow buttons (`Play!`, optional `Continue`, `Settings`) in the green
action zone.

- Title font is **Fredoka One** (self-hosted in `public/fonts/`); body text
  uses **Nunito** (400/700, also self-hosted). Per the privacy notice no
  third-party font services are called at runtime.
- All decoration (sun spin, cloud drift, character bob) is gated on
  `prefers-reduced-motion: reduce` and stops on scene shutdown.
- The original mockup lives at
  `artifacts/mockup-sandbox/src/components/mockups/menu-variants/Layout2Horizon.tsx`
  (kept for reference; safe to delete once design is locked).
- Test hooks (`level-card-L1`, `L6`, `L7`) are unchanged so existing
  Playwright selectors keep working.
