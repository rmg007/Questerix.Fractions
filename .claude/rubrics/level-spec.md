---
title: Level Spec Review Rubric
applies_to: [pedagogy-reviewer, level-spec-parity]
scope: [mvp, k-2]
---

# Level Spec Review Rubric

Used by `pedagogy-reviewer` agent when auditing a `docs/10-curriculum/levels/level-NN.md` file.

## Required sections (all must be present)

- [ ] `## Overview` — grade band, concept, denominator(s) introduced
- [ ] `## Skills` — table with SK-NN IDs, descriptions, BKT initial p(mastery)
- [ ] `## Archetypes` — which archetypes are used and at what tiers
- [ ] `## Misconceptions` — which MC-* codes this level targets
- [ ] `## Fraction pool` — which denominators appear (`fractionPoolIds`)
- [ ] `## Question density` — ≥10 templates per active skill
- [ ] `## Acceptance criteria` — what passing a session looks like

## Pedagogy checks

- [ ] Denominator progression follows C8 (halves before thirds, thirds before fourths)
- [ ] No new denominator introduced without prior exposure in the level sequence
- [ ] Each misconception listed maps to at least one archetype explicitly targeting it
- [ ] No Grade 3+ content (verify against `docs/10-curriculum/standards-map.md`)
- [ ] All SK-NN IDs appear in `docs/10-curriculum/skills.md`
- [ ] All MC-NN codes appear in `docs/10-curriculum/misconceptions.md`

## Parity checks

- [ ] All archetypes listed have corresponding entries in `src/scenes/interactions/`
- [ ] All skill IDs listed appear in the curriculum bundle for this level
- [ ] `LEVEL_META` entry exists with matching `name`, `concept`, `gradeBand`
