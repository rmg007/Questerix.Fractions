/**
 * check-curriculum-sync.mjs
 * Verifies that public/curriculum/v1.json and src/curriculum/bundle.json are byte-identical.
 *
 * Runs at pre-push and in CI to catch bundle drift before commit.
 * Emits clear error message if files are out of sync.
 *
 * Exit codes:
 *   0 = files are in sync (byte-identical SHA256)
 *   1 = files are out of sync or cannot be read
 *
 * Run via: node scripts/check-curriculum-sync.mjs
 * Wired to: .husky/pre-push and CI workflows
 */

import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT = resolve(__dirname, '..');

function checkCurriculumSync() {
  const v1Path = join(ROOT, 'public', 'curriculum', 'v1.json');
  const bundlePath = join(ROOT, 'src', 'curriculum', 'bundle.json');

  let v1Content;
  let bundleContent;

  // Read both files
  try {
    v1Content = readFileSync(v1Path, 'utf8');
  } catch (err) {
    console.error(`[check-curriculum-sync] ✗ Cannot read ${v1Path}: ${err.message}`);
    console.error(`[check-curriculum-sync] Curriculum bundles are out of sync. Run: npm run build:curriculum`);
    process.exit(1);
  }

  try {
    bundleContent = readFileSync(bundlePath, 'utf8');
  } catch (err) {
    console.error(`[check-curriculum-sync] ✗ Cannot read ${bundlePath}: ${err.message}`);
    console.error(`[check-curriculum-sync] Curriculum bundles are out of sync. Run: npm run build:curriculum`);
    process.exit(1);
  }

  // Compute SHA256 hashes of file contents (byte-identity check)
  const v1Hash = createHash('sha256').update(v1Content).digest('hex');
  const bundleHash = createHash('sha256').update(bundleContent).digest('hex');

  // Compare hashes
  if (v1Hash !== bundleHash) {
    console.error(`[check-curriculum-sync] ✗ Curriculum bundles are out of sync!`);
    console.error(`[check-curriculum-sync]   public/curriculum/v1.json:     ${v1Hash.slice(0, 16)}...`);
    console.error(`[check-curriculum-sync]   src/curriculum/bundle.json:    ${bundleHash.slice(0, 16)}...`);
    console.error(`[check-curriculum-sync]`);
    console.error(`[check-curriculum-sync] To resync: npm run build:curriculum`);
    process.exit(1);
  }

  // Parse and validate both files have matching content structure
  let v1;
  let bundle;

  try {
    v1 = JSON.parse(v1Content);
    bundle = JSON.parse(bundleContent);
  } catch (err) {
    console.error(`[check-curriculum-sync] ✗ JSON parse error: ${err.message}`);
    process.exit(1);
  }

  // Verify contentVersion matches (ensures semantic alignment)
  if (v1.contentVersion !== bundle.contentVersion) {
    console.error(`[check-curriculum-sync] ✗ contentVersion mismatch!`);
    console.error(`[check-curriculum-sync]   v1.json:     ${v1.contentVersion}`);
    console.error(`[check-curriculum-sync]   bundle.json: ${bundle.contentVersion}`);
    console.error(`[check-curriculum-sync] To resync: npm run build:curriculum`);
    process.exit(1);
  }

  // Success: files are in sync
  const templateCount = Object.values(bundle.levels ?? {}).reduce(
    (n, arr) => n + (Array.isArray(arr) ? arr.length : 0),
    0
  );

  console.log(`[check-curriculum-sync] ✓ Curriculum bundles are in sync (SHA256: ${v1Hash.slice(0, 8)}... · ${templateCount} templates)`);
  process.exit(0);
}

checkCurriculumSync();
