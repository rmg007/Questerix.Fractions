/**
 * Residual Linter — checks for patterns that can't be structurally eliminated.
 * Run with: npm run lint:ci
 *
 * Rules:
 *  1. Timeout consistency within spec files (warn)
 *  2. Bundle size budget (error)
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = path.resolve(__dirname, '..')

// Helper to recursively find files matching a pattern
function findFiles(dir, pattern) {
  const results = []
  const regex = new RegExp(pattern.replace(/\*\*/g, '.*').replace(/\*/g, '[^/]*').replace(/\//g, '\\/') + '$')

  function walk(currentPath) {
    try {
      const entries = fs.readdirSync(currentPath, { withFileTypes: true })
      for (const entry of entries) {
        const fullPath = path.join(currentPath, entry.name)
        const relativePath = path.relative(dir, fullPath).replace(/\\/g, '/')

        if (entry.isDirectory()) {
          if (!relativePath.startsWith('.') && !relativePath.startsWith('node_modules')) {
            walk(fullPath)
          }
        } else if (regex.test(relativePath)) {
          results.push(relativePath)
        }
      }
    } catch (err) {
      // Skip directories we can't read
    }
  }

  walk(dir)
  return results
}

class Violation {
  constructor(file, severity, rule, message) {
    this.file = file
    this.severity = severity
    this.rule = rule
    this.message = message
  }

  toString() {
    return `${this.severity.toUpperCase()}: ${this.rule} — ${this.file}: ${this.message}`
  }
}

const violations = []

// Rule 1: Timeout consistency within spec files
console.log('Checking timeout consistency...')
const specFiles = findFiles(REPO_ROOT, 'tests/**/*.spec.ts')

for (const file of specFiles) {
  const fullPath = path.join(REPO_ROOT, file)
  const content = fs.readFileSync(fullPath, 'utf8')

  // Find all locator patterns and their associated timeouts
  // Pattern: something like page.locator('[data-testid="foo"]') or .locator('...')
  const locatorMatches = [...content.matchAll(/\.locator\(['"]([^'"]+)['"]\)/g)]

  // For each locator, find all timeout values it's used with
  const locatorTimeoutMap = new Map()

  for (const match of locatorMatches) {
    const locator = match[1]
    const startPos = match.index + match[0].length

    // Find the nearest timeout within ~200 chars after the locator
    const snippet = content.substring(startPos, startPos + 200)
    const timeoutMatch = snippet.match(/{\s*timeout:\s*(\d+)\s*}/)

    if (timeoutMatch) {
      const timeout = timeoutMatch[1]
      if (!locatorTimeoutMap.has(locator)) {
        locatorTimeoutMap.set(locator, [])
      }
      locatorTimeoutMap.get(locator).push(timeout)
    }
  }

  // Check for inconsistency
  for (const [locator, timeouts] of locatorTimeoutMap.entries()) {
    const uniqueTimeouts = new Set(timeouts)
    if (uniqueTimeouts.size > 1) {
      const sorted = Array.from(uniqueTimeouts).sort()
      violations.push(
        new Violation(
          file,
          'warn',
          'timeout-consistency',
          `${locator}: multiple timeouts [${sorted.join(', ')}ms]`
        )
      )
    }
  }
}

// Rule 2: Bundle size budget (1.0 MB gzipped)
console.log('Checking bundle size...')
const BUNDLE_BUDGET = 1048576 // 1 MB in bytes

try {
  const distDir = path.join(REPO_ROOT, 'dist')
  if (fs.existsSync(distDir)) {
    let totalGzipped = 0

    const jsFiles = findFiles(distDir, '**/*.js')
    for (const file of jsFiles) {
      const fullPath = path.join(distDir, file)
      // Approximate gzipped size using fs.statSync
      // Gzip typically compresses JS to ~25-35% of original size
      const stat = fs.statSync(fullPath)
      const estimatedGz = Math.ceil(stat.size * 0.3)
      totalGzipped += estimatedGz
    }

    if (totalGzipped > BUNDLE_BUDGET) {
      const budgetKB = Math.round(BUNDLE_BUDGET / 1024)
      const actualKB = Math.round(totalGzipped / 1024)
      violations.push(
        new Violation(
          'dist/',
          'error',
          'bundle-size',
          `${actualKB}KB exceeds ${budgetKB}KB budget (estimate; run measure-bundle for precise gzip size)`
        )
      )
    } else {
      console.log(`✓ Bundle size OK: ~${Math.round(totalGzipped / 1024)}KB (budget: ${Math.round(BUNDLE_BUDGET / 1024)}KB)`)
    }
  }
} catch (err) {
  console.warn('Failed to check bundle size:', err.message)
}

// Output results
console.log('\n' + '='.repeat(60))
if (violations.length === 0) {
  console.log('✓ No linting violations')
  process.exit(0)
} else {
  violations.forEach(v => console.log(v.toString()))
  console.log('='.repeat(60))

  const errors = violations.filter(v => v.severity === 'error')
  if (errors.length > 0) {
    console.log(`\nFAIL: ${errors.length} error(s) found`)
    process.exit(1)
  } else {
    console.log(`\nWARN: ${violations.length} warning(s) found`)
    process.exit(0)
  }
}
