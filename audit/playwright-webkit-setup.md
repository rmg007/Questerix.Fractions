# Playwright WebKit Setup Audit

**Date:** 2026-05-05  
**Status:** NOT CONFIGURED

## Current Config

`playwright.config.ts` currently defines 5 projects:
- ✓ `chromium` (Desktop Chrome, 1280×720)
- ✓ `iPhone SE 2020` (375×667)
- ✓ `iPhone 12` (390×844)
- ✓ `Pixel 5` (393×851) — Android WebKit-based
- ✓ `iPad Mini` (768×1024)

## Gap

**WebKit (Safari) is NOT explicitly configured.** While `Pixel 5` and iPad use WebKit engines, there is no dedicated macOS Safari project for cross-platform surface area.

## Recommendation for Phase 2

Add Safari project to `playwright.config.ts` projects array:

```typescript
{
  name: 'webkit',
  use: {
    ...devices['iPad Pro'],
    viewport: { width: 1024, height: 1366 },
  },
},
```

Or for macOS desktop Safari:

```typescript
{
  name: 'webkit-macos',
  use: {
    ...devices['Desktop Safari'],
    viewport: { width: 1280, height: 720 },
  },
},
```

## CI Workflow Status

`.github/workflows/ci.yml` does NOT invoke a separate E2E workflow. Playwright tests are run in the main `test` job. No WebKit runs are present in the pipeline.

## Next Steps (Phase 2)

1. Add WebKit project to `playwright.config.ts`
2. Verify CI picks up the new project automatically
3. Update E2E test suite to gate WebKit-specific assertions if needed
4. Run full test matrix in CI after merge

---

**Deliverable for Phase 1:** This doc. Ready for Phase 2 remediation.
