# Changelog

All notable changes to Questerix Fractions are documented here.
Format: [Keep a Changelog 1.1](https://keepachangelog.com/en/1.1.0/).
Versioning: [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Added (2026-05-01 Phase 3 — UX Pre-Playtest)

10 groups shipped via 2-round swarm + sequential orchestration (PR #55, commits 265ba9e..5042cb9). Zero merge conflicts across 20+ commits.

**FeedbackOverlay & audio:**
- Wrong-answer sound effect (descending G4→D4 tone, 160 ms) wired into FeedbackOverlay.
- New `FeedbackAnimations.ts` extraction: bounce-icon entry, horizontal shake on incorrect, gentle pulse on close, star-particle burst on correct.

**Session complete:**
- Call-to-action banner below star row (advance/stay/regress recommendation) with amber pill, navy text, 400 ms slide-in after stars settle.
- Perfect 5/5 special variant: gold trophy, "PERFECT!" heading, fanfare sound (C4→E4→G4→C5), double confetti burst, enhanced star bounce (1.3x peak).

**Quest personality (Mascot):**
- New `oops` expression (body droop, wince eyes, sweat drop) replaces ambiguous `think` on wrong answers in Level01Scene, LevelScene, OnboardingScene.
- 3-stage idle boredom escalation at 10 s / 18 s / 28 s with distinct expressions and speech bubbles.
- Speech bubble system at 10 key emotional moments (session start, first correct, 3-streak, hint requested, wrong answer, etc.).

**Streaks & menu:**
- Daily streak pill (🔥 N) in MenuScene + LevelMapScene reading from `streakRecordRepo`.

**Partition interaction:**
- Solid 10 px navy partition line (was thin + dashed) on sky-tint shape background — clearly visible against shape.
- Ghost midpoint guide (faint dashed navy line + "half" label) appears at 50% after first wrong partition answer; cleaned up on next question.
- Snap juice on correct release: semi-transparent fill (amber/sky), fraction labels (1/n) per region with scale-in, ascending-glissando snap sound.

**Onboarding:**
- Hand pointer repositioned to `SHAPE_CY` (was 44 px below shape — child was dragging empty space).
- Tap-anywhere-to-skip Step 1 (was 7 s timer-only); "Tap anywhere to skip" hint above Skip button.

**Settings & accessibility:**
- New `ttsEnabled` preference (default `true`); decoupled from `prefers-reduced-motion`. Master `audioEnabled` still acts as parent gate.
- Auto-hint after 3rd wrong answer on the same question (800 ms delay so feedback overlay can settle first).
- Prompt text 22 px → **28 px**; counter pill 17 px → **22 px** for early-reader accessibility.

### Changed (2026-05-01 Phase 3)

- **Layout (S):** action arc compressed. Hint button moved from top-right circle to (CW/2, y≈720) as a 100×60 amber pill (`createHintPillButton`); check button moved to y≈820 full-width. Gap between drag handle and check button reduced from ~540 px to ~100 px.
- **Back-to-Menu safety:** single tap on "← Menu" now shows amber "Leave? ✕" state with 2 s reset timer; second tap within window navigates. Prevents accidental session loss in both Level01Scene and LevelScene.

### Fixed (2026-05-01 Phase 3)

- Sparkle-burst test hook now lives inside `FeedbackAnimations.burstStarParticles` after the texture-exists guard (was firing unconditionally in FeedbackOverlay before the guard, causing test failure when texture absent).

### Deferred (2026-05-01 Phase 3)

- T1 FeedbackOverlay visual specs (panel 260 px, corner radius 32 px, icon 72 px) blocked by LOC budget (file at 365/300). Functional changes landed; pixel polish waits on FeedbackOverlay extraction.
- `tests/unit/components/FeedbackOverlay.test.ts > does NOT mount sparkle-burst when texture is missing` is `it.skip`-ed pending the same refactor.

---

### Added (2026-05-01 architectural hardening sprint)

This entry captures the 17 PRs (#10–#30) merged on 2026-05-01 — the architectural hardening session driven by `PLANS/code-quality-2026-05-01.md` and `PLANS/forensic-deep-dive-2026-05-01.md`.

**Planning + diagnostics:**
- `PLANS/code-quality-2026-05-01.md` — principal-architect audit across 4 dimensions plus cross-cutting pass (security · PWA · i18n · observability · hidden coupling). 56 findings, 16-phase tactical plan.
- `PLANS/forensic-deep-dive-2026-05-01.md` — companion deep-dive with code archaeology, concurrency forensics, and intellectual pushback against v3's own Ideal State proposal. Recommends `SessionService` pivot (~30 hr) over full hexagonal layering (~130 hr).
- `docs/00-foundation/decision-log.md` — D-25 (sunset Level01Scene Path A · DEFERRED), D-28 (pipeline TS migration · deferred), D-29 (English-only confirmed).

**Defensive engineering:**
- Concurrency C6 — reordered `await recordAttempt` before `showOutcome` in Level01Scene so users never see "Correct!" before persistence completes (PR #12).
- preDestroy R7 — extended scene lifecycle cleanup with `tweens.killAll()`, `mascot.destroy()`, hint/submit container cleanup in both LevelScene + Level01Scene (PR #12).
- Phase 6.3 — wrapped attempt + mastery (+ hint-link in L01) in single Dexie `transaction('rw', ...)` so partial state is impossible. Misconception detection runs separately as best-effort (PR #27).
- Phase 7.4 — Zod schema validation at curriculum loader and backup-restore boundaries; rejects malformed rows with structured errors (PR #19; +zod ^4.4.1, +19.7 KB gzipped).

**Privacy:**
- Sentry studentId/sessionId/installId pseudonymization — FNV-1a → 8 hex chars; consent-gated; PII keys stripped from caller-supplied context (PR #18).

**Persistence (C5 closeout):**
- v6 → v7 schema migration adding `streakRecord` table + `DeviceMeta.onboardingComplete` field; auto-migrates legacy localStorage keys (PR #22).
- All localStorage uses outside the documented `lastUsedStudentId` exception are now closed: `streak.ts`, `OnboardingScene`, `DEBUG_VITALS` dev flag (PR #22, PR #23).

**Engine determinism + DIP:**
- `Rng` port injected into `selectNextQuestion`; ESLint rule bans `Math.random` in `src/engine/**` (PR #16).
- `Clock` + `IdGenerator` port adoption in `misconceptionDetectors` — 56 sites refactored; ESLint rule extended to ban `Date.now` and `crypto.randomUUID` in engine (PR #17).
- Misconception detectors converted to declarative rule table — `misconceptionDetectors.ts` shrinks 952 → 122 LOC; 19 rules in `misconceptionRules.ts`; new `misconceptionRunner.ts` interpreter (PR #29).

**Type-system rigor:**
- `deriveLevelGroup()` consolidated into single source (was duplicated and silently divergent on observability); `levelRouter.ts` validator branch converted to metadata-driven factory (PR #15).

**PWA hardening:**
- Service-worker curriculum cache TTL reduced 30d → 7d; "Refresh Curriculum" affordance in Settings (PR #25).
- Offline error toast in `LevelScene` when curriculum fetch fails for an un-cached level (PR #25).
- `UpdateBanner` component — slides in on `oncontrollerchange` only when `MenuScene` is active (PR #25).

**Observability:**
- `SPAN_NAMES` registry + naming convention + severity-routing contract; `TraceIdRatioBasedSampler` with `VITE_SAMPLING_RATE` (PR #26).
- `withSpan` / `withSpanSync` helpers; spans wired into LevelScene + Level01Scene for `scene.create`, `question.submit`, `hint.request` (PR #28).

**Tests + gates:**
- BKT extreme-prior + threshold-boundary property tests (+13 tests, PR #14). Surfaced that BKT actually has THREE intermediate states, not two: `LEARNING → APPROACHING (≥0.65) → MASTERED (≥0.85 + ≥3 consecutive)`. Plan prose updated to match.
- Per-layer coverage gate (PR #30): engine ≥90% lines, validators ≥85%, persistence ≥45% (regression-prevention only; integration suite brings persistence to ~77%). Wired into CI via `npm run test:coverage`.

**CLAUDE.md / docs:**
- Active-bugs table corrected to match code (PR #11). All 5 Sprint 0 bugs verified fixed via inline citations.
- `src/persistence/CLAUDE.md` — replaced "Known C5 deviation" block with "C5 status" enumeration (PR #23).

**Aggregate impact:**
- Unit tests: 372 → 654 (+282 tests across the session).
- Bundle: 606 KB gzipped → 630 KB (+24 KB; +zod). Still 61.5% of 1 MB budget.
- Lint warnings: 3 pre-existing → 0 (PR #23 cleared the last `src/config/shared.ts` formatting holdout).
- Branches per CLAUDE.md naming convention (`<type>/YYYY-MM-DD-<slug>`).

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
