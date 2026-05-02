# tests/ — Test Suite

## Structure

```
tests/
  unit/            # Vitest unit tests — validators, BKT, components, engine
  integration/     # Vitest integration tests — curriculum loader, DB upgrade paths
  e2e/             # Playwright smoke suite (Chromium)
  a11y/            # Playwright + axe-core accessibility tests
  synthetic/       # Replay scripts for synthetic playtesting
  fixtures/        # Shared test data (seed.json, sample_templates.json, parity/*.json)
  setup.ts         # Global Vitest setup (fake-indexeddb)
  setup.engine.ts  # Engine-specific Vitest setup
```

## Commands

```bash
npm run test:unit          # all Vitest tests (unit + integration via configs)
npm run test:integration   # vitest.integration.config.ts only
npm run test:e2e           # Playwright Chromium
npm run test:a11y          # Playwright a11y subset
npm run test:unit -- --reporter=verbose --filter <name>  # single test
```

## Rules

### Unit tests (Vitest)
- **One test file per source file** — mirrors `src/` path under `tests/unit/` or colocated as `__tests__/<file>.test.ts`.
- **No Phaser in unit tests.** Mock anything that touches the game engine. `fake-indexeddb` (imported in `setup.ts`) provides a real Dexie in Node.
- **Validators get property-based tests** via `fast-check`. Use `fc.assert(fc.property(...))`. Check boundaries: `numerator === denominator`, `numerator === 0`, negative indices.
- **BKT tests:** verify `updateMastery(0.5, true) > 0.5` and `updateMastery(0.5, false) < 0.5`. Check output is always `[0.001, 0.999]` clamped.

### Integration tests (Vitest)
- Test Dexie schema migrations: use `fake-indexeddb` and step through version upgrades.
- Test curriculum loader: verify fallback to `bundle.json` when `fetch` fails.

### E2E tests (Playwright)
- Target `data-testid` attributes set via `TestHooks.ts` (`src/scenes/utils/TestHooks.ts`). Don't couple to CSS classes or element positions.
- Smoke test: boot → menu → level 1 → attempt one question → verify feedback.
- Mobile: use `page.setViewportSize({ width: 375, height: 667 })` for iPhone SE simulation.
- **Always import `{ test, expect }` from `./_fixture`**, never from `@playwright/test`. The fixture appends `?testHooks=1` so `BootScene` mounts `boot-start-btn`, and pre-seeds `localStorage['questerix.onboardingSeen']='1'` so the v7 deviceMeta upgrade marks the onboarding complete on a fresh test context. Specs that import `@playwright/test` directly will silently skip the boot-start-btn handshake and route through OnboardingScene instead of LevelMapScene.
- **Suite-flake follow-ups:** every spec listed under a cluster in `PLANS/E2E_FOLLOWUPS.md` was `test.skip`'d during the 2026-05-02 closeout — see that file for the fix path before re-enabling.

### A11y tests (Playwright + axe-core)
- Live in `tests/a11y/**` and load via the same `playwright.config.ts` (`testMatch` covers both `**/e2e/**` and `**/a11y/**`).
- `npm run test:a11y` filters via `--grep a11y`, which matches the file-path segment `a11y/...` in each test ID.
- CI cold-start is slower than dev mode — use ≥10s sentinel timeouts for boot/menu transitions and ≥15s for `boot-start-btn` (see `tests/a11y/wcag.spec.ts` axe-core tests).

### Parity tests
- `pipeline/fixtures/parity/*.json` — each fixture describes a `validatorId`, `input`, `expected`, and `expected_outcome`. Run by both the TS test suite and the Python pipeline. If you change a TS validator, update the fixture if the behavior changes.

## Adding a test

1. Unit/integration: create `tests/unit/<area>/<file>.test.ts`, import the module, write `describe` + `it` blocks.
2. E2E: add to `tests/e2e/` following the Playwright `test()` pattern; use `TestHooks.get(page, 'my-testid')`.
3. Parity: add a JSON fixture to `pipeline/fixtures/parity/` matching the schema in existing fixtures, verify Python and TS both pass.
