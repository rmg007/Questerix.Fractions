# Plan: K–2 Pilot Protocol (Real-User Validation)

**Date:** 2026-05-04
**Branch (when started):** `docs/2026-05-04-pilot-protocol`
**Status:** COMPLETED 2026-05-06 — docs/40-validation/ populated; pilot-protocol.md, consent-script.md, observation-rubric.md, audit/pilot-template.md committed
**Part of:** [2026-05-04-roadmap.md](2026-05-04-roadmap.md) — Phase 4. The capstone validation loop the project exists to serve.

## Problem

This is a **validation project** (C10): every change must serve validation, not polish. Yet there is no documented protocol for the validation itself. The other ten plans optimize internal quality; none describe how Ryan converts that quality into a verdict on whether the app teaches K–2 children fractions.

Without this plan:

- Validation runs become ad-hoc, results inconsistent, comparisons across runs unreliable.
- The K–2 tester feedback already in `PLANS/_archive/` is one-off — no durable cadence to repeat the loop.
- The app may ship "feeling polished" while never having been measured against the only metric that matters.

## Goals

1. A repeatable pilot protocol Ryan (or a partner adult) can execute in ~45 minutes per child.
2. A pre/post measurement of fraction comprehension that produces comparable numbers across pilots.
3. An observation rubric capturing both quantitative (time-on-task, completion, errors) and qualitative (frustration, engagement, comprehension moments) signals.
4. A consent + privacy script appropriate for a household / informal-classroom setting (no IRB; this is solo validation).
5. Post-pilot data feeds back to plan 5 (misconception detectors), plan 7 (content), plan 6 (mastery display), plan 9 (warm-ups). The loop closes.

## Non-goals

- IRB / formal research approval. Out of scope for solo MVP validation.
- Statistical significance — sample sizes will be tiny (2–8 children per round). Treat as qualitative + design-direction signal.
- Compensation / payment infrastructure beyond a small thank-you (sticker / book).
- Continuous user research as a service. This is a periodic, pre-release activity.

## Definition of done

- `docs/40-validation/pilot-protocol.md` exists with the full procedure.
- `docs/40-validation/pre-post-instrument.md` defines the measurement.
- `docs/40-validation/consent-script.md` provides a parent-facing consent and a child-facing assent script.
- `docs/40-validation/observation-rubric.md` defines what the observer captures during the session.
- `audit/pilot-<date>-<participant-id>.md` template lives committed.
- One pilot session executed end-to-end against the protocol; results committed; learnings fed back to relevant plans.

---

## Phases

### Phase 1 — Pre/post instrument design (gate: instrument committed)

A short, paper-and-pencil (or one-page printable) instrument administered before the session and again immediately after.

Composition (~6 minutes for a K–2 child):

1. **Identify halves** — 4 images, child circles the ones showing halves. (Tests MC-WHB-01 and identification baseline.)
2. **Equal partitions** — 3 images of cut shapes; child marks "fair" or "not fair" sharing. (Tests partition equality.)
3. **Compare two fractions** — 2 paired images at the same denominator; "which is bigger?" (Tests magnitude reasoning.)
4. **Place a fraction on a number line** — 1 simple line 0..1; child marks where ½ goes. (Tests placement transfer.)
5. **Open question** — "What does ½ mean? Tell me in your own words." (Qualitative; transcribed.)

Scoring is binary correct/incorrect plus a transcript field. Output to `docs/40-validation/pre-post-instrument.md`. Same instrument pre and post; randomise question order between administrations to limit memorisation effect.

### Phase 2 — Observation rubric (gate: rubric committed)

What the observer (Ryan or a delegate) writes during the session, in real time, on a single page:

- **Time on task** per level (start/end timestamps).
- **Completion** per level (yes / no / partial).
- **Wrong-attempt count** per question (auto-captured by the app + observer cross-check).
- **Hint usage** — which tier reached, did the worked-example fire?
- **Affect** — frustration / engagement scale 1–5 sampled at level boundaries.
- **Comprehension moments** — verbatim child quotes that suggest understanding ("oh, I get it!") or misconception ("but the bigger number is the bigger piece").
- **UI friction** — anything the observer notices that the app's instrumentation cannot ("she keeps trying to drag from the wrong side").

Rubric is one printable page. Filling it should not require the observer to look at the screen for more than a few seconds at a time.

### Phase 3 — Consent + assent scripts (gate: scripts committed)

Two short scripts:

- **Parent consent** (~1 minute, plain English): explains what we're doing, that data stays on the device per C1, that the parent can stop the session at any time, and that nothing is published with the child's name. No legal jargon.
- **Child assent** (~30 seconds, K–2 vocabulary): "We made a game about fractions. I want to see if it's fun and if it helps you learn. You can stop any time and that's okay. Want to try?"

The scripts go in `docs/40-validation/consent-script.md` and are read aloud, not signed (this is informal validation, not research).

### Phase 4 — Session protocol (gate: end-to-end script committed)

`docs/40-validation/pilot-protocol.md`:

```
0:00–0:05  Greet, read assent script, confirm child wants to play.
0:05–0:11  Administer pre-test (pencil + paper).
0:11–0:13  Hand the tablet over; let child explore MenuScene with no instruction.
            Observer: note what they tap first, what confuses them.
0:13–0:35  Free play — child plays however they like for 20 minutes.
            Observer: rubric, no coaching, neutral encouragement only.
0:35–0:36  Brief verbal debrief: "What was your favourite part? What was tricky?"
0:36–0:42  Administer post-test (same instrument, randomised order).
0:42–0:45  Thank the child; small thank-you item.
```

Total: 45 minutes. Script is a guide, not a constraint; the observer can shorten free-play if the child's done or extend if they're engaged.

### Phase 5 — Data export from the app (gate: export reachable, no PII leakage)

For pilot purposes, the app needs to surface its captured per-session data. Build on existing persistence:

- Hidden-but-reachable URL `?export=session` triggers a download of a JSON containing the active student's session summary (attempts, hint events, mastery transitions, recovery events).
- Anonymises by stripping `displayName` and replacing `studentId` with a session-scoped opaque token; the observer pencils the participant ID into `audit/pilot-<date>-<id>.md`.
- Stays within C1 (local-only; observer manually moves the file).
- Existing backup mechanism may already cover this — extend rather than duplicate.

### Phase 6 — Per-pilot template + analysis loop (gate: one pilot run + writeup committed)

`audit/pilot-<date>-<id>.md` template:

```
## Participant
- ID: PILOT-2026-05-12-001
- Age / grade: 6 / Kindergarten
- Device: iPad 9th gen
- Date: 2026-05-12
- Observer: Ryan

## Pre/post deltas
| Item | Pre | Post |
|---|---|---|
| Q1 halves | 2/4 | 4/4 |
| Q2 equal partitions | 1/3 | 3/3 |
| ...

## Levels played
- L1 — completed in 6:30, 0 hints
- L2 — partial, abandoned at question 4, frustration 3 → 4

## Observer notes
- ...verbatim quotes, friction moments...

## Verdicts → linked plans
- Friction at L2 question 4 → file as content issue → plan 7
- Drag responsiveness on iPad fine → no plan-9 follow-up needed
- Tier-1 hint copy unread → plan 5 follow-up
```

Run **one pilot** end-to-end against the protocol; commit the result; identify three highest-impact learnings; file them as updates to specific plans.

### Phase 7 — Cadence + roadmap integration (gate: cadence in roadmap)

- Pilot cadence: one round (3–5 children) before each milestone tag in the roadmap (Phases 1, 2, 3 completion).
- Each round writes one summary file: `audit/pilot-round-<N>-summary.md` rolling up findings + plan deltas.
- Roadmap (the master file) gains a "Validation milestones" section linking to the round summaries. The roadmap's exit criterion for any phase becomes "phase gates met AND pilot round N findings triaged."

### Phase 8 — Phase-close docs (gate: PR merged)

- `docs/40-validation/` directory exists with the four protocol documents.
- Append to `.claude/learnings.md`: "Validation is the project's purpose, not a phase — the pilot loop runs continuously, and every plan's PR description should answer 'does this respond to a pilot finding, or speculate?'"
- Update `CLAUDE.md` to point at `docs/40-validation/` from the doc-pointers table.
- Run `npm run sync:claude-md`.

---

## Risk / rollback

- **Risk:** Pilot results are too small a sample to act on. Mitigate by treating each finding as a hypothesis filed against a plan, not a directive; require at least two children showing the same friction before we change the design.
- **Risk:** Children behave differently with an observer present. Mitigate by minimising observer intervention to neutral "go ahead" / silence; no leading questions.
- **Risk:** Pre-test bores the child before they reach the app. Mitigate by keeping the instrument under 6 minutes and framing it as "let me see what you already know — it's not a test."
- **Rollback:** Documents are additive; no rollback risk.

## Out-of-scope follow-ups

- Formal research-grade study (IRB, n ≥ 30, control group). Defer beyond MVP.
- Teacher / classroom pilots. Different consent surface and time constraints; revisit.
- Compensation programs.
- Public reporting of pilot results — keep internal until a milestone warrants a write-up.
