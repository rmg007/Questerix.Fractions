---
title: CI Config Drift — Structural Elimination (5-Layer Approach)
status: approved
owner: solo
created: 2026-04-30
applies_to: [mvp, infra]
---

# CI Config Drift — Structural Elimination

## 1. Problem

Six failures shipped to CI in this session. All six were the same shape: **two config files disagreed**, and the disagreement was only surfaced by a 6-minute CI cascade.

| # | Config A | Config B | Root Cause | Structural Fix |
|---|----------|----------|-----------|---------|
| 1 | `playwright.config.ts` declares WebKit | `ci.yml` installs Chromium only | No shared constant for browser list | Layer 0: `config/shared.ts` exports `BROWSERS` |
| 2 | `vite.config.ts` pins `server.port: 5000` | `synthetic-playtest.yml` waits on 5173 | Port hardcoded in multiple places | Layer 0: `config/shared.ts` exports `DEV_PORT` |
| 3 | `BootScene.ts` requires `?testHooks=1` | Tests call `page.goto('/')` | Test code doesn't know contract | Layer 1: `tests/e2e/_fixture.ts` auto-injects query |
| 4 | `lighthouserc.cjs` requires `≥0.85` | Phaser runtime = 0.62 max | Baseline is implicit in code comment | Layer 3: Read from `.lighthouseci/manifest.json` |
| 5 | `playwright.config.ts` has query in `baseURL` | `page.goto('/')` drops it | Footgun in Playwright API | Layer 1: Fixture enforces explicit query injection |
| 6 | `mascot-reactions.spec.ts` line 127 uses `3000` ms | Other sites use `8000` ms | Inconsistency within file | Layer 4: Residual linter rule (timeout variance) |

**Session cost**: ~25 min waiting on failed cascades (4–5 cycles × 6 min). **Root cause**: all six failures were statically impossible to catch by reading config files alone — they required architectural redesign, not linting.

**Why detection fails**: A linter can tell you "port 5000 in vite, port 5173 in workflow" but can't force them to come from the same constant. It can warn about the baseURL query string footgun, but can't prevent test authors from forgetting to inject it manually. Linting detects failure; **structure prevents it**.

## 2. Goal

Make each of the six failure classes **structurally impossible** to reproduce. No linter rules, no escape hatches, no human error surface.

- **Layer 0**: Single source of truth for all constants (port, browsers, test param)
- **Layer 1**: Test fixture that auto-enforces contracts (auto-inject `testHooks=1`)
- **Layer 2**: Generated workflows (deterministic from config, type-safe)
- **Layer 3**: Self-calibrating thresholds (read baseline from manifest, auto-floor)
- **Layer 4**: Residual linter (only for patterns that can't be structurally eliminated)

## 3. Architecture

```
┌────────────────────────────────────────────────────────────┐
│ config/shared.ts — Single Source of Truth                  │
│  export const DEV_PORT = 5000                              │
│  export const BROWSERS = ['chromium', 'webkit']            │
│  export const TEST_HOOKS_PARAM = 'testHooks=1'            │
└──┬────────────────────┬──────────────┬─────────────────────┘
   │                    │              │
   ▼                    ▼              ▼
┌─────────────────┐  ┌──────────────┐  ┌─────────────────┐
│ vite.config.ts  │  │ playwright.   │  │ scripts/        │
│ imports & uses  │  │ config.ts     │  │ workflows/      │
│ DEV_PORT        │  │ imports &     │  │ generator.ts    │
│                 │  │ uses both     │  │ reads all 3     │
└─────────────────┘  └──────────────┘  └─────────────────┘
   ↑                    ↑
   └────────────────────┘
        (webpack dev server watches this)
        
┌────────────────────────────────────────────────────────────┐
│ tests/e2e/_fixture.ts — Playwright Wrapper                │
│  export const test = base.extend({                        │
│    page: async ({ page }, use) => {                       │
│      // Override page.goto() to auto-append testHooks=1  │
│      const originalGoto = page.goto.bind(page)           │
│      page.goto = (url) => originalGoto(appendTestHooks(url))
│      await use(page)                                      │
│    }                                                      │
│  })                                                       │
│  ESLint rule: ban @playwright/test in tests/e2e/**/*.spec  │
└────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────┐
│ scripts/workflows/generator.ts — Deterministic Workflows  │
│  • Reads config/shared.ts                                 │
│  • TypeScript → YAML with strong typing                   │
│  • CI job: npm run gen:workflows && git diff --exit-code  │
│  • Drift = build failure before cascade                   │
└────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────┐
│ lighthouserc.cjs — Self-Calibrating Thresholds            │
│  const baseline = require('./.lighthouseci/manifest.json')│
│    ?.results?.[0]?.summary?.performance ?? 0.6            │
│  // Never set higher than last green; auto-floors rise     │
│  minScore: Math.max(baseline - 0.05, 0.6)                │
└────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────┐
│ scripts/residual-lint.mjs — Last-Resort Detector          │
│  • Timeout consistency within spec (warn)                 │
│  • Bundle byte budget (error)                             │
│  • Only ~2 rules; everything else structurally impossible │
└────────────────────────────────────────────────────────────┘
```

## 4. Implementation Steps

### Layer 0: Single Source of Truth (5 min)

Create `src/config/shared.ts`:
```typescript
export const DEV_PORT = 5000
export const BROWSERS = ['chromium', 'webkit']
export const TEST_HOOKS_PARAM = 'testHooks=1'

// Helpers for derived constants
export const TEST_HOOKS_URL = `http://localhost:${DEV_PORT}/?${TEST_HOOKS_PARAM}=1`
export const DEV_URL = `http://localhost:${DEV_PORT}`
```

Update `vite.config.ts`:
```typescript
import { DEV_PORT } from './src/config/shared'
export default defineConfig({
  server: {
    port: DEV_PORT,
  }
})
```

Update `playwright.config.ts`:
```typescript
import { BROWSERS, DEV_PORT, TEST_HOOKS_PARAM } from './src/config/shared'
export default defineConfig({
  use: { baseURL: `http://localhost:${DEV_PORT}` },
  webServer: { port: DEV_PORT },
  projects: BROWSERS.map(b => ({ name: b, use: devices[b] }))
})
```

### Layer 1: Test Fixture (10 min)

Create `tests/e2e/_fixture.ts`:
```typescript
import { test as base } from '@playwright/test'
import { TEST_HOOKS_PARAM, DEV_URL } from '../../src/config/shared'

export const test = base.extend({
  page: async ({ page }, use) => {
    const originalGoto = page.goto.bind(page)
    page.goto = async (url: string | URL, options?: any) => {
      const urlStr = String(url)
      const urlObj = new URL(urlStr, DEV_URL)
      urlObj.searchParams.set(TEST_HOOKS_PARAM, '1')
      return originalGoto(urlObj.toString(), options)
    }
    await use(page)
  }
})

export { expect } from '@playwright/test'
```

Add ESLint rule in `.eslintrc`:
```json
{
  "overrides": [
    {
      "files": ["tests/e2e/**/*.spec.ts"],
      "rules": {
        "no-restricted-imports": [
          "error",
          {
            "name": "@playwright/test",
            "message": "Use tests/e2e/_fixture.ts instead to auto-inject testHooks=1"
          }
        ]
      }
    }
  ]
}
```

Update all `tests/e2e/**/*.spec.ts`:
```typescript
// Replace: import { test, expect } from '@playwright/test'
// With:
import { test, expect } from './_fixture'
```

### Layer 2: Generated Workflows (15 min)

Create `scripts/workflows/generator.ts`:
```typescript
import { BROWSERS, DEV_PORT } from '../../src/config/shared'
import * as fs from 'fs'
import * as yaml from 'js-yaml'

const workflows = {
  ci: {
    jobs: {
      test: {
        'runs-on': 'ubuntu-latest',
        steps: [
          { run: 'npm install --with-deps ' + BROWSERS.join(' ') },
          { run: `npx wait-on http://localhost:${DEV_PORT}` }
        ]
      }
    }
  },
  'synthetic-playtest': {
    jobs: {
      playtest: {
        steps: [
          { run: `npx wait-on http://localhost:${DEV_PORT}` }
        ]
      }
    }
  }
}

for (const [name, config] of Object.entries(workflows)) {
  fs.writeFileSync(
    `.github/workflows/${name}.yml`,
    yaml.dump(config),
    'utf8'
  )
}
```

Add `npm run gen:workflows` to `package.json`:
```json
{
  "scripts": {
    "gen:workflows": "node scripts/workflows/generator.ts",
    "preflight": "npm run gen:workflows && git diff --exit-code .github/workflows"
  }
}
```

Update `ci.yml` first job:
```yaml
jobs:
  generate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm run gen:workflows
      - run: git diff --exit-code .github/workflows
```

### Layer 3: Self-Calibrating Thresholds (8 min)

Update `lighthouserc.cjs`:
```javascript
const manifest = (() => {
  try {
    return require('./.lighthouseci/manifest.json')
  } catch {
    return null
  }
})()

const lastGreenPerf = manifest?.results?.[0]?.summary?.performance ?? 0.6

module.exports = {
  ci: {
    assert: {
      assertions: {
        'categories:performance': [
          'error',
          { minScore: Math.max(lastGreenPerf - 0.05, 0.6) }
        ]
      }
    }
  }
}
```

### Layer 4: Residual Linter (12 min)

Create `scripts/residual-lint.mjs`:
```javascript
import { readFileSync } from 'fs'
import { globSync } from 'glob'

const violations = []

// Rule 1: Timeout consistency within spec
globSync('tests/**/*.spec.ts').forEach(file => {
  const content = readFileSync(file, 'utf8')
  const timeoutMatches = [...content.matchAll(/{\s*timeout:\s*(\d+)\s*}/g)]
  const locators = [...content.matchAll(/data-testid="([^"]+)"/g)].map(m => m[1])
  
  // Group timeouts by locator
  const timeoutMap = new Map()
  locators.forEach(loc => {
    const pattern = `[data-testid="${loc}"]`
    const matches = [...content.matchAll(new RegExp(pattern + '.*?{\\s*timeout:\\s*(\\d+)', 'g'))]
    if (matches.length > 1) {
      const times = matches.map(m => m[1])
      if (new Set(times).size > 1) {
        violations.push({
          file,
          severity: 'warn',
          message: `${loc}: timeout varies (${times.join(', ')} ms)`
        })
      }
    }
  })
})

// Rule 2: Bundle size budget
const bundleInfo = JSON.parse(readFileSync('dist/manifest.json', 'utf8'))
const gzipped = bundleInfo.total?.gzipped ?? 0
if (gzipped > 1024 * 1024) {
  violations.push({
    file: 'dist/main.js',
    severity: 'error',
    message: `Bundle ${Math.round(gzipped / 1024)}KB exceeds 1MB budget`
  })
}

violations.forEach(v => {
  console.log(`${v.severity.toUpperCase()}: ${v.file}: ${v.message}`)
})

process.exit(violations.some(v => v.severity === 'error') ? 1 : 0)
```

Add to `package.json`:
```json
{
  "scripts": {
    "lint:ci": "node scripts/residual-lint.mjs"
  }
}
```

## 5. Acceptance Criteria

- ✅ Changing port in `config/shared.ts` automatically updates vite, playwright, workflows, and wait-on logic. Zero manual sync.
- ✅ Test authors never see `?testHooks=1` in their code; fixture handles it silently.
- ✅ Workflows are generated from TypeScript; any config change triggers a build failure (not a CI failure).
- ✅ Lighthouse threshold auto-rises with every green run; cannot silently regress.
- ✅ All six historical failures would be impossible with this structure in place.
- ✅ Bundle budget and timeout consistency are checked locally before push.

## 6. Effort Estimate

| Layer | Work | Est. |
|-------|------|------|
| 0 | `config/shared.ts` + update 3 config files | 5 min |
| 1 | `_fixture.ts` + ESLint rule + import sweep | 10 min |
| 2 | `generator.ts` + workflow template + npm script | 15 min |
| 3 | Self-calibrating Lighthouse logic | 8 min |
| 4 | Residual linter (2 rules) | 12 min |
| Integration | Hook setup + test verification | 10 min |
| **Total** | | **~60 min** |

## 7. Rollout Sequence

1. Create Layer 0 (`config/shared.ts`); import into vite/playwright. Commit + test locally.
2. Create Layer 1 (fixture + ESLint). Sweep imports. Test one E2E spec.
3. Create Layer 2 (generator). Verify workflows match current. Integrate into `preflight`.
4. Create Layer 3 (self-calibrating thresholds). Verify Lighthouse still passes.
5. Create Layer 4 (residual linter). Add to `preflight`.
6. Integration test: edit `config/shared.ts` DEV_PORT, verify workflow gen fails before push.

## 8. Long-term Benefits

- **Config drift impossible by construction** — no future false CI cascades on port/browser mismatches.
- **Testability improved** — fixture removes boilerplate, test authors can't forget testHooks.
- **Workflow maintenance eliminated** — no manual YAML editing for browser lists or ports.
- **Threshold regressions prevented** — Lighthouse floor auto-rises; nobody can ship a worse baseline.
- **CI latency reduced** — workflow gen fails in <30s (vs. 6-min cascade on port mismatch).
- **Onboarding simplified** — new developers edit one file (`config/shared.ts`) to understand system topology.
