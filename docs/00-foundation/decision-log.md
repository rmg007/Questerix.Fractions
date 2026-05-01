---
title: Decision Log
status: active
owner: solo
last_reviewed: 2026-04-24
applies_to: [mvp]
related: [constraints.md, open-questions.md]
---

# Decision Log

Append-only record of every notable planning decision. Once a decision is here, it's the answer until explicitly revised in a new entry.

Format:

- **Date** of decision
- **Decision ID** (`D-NN`) for cross-reference
- **What was decided**
- **Why** (the reasoning, not just the outcome)
- **Alternatives considered** (briefly)
- **Source** (which docs reflect this decision)

Decisions are ordered chronologically. **Newest at the top.**

---

## D-29 — 2026-05-01 — App ships English-only; multi-locale not on roadmap

**Decision:** The app is committed to English-only delivery. Multi-locale support is **not** on the roadmap and will not be revisited at v2 unless explicitly reopened.

**Why:** K-2 educational validation prototype with a fixed scope (C3 caps content at L9, C9 caps sessions at 15 min). The runtime i18n catalog (`src/lib/i18n/catalog.ts` + 445+ entries) is retained for its non-localization value (centralized strings, tone tags, content QA), but ICU plural support, locale-keyed pipeline output, RTL CSS, and locale-aware TTS are all explicitly rejected for MVP.

**Alternatives:** Defer to a "future flag" — rejected, would leave Phase 14 work in `PLANS/code-quality-2026-05-01.md` as a phantom dependency. Plan an English+Spanish v2 — rejected, no validation-stage requirement and no localized curriculum content available.

**Source:** `PLANS/code-quality-2026-05-01.md` §4.5.C, Phase 14 (now marked DEFERRED)

---

## D-28 — 2026-05-01 — Pipeline parity re-architecture deferred (recommendation A2)

**Decision:** Recommendation A2 (move pipeline validation step to TypeScript; eliminate `pipeline/validators_py.py` and parity fixtures) is **deferred** to a discovery spike. Phase 9 of `PLANS/code-quality-2026-05-01.md` does not start until the spike is complete and approved.

**Why:** A2 is structurally correct (eliminates rather than enforces parity, ~12 hr task on paper) but the boundary between "pipeline content generation" (Python, Anthropic SDK) and "validation step" (could be TS) is not concretely drawn. A 2-hour spike is needed to confirm the migration is a clean cut, not a re-cutting of the pipeline orchestration. The conservative fallback is Phase 0.2 with full parity-fixture coverage and CI invocation — already approved.

**Alternatives:** Approve A2 immediately — rejected, scope risk too high. Reject A2 outright — rejected, the labor tax of hand-mirroring TS↔Python is real and recommendation A2 stands on architectural merit.

**Source:** `PLANS/code-quality-2026-05-01.md` §6 Phase 9, recommendation A2; `PLANS/forensic-deep-dive-2026-05-01.md` §5.4

---

## D-27 — 2026-05-01 — Sunset Level01Scene.ts (Path A) over controller extraction (Path B)

**Decision:** When the v2/v3 plan's Phase 3 executes, take **Path A**: migrate L1 into `LevelScene` via `LEVEL_META`, then delete `Level01Scene.ts` (1604 LOC). **Reject Path B** (extract a `QuestionLoopController` shared by both scenes).

**Why:** The 45% duplication between `Level01Scene` and `LevelScene` is the visible symptom of the codebase's Original Sin — the Phaser Scene became the application architecture (per `PLANS/code-quality-2026-05-01.md` §12.1). Path B preserves the parallel scaffold and locks in a "shared controller" abstraction that becomes structurally indistinguishable from the simpler "L1 entered into the meta table" path. Path A is KISS over extracted abstraction.

The forensic deep-dive (`PLANS/forensic-deep-dive-2026-05-01.md` §1.2) confirms that Path A is the cleanup the team always knew was coming — the bifurcation was deliberate per D-08, and commit `3dd038b` documented the planned fix that never executed. Path A executes that fix.

**Alternatives:** Path B (controller extraction, ~18 hr instead of Path A's 14 hr) — rejected as documented above. Defer indefinitely — rejected, the duplication compounds with every behavior change.

**Source:** `PLANS/code-quality-2026-05-01.md` §6 Phase 3; `PLANS/forensic-deep-dive-2026-05-01.md` §1, §4

---

## D-26 — 2026-05-01 — Level unlock model: completion-based (not BKT-gated)

**Date:** 2026-05-01
**Status:** Accepted

**Decision:** Completing a level (finishing a 5-question session) immediately unlocks the next level. BKT mastery estimates continue to run and are persisted to IndexedDB but have no effect on progression gates during validation pilots.

**Why:** This is a validation research tool first (C10). Gating on BKT threshold (≥ 0.85 + 3 consecutive correct) risks students stalling on early levels, producing incomplete datasets across later levels. The primary research signal is the mastery trajectory data; collecting it across all 9 levels matters more than enforcing mastery before advancing. A completion gate also keeps the experience low-frustration for K-2 students, reducing validity threats from disengagement.

**Alternatives considered:**
- *BKT-threshold gate (masteryEstimate ≥ 0.85)*: Appropriate for a deployed learning product; rejected for this pilot because it risks missing-data across later levels.
- *Free-play (all 9 levels open)*: Loses the linear progression narrative, which drives engagement for this age group.

**Revisit when:** Post-pilot analysis shows students consistently advancing without mastery (i.e., high completion rate but flat BKT curves). At that point, a soft BKT nudge (not a hard gate) would be the first intervention.

**Source:** `src/persistence/repositories/levelProgression.ts` (`complete()` unlocks next), `src/scenes/LevelScene.ts` (`persistLevelCompletion()`), `src/scenes/LevelMapScene.ts` (ribbon shows mastery independently of unlock).

---

## D-25 — 2026-04-30 — Autonomous Workflows Operating Principle
**Date:** 2026-04-30
**Status:** Accepted

**Decision:** Optimise for maximum autonomy. All recurring mechanical work (bug fixes, curriculum refreshes, PR audits, CI recovery) is delegated to scheduled agent workflows. The solo developer acts as reviewer of agent work, not implementer of mechanical tasks.

**Kill switch:** `AGENT_AUTONOMY_ENABLED` repo variable. Set to `false` to disable all agent dispatch instantly without modifying workflow files.

**Budget:** `AGENT_DAILY_TOKEN_BUDGET` repo variable (informational, ~5M tokens/day initial cap).

**Rationale:** Solo validation project. Agent infrastructure already exists (4 subagents, slash commands, prompt templates). Wiring it into CI maximises throughput without requiring ongoing manual invocation.

---

## D-24 — 2026-04-30 — Committed Claude Code agent harness as canonical onboarding mechanism

**Decision:** The autonomous agent system — `CLAUDE.md` (root + 8 nested subtree guides), `.claude/settings.json` with pre-approved allow/ask/deny tiers, SessionStart/PreCompact/PostToolUse hooks, 9 slash commands, 4 specialist subagents, and `scripts/agent-doctor.mjs` — is the canonical onboarding mechanism for all coding agents working on this repo.

**Why:** Solo project with no human team means onboarding docs must serve AI agents, not people. Committed `settings.json` eliminates per-session permission friction. Nested `CLAUDE.md` files auto-load and provide local context without inflating the root file. `agent-doctor` catches harness drift before it blocks sessions.

**Alternatives:** External wiki or README prose. Rejected — not machine-parseable, not enforceable, not token-efficient.

**Source:** `CLAUDE.md`, `.claude/settings.json`, `scripts/agent-doctor.mjs`, `PLANS/work-queue-2026-04-30.md §P1`

---

## D-23 — 2026-04-30 — Ratification of 9-KC Consolidation Taxonomy

**Decision:** The curriculum's Knowledge Component (KC) taxonomy is consolidated from 33 skills (`SK-NN`) to 9 high-level KCs: `KC-HALVES-VIS`, `KC-UNITS-VIS`, `KC-SET-MODEL`, `KC-PRODUCTION-1`, `KC-PRODUCTION-2`, `KC-SYMBOL-BASIC`, `KC-SYMBOL-ADV`, `KC-MAGNITUDE`, and `KC-ORDERING`.

**Why:** 33 KCs were too granular for effective BKT convergence during short student pilots. Consolidation provides ~31 templates per KC, ensuring stable mastery estimates faster.

**Alternatives:** 12-KC model. Rejected as still too fragmented for 15-minute sessions.

**Source:** `AUDIT_REPORT_A5.md`, `PLANS/curriculum-update.md`

---

## D-22 — 2026-04-30 — Parity Contract: Items, Misconceptions, and Hints

**Decision:** A strict "Parity Contract" is enforced. Every Item Template must target a specific KC and optionally "bait" a specific Misconception. Every detected Misconception must have a corresponding Hint ladder.

**Why:** Prevents "diagnostic black holes" where students fail but the system doesn't know why, or knows why but has no specific remediation.

**Alternatives:** Ad-hoc authoring. Rejected as non-scalable for educational validation.

**Source:** `PLANS/curriculum-update.md §2.2`

---

## D-21 — 2026-04-30 — Adoption of Multi-Phase Curriculum Update Plan

**Decision:** The project officially adopts the 8-phase curriculum update plan (`PLANS/curriculum-update.md`) as the master roadmap for Phase 1 completion.

**Why:** Solidifies the pedagogical foundation (CPA, Equal-Sharing) and aligns the content pipeline with research-grounded standards.

**Alternatives:** Iterative "next-bug" approach. Rejected for lack of systemic rigor.

**Source:** `PLANS/curriculum-update.md`


## D-20 — 2026-04-24 — Content-pipeline retry budget standardized to 3 retries

**Decision:** The content-pipeline generation loop retries failed LLM calls up to **3 times** before aborting and surfacing an error. No other retry count is valid.

**Why:** Fewer retries (1–2) caused intermittent pipeline failures on transient API errors; more than 3 inflated cost without improving success rates in practice. (audit §2.6)

**Alternatives:** Per-stage configurable retries. Rejected — extra configuration surface with no benefit for a solo pipeline.

**Source:** `30-architecture/content-pipeline.md`

---

## D-19 — 2026-04-24 — Hint.type pruned to 3-tier ladder

**Decision:** `Hint.type` is restricted to the values `verbal | visual_overlay | worked_example`. All other candidate types (animated, socratic, peer-example) are removed.

**Why:** A clean 3-tier escalation ladder (verbal → overlay → worked example) is easier to author, easier to test, and matches the interaction model spec. More tiers add authoring cost without evidence of learning benefit. (audit §2.1)

**Alternatives:** 5-tier ladder. Rejected — overfitting to edge cases not observed in K–2 use.

**Source:** `30-architecture/data-schema.md`, `20-mechanic/interaction-model.md`

---

## D-18 — 2026-04-24 — Set-halving (G4.5) cut from L4

**Decision:** The set-halving goal G4.5 is removed from the Level 4 spec. Set-fraction activities are out of MVP scope.

**Why:** `10-curriculum/misconceptions.md` M8 already declares set-fraction activities out of MVP scope. Including G4.5 in L4 contradicted that declaration and risked introducing a mechanic that would need its own validator and archetype. (audit §1.6)

**Alternatives:** Keep G4.5 with a deferred implementation note. Rejected — a goal without an implementation path is noise in the level spec.

**Source:** `10-curriculum/levels/level-04.md`, `10-curriculum/misconceptions.md`

---

## D-17 — 2026-04-24 — Mechanic and QuestionType collapsed into `archetype`

**Decision:** The terms `Mechanic` and `QuestionType` are deprecated synonyms. The single canonical term is **`archetype`**, with values matching `20-mechanic/activity-archetypes.md`. Any code or doc using `mechanic` or `questionType` as an enum name must be updated to `archetype`. (audit §1.5)

**Alternatives:** Keep `Mechanic` as the primary term. Rejected — `archetype` is already used in the file name, validator IDs, and scene naming; collapsing reduces term count.

**Source:** `00-foundation/glossary.md`, `20-mechanic/activity-archetypes.md`, `30-architecture/data-schema.md`

---

## D-16 — 2026-04-24 — Skill IDs consolidated into single registry

**Decision:** All Skill IDs (`SK-NN`) are defined once in `docs/10-curriculum/skills.md`. Per-level files reference skill IDs but do not redefine them.

**Why:** Collisions across level files caused `SkillMastery` overwrite risk — two level docs redefining the same `SK-NN` with different BKT parameters could silently corrupt mastery tracking. A single registry prevents that. (audit §1.1)

**Alternatives:** Each level doc owns its skill definitions. Rejected — the collision risk is not hypothetical; it was observed in the audit.

**Source:** `10-curriculum/skills.md`, per-level specs

---

## D-15 — 2026-04-24 — Misconception ID `MC-PRX-01` is canonical

**Decision:** All references to "Proximity-to-1 confusion" use `MC-PRX-01`. The variant `MC-PROX-01` is invalid and was corrected in `level-08.md` and `level-09.md`.

**Why:** Concise IDs (3-letter family code) are easier to read in JSON dumps and align with the `MC-WHB`, `MC-EOL`, `MC-MAG` conventions already established in `misconceptions.md`.

**Alternatives:** Keep both with one as alias. Rejected — silent aliases create confusion in cross-reference audits.

**Source:** `10-curriculum/misconceptions.md`, `levels/level-08.md`, `levels/level-09.md`

---

## D-14 — 2026-04-24 — Content pipeline lives outside `src/`

**Decision:** The content authoring tool lives in `tools/content-pipeline/`, not `src/`. It's Python (or TypeScript), produces a static JSON seed file at `src/assets/curriculum/v{n}.json`, and never runs in the production app.

**Why:** Build tools and runtime code have different lifecycles, dependencies, and security profiles. Mixing them inflates the production bundle.

**Alternatives:** Inline TS pipeline that runs from npm scripts. Rejected — Python's data/ETL ecosystem is denser, and the seed JSON is the only handoff needed.

**Source:** `30-architecture/content-pipeline.md §6`

---

## D-13 — 2026-04-24 — Programmatic verification replaces LLM accuracy review

**Decision:** Generated `QuestionTemplate` records are verified by Python clones of the runtime validators, not by LLM "accuracy reviewer" agents.

**Why:** K–2 fraction math is finitely verifiable. `1/2 + 1/4 = 3/4` is a one-line check. An LLM reviewer is slower, more expensive, and _less_ reliable than executable code.

**Alternatives:** 3-agent reviewer team from the inherited LangGraph plan. Rejected — over-engineering for trivially-verifiable content.

**Source:** `30-architecture/content-pipeline.md §4`

---

## D-12 — 2026-04-24 — Models for content pipeline: Haiku 4.5 + Sonnet 4.6

**Decision:** Generation uses Claude Haiku 4.5; editorial polish uses Claude Sonnet 4.6.

**Why:** Haiku 4.5 is fast and cheap for templated structured output. Sonnet 4.6 is better at nuanced kid-language phrasing. Total cost ~$3–8 per full curriculum pack regeneration.

**Alternatives:** Claude 3.5 Sonnet (Oct 2024) from inherited plan. Rejected — two model generations old, ~10× cost for the same output.

**Source:** `30-architecture/content-pipeline.md §6.3`

---

## D-11 — 2026-04-24 — Inherited LangGraph plan does not fit; new content-pipeline.md replaces it

**Decision:** The plan in `c:\dev\Test_LangGraph\` is rejected as a direct fit. A Questerix-specific replacement (`docs/30-architecture/content-pipeline.md`) is now the source of truth.

**Why:** Inherited plan generates explanation+MCQ-quiz format; Questerix needs typed `QuestionTemplate` records (placement, comparison, ordering, partition, etc.). Adapting the inherited plan would require replacing ~80% of it. Cleaner to design from the schema outward.

**Alternatives:** Adapt the LangGraph plan in place. Rejected — would inherit the wrong abstractions.

**Source:** `30-architecture/content-pipeline.md §14`

---

## D-10 — 2026-04-24 — `_quarantine/` for now; permanent delete deferred

**Decision:** All deprecated docs (PRODUCT_AUDIT, RoadMap folders 04 & 05, enterprise template files) are moved to `_quarantine/`, not deleted. Permanent delete happens at end of Phase 1.

**Why:** Quarantine is reversible during the foundation-docs review window. If a doc is found to contain salvageable content during cross-reference, it can be restored without git history archaeology.

**Alternatives:** Delete immediately. Rejected — destructive `rm` was blocked by permission system, and moving is safer regardless.

**Source:** `_quarantine/` folder, decision-log entry D-10

---

## D-09 — 2026-04-24 — C8 rewritten as two-axis progression

**Decision:** Constraint C8 (Linear Denominator Progression) is rewritten to specify a two-axis progression: **denominator family × verb**.

- L1–L2: halves only, identify-axis
- L3: thirds + fourths added, still identify-axis
- L4: make halves (verb axis advances)
- L5: make thirds + fourths
- L6+: comparison/ordering, denominator linearity relaxed

**Why:** Original C8 wording was denominator-only and conflicted with `level-03.md` (which introduces fourths) and `level-04.md` (which advances the verb). Two-axis better captures the actual pedagogical structure.

**Alternatives:** Keep one-axis C8 and rewrite all level docs. Rejected — level docs follow established pedagogical sequence; constraint is what should bend.

**Source:** `00-foundation/constraints.md` change log entry 2026-04-24

---

## D-08 — 2026-04-24 — Foundation docs precede code

**Decision:** No new code in `src/` until the `/docs` foundation suite (28 documents) is complete and reviewed.

**Why:** The unanswered questions are pedagogical, not technical. Writing more code before the docs are settled risks throwing away working code when the docs lock in.

**Alternatives:** Build Level 1 in parallel with finalizing docs. Rejected by user direction ("we are far far from coding").

**Source:** `00-foundation/vision.md`, `50-roadmap/mvp-l1-l9.md` Phase 0

---

## D-07 — 2026-04-24 — Storage: Dexie.js on IndexedDB + PWA + persist + JSON export

**Decision:** Persistence stack:

- **Dexie.js v4** wrapping IndexedDB (~22 KB gzipped)
- App ships as installable **PWA** with valid manifest
- App calls `navigator.storage.persist()` after first engagement
- "Backup my progress" button exports IndexedDB → downloadable JSON file

**Why:** localStorage cannot hold the schema. SQLite WASM is overkill (400 KB–1 MB bundle for capabilities we don't need). PGLite is wildly overkill (3 MB). iOS Safari ITP evicts non-PWA storage after 7 days of non-use, so PWA install + persist() is mandatory.

**Alternatives:** localStorage (rejected — too small, evicted), SQLite WASM (rejected — bundle bloat), PGLite (rejected — overkill).

**Source:** `30-architecture/persistence-spec.md`

---

## D-06 — 2026-04-24 — One app, lazy-loaded levels, not 5 separate apps

**Decision:** Levels 1–9 ship in one app bundle; level assets are loaded on demand. No separate apps per grade.

**Why:** Unified UX, shared code, single update surface. Code duplication and fragmented analytics are the bigger costs.

**Alternatives:** Five separate apps per grade band. Rejected — 5× maintenance cost, fragmented user experience.

**Source:** Conversation history; `30-architecture/runtime-architecture.md`

---

## D-05 — 2026-04-24 — User-facing terminology: "Levels" not "Grades"

**Decision:** Student-facing UI says "Level 1, Level 2, ..." not "Grade K, Grade 1." Internal docs may use either when clarifying mapping.

**Why:** "Level" is age-agnostic and game-native; "Grade" carries school baggage and stigma. A 7-year-old playing Level 2 doesn't feel held back; a 7-year-old playing "Grade K" might.

**Alternatives:** Both visible. Rejected — adds vocabulary load without value.

**Source:** `00-foundation/glossary.md`, conversation history

---

## D-04 — 2026-04-24 — Visual style: simple + bright (deprecate neon sci-fi)

**Decision:** Flat design, primary colors, sans-serif (Lexend 400/600, with Nunito 400/700 as fallback). The original neon "Cosmic Blue + Cyan/Pink" theme in `src/data/config.ts` is deprecated.

**Why:** Validation needs the mechanic to be testable, not stylish. K–2 students parse simple shapes faster; A/B testing pedagogy without aesthetic confounds is more reliable.

**Alternatives:** Keep neon aesthetic. Rejected — adds cognitive load without learning gain; conflicts with reduced-motion accessibility.

**Source:** Constraint C6, `20-mechanic/design-language.md`

---

## D-03 — 2026-04-24 — MVP scope: Levels 1–9 only

**Decision:** MVP covers Levels 1–9 (Grade K through Grade 2 fraction concepts). Levels 10+ (Grade 3 operations, Grade 4 reduction, Grade 5 decimals) are post-MVP-2029.

**Why:** Levels 1–5 build the partition+identify+make schema. Levels 6–9 prove that schema teaches _magnitude_ (the only outcome that matters). Operations are a different mechanic and a different validation question.

**Alternatives:** L1–L5 only (faster) or L1–L15 (broader). Rejected — L1–L9 is the smallest scope that proves the mechanic actually teaches.

**Source:** Constraint C3, `00-foundation/vision.md`, `10-curriculum/scope-and-sequence.md`

---

## D-02 — 2026-04-24 — No teacher / parent / admin surface until 2029

**Decision:** MVP has one persona: the student. No teacher dashboard, parent reports, class management, or admin tools before 2029-01-01.

**Why:** Triples surface area without contributing to the core validation question. Teachers and parents may use the app informally during MVP.

**Alternatives:** Lightweight teacher-only surface. Rejected — even "lightweight" requires accounts, which require backend, which requires C1 to be relaxed.

**Source:** Constraint C2, `50-roadmap/post-mvp-2029.md`

---

## D-01 — 2026-04-24 — No backend until 2029

**Decision:** App runs entirely client-side. No servers, no APIs, no authentication, no database hosting until 2029-01-01.

**Why:** Hosting cost, maintenance burden, security review, privacy compliance all out of scope until pedagogical validation passes. The validation question doesn't require a backend to answer.

**Alternatives:** Cheap free-tier backend (Supabase, Firebase) for MVP. Rejected — even free tiers add account/privacy/auth complexity that distracts from validation.

**Source:** Constraint C1, `30-architecture/persistence-spec.md`

---

## How New Decisions Get Added

1. New decision is made (in conversation, in a doc, or in review).
2. Append a new entry at the top of this list with the next `D-NN` ID.
3. Update the source doc(s) with the resolution.
4. If the decision resolves an entry in `open-questions.md`, remove it from there.

Decisions are not deleted; they are superseded. If a decision is reversed later, write a new entry citing the old one as the prior decision being overturned.
