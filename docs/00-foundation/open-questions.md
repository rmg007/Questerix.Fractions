---
title: Open Questions Register
status: active
owner: solo
last_reviewed: 2026-04-24
applies_to: [mvp]
related: [constraints.md, ../50-roadmap/mvp-l1-l9.md]
---

# Open Questions Register

A consolidated list of questions raised across all foundation docs that need a decision before or during Phase 1 of the MVP roadmap.

Each question has a **target answer date**, an **owner**, and a **trigger** — the latest point at which the answer must be locked.

Questions resolved during planning are moved to the [Decision Log](./decision-log.md) and removed from this list.

---

## Priority 0 — Must answer before Phase 1 begins

### Q1 — Audio narration: TTS API or pre-recorded?
**Source:** `10-curriculum/scope-and-sequence.md §7`, `levels/level-01.md §10`
**Default:** Browser SpeechSynthesis API at runtime (zero cost, immediate)
**Pivot trigger:** If TTS quality on iOS Safari is unacceptable for K-2 students
**Decision needed by:** Start of Phase 1 Sprint 1

### Q2 — Visual model preference per level
**Source:** `10-curriculum/scope-and-sequence.md §7`, multiple level docs
**Question:** Do L1–L2 use rectangles primary + circles secondary, or vice versa?
**Default:** Rectangles primary L1–L2 (easier to partition geometrically), circles introduced L3+
**Decision needed by:** Start of Level 1 question authoring

### Q3 — Symbolic notation timing
**Source:** `levels/level-05.md`, `levels/level-06.md`, `RoadMap/02_Level_03_05/02_LEARNING_TRAJECTORY.md`
**Question:** Confirm symbols `1/2`, `1/3` first appear at L6, not earlier
**Default:** L6 introduction confirmed (per Learning Trajectory)
**Decision needed by:** Before authoring L5 templates

### Q4 — Pre-Level-1 onboarding scene
**Source:** `levels/level-01.md §10`
**Question:** Does L1 itself include drag-and-tap tutorial, or is there a separate ~60s onboarding scene?
**Default:** Separate onboarding scene, skippable on second launch
**Decision needed by:** Before building any scene code

### Q5 — Pipeline location: in-repo or separate?
**Source:** `30-architecture/content-pipeline.md §6`
**Question:** Does `tools/content-pipeline/` live in this repo or its own?
**Default:** Same repo, in `tools/` directory (build tool, not runtime)
**Decision needed by:** Before first pipeline run

---

## Priority 1 — Should answer during Phase 1

### Q6 — Audio replay UX
**Source:** `levels/level-01.md §10`
**Question:** Tappable speaker icon only, or auto-replay if no answer in 10s?
**Default:** Tappable only (avoid interrupting child thinking)
**Decision needed by:** Phase 1 Sprint 2

### Q7 — C8 progression alignment confirmed
**Source:** `levels/level-05.md` open question 7 (flagged by Agent A)
**Question:** Is the two-axis (denominator × verb) progression now locked?
**Default:** Yes, C8 was rewritten in `constraints.md` change log on 2026-04-24
**Status:** RESOLVED — moved to decision log

### Q8 — Adult-helper UI surface
**Source:** `levels/level-01.md §10`
**Question:** Should a parent sitting next to the child see anything specific on screen?
**Default:** No dedicated parent surface (per C2). Standard end-of-session screen is incidentally visible.
**Decision needed by:** Phase 1 Sprint 1

### Q9 — Hint ladder copy across levels
**Source:** `levels/level-NN.md` (multiple)
**Question:** Are hint copy patterns consistent across activities, or do mechanics need different hint phrasings?
**Default:** Consistent skeleton ("Try again" → visual overlay → worked example), specific text per mechanic
**Decision needed by:** Phase 1 Sprint 2

### Q10 — TTS voice selection
**Source:** `levels/level-NN.md` (multiple)
**Question:** Which SpeechSynthesis voice on iOS / Android / desktop? Default voices vary widely.
**Default:** Use `lang: "en-US"` and let browser pick; document per-platform behavior
**Decision needed by:** Phase 1 Sprint 2

### Q11 — Misconception detection thresholds
**Source:** `10-curriculum/misconceptions.md`
**Question:** How many wrong attempts in what time window count as a confirmed misconception?
**Default:** 3 wrong attempts of the same misconception type within 5 sessions = `CONFIRMED`
**Decision needed by:** First mastery-engine implementation

---

## Priority 2 — Defer until validation begins

### Q12 — Pre/post test instrument source
**Source:** `40-validation/playtest-protocol.md`
**Question:** Hand-write a 5-item paper instrument, or license an existing tool (Number Knowledge Test)?
**Default:** Hand-write for MVP pilot (informal); license validated instrument for any formal study
**Decision needed by:** 2 weeks before first playtest

### Q13 — Comparison group for validation
**Source:** `40-validation/learning-hypotheses.md`
**Question:** Does MVP playtest need a no-treatment comparison group, or is pre/post within-subjects sufficient?
**Default:** Within-subjects pre/post sufficient for MVP (informal pilot). Formal RCT comes post-MVP only.
**Decision needed by:** Phase 4

### Q14 — Public release domain and hosting
**Source:** `40-validation/playtest-protocol.md` and `50-roadmap/mvp-l1-l9.md` Phase 4
**Question:** What's the hosting domain? Vercel free tier or self-hosted?
**Default:** Vercel free tier; custom domain TBD (`questerix.com` or `questerix.app`)
**Decision needed by:** Phase 4

---

## Priority 3 — Open but non-blocking

### Q15 — Misconceptions catalog completeness
**Source:** `10-curriculum/misconceptions.md`
**Question:** Are 12 misconceptions enough, or are we missing important ones?
**Default:** 12 is sufficient for MVP. Catalog grows from playtest observations.
**Decision needed by:** Phase 2 (after first playtest)

### Q16 — Visual partition rendering style
**Source:** `levels/level-01.md §10`
**Question:** Plain partition lines or with intersection dots (Montessori convention)?
**Default:** Plain lines for MVP; Montessori dots add aesthetic complexity without learning gain
**Decision needed by:** Phase 1 Sprint 2

### Q17 — Quarantine deletion timing
**Source:** This document, `_quarantine/` folder at project root
**Question:** When is `_quarantine/` deleted permanently?
**Default:** After Phase 1 Sprint 2 ends (one full review cycle)
**Decision needed by:** End of Phase 1

### Q18 — Surviving RoadMap content cleanup
**Source:** `RoadMap/02_Level_03_05/`, `RoadMap/03_Level_06_09/`
**Question:** When are the source pedagogy docs in `RoadMap/` migrated/deleted?
**Default:** Migrate the most-referenced fragments into `docs/`, delete the rest at end of Phase 1
**Decision needed by:** End of Phase 1

### Q19 — Calibration-round mode for retention measurement
**Source:** `40-validation/learning-hypotheses.md §5`
**Question:** H-04 needs first-5-attempts on the SAME skill at day-2 session start, but adaptive routing may have shifted the student to a different level. Should the engine ship with a dedicated "calibration" state that pins the skill for the first 5 attempts of a return session?
**Default:** No calibration state for MVP; accept that adaptive routing may dilute the H-04 signal and note the limitation in the validation report.
**Owner:** solo
**Decision needed by:** Phase 1 mid-point (audit §3.5)

---

## How To Add A Question Here

1. Question is concrete, has a default answer, and a clear trigger date
2. Source doc is cited (so we know who raised it)
3. Either P0–P3 priority is set
4. Owner is named (defaults to "solo")

If a question is too vague to write here, it's not yet a question. Wait until it's specific.

## How To Resolve A Question

1. Write the answer in the relevant source doc (the one cited in `Source:`)
2. Move the entry into [`decision-log.md`](./decision-log.md) with date and rationale
3. Delete it from this file
