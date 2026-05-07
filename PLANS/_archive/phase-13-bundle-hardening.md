# Phase 13: Bundle Hardening — Observability Lazy-Loading & Per-Chunk Budgets

## Context

Current bundle state: **503 KB gzipped (48% of 1 MB budget)**
- phaser: 350 KB gz (largest)
- scenes: 86 KB gz
- observability: 8.9 KB gz
- dexie: 31 KB gz

Phase 13 hardens the bundle by:
1. Lazy-loading observability wrappers (~8 KB gz savings in MVP builds)
2. Implementing per-chunk budgets (phaser ≤380 KB, scenes ≤100 KB, observability ≤12 KB)
3. Adding Brotli measurement alongside gzip for future CDN tuning
4. Wiring Sentry source-map uploads so production errors link to source
5. Migrating remaining `process.env` checks to `import.meta.env`

Gate: `npm run measure-bundle` must show ≤1 MB gz total + all per-chunk budgets pass + bundle-watcher subagent clean.

---

## Work Item 1: Lazy-Import Observability Wrappers

**Goal:** Remove tracer.ts and errorReporter.ts from the entry chunk by gating them on VITE_OTLP_URL and VITE_SENTRY_DSN env vars.

**Current State:**
- `src/lib/observability/tracer.ts` (108 lines) — always imported by observability/index.ts
- `src/lib/observability/errorReporter.ts` (179 lines) — always imported by observability/index.ts
- Internal SDK imports already lazy via dynamic imports inside _doInit() / init()
- Wrappers themselves are the ~8 KB gz to save

**Approach:**
1. Refactor `src/lib/observability/index.ts` to lazy-load tracer.ts and errorReporter.ts
2. Export async getters: `getTracerService()` and `getErrorReporter()` instead of singletons
3. Update call sites to use async/await or promise-based pattern
4. Gate lazy-loading on VITE_OTLP_URL and VITE_SENTRY_DSN at the fetch-time level (not just inside the module)

**Call Sites to Update:**
- `src/scenes/LevelScene.ts` — uses `tracerService` in question submission flow
- `src/lib/levelSceneHintFlow.ts` — uses `tracerService` in hint request/delivery
- `src/persistence/middleware.ts` — uses `tracerService` for DB operation instrumentation
- `src/main.ts` — initializes observability (line ~100)

**Implementation Pattern:**
```typescript
// Before
import tracerService from './tracer';
tracerService.startSpan(name, attrs);

// After
import { getTracerService } from './observability';
const tracer = await getTracerService();
tracer?.startSpan(name, attrs) ?? noop();
```

**Files to Modify:**
- `src/lib/observability/index.ts` (refactor init + add getters)
- `src/lib/observability/tracer.ts` (remove default export)
- `src/lib/observability/errorReporter.ts` (remove default export)
- `src/lib/withSpan.ts` (use getTracer())
- `src/scenes/LevelScene.ts` (await getTracer())
- `src/lib/levelSceneHintFlow.ts` (await getTracer())
- `src/persistence/middleware.ts` (await getTracer())
- `src/main.ts` (already does lazy-init)

---

## Work Item 2: Per-Chunk Budgets

**Goal:** Add per-chunk size enforcement to `scripts/measure-bundle.mjs`.

**Current State:**
- measure-bundle.mjs only checks total budget (1 MB)
- No per-chunk limits defined
- Target budgets: phaser ≤380 KB, scenes ≤100 KB, observability ≤12 KB

**Approach:**
1. Parse chunk names from filenames (regex: `phaser-*.js`, `scenes-*.js`, `observability-*.js`)
2. Track individual chunk gzipped sizes
3. Define per-chunk budget map (in KB)
4. Report per-chunk status (PASS/FAIL) alongside total
5. Exit with code 1 if ANY per-chunk budget is exceeded

**Budget Map:**
```javascript
const CHUNK_BUDGETS = {
  phaser: 380,        // 380 KB gz (currently 350, 86% utilization)
  scenes: 100,        // 100 KB gz (currently 86, 86% utilization)
  observability: 12,  // 12 KB gz (currently 8.9, 74% utilization)
  dexie: 35,          // 35 KB gz (currently 31, 89% utilization)
};
```

**Files to Modify:**
- `scripts/measure-bundle.mjs` (add per-chunk tracking + budgets)

---

## Work Item 3: Brotli Measurement

**Goal:** Measure Brotli compression alongside gzip for future CDN optimization.

**Current State:**
- Only gzip is measured (via `zlib.gzipSync()`)
- Brotli measurement exists in BUNDLE_ANALYZE mode via rollup-plugin-visualizer
- Need parallel measurement in measure-bundle.mjs

**Approach:**
1. Import Node.js `zlib` BrotliCompress (available since Node 10.16)
2. Measure both gzip and brotli for each chunk
3. Report both metrics (rows show: raw | gzip | brotli)
4. Use brotli sizes for per-chunk budgets (more realistic for modern CDNs)
5. Keep gzip as primary metric for backwards-compat

**Implementation:**
```javascript
import { gzipSync, brotliCompressSync } from 'node:zlib';

for (const f of files) {
  const raw = readFileSync(join(distDir, f));
  const gz = gzipSync(raw).length;
  const br = brotliCompressSync(raw).length;
  rows.push({ file: f, raw: raw.length, gz, br });
}
```

**Files to Modify:**
- `scripts/measure-bundle.mjs` (add brotli measurement)

---

## Work Item 4: Source-Map Upload (Sentry)

**Goal:** Wire Sentry source-map upload so production errors link to readable source code.

**Current State:**
- Source maps are generated (`sourcemap: 'hidden'` in vite.config.ts)
- Maps live in dist/assets/*.js.map but are not uploaded
- Sentry is initialized but DSN-gated (no SDK in MVP builds)
- No build-time or post-deploy source-map upload

**Approach:**
1. Add a post-build hook in vite.config.ts that runs `sentry-cli releases files upload-sourcemaps`
2. Gate the hook on VITE_SENTRY_DSN and SENTRY_AUTH_TOKEN env vars
3. Create a .sentryrc file with project config
4. Document env vars required for upload in CLAUDE.md

**Implementation Pattern:**
```typescript
// In vite.config.ts build hook
{
  name: 'sentry-sourcemap-upload',
  apply: 'build',
  async writeBundle() {
    if (!process.env.VITE_SENTRY_DSN || !process.env.SENTRY_AUTH_TOKEN) return;
    await execSync('sentry-cli releases files upload-sourcemaps ./dist/assets --org=... --project=...');
  },
}
```

**Files to Modify:**
- `vite.config.ts` (add post-build hook + define VITE_SENTRY_* env vars)
- `.sentryrc` (create new — project config)
- `CLAUDE.md` (document SENTRY_AUTH_TOKEN and upload flow)

**Note:** OpenTelemetry source-map upload (Work Item 4b) is out of scope for Phase 13 — OTel traces do not require source maps (stack traces are not captured in the default SDK config).

---

## Work Item 5: Replace process.env with import.meta.env

**Goal:** Eliminate `process.env` checks in favor of Vite's `import.meta.env` for better tree-shaking.

**Current State:**
- `src/lib/cognitiveLoad.ts` line 51: `process.env['NODE_ENV'] === 'production'`
- `vite.config.ts` line 20: `process.env['NODE_ENV'] === 'production'`
- `vite.config.ts` line 88: `process.env['BUNDLE_ANALYZE']`

**Mapping:**
| Old | New | Notes |
|-----|-----|-------|
| `process.env['NODE_ENV'] === 'production'` | `!import.meta.env.DEV` | Vite sets DEV=true in dev, false in prod |
| `process.env['BUNDLE_ANALYZE']` | `import.meta.env.BUNDLE_ANALYZE` | Requires `define` in vite.config.ts |

**Files to Modify:**
- `src/lib/cognitiveLoad.ts` (replace process.env check)
- `vite.config.ts` (replace process.env checks + add BUNDLE_ANALYZE to define)

---

## Implementation Order

**Round 1 (Foundation):**
- Work Item 5: Replace process.env → import.meta.env (quick win, enables future work)
- Work Item 3: Add Brotli measurement to measure-bundle.mjs
- Work Item 2: Add per-chunk budgets to measure-bundle.mjs

**Round 2 (Lazy-Loading):**
- Work Item 1: Lazy-import observability wrappers

**Round 3 (Deployment):**
- Work Item 4: Wire Sentry source-map upload

---

## Verification

**After each work item:**
```bash
npm run typecheck          # No TS errors
npm run lint              # No lint warnings
npm run test:unit         # All tests pass
npm run measure-bundle    # ≤1 MB total + per-chunk budgets pass
```

**Phase completion gate:**
```bash
npm run build             # Full build (tsc + vite + curriculum)
npm run test:a11y         # No accessibility regressions
npm run measure-bundle    # Final measurement
```

**bundle-watcher subagent audit:**
- Run after measure-bundle passes
- Confirms all chunk budgets enforced + no regression from Phase 12

---

## Critical Files

- `src/lib/observability/index.ts` — facade for tracer + error reporter
- `src/lib/observability/tracer.ts` — OTel wrapper (lazy-load)
- `src/lib/observability/errorReporter.ts` — Sentry wrapper (lazy-load)
- `scripts/measure-bundle.mjs` — bundle measurement + budgets
- `vite.config.ts` — chunk splitting + source-map upload
- `src/lib/cognitiveLoad.ts` — process.env migration
- `PLANS/PLAN.md` — update with Phase 13 completion notes

---

## Rollback Plan

If per-chunk budgets are exceeded:
1. Check if lazy-loading actually saved space (measure-bundle output)
2. If savings < expected, investigate dead-code elimination
3. If chunks are legitimately over-budget, adjust limits upward (but document why)
4. Never remove per-chunk budgets — they enforce architecture discipline

If source-map upload fails:
1. Check SENTRY_AUTH_TOKEN is set
2. Verify .sentryrc project config matches Sentry org/project
3. Errors are safe to ignore in CI if SENTRY_AUTH_TOKEN is unset (test env)
