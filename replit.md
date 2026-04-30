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
  - `scenes/` — Phaser scenes (Boot, Preload, Menu, LevelMap, Level01, Level, Settings)
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

## Menu UI — Number Line Quest

`MenuScene.ts` uses a "number line as a journey" layout designed for ages 5–8:
the menu's composition itself enacts fractions. A wavy snake-path travels from
position **0** at the bottom (Play, big yellow) through position **½** in the
middle (Continue, emerald — only shown for returning students) to position **1**
at the top (Settings, blue circle). Each station has a chunky 3D-shadow button
and a fraction badge above it. Pale sky background with two soft glow circles.

- Title font is **Fredoka One** (self-hosted in `public/fonts/`); body text
  uses **Nunito** (400/700, also self-hosted). Per the privacy notice no
  third-party font services are called at runtime.
- The path is drawn from a single bezier sample and gets a wide light-blue
  base stroke plus marching white dashes on top. Dash motion is gated on
  `prefers-reduced-motion: reduce` and the per-frame tick handler is removed
  on scene shutdown.
- The approved mockup lives at
  `artifacts/mockup-sandbox/src/components/mockups/menu-variants/NumberLineQuest.tsx`
  (kept for reference; safe to delete once design is locked).
- Test hooks (`level-card-L1`, `L6`, `L7`) are unchanged so existing
  Playwright selectors keep working. The `level-card-L1` overlay was moved
  to `top: 86%` to track the new Play! button position.

## Adventure Map — LevelMapScene

`LevelMapScene.ts` sits between `MenuScene` and the level scenes. The Play! and
"Choose Level" buttons on the menu now navigate here instead of jumping directly
into a level. From the map, players tap a node to launch that level.

- **Path**: 9 circular nodes arranged in a snake pattern across the full canvas.
  A wide PATH_BLUE track with animated white dashes connects them.
- **Node states**:
  - *Completed* — amber circle with ⭐ (still tappable for replay)
  - *Unlocked/current* — emerald circle with level number + name; gentle
    scale-pulse tween; ▶ Play pill label below
  - *Locked* — gray circle with 🔒, non-interactive
- Completion status is read from the `unlockedLevels` localStorage key (same
  source as the rest of the game). A level is "completed" when the next level
  key is present.
- Fade transitions (prefers-reduced-motion aware) on both arrival and departure.
- "← Menu" back button returns to MenuScene.
- Full WCAG A11yLayer DOM mirror for keyboard/screen-reader users.
- The old inline "Choose a Level" 3×3 overlay in MenuScene was removed; it is
  now fully replaced by LevelMapScene.
