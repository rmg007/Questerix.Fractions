# Phase 12: Bundle Drift Detection & Observability Hardening

## Context
Phase 12 hardens the curriculum system against silent data corruption and missing observability signals. MVP validation discovered three gaps: (1) no pre-commit validation of bundle parity, (2) loader silently drops invalid templates without aggregated warnings, (3) seed layer doesn't assert data integrity before bulk insertion, and (4) L03 equal_or_not templates lack schema-required shapeType field for consistency.

This phase adds deterministic checksums, loader warnings for silent truncation, seed-time guards, and a data patch for L03 templates.

---

## Implementation Plan

### Phase 12.1: Bundle Drift Detection Script & Gates (2h)

**File:** `scripts/check-curriculum-sync.mjs` (new)

**Scope:**
1. Create new script that:
   - Reads `public/curriculum/v1.json` and `src/curriculum/bundle.json`
   - Computes SHA256 hash of content object (`{ version, contentVersion, levels, ... }`)
   - Verifies both files are byte-identical (existing test in validate-curriculum.mjs already does string comparison; this adds hash-based verification for robustness)
   - Emits clear failure message if mismatch: "Curriculum bundles are out of sync. Run: npm run build:curriculum"
   - Exits 0 (pass) or 1 (fail)

2. Wire to `.husky/pre-push` hook:
   - Add call after `npm run gen:workflows` check
   - If drift detected, fail the hook with actionable message
   - Prevents push if bundles are misaligned

3. Wire to `.github/workflows/auto-rebuild-bundles.yml`:
   - Add validation step after bundle rebuild
   - Runs `npm run check-curriculum-sync`
   - Flags if CI's rebuild introduced drift (double-check on the safety net)

**Why:** Catch bundle drift locally before push (pre-commit gate); fallback CI validation if local hook is bypassed.

**Reuse from exploration:**
- Leverage existing SHA256 logic in `build-curriculum.mjs:105` as reference
- Follow `validate-curriculum.mjs` pattern for script structure (sync read, compute, compare, exit code)

**Test plan:**
- Manually corrupt one byte in `src/curriculum/bundle.json`, run hook, verify failure + message
- Run pre-push without changes, verify pass
- CI validates after auto-rebuild that hashes match

---

### Phase 12.2: Loader Observability — Dropped Rows & Version Warnings (1.5h)

**File:** `src/curriculum/loader.ts`

**Scope:**
1. Track dropped rows during schema validation (line 192):
   ```ts
   const validatedTemplates = (bundle.questionTemplates ?? []).filter(validateTemplateRow);
   const droppedRows = (bundle.questionTemplates ?? []).length - validatedTemplates.length;
   if (droppedRows > 0) {
     log.warn('CURRICULUM', 'templates.dropped', {
       droppedCount: droppedRows,
       totalRows: (bundle.questionTemplates ?? []).length,
       percentDropped: Math.round((droppedRows / (bundle.questionTemplates ?? []).length) * 100),
     });
   }
   ```

2. Emit contentVersion mismatch warning (after parseBundle call, line 261):
   ```ts
   const parsed = parseBundle(bundle, empty);
   // NEW: Detect version mismatch — loader's contentVersion doesn't match app's expected version
   if (parsed.contentVersion && parsed.contentVersion !== APP_CONTENT_VERSION) {
     log.warn('CURRICULUM', 'contentVersion.mismatch', {
       loaded: parsed.contentVersion,
       expected: APP_CONTENT_VERSION,
       context: 'loader.detected_mismatch',
     });
   }
   return parsed;
   ```

3. Add to observable list:
   - `droppedRows`: count of templates filtered due to schema validation
   - `droppedPercentage`: pct of bundle lost to validation
   - `contentVersionMismatch`: flag if loaded version != expected version

**Why:** Enable telemetry to track silent truncation (dropped templates) and version inconsistencies. Currently no visibility into how much content is being dropped.

**Integration:**
- Follows existing logging pattern: `log.warn('CURRICULUM', event, data)`
- Logs route to observability layer (telemetry ring buffer + optional external sink)
- No changes to loader's return type or behavior; warnings are side-effect only

**Test plan:**
- Create malformed template in bundle (missing `archetype`), run loader, verify warning emitted
- Manually set loaded contentVersion ≠ APP_CONTENT_VERSION, verify mismatch warning

---

### Phase 12.3: Seed Corruption Guards (1.5h)

**File:** `src/curriculum/seed.ts`

**Scope:**
1. Guard against malformed template IDs before levelGroup derivation (line 137–140):
   ```ts
   const templatesWithGroup = bundle.questionTemplates.map((t) => {
     // Guard: validate template ID format before levelGroup derivation
     if (!t.id || typeof t.id !== 'string' || !t.id.match(/^q:[a-z]+:L[0-9]+:[0-9]{4}$/)) {
       log.warn('CURRICULUM', 'seed.malformed_template_id', { id: t.id });
     }
     return {
       ...t,
       levelGroup: deriveLevelGroup(t.id) satisfies LevelGroup,
     };
   });
   ```

2. Comprehensive bundle shape validation inside transaction (line 156, before any bulkPut):
   ```ts
   async () => {
     // Guard: validate all required fields exist before seeding
     const badTemplates = bundle.questionTemplates.filter(
       (t) => !t.id || !t.archetype || !t.payload || !t.validatorId || !Array.isArray(t.skillIds) || t.skillIds.length === 0
     );
     if (badTemplates.length > 0) {
       log.warn('CURRICULUM', 'seed.invalid_templates_detected', {
         count: badTemplates.length,
         examples: badTemplates.slice(0, 3).map((t) => ({ id: t.id, missing: (() => {
           const missing = [];
           if (!t.id) missing.push('id');
           if (!t.archetype) missing.push('archetype');
           if (!t.payload) missing.push('payload');
           if (!t.validatorId) missing.push('validatorId');
           if (!Array.isArray(t.skillIds) || t.skillIds.length === 0) missing.push('skillIds');
           return missing;
         })() })),
       });
     }
     // ... rest of transaction
   }
   ```

3. Assert levelGroup populated before bulkPut (line 197–201):
   ```ts
   if (templatesWithGroup.length > 0) {
     // Guard: levelGroup must be populated — ensures deriveLevelGroup didn't silently fail
     const missingGroup = templatesWithGroup.filter((t) => !t.levelGroup);
     if (missingGroup.length > 0) {
       log.error('CURRICULUM', 'seed.levelGroup_missing', {
         count: missingGroup.length,
         examples: missingGroup.slice(0, 3).map((t) => t.id),
       });
     }
     await db.questionTemplates.bulkPut(templatesWithGroup);
     total += templatesWithGroup.length;
   }
   ```

**Why:** Prevent silent seed corruption. If bundle is partially corrupted or deriveLevelGroup silently fails, catch it before data is written. Use `log.error()` for assertion failures (not just `warn()`).

**Integration:**
- Guards are defensive; only warn if something is actually broken
- No behavioral changes; guards only log and proceed (with valid data)
- Assertions fail gracefully: if missingGroup > 0, log error but still seed (don't crash)

**Test plan:**
- Inject malformed ID (missing 'L03' segment), verify warning
- Remove `archetype` from a template, verify warning before insert
- Manually force levelGroup to null, verify error (but seed still completes)

---

### Phase 12.4: L03 equal_or_not shapeType Data Patch (0.5h)

**File:** `src/curriculum/bundle.json` (data change only)

**Scope:**
1. Add `shapeType: 'rectangle'` to all four L03 equal_or_not templates:
   - `q:eo:L3:0001`
   - `q:eo:L3:0002`
   - `q:eo:L3:0003`
   - `q:eo:L3:0004`

2. Verify via schema validation (payload is `{ partitionLines, correctAnswer, shapeType?, ... }`):
   ```json
   {
     "id": "q:eo:L3:0001",
     "archetype": "equal_or_not",
     "payload": {
       "partitionLines": [[...]],
       "correctAnswer": true,
       "shapeType": "rectangle"
     }
   }
   ```

3. Update public/curriculum/v1.json (must run `npm run build:curriculum` to sync both files).

**Why:** Schema consistency — all spatial geometry tasks should declare shapeType even if unused in validation. Unblocks future analytics/feedback enhancements.

**No validator changes needed:**
- equal_or_not.ts validator doesn't use shapeType; purely UI concern
- Partition validator doesn't validate shapeType either; established pattern

**Test plan:**
- Edit bundle.json with shapeType additions
- Run `npm run validate:curriculum` — must pass (shapeType is optional in schema)
- Run `npm run build:curriculum` — syncs v1.json
- Verify both files have shapeType via grep: `grep -c '"shapeType"' src/curriculum/bundle.json public/curriculum/v1.json`

---

## Gate: Validation & Subagent Sign-Off

**Exit criteria:**
```bash
npm run validate:curriculum        # Must pass: archetype + parity checks
npm run test:unit -- --filter curriculum  # Curriculum + validator parity tests
curriculum-byte-parity subagent   # Must run: detects parity drift, flags checksum mismatches
```

**Subagent invocation:**
- After all implementation is committed and pushed, invoke curriculum-byte-parity to audit bundle parity and new drift-detection infrastructure
- Subagent will check: SHA256 match, byte count match, contentVersion alignment, no dropped rows on clean seed

---

## Critical Files

| File | Change | Lines |
|------|--------|-------|
| `scripts/check-curriculum-sync.mjs` | NEW | — |
| `src/curriculum/loader.ts` | Add dropped-rows & version warnings | 192, 261 |
| `src/curriculum/seed.ts` | Add three guards: malformed IDs, bundle shape, levelGroup | 137–140, 156, 197–201 |
| `src/curriculum/bundle.json` | Add shapeType to 4 L3 templates | (data patch) |
| `.husky/pre-push` | Wire check-curriculum-sync | (add 1 line) |
| `.github/workflows/auto-rebuild-bundles.yml` | Add validation step | (add 5 lines) |

---

## Estimated Effort
- **12.1** (drift detection): 2h
- **12.2** (loader warnings): 1.5h
- **12.3** (seed guards): 1.5h
- **12.4** (L03 shapeType patch): 0.5h
- **Testing & subagent audit**: 1h

**Total: 6.5 hours** (includes implementation, testing, and subagent verification)

---

## Risk Mitigation

1. **Bundle drift script is non-blocking in CI** — if auto-rebuild creates drift, CI will flag it but won't prevent merge. Manual investigation required.
2. **Seed guards log but don't crash** — if assertion fails, seed completes with whatever was valid. Prevents cascade failures.
3. **L03 shapeType is optional in schema** — adding the field won't break existing validation; schema already supports it.
4. **Logging is observability-agnostic** — all warnings route through existing logger; telemetry opt-out is respected.

---

## Success Metrics

- ✅ Bundle drift detected at pre-push; prevents push without resync
- ✅ Loader logs dropped-rows count + version mismatch warnings
- ✅ Seed layer asserts malformed IDs, missing fields, missing levelGroup
- ✅ L03 templates have consistent shapeType field
- ✅ `npm run validate:curriculum` passes
- ✅ curriculum-byte-parity subagent verifies parity + no drift
