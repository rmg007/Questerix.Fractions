---
title: Content Authoring Pipeline
status: draft
owner: solo
last_reviewed: 2026-04-24
applies_to: [mvp]
constraint_refs: [C3, C4, C8, C9]
related: [data-schema.md, ../10-curriculum/scope-and-sequence.md, ../10-curriculum/levels/]
---

# Content Authoring Pipeline

How we generate the **~300–340 parameterized QuestionTemplates** (producing ~2,400–2,700 question instances) needed to populate Levels 1–9. (audit §2.5 fix — see `mvp-l1-l9.md §3.1, §4.1, §5.1` for per-level breakdown)

This is a **build-time tool**, not a runtime service. It runs offline on the developer's machine, produces a static JSON seed file that ships in the app bundle, and shuts down. There is no production deployment.

This doc supersedes the proposal in `c:\dev\Test_LangGraph\` (a generic LangGraph plan that targets multiple-choice quiz generation — wrong shape for our drag-and-drop mechanics).

---

## 1. Problem Being Solved

`scope-and-sequence.md §4` calls out the bottleneck:

- **~180 in-scope topics** across L1–L9
- Need **12–14 questions per topic** for adaptive difficulty + retry without repeats
- Total: **~2,400–2,700 question instances** if hand-authored, **~300–340 unique templates** if parameterized (see `mvp-l1-l9.md §3.1, §4.1, §5.1` for per-level breakdown) (audit §2.5 fix)

Hand-authoring 2,200 questions plus their validators, hint sets, and misconception tags is weeks of work and risks inconsistency. Generating them with an LLM, verifying mathematically, and polishing for kid-language is hours.

But: **the LLM must produce records conforming to our schema, not a generic quiz format.** This is the pivot point that the inherited LangGraph plan misses.

---

## 2. Inputs and Outputs

### 2.1 Input: Level Specifications

Source of truth: `docs/10-curriculum/levels/level-NN.md` (one file per level). Each level file already declares:

- Activities (with mechanic, slug, difficulty tiers)
- Skill IDs targeted (`SK-NN`)
- Misconception traps (`MC-XXX`)
- Fraction pool (per C8)
- Authoring targets (e.g., "12 templates, 4 easy / 5 medium / 3 hard")

A **parser** (Python or TS, see §6) reads these files and emits a structured "generation manifest" — a list of `(level, activity, archetype, tier, count_needed)` rows that the pipeline consumes.

No `.txt` topic files in `input/`. The level docs are the input.

### 2.2 Output: Curriculum Seed File

The pipeline emits **one file**: `src/assets/curriculum/v{n}.json`.

Shape: a single object with each top-level key matching a Dexie static-store name from `data-schema.md §6`:

```json
{
  "curriculumPacks": [{ "id": "qx.fractions.k2", "schemaVersion": 1, "contentVersion": "1.0.0", ... }],
  "standards":       [/* CCSS records */],
  "skills":          [/* SK-* records with BKT priors */],
  "activities":      [/* slug-keyed Activity records */],
  "activityLevels":  [/* one per (activity × level) */],
  "fractionBank":    [/* every fraction the app uses */],
  "questionTemplates": [/* THE BIG ONE — ~250 templates */],
  "misconceptions":  [/* MC-* records */],
  "hints":           [/* ~750 hint records (3 per template avg) */]
}
```

App boot reads this file once and calls Dexie `bulkPut` per store (see `persistence-spec.md §5`). No per-record API calls; the entire pack ships as one ~2 MB JSON in the app bundle.

---

## 3. Architecture

LangGraph is overkill for this pipeline. The shape is **sequential with one verification loop**, not a fan-out graph. A simple Python or TypeScript script with `asyncio` is sufficient.

```
┌──────────────────────────────────────────────────────────┐
│  per (activity × archetype × tier):                      │
│                                                          │
│   [parse level spec]                                     │
│         │                                                │
│         ▼                                                │
│   [build generation context]                             │
│   (mechanic + payload shape + fraction pool +            │
│    skill IDs + misconception traps + count target)       │
│         │                                                │
│         ▼                                                │
│   [LLM: generate N templates]  ← Haiku 4.5               │
│         │                                                │
│         ▼                                                │
│   [programmatic verifier]                                │
│   (math correctness, schema conformance,                 │
│    fraction-pool inclusion, validator-id known)          │
│         │                                                │
│    ┌────┴────┐                                           │
│    │ pass    │ fail (regenerate that template only)      │
│    │         │ ↑                                         │
│    │         └─┘ max 3 retries per template (audit §2.6 fix) │
│    ▼                                                     │
│   [LLM: editorial polish]  ← Sonnet 4.6                  │
│   (kid-language, prompt clarity, TTS-friendly text)      │
│         │                                                │
│         ▼                                                │
│   [emit to seed]                                         │
└──────────────────────────────────────────────────────────┘
```

Three LLM calls per template (generate + maybe regenerate + polish), not ten. For ~300–340 templates this is **~900–1,020 calls total**, vs. the inherited plan's ~2,500.

---

## 4. Why Programmatic Verification Replaces Three LLM Reviewers

K–2 fraction content is *finitely verifiable*. Every generated record is checkable in code:

| Check | How |
|-------|-----|
| Math is correct | Each `payload` and `correctAnswer` is exercised against a Python validator clone of `validator.placement.snap8`, `validator.equal_or_not.areaTolerance`, etc. If the LLM-generated answer doesn't match the validator's computed answer, regenerate. |
| Schema conforms | JSON-schema validation against the QuestionTemplate shape (see `data-schema.md §2.7`). |
| Fraction pool respected | All fractions referenced in `payload` must be IDs in `fractionPoolIds` for the parent ActivityLevel (per C8). |
| `validatorId` is known | Cross-check against `activity-archetypes.md` registry. |
| `skillIds` are real | Cross-check against the `skills` records being emitted in the same pack. |
| `misconceptionTraps` are real | Cross-check against the `misconceptions` records. |
| Difficulty tier label matches expected distribution | Per-tier templates count matches the level spec's authoring targets. |
| Prompt text passes basic constraints | Length 5–25 words; reading level ≤ Grade 2; no banned vocab from `glossary.md` |

If a check fails, regenerate **just that template**, not the whole pipeline run. Three retries; if still failing, log and skip with `manual_review: true` flagged so I author it by hand.

This is faster, cheaper, and more reliable than asking an LLM "is this math correct?"

---

## 5. Generation Prompts (per Mechanic)

Each archetype gets its own prompt template that constrains the LLM to produce only its expected payload shape. Generic "math educator generates content" prompts are forbidden because they generate the wrong shape.

### 5.1 Example: Placement (Magnitude Scales)

```text
You are generating QuestionTemplate records for an interactive number-line placement
activity. Each template asks the student to drag a fraction card to its position
on a 0–1 number line.

Output a JSON array of {N} templates. Each must conform exactly to:

{
  "id": "q:ms:L{LEVEL}:NNNN",
  "type": "placement",
  "prompt": { "text": "<one short imperative sentence>", "ttsKey": "tts.ms.l{LEVEL}.NNNN" },
  "payload": { "fractionId": "<id from pool>", "targetDecimal": <0..1> },
  "correctAnswer": <same as targetDecimal>,
  "validatorId": "validator.placement.snap8",
  "skillIds": [<skill ids from list>],
  "misconceptionTraps": [<misconception ids from list>],
  "difficultyTier": "{TIER}"
}

Constraints:
- Use only fractionIds from this pool: {POOL}
- Use only these skillIds: {SKILLS}
- Use only these misconceptionIds: {MISCONCEPTIONS}
- Prompt text must be 5–15 words, imperative, second-person, Grade 2 reading level
- Forbidden words: {BANNED_VOCAB}

Generate {N} unique templates. No duplicates by fractionId.
```

### 5.2 Example: Equal-or-Not

```text
You are generating QuestionTemplate records for an "Are these parts equal?"
activity. Each template shows a partitioned shape and asks a yes/no question.

Output a JSON array of {N} templates conforming to:
{ "id": ..., "type": "equal_or_not",
  "payload": { "shapeType": "rectangle"|"circle",
               "partitionLines": [[[x,y],[x,y]], ...],
               "rotation": <-15 to 15 degrees> },
  "correctAnswer": <true|false>,
  "validatorId": "validator.equal_or_not.areaTolerance",
  ...
}

For tier "easy": partition lines exactly at 0.5 (correct = true) OR clearly
unequal at 0.25 or 0.7 (correct = false). Rotation = 0.

For tier "medium": rotation 0–15 degrees, partition still 50/50 within ±2%.

For tier "hard": skewed partitions that *look* near-equal but differ by 5–8%
(correct = false). Use this to detect MC-EOL-03.

Generate {N} unique templates.
```

Each archetype in `activity-archetypes.md` will have its own prompt section. The prompts are versioned alongside the schema.

---

## 6. Implementation

### 6.1 Where the code lives

```
tools/content-pipeline/         ← NEW directory, NOT in src/
  pyproject.toml
  pipeline.py                   ← entry point: `python -m pipeline build`
  level_parser.py               ← reads docs/10-curriculum/levels/*.md
  generation_manifest.py        ← builds the (level × activity × archetype × tier × count) plan
  prompts/
    placement.j2
    equal_or_not.j2
    comparison.j2
    ordering.j2
    ...one per archetype
  validators_py/                ← Python clones of the TS validators
    placement_snap8.py
    equal_or_not_area_tolerance.py
    ...
  schema_check.py               ← jsonschema for QuestionTemplate
  llm_client.py                 ← Anthropic SDK wrapper, retries, rate limit
  emit.py                       ← writes src/assets/curriculum/v{n}.json
  test/
    fixtures/                   ← golden-set: 30 hand-authored templates
    test_validators_match_ts.py
    test_pipeline_smoke.py
```

This lives **outside `src/`** because it's a build tool, not part of the runtime. It can use Python (faster to write) without polluting the TS toolchain. The output it produces (`src/assets/curriculum/v{n}.json`) is the only handoff to the runtime.

### 6.2 Why Python and not TypeScript?

The pipeline benefits from:
- Anthropic SDK is mature in both, but the Python ecosystem for batch ETL/data work is denser
- `jsonschema`, `jinja2`, `pydantic` are first-class
- Throwaway scripts and notebooks for iteration

But: validators must match the TS runtime exactly. We mitigate by writing a small **conformance test** (`test_validators_match_ts.py`) that loads a fixture set, runs both the Python and the TS validator, and asserts identical results. Either language works; pick what's faster.

### 6.3 Models

| Stage | Model | Why |
|-------|-------|-----|
| Generation | Claude Haiku 4.5 (`claude-haiku-4-5-20251001`) | Fast, cheap, sufficient for templated structured output |
| Editorial polish | Claude Sonnet 4.6 (`claude-sonnet-4-6`) | Better at nuanced kid-language phrasing |
| Manual fallback (when verifier fails 3×) | Hand-author the record yourself | Some templates are easier to write than to coax |

Claude 3.5 Sonnet (Oct 2024) — the model in the inherited LangGraph plan — is two generations behind and ~10× more expensive per token than Haiku 4.5 for the same job.

**Model availability fallback (audit §5 fix):** If a model slug is deprecated mid-build, fall back to the next-newer model in the same tier (e.g., haiku → next-haiku, sonnet → next-sonnet). Do not fall back cross-tier (e.g., do not fall back haiku → sonnet, as cost characteristics differ significantly).

### 6.4 Cost estimate

- ~320 templates × ~1.5 calls average to Haiku (regen factor) = ~480 Haiku calls
- ~320 templates × 1 call to Sonnet (polish) = ~320 Sonnet calls
- Average ~2 KB input + 1 KB output per call
- Total cost: roughly **$4–$11** for a full curriculum-pack regeneration. Trivial. (audit §2.5 fix — proportional bump from prior ~250-template estimate)

The inherited plan's 10-call-per-topic design with Sonnet 3.5 would cost ~10× more (~$50–$80 per regeneration) and produce wrong-shaped output.

---

## 7. Run Modes

### 7.1 Full build (`python -m pipeline build`)

Reads all level specs, regenerates all templates, writes a new `v{n}.json`. Used when:
- Schema versions bump
- Multiple level specs change
- A fresh run is needed

### 7.2 Targeted rebuild (`python -m pipeline build --level 03 --activity identify_thirds`)

Regenerates only matching templates. Existing other templates are preserved. Used during iteration on a single level.

### 7.3 Verify-only (`python -m pipeline verify`)

Loads the current `v{n}.json` and runs all programmatic checks **without** calling any LLM. Catches drift between the seed file and the level specs. Used in CI.

### 7.4 Dry-run (`python -m pipeline build --dry-run`)

Generates without writing the seed file. Outputs to stdout. Used when iterating on prompts.

---

## 8. When This Pipeline Runs

**Authoring time, on the developer's laptop.** Never in production. Never in CI as a step that calls the LLM.

CI runs only the verifier (`python -m pipeline verify`) to catch drift. Generation is a deliberate, audited operation triggered by the developer.

The output `src/assets/curriculum/v{n}.json` is **committed to the repo**. The seed file is the source of truth for what ships; the pipeline is the *means* of producing it. A reviewer reads the JSON, not the prompts, when reviewing curriculum changes.

---

## 9. Quality Gates

Before a regenerated `v{n}.json` is committed:

1. **Verifier passes.** Every template's math, schema, references all check out.
2. **Spot-check sample.** I read 30 random templates by hand. If 3+ feel off, regenerate the affected archetypes with prompt tuning.
3. **Diff review.** Compare against the previous seed. Look for unexplained drift in difficulty distribution, fraction pool drift, prompt-tone shift.
4. **Smoke test in app.** Load the new seed in dev, play through Level 1, verify nothing crashes and prompts read naturally.

No automated "QA agent" replaces step 2 or 4. Human reading is the final filter.

---

## 10. Versioning

- The seed file is named `v{contentVersion}.json` matching `CurriculumPack.contentVersion` (semver).
- Bumping `contentVersion` triggers static-store wipe + re-seed at app boot (per `persistence-spec.md §5`).
- Dynamic data (student progress) is preserved across content version bumps because foreign keys are slug-based.

A `CHANGELOG-CURRICULUM.md` (separate from code changelog) records what changed in each content version: which activities, which templates, why.

---

## 11. What This Pipeline Will NOT Do

- **No quiz-style multiple choice.** Not a question type in our schema.
- **No content beyond MVP scope.** Topics like "addition with unlike denominators" return an error from the level parser.
- **No teacher-facing lesson plans.** Out per C2.
- **No on-the-fly question generation in the runtime.** All content is pre-generated; the app ships with everything it needs.
- **No image generation.** Visual assets are SVG-rendered procedurally by Phaser at runtime, not pre-rendered images. The pipeline emits *parameters* (shape type, partition coordinates, rotation), Phaser draws the visuals.
- **No translation.** Locales are post-MVP-2029. The pipeline emits English only; future runs may add `localeStrings` arrays.

---

## 12. Failure Modes

| Failure | Detection | Response |
|---------|-----------|----------|
| LLM produces invalid JSON | `json.loads` fails | Retry with stricter prompt; max 3 retries; flag for manual authoring |
| LLM math wrong | Validator clone returns mismatch | Regenerate that template; max 3 retries; flag |
| LLM hallucinates skill or misconception ID | Cross-check fails | Regenerate; max 3 retries; flag |
| Fraction outside pool | Cross-check fails | Regenerate (LLM ignored constraint); max 3 retries; flag |
| LLM response truncates | Token limit hit | Reduce `count_needed` per call; chunk into multiple calls |
| Anthropic API rate limit | 429 response | Exponential backoff, 5s → 30s → 120s |
| Anthropic API down | Connection error | Pause pipeline; do not write partial output; resume later |
| Catastrophic — multiple stages fail | Run aborts cleanly | Previous `v{n}.json` is unaffected; never write half-finished seed |

---

## 13. Checklist Before First Run

- [ ] Schema is locked (don't run pipeline against a schema in flux)
- [ ] At least one level spec (`level-01.md`) is final
- [ ] At least one validator clone matches its TS counterpart in conformance test
- [ ] At least one prompt template exists for each in-scope archetype that level uses
- [ ] Hand-authored golden fixture exists (~10 templates) so the verifier has expected positive outputs to compare against
- [ ] Anthropic API key is set; budget alarm configured at $20
- [ ] Verify model slugs (`claude-haiku-4-5-20251001`, `claude-sonnet-4-6`) are still available before kickoff (audit §5 fix)

---

## 14. Comparison to the Inherited LangGraph Plan

| Dimension | Inherited plan | This plan |
|-----------|---------------|-----------|
| Output schema | Generic explanation+MCQ quiz | Questerix QuestionTemplate types |
| Input format | Freeform `.txt` topic files | Structured `level-NN.md` specs |
| Models | Claude 3.5 Sonnet (Oct 2024) | Haiku 4.5 + Sonnet 4.6 |
| Calls per template | ~10 (educator + 3 reviewers + 3 fixers + 3 QA) | ~2.5 (generator + maybe regen + polish) |
| Verification | LLM accuracy reviewer | Programmatic validator clone |
| Storage | Standalone SQLite | Direct seed for Dexie/IndexedDB |
| Estimated cost (full build) | ~$50–$80 | ~$4–$11 (audit §2.5 fix) |
| Estimated time (~320 templates) | ~8 hours | ~30–45 minutes (audit §2.5 fix) |
| Adaptation needed for Questerix | Substantial | None (designed for it) |

The inherited plan is a strong skeleton for a *generic* content service. Adapting to Questerix means replacing 80% of it. This doc is that replacement.
