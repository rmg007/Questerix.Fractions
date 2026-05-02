# Road to the Stars — Long-Horizon Roadmap

**Created:** 2026-05-02
**Status:** DRAFT — strategy roadmap, not the active sprint
**Active sprint:** see `PLANS/PLAN.md`
**Scope:** Post-content-lock (after 2026-05-15) through full Grade 1–7 fraction curriculum
**Source:** synthesized from a single planning conversation on 2026-05-02 covering team structure, agent/skill inventory, `.claude/` instruction files, `Topics.md` scope, single-app vs. multi-track architecture, and grade-by-grade rollout pacing.

> **What this is.** A multi-phase plan capturing every direction we agreed was worth pursuing, sized against the actual content in `Topics.md` (422 topics, ~340 beyond K–2) rather than calendar uniformity.
> **What this is not.** A backlog that supersedes `PLAN.md`. Until the content lock lifts on 2026-05-15, the active sprint stays K–2-only and this document is reference material.
> **How to use it.** When the lock lifts, promote Phase 0's outputs into `PLAN.md` and start Phase 1. Re-promote one phase at a time so the active sprint never spans more than one phase.

---

## Phase sequence

Work phases in order. Cross-cutting tracks (team, agents/skills, `.claude/` files, validation) run alongside the grade phases.

| Phase | Name | Window | Gate to advance |
|---|---|---|---|
| **0** | Lock window — validate, decide, prepare | now → 2026-05-15 | K–2 validation evidence captured; C3 decision logged; schema fields landed |
| **1** | Grade 2 finalization | 2026-05-15 → 2026-06-15 | Levels 7–9 polished; teacher-panel review on K–2 complete; 1.0 release tagged |
| **2** | Grade 3 — number-line mechanic | 2026-06-15 → 2026-09-15 | Number-line interaction shipped; equivalent-fractions validators live; pedagogy-check + standards-alignment agents in CI |
| **3** | Grade 4 — multiplication mechanic | 2026-09-15 → 2026-11-15 | Fraction × whole, mixed numbers, decimal-conversion (10/100) shipped; reading-level skill grade-aware |
| **4** | UX-mode fork — Intermediate track | 2026-11-15 → 2026-12-15 | Visual system has 2 modes (Primary, Intermediate); track-picker landing screen; persistence carries `track` field |
| **5** | Grade 5 — division + unlike-denominator mechanic | 2026-12-15 → 2027-03-15 | Divide unit↔whole, multiply two fractions, unlike-denom add/sub shipped; difficulty-calibration agent live |
| **6** | Grade 6 — signed rationals + percent mechanic | 2027-03-15 → 2027-05-15 | Negative fractions, full division, percent ↔ fraction ↔ decimal shipped; notation-renderer-check in CI |
| **7** | Middle-school UX fork (optional) | 2027-05-15 → 2027-06-15 | Decision logged: keep Intermediate look or fork to Middle; if forked, third visual system shipped |
| **8** | Grade 7+ — equations + rational expressions | 2027-06-15 → 2027-08-15 | Two-step equations with fractional coefficients, repeating decimals, powers with fractional bases, rational expressions shipped |

**Total horizon: ~15 months** (2026-05-15 → 2027-08-15). Each phase is sized proportional to its content + mechanic surface, not by calendar uniformity.

---

## Phase 0 — Lock window: validate, decide, prepare

**Window:** now → 2026-05-15 (the content lock is the gate)
**Status:** ⏳ Active (within content lock)
**Effort:** 3–4 weeks part-time. Originally drafted as "2 weeks"; corrected after enumerating tasks. If 0.1 (validation) needs to span multiple study sessions, this stretches to 4 weeks and the lock may need to be extended.
**Why first:** The lock is the one chance to make foundational decisions cheaply. Every later phase rests on the schema, constraint, and document changes that happen here. **If 0.1 fails, the rest of this plan does not start** — see "If validation fails: Plan B" below.

### 0.1 Validate K–2 — does the mechanic teach?

- Capture validation evidence on the existing 9 levels with real students (founder's network)
- Document mastery curves, hint-tier usage, session length, abandonment rate
- If validation **fails**, see "If validation fails: Plan B" — every downstream phase is suspended and this plan is rewritten

**Quantitative gate (all must pass):**
- ≥5 students complete a full L1 session in a real browser tab (per the existing MVP exit criterion)
- ≥3 students complete sessions on each of L2–L9
- Median mastery delta on a target skill ≥ +0.15 across pre/post within a session (using the BKT estimate as the proxy)
- ≤30% of sessions show "stuck on tier-3 hint with wrong answer" — the misconception detectors are catching real errors, not just emitting noise
- ≥70% of teacher-panel reviewers (5 of 8) approve the mechanic as classroom-realistic

If any quantitative gate fails: do **not** advance to 0.2. Diagnose, fix, re-run.

### 0.2 Retire / rewrite C3 via `/decision`

The constraint conflict between **C3** ("Levels 1–9 only — no Grade 3+ content") and `Topics.md` (Grades 1–7+) must be resolved before any grade-expansion work begins.

- Run `/decision` to log the rewrite
- Replace C3 with: "Grades 1–7 fractions, sequenced by phase. Grade 8+ except the rational-expression bridge is out of scope."
- Update `docs/00-foundation/constraints.md` accordingly
- Update top-level `CLAUDE.md` ("K–2 fraction concepts" → "Grade 1–7 fraction concepts, currently scoped through K–2 in MVP")

**Gate:** decision-log entry merged.

### 0.3 Add `gradeBand` and `track` to schema

Without these fields, every later phase rebuilds the same plumbing.

- `LEVEL_META` widens `number` from `1 | 2 | … | 9` literal union → `number`; add `gradeBand: '1' | '2' | '3' | '4' | '5' | '6' | '7'`
- Curriculum schema (`pipeline/output/level_N/all.json` and the runtime bundle) gain a `gradeBand` field
- `progressionStat` (planned Dexie row) gains `gradeBand` and `currentTrack: 'primary' | 'intermediate' | 'middle'`
- Pipeline and validators updated to read/write these fields
- Migration path documented for existing K–2 data

**Gate:** typecheck + parity tests pass; existing 9 levels carry their `gradeBand` assignments.

### 0.4 Reframe `Topics.md` as a vision document and partition by grade

- Move `Topics.md` → `docs/50-roadmap/vision-grade-1-to-7.md`
- Add a header making clear this is sequenced via `road-to-the-stars.md`, not an active backlog
- **Partition into per-grade files** — `vision-grade-1-to-7/grade-2.md`, `grade-3.md`, …, `grade-7.md`. The current flat list is impossible to plan against.
- Each per-grade file lists topic titles and references the upstream `vision-grade-1-to-7.md` line numbers
- Each per-grade file gets a YAML frontmatter with `topic_count` so future agents can verify counts haven't drifted
- Update CLAUDE.md references

**Gate:** moved, partitioned, and cross-referenced. Per-grade topic counts sum to the original 422 (drift tolerance: 0).

### 0.5 Scaffold `.claude/` instruction files (current scope only)

Per the `.claude/` instruction-file conversation, do the K–2-scoped subset now so it's tested before grade expansion stresses it:

- `.claude/skills/` — directory created with `pedagogy-check`, `reading-level`, `child-ux-design`, `level-spec-parity` (K–2-scoped first; expanded per phase)
- `.claude/playbooks/triage.md` — orchestrator-as-doc; diff signature → which subagents/skills to fan out
- `.claude/rubrics/{curriculum,scene,engine}-pr.md` — DRY out checklist logic from existing subagents
- `.claude/glossary.md` — single file: SK-*, MC-*, archetype names, branded ID conventions, "magnetic drag," "snap match"
- `.claude/policies/{content-quality,child-protection,observability}.md` — citable durable rules
- `.claude/templates/{pr-description,plan-phase,decision-log-entry}.md` — boilerplate for repeated artifacts

**Gate:** all four skills fire on K–2 diffs; triage playbook references current 6 subagents correctly.

### 0.6 Promote next phase

When 0.1–0.5 are done, copy Phase 1 into `PLAN.md` as the new active sprint and tag a release.

---

## Phase 1 — Grade 2 finalization (1.0 release)

**Window:** 2026-05-15 → 2026-06-15
**Effort:** 1 month
**Goal:** Polish, not rebuild. Levels 7–9 are already Grade 2.
**Milestone:** **Questerix Fractions 1.0** — first publicly nameable release.

### Engineering
- Complete any deferred polish on Levels 7–9 (Compare Same Num., Benchmarks, Order Fractions)
- Address all teacher-panel feedback from the K–2 review cycle
- Tag `v1.0.0` at end of phase

### Curriculum & content
- Fully calibrate K–2 misconception detectors (MC-WHB-*, MC-MAG-*, MC-PRX-*) against literature with the part-time Math-Ed SME
- Lock the K–2 reading-level catalog (target Flesch ~2.0)

### Brand & positioning (decision must land here, not Phase 4)
- Decide whether "Questerix Fractions" holds across K–7 or splits at the track fork. Land before Phase 2 begins so domain/store/marketing assets aren't bought twice. Log via `/decision`.
- Decide whether 1.0 is a soft launch (founder's network only) or public (App Store / web). Affects Phase 2 child-study recruiting.

### Team
- **Hire (or formalize)**: part-time Math-Ed SME consultant (~10 hrs/week)
- **Recruit**: 5–8 K–2 teacher review panel for one paid review cycle ($75–150/teacher)
- **Run**: first child-study UX session with 5–10 students from founder's network

**Gate:** `v1.0.0` tagged; teacher-panel feedback addressed; ≥5 child-study sessions documented; brand decision logged.

---

## Phase 2 — Grade 3: the number-line mechanic

**Window:** 2026-06-15 → 2026-09-15
**Effort:** 3 months — largest grade in `Topics.md` (~120 topics) and the first new mechanic family
**Goal:** Introduce number lines as a primary representation; ship equivalent fractions, decompose-into-unit-fractions, and like-denominator add/subtract.

### New mechanics
- `NumberLineInteraction` — placing, identifying, comparing fractions on a number line
- `EquivalentInteraction` — model-based equivalence (area, strip, number line)
- `DecomposeInteraction` — fraction as sum of unit fractions
- `LikeDenomArithmeticInteraction` — add/subtract within a single denominator family

### Curriculum content
- ~120 topics from `Topics.md` Grade 3 band
- New misconception families: number-line mis-anchoring, equivalent-fraction multiplicative confusion
- Skill registry expansion (SK-NUMLINE-*, SK-EQUIV-*, SK-DECOMPOSE-*)

### Agents & skills
- **New:** `pedagogy-check` skill grade-band-aware (loads Grade 3 misconception catalog)
- **New:** `standards-alignment` agent (CCSS 3.NF.A.1 through 3.NF.A.3)
- **New:** `prerequisite-chain` agent (asserts Grade 3 levels expect Grade 2 outcomes)
- **Expand:** `validator-parity-checker` covers number-line validators
- **Expand:** `engine-determinism-auditor` covers new selection paths

### Team
- **Hire:** Lead Curriculum Designer (full-time, credentialed; K–5 background)
- **Add to teacher panel:** 3–5 Grade 3–5 teachers
- **Add:** UX Researcher with child-study experience (contractor, hourly)

**Gate:** 10–15 Grade 3 levels shipped; teacher-panel approval; child-study with 5+ Grade 3 students.

---

## Phase 3 — Grade 4: the multiplication mechanic

**Window:** 2026-09-15 → 2026-11-15
**Effort:** 2 months
**Goal:** Multiplication of fractions by whole numbers, mixed numbers, and decimal conversions for denominators 10/100.

### New mechanics
- `MultiplyByWholeInteraction` — area, number-line, and array models
- `MixedNumberInteraction` — convert ↔ improper fraction, identify, compare
- `DecimalConvertInteraction` — fraction ↔ decimal for tenths and hundredths

### Curriculum content
- ~80 topics from `Topics.md` Grade 4 band
- Mixed-number notation across all existing renderers
- Line-plot interaction (modest scope)

### Agents & skills
- **New:** `notation-renderer-check` skill — verifies math typography (mixed numbers in particular) renders accessibly
- **Expand:** `reading-level` skill — variable target per `LEVEL_META.gradeTarget` (Grade 4 target ~Flesch 4.0)
- **Expand:** `child-ux-design` skill — flag where Grade 4 levels still ride K–2 visual conventions that should soften

### Team
- **Add to teacher panel:** Grade 4 teachers fully represented
- **Special-ed reviewer (1)** — first formal review for dyscalculia / dyslexia adaptation

**Gate:** 8–10 Grade 4 levels shipped; mixed-number rendering passes a11y screen-reader review.

---

## Phase 4 — UX-mode fork: Intermediate track

**Window:** 2026-11-15 → 2026-12-15
**Effort:** 1 month (calendar-tight; if visual-design contractor delivers late, slips into Phase 5)
**Goal:** Acknowledge that Grade 4–5 students reject K–2 visual language. Fork the visual system before Grade 5 content lands on top of an unfit shell.
**Calibration note:** the natural seam might be earlier (between Phase 2 and Phase 3) if Grade 4 child-studies in Phase 3 show students already rejecting the Primary look. Re-evaluate at end of Phase 3.

### What ships
- Track picker on first launch and from Settings: "Primary" (Grades 1–4) vs. "Intermediate" (Grades 5–7)
- Second visual system: sparser mascot, denser layouts, math-typography-forward, less-saturated palette (still respects C6's flat-bright)
- Persistence migration: `progressionStat.currentTrack` populated; existing students default to Primary
- Theme tokens forked: `levelTheme.ts` gains intermediate variants
- **Lazy-load track assets** — Primary build does not pay the byte cost of Intermediate art, and vice versa. This is the C2 (1 MB budget) escape valve. Without lazy-loading per track, the budget breaks at three tracks.

### Agents & skills
- **Expand:** `child-ux-design` becomes track-aware
- **Expand:** `a11y-auditor` evaluates both tracks
- **Expand:** `bundle-watcher` measures per-track bundle, not just total
- **New rubric:** `.claude/rubrics/visual-system-pr.md`

### Team
- **Game / Visual Designer (contractor)** — produces Intermediate visual system
- **Motion Designer** — re-tunes feel for older audience

**Gate:** track picker live; Intermediate track passes a11y audit; visual-system-pr rubric in use; per-track gzipped bundle ≤ 1 MB.

---

## Phase 5 — Grade 5: division + unlike-denominator mechanics (2.0 release)

**Window:** 2026-12-15 → 2027-03-15
**Effort:** 3 months — second-largest grade; two heavy mechanics
**Milestone:** **Questerix Fractions 2.0** — full elementary curriculum (K–5) shipped. Natural marketing/communication moment.
**Goal:** Divide unit fractions ↔ whole numbers, multiply two fractions, unlike-denominator add/subtract, scaling.

### New mechanics
- `DivideInteraction` — unit fraction ÷ whole, whole ÷ unit fraction (model-based first)
- `UnlikeDenomArithmeticInteraction` — common-denominator finder, then add/subtract
- `MultiplyTwoFractionsInteraction` — area-model first, then symbolic
- `ScalingReasoningInteraction` — "is this product greater or less than 1?"

### Curriculum content
- ~70 topics from `Topics.md` Grade 5 band
- LCD computation as a sub-skill
- Area of rectangles with fractional sides (geometry crossover)

### Agents & skills
- **New:** `difficulty-calibration` agent — tracks the orthogonal progressions (denominator, operation, sign, notation, model type) that C8's linear progression no longer covers
- **Expand:** `pedagogy-check` — load Grade 5 misconceptions (e.g., multiplication-makes-bigger fallacy)
- **Expand:** `notation-renderer-check` — area models, scaling diagrams

### Team
- **Add to teacher panel:** Grade 5 teachers
- **ELL / Multilingual Specialist (consultant)** — first review on language-neutral examples (anticipating future localization)

**Gate:** 10–12 Grade 5 levels shipped; difficulty-calibration agent producing usable curves; ELL pre-review documented.

---

## Phase 6 — Grade 6: signed rationals + percent mechanics

**Window:** 2027-03-15 → 2027-05-15
**Effort:** 2 months
**Goal:** Negative fractions, full general fraction division, percent ↔ fraction ↔ decimal conversion, reciprocals.

### New mechanics
- `SignedRationalInteraction` — placing negative fractions on a number line, ordering with signs
- `GeneralDivisionInteraction` — non-unit-fraction divisors, "keep change flip"
- `PercentInteraction` — percent ↔ fraction ↔ decimal in three-way conversions
- `ReciprocalInteraction` — multiplicative-inverse identification

### Curriculum content
- ~60 topics from `Topics.md` Grade 6 band
- Absolute value of rational numbers
- Unit rates with fractions

### Agents & skills
- **Expand:** `notation-renderer-check` — signed-fraction screen-reader pronunciation, percent symbols
- **New rubric:** `.claude/rubrics/signed-arithmetic-pr.md`
- **Expand:** `engine-determinism-auditor` — sign handling in selection

### Team
- **Add to teacher panel:** Grade 6 (middle-school) teachers
- **Lived-experience accessibility consultant** — formal review for signed-number screen-reader paths

**Gate:** 8–10 Grade 6 levels shipped; signed-arithmetic rubric in use; lived-experience review documented.

---

## Phase 7 — Middle-school UX fork (optional)

**Window:** 2027-05-15 → 2027-06-15
**Effort:** 1 month
**Goal:** Decide whether the Intermediate track holds for Grade 7+ or whether a third (Middle) visual system is needed.

### Decision criteria
- Grade 6 child-study evidence: do 12–13-year-olds bounce off the Intermediate visuals?
- If **bounce**: ship a Middle track with notation-first layouts, minimal mascot, near-spreadsheet density
- If **hold**: skip this phase, advance directly to Phase 8

### If forked
- Third visual system in `levelTheme.ts`
- Track picker gains "Middle" option
- Existing Grade 6 students surveyed for opt-in migration

**Gate:** decision logged via `/decision`; if forked, third track ships and passes a11y audit.

---

## Phase 8 — Grade 7+: equations + rational expressions (3.0 release)

**Window:** 2027-06-15 → 2027-08-15
**Effort:** 2–3 months — smallest content surface (~30 topics) but most engineering (math typography). Prefer 3 months; pre-algebra typography is historically underestimated.
**Milestone:** **Questerix Fractions 3.0** — full Grade 1–7 curriculum shipped. Plan exit milestone.
**Goal:** Two-step equations with fractional coefficients, repeating decimals, powers with fractional bases, rational expressions, full rational arithmetic.

### New mechanics
- `EquationSolveInteraction` — two-step solving with fractional coefficients
- `RationalExpressionInteraction` — evaluate `(x + 1/2) / (x − 1/2)` style
- `RepeatingDecimalInteraction` — `0.\overline{3}` ↔ fraction conversion
- `PowerWithFractionalBaseInteraction` — `(2/3)^2`-style evaluation

### Curriculum content
- ~30 topics from `Topics.md` Grade 7+ band
- Full rational arithmetic (signed multi-operation expressions)

### Agents & skills
- **Major expansion:** `notation-renderer-check` — `\overline{}`, exponents, rational expressions, multi-line equations
- **New:** `equation-rendering-a11y` skill — screen-reader pronunciation of solved equations and rational expressions

### Team
- **Math-Ed SME (Grade 7+)** — separate consultant; cognition at this band differs sharply from elementary
- **High-school math teacher panel (3–5)** — Grade 7 students often live in middle-school classrooms but pre-algebra concepts spill into Grade 8/9

**Gate:** 5–8 Grade 7+ levels shipped; rational-expression renderer a11y-clean; pre-algebra teacher panel approval.

---

## Cross-cutting tracks (run alongside every phase)

These don't fit a single phase — they progress continuously.

### Track A — Team & hiring

Reference: the team-structure conversation early in this chat. The full role catalogue (engineering + product + curriculum + QA + operations) is preserved here so it doesn't get lost; the right column shows when each role becomes load-bearing.

#### A.1 Product & Learning Design
| Role | Responsibility | Add by phase |
|---|---|---|
| **Product Manager / Producer** | Roadmap, validation criteria, constraint-stewardship, "serve validation not polish" enforcement (C10) | Phase 0 (founder doubles) |
| **Lead Curriculum Designer** | Skill registry (SK-*), misconception catalog (MC-*), per-level concept progression, level-spec authoring | Phase 2 |
| **Math-Ed SME (K–5)** | Reviews misconception catalog vs. literature; ensures detectors map to documented errors; ~10 hrs/week | Phase 1 |
| **Math-Ed SME (Grade 6–7+)** | Separate consultant; cognition at this band differs sharply from elementary | Phase 8 |
| **Reading-Level / Language Reviewer** | Flesch-Kincaid + idiom + cultural-load review on prompts/hints/feedback | Phase 1 (initially same person as SME at small scale) |
| **UX Researcher (child-study)** | Moderated playtests with target-age students; IRB/ethics-aware; reads non-verbal frustration in 5–7 yos | Phase 2 |

#### A.2 Engineering
| Role | Responsibility | Add by phase |
|---|---|---|
| **Tech Lead / Staff Engineer** | Architecture, C1–C10 stewardship, code review, dependency budget | Phase 0 (founder) |
| **Game / Frontend Engineer (Phaser + TS)** | Scenes, interactions, components | Phase 0 (founder) |
| **Learning-Engine Engineer** | BKT, router, selection, calibration, misconception detectors. Stats/ML background. | Phase 2 (or contracted earlier) |
| **Content Pipeline Engineer (Python + LLMs)** | `pipeline/` ownership: Haiku/Sonnet prompts, schema validation, TS↔Python parity | Phase 2 |
| **Platform / Build Engineer** | Vite, CI, bundle measurement, observability gating | Phase 0 (founder) |
| **Accessibility Engineer** | A11yLayer, ARIA, keyboard parity, reduced-motion, axe-core | Phase 3 (often embedded in frontend role at small scale) |

#### A.3 Design
| Role | Responsibility | Add by phase |
|---|---|---|
| **Game / Visual Designer** | Flat-bright system, level themes, color tokens, mascot expressive range | Phase 4 (track fork) |
| **Motion / Interaction Designer** | Easings, magnetic-drag feel, celebration moments, reduced-motion variants | Phase 4 |
| **Sound Designer (optional)** | SFX for snap, success, error; mute & reduced-stimulation prefs | Phase 5 (only if audio scope expands) |

#### A.4 Quality
| Role | Responsibility | Add by phase |
|---|---|---|
| **QA Engineer** | Playwright E2E, device matrix, flake budget | Phase 4–5 (when scope crosses 3 grades) |
| **Educational QA / Content Reviewer** | Spot-checks LLM-generated items for correctness, reading level, bias | Phase 2 (small initially; scales with grade count) |

#### A.5 Educator panels (paid stipend, not employees)
| Panel | Responsibility | Add by phase |
|---|---|---|
| **K–2 Teacher Review Panel (5–8)** | Per-release classroom-realism review; mix of grade levels, school types, regions | Phase 1 |
| **Grade 3–5 Teacher Review Panel (5–8)** | Per-release review for upper elementary | Phase 2 |
| **Grade 6–7 Teacher Review Panel (5–8)** | Per-release review for middle school | Phase 6 |
| **Special Education Teacher (1–2 on each panel)** | Learning-differences lens (dyslexia, dyscalculia, ADHD, autism); cognitive load focus | Phase 3 |
| **ELL / Multilingual Specialist** | Translatability + cross-curriculum compatibility | Phase 5 |
| **Parent Liaison / Recruitment Coordinator** | Recruits test families, manages consent, schedules sessions, handles compensation | Phase 2 |

#### A.6 Accessibility — beyond WCAG
| Role | Responsibility | Add by phase |
|---|---|---|
| **Accessibility Consultant with Lived Experience** | Screen-reader user, low-vision user, or motor-impaired user; per-release review. WCAG floor, not ceiling. | Phase 6 |

#### A.7 Operations
| Role | Responsibility | Add by phase |
|---|---|---|
| **Release / DevOps Engineer** | Static asset hosting/CDN, deploy automation. Minimal because no backend (C1). | Phase 1 (light) |
| **Localization Lead** | Pairs with `src/lib/i18n/` and a translation vendor when expanding beyond English | Post-Phase 8 (deferred) |
| **School Partnership Lead** | Classroom-pilot negotiation, district approval, teacher-researcher relationships | Post-Phase 8 (revisit when product is mature) |

**Solo-vs-team threshold (decision point):** Phase 2 is where solo development becomes infeasible for content; Phase 4 is where it becomes infeasible for visual system. Subagents and skills are force-multipliers but not substitutes for hires past these thresholds.

### Track B — Agents & skills

Reference: the agent/skill inventory conversation. The full picture (existing + proposed) is preserved here so nothing gets lost.

#### B.1 Existing subagents (in `.claude/agents/`) — keep & extend

The 6 subagents already in the repo. All audit engineering quality; none currently audit pedagogy.

| Subagent | What it does | Evolution through this plan |
|---|---|---|
| `c1-c10-auditor` | Guards locked C1–C10 constraints | Update after Phase 0.2 to reflect rewritten C3 |
| `a11y-auditor` | WCAG 2.1 AA, ARIA, touch targets, reduced-motion | Phase 4: track-aware (Primary vs. Intermediate vs. Middle) |
| `bundle-watcher` | 1 MB gzipped JS budget | Phase 4: per-track bundle measurement, not just total |
| `curriculum-byte-parity` | `v1.json` ↔ `bundle.json` byte-identical | No change (mechanical) |
| `engine-determinism-auditor` | No `Math.random`/`Date.now` in `src/engine/` | Phase 6: extend to sign handling in selection |
| `validator-parity-checker` | TS validators ↔ Python pipeline parity | Phase 2: extend to number-line validators; Phase 5+ to division/signed validators |

#### B.2 New subagents — sequenced by need

| Agent | What it does | Add in phase |
|---|---|---|
| `pedagogy-reviewer` | Validates new/changed `pipeline/output/level_N/*.json` against the misconception catalog and skill registry; flags "this level claims to teach SK-X but no item targets it" | Phase 0 (K–2-scoped first) |
| `standards-alignment` | Maps each level to CCSS code(s) and verifies items target what the standard says they should | Phase 2 |
| `prerequisite-chain` | Asserts Level N's expected prior knowledge matches Levels 1..N-1's stated outcomes | Phase 2 |
| `level-spec-parity` | `LEVEL_META` ↔ `docs/10-curriculum/levels/level-NN.md` ↔ pipeline output describe the same level | Phase 0 |
| `difficulty-calibration` | Tracks orthogonal progressions (denominator, operation, sign, notation, model type) that C8's linear progression no longer covers | Phase 5 |
| `triage-orchestrator` | Given a diff, decides which auditors to fan out (replaces "human reads CLAUDE.md table" step). Build only when agent count ≥10. | Phase 5 (likely trigger) |

#### B.3 Existing harness skills (already loaded) — auto-invoke triggers per CLAUDE.md

These are surfaced in every session and don't require new authoring. CLAUDE.md already documents the auto-invoke triggers.

| Skill | Trigger |
|---|---|
| `simplify` | >40 net new LOC in single file under `src/`, or ≥3 files in `src/scenes/interactions/`, `src/validators/`, `src/engine/` |
| `security-review` | Diff touches `src/persistence/**`, `src/lib/observability/**`, `src/lib/i18n/**`, `import.meta.env`, or adds `WebFetch`/`fetch(` |
| `review` | About to ask user to open a PR, or working tree contains a commit on `feat/`/`fix/`/`refactor/` branch with no review |
| `fewer-permission-prompts` | ≥3 permission prompts for read-only Bash/Grep/Read in session |
| `preflight`, `test-changed`, `diag` | Pre-commit gates (mechanical, hook-fired) |
| `sync-curriculum` | Touches curriculum bundle files |

#### B.4 Existing project slash commands (in `.claude/commands/`) — keep

`c5-check`, `decision`, `economy`, `learn`, `recreate-pr`, `retro`, `retro-weekly`, `sprint-status`, `init` (note: `init` is harness-provided). All keep. No reductions planned through Phase 8.

#### B.5 New project-local skills (in `.claude/skills/`) — sequenced by need

This directory does not yet exist; created in Phase 0.5. Skills cover the educator-side judgement that currently has zero automation.

| Skill | Purpose | Add in phase |
|---|---|---|
| `pedagogy-check` | Validates SK-* / MC-* tags; denominator progression; band-appropriate misconception catalog | Phase 0 (K–2); expand each grade phase |
| `reading-level` | Flesch-Kincaid + idiom/pronoun-ambiguity check on user-facing strings; per-`gradeBand` target (Grade 1 → Flesch ~2.0; Grade 7 → ~7.0) | Phase 0; grade-aware in Phase 3 |
| `child-ux-design` | K–2-appropriate replacement for the generic shipped `frontend-design` skill (whose "Brutalist/Maximalist" guidance is actively wrong for our audience). Track-aware in Phase 4. | Phase 0 |
| `level-spec-parity` | Confirms `LEVEL_META` ↔ `docs/10-curriculum/levels/level-NN.md` ↔ pipeline output agree | Phase 0 |
| `notation-renderer-check` | Verifies math typography (mixed numbers, exponents, signed fractions, repeating-decimal `\overline{}`, rational expressions) renders accessibly to screen readers | Phase 3 (mixed numbers); expanded Phase 6 (signs) and Phase 8 (full pre-algebra) |
| `equation-rendering-a11y` | Screen-reader pronunciation of solved equations and rational expressions | Phase 8 |

#### B.6 Shipped-but-not-installed skills (`install/.claude/roadie/skills/`) — review before use

| Skill | Decision |
|---|---|
| `engineering-rigor` | Install for adversarial-red-team / falsifiability discipline. Phase 2+. |
| `frontend-design` | **Do not install as-is** — its built-in aesthetic guidance ("Brutalist," "no system fonts," "asymmetry, diagonal flow") fights C6 ("flat + bright, no neon, no particle storms") and the K–2 audience. If installed, override the aesthetic section. Better: ship `child-ux-design` instead. |

#### B.7 `.claude/` instruction-file scaffolding (full inventory)

Reference: the `.claude/` instruction-file conversation. The full directory plan once Phase 0.5 is done:

```
.claude/
├── agents/                  # existing 6 + new sequenced per B.2 above
├── commands/                # existing 9; new commands sparingly
├── skills/                  # NEW directory; populated per B.5 above
├── rubrics/                 # NEW; review checklists referenced by agents and humans
│   ├── curriculum-pr.md
│   ├── validator-pr.md
│   ├── scene-pr.md
│   ├── engine-pr.md
│   ├── content-quality-bar.md
│   ├── visual-system-pr.md           # added Phase 4
│   └── signed-arithmetic-pr.md        # added Phase 6
├── playbooks/               # NEW; orchestrator-as-doc and protocols
│   ├── triage.md                      # Phase 0 — diff signature → fan-out
│   ├── fan-out-partitions.md          # formalizes CLAUDE.md swarm rules
│   ├── release-checklist.md
│   ├── new-level.md                   # expands "Adding a level" section
│   ├── new-archetype.md               # adding an Nth interaction type
│   ├── teacher-review-cycle.md        # how to package a release for the panel
│   └── child-study-protocol.md        # consent, observation rubric, session coding
├── policies/                # NEW; durable rules an agent can cite
│   ├── data-privacy.md                # C1 + C5 made concrete
│   ├── content-quality.md             # reading level, neutrality, age-appropriateness
│   ├── accessibility-floor.md         # WCAG 2.1 AA + cognitive-load additions
│   ├── child-protection.md            # COPPA/GDPR-K, dark-pattern prohibitions
│   ├── observability-policy.md        # when telemetry may fire, what's never logged
│   └── llm-content-policy.md          # how Haiku/Sonnet output must be reviewed before merge
├── templates/               # NEW; boilerplate for repeated artifacts
│   ├── pr-description.md              # Summary / Test plan / Risk / Subagent fan-out
│   ├── plan-phase.md                  # phase structure with explicit gate criteria
│   ├── decision-log-entry.md
│   ├── learning-entry.md
│   ├── level-spec.md
│   └── misconception-entry.md         # how to author MC-* with literature citation
├── personas/                # NEW; grounding profiles for generative work (Phase 2+)
│   ├── student-k2.md
│   ├── student-grade-3-5.md
│   ├── student-grade-6-7.md
│   ├── teacher-reviewer.md
│   ├── parent-at-home.md
│   └── special-ed-reviewer.md
├── glossary.md              # NEW (Phase 0); single file: SK-*, MC-*, archetypes, branded IDs, "magnetic drag," "snap match"
├── hooks/                   # OPTIONAL; only if hook logic grows beyond 1–2 lines
├── learnings.md             # existing append-only
├── settings.json            # existing
└── agent-runs/              # existing (gitkept)
```

**Selection criterion (when does prose become a separate file?):**
1. Specific agent or skill needs to load *just that file* (rubrics, personas, policies)
2. File is independently versionable / reviewable (playbooks, templates)
3. Multiple agents need to cite the same source (glossary, policies)

If guidance is read by every session unconditionally, it stays in top-level `CLAUDE.md` — fragmenting wastes tokens and dilutes the agent's mental model.

### Track C — `.claude/` instruction files

Reference: the instruction-files conversation. Created in Phase 0, expanded per phase.

```
.claude/
├── skills/                     # Phase 0 → expanded per grade phase
├── rubrics/                    # Phase 0 baseline; new rubric per major mechanic
├── playbooks/                  # triage (P0); teacher-review-cycle, child-study-protocol (P1+)
├── policies/                   # P0 baseline (content-quality, child-protection, observability)
├── templates/                  # P0 (pr, plan-phase, decision-log)
├── glossary.md                 # P0 baseline; updated each phase
├── personas/                   # P2+ (student-by-band, teacher-reviewer, parent-at-home)
├── agents/                     # existing 6; expanded per phase
└── commands/                   # existing 8; new commands sparingly
```

### Track D — Validation & playtest cadence

Reference: the educators/teachers/test-reviewers conversation. **The most important track** — without it, the rest is software being built on hope.

| Cadence | Activity |
|---|---|
| Per phase | One teacher-panel review cycle ($1,000 stipend pool); one child-study session round (≥5 students per grade band) |
| Continuous | In-product telemetry on hint usage, session length, mastery curves |
| Phase 4+ | Special-ed reviewer cycle |
| Phase 5+ | ELL specialist review cycle |
| Phase 6+ | Lived-experience accessibility review cycle |

**Validation gate at every phase end:** if mastery evidence does not show learning, the phase does not advance — the mechanic is reworked, not papered over with content.

---

## Architectural decision: why one app with tracks, not one continuous progression

Captured here so it doesn't get re-litigated:

The conversation evaluated four options for spanning K–7:
- **A. One app, one continuous progression** — "grows with the student." Sounds elegant, rarely works (kids switch apps when peer perception flips ~age 8).
- **B. One app, three tracks** — Primary / Intermediate / Middle. Khan-Kids-vs-Khan-Academy pattern. *Chosen.*
- **C. Three separate apps sharing engine** — best per-band fidelity, highest cost. Revisit only with funding.
- **D. Stay K–2 forever** — fastest validation but caps TAM. Correct *until* validation, then superseded by B.

This roadmap is **B**: shared engine, shared persistence, shared pipeline; forked visual system at Phase 4 (Primary → Intermediate) and optionally at Phase 7 (Intermediate → Middle).

---

## Constraints to revise

Resolved or pending revision through this plan:

| Constraint | Status | Action |
|---|---|---|
| **C3** "Levels 1–9 only" | Conflicts with `Topics.md` | Phase 0.2 — `/decision` to rewrite |
| **C8** "halves → thirds → fourths progression" | One-dimensional; misses orthogonal progressions | Phase 5 — supplement with `difficulty-calibration` agent's multi-axis curves |
| **C2** "1 MB gzipped JS budget" | Tight with three visual modes + math typography | Phase 4 — re-justify or move to lazy-loading per track |
| **C7** "Responsive 360–1024 px" | Holds | No change |
| **C9** "Sessions ≤ 15 min per level" | Generous for K–2, tight for Grade 7 | Phase 6 — allow per-band overrides |
| **C5** "localStorage: lastUsedStudentId only" | The `unlockedLevels:*` deviation must move to `progressionStat` Dexie row | Phase 0.3 — fold into the schema migration |

All other constraints (C1, C4, C6, C10) hold across the entire roadmap.

---

## Open decisions (revisit at their phase boundaries)

1. **Solo vs. team** — at what phase does solo development become untenable? Likely Phase 2 (Grade 3) for content; Phase 4 for visual system.
2. **Release model** — single rolling product gaining grades vs. discrete band-specific releases. Lean rolling for now.
3. **Brand** — does "Questerix Fractions" hold across K–7, or does the brand split when tracks fork? Decide before Phase 4.
4. **Pricing / monetization** — entirely unscoped here. C1 still says no backend, no accounts; pricing typically requires both.
5. **Localization** — deferred until after Phase 8. Track B's ELL specialist gives early-warning data on translatability.
6. **Topics.md reframe** — does it become public marketing material once it's a vision doc, or stay internal?

---

## Release milestones

Three named releases anchor the plan and serve as natural communication moments:

| Release | End of | Scope at release | Audience |
|---|---|---|---|
| **1.0** | Phase 1 | K–2 fractions (current 9 levels, polished) | Soft launch — founder's network, then optionally App Store / web |
| **2.0** | Phase 5 | Full elementary K–5 fractions (~40+ levels across two visual tracks) | Public launch — paid teacher panels, broader recruitment |
| **3.0** | Phase 8 | Full Grade 1–7 fractions including rational expressions (~60+ levels across 2–3 tracks) | Curriculum-complete; plan exit milestone |

Between milestones, ship per-grade releases (e.g., 1.1 = Grade 3 added, 1.2 = Grade 4 added) but treat the named milestones as communication and validation gates.

---

## Success metrics & quantitative thresholds

Replaces "shipped" with measurable outcomes. Every phase's gate also requires its phase-specific quantitative bar.

### Per-phase recurring metrics

For every grade phase (Phases 1, 2, 3, 5, 6, 8):

| Metric | Threshold | Source |
|---|---|---|
| Median mastery delta on a target skill (BKT estimate) | ≥ +0.15 across pre/post within a session | IndexedDB `attempts` + `skillMastery` |
| Session completion rate | ≥ 70% of started sessions completed | `sessions` table |
| Hint-tier-3 fall-through with wrong answer | ≤ 30% of attempts | `attempts` + `hintsTaken` |
| Teacher-panel approval | ≥ 70% (5 of 8) approve as classroom-realistic | review-cycle survey |
| Child-study sessions documented | ≥ 5 students per grade band | session notes + recordings |
| 95th-percentile session duration | ≤ C9's per-band override | `sessions.startedAt` / `endedAt` |

### Phase-specific bars

| Phase | Additional bar |
|---|---|
| 0 | All quantitative bars in 0.1 above must pass before 0.2 starts |
| 4 | Per-track gzipped JS bundle ≤ 1 MB (C2 holds when split) |
| 6 | Lived-experience accessibility consultant signs off on signed-fraction screen-reader paths |
| 8 | Math-typography renders correctly across iOS Safari, Android Chrome, desktop Chromium (C7 device matrix) |

If a phase ships content but misses the metrics bar, it does **not** advance — see "Risks & mitigations: M2".

---

## Risks & mitigations

Captured here so the plan doesn't read as a triumph march. Each risk has an owner and a phase boundary at which to revisit.

| ID | Risk | Likelihood | Mitigation | Trip-wire |
|---|---|---|---|---|
| **R1** | K–2 mechanic does not teach (validation fails) | medium | "If validation fails: Plan B" branch; do not advance Phase 0 | Phase 0 quantitative gate |
| **R2** | Solo founder cannot sustain Phase 2 (Grade 3, 3 months, ~120 topics) alone | high | Pre-arrange Lead Curriculum Designer hire by mid-Phase 1 | Phase 1 mid-point |
| **R3** | C2 (1 MB bundle) breaks at three tracks even with lazy-loading | medium | Phase 4 explicit deliverable: per-track lazy-load + bundle measurement; if budget breaks, escalate to formal C2 revision via `/decision` | Phase 4 gate |
| **R4** | Teacher-panel feedback is unactionable noise (vague or contradictory) | medium | Use the `teacher-review-cycle.md` playbook from Phase 1 onward to standardize the review prompt; pay for written rationale, not just thumbs-up/down | After first cycle in Phase 1 |
| **R5** | Math-Ed SME consultant doesn't materialize | medium | Founder serves as SME with explicit literature-citation discipline; quality bar drops; Phase 1 1.0 ships but Phase 2 cannot start without the hire | Phase 1 mid-point |
| **R6** | Phase 4 visual-system fork delivered late by contractor | high | Build a dummy Intermediate theme via token swap (no new art) so Phase 5 content engineering can proceed in parallel; replace with real art when contractor delivers | Phase 4 mid-point |
| **R7** | Misconception detectors over-fire (false positives) | medium | The "≤30% tier-3 fall-through with wrong answer" metric catches this; calibrate per phase | Per-phase metrics review |
| **R8** | Grade 7+ math typography proves harder than estimated | high | Phase 8 effort marked 2–3 months; default to 3; if still slipping, descope rational expressions to 3.1 release | Phase 8 mid-point |
| **R9** | Brand split between K–4 and 5+ creates two unfundable sub-brands | medium | Brand decision moved to Phase 1 (was Phase 4); decide before audience is split | Phase 1 gate |
| **R10** | Pipeline LLM (Haiku/Sonnet) generates pedagogically wrong content for higher grades | medium | `pedagogy-reviewer` agent in CI from Phase 0 onward; Math-Ed SME human review at every release | Continuous |
| **R11** | A new mechanic (number lines, division, signed) lands but isn't used by students | medium | Telemetry on per-archetype attempt rate; if an archetype ships but is consistently skipped, treat as failed feature, not "low engagement" | Per-grade-phase metrics |
| **R12** | Child-study recruiting is the slow path | high | Parent Liaison hire in Phase 2 specifically owns this; budget realistic stipends ($25–50/session for parents, $75–150 for teachers) | Phase 2 mid-point |
| **R13** | Localization (post-Phase 8) reveals cultural baggage in examples (currencies, names, foods) | medium | ELL specialist Phase 5 review surfaces this early; strings catalog uses neutralized examples | Phase 5 gate |

---

## If validation fails: Plan B

The single biggest risk in this plan (R1). Captured explicitly so it isn't decided in panic.

If Phase 0.1 quantitative gates fail — students do not show measurable mastery deltas, or completion rates collapse, or teacher-panel rejects classroom realism — the response is **not** to ship anyway. Order of operations:

1. **Diagnose with the misconception detectors.** Are they catching real errors, or noise? If they fire on every wrong answer, the detectors are wrong (and the data underneath is suspect). If they fire on no wrong answer, the catalog doesn't reflect actual student errors.
2. **Mechanic vs. content.** Are students failing because the magnetic-drag mechanic confuses them, or because the questions are unclear? UX research distinguishes these.
3. **One of three branches:**
   - **Branch B-Mechanic** — the magnetic-drag mechanic does not teach. Spend 4–8 weeks prototyping an alternative interaction (number-line-first, manipulative-first, fold-based). The plan effectively restarts at a new Phase 0.
   - **Branch B-Content** — the mechanic teaches but the K–2 content needs major rewriting. Spend 2–4 weeks on a content-only revision; re-run validation; advance.
   - **Branch B-Audience** — the mechanic teaches some students but not the K–2 cohort. Consider compressing K–2 (Phase 1) and starting full energy at Grade 3 (Phase 2) where number-line representations may carry more weight than partition.
4. **Document the negative result.** A "validation showed the mechanic doesn't teach K–2" finding is genuinely valuable — log via `/decision` with the data attached, archive this plan, and start a new one. Negative results are not failures.
5. **Do NOT pretend.** Shipping content on top of an unvalidated mechanic produces a product that confuses 5-year-olds at scale, which is worse than not shipping.

This plan does not assume Branch B is needed. It assumes K–2 will validate. If it does, this section is unread; if it does not, this section is the most important page in the document.

---

## Budget placeholder (orders of magnitude, not committed numbers)

A 15-month roadmap with hires, contractors, and stipend pools needs at least a rough budget shape. These are placeholders to be revised when planning becomes financial.

### Per-phase variable cost (rough)

| Phase | Teacher panel | Child-study stipends | Contractors | Approx. range |
|---|---|---|---|---|
| 0 | — | $250 (5 × $50) | — | **$250** |
| 1 | $1,000 | $500 | — | **$1,500** |
| 2 | $1,000 | $1,500 | UX researcher hourly | **$5,000–8,000** |
| 3 | $1,000 | $1,000 | Special-ed reviewer | **$3,000–5,000** |
| 4 | — | — | Visual designer + motion designer | **$10,000–25,000** |
| 5 | $1,500 | $1,500 | UX, ELL specialist | **$5,000–8,000** |
| 6 | $1,500 | $1,500 | Lived-experience consultant | **$5,000–8,000** |
| 7 | — | — | Visual designer (if forking) | **$0–15,000** |
| 8 | $1,500 | $1,000 | Pre-algebra teacher panel | **$3,000–5,000** |

**Variable total across 15 months: ~$33,000–80,000** (excluding salaries).

### Standing costs (if hires happen)

- **Math-Ed SME (~10 hrs/wk × $150/hr × 60 weeks)**: ~$90,000
- **Lead Curriculum Designer (full-time, Phase 2+, 12 months × $8–10K/mo)**: ~$96,000–120,000
- **QA Engineer (full-time, Phase 4+, 9 months × $7–10K/mo)**: ~$63,000–90,000
- **Founder engineering time**: out of scope for this budget

**Standing total if all three hire by Phase 5: ~$250,000–300,000.**

These are orders of magnitude. They tell the user: "this plan is not free, and the educator-side costs are non-trivial relative to the engineering costs that solo founders typically optimize for." Pricing/monetization (an open decision) will need to engage with these numbers eventually.

---

## Competitive landscape (brief)

Captured to anchor positioning, not to drive features. Each is a nearby product with relevant lessons.

| Product | What we learn |
|---|---|
| **DragonBox Numbers / Algebra** | One distinctive mechanic per app, narrow grade band per app. Validated their pedagogy through real classroom studies. Closest spiritual sibling. |
| **Khan Academy Kids** vs. **Khan Academy** | The split-product pattern at the K–2/3+ boundary. Direct evidence for our "one app, three tracks" decision (we keep the engine; they keep two products). |
| **Prodigy Math** | Engagement-first; concerning dark-patterns in monetization. Cautionary tale; reinforces our `child-protection.md` policy. |
| **ABCMouse / Adventure Academy** | Subscription model for K–2 / K–8. Demonstrates that the audience supports paid distribution, but the parent-purchase friction is the bottleneck. |
| **Mathletics, IXL** | Curriculum-aligned, classroom-led. Different distribution model (school-purchased) — orthogonal to our consumer angle. |

**Differentiator we hold:** validated, single-mechanic-per-grade pedagogy with explicit misconception detection. None of the above publish their misconception catalogs or detector accuracy. That can be a positioning advantage.

---

## Provenance

This plan was synthesized from a single planning conversation on 2026-05-02 covering:

1. **Team structure** for building this kind of software — engineering, design, learning science, QA roles
2. **Hiring beyond engineers** — credentialed educators, K–2 teacher review panel, child-study UX researchers, special-ed/ELL/lived-experience accessibility reviewers
3. **Existing Claude agent/skill inventory** — what's covered (engineering-quality), what's missing (pedagogy, curriculum, orchestration)
4. **`.claude/` instruction file additions** — skills, rubrics, templates, policies, playbooks, glossary, personas
5. **`Topics.md` scope analysis** — 422 topics across Grades 1–7+, ~340 beyond K–2
6. **Content lock through 2026-05-15** — what stays in scope during the freeze
7. **Single-app strategy for K–7** — the four architectural options; "one app, three tracks" chosen
8. **Phased rollout pacing** — proportional to actual content + mechanic cost rather than calendar uniformity

The conversation also surfaced that `Topics.md` is **not a backlog** — it's a vision document. This plan is the actionable form.
