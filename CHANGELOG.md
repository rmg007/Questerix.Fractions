# Changelog

All notable changes to Questerix Fractions are documented here.
Format: [Keep a Changelog 1.1](https://keepachangelog.com/en/1.1.0/).
Versioning: [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Added

- **Claude Code agent harness** — committed `CLAUDE.md` (root + 8 nested subtree guides), `.claude/settings.json` with SessionStart/PreCompact/PostToolUse hooks and allow/ask/deny tiers, 9 slash commands (`/preflight`, `/sync-curriculum`, `/diag`, `/learn`, `/retro`, `/sprint-status`, `/c5-check`, `/test-changed`, `/decision`), 4 specialist subagents (`c1-c10-auditor`, `bundle-watcher`, `validator-parity-checker`, `a11y-auditor`), `.claude/learnings.md` append-only gotcha log, `AGENTS.md` router for Codex/Aider/Cursor.
- `scripts/agent-doctor.mjs` — 21-check harness validator; exits 1 on failure; wired to `npm run agent-doctor`.
- `.github/dependabot.yml` — weekly npm/pip/actions Dependabot; Phaser/Dexie/Vite pinned to avoid C4 violations.
- `PLANS/work-queue-2026-04-30.md` — ordered P1–P4 implementation plan for Sprint 0 exit.
- `PLANS/INDEX.md` entry for work-queue-2026-04-30.
- CI step: `npm run agent-doctor` after install.

### Changed

- `CONTRIBUTING.md` removed (solo project; replaced by agent harness docs).
- `README.md` slimmed to 30-line router; stale "Pre-MVP" status fixed; broken doc link corrected.
- `package.json`: added `engines.node >=20.0.0` and `agent-doctor` npm script.
- `.npmrc`: `engine-strict=true`.
- `docs/INDEX.md`: added hint-system and KEYBOARD_BINDINGS entries; bumped `last_reviewed`.
- Lighthouse CI workflow: Node 20 → 24; removed redundant `--legacy-peer-deps`.
- 13 stale `.claude/*.md` session reports archived to `.claude/_archive/`.
- 12 orphan hint-generation scripts archived to `.claude/_archive/scripts/`.
- 8 superseded `PLANS/phase-*` docs archived to `PLANS/_archive/`.

### Fixed

- **OTel/Sentry lazy imports (P1)** — `@sentry/browser` (141 KB gzip) and 7 OTel SDK packages (~25 KB gzip) converted from static to dynamic `import()`. Both now excluded from the initial bundle when no DSN or `VITE_OTLP_URL` is configured (default MVP builds). `initObservability()` made async; `Promise.allSettled` isolates boot failures.

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
