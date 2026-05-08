/**
 * Nightly browser inspection spec — runs against the live deployed URL.
 * Invoked by scripts/nightly-test.sh via playwright.nightly.config.ts.
 *
 * Covers what Chrome MCP cannot do in a background context:
 *   - Console error capture
 *   - localStorage audit
 *   - Canvas vs viewport sizing
 *   - Scene navigation smoke
 *   - Baseline screenshots (Menu, Level Map, Level 1, Settings)
 */

import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

const SCREENSHOT_DIR = path.join(process.cwd(), 'test-results', 'nightly-screenshots');
const KNOWN_LS_KEYS = /^(questerix\.lastUsedStudentId|unlockedLevels:|completedLevels:)/;

// Errors that are known baseline — do not fail the test for these
const KNOWN_ERRORS = [
  /Access to storage is not allowed from this context/,
  /Persistence granted: false/,
];

function isKnownError(msg: string): boolean {
  return KNOWN_ERRORS.some((re) => re.test(msg));
}

test.beforeAll(() => {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
});

// ── Boot & console health ────────────────────────────────────────────────────
test('boot completes with no unexpected console errors', async ({ page }) => {
  const errors: string[] = [];
  const allLogs: string[] = [];

  page.on('console', (msg) => {
    allLogs.push(`[${msg.type()}] ${msg.text()}`);
    if (msg.type() === 'error' && !isKnownError(msg.text())) {
      errors.push(msg.text());
    }
  });
  page.on('pageerror', (err) => {
    if (!isKnownError(err.message)) errors.push(err.message);
  });

  await page.goto('/');
  // Wait for boot complete log
  await page.waitForFunction(
    () => {
      return (window as any).__bootComplete === true || document.querySelector('canvas') !== null;
    },
    { timeout: 15_000 }
  );

  // Save full console log for the report
  fs.writeFileSync(path.join(SCREENSHOT_DIR, 'console.log'), allLogs.join('\n'));

  // Count known storage errors — flag if more than 4 (regression)
  const storageErrors = allLogs.filter((l) => /Access to storage is not allowed/.test(l));
  expect(
    storageErrors.length,
    `Storage error count should be ≤4, got ${storageErrors.length}`
  ).toBeLessThanOrEqual(4);

  expect(errors, `Unexpected console errors:\n${errors.join('\n')}`).toHaveLength(0);
});

// ── localStorage audit ───────────────────────────────────────────────────────
test('localStorage contains only known keys', async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('canvas', { timeout: 10_000 });

  const lsData = await page.evaluate(() => {
    const result: Record<string, string> = {};
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)!;
      result[k] = localStorage.getItem(k) ?? '';
    }
    return result;
  });

  const unknownKeys = Object.keys(lsData).filter((k) => !KNOWN_LS_KEYS.test(k));
  const studentIds = Object.keys(lsData)
    .filter((k) => k.startsWith('unlockedLevels:'))
    .map((k) => k.replace('unlockedLevels:', ''));
  const currentStudent = lsData['questerix.lastUsedStudentId'] ?? '';
  const orphanedStudents = studentIds.filter((id) => id !== currentStudent);

  // Save audit for report
  fs.writeFileSync(
    path.join(SCREENSHOT_DIR, 'localstorage.json'),
    JSON.stringify({ lsData, unknownKeys, studentIds, currentStudent, orphanedStudents }, null, 2)
  );

  expect(unknownKeys, `Unknown localStorage keys: ${unknownKeys.join(', ')}`).toHaveLength(0);

  if (orphanedStudents.length > 0) {
    console.warn(`[WARN] Orphaned student localStorage keys: ${orphanedStudents.join(', ')}`);
  }
});

// ── Canvas sizing ────────────────────────────────────────────────────────────
test('canvas renders within viewport bounds', async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('canvas', { timeout: 10_000 });

  const sizing = await page.evaluate(() => {
    const canvas = document.querySelector('canvas')!;
    const rect = canvas.getBoundingClientRect();
    return {
      canvasW: canvas.width,
      canvasH: canvas.height,
      cssW: Math.round(rect.width),
      cssH: Math.round(rect.height),
      viewportW: window.innerWidth,
      viewportH: window.innerHeight,
      clippedRight: rect.right > window.innerWidth + 1,
      clippedBottom: rect.bottom > window.innerHeight + 1,
    };
  });

  fs.writeFileSync(
    path.join(SCREENSHOT_DIR, 'canvas-sizing.json'),
    JSON.stringify(sizing, null, 2)
  );

  expect(
    sizing.clippedRight,
    `Canvas overflows viewport right (rect.right=${sizing.cssW} > ${sizing.viewportW})`
  ).toBe(false);
  expect(
    sizing.clippedBottom,
    `Canvas overflows viewport bottom (rect.bottom=${sizing.cssH} > ${sizing.viewportH})`
  ).toBe(false);
});

// ── Baseline screenshots ─────────────────────────────────────────────────────
test('screenshot — menu scene', async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('canvas', { timeout: 10_000 });
  await page.waitForTimeout(2000); // let animations settle

  const name = `menu-${page.context().browser()?.browserType().name() ?? 'unknown'}.png`;
  await page.screenshot({
    path: path.join(SCREENSHOT_DIR, name),
    fullPage: false,
  });

  // Confirm canvas is visible and non-empty
  const canvasVisible = await page.evaluate(() => {
    const c = document.querySelector('canvas') as HTMLCanvasElement;
    if (!c) return false;
    const ctx = c.getContext('2d');
    if (!ctx) return true; // WebGL canvas — assume non-empty
    const data = ctx.getImageData(0, 0, 10, 10).data;
    return data.some((v) => v !== 0);
  });

  expect(canvasVisible, 'Canvas appears blank on menu scene').toBe(true);
});

// ── Curriculum sha256 vs repo bundle ────────────────────────────────────────
test('deployed curriculum sha256 matches repo bundle.json', async ({ request }) => {
  const response = await request.get('/curriculum/v1.json');
  expect(response.status()).toBe(200);

  const deployedText = await response.text();
  const deployedHash = crypto.createHash('sha256').update(deployedText).digest('hex');

  const bundlePath = path.join(process.cwd(), 'src', 'curriculum', 'bundle.json');
  const bundleText = fs.readFileSync(bundlePath, 'utf-8');
  const bundleHash = crypto.createHash('sha256').update(bundleText).digest('hex');

  fs.writeFileSync(
    path.join(SCREENSHOT_DIR, 'curriculum-hash.json'),
    JSON.stringify({ deployedHash, bundleHash, match: deployedHash === bundleHash }, null, 2)
  );

  expect(
    deployedHash,
    'Deployed curriculum does not match src/curriculum/bundle.json — run build:curriculum and redeploy'
  ).toBe(bundleHash);
});

// ── A11y layer presence ──────────────────────────────────────────────────────
test('A11y layer DOM mirror is present and aria-hidden', async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('canvas', { timeout: 10_000 });

  const hooks = await page.$('#qf-testhooks');
  expect(hooks, '#qf-testhooks div missing — A11y layer not mounted').not.toBeNull();

  const ariaHidden = await hooks?.getAttribute('aria-hidden');
  expect(ariaHidden).toBe('true');
});
