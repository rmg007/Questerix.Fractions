---
title: Glossary
status: active
owner: solo
last_reviewed: 2026-04-24
applies_to: [mvp]
related: [constraints.md, vision.md]
---

# Glossary

Canonical definitions of every term used across Questerix documentation. If you are tempted to introduce a synonym, look here first and use the existing term.

If a term is missing here, it is undefined and should be defined here before being used in any document.

---

## Product Terms

**Activity**
A self-contained game type defined as an `Activity` entity in the data schema. Examples: `magnitude_scales`, `equal_or_not`, `partition_halves`. Each Activity has a slug, a mechanic, and one or more ActivityLevels.

**ActivityLevel**
A specific difficulty configuration within an Activity. Each ActivityLevel ties an Activity to one of the nine MVP Levels (L1–L9), with a fraction pool, scaffolding tier, and advancement gate.

**Level**
A user-facing progression number, **L1 through L9** in the MVP. Levels map approximately to grade-bands (L1–L2 = Grade K, L3–L5 = Grade 1, L6–L9 = Grade 2) but are presented to the student as game levels, not grades. We always say "Level," never "Grade," in student-facing UI.

**Archetype** (canonical term; replaces Mechanic and QuestionType — see D-17)
The interaction archetype an Activity uses. The MVP recognizes 10 canonical archetypes: `partition`, `identify`, `label`, `make`, `compare`, `benchmark`, `order`, `snap_match`, `equal_or_not`, `placement`. Each is specified in `20-mechanic/activity-archetypes.md`.

**Mechanic**
Deprecated synonym for **Archetype**. Do not use in new documents. Existing occurrences are to be replaced with `archetype`.

**QuestionType**
Deprecated synonym for **Archetype**. Do not use in new documents. Existing occurrences are to be replaced with `archetype`.

**Module**
**Forbidden term.** Use Activity or Level. (Many inherited RoadMap docs say "module" — they are wrong.)

**Question** (or **Question Instance**)
A single problem presented to the student during a session. A question is generated from a `QuestionTemplate` either by direct selection or by parameter substitution.

**QuestionTemplate**
A reusable problem specification stored in the curriculum data. May produce one question (fixed) or many questions (parameterized).

**Session**
A continuous play period for one student on one Activity. A session begins when the student lands on an Activity and ends on explicit close or after a 15-minute idle timeout.

**Attempt**
A single response by a student to a single Question. One Question may receive multiple Attempts (up to 4) during retry sequences.

**Round**
A grouping of related Attempts within a Session. For example, a "magnitude scales round" presents 5 questions in sequence, each potentially having multiple Attempts.

**Skill**
A discrete fraction concept tracked for mastery. Identified `SK-NN`. Examples: `SK-01` (recognize equal partitioning), `SK-02` (identify halves visually). Skills span multiple Activities and multiple Levels.

**Mastery**
The state where a Skill's BKT (Bayesian Knowledge Tracing) posterior estimate exceeds the configured threshold AND the student has produced a minimum number of unassisted correct attempts. Mastery declarations gate level advancement.

**BKT (Bayesian Knowledge Tracing)**
A statistical model for inferring whether a student has learned a Skill given their attempt history. Uses four parameters: `pInit` (initial probability known), `pTransit` (probability of learning per attempt), `pSlip` (probability of wrong answer despite knowing), `pGuess` (probability of right answer despite not knowing).

**Misconception**
A common, predictable wrong-thinking pattern in fraction learning, identified `MC-XXX`. Detected from attempt patterns. Examples: `MC-WHB-01` (whole-number bias on numerator), `MC-EOL-01` (more-pieces-equals-bigger).

**Scaffolding**
Visual or interactive supports that help the student succeed: pre-drawn grid lines, hint buttons, snap-to-axis on drag, etc. Scaffolding is reduced as the student progresses through difficulty tiers within a Level.

**Hint**
A specific, pre-written piece of help available on demand within a Question. Tracked individually so we know which hints are most useful.

---

## Pedagogical Terms

**CRA (Concrete-Representational-Abstract)**
A learning progression where students first manipulate concrete objects, then work with visual representations of those objects, then with abstract symbols. Questerix's drag-and-drop mechanic occupies the _concrete_ and _representational_ zones; symbolic notation `1/2` is introduced only at L6+, marking entry to the _abstract_ zone.

**Whole-Number Bias**
The systematic error where students apply whole-number reasoning to fractions, e.g. believing 1/4 > 1/2 because 4 > 2. Addressed throughout L6–L9.

**Magnitude Understanding**
The ability to reason about _how much_ a fraction is, not just what it is named. Tested by placement on a number line, comparison without computation, and benchmark estimation. The primary outcome we are trying to teach.

**Benchmark Fraction**
A fraction used as a reference point for estimation. The MVP uses three: 0, 1/2, 1. Comparisons like "is 3/8 closer to 0 or to 1/2?" are benchmark reasoning.

**Equal Partitioning**
The action of splitting a whole into parts of _equal area_ (or equal length, in number-line contexts). Distinct from _equal counts_ (4 pieces ≠ 4 equal pieces).

**Unit Fraction**
A fraction with numerator 1, e.g. 1/2, 1/3, 1/4. The pedagogical foundation of fraction reasoning.

**Whole**
The complete object being divided into parts. Sometimes called "the unit" in older notation.

**Decomposition**
Breaking a fraction into a sum of smaller fractions, e.g. 3/4 = 1/4 + 1/4 + 1/4. **Out of MVP scope** — Grade 3+ concept.

---

## Technical Terms

**IndexedDB**
The browser-native asynchronous object database used for persistence. See `30-architecture/persistence-spec.md`.

**Dexie.js**
A typed wrapper over IndexedDB. Adds fluent queries, declarative schema migrations, and TypeScript ergonomics for ~22 KB gzipped.

**OPFS (Origin Private File System)**
A separate browser storage API. Not used by the MVP but reviewed and rejected in `persistence-spec.md`.

**ITP (Intelligent Tracking Prevention)**
Apple's WebKit feature that evicts site storage after 7 days of non-use. The single biggest risk to client-side persistence on iOS Safari. Mitigated by PWA install + `navigator.storage.persist()`.

**PWA (Progressive Web App)**
A web app installable to a device's home screen with a manifest and service worker. Required for ITP-resistant storage on iOS.

**Service Worker**
A background script enabling offline support and persistent install. The MVP uses a minimal no-op service worker only to satisfy PWA install requirements; full offline caching is post-MVP.

**Phaser**
The 2D game framework powering the game scenes. Phaser version 4 specifically.

**Vite**
The dev server and build tool. Hot module reload during development; static-asset-only output for production.

**Tailwind CSS v4**
Utility-first CSS framework used for any non-game UI surface (settings, modals). The Phaser canvas itself does not use Tailwind.

**Static Data**
Curriculum content shipped in the app bundle: Skills, Activities, ActivityLevels, FractionBank, QuestionTemplates, Misconceptions, Hints, Standards. Read-only at runtime, replaced wholesale on `contentVersion` change.

**Dynamic Data**
Student-generated runtime data: Students, Sessions, Attempts, HintEvents, MisconceptionFlags, SkillMastery, ProgressionStat, DeviceMeta. Persists across content updates with versioned migrations.

**syncState**
A field on every Dynamic entity, valued `"local" | "queued" | "synced"`. Always `"local"` during MVP. Exists today so the 2029 sync worker has zero schema migration to do.

**applies_to**
A frontmatter tag on every doc, valued `[mvp]` or `[post-mvp-2029]`. Documents tagged `mvp` may not depend on documents tagged `post-mvp-2029`. Enforced by review.

---

## Roles & Personas

**Student**
The only user persona for the MVP. Ages 5–8.

**Solo Developer**
The author and builder. Single-threaded resource for MVP.

**Playtest Observer**
A role assumed during validation sessions: an adult (parent, partner teacher, or developer) who watches a student play and takes notes, but does not coach. See `40-validation/playtest-protocol.md`.

**Teacher** / **Parent** / **Admin**
**Roles that exist conceptually but have no MVP UI surface.** Per C2, no teacher/parent/admin features exist before 2029. A teacher or parent who happens to use the app does so as an informal observer.

---

## Meta

**MVP**
The validation-stage product covering Levels 1–9. "MVP-complete" means foundation docs written, app built, playtest run, validation analyzed, public release made.

**Post-MVP-2029**
Every feature, content, or surface explicitly deferred to 2029 or later. Tracked in `../50-roadmap/post-mvp-2029.md`. Not actively planned; not actively rejected; not built before MVP validates.

**The Gate**
Informal name for `constraints.md`. The first document anyone working on Questerix must read.

**Quarantine**
The `_quarantine/` folder at the project root, holding documents pending deletion. Not a permanent location.

**RoadMap (the folder)**
The legacy documentation tree at `RoadMap/`. Currently being progressively consumed into `docs/` and reduced. Will be empty when migration is complete.

**RoadMap (the legacy concept)**
A specific historical word for a planning approach. Not the same thing as the file in `50-roadmap/`. To avoid confusion, the new docs say "roadmap" only when referring to phase-and-milestone planning, never to refer to a folder.

---

## Enum Mapping (audit §4.5)

This section locks the canonical `archetype` enum values and their downstream contracts. It is the single source of truth. Any document or codebase value that diverges from this table is wrong.

| Archetype      | Validator ID                           | Primary Phaser Scene | Levels in scope |
| -------------- | -------------------------------------- | -------------------- | --------------- |
| `partition`    | `validator.partition.equalAreas`       | `PartitionScene`     | L1, L4, L5      |
| `identify`     | `validator.identify.exactIndex`        | `IdentifyScene`      | L1, L2, L3      |
| `label`        | `validator.label.matchTarget`          | `LabelScene`         | L2, L3          |
| `make`         | `validator.make.foldAndShade`          | `MakeScene`          | L4, L5          |
| `compare`      | `validator.compare.relation`           | `CompareScene`       | L6, L7          |
| `benchmark`    | `validator.benchmark.sortToZone`       | `BenchmarkScene`     | L8              |
| `order`        | `validator.order.sequence`             | `OrderScene`         | L9              |
| `snap_match`   | `validator.snap_match.allPairs`        | `SnapMatchScene`     | L2, L3          |
| `equal_or_not` | `validator.equal_or_not.areaTolerance` | `EqualOrNotScene`    | L1              |
| `placement`    | `validator.placement.tolerance`        | `PlacementScene`     | L8, L9          |

**Deprecated synonyms:** `mechanic` and `QuestionType` are invalid names for this enum. They are preserved here for historical reference only. All occurrences in code and docs must be replaced with `archetype`. See D-17.

---

## Word List for Banned Terms

The following terms are **not used in current MVP docs**. If found in a draft, they are replaced with the listed term:

| Banned                          | Use Instead                                    | Reason                          |
| ------------------------------- | ---------------------------------------------- | ------------------------------- |
| Module                          | Activity or Level                              | Inherited from enterprise plans |
| Grade                           | Level (in user-facing) / acceptable internally | Per Levels-not-Grades decision  |
| Master Plan                     | Roadmap                                        | Inherited enterprise jargon     |
| Executive Summary               | Vision                                         | Same                            |
| Strategic Audit                 | Constraints                                    | Same                            |
| Procurement                     | (drop entirely)                                | Out of MVP scope                |
| District                        | (drop entirely)                                | Out of MVP scope                |
| ESSA Tier                       | (drop entirely)                                | Post-validation concern         |
| Premortem                       | (drop entirely)                                | Use a Risks section instead     |
| Premium / Tier 1-2-3            | (drop entirely)                                | Monetization is post-MVP        |
| Backend / Server / API endpoint | (drop or qualify "post-MVP-2029")              | Per C1                          |
