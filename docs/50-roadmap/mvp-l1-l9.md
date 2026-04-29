---
title: MVP Roadmap (Levels 1–9)
status: draft
owner: solo
last_reviewed: 2026-04-24
applies_to: [mvp]
constraint_refs: [C1, C2, C3, C4, C9, C10]
related:
  [
    ../00-foundation/constraints.md,
    ../10-curriculum/scope-and-sequence.md,
    ../40-validation/playtest-protocol.md,
    ../40-validation/learning-hypotheses.md,
    post-mvp-2029.md,
  ]
---

# MVP Roadmap — Levels 1–9

The realistic, solo-developer plan to take Questerix Fractions from "foundation docs done" to "playtest analyzed and decision made."

The inherited `RoadMap/` was sized for a curriculum team and a multi-year deployment. **That is not this project.** This roadmap assumes:

- 1 developer (the owner).
- ~15 hours/week on this project (other commitments exist).
- No external funding, no team, no marketing surface.
- 5–6 months total wall-clock time.
- Ship date is whenever validation succeeds, **not** a fixed deadline.

The goal (per **C10**) is **validation, not feature completeness**.

---

## 1. Roadmap at a Glance

```
        Phase 0          Phase 1          Phase 2          Phase 3          Phase 4
       ┌────────┐      ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
       │Founda- │      │  L1–L2   │    │  L3–L5   │    │  L6–L9   │    │Validation│
       │tion    │ ───► │  build   │───►│ + Cycle A│───►│ + Cycle B│───►│ + release│
       │docs    │      │~6 weeks  │    │ ~4 weeks │    │ ~6 weeks │    │ ~4 weeks │
       └────────┘      └──────────┘    └──────────┘    └──────────┘    └──────────┘
        DONE             20%             50%             80%             SHIP

       Wall-clock: ~5–6 months. Calendar dates depend on start.
```

| Phase                             | Wall-clock | Calendar (illustrative) | Cumulative effort |
| --------------------------------- | ---------- | ----------------------- | ----------------- |
| 0 — Foundation                    | (current)  | Apr 24, 2026            | ~80 hours         |
| 1 — Build L1–L2                   | ~6 weeks   | through early Jun       | ~170 hours        |
| 2 — Build L3–L5 + Cycle A         | ~4 weeks   | through early Jul       | ~230 hours        |
| 3 — Build L6–L9 + Cycle B         | ~6 weeks   | through mid Aug         | ~320 hours        |
| 4 — Validation analysis + release | ~4 weeks   | through mid Sep         | ~380 hours        |

Total: ~380 hours over ~5 months. **Not 52 weeks.** The inherited "52 weeks of curriculum" was a _teacher-facing year of instruction_ — not a build plan.

---

## 2. Phase 0 — Foundation Docs (Current State)

**Status:** mostly complete. This is the work happening now.

### 2.1 Deliverables (audit §1.3 fix)

- [x] `00-foundation/constraints.md` (C1–C10 locked)
- [x] `00-foundation/vision.md`
- [x] `00-foundation/glossary.md`
- [x] `00-foundation/decision-log.md`
- [x] `00-foundation/open-questions.md`
- [x] `10-curriculum/scope-and-sequence.md`
- [x] `10-curriculum/levels/level-01.md` (template + first level)
- [ ] `10-curriculum/levels/level-02.md` … `level-09.md` (skeletons only at this phase; full content in Phases 1–3)
- [x] `10-curriculum/standards-map.md`
- [x] `10-curriculum/misconceptions.md`
- [x] `10-curriculum/skills.md` (SK-NN canonical registry — created by Agent A)
- [x] `20-mechanic/activity-archetypes.md`
- [x] `20-mechanic/design-language.md`
- [x] `30-architecture/data-schema.md`
- [x] `30-architecture/persistence-spec.md`
- [x] `30-architecture/runtime-architecture.md`
- [x] `30-architecture/content-pipeline.md`
- [x] `40-validation/learning-hypotheses.md`
- [x] `40-validation/playtest-protocol.md`
- [x] `40-validation/in-app-telemetry.md`
- [x] `50-roadmap/mvp-l1-l9.md` (this document)
- [x] `50-roadmap/post-mvp-2029.md`
- [x] `INDEX.md`

### 2.2 Phase 0 Exit Criteria

Phase 0 is done when:

1. All checked items above are written and self-consistent.
2. Every cited constraint reference (`C1`..`C10`) resolves to a real rule.
3. A re-reader (the developer 4 weeks from now) can locate the answer to "what should I build next?" within 60 seconds of opening the docs folder.

### 2.3 Gate to Phase 1

No external review needed. The owner self-reviews against the exit criteria and starts Phase 1.

---

## 3. Phase 1 — Build L1–L2 First Activity (~6 weeks)

**Goal:** the first end-to-end vertical slice. One student can sit down, complete a session of `equal_or_not` and `identify_half`, and have data persist to IndexedDB.

### 3.1 Deliverables

#### Code

- [ ] Phaser 4 + TypeScript + Vite scaffolding hooked up against existing `src/`.
- [ ] Dexie.js initialization with all 17 stores from `data-schema.md §6`.
- [ ] Curriculum seed loader: reads bundled JSON of L1 question bank into `questionTemplates` and `activities` stores on first launch.
- [ ] One Phaser scene per L1 activity: `equal_or_not`, `identify_half`, `partition_halves`.
- [ ] Validator functions: `validator.equal_or_not.areaTolerance`, `validator.identify.exactIndex`, `validator.partition.equalAreas`.
- [ ] BKT skill mastery engine (basic — pInit/pTransit/pSlip/pGuess from `level-01.md`).
- [ ] Hint cascade UI (3-tier escalation; pointCost applied).
- [ ] Session orchestration: starts, runs 5–10 problems, ends, computes session aggregates.
- [ ] Persistence: every Attempt write hits Dexie. App relaunch resumes session state.
- [ ] "Backup My Progress" button (per `in-app-telemetry.md §5`).

#### Curriculum content

- [ ] L1 question bank fully authored: 12 templates × 3 activities = 36 templates + ~108 hints.
- [ ] L2 question bank fully authored: ~36 templates for `identify_half` continued + new `match_half` activity.

#### Visual

- [ ] Per C6, simple bright design language: white background, primary fills, sans-serif text. No neon.
- [ ] Pre-Level-1 onboarding scene (≤ 60 seconds, skippable).

### 3.2 Phase 1 Gates

| Gate                    | Test                                                                                                                                                                        |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Tech stack works**    | `npm run dev` opens the app, plays a session, persists data, exports JSON. Confirmed on iPad Safari and desktop Chrome.                                                     |
| **One end-to-end loop** | Start → complete 5 problems → see session summary → relaunch app → resume from same place.                                                                                  |
| **Data integrity**      | Exported JSON passes the sanity check from `in-app-telemetry.md §7`.                                                                                                        |
| **C9 budget**           | Internal walkthrough of L1: 10–13 minutes for a competent adult to complete a session. (Children take longer; that's OK; the budget is on UI density, not children's pace.) |

### 3.3 Phase 1 Exit Criteria

- All Phase 1 deliverables are checked.
- All Phase 1 gates pass.
- The owner can hand the device to a 5-year-old in their family circle and the child can complete one session unassisted past the onboarding.

### 3.4 Risks

- **Risk: BKT tuning is wrong.** Mastery gates are too easy or too hard. Mitigation: start with priors from `level-01.md`, retune after Phase 2 Cycle A data.
- **Risk: Phaser 4 unfamiliarity.** New API for the owner. Mitigation: budget extra week; first activity is the learning curve, the next two are fast.
- **Risk: Drag-and-drop on touch is fiddly.** Mitigation: use Phaser's built-in drag plugin; do not write custom touch handling.

---

## 4. Phase 2 — Build L3–L5 + Internal Playtest Cycle A (~4 weeks)

**Goal:** levels covering thirds and fourths, plus the first informal pilot to catch obvious mechanic problems before broad playtest.

### 4.1 Deliverables

#### Code

- [ ] Activity scenes for `identify_third`, `identify_fourth`, `partition_thirds`, `partition_fourths`, `match_quarter`, `make_thirds`.
- [ ] Difficulty tier system (Easy/Medium/Hard) with adaptive selection (more wrong answers → present easier templates).
- [ ] Misconception detection runners for `MC-EOL-01..03`, `MC-WHB-01`, `MC-VOC-01` (subset of `misconceptions.md`).
- [ ] Backup / restore round-trip: import a JSON file back into IndexedDB.

#### Curriculum content

- [ ] L3, L4, L5 question banks: ~36 templates each (~108 templates total).
- [ ] Hint authoring for all new templates.

#### Validation prep

- [ ] Pre/post test paper instrument printed (8-item form per `playtest-protocol.md §3`).
- [ ] Observer notes form printed.
- [ ] Consent form drafted.
- [ ] Recruit 3–4 informal testers (family / friends).

### 4.2 Cycle A — Internal Playtest

Per `playtest-protocol.md §9`, this is the truncated cycle:

- 3–4 students, 1 session each (not 3), L1–L5 only (not L1–L9).
- Goal: catch mechanic-breaking problems. Not a hypothesis test.

**Cycle A pass criteria** (informal):

1. Every tester completes at least 5 problems without intervention.
2. No tester abandons due to UI confusion (not understanding what to tap, dragging the wrong object).
3. Backup JSON is generated and passes sanity check for every tester.
4. Observer notes surface ≤ 3 distinct UI/UX issues to fix before Cycle B.

### 4.3 Phase 2 Exit Criteria

- L1–L5 fully playable.
- Cycle A pass criteria met.
- Identified UI/UX issues are either fixed in Phase 3 or explicitly logged with a fix-by date.

### 4.4 Risks

- **Risk: Cycle A reveals a fundamental mechanic problem.** Mitigation: this is the point of Cycle A. Reschedule Phase 3 to fix the mechanic. Do not proceed to Cycle B with broken mechanics.
- **Risk: Authoring fatigue.** 108 templates is a lot of unique work. Mitigation: parameterize. Per `scope-and-sequence.md §4`, target 250 templates total via parameters, not 2,200 unique items.

---

## 5. Phase 3 — Build L6–L9 + Classroom Playtest Cycle B (~6 weeks)

**Goal:** the full level set and the formal playtest.

### 5.1 Deliverables

#### Code

- [ ] Activity scenes for L6–L9: `compare_same_denominator`, `compare_same_numerator`, `benchmark_sort`, `ordering_tournament`, number-line `placement` activity.
- [ ] Symbolic notation introduction at L6 (per `scope-and-sequence.md §7.2` — symbols arrive at Grade 2).
- [ ] Misconception detection runners for `MC-WHB-01`, `MC-WHB-02`, `MC-MAG-01`, `MC-PRX-01` (the magnitude-family detectors most central to validation).
- [ ] End-of-MVP polish: error states, loading screens, app-update prompts.
- [ ] PWA manifest + `navigator.storage.persist()` call (per C5).

#### Curriculum content

- [ ] L6, L7, L8, L9 question banks: ~36 templates each (~144 total).
- [ ] Final hint authoring.

#### Validation prep

- [ ] Recruit 8–10 students (broader network than Cycle A).
- [ ] Schedule 3 sessions per student over 2 weeks.
- [ ] Print and prep 8–10 consent forms, pre/post test packets.
- [ ] Tag the repo `validation-v1-prereg` per `learning-hypotheses.md §5` before any Cycle B telemetry collection. This is a falsification commitment. (audit §4.6)

### 5.2 Cycle B — Broader Playtest

Per `playtest-protocol.md`. Full protocol: 8–10 students × 3 sessions × 2 weeks. Pre/post paper test. Observer notes.

### 5.3 Phase 3 Exit Criteria

- L1–L9 fully playable.
- Cycle B fully executed: all sessions complete, all backups collected, all paper tests scored.
- Raw data parked in `validation-data/cycle-b/` ready for analysis.

### 5.4 Risks

- **Risk: Cycle B recruitment slips.** Schools are not in session, families travel, etc. Mitigation: start recruitment early in Phase 3, not at the end. Allow 2 extra weeks of buffer.
- **Risk: Mid-cycle bug forces app restart.** Mitigation: freeze the app binary at the start of Cycle B. Do not deploy any changes during the cycle. Bugs are logged for Phase 4 fix.

---

## 6. Phase 4 — Validation Analysis + First Public Release (~4 weeks)

**Goal:** answer the C10 question with evidence, then make a ship/no-ship decision.

### 6.1 Deliverables

#### Analysis

- [ ] `validation-data/cycle-b/analysis.ipynb` notebook computes every metric called for in `learning-hypotheses.md`.
- [ ] Per-hypothesis pass/fail report.
- [ ] `validation-data/cycle-b/REPORT.md` per `playtest-protocol.md §8`.

#### Decision point

- [ ] Validated → proceed to release.
- [ ] Invalidated → stop, write a post-mortem, plan a mechanic revision.
- [ ] Inconclusive → expand cohort, run Cycle C.

#### Release (only if validated)

- [ ] Production build of the app (Vite production mode).
- [ ] Deploy to a static host (Netlify / Cloudflare Pages — both fit C1: static asset CDN only).
- [ ] Simple landing page with the app embedded.
- [ ] No analytics, no marketing surface, no signup.
- [ ] Announcement: a single blog post or social post linking the URL. Free, no paid promotion.

### 6.2 Phase 4 Exit Criteria

- Validation report exists and is signed off by the owner.
- One of three states is documented: validated / invalidated / inconclusive.
- If validated, the app URL is live and the owner can hand it to a stranger.

### 6.3 What Phase 4 Does Not Include

- No App Store / Google Play listings (PWA only for MVP).
- No paid marketing.
- No teacher / parent / admin surface (C2).
- No backend (C1).
- No content beyond L9.
- No support inbox (per C2; the validation cycle is over and the owner is moving to post-MVP planning).

---

## 7. Per-Phase Effort Sketch

| Phase     | Code (h) | Content (h) | Validation (h) | Doc (h) | Total   |
| --------- | -------- | ----------- | -------------- | ------- | ------- |
| 0         | 0        | 0           | 0              | 80      | 80      |
| 1         | 60       | 25          | 0              | 5       | 90      |
| 2         | 30       | 25          | 5              | 0       | 60      |
| 3         | 50       | 30          | 10             | 0       | 90      |
| 4         | 20       | 0           | 30             | 10      | 60      |
| **Total** | **160**  | **80**      | **45**         | **95**  | **380** |

These are rough estimates by an experienced solo developer. Pad by 25% if uncertain about Phaser 4 fluency or if the recruit pipeline is unproven.

---

## 8. What This Roadmap Explicitly Excludes

These items belonged to the inherited 52-week enterprise plan and are **not** in MVP:

- Teacher dashboards, parent reports, class codes (per C2).
- LTI / SSO integrations.
- A backend (per C1).
- A formal IRB-regulated research study.
- App Store listings, paid marketing, growth.
- Operations (decimals, mixed numbers, GCD) per C3.
- Multi-language support beyond `en` (per `scope-and-sequence.md §7.4`).
- Pre-recorded TTS audio assets (browser SpeechSynthesis is enough for MVP; pre-recorded is a post-validation upgrade).

All of these live in `post-mvp-2029.md`.

---

## 9. Decision Tree at the End of Phase 4

```
                       Phase 4 done. What does the data say?
                                       │
              ┌────────────────────────┼────────────────────────┐
              ▼                        ▼                        ▼
        Validated                 Inconclusive             Invalidated
              │                        │                        │
              ▼                        ▼                        ▼
   Release publicly.           Recruit Cycle C.        STOP. Post-mortem.
   Begin post-mvp planning.    Re-run protocol.        Identify failing
                                                       mechanic. Prototype
                                                       a mechanic change.
                                                       Re-do Cycle B.
```

---

## 10. Reviewing This Roadmap

This document is a living artifact. After each phase exit, the owner re-reads this file and:

1. Updates `last_reviewed`.
2. Logs actual hours vs. estimate in the Phase Effort Sketch.
3. Notes which risks materialized and which didn't.
4. Adjusts later phases if needed (e.g., Phase 1 took 8 weeks instead of 6 → push downstream phases by 2 weeks; do not compress them).

The C10 commitment stands: ship date moves before scope shrinks beyond the validation requirement.

Last reviewed: 2026-04-24.
