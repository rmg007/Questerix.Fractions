---
title: Vision
status: active
owner: solo
last_reviewed: 2026-04-24
applies_to: [mvp]
related: [constraints.md, glossary.md, ../50-roadmap/mvp-l1-l9.md]
---

# Vision

## In One Paragraph

**Questerix Fractions** is a small, free, browser-based math game for children ages 5–8 that teaches the foundational schema of fractions — *equal parts of a whole, and how those parts compare* — through tactile drag-and-drop and tap interactions. The MVP covers Levels 1 through 9, mapping to Grade K through Grade 2 fraction concepts (partition, identify, make, compare, order, benchmark). It runs entirely in the browser with no servers, no logins, and no subscription. Its only goal is to answer one question with evidence: **does the magnetic-drag mechanic actually teach fractions, well enough to improve a child's performance on a paper test?** Everything else — teacher tools, parent dashboards, marketplaces, monetization — waits for that answer.

## Why This Project Exists

Fraction instruction is one of the most documented failure points in elementary mathematics education. Research consistently shows that students who do not develop a strong magnitude-based schema for fractions in K–2 carry that gap into algebra, where it becomes a primary cause of math disengagement.

Most digital fraction tools are either (a) drill-and-kill flashcards that teach symbol manipulation without conceptual grounding, or (b) elaborate game franchises that wrap the same drills in expensive packaging. Neither has been shown to outperform a thoughtful teacher with paper, scissors, and patience.

The thesis of Questerix is narrow: a *single* well-designed manipulation mechanic — drag a piece, feel the magnetic pull, see the parts equalize — can build the same intuitive grounding that physical Montessori materials build, without requiring a teacher to set up tactile materials each session. If this thesis is correct, it can be delivered for the cost of a domain name. If it is incorrect, we want to know in 6 months, not 5 years.

## What Success Looks Like

Concretely, the MVP succeeds when **all** of these are true at the close of validation:

1. **Learning gain.** At least 6 of 10 students in the playtest cohort improve their score on the paper post-test relative to the pre-test, measured on the same instrument with parallel forms.
2. **Engagement.** At least 7 of 10 students complete all 3 scheduled sessions without abandonment, by their own choice (not because an adult required them to).
3. **Mechanic clarity.** Without verbal instructions, at least 8 of 10 students can complete Level 1 (equal parts: halves) on their first attempt within 15 minutes.
4. **Retention.** Students who complete Level 5 retain at least 70% of demonstrated skill on a 7-day delayed retest.

## What This Is Not Trying To Be

This is **not**:

- A classroom management platform. There is no teacher login until 2029.
- A curriculum replacement. A teacher using this app is a teacher who still teaches fractions; this app is one practice surface among many.
- A revenue product. There is no monetization plan for the MVP.
- A multi-grade comprehensive solution. Levels 1–9 stop at Grade 2. Grade 3+ operations (addition, decomposition, decimals, GCD) are post-MVP and may never be built if validation fails.
- An achievement-and-streak system. Light gamification is permitted (XP, level-unlock); seasonal events, leaderboards, and competitive multiplayer are not.

## What's Different About How We're Building It

- **Documentation precedes code.** We are writing this foundation suite before we touch a new line of `src/`. The existing prototype demonstrates the mechanic is technically possible; the open question is pedagogical, and pedagogy is solved by thinking, not coding.
- **Constraints are written down and citable.** See [`constraints.md`](./constraints.md). Future feature pressure is checked against C1–C10 before any planning continues.
- **Validation is the deliverable.** A polished feature set with no validation data is a failed MVP. A working core with validation data is a successful MVP.
- **Sample size is small and deliberate.** Ten students. Three sessions each. Paper pre/post. A larger cohort proves nothing more meaningful than a small one at this stage and burdens the timeline.

## Time Horizon

| Phase | Duration | Outcome |
|-------|---------|---------|
| Foundation docs (current) | 1–2 weeks | This `/docs` tree complete |
| Author Levels 1–2 + build | 6 weeks | Two playable levels |
| Author Levels 3–5 + internal playtest | 4 weeks | Five playable levels, 5 internal testers |
| Author Levels 6–9 + classroom playtest | 6 weeks | Nine playable levels, 8–10 student playtest |
| Validation analysis + public release | 4 weeks | Pre/post analysis + free public web release |

Total: ~5–6 months solo to MVP-validated.

If validation passes, the parking lot in [`../50-roadmap/post-mvp-2029.md`](../50-roadmap/post-mvp-2029.md) becomes the work. If validation fails, the lessons are documented and the parking lot is closed.

## The Long Game

The only post-MVP commitment we make in advance: **2029 is the earliest year a backend, teacher surface, parent surface, or monetization layer may be built**. That horizon is set deliberately to protect the validation focus and to give the MVP product time to either prove or disprove its core thesis under real classroom-adjacent use.

Everything else is uncommitted, not because it doesn't matter, but because committing to it now would dilute the answer to the only question that does.
