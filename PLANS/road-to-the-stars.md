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

**Window:** now → 2026-05-15
**Status:** ⏳ Active (within content lock)
**Effort:** 2 weeks part-time
**Why first:** The lock is the one chance to make foundational decisions cheaply. Every later phase rests on the schema, constraint, and document changes that happen here.

### 0.1 Validate K–2 — does the mechanic teach?

- Capture validation evidence on the existing 9 levels with real students (founder's network)
- Document mastery curves, hint-tier usage, session length
- If validation **fails**, every downstream phase is suspended and this plan is rewritten

**Gate:** at least 5 students complete a full session, with mastery deltas visible in IndexedDB.

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

### 0.4 Reframe `Topics.md` as a vision document

- Move `Topics.md` → `docs/50-roadmap/vision-grade-1-to-7.md`
- Add a header making clear this is sequenced via `road-to-the-stars.md`, not an active backlog
- Update CLAUDE.md references

**Gate:** moved + cross-referenced.

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

## Phase 1 — Grade 2 finalization

**Window:** 2026-05-15 → 2026-06-15
**Effort:** 1 month
**Goal:** Polish, not rebuild. Levels 7–9 are already Grade 2.

### Engineering
- Complete any deferred polish on Levels 7–9 (Compare Same Num., Benchmarks, Order Fractions)
- Address all teacher-panel feedback from the K–2 review cycle
- Tag **Questerix Fractions 1.0** at end of phase

### Curriculum & content
- Fully calibrate K–2 misconception detectors (MC-WHB-*, MC-MAG-*, MC-PRX-*) against literature with the part-time Math-Ed SME
- Lock the K–2 reading-level catalog (target Flesch ~2.0)

### Team
- **Hire (or formalize)**: part-time Math-Ed SME consultant (~10 hrs/week)
- **Recruit**: 5–8 K–2 teacher review panel for one paid review cycle ($75–150/teacher)
- **Run**: first child-study UX session with 5–10 students from founder's network

**Gate:** 1.0 tagged; teacher-panel feedback addressed; ≥5 child-study sessions documented.

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
**Effort:** 1 month
**Goal:** Acknowledge that Grade 4–5 students reject K–2 visual language. Fork the visual system before Grade 5 content lands on top of an unfit shell.

### What ships
- Track picker on first launch and from Settings: "Primary" (Grades 1–4) vs. "Intermediate" (Grades 5–7)
- Second visual system: sparser mascot, denser layouts, math-typography-forward, less-saturated palette (still respects C6's flat-bright)
- Persistence migration: `progressionStat.currentTrack` populated; existing students default to Primary
- Theme tokens forked: `levelTheme.ts` gains intermediate variants

### Agents & skills
- **Expand:** `child-ux-design` becomes track-aware
- **Expand:** `a11y-auditor` evaluates both tracks
- **New rubric:** `.claude/rubrics/visual-system-pr.md`

### Team
- **Game / Visual Designer (contractor)** — produces Intermediate visual system
- **Motion Designer** — re-tunes feel for older audience

**Gate:** track picker live; Intermediate track passes a11y audit; visual-system-pr rubric in use.

---

## Phase 5 — Grade 5: division + unlike-denominator mechanics

**Window:** 2026-12-15 → 2027-03-15
**Effort:** 3 months — second-largest grade; two heavy mechanics
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

## Phase 8 — Grade 7+: equations + rational expressions

**Window:** 2027-06-15 → 2027-08-15
**Effort:** 2 months — smallest content surface (~30 topics) but most engineering (math typography)
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

Reference: the team-structure conversation. Roles staged by phase (consolidated):

| Role | Add by phase |
|---|---|
| Math-Ed SME (K–5) | Phase 1 |
| Lead Curriculum Designer | Phase 2 |
| K–2 teacher panel (5–8) | Phase 1 |
| Grade 3–5 teacher panel | Phase 2 |
| Grade 6–7 teacher panel | Phase 6 |
| UX Researcher (child-study) | Phase 2 |
| Special-ed reviewer | Phase 3 |
| ELL specialist | Phase 5 |
| Lived-experience a11y consultant | Phase 6 |
| Game / Visual Designer | Phase 4 (track fork) |
| Motion Designer | Phase 4 |
| Math-Ed SME (Grade 7+) | Phase 8 |
| QA Engineer (full-time) | when scope crosses 3 grades (Phase 4–5) |
| Localization Lead | post-Phase 8 (deferred) |

### Track B — Agents & skills

Reference: the agent/skill inventory conversation. Additions sequenced by need:

**Now (Phase 0)**:
- `pedagogy-check` skill (K–2-scoped)
- `reading-level` skill
- `child-ux-design` skill
- `level-spec-parity` skill

**Phase 2 (Grade 3)**:
- `standards-alignment` agent
- `prerequisite-chain` agent

**Phase 3 (Grade 4)**:
- `notation-renderer-check` skill

**Phase 5 (Grade 5)**:
- `difficulty-calibration` agent

**Phase 8 (Grade 7+)**:
- `equation-rendering-a11y` skill

**When agent count crosses 10** (likely Phase 5):
- `triage-orchestrator` agent — replaces the "human reads CLAUDE.md table to decide which subagents fan out" step

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
