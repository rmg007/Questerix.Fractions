# Changelog

All notable changes to Questerix Fractions are documented here.
Format: [Keep a Changelog 1.1](https://keepachangelog.com/en/1.1.0/).
Versioning: [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Added

- Public `about.html` static page linked from `index.html`
- Keyboard-accessible nav in `index.html` (skip-to-content + About / Privacy links)
- `CHANGELOG.md`, `CONTRIBUTING.md`, `LICENSE` (MIT)

---

## [0.1.0] — 2026-04-25

Phase 1 build complete: foundation docs locked, Phaser scaffold running, content pipeline operational, test suite at 122+ units.

### Added

- **Foundation documentation suite** — 36 documents across 6 directories (`00-foundation` through `50-roadmap`), written and cross-audited. Covers constraints C1–C10, vision, glossary, decision log D-01–D-20, open-questions register, risk register, curriculum scope and sequence, CCSS standards map, 9 per-level specs (L1–L9), activity archetypes, design language, interaction model, full architecture stack, data schema, persistence spec, runtime architecture, content pipeline spec, test strategy, accessibility commitments, performance budget, 4 validation docs, and 2 roadmap docs.
- **Phaser 4 game scaffold** — TypeScript strict-mode project, Vite dev server, Tailwind v4, LevelScene config-driven architecture. (D-14, C4)
- **Content pipeline** — Python pipeline (`pipeline/`) that generates `QuestionTemplate` records for each activity archetype; uses Claude Haiku 4.5 for generation and Sonnet 4.6 for editorial polish; programmatic validator clones verify math correctness before output. (D-11, D-12, D-13)
- **Test suite** — 122+ unit tests (Vitest), integration tests, E2E smoke suite (Playwright), property-based tests, and parity validators ensuring pipeline output matches runtime type contracts. (D-14)
- **Dexie 4 persistence layer** — IndexedDB schema with `navigator.storage.persist()` and JSON export/backup. (D-07, C5)
- **PWA manifest** — installable app, works offline for local assets, theme color `#2F6FED`.
- **Design language** — flat + bright palette replacing deprecated neon Cosmic Blue / Cyan / Pink from original prototype. Palette tokens in `docs/20-mechanic/design-language.md`. (D-04, C6)
- **Accessibility baseline** — WCAG 2.1 AA commitments documented; skip-link pattern, focus management, 44×44 touch targets, `prefers-reduced-motion` respected. (C7)
- **Privacy notice** — parent-readable notice confirming no data leaves the device. (`docs/40-validation/privacy-notice.md`, C1)
- **Nunito font** — served from `/public/fonts/` under OFL license. No external font requests.
- **Skill ID registry** consolidated into `docs/10-curriculum/skills.md` (D-16).
- **`archetype` terminology** adopted as single canonical term replacing `Mechanic` / `QuestionType` (D-17).
- **Risk register** `docs/00-foundation/risk-register.md` with R-NN entries and mitigations.
- **Performance budget** — 1.0 MB gzipped total, documented per-slice in `docs/30-architecture/performance-budget.md`.

### Changed

- Constraint C8 rewritten as two-axis denominator × verb progression (D-09).
- `_quarantine/` established for deprecated RoadMap folders 04 & 05 and enterprise template artifacts (D-10).
- Level 4 spec: set-halving goal G4.5 removed (D-18); hint ladder pruned to 3-tier `verbal | visual_overlay | worked_example` (D-19).

### Removed

- Inherited LangGraph plan rejected and not incorporated (D-11).
- Neon Cosmic Blue / Cyan / Pink palette deprecated from `src/data/config.ts` (D-04, C6).

---

[Unreleased]: https://github.com/ryanmidogonzalez/questerix-fractions/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/ryanmidogonzalez/questerix-fractions/releases/tag/v0.1.0
