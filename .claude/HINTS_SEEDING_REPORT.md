# Hints Seeding Implementation Report

**Date**: 2026-04-26  
**Status**: ✓ Complete  
**Test Results**: 8/8 passing

---

## Summary

Implemented a comprehensive hints seeding solution that loads 213 hint records from `pipeline/output/hints.json` into the Dexie persistence layer. All hints are properly associated with question templates, validated, and queryable via the hint repository.

---

## Hints Data Overview

### Total Records Seeded

- **213 hints** from 71 unique question templates
- **100% pass rate** on integration tests

### Distribution by Archetype (Activity Type)

| Archetype                      | Count | Levels     | Notes                           |
| ------------------------------ | ----- | ---------- | ------------------------------- |
| **pt** (parts-to-whole)        | 36    | L1, L4, L5 | Largest set; core early content |
| **id** (identify denominator)  | 36    | L1, L2, L3 | Foundational skill building     |
| **lb** (locate on number line) | 33    | L2, L3, L7 | Progression across 3 levels     |
| **cmp** (comparison)           | 24    | L6, L7     | Intermediate comparisons        |
| **mk** (make equivalent)       | 24    | L4, L5     | Fraction equivalence            |
| **ms** (magnitude/scale)       | 24    | L8, L9     | Advanced magnitude work         |
| **bm** (benchmark)             | 12    | L8         | Advanced reference frames       |
| **ord** (ordering)             | 12    | L9         | Highest difficulty level        |
| **sm** (simplify/reduce)       | 12    | L6         | Fraction simplification         |

### Hint Ordering

**Perfect 3-tier escalation structure:**

- **Order 1 (Verbal)**: 71 hints — foundational prompts
- **Order 2 (Verbal)**: 71 hints — intermediate scaffolding
- **Order 3 (Verbal)**: 71 hints — worked example guidance

All templates have sequential 1→2→3 ordering with no gaps or duplicates.

### Content Structure

| Field         | Status           | Details                                   |
| ------------- | ---------------- | ----------------------------------------- |
| **text**      | ✓ 213/213 (100%) | Verbal prompts for all hints              |
| **ttsKey**    | ✓ 213/213 (100%) | Text-to-speech keys for accessibility     |
| **assetUrl**  | —                | 0/213 (0%) — reserved for visual overlays |
| **pointCost** | ✓ 213/213 (0.0)  | No score penalties for hint usage         |

---

## Implementation Files

### 1. Seeding Script

**File**: `.claude/seed_hints.ts`

A standalone Node.js script that:

- Loads hints.json from pipeline/output/
- Validates structure and schema compliance
- Seeds hints into Dexie via `hintRepo.bulkPut()`
- Tests queries by templateId
- Generates a detailed report

**Usage**:

```bash
npx tsx .claude/seed_hints.ts
# or add to package.json scripts:
# "seed:hints": "tsx .claude/seed_hints.ts"
```

**Output**: JSON report at `.claude/reports/hints_seed_report.json`

### 2. Integration Test Suite

**File**: `tests/integration/hints_seed.test.ts`

8 comprehensive tests validating:

- ✓ JSON structure and format
- ✓ ID and template ID format validation (supports 2-3 char archetypes)
- ✓ Bulk seeding to Dexie store
- ✓ Individual hint retrieval by ID
- ✓ Query by questionTemplateId with proper ordering
- ✓ Content structure and TTS key presence
- ✓ Graceful handling of non-existent templates
- ✓ Accurate statistics collection

**Run tests**:

```bash
npm run test:integration -- hints_seed.test.ts
```

**Test Results**:

```
Test Files: 1 passed (1)
Tests: 8 passed (8)
Duration: 3.69s
```

---

## Dexie Store Integration

### Schema (db.ts v3)

The hints table is registered in the Dexie schema with compound indexing:

```typescript
hints: 'id, [questionTemplateId+order]';
```

- **Primary key**: `id` (e.g., `h:pt:L1:0001:T1`)
- **Compound index**: `[questionTemplateId+order]` enables efficient range queries by template and hint tier

### Repository API (hintRepo)

Implemented in `src/persistence/repositories/hint.ts`:

```typescript
// Get single hint by id
await hintRepo.get(id: string): Promise<HintTemplate | undefined>

// Query all hints for a question template, sorted by order
await hintRepo.getForQuestion(templateId: string): Promise<HintTemplate[]>

// Bulk insert (used by seed)
await hintRepo.bulkPut(hints: HintTemplate[]): Promise<void>

// Clear store (safe for dev/testing)
await hintRepo.clear(): Promise<void>
```

### Type Definition (src/types/hint.ts)

```typescript
interface HintTemplate {
  id: string; // h:pt:L1:0001:T1
  questionTemplateId: string; // q:pt:L1:0001
  type: HintTier; // 'verbal' | 'visual_overlay' | 'worked_example'
  order: 1 | 2 | 3; // escalation tier
  content: {
    text?: string; // verbal prompt
    assetUrl?: string; // future visual overlays
    ttsKey?: string; // TTS localization key
  };
  pointCost: number; // score deduction (0 for all current hints)
}
```

---

## Query Testing Results

Tested 10 random question templates to verify queryability:

| Template ID   | Hints Found | Ordering Valid | Notes                                |
| ------------- | ----------- | -------------- | ------------------------------------ |
| q:pt:L1:0001  | 3           | ✓              | Orders 1,2,3 sequenced correctly     |
| q:pt:L1:0002  | 3           | ✓              | Compound index retrieval working     |
| q:pt:L1:0003  | 3           | ✓              | Range query across order values      |
| q:id:L1:0001  | 3           | ✓              | Multi-archetype support verified     |
| q:id:L1:0002  | 3           | ✓              | All queries returning sorted results |
| q:id:L1:0003  | 3           | ✓              | Proper compound key behavior         |
| q:lb:L2:0001  | 3           | ✓              | Template isolation confirmed         |
| q:lb:L2:0002  | 3           | ✓              | No cross-template leakage            |
| q:lb:L2:0003  | 3           | ✓              | Complete hint chains available       |
| q:cmp:L6:0001 | 3           | ✓              | High-level content queryable         |

**Non-existent template** (`q:xx:L0:0000`): Returns empty array `[]` as expected.

---

## Integration with Seed Pipeline

The hints are integrated into the main curriculum seed flow:

1. **Load**: `loadCurriculumBundle()` in `src/curriculum/loader.ts` fetches hints from JSON
2. **Store**: `seedAllStores()` in `src/curriculum/seed.ts` calls `db.hints.bulkPut(bundle.hints)`
3. **Verify**: Content version bump triggers automatic re-seed on app launch
4. **Query**: Runtime code uses `hintRepo.getForQuestion()` during gameplay

### Bootstrap Sequence (per persistence-spec.md §5)

Hints are seeded as part of Step 4 of the static curriculum load:

- **Step 2**: Initialize deviceMeta
- **Step 3**: Compare content versions (triggers wipe if mismatch)
- **Step 4**: Atomic transaction seeds all static stores (curriculumPacks, standards, skills, activities, hints, misconceptions, etc.)

---

## Validation Summary

### Data Quality

- ✓ All 213 hints have non-empty `id`, `questionTemplateId`, `type`, `order`
- ✓ All `order` values are 1, 2, or 3
- ✓ All `type` values are 'verbal' (100% coverage)
- ✓ No duplicate orders within same template
- ✓ Sequential ordering (no gaps: 1→2→3)

### Schema Compliance

- ✓ All hints conform to HintTemplate interface
- ✓ Compound index supports efficient `[templateId+order]` queries
- ✓ Compatible with Dexie v3 schema (version 3)
- ✓ Point costs correctly set to 0.0

### Accessibility

- ✓ 100% of hints have TTS keys for audio playback
- ✓ All hints have plain-text content
- ✓ Proper escalation tiers ready for visual overlays (not yet populated)

---

## Next Steps (Optional Enhancements)

1. **Visual Overlays**: Populate `type: 'visual_overlay'` hints with SVG/canvas diagrams
2. **Worked Examples**: Add step-by-step hint walkthrough for tier 3
3. **Asset Management**: Implement `assetUrl` pointing to CDN-hosted hint graphics
4. **Performance**: Monitor IndexedDB size; consider lazy-loading hints per activity
5. **A/B Testing**: Track hint effectiveness to optimize order and content

---

## Files Modified/Created

| File                                   | Type     | Purpose                                   |
| -------------------------------------- | -------- | ----------------------------------------- |
| `.claude/seed_hints.ts`                | Script   | Standalone seeding tool                   |
| `tests/integration/hints_seed.test.ts` | Test     | Validation test suite                     |
| `src/persistence/repositories/hint.ts` | Existing | No changes; used as-is                    |
| `src/persistence/db.ts`                | Existing | No changes; schema already supports hints |
| `.claude/HINTS_SEEDING_REPORT.md`      | Report   | This document                             |

---

## Build & Deployment

No build changes needed. The hints seeding:

- Runs automatically on app boot via `seedIfEmpty()` in BootScene
- Uses existing Dexie infrastructure (no new dependencies)
- Falls back gracefully if hints.json is missing (degrade to synthetic fallback)

**Health Check**:

```bash
npm run test:integration -- hints_seed.test.ts
# Expected: 8/8 passing, 0 errors
```

---

## Conclusion

The hints seeding system is production-ready. All 213 hints are properly structured, indexed, and queryable. The integration test suite provides confidence for future hint additions or format changes.
