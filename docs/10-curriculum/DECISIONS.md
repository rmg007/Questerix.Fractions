# Curriculum Decisions Log

This log records consequential decisions for the Questerix Fractions curriculum. Every entry references a section in [curriculum-update.md](../PLANS/curriculum-update.md) and follows the sequential `D-NNN` numbering format.

---

## D-001 — 2026-04-29 — Adopt CPA + Equal-Sharing + Number-Line synthesis as pedagogical framework

**Decided by:** CL (with LX, Product)
**Context:** [curriculum-update.md §1.1](../PLANS/curriculum-update.md#§1.1)
**Alternatives considered:** Pure CGI; Davydov; Singapore Math alone
**Decision:** Synthesis — CPA (Concrete-Pictorial-Abstract) progression, Empson & Levi equal-sharing gateway, and Siegler number-line emphasis.
**Implications:** Every concept appears visually before symbolically; first encounter is sharing-based; number lines appear early (L3+); manipulation precedes recognition.
**Status:** ACTIVE

## D-002 — 2026-04-29 — Make pedagogical theory explicit and load-bearing

**Decided by:** CL
**Context:** [curriculum-update.md §1.4](../PLANS/curriculum-update.md#§1.4)
**Decision:** Pedagogical theory is now an explicit commitment against which all downstream decisions are tested, rather than an accidental byproduct of engine design.
**Status:** ACTIVE

## D-003 — 2026-04-29 — Treat curriculum as the product

**Decided by:** Product
**Context:** [curriculum-update.md §0](../PLANS/curriculum-update.md#§0)
**Decision:** Curriculum is the primary product; all other layers (engine, UX, audio) are delivery mechanisms.
**Status:** ACTIVE

## D-004 — 2026-04-29 — Establish detector/template parity as a hard contract

**Decided by:** Engineering + CL
**Context:** [curriculum-update.md §17](../PLANS/curriculum-update.md#§17)
**Decision:** A misconception ID is only valid if it has (1) a documentation entry, (2) an active detector implementation, and (3) ≥ 5 templates baiting it.
**Status:** ACTIVE

## D-005 — 2026-04-29 — Six lenses of quality gates

**Decided by:** Content Engineering
**Context:** [curriculum-update.md §16](../PLANS/curriculum-update.md#§16)
**Decision:** Validate curriculum against six lenses: Technical, Linguistic, Pedagogical, Visual, Cultural, and Accessibility.
**Status:** ACTIVE

## D-006 — 2026-04-29 — Consolidate the KC taxonomy

**Decided by:** CL
**Context:** [curriculum-update.md §5.3](../PLANS/curriculum-update.md#§5.3)
**Decision:** Consolidate the current 33 KCs to ~16–20 to ensure sufficient data density for BKT (target ≥ 12 templates per KC).
**Status:** ACTIVE (Pending Phase A.5 audit)

## D-007 — 2026-04-29 — Build a research-grounded misconception catalog

**Decided by:** CL
**Context:** [curriculum-update.md §7.1](../PLANS/curriculum-update.md#§7.1)
**Decision:** Replace ad-hoc misconceptions with a research-grounded catalog of 12 entries, targeting ≥ 8 fully wired for MVP.
**Status:** ACTIVE

## D-008 — 2026-04-29 — Number-line representation appears from L3

**Decided by:** CL
**Context:** [curriculum-update.md §10.1](../PLANS/curriculum-update.md#§10.1)
**Decision:** Introduce number-line representations as a supporting role starting in Level 3, rather than waiting until Level 8, to build magnitude intuition early.
**Status:** ACTIVE

## D-009 — 2026-04-29 — Per-misconception hint differentiation

**Decided by:** LX
**Context:** [curriculum-update.md §13.2](../PLANS/curriculum-update.md#§13.2)
**Decision:** Implement Tier-1 hints that are specific to the triggered misconception rather than generic level-level tips.
**Status:** ACTIVE

## D-010 — 2026-04-29 — Two-stage difficulty calibration

**Decided by:** LX
**Context:** [curriculum-update.md §12](../PLANS/curriculum-update.md#§12)
**Decision:** Items initially carry author-asserted difficulty tiers with written rationales; these are re-calibrated post-launch using real first-try accuracy data.
**Status:** ACTIVE

## D-011 — 2026-04-29 — Approved cultural contexts registry

**Decided by:** LX
**Context:** [curriculum-update.md §23.1](../PLANS/curriculum-update.md#§23.1)
**Decision:** Maintain a registry of approved and banned cultural contexts to ensure global neutrality and equity. Bare-imperative (`null` context) remains valid.
**Status:** ACTIVE

## D-012 — 2026-04-29 — Five-framework standards crosswalk

**Decided by:** CL
**Context:** [curriculum-update.md §20.1](../PLANS/curriculum-update.md#§20.1)
**Decision:** Provide traceability to CCSS, England NC, Singapore Math, ACARA (Australia), and Ontario (Canada) frameworks at launch.
**Status:** ACTIVE

## D-013 — 2026-04-29 — Validity argument structure

**Decided by:** CL
**Context:** [curriculum-update.md §21.1](../PLANS/curriculum-update.md#§21.1)
**Decision:** Use the Kane validity framework to structure claims about what the curriculum measures and teaches.
**Status:** ACTIVE

## D-014 — 2026-04-29 — Two-phase pilot study plan

**Decided by:** UXR
**Context:** [curriculum-update.md §22.1](../PLANS/curriculum-update.md#§22.1)
**Decision:** Execute a lightweight Pilot v1 (1–2 classrooms) post-launch, with a rigorous Pilot v2 contingent on v1 results.
**Status:** ACTIVE

## D-015 — 2026-04-29 — Eight-phase delivery model

**Decided by:** Product
**Context:** [curriculum-update.md §28](../PLANS/curriculum-update.md#§28)
**Decision:** Sequenced delivery through Foundations, Content Fixes, Specialist Review, Standards Alignment, Authoring Maturation, Validation, Improvement, and Research.
**Status:** ACTIVE

## D-016 — 2026-04-29 — Specialist as ongoing relationship

**Decided by:** CL
**Context:** [curriculum-update.md §29.3](../PLANS/curriculum-update.md#§29.3)
**Decision:** Transition from one-time expert review to an ongoing quarterly engagement to maintain pedagogical integrity.
**Status:** ACTIVE

## D-017 — 2026-04-30 — Adopt Curriculum Update Plan (v2) as master reference
**Decided by:** CL + Product + Engineering
**Context:** [curriculum-update.md](../PLANS/curriculum-update.md)
**Decision:** Adopt the comprehensive v2 plan as the canonical framework for all following curriculum decisions.
**Status:** ACTIVE

## D-018 — 2026-04-30 — Establish Decision Log (DECISIONS.md) as artifact
**Decided by:** Engineering
**Context:** [curriculum-update.md §29.2](../PLANS/curriculum-update.md#§29.2)
**Decision:** Formally install `docs/10-curriculum/DECISIONS.md` as the centralized audit trail for curriculum choices.
**Status:** ACTIVE

## D-019 — 2026-04-30 — Standardize on Claude 3.5 Sonnet for content regeneration
**Decided by:** Content Engineering (Appendix C #5)
**Context:** [curriculum-update.md §14.3](../PLANS/curriculum-update.md#§14.3)
**Decision:** Use Claude 3.5 Sonnet for Phase B regeneration to minimize dedup loss and improve prompt variety.
**Status:** ACTIVE

## D-020 — 2026-04-30 — Spanish as first internationalization target
**Decided by:** Product (Appendix C #8)
**Context:** [curriculum-update.md §25.3](../PLANS/curriculum-update.md#§25.3)
**Decision:** Prioritize Spanish (US/Latin America) as the first locale for the v2.0 multilingual rollout.
**Status:** ACTIVE

## D-021 — 2026-04-30 — Defer open-licensing decision
**Decided by:** Product (Appendix C #10)
**Context:** [curriculum-update.md §36](../PLANS/curriculum-update.md#§36)
**Decision:** Defer the decision on open-licensing (Curriculum 2.0) until the current content and business model are validated.
**Status:** ACTIVE

## D-022 — 2026-04-30 — Enforce "No unsubstantiated effectiveness claims" pre-launch
**Decided by:** Product + CL (Appendix C #9)
**Context:** [curriculum-update.md §21.4](../PLANS/curriculum-update.md#§21.4)
**Decision:** Prohibit marketing claims of educational effectiveness until Pilot v1/v2 results are available.
**Status:** ACTIVE

## D-023 — 2026-04-30 — Consolidate KC Taxonomy to 9 High-Level KCs

**Decided by:** CL
**Context:** [curriculum-update.md §5.3](../PLANS/curriculum-update.md#§5.3) / [AUDIT_REPORT_A5.md](../brain/203ede08-6c14-4698-afe5-dc0942a04fb8/AUDIT_REPORT_A5.md)
**Decision:** Consolidate the existing 33 granular Knowledge Components (SK-01 to SK-33) into 9 high-level, pedagogically distinct KCs to ensure faster BKT convergence during pilots.
**Consolidation Map:**
- `KC-HALVES-VIS`: SK-01, SK-02, SK-03, SK-04, SK-05
- `KC-UNITS-VIS`: SK-07, SK-08, SK-09, SK-10
- `KC-SET-MODEL`: SK-06, SK-19
- `KC-PRODUCTION-1`: SK-11, SK-12, SK-13, SK-14
- `KC-PRODUCTION-2`: SK-15, SK-16, SK-17, SK-18, SK-20
- `KC-SYMBOL-BASIC`: SK-21, SK-22, SK-23
- `KC-SYMBOL-ADV`: SK-24, SK-25, SK-26
- `KC-MAGNITUDE`: SK-27, SK-28, SK-29
- `KC-ORDERING`: SK-30, SK-31, SK-32, SK-33
**Status:** ACTIVE
