# Phase 3 — Validator Hardening & Python Parity

**Created:** 2026-05-03  
**Status:** Planning  
**Goal:** Every validator is pure, every score path is consistent, TS validators have Python clones with byte-identical outputs.

---

## Work Breakdown

### Phase 3.1 — Score Normalization (Consistency Audit)

**Files affected:** `src/validators/{order,benchmark,explain_your_order}.ts`

**Issues:**

1. **order.ts:42** — Hard-coded tier for 2 swaps returns 0.5, but ≥3 swaps use dynamic formula `1 - swaps/maxSwaps`. Creates outcome discontinuity at swap boundary.
   - Fix: Unify all ≥2 swaps to use dynamic formula; remove hard-coded 0.5 tier.

2. **benchmark.ts:58** — Both `partial` (errorRate ≤ 0.25) and `incorrect` (errorRate > 0.25) return same score formula `1 - errorRate`. 
   - Symptom: A 26% error rate gets score 0.74 as 'incorrect', but 25% error gets 0.75 as 'partial' — outcome changes but score is continuous.
   - Fix: `incorrect` should return score proportional to errors; clarify 'partial' vs 'incorrect' boundary semantics.

3. **explain_your_order.ts:70-72** — Justification-wrong branch returns 0.7 score, but line 81 returns 0.25 for two swaps. Score scales are incoherent (0.25 < 0.7 but both are 'partial').
   - Fix: Align with order.ts; use dynamic formula for swaps ≥2.

**Gate:** All three validators pass unit tests + property tests (fast-check) confirming score monotonicity and outcome stability.

### Phase 3.2 — Validator Input Guards (Shape + Type)

**Files affected:** All `src/validators/*.ts`

**Issues:**

1. **Map deserialization** — Validators like `benchmark.ts` expect `input.studentPlacements: Map<string, BenchmarkZone>`. But serialized Quiz data comes as `Record<string, string>` or arrays. No defensive checks.
   - Fix: Add guard function `isRecord(x): x is Record<string, unknown>` in `src/validators/utils.ts`; export it; use in benchmark/label/placement.
   - Apply at entry: `const placements = new Map(Object.entries(input.studentPlacements))` with type guards.

2. **Numeric bounds** — No checks for NaN, Infinity, or out-of-range decimals in compare.ts, benchmark.ts.
   - Fix: Add `isFiniteNumber(x)` guard; use in compare.ts on leftDecimal/rightDecimal.

3. **Array length checks** — partition.ts checks count, but order/explain_your_order assume length match without bounds.
   - Fix: Add early return if sequence length > 1000 (safety limit) in kendall-distance callers.

**Gate:** All validators type-check; unit tests cover Map-from-Object and malformed input paths.

### Phase 3.3 — Misconception Detection Fixes

**Files affected:** `src/validators/{compare,label}.ts`

**Issues:**

1. **compare.ts:57-58 — MC-WHB-02 derivation broken**
   - Current: `denominatorBias = (trueRelation === '<' && studentRelation === '>' && leftDecimal < rightDecimal)`
   - Problem: Checks decimal value, not denominator. MC-WHB-02 is "bigger denominator = bigger fraction" misconception.
   - Expected input has `leftDecimal` and `rightDecimal` (decimal values), but needs denominator info to detect MC-WHB-02.
   - Fix: Check if the expected payload includes denominator fields; if so, test denominator magnitude. If only decimals, accept that MC-WHB-02 is not detectable in this variant and remove the misconception flag.

2. **label.ts:59 — Duplicate penalty not implemented**
   - Current: Counts duplicates as wrong (line 53 check), but does not flag misconception.
   - Fix: If a student labels two regions with the same label, flag `'MC-LAB-01'` (if such a misconception exists) or document why duplicates don't warrant a flag.

**Gate:** All misconception flags match `docs/10-curriculum/misconceptions.md`; unit tests confirm correct detection in edge cases (inverse relations, duplicate labels).

### Phase 3.4 — Python Parity (Port Logic Gaps)

**Files affected:** `pipeline/validators_py.py` + fixtures under `pipeline/fixtures/parity/`

**Parity table (current gaps):**

| Archetype | Variant | TS status | Python status | Action |
|-----------|---------|-----------|---------------|--------|
| order | sequence | ✅ normalized | ❌ old 0.5 tier | Port Phase 3.1 fix |
| order | acceptable | ✅ | ✅ | Verify |
| order | withRule | ✅ | ✅ | Verify |
| benchmark | sortToZone | ⚠️ outcome boundary | ❌ missing guards | Port + add input guards |
| benchmark | closestBenchmark | ✅ | ✅ | Verify |
| compare | relation | ⚠️ MC-WHB-02 broken | ❌ needs fix | Port Phase 3.3 fix |
| compare | greaterThan | ✅ | ✅ | Verify |
| label | matchTarget | ⚠️ no duplicate flag | ❌ no duplicate flag | Port Phase 3.3 fix |
| explain_your_order | sequence | ⚠️ score scales | ❌ old scales | Port Phase 3.1 fix |

**Fixtures location:** `pipeline/fixtures/parity/<archetype>.json`
- Each fixture: `{ input, expected, expectedResult }`
- Run both TS (via vitest) and Python (via pytest) against same fixtures
- ci: Use `validator-parity-checker` subagent to confirm byte-identical outputs

**Gate:** `npm run test:unit -- --filter parity` passes; Python test suite green; subagent clean.

### Phase 3.5 — Type Narrowing (Helper Export)

**Files affected:** `src/validators/utils.ts` + all validators using Map inputs

**Action:**

1. Add `isRecord` helper:
   ```ts
   export function isRecord(x: unknown): x is Record<string, unknown> {
     return x !== null && typeof x === 'object' && !Array.isArray(x);
   }
   ```

2. Update validators to use it:
   - benchmark.ts: `const placements = isRecord(input.studentPlacements) ? new Map(Object.entries(input.studentPlacements)) : new Map()`
   - placement.ts: Similar pattern.
   - label.ts: Similar pattern.

3. Add `isFiniteNumber` helper for numeric bounds:
   ```ts
   export function isFiniteNumber(x: unknown): x is number {
     return typeof x === 'number' && Number.isFinite(x);
   }
   ```

**Gate:** TypeScript strict mode passes; no type assertions or `as` casts needed in validators.

---

## Execution Order

1. **Phase 3.1** — Score normalization (order, benchmark, explain_your_order)
   - Commit: `fix/2026-05-03-score-normalization`
   - Tests: Unit + property-based
   
2. **Phase 3.2** — Input guards (utils.ts + all validators)
   - Commit: `fix/2026-05-03-validator-input-guards`
   - Tests: Unit + edge cases

3. **Phase 3.3** — Misconception fixes (compare, label)
   - Commit: `fix/2026-05-03-misconception-detection`
   - Tests: Unit + misconception detection edge cases

4. **Phase 3.4** — Python parity (port all fixes)
   - Commit: `fix/2026-05-03-python-parity`
   - Tests: Parity fixtures + validator-parity-checker subagent

5. **Phase 3.5** — Type narrowing (isRecord, isFiniteNumber)
   - Commit: `refactor/2026-05-03-type-narrowing`
   - Tests: Type checks + unit tests

---

## Success Criteria (Gate)

- ✅ All 14 validator files type-check with `npm run typecheck`
- ✅ `npm run lint` passes (0 warnings)
- ✅ `npm run test:unit -- --filter validators` passes (all unit + property tests)
- ✅ `npm run test:unit -- --filter parity` passes (TS/Python parity fixtures)
- ✅ `validator-parity-checker` subagent confirms byte-identical Python outputs
- ✅ No `@ts-ignore` or type casts in validators
- ✅ Misconception flags match docs/10-curriculum/misconceptions.md
- ✅ All commits follow git-workflow.md (feat/fix/refactor with date stamp)

---

## Deferred (Post-MVP)

- Full curriculum re-validation via pipeline to ensure all templates conform to new validator contracts
- Audit all level specs for correctness against updated misconception flags
