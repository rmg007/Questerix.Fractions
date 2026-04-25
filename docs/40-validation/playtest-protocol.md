---
title: Playtest Protocol
status: draft
owner: solo
last_reviewed: 2026-04-25
applies_to: [mvp]
constraint_refs: [C1, C2, C9, C10]
related: [learning-hypotheses.md, in-app-telemetry.md, ../50-roadmap/mvp-l1-l9.md]
---

# Playtest Protocol

How to run a Questerix Fractions playtest with K–2 students.

This is a lightweight, **informal pilot**, not an IRB-regulated study. The goal (per **C10**) is enough evidence to know whether the mechanic teaches — not a peer-reviewed publication. If the pilot results are encouraging, a future formal study can replicate with a larger cohort.

---

## 1. Cohort

| Parameter | Value |
|-----------|-------|
| Number of students | 8–10 |
| Grade band | K, 1, 2 (mixed; recruit roughly 3 per grade) |
| Sessions per student | 3 |
| Session duration | 15 minutes (per C9) |
| Span | 2 weeks (sessions on Day 1, Day 4–5, Day 10–14) |
| Setting | Home, library, or classroom corner — informal |
| Devices | iPad or Chromebook supplied by tester. Both portrait and landscape acceptable. |

**Recruitment.** Personal network: family, neighborhood kids, friends-of-friends. Aim for variety in entering skill: include students who already know "halves" and students who don't.

**Compensation.** A small thank-you gift at the end (sticker pack, $5 bookstore card). Not contingent on participation duration.

---

## 2. Consent

Lightweight; no formal IRB.

### 2.1 What We Tell Parents

Send a short message before scheduling Session 1:

> Hi, I'm developing a small math game that helps young children learn about fractions (halves, thirds, fourths). I'd love your child to try it for three short play sessions over about two weeks, about 15 minutes each. I'd also like to give your child two short paper-and-pencil activities (one before, one after) to see if the game helped.
>
> No accounts, no logins, no data leaves the device. I just take handwritten notes about what trips kids up. The game runs entirely in the browser. I'm not a researcher — this is a pilot for a small project. If you're comfortable, please let me know and I'll send a one-page consent form.

### 2.2 One-Page Consent Form

A printable PDF. Includes:

- Project name and contact (the developer's email).
- What the child will do (3 game sessions, 2 paper activities).
- What data is collected: in-app activity logs (no PII beyond display name; see `in-app-telemetry.md`), handwritten observer notes, the paper worksheets.
- What is **NOT** collected: audio, video, screen recordings, mouse/keystroke timing, school information.
- How data is used: to evaluate whether the mechanic teaches. Aggregated, anonymized. Not published in academic venues without separate consent.
- Right to withdraw at any time without explanation.
- Parent and child sign (child can mark an X — this is participation assent for K–2).

### 2.3 What Counts as Withdrawal

A child who refuses or loses interest mid-session is **not coerced to continue**. Note "withdrew at session N" in observer notes and stop. Their data up to that point is retained for analysis if the parent agrees, deleted otherwise.

---

## 3. Pre-Test (Paper, ~10 minutes)

Administered before Session 1 of app use. The student does this with the observer present but not coaching.

### 3.1 Instrument: 8 Items

| # | Item | Purpose |
|---|------|---------|
| 1 | "Circle the shape that shows ONE HALF." (3 multiple-choice shapes; only one is correctly halved) | Tests `SK-02` (canonical per `../10-curriculum/skills.md`). Linked to H-01. |
| 2 | "Circle the shape that shows ONE FOURTH." (3 multiple-choice shapes) | Tests `SK-08`. Linked to H-01. |
| 3 | "Look at this rectangle. Draw a line that splits it into TWO equal parts." | Tests `SK-11`. Linked to H-02. |
| 4 | "Look at this circle. Draw lines that split it into FOUR equal parts." | Tests `SK-16`. Linked to H-02. |
| 5 | "Which is bigger? 1/2 or 1/4? Circle the bigger one." (visual + symbol) | Tests `SK-23` / MC-WHB-02. Linked to H-03. |
| 6 | "Which is bigger? 2/4 or 3/4? Circle the bigger one." | Tests `SK-22`. Linked to H-03. |
| 7 | **Grade-1+ only** — "Look at this fraction strip. Mark where 1/2 belongs on the line from 0 to 1." Tests `SK-27`. Linked to H-03. **K students skip Item 7.** K substitute: "Circle the picture that shows ½ shaded." (a sixth identification item; tests `SK-02`.) | Tests `SK-27` (G1+) or `SK-02` (K substitute). Linked to H-03. |
| 8 | "Are the two pieces in this picture equal? Yes / No." (deliberately unequal partition) | Tests `SK-01`, MC-EOL-01. Linked to H-05. |

### 3.2 Scoring

- Items 1, 2, 5, 6: binary (correct / incorrect).
- Item 3, 4: scored against a calibrated overlay. ±10% area tolerance = correct.
- Item 7: scored on placement distance from the true 0.5 mark; correct if within ±10% of strip length.
- Item 8: binary.

The observer scores immediately after the session and records on a tracking sheet.

---

## 4. Session Protocol

### 4.1 Setup (~3 minutes)

- Device pre-loaded with the app on the correct level for the session.
  - Session 1: starts at L1.
  - Session 2: starts wherever the student left off, OR at L1 if disengaged in Session 1.
  - Session 3: same continuation rule.
- Display name set to a child-chosen pseudonym (no real names entered into the app).
- "Backup my progress" button used between sessions to export Dexie JSON to a file the observer keeps. (See `in-app-telemetry.md`.)

### 4.2 Observer Script

Read aloud:

> "We made a math game. I want to see how it works for you. There's no test, no grade. Play it like a game. If something is confusing, tell me. If you want to stop, just say so. I'll be quiet most of the time and just take notes. Ready?"

Then **stop talking** and observe.

### 4.3 What to Record

Use a paper observer notes form (template in `40-validation/observer-form.md`, TBD). For each session:

- Time started, time ended, level the student was on at start, level at end.
- Notable moments with a timestamp from the device's clock:
  - Long pauses (> 15 seconds before tapping).
  - Verbal statements ("this is too small," "I don't get it," "I got it!").
  - Frustration signals (sighs, rocking, looking away).
  - Help-seeking ("what do I do?").
- Any time the observer broke silence and what was said.
- Any technical glitches or UI confusions (e.g., student couldn't find the hint button).

### 4.4 What NOT to Do

The observer **must not**:

- Coach the student through a problem ("try the one on the left").
- Read prompts aloud unless the student asks (audio replay button does this).
- Comment on right/wrong answers.
- React with body language or sighs to a wrong answer.
- Encourage the student to use a hint.
- Encourage the student to keep playing past the natural session end.

The observer **may**:

- Acknowledge the child neutrally ("mm-hmm," "okay").
- Help with a clear technical issue (the app froze; the device dropped Wi-Fi).
- Ask "do you want to keep playing or stop?" once the student has completed at least 5 problems.
- End the session at the 15-minute mark even if the child wants to continue (per C9 design budget).

### 4.5 End of Session

- Click the in-app **Backup My Progress** button. Save the JSON file to the observer's folder named `<pseudonym>_session<N>_<date>.json`.
- The observer files the notes form in the same folder.
- Brief debrief with the child (≤ 60 seconds): "What was your favorite part?" "What was tricky?" — recorded as direct quotes if possible.

---

## 5. Post-Test (Paper, ~10 minutes)

After Session 3. Use a parallel form of the pre-test (same item structure, different shapes / distractor configurations / fraction values).

Score the same way. Match each post-test response to the corresponding pre-test response per student.

**Important:** the post-test is given **at least 1 day after Session 3**, not immediately after. This is to capture *retained* learning, not warm-cache performance.

---

## 6. Data Collection

For each student, the observer ends with:

| Artifact | Storage |
|----------|---------|
| Signed consent form | Locked folder, paper |
| Pre-test paper worksheet | Same folder, scanned to PDF |
| 3 session JSON exports | Project folder `validation-data/<pseudonym>/` |
| 3 observer notes forms | Same project folder, scanned |
| Post-test paper worksheet | Same project folder, scanned |
| Debrief quotes | Same observer notes form |

All filenames use the pseudonym only. The single mapping `pseudonym → real name` lives **only on paper**, in a sealed envelope, separately from the data folder.

---

## 7. Analysis

Per the hypotheses in `learning-hypotheses.md`:

### 7.1 Quantitative

For each P0 hypothesis (H-01..H-05):

1. Compute the relevant pre-test and post-test means.
2. Compute paired pre/post deltas per student.
3. Pull the corresponding telemetry signal from the JSON exports.
4. Compare against the success threshold and falsification criterion stated in `learning-hypotheses.md`.

**Tooling.** A small Jupyter notebook (`validation-data/analysis.ipynb`) loads JSON exports + a CSV of paper-test scores and produces:

- Per-student delta tables.
- Per-hypothesis pass/fail table.
- Per-skill in-app accuracy curves (over sessions).
- Time-to-mastery distributions.
- Common-stuck-points table from observer notes.

### 7.2 Qualitative

From observer notes, extract:

- **Common stuck points** — moments where ≥ 3 of the 8–10 students showed the same confusion.
- **UI failures** — places where the mechanic's affordance was unclear.
- **Surprises** — student behavior the developer did not predict.

These feed into the next iteration's design changes.

### 7.3 Time-to-Mastery

For each `(student, skill)` pair that reached `MASTERED`:

- Total in-app minutes before MASTERED state.
- Number of attempts before MASTERED.
- Median across the cohort.

This becomes input to C9 calibration: are levels actually 10–15 minutes, or are we systematically underestimating?

---

## 8. Reporting

A short write-up per playtest cycle, stored at `validation-data/<cycle>/REPORT.md`. Sections:

1. Cohort summary (anonymized: ages, grades, prior fraction exposure).
2. Per-hypothesis result (supported / falsified / inconclusive) with numbers.
3. Top 5 stuck points (qualitative).
4. Top 3 UI/UX issues to fix before next cycle.
5. Recommendations: ship / iterate / re-scope.

The report is the artifact that closes Phase 4 of the roadmap (see `../50-roadmap/mvp-l1-l9.md`).

---

## 9. Two Playtest Cycles in MVP

Per the roadmap:

| Cycle | Phase | Purpose |
|-------|-------|---------|
| **Cycle A — internal** | Phase 2 (after L1–L5) | Sanity check: is the partitioning mechanic survivable? Cohort can be 3–4 students from the developer's immediate circle. Truncated to L1–L5 only. |
| **Cycle B — broader** | Phase 3 (after L1–L9) | Full playtest as described above (8–10 students × 3 sessions × 2 weeks). This is the cycle the report is written for. |

If Cycle A reveals a fundamental mechanic problem, fix before Cycle B and re-do Cycle A.

---

## 10. Post-Playtest Decisions

The result of Cycle B drives one of three decisions:

1. **Validated** (4–5 of 5 P0 hypotheses supported, 0 falsified). → Move to Phase 4 release prep. Continue authoring post-MVP-2029 content with confidence in the mechanic.
2. **Invalidated** (any P0 falsified). → Stop. Identify the failing hypothesis, hypothesize a mechanic change, prototype the change, re-do Cycle B with the new mechanic. Do not proceed to Phase 4.
3. **Inconclusive** (3 supported, 0 falsified, 2 underpowered). → Expand cohort to 16–20 students for a Cycle C. Same protocol.

---

## 11. What This Protocol Is Not

- Not a randomized controlled trial. There is no control group. We cannot claim the app caused improvement — only that improvement was observed.
- Not generalizable to populations beyond the recruited cohort.
- Not a substitute for a future formal study with larger n, randomization, and IRB.
- Not for marketing claims. "8 of 10 kids improved on a paper test" is a personal observation, not a marketing statement.

These limitations are acceptable because the goal (per C10) is **a go/no-go decision for the developer**, not a publication or a sales pitch.

Last reviewed: 2026-04-25. (audit §1.1 fix: SK-NN references updated to canonical IDs; Item 7 restricted to Grade-1+ with K substitute added)
