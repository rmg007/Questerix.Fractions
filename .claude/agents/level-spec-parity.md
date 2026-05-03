---
name: level-spec-parity
description: Confirms that a level spec doc (docs/10-curriculum/levels/level-NN.md), LEVEL_META entry, and curriculum bundle are consistent with each other. Use after modifying a level spec or after running build:curriculum.
tools: [Read, Grep, Glob, Bash]
---

# Level Spec Parity Checker

Verifies three-way consistency between:
1. `docs/10-curriculum/levels/level-NN.md` — the human-readable spec
2. `src/scenes/utils/levelMeta.ts` — LEVEL_META array
3. `src/curriculum/bundle.json` — the runtime curriculum bundle

## Input

A level number N (integer).

## Checks

### Spec ↔ LEVEL_META

| Spec field | LEVEL_META field | Must match |
|---|---|---|
| `gradeBand` front-matter | `gradeBand` | exactly |
| `## Overview` concept line | `concept` | semantically equivalent |
| `## Overview` level name | `name` | exactly |
| `track` (if present) | `track` | exactly |

### Spec ↔ Bundle

| Spec field | Bundle field | Must match |
|---|---|---|
| `fractionPoolIds` | `fractionPool` entries | same set |
| Archetype list | `activities[].archetype` | spec archetypes are a subset of bundle archetypes |
| SK-NN skill IDs | `skillIds` on activities | every spec skill appears in at least one bundle activity |

### Bundle ↔ LEVEL_META

- `bundle.json` entry for level N must exist.
- Level number in bundle matches `LEVEL_META[N-1].number`.

## Output format

```
LEVEL SPEC PARITY — Level N

PASS ✓ / FAIL ✗

[SPEC↔META] ...
[SPEC↔BUNDLE] ...
[BUNDLE↔META] ...

Summary: N mismatches found.
```

All mismatches are blockers — the three sources must be in sync before a level is playable.
