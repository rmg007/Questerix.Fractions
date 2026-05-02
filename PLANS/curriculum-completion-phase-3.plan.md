---
name: curriculum completion & phase 3 readiness
overview: 'End-to-end remediation: complete curriculum (150→288), fix 14 concrete validator/engine bugs, plug 4 memory leaks, ship a11y/PWA/offline, harden CI/tests, reconcile docs, and unblock Cycle A/B playtest. Every item below is grounded in a specific file:line.'
todos:
  # ── Phase 0: Curriculum content correctness (BLOCKING) ──────────────
  - id: c0-0-validator-align
    content: C0.0 Align v1.json validator IDs with registry.ts names; remove silent partitionEqualAreas fallback in LevelScene.ts:322; add registry whitelist check to verify.py
    status: pending
  - id: c0-0b-math-errors
    content: C0.0b Fix L9 order ascending (3/8,1/4,1/3 not monotonic), L6 snap_match correctAnswer 0.666→0.333 for frac:1/3, L1 strip thirds violating C8
    status: pending
  - id: c0-0c-dedup-ids
    content: C0.0c De-duplicate 51 IDs (128 instances); re-id pattern q:<archetype>:L<N>:<index>; rebuild bundle
    status: pending
  - id: c0-0d-skill-ids-l6
    content: C0.0d Remap L6 skillIds (uses SK-18-21, L5 skills); adopt SK-21,22,23 per skills.md:60; audit L7-L9 for SK-24-33
    status: pending
  - id: c0-0e-standardids-field
    content: C0.0e Tag all 150 templates with standardIds (CCSS-M codes); remove `as any` cast at seed.ts:205; required by schemas.py:146
    status: pending
  - id: c0-0f-skills-seed
    content: C0.0f Extend bundle format with skills[] array; teach loader.ts:92 to populate db.skills; current seed.ts:188-190 silently no-ops
    status: pending
  - id: c0-0g-loader-validation
    content: C0.0g Replace loader.ts:77 bare `as` cast with Zod schema validation; surface errors via AccessibilityAnnouncer + modal
    status: pending
  - id: c0-0h-verify-checks
    content: C0.0h Add 5 checks to verify.py:260 - check_unique_ids, check_skill_ids_resolve, check_standards_coverage, check_correct_answers_well_formed, check_c8_denominator_family + --strict flag

    status: pending

  # ── Phase 0: Hand-author content ───────────────────────────────────
  - id: c0-1-l8-hand
    content: C0.1 Hand-author 28 benchmark templates (L8) with 7 base benchmarks × 4 difficulty tiers; varied numerator pools + distractor types
    status: pending
  - id: c0-2-l9-hand
    content: C0.2 Hand-author 26 order/placement templates (L9); 13 order + 13 placement; varied denominator sets and difficulty tiers
    status: pending
  - id: c0-3-l1-expand
    content: C0.3 Expand L1 partition+identify from 12→24 (broader Cycle A sample); halves only per C8
    status: pending

  # ── Phase 1: LLM regeneration with parameterization ────────────────
  - id: c1-1-l3-regen
    content: C1.1 Regenerate L3 identify+label (18→36) - hand-author 10 bases + parameterize 30 + LLM top-up 6
    status: pending
  - id: c1-2-l4-regen
    content: C1.2 Regenerate L4 make+partition (11→36) - tighter prompts requiring unique denominators per template
    status: pending
  - id: c1-3-l5-regen
    content: C1.3 Regenerate L5 make+partition (27→36) - apply parameterization tooling
    status: pending
  - id: c1-4-l6-regen
    content: C1.4 Regenerate L6 compare+snap_match (28→36) with required denominator pairs (2,4)(3,6)(2,3)(3,5)(4,8)(5,10) + WHB-01 distractors
    status: pending
  - id: c1-5-l7-regen
    content: C1.5 Regenerate L7 compare+label (12→36) - explicit (numerator,denominator) uniqueness instruction
    status: pending

  # ── Phase 2: Bundle, deduplicate, verify ───────────────────────────
  - id: c2-1-bundle-merge
    content: C2.1 Merge hand-authored + regenerated + expanded into v1.json via build-curriculum.mjs; preserve order; apply LEVEL_ARCHETYPES filter
    status: pending
  - id: c2-2-dedup-audit
    content: C2.2 Run pipeline/scripts/audit-dedup.py; flag any level with >50% payload duplication
    status: pending
  - id: c2-3-archive-old
    content: C2.3 Archive intermediate files to pipeline/archive/level-NN-<timestamp>/; gitignore pipeline/output/
    status: pending

  # ── Phase 3: Validation, standards, hints ──────────────────────────
  - id: c3-1-validate-schema
    content: C3.1 Run validation-data/scripts/check.py --schema-only on v1.json; assert 0 errors
    status: pending
  - id: c3-1b-strict-checks
    content: C3.1b Run verify.py --strict; assert all 12 checks pass
    status: pending
  - id: c3-2-coverage-test
    content: C3.2 Run curriculum.test.ts; verify each level ≥32 templates, all archetypes present, no duplicate IDs
    status: pending
  - id: c3-3-archetype-audit
    content: C3.3 Run pipeline/scripts/audit-archetypes.py; verify per-level counts match LEVEL_ARCHETYPES
    status: pending
  - id: c3-3b-standards-map
    content: C3.3b Add standardIds field to TS QuestionTemplate; verify CCSS-M coverage per check_standards_coverage
    status: pending
  - id: c3-3c-c8-alignment
    content: C3.3c Audit C8 denominator progression per-level; reauthor or relax-spec; document deltas in decision-log D-17+
    status: pending
  - id: c4-1-hint-gen
    content: C4.1 Run pipeline/hints.py --all (288 templates × 3 tiers = 864 hints); current state has only 213 hints (L1 only)
    status: pending
  - id: c4-2-hint-counts
    content: C4.2 Sync HINTS_README.md, .claude/CLAUDE.md, decision-log to truth; remove hardcoded numbers; emit count from build-curriculum.mjs
    status: pending
  - id: c4-3-hint-validation
    content: C4.3 Sample 5 hint cascades per level (45 total); verify ≤15 words, uniqueness across tiers, complexity progression T1<T2<T3
    status: pending
  - id: c4-4-hint-tier-types
    content: C4.4 ALL 213 hints currently type=verbal only; generate visual_overlay (T2) + worked_example (T3) per HintLadder.ts:11-14 spec
    status: pending
  - id: c4-5-hintladder-state
    content: C4.5 Fix HintLadder.next() at line 49 - can re-show T3 indefinitely; clamp tier and reset on next question
    status: pending

  # ── Phase 4: Validator & engine bug fixes ──────────────────────────
  - id: c4b-1-partition-divzero
    content: C4b.1 partition.ts:42-43 - guard against avg<=1e-9 to prevent Infinity in relativeDelta
    status: pending
  - id: c4b-2-compare-whb02
    content: C4b.2 compare.ts:46 - MC-WHB-02 inverted logic (should be leftDecimal>rightDecimal); detector triggers on correct answers
    status: pending
  - id: c4b-3-snapmatch-deterministic
    content: C4b.3 snap_match.ts:39-44 - replace dual-set lookup with canonical pair tracking; ambiguous pair semantics
    status: pending
  - id: c4b-4-placement-clamp
    content: C4b.4 placement.ts:27 - clamp partial-credit score to [0,1] via Math.max(0,...); negative scores possible
    status: pending
  - id: c4b-5-label-asymmetric
    content: C4b.5 label.ts:38-40 - fix asymmetric counting on duplicate regionId mappings
    status: pending
  - id: c4b-6-order-partial-gap
    content: C4b.6 order.ts:40-41 - off-by-one in maxSwaps; partial credit gap (swaps=1 returns 0.5, but swaps>1 never reaches 0.5 for n≤3)
    status: pending
  - id: c4b-7-bkt-paramcheck
    content: C4b.7 bkt.ts:102-108 - predictCorrect() ignores degenerate case where pGuess=0 and pSlip=1 (returns 0 always); add param validation
    status: pending
  - id: c4b-8-selection-zpd
    content: C4b.8 selection.ts:72,81 - ZPD boundary mismatch (strict inequality) creates dead zones at p=0.4, p=0.85
    status: pending
  - id: c4b-9-calibration-silent
    content: C4b.9 calibration.ts:57 - silent null return on empty skills; log warning + emit telemetry event
    status: pending
  - id: c4b-10-misconceptions-evidence
    content: C4b.10 misconceptionDetectors.ts:45-46 - evidenceAttemptIds truncated to 3 but observationCount counts all; replay/audit broken
    status: pending
  - id: c4b-11-seed-regex-crash
    content: C4b.11 seed.ts:26-27 - unguarded match[1]! crashes on malformed IDs; use match?.[1] or default fallback
    status: pending
  - id: c4b-12-db-compound-index
    content: C4b.12 db.ts:105 - add [studentId+resolvedAt] compound index for unresolved-misconception queries
    status: pending
  - id: c4b-13-backup-devicemeta
    content: C4b.13 backup.ts:145-153 - validate incoming deviceMeta on restore or merge preferences; currently silent loss across devices
    status: pending
  - id: c4b-14-backup-conflict
    content: C4b.14 backup.ts:127-137 - distinguish PK collision from constraint violation; emit warnings; surface count to user
    status: pending

  # ── Phase 5: Scene/component memory leaks (CRITICAL for synthetic 100-session) ──
  - id: c5-1-draghandle-leak
    content: C5.1 DragHandle.ts:120 - keyboard listener never removed in destroy(); leak per drag attempt
    status: pending
  - id: c5-2-pref-toggle-leak
    content: C5.2 PreferenceToggle.ts:140-146 - DOM listeners not detached on destroy(); 15 orphaned listeners after 5 Settings visits
    status: pending
  - id: c5-3-feedback-overlay-l01
    content: C5.3 Level01Scene.ts:853 preDestroy() does not destroy FeedbackOverlay (created at line 160); ~16KB leak per session
    status: pending
  - id: c5-4-feedback-overlay-ls
    content: C5.4 LevelScene.ts:563 preDestroy() does not destroy FeedbackOverlay (created at line 104); affects L2-L9
    status: pending
  - id: c5-5-phaser-lifecycle
    content: C5.5 Both scenes use preDestroy() but Phaser 4 doesn't call it; replace with this.events.once(SHUTDOWN/DESTROY,cleanup)
    status: pending
  - id: c5-6-delayedcall-orphan
    content: C5.6 Level01Scene.ts:674-676 - chained time.delayedCall in animateWorkedExample fires after scene shutdown; track and remove on cleanup
    status: pending
  - id: c5-7-modal-focus
    content: C5.7 Level01Scene.ts:773-787 modal close doesn't restore focus; keyboard navigation broken after 2nd modal close
    status: pending
  - id: c5-8-pref-toggle-ssr
    content: C5.8 PreferenceToggle.ts:55-73 unguarded document access; breaks SSR/SSG builds
    status: pending

  # ── Phase 6: Accessibility (C7 + WCAG AA) ──────────────────────────
  - id: c6-1-link-contrast
    content: C6.1 SettingsScene.ts:286 privacy link #6C63FF on white = 4.08:1 (fails AA 4.5:1); darken to #5848D6 for 5.2:1
    status: pending
  - id: c6-2-back-button-hit
    content: C6.2 Level01Scene.ts:269 + LevelScene.ts:213 back button text-only; add explicit Phaser.Geom.Rectangle 44×44 hitArea per C7
    status: pending
  - id: c6-3-warning-contrast
    content: C6.3 colors.ts:25 warning #F2A93B 3.2:1 dormant violation; darken before any text usage
    status: pending
  - id: c6-4-prefs-runtime
    content: C6.4 Honor DeviceMeta.preferences.reduceMotion at runtime; current checkReduceMotion() consults only matchMedia, ignores DB
    status: pending
  - id: c6-5-high-contrast
    content: C6.5 Add prefers-contrast detection to DeviceMeta; runtime color swap for high-contrast users
    status: pending
  - id: c6-6-canvas-aria
    content: C6.6 SkipLink.labelCanvas() add aria-label, role=application, data-testid=phaser-canvas (test selector at wcag.spec.ts:53 fails)
    status: pending
  - id: c6-7-pref-toggle-target
    content: C6.7 PreferenceToggle.ts:97-107 expand hit area to ≥44×44 (visual stays 52×28)
    status: pending
  - id: c6-8-canvas-keyboard
    content: C6.8 Document Phaser canvas keyboard bindings (drag/submit); switch-access users currently blocked
    status: pending
  - id: c6-9-announcer-double
    content: C6.9 AccessibilityAnnouncer.destroy() called twice across both scenes; idempotent but wasteful
    status: pending

  # ── Phase 7: Runtime correctness (engine wiring) ───────────────────
  - id: c7-1-mc-eol
    content: C7.1 Add MC-EOL-01 detector to misconceptionDetectors.ts; logic in equal_or_not.ts:38-44 never invoked
    status: pending
  - id: c7-2-detectors-wired
    content: C7.2 Wire runAllDetectors() into LevelScene.onCommit; write to misconceptionFlagsRepo on each attempt
    status: pending
  - id: c7-3-misconception-coverage
    content: C7.3 Expand misconceptionTraps - currently only 4 unique MCs across 150 templates; target ≥10 (full catalog)
    status: pending
  - id: c7-4-session-telemetry-repo
    content: C7.4 Create src/persistence/repositories/sessionTelemetry.ts with start/recordEvent/end methods per in-app-telemetry.md schema
    status: pending
  - id: c7-5-localstorage-key
    content: C7.5 Fix BootScene.ts:12,64,74,79 localStorage 'lastUsedStudentId' vs lastUsedStudent.ts:10 'questerix.lastUsedStudentId'
    status: pending
  - id: c7-6-lastused-set
    content: C7.6 lastUsedStudent.set() never called from src/; add at session start in Level01Scene + LevelScene after studentId finalized
    status: pending
  - id: c7-7-py-validator-parity
    content: C7.7 Python registry missing label.exactMatch + make.foldAlignment impls; add _py functions; mirror TS field-for-field
    status: pending
  - id: c7-8-hintladder-events
    content: C7.8 Wire HintLadder onHintShown/onHintApplied → hintEventRepo with 5/15/30 score penalty per interaction-model.md §4.1
    status: pending
  - id: c7-9-template-load-fallback-ui
    content: C7.9 LevelScene.ts:144-149 silent fallback to synthetic on DB failure; add error UI + retry button
    status: pending

  # ── Phase 8: PWA, offline, performance ─────────────────────────────
  - id: c8-1-pwa-default
    content: C8.1 vite.config.ts:8 - PWA disabled unless PWA=1; enable in production builds; offline expected per C5
    status: pending
  - id: c8-2-offline-fallback
    content: C8.2 Add offline index.html fallback + curriculum runtimeCaching (cache-first, contentVersion bust)
    status: pending
  - id: c8-3-offline-banner
    content: C8.3 Add navigator.onLine listener; render offline banner so user knows state
    status: pending
  - id: c8-4-storage-persist-warn
    content: C8.4 db.ts:125 ensurePersistenceGranted() swallows false; emit dev console warning when denied
    status: pending
  - id: c8-5-pwa-icons-verify
    content: C8.5 Verify all PWA icons exist (192/512/maskable variants in public/icons/) and manifest.json refs match
    status: pending
  - id: c8-6-treeshake
    content: C8.6 vite.config.ts add explicit rollupOptions.output.minify config; current bundle size 1.35MB (351KB gz) acceptable
    status: pending
  - id: c8-7-backup-toarray
    content: C8.7 backup.ts toArray() scales linearly with session history; chunk export for >1000 sessions
    status: pending
  - id: c8-8-fout-foit
    content: C8.8 Add font-display:swap or preload-link for any custom fonts; current src/main.ts has no FOUT/FOIT mitigation
    status: pending
  - id: c8-9-lighthouse-vitals
    content: C8.9 lighthouserc.cjs add CLS≤0.1, INP≤200ms, TBT≤200ms assertions
    status: pending
  - id: c8-10-bundle-budget
    content: C8.10 Add bundle-budget.json or LHCI resource-summary assertion at 1MB total per performance-budget.md
    status: pending

  # ── Phase 9: CI / Tests / Build hardening ──────────────────────────
  - id: c9-1-ci-integration
    content: C9.1 Add npm run test:integration to ci.yml (currently runs only unit + e2e)
    status: pending
  - id: c9-2-ci-a11y
    content: C9.2 Add npm run test:a11y to ci.yml on every PR
    status: pending
  - id: c9-3-engine-tests
    content: C9.3 Add tests/unit/engine/calibration.test.ts, router.test.ts, selection.test.ts (currently 0 coverage)
    status: pending
  - id: c9-4-validator-property
    content: C9.4 Add fast-check property tests for every validator in tests/unit/validators/<name>.property.test.ts
    status: pending
  - id: c9-5-coverage-thresholds
    content: C9.5 Set vitest thresholds - lines≥80%, branches≥70%, validators+engine≥95%; enforce via --coverage in CI
    status: pending
  - id: c9-6-playtest-synthetic
    content: C9.6 Add playtest:synthetic + playtest:synthetic:quick scripts (workflow synthetic-playtest.yml:36 references missing)
    status: pending
  - id: c9-7-synthetic-memory
    content: C9.7 Extend tests/synthetic harness to track heap size across 100 sessions; detect leaks earlier
    status: pending
  - id: c9-8-ci-ergonomics
    content: C9.8 Add concurrency groups + timeout-minutes:20 + Playwright cache + pip cache to all 5 workflows
    status: pending
  - id: c9-9-pipeline-parity-ci
    content: C9.9 Wire pytest pipeline/parity_test.py into content-validation.yml; cover all 10 archetypes
    status: pending
  - id: c9-10-vitest-workspace
    content: C9.10 Migrate 4 vitest configs to vitest.workspace.ts; merge integration into default CI run
    status: pending
  - id: c9-11-mutation
    content: C9.11 Add Stryker for bkt/router/validators on weekly schedule (not per-PR)
    status: pending
  - id: c9-12-dependabot
    content: C9.12 Add .github/dependabot.yml + .github/workflows/security.yml (npm audit + pip-audit)
    status: pending

  # ── Phase 10: Tooling, configs, repo hygiene ───────────────────────
  - id: c10-1-tsconfig-strict
    content: C10.1 Enable noUncheckedIndexedAccess + noPropertyAccessFromIndexSignature; add tsconfig.tools.json for tests/configs
    status: pending
  - id: c10-2-eslint-prettier
    content: C10.2 Add ESLint (strict-type-checked) + Prettier (CONTRIBUTING.md:67 falsely claims .prettierrc exists)
    status: pending
  - id: c10-3-deps-placement
    content: C10.3 Move dexie devDeps→deps; remove unused @anthropic-ai/sdk; resolve .npmrc legacy-peer-deps
    status: pending
  - id: c10-4-gitignore
    content: C10.4 Add __pycache__, .roadie state, .claude logs/reports, pipeline/*.log to .gitignore; git rm --cached tracked
    status: pending
  - id: c10-5-nvmrc-editorconfig
    content: C10.5 Add .nvmrc=20 + .editorconfig (LF, 2-space, UTF-8); reconcile Node 20 vs 22 docs
    status: pending
  - id: c10-6-playwright-dedup
    content: C10.6 playwright.config.ts:51-56 remove duplicate Desktop Chromium project (same viewport as chromium:15-20)
    status: pending
  - id: c10-7-license-readme
    content: C10.7 Set license=MIT in package.json (currently ISC); rewrite README to match Phase 1 build state
    status: pending
  - id: c10-8-legacy-delete
    content: C10.8 Delete src/_legacy/ - LoggerSystem.ts:47 posts to /api/log violating C1 if ever imported
    status: pending
  - id: c10-9-help-folder
    content: C10.9 Delete --help/ folder at repo root (CLI invocation artifact)
    status: pending
  - id: c10-10-root-clutter
    content: C10.10 Move HINT_*.md, test_hints.py, Topics.docx out of root into docs/30-architecture/hint-system/
    status: pending
  - id: c10-11-pkg-metadata
    content: C10.11 Fill package.json keywords, author, repository, bugs, homepage
    status: pending
  - id: c10-12-logger
    content: C10.12 Add src/lib/logger.ts gated by __DEV__; replace ad-hoc console.* in production paths
    status: pending

  # ── Phase 11: Documentation reconciliation ─────────────────────────
  - id: c11-1-doc-index
    content: C11.1 README:15 says 31 docs, INDEX:91 says 36, actual ~29; reconcile to single authoritative count
    status: pending
  - id: c11-2-decision-log
    content: C11.2 README:20 says D-01-D-15; decision-log has D-20; close D-08, D-14; add D-16+ for plan decisions
    status: pending
  - id: c11-3-tbd-stale
    content: C11.3 Drop (TBD) markers - misconceptions.md:248, scope-and-sequence.md:141-142, playtest-protocol.md:116, in-app-telemetry.md:238 (all reference existing files)
    status: pending
  - id: c11-4-content-pipeline-doc
    content: C11.4 content-pipeline.md §2.2 output path drift (claims src/assets, actual public/curriculum); add hints.py stage
    status: pending
  - id: c11-5-status-active
    content: C11.5 After reconciliation, flip status:draft→status:active on docs that match code; sync CHANGELOG narrative
    status: pending
  - id: c11-6-roadmap
    content: C11.6 Walk mvp-l1-l9.md checkboxes; tick what's built; add open-questions answered by impl
    status: pending
  - id: c11-7-validation-data-readme
    content: C11.7 Create validation-data/README.md documenting data schema, import flow, validation scripts
    status: pending
  - id: c11-8-privacy-precision
    content: C11.8 privacy-notice.md:35 - precise wording about installId being local-only device id (not transmitted)
    status: pending
  - id: c11-9-contributing
    content: C11.9 CONTRIBUTING.md - test:unit doesn't include integration; npm run dev requires Roadie; document npm run dev:app
    status: pending

  # ── Phase 12: Cycle A & B playtest infrastructure ──────────────────
  - id: c12-1-cycle-a-recruit
    content: C12.1 Send recruitment emails to 5+ families (3-4 sessions); use validation-data/recruitment-template.md
    status: pending
  - id: c12-2-cycle-a-materials
    content: C12.2 Print consent-form-phase1.pdf, observer forms, pre/post-tests; per-pseudonym data folders
    status: pending
  - id: c12-3-cycle-a-protocol
    content: C12.3 Run dry-run with 1 internal tester before recruiting; calibrate timing, instrument capture
    status: pending
  - id: c12-4-cycle-a-execute
    content: C12.4 Execute 3-4 Cycle A sessions; capture observer notes + telemetry export; pseudonyms only
    status: pending
  - id: c12-5-cycle-a-analyze
    content: C12.5 Analyze Cycle A data per playtest-protocol.md; identify content/UX issues; schedule Cycle B
    status: pending
  - id: c12-6-cycle-b-formal
    content: C12.6 Plan Cycle B (formal validation, 8-10 students × 3 sessions); requires C9 telemetry pipeline live
    status: pending

  # ── Phase 13: Final gates ──────────────────────────────────────────
  - id: c13-1-gate-verify
    content: C13.1 All 5 GitHub workflows green; lint+test:unit+integration+e2e+a11y pass; verify.py --strict zero errors
    status: pending
  - id: c13-2-build-prod
    content: C13.2 npm run build with full curriculum; bundle ≤2.5MB (gz ≤600KB); preview boots; navigate L1-L9
    status: pending
  - id: c13-3-archive-report
    content: C13.3 Generate .claude/CURRICULUM_COMPLETION_REPORT.md - final counts, dedup loss %, archetype/standards/C8 compliance, hint coverage, Cycle A learnings
    status: pending
isProject: false
---

# Curriculum Completion & Phase 3 Readiness Plan

> **Scope:** Bring Questerix Fractions from current state (150 templates, validation broken in 4+ places, runtime engine partly disconnected) to **Cycle A playtest-ready and Cycle B-capable** state. Every fix is grounded in a specific file:line.

## Audit-confirmed situation

**Current state** (verified by deep audit, 2026-04-26):

- 150 templates in `public/curriculum/v1.json` — but **51 unique IDs have 128 duplicate instances** → effective unique pool ≪ 150
- **L2–L9 validation silently uses `partitionEqualAreas` fallback** (LevelScene.ts:322) — every label/make/compare/snap_match/benchmark answer is checked by the wrong validator
- 213/648 hints generated (L1 only) — and **all 213 are `type:"verbal"` only**, missing visual_overlay (T2) and worked_example (T3) per interaction-model.md §4.1
- Build verified: ✅ npm run build succeeds; 0 TypeScript errors; bundle 1.35 MB / 351 KB gz
- Engine modules `bkt.ts`, `router.ts`, `selection.ts`, `calibration.ts` are unit-tested but **never instantiated by any scene**
- Misconception detectors exist but `runAllDetectors()` is **never called** from session lifecycle
- `db.sessionTelemetry` table exists, but **no repository writes to it** during play

**Critical gaps:**
| Level | Current | Target | Gap | Cause |
|-------|---------|--------|-----|-------|
| L01 | 12 | 36 | -24 | partition+identify; narrow generation diversity; ships forbidden thirds |
| L02 | 18 | 36 | -18 | identify+label; validator IDs wrong |
| L03 | 24 | 36 | -12 | identify+label; validator IDs wrong |
| L04 | 11 | 36 | -25 | make+partition; aggressive dedup |
| L05 | 27 | 36 | -9 | make+partition; needs parameterization |
| L06 | 28 | 36 | -8 | compare+snap_match; **wrong skill IDs (SK-18-21 vs SK-21-23)** |
| L07 | 12 | 36 | -24 | compare+label; high payload similarity |
| L08 | 8 | 36 | -28 | benchmark; **80% LLM dedup loss** |
| L09 | 10 | 36 | -26 | order+placement; **L9 easy not monotonic** |

---

# PART I — CONTENT (Phases 0–3)

## Phase 0 — Critical correctness blockers (7–9 hours)

**Nothing in Phase 0 is optional. Skipping any item leaves the system silently wrong.**

### C0.0 — Validator ID alignment

**Issue.** `public/curriculum/v1.json` references validator IDs that don't exist in `src/validators/registry.ts`:

| In v1.json                             | Should be (registry)                                 | Levels affected |
| -------------------------------------- | ---------------------------------------------------- | --------------- |
| `validator.label.exactMatch`           | `validator.label.matchTarget`                        | L2, L3, L7      |
| `validator.make.foldAlignment`         | `validator.make.foldAndShade` / `make.halvingByLine` | L4, L5          |
| `validator.compare.greaterThan`        | `validator.compare.relation`                         | L6, L7          |
| `validator.snap_match.equivalence`     | `validator.snap_match.allPairs`                      | L6              |
| `validator.benchmark.closestBenchmark` | `validator.benchmark.sortToZone`                     | L8              |

**`LevelScene.ts:322-327` falls back to `partitionEqualAreas(...)` when registry lookup fails.** Result: every L2–L9 answer is currently scored by the partition validator using the wrong payload shape. Students may be marked correct or incorrect at random.

**Action.**

1. Migrate v1.json + `pipeline/output/level_*/all.json` to registry-side names.
2. Delete fallback in `LevelScene.ts:322-327`. Replace with explicit `console.error` + `{outcome:'incorrect', score:0, feedback:'unknown_validator'}` so future drift is loud.
3. Export validator whitelist from `src/validators/registry.ts` for `pipeline/verify.py` to consume. Add `check_validator_ids_resolve` rule.

**Acceptance test.** `npm run test:integration -- curriculum.test.ts` asserts every template's `validatorId` resolves to a non-undefined registry entry.

### C0.0b — Three confirmed math errors in shipped content

**Issues** (confirmed by direct read of v1.json):

| Template      | Error                                                                                          | Evidence                  |
| ------------- | ---------------------------------------------------------------------------------------------- | ------------------------- |
| L9 order easy | `direction:"ascending"` but `expectedOrder:[3/8, 1/4, 1/3]` → 0.375, 0.25, 0.333 NOT ascending | Sorted is [1/4, 1/3, 3/8] |
| L6 snap_match | `correctAnswer: 0.6666...` but target equals `frac:1/3`                                        | Should be ~0.333          |
| L1 templates  | Ship `frac:1/3`, `frac:2/3` despite C8 "L1: halves only"                                       | constraints.md:C8         |

**Action.**

1. Implement `check_correct_answers_well_formed` in verify.py: per archetype, compute canonical correctAnswer from payload; assert equality within tolerance.
   - **Order**: validate `expectedOrder` is monotonic in declared `direction`.
   - **Snap_match**: validate `correctAnswer == decimal(matchedFraction)` ± 1e-9.
   - **Compare**: assert `relation` matches sign of `decimal(left) - decimal(right)`.
   - **Placement**: assert `targetPosition ∈ [0,1]` and matches fraction's decimal.
2. Re-author broken templates. For L1 specifically, regenerate with `denominator === 2` hard-restrict.
3. Wire `--strict` into `.github/workflows/content-validation.yml`.

**Acceptance test.** Re-run verify.py; all `check_correct_answers_well_formed` warnings cleared.

### C0.0c — De-duplicate template IDs

**Issue (confirmed via audit).** **51 unique IDs have 128 duplicate instances** across 150 templates:

- `q:cmp:L6:0006` appears 2×
- `q:lb:L3:0004` appears 3×
- `q:ord:L9:0002` appears 3×
- `pipeline/hints.py` keys hints by `question["id"]` → only one of each duplicate gets hints.
- Runtime queries by ID return wrong question.

**Action.**

1. Add `check_unique_ids` rule to verify.py:260.
2. Re-id with deterministic pattern: `q:<archetype>:L<N>:<index>` where `<index>` is 0001-padded and unique per (archetype, level).
3. Update any cross-references (skill cards, hint mappings, telemetry) — search for hardcoded IDs in tests and docs.

**Acceptance test.** `python pipeline/verify.py --strict --in public/curriculum/v1.json` returns 0 with `check_unique_ids: PASS`.

### C0.0d — L6 skill ID drift

**Issue.** L6 templates reference `SK-18, SK-19, SK-20, SK-21` (all L5-boundary skills per skills.md). Per `docs/10-curriculum/skills.md:60`, **L6 should introduce SK-21, SK-22, SK-23** (compare same-denominator, compare same-numerator, symbolic notation). L7-L9 likely have similar gaps (SK-24–SK-33 entirely missing).

**Impact.** BKT posteriors track wrong skills; mastery never advances; L7+ unlock rules use stale evidence.

**Action.**

1. Walk `v1.json:levels['06']` and remap `skillIds` arrays.
2. Audit L7-L9 similarly.
3. Add `check_skill_ids_resolve` rule to verify.py (whitelist sourced from skills.md frontmatter or YAML manifest).

### C0.0e — Missing `standardIds` field on all 150 templates

**Issue.** `pipeline/schemas.py:146` requires `QuestionTemplate.standardIds: list[str]` (non-optional). **All 150 templates lack this field.** `src/curriculum/seed.ts:205` masks the schema mismatch with `bulkPut(templatesWithGroup as any)`.

**Action.**

1. Tag every template at authoring time with CCSS-M codes (K.G.A.3, 1.G.A.3, 2.NF.A.1, 2.NF.A.2, 2.NF.A.3 from standards-map.md).
2. Add `standardIds: StandardId[]` to TS `QuestionTemplate` type in `src/types/index.ts`.
3. Add `check_standards_coverage` rule to verify.py: every K-2 fraction CCSS-M standard in scope must appear in ≥1 MVP template.
4. Remove `as any` cast at `seed.ts:205`.

### C0.0f — Skills table never populated from bundle

**Issue.** `src/curriculum/seed.ts:188-190` calls `db.skills.bulkPut(bundle.skills)`, but **v1.json has no top-level `skills` field** (only legacy `levels` format). `loader.ts:92` returns empty skills array. **BKT engine starts with empty skill registry → mastery tracking broken at runtime.**

**Action.**

1. Source canonical skill list from `docs/10-curriculum/skills.md` (parse YAML frontmatter or maintain `pipeline/skills-manifest.json`).
2. Update `scripts/build-curriculum.mjs` to embed `skills: Skill[]` at bundle root.
3. Update `loader.ts` to expose skills; `seed.ts` to populate `db.skills` table.
4. Add migration for existing local DBs: on bundle version bump, repopulate skills table.

### C0.0g — Loader has no schema validation

**Issue.** `src/curriculum/loader.ts:77` does:

```typescript
const bundle: CurriculumBundle = (await response.json()) as CurriculumBundle;
```

Bare cast. Malformed bundle (wrong types, missing fields, corrupted CDN response) loads silently. The legacy "levels-only" branch at lines 101–115 deepens the problem by accepting two distinct shapes.

**Action.**

1. Define Zod schema for `CurriculumBundle` mirroring `pipeline/schemas.py`.
2. Run `bundle.parse(...)` on every fetch; `.safeParse()` first, surface errors via:
   - `AccessibilityAnnouncer` (live region message)
   - Phaser modal: "Could not load curriculum. Please refresh."
   - Console.error with full Zod report
3. Retire legacy `levels`-only branch once bundle format is unified post-C0.0f.

### C0.0h — verify.py missing 5 critical checks

**Current state.** `pipeline/verify.py:260` runs only 7 checks. **Missing 5 correctness gates:**

| Check                               | Purpose                                             | Backed by |
| ----------------------------------- | --------------------------------------------------- | --------- |
| `check_unique_ids`                  | Detect duplicate template IDs                       | C0.0c     |
| `check_skill_ids_resolve`           | skillIds ⊆ skills.md whitelist                      | C0.0d     |
| `check_standards_coverage`          | All K-2 CCSS-M covered ≥1×                          | C0.0e     |
| `check_correct_answers_well_formed` | correctAnswer ≡ canonical computation per archetype | C0.0b     |
| `check_c8_denominator_family`       | denominators ⊆ level's allowed family               | C3.3c     |

**Action.** Implement all 5; wire `--strict` flag (warnings → failures); call from `.github/workflows/content-validation.yml`.

---

## Phase 0b — Hand-author critical constrained levels (4–6 hours)

L8 (benchmark, 80% LLM dedup loss) and L9 (order, limited combinatorial space) require human authoring.

### C0.1 — Hand-author 28 L8 benchmark templates

**Approach: parameterized design.** 7 base benchmarks × 4 difficulty tiers = 28.

| Base benchmark | Easy          | Medium     | Hard                   |
| -------------- | ------------- | ---------- | ---------------------- |
| 1/2            | 2/4, 3/6, 4/8 | 5/10, 4/9  | 13/26, 7/14 (improper) |
| 1/3            | 2/6, 3/9      | 4/12, 5/15 | 11/30                  |
| 1/4            | 2/8, 3/12     | 5/20       | 9/35                   |
| 0 (whole)      | 1/8, 1/12     | 1/20       | 1/100                  |
| 2/3            | 4/6, 6/9      | 8/12       | 14/21                  |
| 3/4            | 6/8, 9/12     | 12/16      | 21/28                  |
| 2/5            | 4/10, 6/15    | 8/20       | 14/35                  |

**Distractor strategy** (3 per template):

- Off-by-one numerator (WHB-01 trigger)
- Same numerator, different denominator (size confusion)
- Inverse fraction (e.g., 3/4 ↔ 4/3)

**Deliverable.** `pipeline/output/level_08/hand-authored.json`, validated against `src/validators/benchmark.ts`.

### C0.2 — Hand-author 26 L9 order/placement templates

**Order archetype (13 templates).** 4–5 fractions per question.

| Difficulty | Pattern                                                                                      |
| ---------- | -------------------------------------------------------------------------------------------- |
| Easy (4)   | Same denominator: `[1/4, 2/4, 3/4]`, `[1/6, 3/6, 5/6]`, `[1/3, 2/3]`, `[1/8, 3/8, 5/8, 7/8]` |
| Medium (5) | Mixed denominators: `[1/2, 1/3, 1/4]`, `[2/3, 3/4, 1/2]`, etc.                               |
| Hard (4)   | With improper or with whole numbers: `[3/4, 5/4, 1, 7/4]`                                    |

**Placement archetype (13 templates).** Position fractions on 0–1 number line.

| Target     | Tolerance | Difficulty    |
| ---------- | --------- | ------------- |
| 0.1, 0.3   | ±0.05     | Easy          |
| 0.5        | ±0.03     | Easy (anchor) |
| 0.7, 0.875 | ±0.07     | Medium        |
| 5/12, 7/16 | ±0.04     | Hard          |

**Deliverable.** `pipeline/output/level_09/hand-authored.json`.

### C0.3 — Expand L1 partition+identify 12→24

Halves only (C8). 12 partition + 12 identify with shape variation:

- Partition: rect (vertical/horizontal/diagonal cut), circle (any chord), pentagon, triangle
- Identify: 1-of-N, 2-of-N selection across rect/circle layouts

---

## Phase 1 — Regenerate L3–L7 with constrained generation (4–6 hours)

**Strategy: Base → Parameterize → Top-up.**

### C1.1–C1.5 — Per-level regeneration

Each level follows the same pattern:

1. Hand-author N base templates (N=5 typically)
2. Parameterize each base across difficulty tiers + fraction pools (3× target multiplier)
3. LLM top-up with **constrained prompts** that include hash list of existing templates and explicit "must vary" instructions
4. Dedupe (SHA256 payload), filter by `LEVEL_ARCHETYPES`, validate

**Tightened prompt template:**

```
Generate {N} UNIQUE templates for Level {N}, archetype "{archetype}". Each must:
- Use a DIFFERENT (numerator, denominator) pair from this exclusion set: {existing_hashes}
- Use difficulty tier: {easy|medium|hard}
- Include 1 distractor that triggers misconception {MC-NN}
- Validate against {validatorId}
Output as JSON array conforming to {schema}.
```

| Level | Bases | Parameterized | LLM Top-up                      | Total target |
| ----- | ----- | ------------- | ------------------------------- | ------------ |
| L3    | 10    | 30            | 6                               | 36           |
| L4    | 8     | 24            | 12                              | 36           |
| L5    | 6     | 30            | 0 (parameterization sufficient) | 36           |
| L6    | 8     | 24            | 4                               | 36           |
| L7    | 8     | 24            | 4                               | 36           |

---

## Phase 2 — Bundle, deduplicate, verify (2–3 hours)

### C2.1 — Merge into v1.json

Update `scripts/build-curriculum.mjs`:

1. Load priority chain: `hand-authored.json` → `merged.json` → `expanded.json`
2. Apply `LEVEL_ARCHETYPES` filter from `src/scenes/utils/levelMeta.ts`
3. Embed top-level `skills: Skill[]` array (from C0.0f)
4. Emit summary line to stdout: `Built v1.json: N templates, M hints, K archetypes, L skills`

### C2.2 — Dedupe audit

Create `pipeline/scripts/audit-dedup.py`:

- SHA256 hash each template's payload
- Report duplicates per level + per (level, archetype) pair
- Flag any archetype with >50% duplication for regeneration

### C2.3 — Archive intermediates

Move `pipeline/output/level_NN/` → `pipeline/archive/level-NN-<timestamp>/` for audit trail. Update `.gitignore`.

---

## Phase 3 — Validation, standards, hints (3–4 hours)

### C3.1–C3.3 — Schema, coverage, archetype audits

(Run all verify.py checks; run integration tests; run archetype audit script.)

### C3.3b — Standards alignment

1. Add `standardIds: StandardId[]` to TS QuestionTemplate.
2. Tag templates with CCSS-M (per standards-map.md):
   - L1–L2: K.G.A.3, 1.G.A.3
   - L3–L4: 1.G.A.3, 2.G.A.3, 2.NF.A.1
   - L5–L7: 2.NF.A.1, 2.NF.A.2
   - L8–L9: 2.NF.A.2, 2.NF.A.3 (extended)
3. `check_standards_coverage` ensures every standard appears ≥1×.

### C3.3c — C8 denominator family alignment

1. Audit each level's denominator union vs `level-NN.md` spec.
2. For each delta:
   - **Re-author** if level spec is correct (preferred for L1-L2)
   - **Update spec** if data is pedagogically valid (document in decision-log D-17+)
3. `check_c8_denominator_family` enforces.

### C4.1–C4.5 — Hints

**Current state.** 213 hints exist for L1 only, **all `type:"verbal"`**. Visual_overlay (T2) and worked_example (T3) per `interaction-model.md §4.1` are missing.

**Action.**

1. Run `pipeline/hints.py --all --tier-types verbal,visual_overlay,worked_example` for all 288 templates.
2. Validate per hint:
   - Word count ≤15
   - Uniqueness across tiers (no T1 string appears in T2)
   - Complexity progression (T1 < T2 < T3 by Flesch-Kincaid or word count proxy)
   - Type matches tier (T1=verbal only, T2=verbal+visual_overlay, T3=verbal+worked_example)
3. Build `HintTierRenderer` component (extract tier-2/3 visual UI from Level01Scene into reusable `src/components/HintTierRenderer.ts`) so LevelScene generic levels get visual hints.
4. Fix `HintLadder.ts:49` — `next()` can re-show T3 indefinitely. Clamp tier; reset on new question.

---

# PART II — RUNTIME (Phases 4–8)

## Phase 4 — Validator & engine bug fixes (5–7 hours)

Each issue is a concrete bug with file:line. Fix order is by severity.

### Critical correctness fixes

| ID    | File:Line           | Issue                                                                                                | Fix                                                                                               |
| ----- | ------------------- | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| C4b.1 | partition.ts:42-43  | `relativeDelta = maxDelta / avg` produces Infinity if avg is near-zero                               | Guard: `if (avg <= 1e-9) return {outcome:'incorrect', score:0}`                                   |
| C4b.2 | compare.ts:46       | MC-WHB-02 condition `leftDecimal < rightDecimal` triggers on correct answers when `relation:'<'`     | Invert to `leftDecimal > rightDecimal` (match relation semantics)                                 |
| C4b.3 | snap_match.ts:39-44 | Dual-set lookup (canonical + reversed) accepts ambiguous pairs non-deterministically                 | Use canonical sort `[a, b].sort()` for both expected and student keys; single set                 |
| C4b.4 | placement.ts:27     | `score = 1 - errorMagnitude / closeTolerance` produces negative scores when error > tolerance        | `Math.max(0, 1 - errorMagnitude / closeTolerance)`                                                |
| C4b.5 | label.ts:38-40      | Asymmetric counting: duplicate `regionId` mappings count as wrong but only check existence once      | Use `Map<regionId, labelId[]>` and validate uniqueness OR explicitly disallow duplicates at input |
| C4b.6 | order.ts:40-41      | maxSwaps off-by-one: for n=2, swaps=1 → score=0; for n=3, swaps>1 never hits 0.5; partial-credit gap | Use proper Kendall-tau normalization; explicit tier mapping (0/1/2 swaps → 1.0/0.5/partial)       |

### Engine fixes

| ID     | File:Line                       | Issue                                                                                              | Fix                                                                                           |
| ------ | ------------------------------- | -------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| C4b.7  | bkt.ts:102-108                  | `predictCorrect()` degenerate when pGuess=0 ∧ pSlip=1 → always 0                                   | Validate params at construction: `0 < pGuess < 1`, `0 < pSlip < 1`                            |
| C4b.8  | selection.ts:81                 | ZPD strict `p > LOW && p < HIGH` excludes p=0.4 and p=0.85 (LEARNING/APPROACHING boundaries)       | Use inclusive bounds matching `deriveState`: `p >= ZPD_LOW && p < ZPD_HIGH`                   |
| C4b.9  | calibration.ts:57               | Returns null on empty skills; router.ts:36 silently skips calibration                              | `console.warn` + emit telemetry event `calibration_skipped`                                   |
| C4b.10 | misconceptionDetectors.ts:45-46 | `evidenceAttemptIds = .filter(...).slice(0,3)` but `observationCount` includes all → replay broken | Track exact attempt IDs that contributed to threshold; full evidence array                    |
| C4b.11 | seed.ts:26-27                   | `match[1]!` crashes on malformed IDs (regex match returns null)                                    | `const matched = match?.[1]; if (!matched) { logger.warn(...); return DEFAULT_LEVEL_GROUP; }` |

### Persistence fixes

| ID     | File:Line         | Issue                                                                               | Fix                                                                           |
| ------ | ----------------- | ----------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| C4b.12 | db.ts:105         | misconceptionFlags missing `[studentId+resolvedAt]` for unresolved-MC queries       | Bump Dexie to v4; add compound index; `.upgrade()` callback                   |
| C4b.13 | backup.ts:145-153 | `deviceMeta` excluded from restore; cross-device restore loses preferences silently | Re-include with merge strategy: keep newer `lastBackupAt`; warn user in modal |
| C4b.14 | backup.ts:127-137 | "skip" conflict policy doesn't distinguish PK collision from constraint violation   | Categorize: collisions OK (counted), constraint violations FAIL (raise error) |

**Acceptance.** Every fix paired with a `fast-check` property test in `tests/unit/validators/<name>.property.test.ts` or `tests/unit/engine/<module>.test.ts`.

---

## Phase 5 — Memory leaks & lifecycle (3–4 hours)

**Critical for synthetic 100-session harness — cumulative leaks invalidate playtest data.**

### C5.1 — DragHandle keyboard listener leak

**File:** `src/components/DragHandle.ts:120` adds `this.scene.input.keyboard?.on('keydown', handler)`.
**Bug:** No corresponding `.off()` in `destroy()` (lines 204–206).
**Impact:** ~500 bytes/drag × 100 sessions = ~50KB cumulative; stale handlers may fire after navigation.
**Fix:** Store handler ref; remove in destroy.

```typescript
// In create()
this.keyHandler = (e) => this.onKey(e);
this.scene.input.keyboard?.on('keydown', this.keyHandler);
// In destroy()
this.scene.input.keyboard?.off('keydown', this.keyHandler);
```

### C5.2 — PreferenceToggle DOM listener leak

**File:** `src/components/PreferenceToggle.ts:140-146` adds two `addEventListener` calls; `destroy()` at line 193 only removes the wrapper DOM node.
**Impact:** 3 toggles × 5 Settings visits = 15 orphaned listeners.
**Fix:** Track and `.removeEventListener` on destroy.

### C5.3 / C5.4 — FeedbackOverlay never destroyed

**Files:** `Level01Scene.ts:853` and `LevelScene.ts:563` — `preDestroy()` cleans Announcer + TestHooks but not FeedbackOverlay (created at lines 160 / 104).
**Impact:** ~16KB/session × 100 = 1.6MB. Cascading tween/timer leaks per session.
**Fix:** Call `this.feedbackOverlay?.destroy()` in cleanup.

### C5.5 — Phaser 4 lifecycle: preDestroy() doesn't run

**Issue.** Phaser 4 Scene has no `preDestroy` hook. Cleanup in `preDestroy()` methods at `Level01Scene.ts:853` and `LevelScene.ts:563` **never executes**.

**Fix.** In `create()`:

```typescript
this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.cleanup());
this.events.once(Phaser.Scenes.Events.DESTROY, () => this.cleanup());
```

Move `preDestroy()` body to `private cleanup()`. Add Playwright smoke test: navigate Menu → Level → Menu, assert no hanging textures.

### C5.6 — Orphaned delayedCalls

**File:** `Level01Scene.ts:674-676` — chained `time.delayedCall()` in `animateWorkedExample()`. If user exits mid-animation, callbacks fire on torn-down scene.
**Fix:** Track `Phaser.Time.TimerEvent` refs; `tracker.forEach(t => t.remove())` in cleanup.

### C5.7 — Modal focus return

**File:** `Level01Scene.ts:773-787` — modal close doesn't restore focus. Keyboard nav broken after 2nd close.
**Fix:** Capture `document.activeElement` before show; refocus on close.

### C5.8 — PreferenceToggle SSR safety

**File:** `PreferenceToggle.ts:55-73` — unguarded `document.getElementById`. Breaks SSR/SSG builds.
**Fix:** `if (typeof document === 'undefined') return;` early-return guard.

---

## Phase 6 — Accessibility (C7 + WCAG 2.1 AA) (3–5 hours)

### C6.1 — Privacy link contrast violation

**File:** `SettingsScene.ts:286` — link color `#6C63FF` on white = **4.08:1** (fails AA 4.5:1).
**Fix:** Darken to `#5848D6` → 5.2:1 (passes AA, near-AAA).

### C6.2 — Back button hit target (C7 violation)

**Files:** `Level01Scene.ts:269` + `LevelScene.ts:213` — text-only `← Menu` interactive element.
**Bug:** No explicit `Phaser.Geom.Rectangle` hitArea; effective target depends on font metrics (~18px = ~36×24).
**Fix:**

```typescript
const back = this.add.text(...).setInteractive({
  hitArea: new Phaser.Geom.Rectangle(-22, -22, 44, 44),
  hitAreaCallback: Phaser.Geom.Rectangle.Contains,
  useHandCursor: true,
});
```

### C6.3 — Warning color dormant violation

**File:** `colors.ts:25` — `warning: '#F2A93B'` on white = 3.2:1. Currently used as background only (passes 3:1 UI contrast). Darken to `#D88E1F` (4.6:1) before any text usage.

### C6.4 — Honor reduced-motion preference at runtime

**Issue.** `checkReduceMotion()` only checks `window.matchMedia`. DB preference set in `SettingsScene` is ignored.
**Fix.**

1. New `src/lib/preferences.ts` — synchronous cache populated at boot from `deviceMetaRepo.get()`.
2. `checkReduceMotion()` returns `os || prefs.reduceMotion`.
3. Settings update writes to cache.

### C6.5 — High-contrast mode

**Action.** Add `prefersContrast` to DeviceMeta. At runtime: CSS class on `<body>` + `colors-high-contrast.ts` with WCAG AAA pairs.

### C6.6 — Canvas accessibility

**File:** `SkipLink.labelCanvas()` — canvas has id + tabindex but no name.
**Fix:** Add `aria-label="Questerix Fractions game canvas"`, `role="application"`, `data-testid="phaser-canvas"` (the test selector at `wcag.spec.ts:53` currently fails to match).

### C6.7 — PreferenceToggle hit area

**File:** `PreferenceToggle.ts:97-107` — visual 52×28. Wrap in 44×44 button. Visual unchanged.

### C6.8 — Canvas keyboard bindings

Phaser canvas has focus but no documented keyboard input for drag/submit. Switch-access blocked. Document and implement: arrow keys for handle position, Enter for submit, Esc for back.

### C6.9 — Idempotent destroy

`AccessibilityAnnouncer.destroy()` called in both scenes; second is no-op but wasteful. Single shared instance via DI.

---

## Phase 7 — Runtime engine wiring (4–6 hours)

The pedagogical engine is unit-tested but **never connected to gameplay**. Without this, C10 cannot be validated.

### C7.1 — MC-EOL-01 detector

**File:** `misconceptionDetectors.ts` only has WHB-01, WHB-02, MAG-01, PRX-01.
**Issue:** `equal_or_not.ts:38-44` has logic for MC-EOL-01 (Equal-Parts Loose Interpretation, L1) but **never invoked by engine**.
**Fix:** Add `detectEOL01(attempts, level)` to `misconceptionDetectors.ts`; call from `runAllDetectors()` after line 208. Property test with fast-check.

### C7.2 — Wire `runAllDetectors()`

**Issue:** `runAllDetectors()` exists but **no scene calls it**. `db.misconceptionFlags` never written.
**Fix.**

1. Either build `src/engine/sessionController.ts` (preferred) or call directly from `LevelScene.onCommit` after `attemptRepo.record`.
2. Pass last 10 attempts of matching archetype.
3. Write trip results to `misconceptionFlagsRepo.upsert`.
4. Integration test: simulate 5 WHB-01-tripping attempts; assert flag row written.

### C7.3 — Expand misconception trap coverage

**Issue:** Only **4 unique MCs** trapped across 150 templates (MC-EOL-01, MC-NOM-01, MC-ORD-01, MC-WHB-01). Catalog has 11+.
**Action.** Walk `misconceptions.md`, tag templates per archetype expectations. Target ≥10 unique MCs across 288.

### C7.4 — sessionTelemetry repository

**Issue:** Table exists at `db.ts`. **No repository writes during play.** `backup.ts` backs it up regardless (always empty).
**Fix.** Create `src/persistence/repositories/sessionTelemetry.ts`:

```typescript
export const sessionTelemetryRepo = {
  start(studentId, sessionId, schemaVersion): Promise<TelemetrySession>,
  recordEvent(sessionId, event: TelemetryEvent): Promise<void>,
  end(sessionId, summary): Promise<void>,
};
```

Schema per `docs/40-validation/in-app-telemetry.md`. Reconcile `schemaVersion` (doc) vs `version` (backup.ts) — pick `schemaVersion`.

### C7.5 + C7.6 — localStorage key + missing writer

**File 1:** `BootScene.ts:12,64,74,79` — `localStorage.getItem('lastUsedStudentId')`.
**File 2:** `lastUsedStudent.ts:10` — `'questerix.lastUsedStudentId'`.
**File 3:** `src/**/*.ts` — `lastUsedStudent.set()` is **never called from any scene**.
**Fix.**

1. Replace BootScene direct access with `lastUsedStudent.get()/clear()`.
2. Add `set(studentId)` call at session start in Level01Scene + LevelScene.
3. Regression test: boot → start session → close tab → reboot → "Continue" loads correctly.

### C7.7 — Python validator parity

**Issue:** `pipeline/validators_py.py:388-404` registry missing `_py` impls for `label.exactMatch` (post-rename: `label.matchTarget`) and `make.foldAlignment` (post-rename: `make.foldAndShade`).
**Fix.** Add Python impls; update parity fixtures; cover all 10 archetypes in `parity_test.py`.

### C7.8 — Hint events with score penalty

**Issue:** Both scenes record `hintsUsed: []` (always empty). `interaction-model.md §4.1` specifies 5/15/30 point penalties.
**Fix.**

1. `HintLadder` emits `onHintShown(tier, hintId)` and `onHintApplied(tier, hintId)`.
2. Score calc: `score = base - sum(penalties for applied hints)`.
3. `hintEventRepo.record(...)` in scene.
4. Integration test.

### C7.9 — Template load failure UI

**File:** `LevelScene.ts:144-149` — silent fallback to synthetic on `questionTemplateRepo.getByLevel()` failure.
**Fix.** Show error modal with retry button; emit telemetry; return to MenuScene if retry fails.

---

## Phase 8 — PWA / offline / performance (3–4 hours)

### C8.1 — PWA on by default

**File:** `vite.config.ts:8` — PWA gated on `PWA=1` env.
**Fix.** Default-on for production builds. C5 requires offline.

### C8.2 — Offline curriculum cache

**Action.** vite-plugin-pwa runtimeCaching config:

```typescript
runtimeCaching: [
  {
    urlPattern: /\/curriculum\/v\d+\.json/,
    handler: 'CacheFirst',
    options: { cacheName: 'curriculum', expiration: { maxAgeSeconds: 30 * 86400 } },
  },
];
```

Plus offline `index.html` fallback.

### C8.3 — Offline UX banner

`window.addEventListener('online'/'offline')` → render top banner. Reuse `AccessibilityAnnouncer` for SR.

### C8.4 — Storage persistence warning

**File:** `db.ts:125` — swallows false silently.
**Fix.** `if (!granted && import.meta.env.DEV) console.warn('Storage persistence denied; data may be evicted under storage pressure.');`

### C8.5 — Verify PWA icons

Confirm 192/512/maskable variants in `public/icons/`. Cross-check `manifest.json` refs.

### C8.6 — Treeshaking config

`vite.config.ts` — add explicit `build.rollupOptions.output.minify` config; current bundle at 1.35MB / 351KB gz is acceptable but warrants documentation.

### C8.7 — Backup chunking

**File:** `backup.ts` — `db.<table>.toArray()` scales linearly. For users with >1000 sessions, chunk export by `lastModifiedAt`.

### C8.8 — FOUT/FOIT mitigation

If custom fonts used, `<link rel="preload" as="font" crossorigin>` + `font-display: swap`. Currently no custom fonts loaded in `main.ts`; verify Phaser doesn't load any.

### C8.9 — Lighthouse Web Vitals

Add to `lighthouserc.cjs`:

```javascript
'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],
'interaction-to-next-paint': ['error', { maxNumericValue: 200 }],
'total-blocking-time': ['error', { maxNumericValue: 200 }],
```

### C8.10 — Bundle budget

Add `bundle-budget.json` or LHCI `resource-summary` assertion at 1MB total per `performance-budget.md`.

---

# PART III — INFRASTRUCTURE (Phases 9–11)

## Phase 9 — CI / tests / build hardening (3–4 hours)

### C9.1 / C9.2 — CI coverage

`ci.yml` runs only `test:unit` + `test:e2e`. Add:

```yaml
- run: npm run test:integration
- run: npm run test:a11y
```

### C9.3 — Engine module unit tests

Missing: `tests/unit/engine/calibration.test.ts`, `router.test.ts`, `selection.test.ts`. Add — target ≥80% line coverage each.

### C9.4 — Validator property tests

For each `src/validators/<name>.ts`, add `tests/unit/validators/<name>.property.test.ts` using `fast-check`. Examples:

- `partition`: any partition with `|max-min|/mean ≤ tolerance` returns correct.
- `order`: any permutation has `kendallTauDistance ∈ [0, n*(n-1)/2]`.
- `compare`: for unequal fractions, exactly one of `<`, `>` is correct.

### C9.5 — Coverage thresholds

`vitest.config.ts`:

```typescript
coverage: {
  thresholds: {
    lines: 80, branches: 70, functions: 80, statements: 80,
    'src/validators/**/*.ts': { lines: 95, branches: 90 },
    'src/engine/**/*.ts': { lines: 95, branches: 90 },
  }
}
```

### C9.6 — Synthetic playtest scripts

`package.json`:

```json
"playtest:synthetic": "node scripts/run-synthetic-playtest.mjs",
"playtest:synthetic:quick": "node scripts/run-synthetic-playtest.mjs --quick"
```

### C9.7 — Synthetic memory profiling

Extend `tests/synthetic/playtest.spec.ts` to track `performance.memory.usedJSHeapSize` per session; fail if growth > 10MB across 100 sessions.

### C9.8 — CI ergonomics

For all 5 workflows:

- `concurrency: { group: ${{ github.ref }}, cancel-in-progress: true }`
- `timeout-minutes: 20`
- Cache Playwright browsers (`actions/cache` keyed on `package-lock.json` + Playwright version)
- Cache pip packages

### C9.9 — Pipeline parity in CI

Add `pytest pipeline/parity_test.py` job to `content-validation.yml`. Cover all 10 archetypes (currently 4).

### C9.10 — Vitest workspace

Migrate `vitest.config.ts`, `vitest.engine.config.ts`, `vitest.integration.config.ts`, `vitest.validators.config.ts` → single `vitest.workspace.ts` with named projects.

### C9.11 — Mutation testing

Stryker config for `src/engine/bkt.ts`, `router.ts`, `src/validators/*`. Weekly schedule (slow per-PR).

### C9.12 — Dependabot + security scan

- `.github/dependabot.yml`: npm + pip + actions, weekly
- `.github/workflows/security.yml`: `npm audit --audit-level=high` + `pip-audit`

---

## Phase 10 — Tooling / configs / hygiene (2–3 hours)

### C10.1 — Tighter TypeScript

`tsconfig.json`: `noUncheckedIndexedAccess: true`, `noPropertyAccessFromIndexSignature: true`. Add `tsconfig.tools.json` extending base for `tests/**`, `scripts/**`, configs.

### C10.2 — ESLint + Prettier

**Note:** `CONTRIBUTING.md:67` falsely claims `.prettierrc` exists. **It doesn't.**

1. ESLint with `@typescript-eslint/strict-type-checked`, `eslint-config-prettier`.
2. `.prettierrc.json` with project conventions.
3. Replace `lint` script: `eslint . && prettier --check . && tsc --noEmit`.
4. Add to ci.yml.
5. (Optional) husky + lint-staged.

### C10.3 — Dependency placement

- `dexie@^4.4.2` (`devDependencies` → `dependencies`)
- `@anthropic-ai/sdk@^0.30.0` → remove (never imported in src/)
- Resolve `.npmrc legacy-peer-deps` by upgrading offending peer (likely `vite-plugin-pwa` ↔ `vite 8`).

### C10.4 — `.gitignore` hygiene

```
__pycache__/
*.pyc
*.pyo
pipeline/*.log
.roadie/audit/
.roadie/vectors.lance/
.roadie/session-state.json
.roadie/project-model.db*
.claude/logs/
.claude/reports/
.claude/scheduled_tasks.lock
.claude/settings.local.json
```

Run `git rm --cached -r` for tracked items.

### C10.5 — `.nvmrc` + `.editorconfig`

- `.nvmrc`: `20`
- `.editorconfig`: LF, 2-space, UTF-8, trim trailing whitespace
- Reconcile `docs/ROADIE_INSTALLATION.md` Node ≥22 vs CONTRIBUTING/CI Node 20 → standardize on 20.

### C10.6 — Playwright dedup

`playwright.config.ts:51-56` — duplicate `Desktop Chromium` project at same viewport as `chromium:15-20`. Drop duplicate.

### C10.7 — License + README

- `package.json:47`: `"license": "MIT"` (currently ISC).
- README rewrite per Phase 1 build state. Drop "no new code until docs done" claim — ~1500 lines of code shipped since.

### C10.8 — Delete `src/_legacy/`

**C1 violation risk.** `src/_legacy/systems/core/LoggerSystem.ts:47` posts to `/api/log`. If any module ever imports it, **telemetry leaks to a server in violation of C1.** No build-time check prevents accidental import. **Delete the folder; preserve via git tag `legacy-app-snapshot`** if salvage needed later.

### C10.9 — Delete `--help/` folder

CLI invocation artifact at repo root containing stale `.claude/`/`.roadie/` mirror. Delete.

### C10.10 — Move root-level docs

- `HINTS_README.md` → `docs/30-architecture/hint-system/overview.md`
- `HINT_GENERATION.md` → `docs/30-architecture/hint-system/generation.md`
- `HINT_SYSTEM_FILES.md` → `docs/30-architecture/hint-system/files.md`
- `test_hints.py` → `pipeline/scripts/smoke_hints.py`
- `Topics.docx` → `docs/_archive/Topics.docx` (or delete per repo's claim of supersession)

### C10.11 — package.json metadata

Fill `keywords`, `author: "ryanmidogonzalez"`, `repository`, `bugs`, `homepage`.

### C10.12 — Logger

`src/lib/logger.ts` with `__DEV__` gating:

```typescript
export const logger = {
  info: (...args) => {
    if (import.meta.env.DEV) console.info(...args);
  },
  warn: (...args) => {
    if (import.meta.env.DEV) console.warn(...args);
  },
  error: (...args) => console.error(...args), // always logged
};
```

Replace ad-hoc `console.*` in production paths (BootScene, both Level scenes, seed.ts, etc.).

---

## Phase 11 — Documentation reconciliation (2–3 hours)

### C11.1 — Doc count

`README:15` → 31, `INDEX:91` → 36, **actual count** ≈29 .md files in /docs/. Reconcile to single authoritative count via `scripts/count-docs.mjs`.

### C11.2 — Decision log

- `README:20` says "D-01 through D-15"; decision-log has D-20.
- Close D-08 ("no new code until docs done") and D-14 ("pipeline in tools/content-pipeline/, output src/assets/").
- Add D-16+ for plan decisions: registry-side validator naming, MIT license, replace-on-restore, scene cleanup via events, atomic session transactions, hint cost 5/15/30, deviceMeta merge strategy, etc.

### C11.3 — Stale TBD references

Drop "(TBD)" markers — these files exist:

- `misconceptions.md:248` — `misconceptionDetectors.ts`
- `scope-and-sequence.md:141-142` — `standards-map.md`, `misconceptions.md`
- `playtest-protocol.md:116` — `validation-data/cycle-a/observer-form.md`
- `in-app-telemetry.md:238` — `validation-data/scripts/check.py`

### C11.4 — content-pipeline.md drift

- §2.2 claims output at `src/assets/curriculum/v{n}.json`; actual is `public/curriculum/v1.json`.
- No mention of hints stage.
- No mention of `scripts/build-curriculum.mjs` assembly.
  **Fix.** Rewrite §2.2 + §3 architecture diagram.

### C11.5 — status: draft → status: active

Once each doc is reconciled with code per this plan, flip its frontmatter `status: draft` → `status: active`. Update CHANGELOG narrative.

### C11.6 — Roadmap state

`mvp-l1-l9.md`: walk checkboxes, tick what's built (many). `open-questions.md`: close anything answered by impl.

### C11.7 — `validation-data/README.md`

Document data schema, import flow, validation scripts, pseudonym policy, retention.

### C11.8 — Privacy precision

`privacy-notice.md:35`: "no device ID" is too strong. `DeviceMeta.installId` is local-only. Tighten:

> "No device identifier is sent off your device; we generate a local-only `installId` in your browser's storage, which never leaves your device."

### C11.9 — CONTRIBUTING

- `test:unit` does NOT include integration. Either fix script (C9.10 vitest workspace) or fix doc.
- `npm run dev` requires Roadie. Document `npm run dev:app` as preferred non-Roadie path.
- Drop reference to nonexistent `.prettierrc` until C10.2 lands.

---

# PART IV — VALIDATION (Phase 12) & GATES (Phase 13)

## Phase 12 — Cycle A & Cycle B playtest infrastructure (4–6 hours active + 2 weeks elapsed)

### C12.1 — Cycle A recruitment

Send recruitment emails to 5+ families using `validation-data/recruitment-template.md`. Target: 3–4 confirmed sessions.

### C12.2 — Materials prep

- Print: `docs/40-validation/consent-form-phase1.pdf`, `validation-data/cycle-a/observer-form.md`
- Pre/post-test instruments (per `pre-post-test-instrument.md`)
- Per-pseudonym data folders: `validation-data/cycle-a/<pseudonym>/`
- Backup validation script ready

### C12.3 — Dry run

**Before recruiting.** 1 internal tester completes full session with timing instrumented, observer form filled, telemetry exported and validated via `check.py`. Calibrate session length, validator accuracy, hint pacing.

### C12.4 — Execute Cycle A

3–4 sessions, 1 hour each. Capture:

- Observer notes (per-attempt: hesitation, hint usage, frustration, breakthrough)
- Pre-test scores
- Post-test scores
- Telemetry export (JSON via "Backup My Progress")
- Audio (with explicit consent only)

Pseudonyms only. Real names sealed offline.

### C12.5 — Cycle A analysis

Per `playtest-protocol.md`:

- Identify content issues (specific templates/hints flagged)
- Identify UX issues (touch targets, hint pacing, modal flow)
- BKT mastery curves vs expected
- Misconception trip rates vs expected
- Output: `validation-data/cycle-a/analysis-report.md`

Schedule fixes → schedule Cycle B.

### C12.6 — Cycle B planning

Cycle B = formal validation per C10. Requires:

- C7 telemetry pipeline live (sessionTelemetryRepo writing during play)
- C7 misconception detection wired
- Cycle A learnings applied
- 8–10 students × 3 sessions
- Pre/post differential ≥ +2 points (8-item scale) for go/no-go

---

## Phase 13 — Final gates (1–2 hours)

### C13.1 — All workflows green

Run full CI on a fresh PR. Assert all 5 workflows succeed:

- ci.yml (lint, typecheck, unit, integration, e2e, a11y)
- content-validation.yml (verify.py --strict, parity_test.py)
- synthetic-playtest.yml (100-session quick run)
- lighthouse.yml (CLS/INP/TBT pass)
- deploy.yml (no regressions)

### C13.2 — Production build

```bash
npm run prebuild && npm run build:curriculum && npm run build && npm run preview
```

Assert:

- ≤2.5 MB total (≤600 KB gzipped)
- Boots in browser
- Navigates L1-L9 from MenuScene grid
- 5 attempts per level produce telemetry rows
- Backup → wipe → restore round-trips byte-identically

### C13.3 — Final report

Generate `.claude/CURRICULUM_COMPLETION_REPORT.md`:

- Final template counts per level
- Dedup loss % per level
- Archetype/standards/C8 compliance
- Hint coverage (verbal + visual_overlay + worked_example)
- Bundle metrics
- Cycle A learnings applied
- Decision log entries D-16+ added
- Recommendations for Cycle B + Phase 4 (new levels)

---

# Risk matrix

| Item                                               | Likelihood | Impact | Mitigation                                                                                        |
| -------------------------------------------------- | ---------- | ------ | ------------------------------------------------------------------------------------------------- |
| Validator ID rename breaks shipped client cache    | Medium     | High   | Bump `contentVersion`; force reseed                                                               |
| L8 hand-authoring exposes pedagogical gaps in spec | Medium     | Medium | Pair-author with reference to `level-08.md`; review against misconceptions.md                     |
| LLM regeneration produces ≥50% duplicates again    | High       | Medium | Constrained prompts; payload hash exclusion list; parameterization fallback                       |
| Engine wiring (C7) introduces playthrough bugs     | Medium     | High   | Integration tests per scene; smoke test session before merge                                      |
| Memory leak fixes regress functionality            | Low        | High   | Lifecycle smoke test (Menu→Level→Menu loop); heap snapshot                                        |
| PWA cache stale after content version bump         | Medium     | Medium | Cache-bust via `contentVersion` in URL or cacheName; Workbox `staleWhileRevalidate` for warm path |
| C8 alignment forces re-authoring at scale          | Medium     | Medium | Decision-log delta per level; relax spec where pedagogically valid                                |
| Cycle A recruitment <3 families                    | Medium     | High   | Backup recruitment list; offer flexible scheduling                                                |
| MIT license change affects existing collaborators  | Low        | Low    | Transparent commit; no external collaborators today                                               |

---

# Effort & timeline

| Phase                          | Hours      | Critical path         |
| ------------------------------ | ---------- | --------------------- |
| 0 (correctness blockers)       | 7–9        | YES                   |
| 0b (hand-author)               | 4–6        | YES                   |
| 1 (regenerate L3-L7)           | 4–6        | YES                   |
| 2 (bundle+verify)              | 2–3        | YES                   |
| 3 (validation+hints+standards) | 3–4        | YES                   |
| 4 (validator/engine bugs)      | 5–7        | YES                   |
| 5 (memory leaks)               | 3–4        | YES                   |
| 6 (a11y)                       | 3–5        | YES (C7 compliance)   |
| 7 (engine wiring)              | 4–6        | YES (C10 unblocker)   |
| 8 (PWA/offline/perf)           | 3–4        | partial               |
| 9 (CI/tests)                   | 3–4        | partial               |
| 10 (tooling)                   | 2–3        | optional              |
| 11 (docs)                      | 2–3        | optional              |
| 12 (Cycle A/B)                 | 4–6 active | YES (C10 fulfillment) |
| 13 (final gates)               | 1–2        | YES                   |

**Total: 50–72 hours** active engineering + 2 weeks elapsed for Cycle A.
**Critical path: ~40–55 hours.**
**Suggested cadence: 8–10 hours/week → 6–8 weeks to Cycle B kickoff.**

---

# Verification gates

| Gate                      | Demonstration                                                                                                                                                                                 |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **G0 (Phase 0+0b+1+2+3)** | v1.json has 288+ templates; 0 duplicate IDs; 0 invalid validatorIds; 0 schema errors; verify.py --strict passes all 12 checks; standards/skills/C8 all aligned; 864 hints across 3 tier types |
| **G1 (Phase 4+5)**        | All 14 validator/engine bugs fixed with property tests; 4 memory leaks fixed; lifecycle smoke test passes; heap stable across 100 synthetic sessions                                          |
| **G2 (Phase 6)**          | axe-core 0 violations on Menu+Settings+every archetype; all interactive elements ≥44×44; reduced-motion preference honored at runtime; canvas keyboard-navigable                              |
| **G3 (Phase 7)**          | A 5-question session writes rows to attempts, skillMastery, sessionTelemetry, hintEvents, misconceptionFlags; localStorage `questerix.lastUsedStudentId` set; "Continue" loads correctly      |
| **G4 (Phase 8)**          | PWA installable; offline reload renders MenuScene + cached curriculum; LHCI passes CLS/INP/TBT; bundle ≤1MB total per resource-summary                                                        |
| **G5 (Phase 9)**          | All 5 CI workflows green on PR; coverage ≥80% (95% engine+validators); pytest parity_test for all 10 archetypes                                                                               |
| **G6 (Phase 10+11)**      | ESLint runs and fails on broken file; tsconfig strict-indexing on; license MIT everywhere; INDEX has full file list; no stale TBDs; CHANGELOG matches reality                                 |
| **G7 (Phase 12)**         | Cycle A executed with 3+ students; data captured; analysis report generated; Cycle B plan approved                                                                                            |
| **G8 (Phase 13)**         | All gates green; production bundle deployed to staging; final report generated                                                                                                                |

---

# Constraints honored (C1–C10)

This plan respects every locked constraint:

- **C1** (no backend): all changes client-side; `_legacy/LoggerSystem.ts` deleted (would have violated C1 if imported)
- **C2** (no teacher/parent): no admin UI introduced
- **C3** (L1-L9 only): scope limited to existing levels
- **C4** (Phaser 4 + TS + Vite + Dexie): no stack swaps; deps cleaned (remove unused @anthropic-ai/sdk)
- **C5** (localStorage minimal + offline): single key `questerix.lastUsedStudentId`; PWA enabled with offline fallback
- **C6** (simple + bright visual): \_legacy/ deleted; design tokens enforced
- **C7** (responsive 360-1024 + 44×44 targets): hit areas fixed throughout
- **C8** (linear denominator progression): re-authored or spec-relaxed with decision log
- **C9** (10-15 minute sessions): no change to length policy
- **C10** (validation is the goal): Phase 7 wires telemetry, Phase 12 executes Cycle A/B

---

# What this plan deliberately does NOT do

- No React, Redux, Storybook, Tailwind redesign
- No backend, no accounts, no teacher console, no SaaS analytics
- No Grade 3+ content
- No new design language
- No "cosmic / neon" visual return
- No license change beyond ISC → MIT
- No premature optimization (parameterization is opt-in via Phase 5)

If any locked constraint should be relaxed, that's a separate decision recorded in `decision-log.md` first.

---

**Source files for every line:reference in this plan are checked into git as of commit 053c574. Re-run audits before executing each phase to confirm findings still apply.**
