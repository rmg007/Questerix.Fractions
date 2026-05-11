# Hardening Iteration 3: Input Validation & Type Safety

**Goal:** Eliminate class of bugs from unvalidated inputs by adding runtime guards on all user-facing surfaces.

## Phase 3.1: Validator Input Guards
- [ ] Add bounds checking for region areas (0 < x < 100)
- [ ] Validate array lengths match expected counts
- [ ] Guard against NaN/Infinity in numeric fields
- [ ] Type-check all validator inputs at runtime

## Phase 3.2: Drag-Drop Bounds
- [ ] Clamp drag coordinates to canvas bounds
- [ ] Validate touch coordinates before use
- [ ] Guard against negative/extreme values
- [ ] Add safety margin for floating point errors

## Phase 3.3: Scene Parameter Validation
- [ ] Validate all route params (level IDs, student IDs)
- [ ] Check student exists before loading session
- [ ] Guard against corrupted question IDs
- [ ] Validate curriculum data schema at runtime

## Phase 3.4: IndexedDB Data Validation
- [ ] Runtime schema validation on all reads
- [ ] Guard against missing indexed fields
- [ ] Validate foreign key relationships
- [ ] Type-check async query results

## Success Criteria
- No unchecked array accesses remain
- All numeric values have bounds checks
- String inputs sanitized for XSS
- DB queries always validate shape
- Type errors caught at runtime, not in production
