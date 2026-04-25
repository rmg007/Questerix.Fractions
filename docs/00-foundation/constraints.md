---
title: Project Constraints
status: active
owner: solo
last_reviewed: 2026-04-24
applies_to: [mvp]
related: [vision.md, ../50-roadmap/mvp-l1-l9.md, ../50-roadmap/post-mvp-2029.md]
---

# Project Constraints

This document defines the **non-negotiables** for Questerix Fractions through the MVP. Every other document must respect these rules. If a proposal violates a constraint here, the proposal is rejected — not the constraint.

These are locked in until 2029-01-01 unless explicitly revised here.

---

## C1 — No Backend Until 2029

**Rule:** The app runs entirely client-side. No servers, no APIs, no authentication, no database hosting.

**Why:** Hosting costs are excluded from the MVP budget. The pedagogical question ("does the mechanic teach?") does not require a backend to answer. A backend before validation is wasted spend.

**How to apply:**
- Persistence is local only (IndexedDB via Dexie.js, see `30-architecture/persistence-spec.md`)
- No `fetch` to external services except for static asset CDN
- No login, no accounts, no user identity beyond a locally-generated UUID
- Telemetry is read by inspecting localStorage/IndexedDB during playtests, not by remote logging

---

## C2 — No Teacher / Parent / Admin Surface Until 2029

**Rule:** The MVP has one persona: the **student**. Period.

**Why:** Adding teacher dashboards, parent reports, or admin tools triples the surface area without contributing to the core validation question. Teachers and parents may *use* the app informally, but they get no dedicated UI.

**How to apply:**
- No "teacher login" — does not exist
- No "parent dashboard" — does not exist
- No class codes, school assignments, or roster management
- No printable reports beyond what a screenshot can produce
- Any RoadMap document mentioning teacher/parent/admin surface is **out of scope** and lives in `_quarantine/`

---

## C3 — MVP Scope: Levels 1–9 Only

**Rule:** The MVP covers Levels 1 through 9, mapping to Grade K through Grade 2 fraction concepts.

**Why:** Levels 1–5 (partition + identify) build the prerequisite schema. Levels 6–9 (compare + order) prove the schema actually teaches *magnitude* — the only outcome that matters pedagogically. Anything beyond Level 9 is a different mechanic and a different validation question.

**How to apply:**
- Grade 3+ content (operations, mixed numbers, decimals, GCD) is **out of scope**. Quarantined RoadMap folders 04 and 05 stay quarantined.
- Each MVP level has a dedicated spec in `10-curriculum/levels/level-NN.md`
- Activity types within MVP scope: partition, identify, label, fold/make, compare, benchmark, order
- Activity types **out of scope**: addition, subtraction, decomposition, mixed-number conversion, simplification, GCD, decimal conversion

---

## C4 — Tech Stack: Phaser 4 + TypeScript + Vite + Dexie.js

**Rule:** No tech stack changes. Build on what already exists.

**Why:** The current `src/` is a working Phaser prototype. Switching to React, Unity, or any other engine throws away working code and resets the timeline. Phaser handles drag/snap, animations, and procedural shape rendering exactly as needed.

**How to apply:**
- Phaser 4 for all game scenes
- TypeScript strict mode
- Vite for dev server and production build
- Tailwind CSS v4 for any non-game UI (menus, settings, modals)
- Dexie.js for IndexedDB persistence
- No Redux, no Zustand, no React, no Next.js, no backend frameworks

---

## C5 — No localStorage for Anything Important

**Rule:** localStorage stores at most a single "lastUsedStudentId" pointer. Everything else (progression, sessions, attempts, settings) lives in IndexedDB via Dexie.js.

**Why:** localStorage is 5–10 MB, string-only, evicted aggressively by iOS Safari ITP after 7 days of non-use, and offers no querying. It cannot hold the data schema we need.

**How to apply:**
- See `30-architecture/persistence-spec.md`
- App ships as installable PWA
- App calls `navigator.storage.persist()` on first session
- App provides "Backup my progress" button that exports IndexedDB to a JSON file the user can save

> **Exception 1 — `lastUsedStudentId`:** a non-sensitive UI hint that survives Dexie initialization races. This single key is permitted in localStorage. No PII or progress data is allowed. (audit §5)

---

## C6 — Visual Style: Simple + Bright (Not Neon Sci-Fi)

**Rule:** Flat design, primary colors, clear sans-serif typography. The neon Cosmic Blue + Cyan/Pink aesthetic from the original README is **deprecated**.

**Why:** Validation needs the mechanic to be testable, not stylish. Bright simple shapes and colors are easier for K–2 students to parse, easier to A/B test, and faster to iterate. Neon glow does not teach fractions — equal partitioning does.

**How to apply:**
- Backgrounds: white or very pale solid color
- Shapes: solid primary fills with simple outlines
- Typography: one clear sans-serif (e.g. system-ui or Inter), max two weights
- Animation: only when it reinforces a concept (snap feedback, partition demonstration). No ambient glow, no particle storms.
- See `20-mechanic/design-language.md`

---

## C7 — Target Devices: All Mobile + Desktop, Responsive

**Rule:** Works on iOS Safari, Android Chrome, desktop Chrome/Firefox/Edge/Safari. Responsive from 360px to 1024px width.

**Why:** Schools and homes use a mix of devices. Locking to iPhone Pro Max (the original design spec) excludes most of the realistic test population.

**How to apply:**
- Phaser scale mode: `Phaser.Scale.FIT` with reference resolution 800×1280 (portrait-tall)
- Touch targets minimum 44×44 CSS pixels (WCAG 2.5.5)
- Test matrix: iPhone SE (375), iPad (768), desktop (1024+), Android phone (360–414)
- No device-specific code paths

---

## C8 — Linear Denominator Progression

**Rule:** Levels introduce one new denominator family at a time. Halves first, then thirds, then fourths, etc. No mixed-denominator activities until Level 6 (where comparison requires it).

**Why:** Mixing denominators in early levels confuses the partitioning concept. Children consolidate "halves" before they can reason about "halves vs. thirds."

**How to apply:**
- Level 1–2: halves only (equal parts → identify halves)
- Level 3: thirds and fourths added (identify only — no production yet)
- Level 4: make halves (production becomes the primary verb)
- Level 5: make thirds and fourths (mixed-denominator production)
- Level 6+: comparison/ordering across denominator families (mixing denominators is *required* for the mechanic, so the linear rule no longer applies past L5)
- Sixths and eighths appear in Level 8+ comparison contexts only

The progression has two axes: **denominator family** (halves → thirds → fourths) and **verb** (identify → make → compare). L1–L2 lock the easiest denominator while introducing the easier verb; L3 adds harder denominators while staying on the easy verb; L4–L5 advance the verb while staying on familiar denominators; L6+ relaxes denominator linearity because comparison cannot exist without mixing.

---

## C9 — Sessions Are Short (10–15 minutes)

**Rule:** Each level is designed so a student can complete a meaningful session in 10–15 minutes. One-to-two core question types per level. No marathon sessions.

**Why:** K–2 attention spans cap around 15 minutes for focused math practice. Validation playtests assume 15-minute sessions × 3 days. If a level requires 30+ minutes to complete, the level is too big.

**How to apply:**
- Each level spec lists problem count and estimated duration
- A "completed" session means at least 5 problems attempted, not the full level mastered
- Re-entry is friction-free: opening the app drops the student exactly where they left off

---

## C10 — Validation Is the MVP Goal, Not Shipping

**Rule:** The MVP succeeds when we can answer one question with evidence:
> Does the magnetic-drag mechanic teach K–2 students fraction concepts well enough to improve their performance on a standard paper test?

**Why:** Without an answer to this, no feature decision after MVP makes sense. Cosmetic polish, marketplace presence, and growth are all post-validation concerns.

**How to apply:**
- Every feature proposal answers: "Does this contribute to validation, or distract from it?"
- Validation protocol lives in `40-validation/playtest-protocol.md`
- "Done" for the MVP = playtest data has been collected and analyzed, not "feature is shipped"

---

## Out-of-Scope Parking Lot

Anything legitimately deferred but worth remembering goes in `50-roadmap/post-mvp-2029.md`. It does **not** go in MVP-tagged docs.

Parked items currently include: teacher dashboard, parent reports, multiplayer, AI tutoring, video tutorials, voice input, multi-language support, offline PWA optimization beyond Dexie persist(), LTI/SSO integration, decimal conversion, GCD activities, fraction operations.

---

## Constraint Change Log

| Date | Constraint | Change | Reason |
|------|-----------|--------|--------|
| 2026-04-24 | C1–C10 | Initial set | Foundation document established |
| 2026-04-24 | C8 | Reworded to two-axis progression (denominator × verb) | Aligned with the level specs (L1–L9) which use a verb-axis progression. Original wording implied denominator-only progression and conflicted with `level-03.md` introducing fourths and `level-04.md` adding production. |
