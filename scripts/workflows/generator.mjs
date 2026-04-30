/**
 * Workflow generator — deterministic YAML generation from config constants.
 * Run with: npm run gen:workflows
 *
 * Ensures browser list, port, and test params are always in sync across:
 *  - ci.yml (playwright install --with-deps <BROWSERS>)
 *  - synthetic-playtest.yml (wait-on http://localhost:<PORT>)
 *
 * These constants must match src/config/shared.ts.
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

// Must match src/config/shared.ts
const DEV_PORT = 5000
const BROWSERS = ['chromium', 'webkit']

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = path.resolve(__dirname, '..', '..')
const WORKFLOWS_DIR = path.join(REPO_ROOT, '.github/workflows')

// Ensure workflows directory exists
if (!fs.existsSync(WORKFLOWS_DIR)) {
  fs.mkdirSync(WORKFLOWS_DIR, { recursive: true })
}

/**
 * Generate ci.yml — the main CI pipeline
 */
function generateCiWorkflow() {
  const yaml = `name: CI

on:
  push:
  pull_request:

concurrency:
  group: \${{ github.workflow }}-\${{ github.ref }}
  cancel-in-progress: true

jobs:
  test:
    runs-on: ubuntu-latest
    timeout-minutes: 20

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '24'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Agent harness health check
        run: npm run agent-doctor

      - name: Typecheck
        run: npm run typecheck

      - name: Lint
        run: npm run lint

      - name: Unit tests
        run: npm run test:unit

      - name: Integration tests
        run: npm run test:integration

      - name: Install Playwright browsers
        run: npx playwright install --with-deps ${BROWSERS.join(' ')}

      - name: E2E tests
        run: npm run test:e2e

      - name: A11y tests
        run: npm run test:a11y

      - name: Production build
        run: npm run build

      # Hard gate — per docs/30-architecture/performance-budget.md §1
      # 1.0 MB gzipped = 1,048,576 bytes
      - name: Bundle size guard
        run: |
          GZ=$(find dist -name '*.js' -exec gzip -c {} \\; | wc -c)
          echo "Gzipped JS total: \${GZ} bytes (budget: 1048576)"
          if [ "\$GZ" -gt 1048576 ]; then
            echo "ERROR: Bundle exceeds 1.0 MB gzipped budget (\${GZ} > 1048576)"
            echo "Run: npx vite-bundle-visualizer to identify the offending chunk."
            exit 1
          fi
`
  return yaml
}

/**
 * Generate synthetic-playtest.yml — scheduled playtest workflow
 */
function generateSyntheticPlaytestWorkflow() {
  const yaml = `name: Synthetic Playtest

on:
  schedule:
    - cron: '0 6 * * 1' # Every Monday 06:00 UTC
  workflow_dispatch: # On-demand manual trigger

jobs:
  playtest:
    runs-on: ubuntu-latest
    timeout-minutes: 45

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci --legacy-peer-deps

      - name: Install Playwright Chromium
        run: npx playwright install --with-deps chromium

      - name: Build app (required for Vite dev server)
        run: npm run build:curriculum

      - name: Start Vite dev server
        run: npm run dev:app &
      - name: Wait for server
        run: npx wait-on http://localhost:${DEV_PORT} --timeout 30000

      - name: Run synthetic playtest (quick mode)
        run: npm run playtest:synthetic:quick

      - name: Upload results
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: synthetic-playtest-results
          path: tests/synthetic/results/
          retention-days: 30
`
  return yaml
}

// Write generated workflows
const workflows = {
  'ci.yml': generateCiWorkflow(),
  'synthetic-playtest.yml': generateSyntheticPlaytestWorkflow(),
}

for (const [filename, content] of Object.entries(workflows)) {
  const filepath = path.join(WORKFLOWS_DIR, filename)
  fs.writeFileSync(filepath, content, 'utf8')
  console.log(`✓ Generated ${filename}`)
}

console.log(`\nWorkflows generated from config (port=${DEV_PORT}, browsers=${BROWSERS.join(',')})`)
