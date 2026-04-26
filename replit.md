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
- `public/` — Static assets including `curriculum/v1.json`
- `docs/` — Project documentation and curriculum specs
- `tests/` — Vitest unit tests and Playwright e2e tests
- `scripts/` — Build utilities

## Development

The app runs as a pure frontend (no backend). Use `npm run dev:app` to start the Vite dev server on port 5000.

## Deployment

Configured as a static site. Build with `npm run build` (output goes to `dist/`).
The `prebuild` step runs `build:curriculum` to generate `public/curriculum/v1.json`.
