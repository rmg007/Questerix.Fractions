# Questerix Fractions

A small browser-based math game that teaches K–2 fraction concepts through tactile drag-and-tap mechanics. **Pre-MVP — pure planning phase.**

## Status

🚧 Foundation documentation in progress. No new code is being written until the documentation suite under [`/docs`](./docs/) is complete and reviewed.

## What This Is

See [`docs/00-foundation/vision.md`](./docs/00-foundation/vision.md) for the one-paragraph thesis.

## How To Navigate The Docs

Start with **[`docs/INDEX.md`](./docs/INDEX.md)** — full map of all 30 documents in reading order.

Quick jumps:
- **[Constraints](./docs/00-foundation/constraints.md)** — the gate (C1–C10)
- **[Vision](./docs/00-foundation/vision.md)** — what success looks like
- **[Decision Log](./docs/00-foundation/decision-log.md)** — D-01 through D-15
- **[Open Questions](./docs/00-foundation/open-questions.md)** — what still needs answering
- **[MVP Roadmap](./docs/50-roadmap/mvp-l1-l9.md)** — phases and gates
 - **[Roadie Installation](./docs/ROADIE_INSTALLATION.md)** — local dev tool install instructions

## Project Structure

```
docs/                  Foundation documentation (31 active docs). Read first.
src/                   Phaser 4 source code + TypeScript
curriculum-source/     Reference pedagogy docs (Levels 3–9). Being progressively
                       migrated into docs/ during Phase 1.
tests/                 Test suite (Vitest + Playwright)
package.json           Phaser 4 + TypeScript + Vite + Tailwind v4
```

## Tech Stack

- **Phaser 4** — game scenes
- **TypeScript** — strict mode, project-wide
- **Vite** — dev server and production build
- **Tailwind CSS v4** — non-game UI surfaces
- **Dexie.js** — IndexedDB persistence (planned, not yet wired)
- **No backend** until 2029 (per [C1](./docs/00-foundation/constraints.md))

## Documentation Files

**Active docs** (foundation, curriculum, mechanics, architecture, validation, roadmap):
- Start with `docs/INDEX.md` for the complete map of all 31 documents
- Locked constraints: `docs/00-foundation/constraints.md`
- MVP roadmap: `docs/50-roadmap/mvp-l1-l9.md`

**Reference materials** (pedagogy source being migrated):
- `curriculum-source/levels-3-5_pedagogy/` — philosophical & activity blueprints for Levels 3–5
- `curriculum-source/levels-6-9_pedagogy/` — philosophical & activity blueprints for Levels 6–9

## Contributing

This is a solo validation project in Phase 1 build. The goal is to test whether magnetic-drag mechanics teach K–1 fractions better than traditional methods.

## License

To be determined. Not yet open-sourced.

---

## Next: Phase 1 Build

Start with [`docs/50-roadmap/mvp-l1-l9.md`](./docs/50-roadmap/mvp-l1-l9.md) for the MVP roadmap. Phase 1 focuses on building Levels 1–3 and authoring question banks. See [Constraints](./docs/00-foundation/constraints.md) (C1–C10) for the locked scope.
