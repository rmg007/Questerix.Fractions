# Plan: Curriculum — Foundations, System, and Continuous Improvement

**Status:** ACTIVE — Adopted 2026-04-30 per Decision D-017.
**Last updated:** 2026-04-29
**Sibling plans:** [curriculum-completion-phase-3.plan.md](./curriculum-completion-phase-3.plan.md), [harden-and-polish.md](./harden-and-polish.md), [ux-elevation.md](./ux-elevation.md), [audio.md](./audio.md), [master_audit_roadmap.md](./master_audit_roadmap.md)
**This plan:** the curriculum is the product. Engine, persistence, UX, and audio are delivery layers. This document defines the curriculum's theory of action, learning architecture, item-design science, authoring system, validation, equity, operations, and roadmap.

> **Stale-number caveat.** Several quantitative claims in this document (§1.4, §5.2, §7.3, §8.2 audit notes) reflect the v1 audit conducted before the 2026-04-26 Phase 0b-1 hand-author work and the 2026-04-28 Phase 7 hint completion. The bundle today contains **255 templates** (not the ~150 the v1 audit assumed); L8/L9 added 54 hand-authored templates tagged SK-27..SK-33; some misconception-template counts have shifted. **Phase A.5 must re-run the density audit against the live bundle** before any consolidation/expansion decision is final. The structure of this plan and its decisions are unaffected; the specific numbers cited are.

---

## TL;DR

This plan answers: **"What does it take to call the curriculum a real curriculum, not a backlog?"**

**Six load-bearing decisions:**
1. Pedagogical framework: CPA + Equal-Sharing + Number-Line (§1)
2. KC taxonomy: consolidate ~33 → ~18 pending live audit (§5.3, Phase A.5)
3. Quality gates: six lenses, not one (§16, Phase A.7)
4. Misconception catalog: research-grounded 12 entries, ≥ 8 fully wired pre-launch (§7)
5. Standards: 5-framework crosswalk at launch (§20, Phase D)
6. Validity claims: content + substantive at launch only; predictive deferred to pilot (§21)

**Eight-phase delivery (§28):** A → B → C → D → E → F → [LAUNCH] → G → H

**Five things that do *not* happen in this plan** (delegated to sibling plans):
- Engine wiring, BKT call-sites, persistence → [harden-and-polish.md](./harden-and-polish.md)
- TTS pipeline (pre-rendered build-time) → [audio.md](./audio.md)
- UI delight, FractionDisplay, mascot → [ux-elevation.md](./ux-elevation.md)
- Bundle correctness, hint generation, regeneration execution → [curriculum-completion-phase-3.plan.md](./curriculum-completion-phase-3.plan.md)
- App-layer architecture, domain purity → [master_audit_roadmap.md](./master_audit_roadmap.md)

---

## Relationship to other plans

| Plan | Owns | This plan delegates to it |
|---|---|---|
| [curriculum-completion-phase-3.plan.md](./curriculum-completion-phase-3.plan.md) | Bundle correctness, regeneration, hint generation (864-hint catalog), L5/L6/L7/L9 variety work | §27 tactical fixes; the execution of Phase B; the slice fix; §13.3 hint-cost wiring (its task C7.8) |
| [harden-and-polish.md](./harden-and-polish.md) | Engine wiring, persistence, logging substrate (R49–R56), a11y bugs | Phase G analytics substrate (Dexie schema v5 telemetryEvents from R49); Level01Scene validator-lookup fix (master-audit) feeding §8 BKT signal |
| [audio.md](./audio.md) | TTS pipeline (pre-rendered, OpenAI gpt-4o-mini-tts), audio manifest | §13 hint delivery; §16.4 audio-manifest-keyed rule; §25 multilingual cost-per-locale (~$5–15) |
| [ux-elevation.md](./ux-elevation.md) | Visual delight, FractionDisplay component (T1) | §16.1 Unicode-fraction rule rendering implementation |
| [master_audit_roadmap.md](./master_audit_roadmap.md) | Application-layer architecture, domain purity, portability | Engine architectural assumptions in §8; engine-museum (selection/router/calibration uncalled from L1) caveats in §8.1 |

---

## §0 — Stance: why v1 wasn't enough

v1 (this same file, prior version) treated curriculum as a maintenance problem: fix the slice bug, regenerate the thin levels, tighten the validator, hire a specialist for one day. Those are real fixes and remain in this v2. But framing curriculum as a backlog of gaps misses what it actually is in an educational app:

| Curriculum is the … | Implication |
|---|---|
| Product itself | Everything else is a delivery mechanism |
| Pedagogical theory of action | What we *believe will teach* must be explicit |
| Assessment instrument | What we *measure* must have validity |
| Data substrate | Learning analytics describe curriculum, not the other way around |
| Intellectual property | What makes the app defensible and licensable |
| Equity surface | What every child encounters; bias here is bias everywhere |
| Standards-compliance proof | Schools require traceability we currently can't produce |

**v1 addressed only the first.** This v2 addresses all seven.

It is consequently longer, structured in eight parts, and explicit about its philosophical commitments. The four tactical fixes from v1 are absorbed into Part VII (Operations) but they are not the headline.

---

## Quick navigation

- **Part I — Foundations** (theory of action, what we believe, what we don't teach) §§1–3
- **Part II — Learning Architecture** (objectives, KCs, prerequisites, misconceptions, mastery model) §§4–8
- **Part III — Item Design Science** (principles, representations, distractors, difficulty, scaffolds) §§9–13
- **Part IV — Authoring System** (pipeline, registry, quality gates, parity contract, lifecycle) §§14–18
- **Part V — Validation and Research** (invariants, standards, empirical validation, pilot design) §§19–22
- **Part VI — Equity and Inclusion** (cultural, accessibility, multilingual, bias audit) §§23–26
- **Part VII — Operations** (tactical fixes, phasing, governance, cost, risks, decisions) §§27–32
- **Part VIII — Roadmap** (MVP, v1.x, v2, Curriculum 2.0) §§33–36
- **Appendices** (v1 cross-reference, bibliography, open questions)

---

# Part I — Foundations

## §1 — Theory of action

A curriculum without a stated theory of action is a list of items pretending to be a curriculum. We name ours explicitly so every downstream decision can be tested against it.

### §1.1 Synthesized framework: CPA + Equal-Sharing + Number-Line Emphasis

Three research traditions inform the K-2 fractions sequence:

**Concrete-Pictorial-Abstract (CPA, Singapore Math / Bruner)** — children encounter a concept first in a manipulable form, then in a visual representation, then in symbolic notation. For K-2 on a digital tablet, "concrete" = a directly-manipulated shape (drag a partition line); "pictorial" = a static visual (a fraction shown as a divided shape); "abstract" = the numeric symbol "1/2".

**Equal-Sharing as Gateway (Empson & Levi 2011)** — the most cognitively accessible entry to fractions for K-2 is the equal-sharing context ("2 cookies shared by 4 children, what does each get?"). It precedes formal partition language. Children's intuitions about fairness do the heavy lifting.

**Number-Line Emphasis (Siegler et al. 2011, 2013)** — fluency with fractions on a number line in K-2 predicts later algebra performance more strongly than any other K-2 fraction skill. Number-line representation must appear early, not be quarantined to a single late level.

### §1.2 What this commits us to

1. **Every concept appears visually before it appears symbolically.** No level introduces a notation before showing the underlying quantity.
2. **The first encounter with a fraction is in a sharing context, not a labeling task.** Even when the activity is "identify the half," the framing draws on sharing.
3. **Number-line representation appears in supporting roles from L3 onward, not only at L8.** A child who has not seen a number line until L8 has missed the most predictive K-2 representation.
4. **Manipulation precedes recognition.** Levels with `make` archetype (creating a fraction) precede levels with pure `identify` archetype (selecting from given fractions) wherever pedagogically possible.
5. **Errors are evidence, not failures.** Wrong answers reveal which mental model is at work. The hint and feedback systems are *diagnostic instruments*, not corrective punishments.

### §1.3 What this rules out

- Symbol-first instruction ("today we will learn that 1/2 means…")
- Fraction-as-two-numbers framing (treating the numerator and denominator as independent values)
- Heavy reading load before mastery (the cognitive cost of decoding text steals capacity from mathematical reasoning)
- Timed problem-solving (introduces construct-irrelevant variance: speed)
- Competitive framing (introduces another construct-irrelevant variance: social comparison)

### §1.4 Audit: does the existing curriculum honor this?

> **Audit basis:** counts and observations below reflect a pre-2026-04-26 audit of the bundle. The current bundle has 255 templates (re-audit pending in Phase A.5). Specific quantitative claims (e.g., template counts per misconception) may be stale; the *patterns* the audit identified (no sharing context, no number-line in early levels, detector/template parity gaps) remain accurate.

| Commitment | Current state | Gap | Addressed in |
|---|---|---|---|
| Visual before symbolic | Mostly honored — `partition` and `identify` archetypes are visual. L4 `make` and L5 `make` / `snap_match` not yet audited at the visual-primacy level | Verify | Phase A.1 (level-spec rewrites) |
| Sharing context | **Not visible in the existing prompts.** Searched the bundle for `cookie\|pizza\|sandwich\|cake\|paper.fold\|garden\|ribbon\|share` — zero hits. Every prompt today is a bare imperative ("Split this rectangle into 2 equal parts.") | Major gap | Phase B (re-author prompts with sharing contexts; bundle-wide content rewrite, not just regeneration of thin levels) |
| Number-line in supporting roles | Number-line is L8-introduced (`SK-27` per `skills.md`) — there is no number-line representation in L1–L7 today. (Earlier internal note "L6 River" referred to the ux-elevation world-map theme, not actual representation.) | **Missing in L1–L7.** | Phase B re-authoring per §10.1 distribution table; ties to §32 decision #8 |
| Manipulation before recognition | `make`/`partition` (L1, L4, L5) precede pure `identify` (L2)? Audit shows L1 mixes partition + identify, L2 is identify-heavy | Acceptable but needs sequence verification | Phase A.1 + Phase C specialist sequence review |
| Errors as evidence | Misconception detector framework exists. v1 audit found 5/7 misconceptions with detector/template mismatches; **§7.3 numbers are stale post-Phase-0b-1** — must be re-counted | Re-audit, then tactical fix | Phase A.5 (re-count) → Phase B.2/B.3 (resolve actual mismatches) |

The pedagogical framework is partially honored by accident (the engine and archetype design support it) but no document captures it as an explicit commitment. This v2 plan establishes that.

---

## §2 — Out-of-scope: what we deliberately don't teach

Equally important. A curriculum's discipline is what it leaves out.

| Topic | Why excluded from K-2 MVP |
|---|---|
| Fraction addition / subtraction (with same denominator) | CCSS introduces in Grade 4. K-2 not developmentally ready. |
| Fraction multiplication / division | Grade 5+ |
| Improper fractions and mixed numbers | Conceptually presupposes operations; Grade 3+ |
| Decimal-fraction equivalence | Grade 4+ |
| Percent | Grade 6+ |
| Negative fractions | High school |
| Fraction word problems requiring multi-step arithmetic | Grade 3+ |
| Algebraic fraction manipulation | Grade 8+ |
| Ratio and proportional reasoning (formal) | Grade 6+ |

The curriculum has no level addressing these, and the validation gates (§19) will *enforce* their absence — preventing future scope drift via well-meaning content additions.

---

## §3 — Audience and design parameters

| Parameter | Commitment |
|---|---|
| Primary age | 5–7 (US K-2; equivalent: UK Reception/Y1/Y2; international roughly Stages 1–3) |
| Reading level | Flesch-Kincaid grade ≤ 1.5 for prompts, ≤ 2.0 for system copy |
| Session duration | ~5 minutes (5 problems × ~30–60 s each, per existing C9 constraint) |
| Total time-to-mastery target | ~15 hours of cumulative play across 9 levels |
| Prerequisite math | Number recognition 0–10; counting; one-to-one correspondence |
| Prerequisite reading | None (curriculum must work for pre-readers via TTS + visual primacy) |
| Modality | Touch-primary, mouse-secondary; keyboard accessibility is a target, not yet achieved (canvas keyboard bindings missing per `curriculum-completion-phase-3.plan.md` C6.8). Tracked there, not here. |
| Sensory accommodation | Visual + audio; deaf/HoH supported by visual; blind supported by audio + structured layout |
| Cultural framing | Globally neutral; no Western-default contexts as primary |
| Language | English at MVP; ELL-aware copy; pipeline supports multilingual at v1.x |

These parameters constrain every authoring decision in Parts III and IV.

---

# Part II — The Learning Architecture

## §4 — Learning objectives per level

A learning objective is an *observable behavior demonstrating mastery*. Currently the level docs (`docs/10-curriculum/levels/level-NN.md`) describe each level qualitatively. This phase makes them rigorous.

### §4.1 Format requirement

Every level's spec must declare, in this order:
1. **Mastery objective** — single sentence, observable behavior. ("The student divides a regular shape into two equal parts within 8% area tolerance, on 4 of 5 first-try attempts.")
2. **Prerequisite skills** — list of KC IDs from §5
3. **Skills introduced** — list of KC IDs newly active at this level
4. **Skills reinforced** — list of KC IDs from prior levels exercised again here
5. **Misconceptions targeted** — list of MC IDs from §7
6. **Representations used** — at least one of: area, set, linear (number-line), measurement
7. **Out-of-scope at this level** — what we're *not* asking the child to do here
8. **Evidence-of-mastery threshold** — quantitative: BKT estimate ≥ 0.85 (existing) plus first-try accuracy ≥ 70% on last 8 attempts (new requirement; today only BKT is checked)

### §4.2 Audit findings against current level docs

The existing 9 level docs (L1–L9) **do not** consistently include:
- Quantitative mastery thresholds beyond BKT
- Out-of-scope statements (what the level is *not* teaching)
- Reinforced-skill lists (only "introduced" is documented)
- Representation-mix requirements

**Phase A.4 of the operational plan** revises the 9 level specs to this format before any content regeneration occurs.

### §4.3 Provisional level objectives (to be ratified by specialist review)

Stated here so the regeneration pipeline (Part IV) has anchors. These are best-current understanding pending specialist sign-off.

| L | Objective (working draft) |
|---|---|
| 1 | Divides a regular shape into two equal parts (area or count) within 8% tolerance on first try ≥ 70%; recognizes equal-parts language. |
| 2 | Identifies a half from a set of 4 options including unequal-divided and non-half distractors at ≥ 80% accuracy. |
| 3 | Identifies thirds and fourths in equal-vs-unequal divisions; recognizes that "equal parts" is the necessary condition. |
| 4 | Constructs (drags / draws) halves, thirds, and fourths in regular shapes within tolerance; produces correct partition without the line being snap-targeted. |
| 5 | Constructs and matches numeric labels to fractional shapes in mixed denominators (1/2, 1/3, 1/4) at ≥ 75% accuracy. |
| 6 | Compares fractions with same denominator (1/4 vs 3/4 etc.) using both visual and symbolic forms. |
| 7 | Compares fractions with same numerator (1/3 vs 1/4 etc.); resists whole-number bias. **Critical level — high failure expected; specialist review essential.** |
| 8 | Places fractions on a number line at correct benchmark zones (closer to 0, 1/2, or 1). |
| 9 | Orders 3+ fractions of mixed denominators using benchmarks, comparison, and equivalence reasoning. |

**Note:** L7 is the cognitive crux of the entire curriculum. Whole-number bias makes 1/3 vs 1/4 counter-intuitive (3 < 4 but 1/3 > 1/4). Specialist input on L7 is the highest-priority single intervention in this plan.

---

## §5 — Knowledge component decomposition

Knowledge components (KCs) are the smallest skill units the BKT model tracks. Currently 33 KCs (SK-01..SK-33) per audit. Whether 33 is correct depends on three properties:

### §5.1 Properties a good KC taxonomy must have

1. **Right grain.** Too coarse → BKT estimates are conflated; can't diagnose. Too fine → data sparsity; estimates never converge.
2. **Mutually exclusive.** A single observation should not be evidence for multiple KCs simultaneously (or the assignment should be explicit and weighted).
3. **Collectively exhaustive.** Every behavior observable in the curriculum maps to at least one KC.
4. **Composable.** Higher-level competencies are expressible as combinations of lower KCs.
5. **Measurable.** Each KC has at least 5 templates exercising it (so BKT has signal).
6. **Pedagogically meaningful.** A KC named "halves" is meaningful; "SK-17" is not, unless documented.

### §5.2 Audit needed (Phase A.5)

> **Numbers are stale post-Phase 0b-1.** The pre-2026-04-26 audit (v1) found "top 6 KCs (SK-01..SK-06) at 19–21 templates each; SK-17–SK-33 ≤ 4 each — 17 KCs underrepresented." After Phase 0b-1 added 54 hand-authored L8/L9 templates tagged SK-27..SK-33, those 7 high-numbered KCs are no longer ≤ 4. The actual sparsity now is more likely SK-13..SK-20 (the L4–L5 production-skill cluster). **Re-count before Phase A.5 conclusions.** Bundle currently has 255 templates with 428 SK-NN references across them; `skills.md` confirms 33 KCs.

- **Density check:** re-count templates per KC against the live bundle. Identify the actual underrepresented KCs. Decide consolidate vs. expand per §5.3.
- **Definitional clarity:** verify each SK-NN in `skills.md` has a one-sentence definition. (Inspection during this plan's drafting confirmed `skills.md` has a structured table with id/name/description/gradeLevel/introduced_in_level/mastered_in_level/prerequisites/bkt_priors columns. Definitions exist.)
- **Mutual exclusivity:** are KCs operationally distinct, or do many templates cite multiple? v1 audit showed many templates flag 2–3 skills; verify this is intentional.
- **Coverage:** does every cell of the (level × misconception) matrix have at least one KC representing it?

### §5.3 Decision: consolidate or expand

If audit finds 17 KCs with < 5 templates each, three options:

| Option | When to choose |
|---|---|
| **Consolidate** (merge underrepresented KCs into broader ones) | If the underrepresented KCs are not meaningfully distinct concepts |
| **Expand templates** (regenerate to fill data) | If the KCs are pedagogically distinct and important |
| **Demote to internal-only metadata** (keep but don't surface in BKT) | If interesting but not load-bearing |

Specialist review (§28) decides. The default I'd carry forward: if 17 KCs lack templates, target consolidation to ~16–20 KCs total, each backed by ≥ 8 templates. Smaller, denser, more diagnostic.

---

## §6 — Prerequisite graph

Currently *implicit* in the level numbering (L2 prereqs = L1 mastery). This is too coarse; in reality, parts of L2 require only parts of L1.

### §6.1 Make it explicit

> **Prereqs already exist in `skills.md`.** The skills registry has a `prerequisites` column with comma-separated SK-NN references for SK-01 through SK-33. The work in Phase A.4 is *not* "create a new prerequisite graph" — it is "promote the existing column to a build artifact and validate it."

Two options for landing the graph:

**Option A (recommended): Generate at build time.** A new pipeline step parses `skills.md`'s frontmatter or the prerequisites column and emits `docs/10-curriculum/prerequisites.json` (or in-memory equivalent) so the validator (§19) and adaptive engine consume a single canonical form. `skills.md` remains the single source of truth.

**Option B:** Promote prerequisites to YAML frontmatter or a sidecar in `skills.md`; remove the "create a new file" implication. Same outcome with slightly different ergonomics for editors.

Either way, the artifact looks like:

```json
{
  "SK-01": { "prereqs": [], "name": "Recognize equal partitioning" },
  "SK-02": { "prereqs": ["SK-01"], "name": "Identify halves visually" },
  "SK-08": { "prereqs": ["SK-01", "SK-02"], "name": "Identify fourths / quarters" }
}
```

The example matches `skills.md` content as of 2026-04-29.

### §6.2 Used by

- **Adaptive engine** — selection respects prerequisites, not just level numbers. Routes a struggling-on-L7 student back to specific KCs they've not mastered, not all of L6.
- **Parent-facing reporting** — "your child masters halves and equal parts but is still learning to recognize thirds" beats "your child is on Level 3."
- **Authoring** — specifies what prior content a new template can assume.

### §6.3 Validation

A new build invariant (§19): no template's `skillIds` may include a KC whose prerequisites haven't appeared at a lower level. Catches accidental forward-references.

---

## §7 — Misconception taxonomy (rebuilt)

The audit found 7 misconception IDs with 5 mismatches between detector implementation and template baiting. This isn't only a bug — it reveals that the misconception taxonomy was assembled ad-hoc, not from research.

### §7.1 Research-grounded reference catalog

K-2 fraction misconceptions documented in the research literature (Empson, Hunting, Pothier, Sawada, Behr, Ni, Vamvakoussi, Siegler, Lortie-Forgues):

| ID (proposed) | Name | Description | Detection signature |
|---|---|---|---|
| **MC-WHB-01** | Whole-number bias (numerator) | "1/5 > 1/4 because 5 > 4" | Same-denominator compare: picks larger numerator when smaller is correct |
| **MC-WHB-02** | Whole-number bias (denominator) | "1/3 < 1/4 because 3 < 4" | Same-numerator compare: picks larger denominator when smaller is correct |
| **MC-EOL-01** | Equal-parts blindness | Accepts unequal divisions as "halves" if symmetric-looking | Equal_or_not: identifies unequal as equal ≥ 50% |
| **MC-EOL-02** | Count-only fraction | Counts pieces regardless of equality | Equal_or_not + partition: ignores tolerance ≥ 50% |
| **MC-NOM-01** | Notation inversion | Writes 1/2 as 2/1 or vice-versa | Label: selects swapped numerator/denominator |
| **MC-NOM-02** | Two-numbers fraction | Treats fraction as two independent whole numbers | Compare: explanations / patterns showing arithmetic on numerator and denominator separately |
| **MC-MAG-01** | Magnitude blindness | No sense of fraction size | Hard-tier accuracy ≪ 50% AND high errorMagnitude |
| **MC-PRX-01** | Benchmark misalignment | Cannot anchor fractions to 0, 1/2, 1 | Benchmark: places "almost_one" in middle ≥ 50% |
| **MC-EQV-01** | Equivalence blindness | Doesn't see 1/2 = 2/4 | Compare/order: treats equivalent fractions as different magnitudes |
| **MC-DSC-01** | Discrete confusion | Struggles with fractions of sets but not of shapes | Set-model accuracy ≫ shape-model accuracy with same skill |
| **MC-CTN-01** | Continuous-only | Recognizes shape fractions but not set fractions | Inverse of DSC-01 |
| **MC-ORD-01** | Ordering by single dimension | Orders fractions by numerator-only or denominator-only | Order: ranks by single coordinate ≥ 60% |

**12 misconceptions** in the research catalog. The current 7 IDs cover ~60% of the named space. Whether to expand depends on detection feasibility (some require richer attempt data than we currently capture) and on educational priority (some matter more in K-2 than others).

### §7.2 Required: parity contract

Every misconception ID is a **contract** between three artifacts:

1. **Definition** in `docs/10-curriculum/misconceptions.md` (one-paragraph explanation, research citation, observable signature)
2. **Detector** in `src/engine/misconceptionDetectors.ts` (real implementation, ≥ 4 unit-test cases)
3. **Template baiting** in the curriculum bundle (≥ 5 templates flag the trap intentionally)

A misconception ID without all three is invalid. The validator (§19) enforces this.

### §7.3 Decisions for the current 7 IDs (the audit mismatches)

> **Numbers are stale.** The table below reflects the v1 audit. After Phase 0b-1 (`PLANS/phase_0b1_completion_report.md`), MC-WHB-02 traps were added to L8/L9 hand-authored items, so "0 templates" is no longer correct for that ID. MC-NOM-01 detector remains a placeholder per `PLANS/phase-7-completion.md` (`detectNOM01()` is a stub at `src/engine/misconceptionDetectors.ts` reserved for future expansion). **Phase A.5 must re-count before Phase B.3 picks generation targets**; the action remains "fill detected gaps," only the specific gaps may differ.

| ID | v1-audit state | Likely current (post-Phase 0b-1) | Decision |
|---|---|---|---|
| MC-WHB-01 | ✓ Detector + 123 templates | Keep | Keep |
| MC-EOL-01 | ✓ Detector + 96 templates | Keep | Keep |
| MC-NOM-01 | Templates exist, detector placeholder | Detector still placeholder per phase-7-completion | **Implement detector** (Phase B.2) |
| MC-WHB-02 | Detector active, 0 templates | Detector active, **non-zero after Phase 0b-1** — recount | Generate to reach ≥ 12 templates (L7); recount may show partial coverage already |
| MC-MAG-01 | Detector active, 0 templates | Re-verify | Generate ≥ 8 (L8 hard tier) if recount confirms gap |
| MC-PRX-01 | Detector active, 0 templates | Re-verify | Generate ≥ 6 (L8 "almost_one" anchor) if recount confirms gap |
| MC-ORD-01 | Detector placeholder, 0 templates | Re-verify | Implement detector AND generate ≥ 8 (L9) |

### §7.4 Optional expansion (post-launch — Phase G.4)

Add MC-EOL-02, MC-NOM-02, MC-EQV-01, MC-DSC-01, MC-CTN-01 — five additional research-grounded misconceptions — based on real student-data evidence that they're occurring in the wild. Each requires the full three-artifact contract (definition, detector, ≥ 5 templates). **Note:** MC-DSC-01 and MC-CTN-01 detectors require a `representation.primary` tag on each template (see §9.2 schema extension); they cannot ship until that schema landing in Phase A.6.

---

## §8 — Mastery model alignment

The system uses Bayesian Knowledge Tracing (BKT). BKT estimates per-KC mastery from a sequence of attempts. Three considerations make BKT the right or wrong choice depending on alignment with the rest:

### §8.1 BKT requires

> **Critical dependency on harden-and-polish.** Per `master_audit_roadmap.md` v3 findings, the engine modules `selection.ts`, `router.ts`, `calibration.ts` are not currently called from production scenes ("engine museum"). `updateMastery` runs only inside `LevelScene.recordAttempt`, **not `Level01Scene.recordAttempt`** — meaning L1 attempts produce zero BKT signal today. Additionally, `Level01Scene.ts:752` has a validator-lookup bug that scores every L1 answer with `partition.equalAreas` regardless of declared `validatorId`, corrupting the signal that *would* be sent if mastery updates fired. Until those two engine bugs are fixed in `harden-and-polish.md`, every claim in §8 about "BKT signal," "data convergence," and "post-launch calibration from real data" applies *only to L2–L9*. L1 is uninstrumented and unreliable. Phase G analytics work depends on these engine fixes shipping first.

- **Right KC granularity** (covered in §5)
- **Sufficient attempts per KC** for posteriors to converge (≥ ~8 attempts in literature; we should target ≥ 12)
- **Independent KC contributions per item** — if every item touches 3 KCs, BKT diffuses signal
- **Stable parameters** — BKT has 4 parameters (slip, guess, transit, init) per KC. These are authored in `skills.md`, not learned. Should they be learned from data post-launch? (Yes — Phase G.3.)

### §8.2 Audit needed

- How many KCs in the current bundle have ≥ 12 templates? (Audit count: only ~6.)
- How many templates touch only 1 KC vs 2 vs 3+? (Unknown; needs counting.)
- Are BKT parameters tuned per KC or global? (Unknown; needs reading `src/engine/bkt.ts`.)

### §8.3 Decision

If many KCs have insufficient data, **consolidate first** (§5.3) before generating more content. A 16-KC taxonomy with 12+ templates each has more diagnostic value than a 33-KC taxonomy with 4 templates each.

### §8.4 Mastery threshold

Currently `MASTERY_THRESHOLD = 0.85` (BKT posterior). This plan adds:

- Mastery requires **BKT ≥ 0.85 AND first-try accuracy ≥ 70% over the last 8 attempts on this KC**.

Belt-and-suspenders. Prevents the rare BKT-confidence-without-actual-skill case that happens with high-guess parameters.

---

# Part III — Item Design Science

## §9 — Item design principles

Currently item design is implicit in the LLM pipeline's prompt. This section makes the principles explicit and forces the pipeline to follow them.

### §9.1 The eight principles

1. **Visual primacy.** The item *is* the picture. Text is supplementary, never load-bearing for understanding.
2. **Single-action affordance.** One tap, one drag, or one selection per item. No multi-step interactions in K-2.
3. **One new concept per item.** If the item exercises an unfamiliar idea, every other dimension (shape, context, prompt phrasing) is *familiar*.
4. **Equal salience of distractors.** All distractors are visually as prominent as the correct answer. No "obviously wrong" decoys.
5. **Pedagogically motivated distractors.** Each distractor exists to bait a specific misconception (referenced by MC ID) or to demand a specific discrimination (referenced by KC ID). No random wrongs.
6. **Cognitive load minimum.** Reading load ≤ 7 words / FK 1.5; visual elements ≤ 5 distinct items; manipulables ≤ 1.
7. **Cultural neutrality.** Contexts (when present) draw from a globally-curated set (§23). No Western-suburban-default.
8. **Construct purity.** The item measures the named KC and nothing else. If solving requires reading skill the child lacks, the item measures reading, not fractions.

### §9.2 Item template (proposed structured form)

Every item declares, in metadata:

```yaml
id: q:partition:L1:0042
archetype: partition
prompt:
  text: "Make two equal parts."
  fk_grade: 0.6
  word_count: 4
representation:
  primary: area-model
  shape: rectangle
  context: null  # or e.g. "cookie", "garden_bed"
skill_ids: [SK-02]            # 1 KC ideally; ≤ 2
misconception_traps: [MC-EOL-01]  # 1 MC ideally; documents the trap
distractors:                  # for archetypes with discrete options
  - id: option-a
    correct: false
    bait: MC-WHB-01
    rationale: "Tests whole-number bias on numerator"
difficulty_tier: easy
difficulty_evidence: author_assertion  # later: data_calibrated
visual_complexity: 2          # 1-5 scale, see §10
created_via: pipeline_v2
created_at: 2026-04-29
review_status: specialist_approved  # one of: pipeline, internal_review, specialist_approved
```

The current schema captures perhaps 60% of these fields. Phase A extends the schema to require all of them and updates the validator (§19) to enforce.

### §9.3 Schema-extension migration plan

Today's bundle (255 templates) carries none of the new fields above. A direct require-from-day-one would fail every existing item. Phased migration:

| Stage | Action | Validator behavior on new fields |
|---|---|---|
| **A.6** (lands schema) | Extend `pipeline/schemas.py` (Zod equivalent in TS types `src/types/runtime.ts`) — new fields **optional with nullable defaults**. Bundle parity test in `scripts/validate-curriculum.mjs` is unaffected. | warn-only; missing fields surface as a CI annotation but don't fail |
| **B (regeneration)** | Pipeline outputs new templates with all fields populated. Existing untouched templates get a one-time backfill pass: `representation.primary` derived from archetype + payload; `prompt.fk_grade` and `prompt.word_count` computed by linter; `difficulty_evidence: author_assertion`; `difficulty_rationale: "v1 backfill — needs review"`; `review_status: pipeline_v1`; `created_via: backfill`; `created_at: <bundle ship date>`. Distractor `bait` and `rationale` fields cannot be backfilled programmatically; hand-tagged or marked `bait: unspecified` (warn-only). | warn-only on `bait: unspecified` and `review_status: pipeline_v1` |
| **End of B** | All new templates pass strict gates. Backfilled templates flagged for Phase C review. | required for any template flagged `review_status ∈ {specialist_approved, internal_review}` |
| **End of C** | All Phase C-reviewed templates carry validated metadata. | required for **every** template; warn-only flips to blocking |

**The §17 parity contract requires both pipeline-side (Python) and runtime-side (TS) schema updates land in the same PR.** Drift between sides re-creates the very problem this plan is designed to prevent.

### §9.4 What a "well-designed item" looks like (worked example)

For L7 (compare same-numerator), one well-designed item:

> **Visual:** Two pies side by side. Left pie cut into 3 equal slices, one slice colored amber. Right pie cut into 5 equal slices, one slice colored amber.
> **Prompt:** "Which is more?" (3 words, FK 0.0)
> **Options:** Tap the larger fraction (left pie). Single-action affordance.
> **Skill:** SK-23 (compare same-numerator)
> **Misconception baited:** MC-WHB-02 — child applying whole-number bias picks the right pie (5 > 3); the correct answer is the left (1/3 > 1/5).
> **Distractor design:** the wrong answer (right pie) is *more visually appealing* than the correct (smaller slice on left). This is intentional: surface area of an option must not predict correctness.
> **Cultural context:** "pie" is a common K-2 reference but Western-leaning. Alternates: "garden bed," "circular cracker," "round paper folded."

The current L7 (audit: 30 templates, 10 distinct prompts) has these items in concept but with severe prompt repetition. Phase B regeneration enforces well-designed-item discipline.

---

## §10 — Visual representation taxonomy

Three primary representations, each suited to different concepts:

| Representation | Best for | When to introduce | Risk |
|---|---|---|---|
| **Area model** (divided shape) | Equal-parts concept; halving; partition | L1 (immediate) | Doesn't generalize to discrete or to magnitude |
| **Set model** (group of objects) | Discrete fractions; sharing context | L2 supporting role; L4 primary | Often confused with whole-number reasoning ("3 of 5 cookies, count: 3 — that's the answer!") |
| **Linear model / number line** | Magnitude; ordering; equivalence; benchmarks | L3 supporting role; L8 primary | Notoriously hard; requires careful scaffolding |
| **Measurement model** (length, capacity) | Real-world fraction sense | Optional supporting role at any level | Out of scope at MVP — adds complexity |

### §10.1 Distribution requirement (per level)

Every level uses **at least two** representations, with one primary and others in supporting roles. This combats "halves means a divided circle" overgeneralization that occurs when only area model is used.

| Level | Primary representation | Supporting |
|---|---|---|
| L1 | Area | Set (in a few items) |
| L2 | Area | Set, linear (number-line tick) |
| L3 | Area | Set |
| L4 | Area + Set | Linear (in a few items) |
| L5 | Mixed | Linear |
| L6 | Mixed | Linear primary in 30% of items |
| L7 | Mixed | Linear primary in 30% of items |
| L8 | Linear (primary by definition) | Area, Set in a few items for transfer |
| L9 | Mixed | Linear primary in 50% of items |

The pipeline (Part IV) enforces this distribution at generation time.

### §10.2 Visual complexity scale (1–5)

Item metadata declares complexity:

| Complexity | Description | Cognitive load |
|---|---|---|
| 1 | Single shape, single division | Minimal |
| 2 | 2 objects compared | Low |
| 3 | Multiple objects, one variation dimension | Medium |
| 4 | Multiple objects, two variation dimensions | High |
| 5 | Visual-spatial reasoning required (rotation, abstraction) | Very high |

K-2 floor: complexity ≤ 3 in L1–L4, ≤ 4 in L5–L9. Validator enforces (§19).

---

## §11 — Distractor design

For archetypes with discrete options (`identify`, `compare`, `equal_or_not`, `benchmark`), distractor design is as important as the correct answer.

### §11.1 Three classes of distractor

| Class | Purpose | Use rate |
|---|---|---|
| **Misconception bait** | Plausibly chosen by a child holding a known misconception | 50–70% of distractors |
| **Discrimination probe** | Tests a fine perceptual distinction (slightly unequal vs equal) | 20–30% |
| **Random foil** | Plainly wrong; baseline guessing rate | ≤ 20% |

A 4-option item should have ~2 misconception baits, ~1 discrimination probe, ~1 random foil — or just 3 baits + 1 foil for richer diagnostic.

### §11.2 Distractor metadata

Each distractor records its `bait` field (misconception or discrimination type). The validator can then ensure no item has 4 random foils (no diagnostic value).

### §11.3 Anti-patterns (banned)

- **The "obvious wrong"** — a distractor that no child holding any plausible mental model would pick. Wastes a slot.
- **The "off-topic"** — a distractor exercising a skill not relevant to the item's KC. Confuses the construct.
- **The "trap that punishes good thinking"** — a distractor that resembles the correct answer in a way that requires *more* knowledge than the KC tests. Construct-irrelevant.

---

## §12 — Difficulty calibration

Currently every template has `difficultyTier: easy | medium | hard` set by the author at generation time. Audit shows 95 / 90 / 70 split (37 / 35 / 27%). Whether these tiers actually correspond to difficulty is empirical.

### §12.1 The two-stage calibration model

**Stage 1 (pre-launch, this plan):** author asserts tier with declared evidence.

```yaml
difficulty_tier: medium
difficulty_evidence: author_assertion
difficulty_rationale: "Mixed denominators; Visual complexity 3; Misconception bait present."
```

The `difficulty_rationale` is mandatory; the author justifies the tier in writing. Validator enforces.

**Stage 2 (post-launch, Phase D):** real first-try accuracy data re-tiers.

- Compute per-template first-try accuracy across a representative sample (≥ 30 attempts).
- Map quantiles: top tertile by accuracy → "easy", middle → "medium", bottom → "hard".
- Compare to author-asserted tier. Mismatches > 1 tier are flagged for review.
- Update `difficulty_tier` and set `difficulty_evidence: data_calibrated` with the underlying sample size.

### §12.2 Specialist input (Phase A)

Specialist reviews the difficulty rationales for L7 (the cognitive crux level) item-by-item before launch. Pre-launch we cannot calibrate from data, so expert judgment substitutes.

---

## §13 — Hint ladder pedagogy

Currently a 3-tier hint ladder: verbal → visual_overlay → worked_example. The pedagogy of *why* those three tiers and *why in that order* is not documented.

### §13.1 Research grounding

The hint ladder corresponds (roughly) to the **Concrete-Pictorial-Abstract** progression *applied to scaffolding*:

| Tier | Form | Theory |
|---|---|---|
| 1 — Verbal | Text or audio prompt | Activates self-explanation (Chi, Renkl); minimal interruption |
| 2 — Visual overlay | Highlighted region or diagram | Recasts the question pictorially; reduces problem-solving load |
| 3 — Worked example | Animated demonstration of the first step | Sweller worked-example research; reduces extraneous load when stuck |

Tier 3 should *never auto-complete* — the child finishes after watching. **Live behavior contested:** `curriculum-completion-phase-3.plan.md` task C4.5 reports that `HintLadder.next()` can re-show Tier 3 indefinitely with no terminal state. This plan's commitment is the *should*; resolving the *is* requires reading `src/components/HintLadder.ts` and either confirming the C4.5 task fixes it or filing a new task. **Phase A action:** verify against the live source and reconcile.

### §13.2 Per-misconception hint differentiation (improvement)

Today, the verbal hint at Tier 1 is generic ("Tip: Equal parts means each piece is the same size."). A child mis-applying whole-number bias gets the same hint as a child holding equal-parts blindness, even though they need different remediation.

Proposal: when the misconception detector has triggered (or is highly suspected), the hint at Tier 1 is *misconception-specific*:

| If detector has raised flag | Tier-1 hint |
|---|---|
| MC-WHB-01 | "Look at the size of the pieces, not the number." |
| MC-WHB-02 | "More pieces means each piece is *smaller*." |
| MC-EOL-01 | "Are all the parts exactly the same size?" |
| MC-NOM-01 | "Top number is how many you have. Bottom number is how many parts in all." |

Implementation requires three concrete pieces, each currently unspecified:

**1. Storage format.** A new sidecar file `docs/10-curriculum/hints-registry.yaml` keyed by tuple `(level, archetype, misconception_id?)`:

```yaml
hints:
  - level: L7
    archetype: compare
    misconception: MC-WHB-02   # optional; null = generic Tier-1 fallback
    tier: 1
    text: "More pieces means each piece is smaller."
    audio_key: "hint.l7.compare.whb02.t1"   # consumed by audio.md pipeline
```

The audio pipeline (`audio.md`) reads `audio_key` to render TTS at build time; runtime never synthesizes.

**2. Build-pipeline integration.** `pipeline/hints.py` (the 864-hint generator from `curriculum-completion-phase-3.plan.md` task C4.1) currently produces *generic* tier-1 hints by template. It must learn to produce a *misconception-specific* hint per `(level, archetype, MC-id)` triple. This is a pipeline change, not just a content addition: the prompt to the LLM gains a "for this misconception, the child needs to hear about X" instruction.

**3. Runtime selection logic.** `HintLadder.ts` currently picks Tier-1 by `hintCascade[0]`. Misconception-specific selection requires:
- Read access to `misconceptionFlags` for the current `(student, skill)` pair (already in IndexedDB per existing schema)
- A lookup against the registry for the most specific match: `(L, archetype, MC-id)` → `(L, archetype, null)` → `(L, null, null)` → generic fallback
- A graceful fallback when no detector has tripped (the common case)

**Why this lives in §13.2 not in `harden-and-polish.md`:** the *content* (the hints themselves and their pedagogical mapping) is curriculum work. The *plumbing* (HintLadder reading misconceptionFlags, registry lookup) is engineering. Phase B.5 splits accordingly: registry authoring + pipeline integration here; HintLadder rewrite tracked in `harden-and-polish.md` (open task to add).

### §13.3 Hint cost and reward implications

Currently hints reduce points but don't affect mastery estimation. Empirically, "answered correctly with hint" should be weaker evidence of mastery than "answered correctly without hint." BKT supports this via `slip` and `transit` parameters. **The per-hint score penalty (5/15/30 by tier) is decided in `docs/20-mechanic/interaction-model.md` §4.1 and wired by `curriculum-completion-phase-3.plan.md` task C7.8** — this section concerns only the *mastery-estimate* downweighting, which is **Phase G-eligible** (post-launch data needed for calibration).

---

# Part IV — Authoring System

## §14 — Pipeline architecture

The current pipeline is functional but immature. Maturation has three components: reproducibility, quality gates, and feedback loops.

### §14.1 Current state (per audit)

```
pipeline/generate.py         # LLM (Claude/Haiku) generates templates per (level, archetype, count)
pipeline/phase_0b1_handauthor.py  # Hand-authored fallback for L8/L9 special cases
pipeline/validate_and_report.py   # Lint generated content
pipeline/output/level_NN/all.json # Per-level output
        ↓
scripts/build-curriculum.mjs # Assembles into bundle
scripts/validate-curriculum.mjs # Schema + parity validation
        ↓
public/curriculum/v1.json
src/curriculum/bundle.json (fallback)
```

### §14.2 Target state

```
docs/10-curriculum/levels/level-NN.md  ← spec (mastery objective + KCs + reps + traps)
        ↓
pipeline/generate.py --spec level-NN.md --count N
        ↓ (variety prompt; misconception baiting; representation balance enforced)
pipeline/output/level_NN/raw.json
        ↓
pipeline/quality_gates.py        ← NEW: 6-lens QA (§16)
        ↓
pipeline/output/level_NN/reviewed.json
        ↓
[Specialist sign-off via review tool — Phase C]
        ↓
pipeline/output/level_NN/all.json
        ↓
scripts/build-curriculum.mjs
        ↓
public/curriculum/v1.json
src/curriculum/bundle.json
        ↓
[Audio rendering: see audio.md — pre-renders prompt TTS]
public/audio/{hash}.mp3
```

Each arrow is reproducible: same input → same hash → cached output. Re-running the pipeline only hits the LLM for changed items.

### §14.3 LLM provider decision

Current: Claude Haiku.

For the variety regeneration (Phase B), upgrade to Claude Sonnet (or claude-sonnet-4-6). Default to Sonnet for curriculum work; reserve Haiku for low-stakes utility tasks.

**Evidence supporting upgrade:** `PLANS/phase_0b1_completion_report.md` notes Haiku produced ~80% dedup loss on L8 generation runs (the model recycled phrasings across nominally-different prompts). Sonnet would need to beat that floor; available benchmarks suggest it does, but the variety improvement is largely driven by the **variety prompt + semantic-dedup loop** (§14.4 + the existing `pipeline/validate_and_report.py` similarity check), not by provider alone. Sonnet upgrade is supplementary to prompt-engineering discipline, not load-bearing.

**Cost differential (working estimate):** Sonnet ≈ 3–4× Haiku per token. For one-time regeneration of ~300 templates at ~500 tokens each, total cost difference ≈ tens of dollars. Negligible.

### §14.4 Determinism and reproducibility

LLMs are nondeterministic. Approaches:
- **Snapshot strategy:** every generated item is hashed; manifest records the hash. Re-running is a no-op unless a generation parameter changes.
- **Seed-and-temperature:** set temperature low (0.3) and a fixed seed for the whole run.
- **Manual review step:** every new item passes through specialist review (§15) before becoming canonical. The review *is* the determinism layer.

Recommended: all three. The snapshot prevents accidental re-runs; the seed makes runs comparable; the review provides the human gate.

### §14.5 Bundle parity and i18n hooks

The build emits a single `v1.json` and parallel `bundle.json` (per audit). When multilingual lands (§25), the source document becomes language-neutral (representation specs, not English text), and the LLM renders prompts per locale.

---

## §15 — Content registry & metadata ontology

A single source of truth for every concept the curriculum names.

### §15.1 Five canonical registries

| Registry | Path | Content |
|---|---|---|
| **Skills** | `docs/10-curriculum/skills.md` (existing) | Every SK-NN with one-paragraph definition + prerequisite list |
| **Misconceptions** | `docs/10-curriculum/misconceptions.md` (existing) | Every MC-NN with definition, research citation, observable signature |
| **Archetypes** | `docs/10-curriculum/archetypes.md` (NEW) | Every archetype: schema, allowed levels, design principles |
| **Representations** | `docs/10-curriculum/representations.md` (NEW) | Each representation: when to use, complexity, examples |
| **Standards crosswalk** | `docs/10-curriculum/standards-map.md` (existing) | CCSS + 4 international frameworks → KC mapping |

Every artifact (template, detector, validator, hint, level spec, audio file) references these registries by ID. Cross-references must resolve. Validator (§19) enforces.

### §15.2 The misconceptions registry (rebuilt)

`docs/10-curriculum/misconceptions.md` is rewritten in Phase A to follow this structure per entry:

```markdown
## MC-WHB-01 — Whole-number bias (numerator)

**Definition:** A child applying whole-number reasoning to fractions, attending to the numerator
as if it were a quantity in itself.

**Research grounding:** Ni & Zhou (2005); Vamvakoussi & Vosniadou (2010). Reliably observed in
ages 5–10 across multiple linguistic contexts.

**Observable signature:**
- Same-denominator compare: picks larger numerator regardless of correctness
- Same-denominator order: orders by numerator only

**Detector:** `detectWHB01()` in `src/engine/misconceptionDetectors.ts`

**Templates baiting:** ≥ 5 templates required. Currently 123 (L1, L6 primarily).

**Tier-1 hint when triggered:** "Look at the size of the pieces, not the number."

**Remediation pedagogy:** Visual side-by-side comparison emphasizing piece size; sharing-context framing.
```

This format is mandatory. Each entry verifiable against research. The validator can grep for the `**Detector:**` and `**Templates baiting:**` fields and check they reference real artifacts.

---

## §16 — Quality gates: six lenses

Currently `validate-curriculum.mjs` checks one lens (technical schema). A backbone curriculum requires six.

| Lens | Check | Tooling | Block on failure |
|---|---|---|---|
| **Technical** | Schema, types, references | `validate-curriculum.mjs` (existing, extend) | Yes |
| **Linguistic** | Reading level (FK ≤ 1.5), word count ≤ 7, banned-idiom check | `pipeline/quality_gates.py --linguistic` | Yes |
| **Pedagogical** | KC alignment, prereq satisfaction, distractor classification, representation balance | `pipeline/quality_gates.py --pedagogical` | Yes |
| **Visual** | Complexity ≤ tier; representation specified; render specification valid | `pipeline/quality_gates.py --visual` | Yes |
| **Cultural** | Banned cultural-default words; context list draws from approved registry | `pipeline/quality_gates.py --cultural` | Warning + manual review |
| **Accessibility** | Color-independent meaning; TTS-friendly prompts; keyboard-navigable interactions | `pipeline/quality_gates.py --accessibility` | Yes |

A template that fails any blocking lens is not merged. Failing only the cultural lens triggers manual review.

### §16.1 Linguistic quality details

Beyond FK and word count:
- **No fraction Unicode characters** (`½`, `¼`, `⅛`, `⅓`, `⅔`, `¾`, `⅜`, `⅝`, `⅞`, plus the single-character `⁄` solidus). Rendering goes through `FractionDisplay` per **ux-elevation T1**; this rule is the content-side enforcement of the same constraint. Lint failure → fix path is documented (replace literal with `FractionDisplay.create(...)`).
- **TTS-readability:** prompt strings using `FractionDisplay`-rendered fractions have a `prompt.spoken` field declaring how the audio pipeline should pronounce it ("one half", "three quarters") — `prompt.word_count` then counts spoken words, not Unicode characters.
- No idioms ("piece of cake," "you nailed it") — flagged by an idiom dictionary
- Active voice; concrete nouns; present tense
- No proper nouns *except* approved cultural references (§23)

### §16.2 Pedagogical quality details

- Each `skill_ids` entry exists in registry
- Each `misconception_trap` entry exists and corresponds to an active detector
- Distractors cumulatively exercise ≥ 1 misconception trap *or* ≥ 1 discrimination probe
- Representation matches `level_NN.md` declared distribution
- Prerequisite satisfaction: no template uses a KC whose prereqs haven't been introduced at lower levels

### §16.3 Cultural quality details

- **Day-1 policy (decided):** the cultural lens is **blocking from day one**, but the registry is seeded so existing bare-imperative templates pass. `docs/10-curriculum/cultural-contexts.md` is created in Phase A.3 and seeded with:
  - `null` (bare-imperative, no cultural context — the default for all 255 existing templates; "Split this rectangle into 2 equal parts" passes)
  - 12 approved-context starter list: cookie, paper-fold, garden-bed, ribbon, block, fruit-slice, water-cup, balloon, beads-on-string, paper-boat, leaf, sliced-bread
  - Banned list: Halloween, Thanksgiving, Christmas, alcohol, sports-specific, currency-specific
  - Limited list (≤ 10% of items): pizza, pie, round-cake
- Phase B re-authoring lands cultural contexts at scale, drawing from the approved list. `null` becomes a minority by end of Phase B but remains valid forever.
- Validator (§19) blocks any template whose `representation.context` is not in the approved set OR `null`. Banned values fail immediately.
- The registry is reviewable and globally diverse; commits to it require representation review (§29 governance — single author with annual external diversity review).

### §16.4 Accessibility quality details

- **Audio-manifest-keyed rule:** every prompt and hint string resolves to an entry in `public/audio/manifest.json` (the build artifact from `audio.md`'s pre-rendered TTS pipeline). CI gate: `scripts/check-audio.mjs` fails if any in-game string lacks a corresponding clip. **No runtime synth fallback exists** — Web Speech API is not used at runtime per `audio.md`. This eliminates the iOS `voiceschanged` race and removes a source of construct-irrelevant variance from §9.1 #6.
- No item depends on color alone for correctness
- Keyboard-navigation path declared for every interactive element (currently aspirational; see §3 caveat)
- Alt-text-equivalent narrative provided for visual representations (consumed by audio.md TTS rendering for blind users)

---

## §17 — The detector/template parity contract

Already detailed in §7.2. Restating as a system requirement:

> A misconception ID exists in the system **if and only if** all three are true:
> 1. The MC ID has a complete entry in `docs/10-curriculum/misconceptions.md`
> 2. The MC ID has a non-placeholder detector function with ≥ 4 unit tests
> 3. The MC ID is flagged by ≥ 5 baiting templates in the bundle

The validator (§19) enforces all three. A pull request that adds a misconception ID without all three artifacts fails CI.

This is the single most important architectural requirement of the curriculum system.

### §17.1 Verification tool

A new `pipeline/scripts/verify-parity.py` walks three artifact stores and emits a parity report:

1. **Documentation:** parses `docs/10-curriculum/misconceptions.md` for entries matching the §15.2 structured format (each section titled `## MC-XXX-NN — <name>` with `**Detector:**` and `**Templates baiting:**` fields).
2. **Detector implementations:** introspects `src/engine/misconceptionDetectors.ts` for exported function names matching `detect[A-Z]+[0-9]+` and verifies each is non-placeholder (function body length ≥ N statements, returns non-null on at least one test case in `tests/unit/engine/misconceptionDetectors.test.ts`).
3. **Bundle baiting counts:** counts templates flagging each MC-id in `misconceptionTraps`.

Output: a 4-column table written to `pipeline/output/parity-report.json`:

```json
[
  { "mc_id": "MC-WHB-01", "doc": true, "detector": "active", "templates_baiting": 123, "status": "ok" },
  { "mc_id": "MC-NOM-01", "doc": true, "detector": "placeholder", "templates_baiting": 5, "status": "fail: detector placeholder" }
]
```

Integrated into `scripts/validate-curriculum.mjs` under invariants #5 and #6 (§19.2). CI fails on any row with `status != "ok"`.

---

## §18 — Content lifecycle: versioning, deprecation, migration

Curriculum is data, and data needs a lifecycle. Today there's an implicit `contentVersion: "1.0.0"` and a wipe-and-reseed migration. Hardening plan §9.1 covers the migration mechanics. This section adds the **content lifecycle** that drives versioning decisions.

### §18.1 Versioning policy (semver for curriculum)

| Version bump | Trigger | Migration |
|---|---|---|
| **Patch (1.0.0 → 1.0.1)** | Same items, polished prompts; difficulty re-tiering | Re-seed; existing attempts retain their `questionTemplateId` references |
| **Minor (1.0.0 → 1.1.0)** | New items added; old items unchanged | Re-seed; existing attempts unaffected |
| **Major (1.0.0 → 2.0.0)** | Items removed; KCs restructured; archetype changes | Migration plan required (per harden-and-polish §9.1) |

### §18.2 Item lifecycle states

```
draft → review → approved → active → deprecated → removed
```

- **draft** — pipeline-generated; not yet reviewed
- **review** — under specialist or internal review
- **approved** — passed review; eligible for inclusion
- **active** — included in current bundle
- **deprecated** — kept in bundle but not surfaced; existing attempt records still reference it
- **removed** — deleted from bundle; major version bump required

Removing an item is rarely the right move; deprecating is preferred (existing student histories remain interpretable).

### §18.3 Continuous improvement loop (post-launch)

```
Real attempts → per-item analytics → re-tier or replace → bundle 1.0.x → re-seed
```

Decided post-launch in Phase D.

---

# Part V — Validation and Research

## §19 — Build-time invariants (the lock-in)

Every invariant from §15–§18 is mechanically enforced. `scripts/validate-curriculum.mjs` is rewritten in Phase A with the following gates. Failure on any gate fails the build.

### §19.1 Reference integrity

1. Every `skill_id` referenced anywhere resolves to a definition in `skills.md`.
2. Every `misconception_trap` resolves to an entry in `misconceptions.md`.
3. Every `archetype` resolves to an entry in `archetypes.md`.
4. Every entry in any registry is referenced by ≥ 1 artifact (no orphan registry entries).

### §19.2 Parity contract (§17)

5. Every misconception ID with templates baiting it has a non-placeholder detector.
6. Every active detector has ≥ 5 baiting templates.
7. Every template's KC IDs have prerequisites satisfied at or before its level (per `prerequisites.json`).

### §19.3 Density and variety

8. Every level has ≥ 15 templates.
9. Every (level, archetype) combination with > 0 templates has ≥ 5.
10. Distinct-prompt ratio ≥ 70% per level (≥ 90% for levels with < 15 templates).
11. Every KC has ≥ 8 templates exercising it (≥ 12 in v1.x; pre-launch we accept 8).
12. Representation distribution per level matches level spec.

### §19.4 Cognitive and accessibility

13. Every prompt: word count ≤ 7, FK reading grade ≤ 1.5.
14. Every item: visual complexity ≤ 3 in L1–L4, ≤ 4 in L5–L9.
15. Every item has ≥ 1 representation declared.
16. No prompt uses Unicode fraction characters or banned idioms.

### §19.5 Item design

17. Every multi-option archetype has ≥ 2 distractors of class `misconception_bait` or `discrimination_probe`; ≤ 1 random foil.
18. Every distractor has a non-empty `bait` field.
19. Every item has `difficulty_tier` and `difficulty_rationale`.

### §19.6 Tolerance sanity (existing, kept)

20. Partition `areaTolerance` ∈ [0.03, 0.20]; easy-tier ≥ 0.08.

### §19.7 Out-of-scope enforcement (§2)

21. No template's prompt or metadata contains banned topics (fraction operations, decimals, percent, etc.).

### §19.8 Reporter format

The validator emits a JSON report at `pipeline/output/validate-curriculum.report.json` with a stable schema CI parses deterministically:

```typescript
type ValidationReport = {
  schema_version: 1;
  generated_at: string;       // ISO 8601
  bundle_version: string;     // e.g. "1.0.0"
  total_templates: number;
  violations: Array<{
    template_id: string;       // e.g. "q:partition:L1:0042" or "_global" for cross-cutting
    invariant_id: string;       // e.g. "INV-05" or "INV-13"
    severity: "error" | "warn";
    field_path: string | null;  // e.g. "prompt.text" or "skill_ids[1]"
    message: string;
    remediation_hint: string;
  }>;
  summary: { errors: number; warnings: number; passed: number };
};
```

CI surfaces violations in PR comments grouped by `invariant_id`. The schema is versioned so CI tooling can lock to a known shape.

---

## §20 — Standards alignment

The K-2 fractions concept space is canonical across major frameworks. The current `standards-map.md` covers CCSS only.

### §20.1 Frameworks to map

| Framework | Region | Why included |
|---|---|---|
| Common Core State Standards (CCSS) | US | Existing; primary |
| England National Curriculum | UK | Common international comparison |
| Singapore Math Framework | SG, used widely internationally | Highly respected K-2 math tradition |
| Australian Curriculum (ACARA) | AU | Common international comparison |
| Ontario Curriculum | ON, CA | Common international comparison |

### §20.2 Crosswalk format

For each KC and each level, show the framework standard(s) it satisfies:

```markdown
## SK-02 — Divides shape into 2 equal parts

| Framework | Standard | Notes |
|---|---|---|
| CCSS | 1.G.A.3 | "Partition circles and rectangles into two and four equal shares..." |
| England NC | KS1 Y2 — Fractions | "...recognise, find, name and write fractions ¹/³, ¹/₄, ²/₄ and ¾..." |
| Singapore | P1 — Fractions strand | "Halves and quarters of a whole" |
| ACARA | F-2 — Number/AC9MFN03 | "...partition collections of up to 20 objects in different ways" |
| Ontario | Grade 1 — Number Sense | "Demonstrate, using concrete materials, the concept of one half" |
```

### §20.3 Coverage gap identification

For each framework, list:
- Standards we cover well (multiple KCs map to it)
- Standards we cover thinly (one KC, weak)
- Standards within K-2 scope we don't cover at all

Coverage gaps drive content additions in v1.x or motivate explicit out-of-scope declarations.

### §20.4 Sequence comparison

A specialist exercise: where do our 9 levels diverge from each framework's K-2 sequence? Divergence isn't necessarily wrong — research-grounded design may correctly differ from a state's pacing — but each divergence must be justified.

---

## §21 — Empirical validation methodology

A curriculum's claim to teach must be testable. We will not ship "this curriculum teaches K-2 fractions" without a defensible validity argument.

### §21.1 Validity argument structure (Kane 2013, Messick 1989)

Four inferences chained from item response to claim:

1. **Scoring** — from observed answer to item-level score. (Trivially valid: validator deterministically assigns correct/wrong.)
2. **Generalization** — from item-level scores to KC-level mastery estimate. (Validity rests on BKT calibration and ≥ 8 attempts per KC.)
3. **Extrapolation** — from in-app KC mastery to real-world fraction skill. (Validity rests on item construct purity and external concurrent-validity evidence.)
4. **Decision** — from KC mastery to "this child is ready for grade 3." (Validity rests on a defensible mastery threshold tied to standards.)

The weakest link is #3 (extrapolation). Pre-launch we cannot demonstrate it. Phase D establishes the evidence.

### §21.2 Pre-launch validation work (in this plan)

| Activity | Output | Phase |
|---|---|---|
| Specialist content review | Item-level critique; revisions | C |
| Cognitive walkthrough with K-2 children (n=8) | Items where think-aloud reveals construct-irrelevant failure | C |
| Item bias review | Cultural / linguistic / disability-impact flagging | C |
| Standards alignment | Framework crosswalks (§20) | A |
| Construct map | Each KC mapped to construct; gap analysis | A |

Pre-launch we **cannot** establish extrapolation validity. We can establish content validity (expert review) and substantive validity (cognitive walkthrough).

### §21.3 Post-launch validation (Phase D)

- Per-item analytics → predictive validity (do high-mastery learners succeed in grade 3 fractions?)
- Concurrent-validity study with established K-2 fraction assessments (Easy CBM, AAIMS, etc.) — requires IRB approval if school-based
- Differential item functioning (DIF) analysis — does an item perform differently for boys vs. girls, ELL vs. native English speakers, etc.

### §21.4 What we explicitly don't claim pre-launch

- "This curriculum is proven effective." (No effectiveness study exists.)
- "Aligned with research." (Influenced by, not proven aligned with.)
- "Equivalent to standard K-2 instruction." (Untested.)
- **"Adaptive."** This is a description of the engine, not a claim about learning effect. BKT mastery is a probabilistic estimate, not proof of learning. Marketing copy describing the *system as adaptive* is fine; describing *outcomes as adaptive-driven* is not.

Marketing copy must match this discipline.

---

## §22 — Pilot study design

A reasonable post-MVP step: a small-scale pilot to gather extrapolation-validity evidence.

### §22.1 Pilot v1 (lightweight, 1–2 classrooms)

- 2 K-2 classrooms; 30 children
- 4 weeks; 3 sessions / week
- Pre-test: validated K-2 fraction subtest (e.g., Easy CBM Concepts and Application)
- Post-test: same subtest
- Comparison: not strictly RCT — caregiver-described control or within-group growth analysis
- IRB: minimal (caregiver consent)

### §22.2 Pilot v2 (rigorous, 8–12 classrooms) — conditional

**Gate to launch v2:** Pilot v1 must show within-group pre/post effect ≥ 0.15 (Cohen's *d*) AND a research partner must be available. If either condition fails, pilot v2 is deferred or canceled. The §22 prose describes the design *if* gates are met; it is not a launch commitment.

- 8–12 classrooms; 200+ children
- 6 weeks; randomized waitlist control
- Pre/post + delayed retention test (4 weeks after end)
- IRB-approved study; partner with university school of education
- Effect-size target: Cohen's *d* ≥ 0.2 on K-2 fraction subtest (modest, achievable)

Pilot v1 informs whether v2 is justified. Pilot v2 produces the validity evidence to make claims.

---

# Part VI — Equity and Inclusion

## §23 — Cultural neutrality framework

The audit (and a default reading of the L1 prompts) shows Western-suburban-default contexts. This is a curriculum-level equity issue.

### §23.1 Approved cultural contexts registry

Maintained at `docs/10-curriculum/cultural-contexts.md`. Each context evaluated for:
- **Universality:** does this referent exist in the daily life of children globally?
- **Familiarity gradient:** is it equally familiar across socioeconomic levels?
- **Translation viability:** does the concept translate cleanly across languages?
- **Disability inclusion:** is the referent accessible to children with sensory differences?

### §23.2 Examples (illustrative)

| Context | Approved? | Notes |
|---|---|---|
| Pizza | Limited (≤ 10% of items) | Western; common but over-used in fraction examples |
| Pie / round cake | Limited (≤ 10%) | Same issue |
| Cookie / biscuit | Approved | Globally common |
| Paper folding | Approved | Universal; tactile referent |
| Garden bed | Approved | Universal; introduces rectangle naturally |
| Ribbon | Approved | Linear-model gateway |
| Fruit slice | Approved | Universal |
| Block / brick | Approved | Universal |
| Holiday-specific (Halloween, Christmas) | Banned | Cultural exclusion |
| Currency examples | Banned | Locale-specific |
| Sports-specific examples (American football, cricket) | Banned | Culturally exclusive |

### §23.3 Distribution requirement

No single context exceeds 15% of all items. Aggregate "Western-default" contexts (pizza, pie, sandwich, etc.) capped at 25%. Validator (§19) enforces.

### §23.4 Periodic bias review

Every 6 months: re-walk the bundle for cultural inclusion. New items entering the bundle are tagged with their context for easy aggregation.

---

## §24 — Accessibility through curriculum (not just UI)

UI accessibility (focus rings, contrast, reduced motion) is in harden-and-polish.md. Curriculum accessibility is different: it's about whether *the items themselves* work for children with disabilities.

### §24.1 Visual disabilities

- **Color-independent meaning:** every item's correctness must not require distinguishing colors. The "amber-shaded slice" pattern fails for color-blind children if amber is the only signal. Pattern fill or position is required as a redundant channel.
- **Low vision:** items must be intelligible at 200% magnification without horizontal scrolling.
- **Total blindness:** every item has a textual description sufficient to solve via TTS alone. (The audio.md plan pre-renders these descriptions; the curriculum field provides the source.)

### §24.2 Motor disabilities

- Drag-required items must have a tap-alternative. Currently *some* drag items support tap-to-place (the partition tap zone in Level01Scene); others may not.
- Single-pointer constraint (already an a11y commitment).
- Generous snap zones (≥ 5% margin).

### §24.3 Cognitive disabilities

- Items must not depend on working memory beyond ~3 items.
- Reading load minimized (already covered by §16).
- Time pressure absent (already covered by §3).

### §24.4 Hearing disabilities

- TTS is supplementary, never required for understanding (visual primacy, §9.1).
- Audio cues (when audio.md ships) have visual equivalents.

### §24.5 Audit needed

The current bundle has not been reviewed for these properties. Phase A.X adds an accessibility lens to the validator (§16); Phase C includes accessibility specialist review.

---

## §25 — ELL / multilingual readiness

English Language Learner accommodation is design from the start, not retrofit.

### §25.1 ELL-friendly English (the source locale)

Already covered in ux-elevation Appendix B.3:
- No idioms, no culturally-bound metaphors, ICU pluralization, scoped i18n keys.

Curriculum-specific additions:
- **Concrete vocabulary:** "cookie" not "treat"; "split" not "divvy up"
- **Active voice:** "Find one half" not "One half should be found"
- **Cognates aware:** prefer words with Spanish/Portuguese/French cognates where equivalent (e.g., "equal" / "igual" / "égal")
- **Visual primacy ensures** even non-English-speaking children can solve items via picture alone

### §25.2 Multilingual content pipeline (v1.x or v2)

Source items become **language-neutral specs**:

```yaml
prompt:
  representation: "Make {n} equal parts."
  vars:
    n: 2
  i18n_key: prompt.partition.make_n_equal_parts
```

The pipeline renders per-locale prompts. Translators work from the spec, not from English. Each translated prompt re-enters the validator (§19) for FK and word-count checks in the target language.

### §25.3 Initial locale priority

Post-MVP launch:
1. Spanish (es-US, es-ES) — largest K-2 ELL population
2. Mandarin (zh-CN, zh-TW)
3. Arabic (ar; RTL — UI must be RTL-ready, see ux-elevation)
4. French (fr-FR, fr-CA)

### §25.4 Audio multilingual

Audio.md pipeline supports per-locale rendering automatically (same generation infra; different voice instruction per language). Curriculum audio scales linearly with locales.

---

## §26 — Bias audit protocol

Periodic, structured.

### §26.1 What we audit

- **Race / ethnicity bias:** depictions, names if any, contexts
- **Gender bias:** activities, characters, examples
- **Socioeconomic bias:** referents (vacation tropes, expensive objects)
- **Disability bias:** depictions; assumptions of capability
- **Language bias:** idioms, cultural references
- **Religious bias:** holidays, foods, practices

### §26.2 Protocol

1. Independent reviewer (not the original author) walks the full bundle
2. Tags each item with a bias-flag if any concern surfaces
3. Items with > 0 flags go to a review committee (3 reviewers, diverse backgrounds)
4. Committee decides: keep, revise, remove
5. Audit log retained

### §26.3 Cadence

- Pre-launch: full audit
- Post-launch: quarterly for the first year, then annually

---

# Part VII — Operations

## §27 — Tactical fixes (the original 4 from v1)

These remain. They land first because they are unblockers for everything else.

### §27.1 Fix `Level01Scene` template slicing

`src/scenes/Level01Scene.ts:195` — remove `.slice(0, 5)`. Add regression test. Cost: 1 line + 1 test file.

### §27.2 Resolve all 5 detector/template mismatches

Per §7.3 decisions. Implement detectors for MC-NOM-01 and MC-ORD-01; generate templates for MC-WHB-02, MC-MAG-01, MC-PRX-01.

### §27.3 Tighten `validate-curriculum.mjs`

Implement the 21 invariants of §19. Block CI on violations.

### §27.4 Variety regeneration

Use upgraded pipeline (Sonnet, with variety prompt + semantic dedup) to regenerate L5, L6, L7, L9 with the v2 quality bar.

These four fixes deliver immediate value while the larger §1–§26 work is in flight.

---

## §28 — Phased delivery

Eight phases. Sized for sequencing, not for absolute time.

### Phase A — Foundations (specs, registries, validators)

Replace ad-hoc with explicit. No content changes; everything is metadata, documentation, and gates.

A.0 — **Install the decision-log harness** (§29.2): create `docs/10-curriculum/DECISIONS.md` and seed it with the 17 decisions from §32, each cross-referenced by section ID. Every subsequent A-decision lands here. — LX
A.1 — Write/revise level specs (§4.1 format) for L1–L9 — owned by LX
A.2 — Rebuild misconception registry (§7, §15.2 format) — LX
A.3 — Write archetype, representation, **and cultural-contexts** registries (§15.1, §16.3); seed cultural-contexts with `null` + 12-context starter list — LX
A.4 — Promote prerequisite graph from `skills.md` (§6.1 — extract, not create) — LX
A.5 — **Re-audit KC taxonomy** against live 255-template bundle (§5.2 — pre-Phase 0b-1 numbers are stale); decide consolidate vs. expand (§5.3) — LX
A.6 — Extend QuestionTemplate schema (§9.3 migration plan) + implement 21 validator invariants (§19); land additively (warn-only) — engineering
A.7 — Implement 6-lens quality gates (§16) — engineering

End state: all specifications and gates exist; existing content may not yet pass strict gates (warn-only by design); decision log catalogs the foundational choices.

### Phase B — Content fixes

> **Phase B execution is owned by [curriculum-completion-phase-3.plan.md](./curriculum-completion-phase-3.plan.md) (its Phases 0/0b/1/2/3).** §27 tactical fixes map onto its work-items; this plan's B.1–B.6 are the curriculum-side coordination, not duplicate execution. Where the two plans disagree on numbers (e.g., MC-WHB-02 template counts), Phase A.5's re-audit settles it.

B.1 — Slice fix (§27.1) — engineering [tracked in curriculum-completion-phase-3 Phase 0]
B.2 — Detector implementations for MC-NOM-01 and MC-ORD-01 (§27.2) — engineering
B.3 — Template regeneration to bait misconceptions confirmed-missing by Phase A.5 audit — pipeline [tracked in curriculum-completion-phase-3 Phase 1/2]
B.4 — Variety regeneration for thin/repetitive levels per Phase A.5 audit (likely L5, L6, L7, L9 but TBD) — pipeline [curriculum-completion-phase-3 Phases 2/3]
B.5 — Per-misconception hint differentiation (§13.2) — registry authoring, pipeline integration in this plan; HintLadder runtime rewrite tracked in `harden-and-polish.md` (open item)
B.6 — **Bundle-wide representation distribution rebalancing** (§32 decision #8) — re-author L3–L7 templates to introduce number-line representation in supporting roles per §10.1 distribution table — content + pipeline
B.7 — **Cultural context seeding at scale** (§32 decision #11) — re-author existing bare-imperative prompts to draw from approved-context registry — content + pipeline

### Phase C — Specialist review

C.1 — K-2 fractions specialist engagement (1 week, ~$3000–8000); identify backstop research partner pre-launch (e.g., a US ed-school K-2 program) per §29.3
C.2 — Item-by-item review of L7 (the cognitive crux) — specialist
C.3 — Sequence and pacing review — specialist
C.4 — Cognitive walkthrough with 8 K-2 children — specialist + UXR
C.5 — Accessibility specialist review (visual, motor, cognitive) — separate specialist
C.6 — Cultural / bias review (§26) — independent reviewer
C.7 — Punch list resolution; iterate B and C as needed
C.8 — **Establish ongoing specialist cadence** (§29.3): land the quarterly engagement contract for post-launch (Phase G) so the relationship doesn't lapse between launch and Phase G start

### Phase D — Standards alignment

D.1 — Crosswalk to 5 frameworks (§20) — specialist
D.2 — Coverage gap analysis — specialist
D.3 — Out-of-scope coverage decisions — specialist + product

### Phase E — Authoring system maturation

E.1 — Pipeline determinism (§14.4) — engineering
E.2 — Per-item review tooling: **GitHub-issue-based, with per-template labels `review:approved | review:revise | review:hold` and PR-batch review for generated content batches** (rather than per-template issues at scale). Re-review triggers: schema change, KC consolidation, new misconception. — engineering
E.3 — Versioning and lifecycle policy (§18) — engineering + LX
E.4 — Documentation of the full system — LX

### Phase F — Pre-launch validation

F.1 — Full bundle review against all gates (§19, §16) — automated + manual
F.2 — Pre-launch pilot v0 (5–8 children, moderated) — UXR
F.3 — Final adjustments — pipeline
F.4 — Lock content for v1.0.0 launch

### Phase G — Post-launch continuous improvement

> **Hard prerequisites.** Phase G analytics presuppose (a) the Dexie schema v5 `telemetryEvents` table from `harden-and-polish.md` R49 (logging substrate), (b) the Level01Scene validator-lookup fix (`master_audit_roadmap.md`) so L1 attempt signal isn't corrupted, (c) the Level01Scene `updateMastery` wiring fix (engine-museum, see §8.1) so L1 BKT signal exists at all, and (d) the localStorage `unlockedLevels:*` C5 breach mitigation (`master_audit_roadmap.md`) so progression state isn't silently destroyed by quota eviction. **Phase G cannot start until those four engine items ship.**

G.1 — Per-template analytics script (§12.1 stage 2) — engineering; consumes telemetryEvents from harden-and-polish R49
G.2 — Difficulty re-tiering after 4 weeks — LX + engineering
G.3 — BKT parameter tuning — engineering + LX
G.4 — New misconception detection (§7.4) — LX + engineering

### Phase H — Validation research

H.1 — Pilot v1 design and execution (§22.1) — UXR + LX + research partner
H.2 — Pilot v2 design and execution (§22.2) — research partner + LX
H.3 — Effectiveness publication / claim substantiation — product + LX

Phases A–F are pre-launch. G–H are post-launch.

---

## §29 — Roles, ownership, governance

A backbone curriculum needs named ownership. Not exhaustive job descriptions; just *who decides what*.

### §29.1 Roles

| Role | Decides | Reviewed by |
|---|---|---|
| **Curriculum Lead (CL)** | Pedagogical framework; level objectives; KC taxonomy; misconception catalog | Specialist; Product |
| **Learning Experience Designer (LX)** | Item design principles; representation choices; hint pedagogy; specs | CL |
| **Content Engineer** | Pipeline; validators; quality gates; tooling | LX, Engineering |
| **Specialist (external)** | Pedagogical correctness; sequence; cultural review | CL |
| **UXR** | Cognitive walkthroughs; pilot studies; bias review coordination | CL |
| **Product** | Scope; out-of-scope decisions; release gates | All above |

For a small team, CL = LX = Product is fine; the *roles* still exist and the decisions are tagged by role even if the same person makes them.

### §29.2 Decision log

Every consequential curriculum decision recorded at `docs/10-curriculum/DECISIONS.md`. **Each entry must reference at least one section ID from this plan** (e.g., `**Context:** v2 plan §1.1`) so traceability runs both ways: the plan defines the design space, the log records the choices.

```markdown
## D-001 — 2026-04-29 — Adopt CPA + Equal-Sharing + Number-Line synthesis as pedagogical framework

**Decided by:** CL (with LX, Product)
**Context:** v2 plan §1.1
**Alternatives considered:** Pure CGI; Davydov; Singapore Math alone
**Decision:** Synthesis — CPA progression, Empson & Levi sharing gateway, Siegler number-line emphasis
**Implications:** Section §1.4 enumerates the curriculum changes implied
**Revisit:** post Phase C specialist review
```

Numbering: D-NNN sequential, never reused. Decisions revisited get a new D-NNN that supersedes the prior; the prior is marked `superseded_by: D-NNN` in its frontmatter.

### §29.3 Specialist engagement model

Not "one day"; ongoing relationship.

- **Pre-launch (Phase C):** ~1 week of intensive review
- **Post-launch:** 1 day per quarter (review of iteration data, content additions)
- **Validation studies (Phase H):** project-based engagement with research partner

Cost estimate: $5000–15000 / year of specialist time.

---

## §30 — Cost and resource model

Order-of-magnitude estimates. Pre-MVP is the highest cost; ongoing is modest.

| Phase | Duration (rough) | Cost (rough) |
|---|---|---|
| A — Foundations | 2–3 weeks | Internal time only |
| B — Content fixes | 2 weeks | LLM costs ~$50; internal time |
| C — Specialist review | 1–2 weeks elapsed | $3000–8000 specialist; $500 child research |
| D — Standards alignment | 1 week | $1500–3000 specialist |
| E — Authoring maturation | 2 weeks | Internal time |
| F — Pre-launch validation | 1 week | $500 |
| G — Post-launch (ongoing) | Ongoing | $200 / quarter analytics; $1000–2000 / quarter specialist |
| H — Validation research | 6–12 months | $20000–80000 (university partnership pricing varies widely) |

Pre-launch curriculum-specific spend: ~$5000–13000.
Year-1 ongoing: ~$8000–16000 for specialist + analytics.
Effectiveness research: optional, $20k–80k if pursued.

These are *additional* to engineering and design time. Curriculum is genuinely budgetable; deferring it pre-launch would create technical debt that's expensive to repay.

---

## §31 — Risk register

The biggest risks to the curriculum specifically.

| # | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| R1 | Specialist review reveals fundamental sequencing problems | Medium | High | Phase C is early; punch list resolved before content is locked |
| R2 | LLM-generated content has subtle bias not caught by gates | Medium | High | Bias audit (§26) + cultural quality gate (§16); ongoing review |
| R3 | KC taxonomy consolidation reduces detector signal | Low | Medium | Audit before consolidation (§5.2); preserve diagnostic capability |
| R4 | Misconception detectors fire false positives, frustrating children | Medium | Medium | Calibrate thresholds post-launch (Phase G); conservative defaults |
| R5 | Standards alignment surfaces uncoverable gaps | Medium | Medium | Either expand scope or document gap explicitly; don't hide |
| R6 | Pilot study reveals weak effectiveness | Low | High | Better to know; can re-iterate; no marketing claims pre-evidence |
| R7 | Multilingual rollout exposes culturally-default English items | High | Medium | Cultural review pre-multilingual; flag and fix proactively |
| R8 | Difficulty tiers are wildly miscalibrated, ruining adaptive routing | Medium | Medium | Stage-1 difficulty rationales required (§12.1); Stage-2 data calibration |
| R9 | New misconceptions emerge from data we hadn't catalogued | High | Low | Post-launch detection of unmodeled patterns; § 7.4 expansion |
| R10 | Authoring team turnover leaves curriculum decisions opaque | Medium | High | Decision log (§29.2) + comprehensive level specs |
| R11 | Specialist rejects §1.1 framework (CPA + Equal-Sharing + Number-Line) outright | Low | Very High | Phase C kicks off with §1.1 explicitly on the table; if rejected, fall back to "what would you replace it with?" rather than re-litigating items. **§27 tactical fixes are independent of §1.1 outcome and proceed regardless.** |
| R12 | Specialist not findable within 3 months (Appendix C #4) | Medium | Medium | Identify a backstop research partner pre-launch (US ed-school K-2 program, named in Phase C.1); state in §29.3 |
| R13 | No author for cultural-contexts registry (§23.1 governance gap) | Medium | Low | Decided pre-launch: solo author maintains, with annual diversity review by ≥ 1 external reviewer. Cheap, sufficient for MVP scope. |
| R14 | QuestionTemplate schema migration breaks production (§9.2 8-field extension) | Medium | Medium | §9.3 staged rollout: A.6 lands additively (all new fields optional/nullable + defaults); B fills them; end-of-B flips required-flag for new templates only; end-of-C flips required for all. Bundle parity test catches regressions. |

---

## §32 — Decisions made in this v2 plan

The plan itself made consequential choices. Listing them so they're easy to revisit.

1. **Adopt CPA + Equal-Sharing + Number-Line synthesis** as pedagogical framework (§1.1)
2. **Make pedagogical theory explicit and load-bearing** rather than implicit (§1.4 audit)
3. **Treat curriculum as the product**, not infrastructure (§0)
4. **Establish detector/template parity as a hard contract** (§17)
5. **Six lenses of quality gates**, not just technical schema (§16)
6. **Consolidate the KC taxonomy** (likely 16–20 KCs from current 33) pending audit (§5.3)
7. **Build a research-grounded misconception catalog** (12 entries; §7.1) and cull the unimplemented ones (§7.3)
8. **Number-line representation appears from L3** as supporting role, not just at L8 (§10.1)
9. **Per-misconception hint differentiation** at Tier 1 (§13.2)
10. **Two-stage difficulty calibration** (author rationale + post-launch data) (§12)
11. **Approved cultural contexts registry** (§23.1) with banned list (§23.2)
12. **Five-framework standards crosswalk** (§20.1)
13. **Validity argument structure** (§21.1) with explicit pre-launch claim discipline (§21.4)
14. **Two-phase pilot study plan** (§22.1, §22.2) — only post-launch
15. **Eight-phase delivery model** (§28)
16. **Specialist as ongoing relationship**, not one-time engagement (§29.3)
17. **Decision log** as artifact (§29.2; installed as Phase A.0)

Each is reversible; each is now visible.

### §32.1 Decision-to-phase mapping

Every decision lands in a phase task. Where the v2 first draft missed mapping, v2.1 closes the gap:

| Decision | Phase task |
|---|---|
| #1 Pedagogical framework | A.0 (decision log entry); ratified in C.3 specialist review |
| #2 Theory explicit | A.0 (decision log) |
| #3 Curriculum-as-product framing | A.0 (decision log; structural, not a content change) |
| #4 Parity contract | A.6 (validator invariants 5–6) + §17.1 verify-parity tool |
| #5 Six lenses of quality gates | A.7 |
| #6 KC consolidation | A.5 |
| #7 Misconception catalog rebuild | A.2 + B.2 + B.3 |
| #8 Number-line from L3 | **B.6 (NEW; bundle-wide representation rebalancing)** |
| #9 Per-misconception hint differentiation | B.5 |
| #10 Two-stage difficulty calibration | A.6 (rationale required at item-author time) + G.2 (data calibration) |
| #11 Cultural contexts registry + banned list | **A.3 (seed) + B.7 (NEW; re-author bare-imperative prompts at scale)** |
| #12 Five-framework crosswalk | D.1 |
| #13 Validity argument structure | A.0 (decision log only — no implementation in this plan; constrains marketing copy) |
| #14 Two-phase pilot study | H.1 + H.2 (gated) |
| #15 Eight-phase delivery | §28 itself |
| #16 Specialist as ongoing | **C.8 (NEW; lands quarterly cadence contract)** + G.x ongoing |
| #17 Decision log | **A.0 (NEW; installs the harness)** |

---

# Part VIII — Roadmap

## §33 — v1.0.0 (MVP launch)

After Phases A–F complete:

- 9 levels covering K-2 fractions per CCSS 1.G.A.3 + 2.G.A.3 + Grade 3 prep
- 16–20 KCs, each with ≥ 12 templates (revised count)
- 8–10 misconceptions with full parity contract
- Pre-launch specialist content review complete
- Cognitive walkthrough with 8 children complete
- All 21 validator invariants passing
- Cultural / bias review complete
- Standards crosswalk to 5 frameworks
- Pre-launch pilot v0 (5–8 children) feedback incorporated

What we *do not* claim:

- "Proven to teach K-2 fractions"
- "Equivalent to classroom instruction"
- "Aligned with [specific standard]" without showing the crosswalk

What we *do* claim:

- Built on CPA + equal-sharing + number-line research
- Reviewed by K-2 fractions specialist
- Tested with K-2 children in cognitive walkthrough
- Aligned with [N standards] per published crosswalk

## §34 — v1.x continuous improvement

- Difficulty re-tiering from data
- BKT parameter calibration from data
- New misconceptions added as patterns emerge
- Cultural diversity expansion (more contexts, less Western-default)
- ELL English refinement
- L7 (the cognitive crux) iterated based on real failure data

## §35 — v2 (1-year horizon)

- **Multilingual content** (Spanish, then expand)
- **Audio narration in all locales** (per audio.md pipeline)
- **Pilot v1 study** results published / informing changes
- ~~Caregiver-facing curriculum reports~~ — **cut.** Violates locked constraint C2 (no teacher/parent UI). Reintroducing requires a product-level constraint relaxation logged in `docs/00-foundation/decision-log.md`, not in this plan.
- ~~Optional L10–L11 content expansion~~ — **cut.** Violates locked constraint C3 (L1–L9 only). Same constraint-relaxation gate applies.

## §36 — Curriculum 2.0 (post-validation)

- Pilot v2 results: rigorous effectiveness evidence
- Adaptive engine refinement based on multi-month data
- ~~Cross-domain expansion (ratios, decimals, percent — Grades 3–5)~~ — **cut.** Violates C3. If product later relaxes scope, Curriculum 2.0 becomes the home for that expansion; that decision is taken first, then this section is rewritten.
- ~~Vertical articulation with grade-3+ partner content~~ — **cut, same reason.**
- IP licensing (Open Educational Resource? Creative Commons?) decided once content is validated

---

# Appendices

## Appendix A — Cross-reference to v1

For traceability, every v1 phase has a v2 home:

| v1 phase | v2 location |
|---|---|
| v1 Phase 1: Engine fix (slice) | v2 §27.1 (Phase B.1) |
| v1 Phase 2: Detector / template parity | v2 §7.3 + §27.2 (Phase B.2, B.3) |
| v1 Phase 3: Pipeline-driven variety | v2 §27.4 (Phase B.4) |
| v1 Phase 4: Pedagogy review | v2 §29.3 + Phase C |
| v1 Phase 5: Validation gates | v2 §19 (Phase A.6) |
| v1 Phase 6: Calibration | v2 §12 + Phase G |
| v1 Phase 7: Standards | v2 §20 + Phase D |

v2 net additions: §1 theory of action, §4 learning objectives, §5 KC audit, §6 prerequisite graph, §9–13 item design science, §15–18 authoring system, §16 six-lens quality gates, §21–22 validity and pilot, §23–26 equity, §29 governance, §31 risk register, §33–36 roadmap.

**v2.1 net additions (cross-functional review pass, 2026-04-29):**
- TL;DR + Relationship-to-other-plans table at top
- Stale-numbers caveat at top
- §1.4 audit refreshed with 2026-04 findings (zero sharing-context hits in bundle; number-line clarification)
- §3 keyboard-access claim softened (acknowledges current state; defers to curriculum-completion-phase-3 C6.8)
- §5.2 stale-numbers note (Phase 0b-1 changed the picture)
- §6.1 reframed as "promote existing skills.md prereqs" rather than "create new file"
- §7.3 reframed (Phase 0b-1 changed numbers; A.5 must re-count first)
- §7.4 fixed: post-launch goes to **Phase G**, not Phase D
- §8.1 engine-museum dependency note (BKT signal uninstrumented for L1 today)
- §9.3 schema-extension migration plan (additive → required, staged)
- §13.1 Tier-3 contradiction acknowledged (live behavior contested)
- §13.2 hint registry fully specified (storage, pipeline, runtime)
- §13.3 fixed: Phase D → Phase G; references C7.8 for hint-cost wiring
- §16.1 expanded Unicode list; cross-references ux-elevation T1
- §16.3 day-1 cultural policy decided (option 2: seed registry with `null` + 12-context starter list; blocking from day one)
- §16.4 audio-manifest-keyed rule
- §17.1 verify-parity tool spec
- §19.8 stable JSON reporter schema
- §21.4 added "adaptive ≠ proof of learning" caveat
- §22.2 made conditional on v1 effect-size + partner availability
- §28 Phase A.0 (decision-log harness); B header noting curriculum-completion-phase-3 ownership; B.6 + B.7 (representation rebalancing + cultural seeding); C.8 (specialist cadence); G hard-prereqs from harden-and-polish + master-audit
- §28 E.2 spec'd (GitHub-issue + label-based)
- §29.2 decision-log entries must reference plan section IDs
- §31 four new risks (R11–R14: framework rejection, specialist findability, cultural author, schema migration)
- §32.1 decisions-to-phases map closes the v2 coverage gaps (#8, #11, #16, #17 now have phase tasks)
- §35/§36 cut C2/C3 violations (caregiver dashboard, Grades 3–5 expansion); reclassified as constraint-relaxation gates
- §14.3 added 80% Haiku-dedup data point and Sonnet cost-differential
- Appendix B added Chi & VanLehn (1991), Stigler & Hiebert (1999)
- Appendix C #6 made conditional gate explicit; #7 corrected to match §28 D.1 (5 frameworks at launch)

## Appendix B — Research citations (selected)

For specialist orientation and to ground the framework choices.

- Chi, M. T. H., & VanLehn, K. A. (1991). The content of physics self-explanations.
- Empson, S. B., & Levi, L. (2011). *Extending Children's Mathematics: Fractions and Decimals.* Heinemann.
- Hunting, R. P. (1999). Rational-number learning in the early years.
- Kane, M. T. (2013). Validating the interpretations and uses of test scores.
- Lortie-Forgues, H., Tian, J., & Siegler, R. S. (2015). Why is learning fraction and decimal arithmetic so difficult?
- Messick, S. (1989). Validity. *Educational Measurement.*
- Ni, Y., & Zhou, Y.-D. (2005). Teaching and learning fraction and rational numbers: The origins and implications of whole number bias.
- Pothier, Y., & Sawada, D. (1983). Partitioning: The emergence of rational number ideas in young children.
- Renkl, A. (2014). Toward an instructionally oriented theory of example-based learning.
- Siegler, R. S., et al. (2011). Early predictors of high school mathematics achievement.
- Siegler, R. S., et al. (2013). Fractions: The new frontier for theories of numerical development.
- Stigler, J. W., & Hiebert, J. (1999). *The Teaching Gap.* (TIMSS-grounded cross-cultural mathematics instruction.)
- Sweller, J. (2011). Cognitive load theory.
- Vamvakoussi, X., & Vosniadou, S. (2010). How many decimals are there between two fractions?

A more comprehensive bibliography lives at `docs/10-curriculum/research-bibliography.md` (to be created in Phase A).

## Appendix C — Open questions

1. **Pedagogical framework ratification.** §1.1 commits us to CPA + Equal-Sharing + Number-Line synthesis. Specialist review (Phase C) ratifies or revises. Default: ratify.
2. **KC consolidation: target count.** §5.3 suggests 16–20 from current 33. Phase A.5 audit decides. Default: consolidate to ~18.
3. **Misconception catalog expansion.** §7 lists 12 research-grounded misconceptions; today 7 are partially implemented. Pre-launch target ≥ 8 fully wired. Default: 8.
4. **Specialist sourcing.** §29.3 budget allocates $5000–15000/year. Default: source via educational-research network or LinkedIn after Phase A specs are written so candidates can review concrete artifacts.
5. **LLM provider for regeneration.** §14.3 recommends Claude Sonnet over Haiku. Default: yes.
6. **Pilot study scope (Phase H).** §22 details v1 (lightweight) and v2 (rigorous). Default: pilot v1 within 6 months of launch. **Pilot v2 is conditional** on v1 effect ≥ 0.15 Cohen's *d* AND research partner availability (§22.2 gate).
7. **Standards alignment scope.** §28 D.1 commits to 5-framework crosswalk at launch (§20.1). Default matches: 5 frameworks at launch, not "CCSS only." Earlier draft of this Appendix said "CCSS at launch" — that was inconsistent with §28 D.1 and is corrected.
8. **Multilingual launch order.** §25.3 lists 4 priority locales. Default: Spanish at v2; others by adoption signal.
9. **Effectiveness claim discipline.** §21.4 forbids unsubstantiated effectiveness claims pre-launch. Default: marketing copy reviewed against this.
10. **Open-licensing decision (Curriculum 2.0).** §36 raises but doesn't decide. Default: defer until validated content + business model exist.

Reply with answers (or "use defaults") and **Phase A.0** (install the decision-log harness) starts in the next message — every subsequent A-decision lands in the log, including the answers to this Appendix.
