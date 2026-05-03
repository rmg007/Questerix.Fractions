/**
 * build-curriculum.mjs
 * Bundles pipeline/output/level_NN/all.json files into public/curriculum/v1.json.
 *
 * Rules:
 * - Skip records where manual_review === true
 * - Keep only records whose archetype matches the level's expected list
 * - Silently skip levels whose pipeline output is missing (idempotent)
 *
 * Run via: node scripts/build-curriculum.mjs
 * Wired as "build:curriculum" npm script; called by "prebuild".
 */

import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT = resolve(__dirname, '..');

/** Archetypes allowed per level — matches architecture spec exactly. */
const LEVEL_ARCHETYPES = {
  '01': ['partition', 'identify'],
  '02': ['partition', 'identify'],
  '03': ['equal_or_not', 'label'],
  '04': ['make'],
  '05': ['snap_match'],
  '06': ['compare'],
  '07': ['compare'],
  '08': ['benchmark'],
  '09': ['order'],
};

const LEVELS = Object.keys(LEVEL_ARCHETYPES);

function buildBundle() {
  const levels = {};
  let totalIncluded = 0;
  let totalSkipped = 0;

  for (const levelKey of LEVELS) {
    const inputPath = join(ROOT, 'pipeline', 'output', `level_${levelKey}`, 'all.json');

    if (!existsSync(inputPath)) {
      // Pipeline run hasn't finished yet — skip silently
      console.log(`  [build-curriculum] L${levelKey}: missing ${inputPath} — skipping`);
      continue;
    }

    let raw;
    try {
      raw = JSON.parse(readFileSync(inputPath, 'utf8'));
    } catch (err) {
      console.warn(`  [build-curriculum] L${levelKey}: failed to parse JSON — skipping: ${err.message}`);
      continue;
    }

    if (!Array.isArray(raw)) {
      console.warn(`  [build-curriculum] L${levelKey}: expected array, got ${typeof raw} — skipping`);
      continue;
    }

    const allowed = LEVEL_ARCHETYPES[levelKey];
    const filtered = raw.filter((record) => {
      if (record.manual_review === true) {
        totalSkipped++;
        return false;
      }
      if (!allowed.includes(record.archetype)) {
        totalSkipped++;
        return false;
      }
      return true;
    });

    levels[levelKey] = filtered;
    totalIncluded += filtered.length;
    console.log(`  [build-curriculum] L${levelKey}: ${filtered.length} records included (${raw.length - filtered.length} skipped)`);
  }

  // Safety guard: if no pipeline output was found, preserve any existing
  // curriculum bundle rather than overwriting it with an empty one.
  // This prevents prebuild from wiping committed curriculum data in
  // environments where the pipeline has not been run.
  if (totalIncluded === 0) {
    const existingPath = join(ROOT, 'public', 'curriculum', 'v1.json');
    if (existsSync(existingPath)) {
      try {
        const existing = JSON.parse(readFileSync(existingPath, 'utf8'));
        const existingCount = Object.values(existing.levels ?? {}).reduce(
          (n, arr) => n + (Array.isArray(arr) ? arr.length : 0), 0
        );
        if (existingCount > 0) {
          console.log(`\n[build-curriculum] No pipeline output found — preserving existing bundle (${existingCount} templates). Run the pipeline first to regenerate.`);
          return 0;
        }
      } catch {
        // existing file is unreadable — fall through and write empty
      }
    }
  }

  // Compare content hash against existing files — skip writes when nothing changed.
  const contentHash = createHash('sha256').update(JSON.stringify({ version: 1, contentVersion: '1.0.0', levels })).digest('hex');

  const outDir = join(ROOT, 'public', 'curriculum');
  const outPath = join(outDir, 'v1.json');

  if (existsSync(outPath)) {
    try {
      const existing = JSON.parse(readFileSync(outPath, 'utf8'));
      const existingHash = createHash('sha256')
        .update(JSON.stringify({ version: existing.version, contentVersion: existing.contentVersion, levels: existing.levels }))
        .digest('hex');
      if (existingHash === contentHash) {
        console.log(`\n[build-curriculum] Content unchanged — skipping write (${totalIncluded} templates already current)`);
        return totalIncluded;
      }
    } catch {
      // unreadable — fall through and write fresh
    }
  }

  const bundle = {
    version: 1,
    contentVersion: '1.0.0',
    generatedAt: new Date().toISOString(),
    levels,
  };

  mkdirSync(outDir, { recursive: true });

  const bundleJson = JSON.stringify(bundle);
  writeFileSync(outPath, bundleJson);

  // Keep src/curriculum/bundle.json in sync so the static-import fallback in
  // loader.ts (used when fetch is unavailable in dev/Replit environments) always
  // reflects the latest curriculum build.
  const srcBundlePath = join(ROOT, 'src', 'curriculum', 'bundle.json');
  writeFileSync(srcBundlePath, bundleJson);

  // Verify byte-identity: both files must have identical SHA256 hashes
  const v1Hash = createHash('sha256').update(bundleJson).digest('hex');
  const bundleReadback = readFileSync(srcBundlePath, 'utf8');
  const bundleHash = createHash('sha256').update(bundleReadback).digest('hex');

  if (v1Hash !== bundleHash) {
    console.error(`\n[build-curriculum] CHECKSUM MISMATCH! public/curriculum/v1.json and src/curriculum/bundle.json have different SHA256 hashes:`);
    console.error(`  v1.json:       ${v1Hash}`);
    console.error(`  bundle.json:   ${bundleHash}`);
    process.exit(1);
  }

  console.log(`\n[build-curriculum] Done. ${totalIncluded} templates written to public/curriculum/v1.json and src/curriculum/bundle.json (${totalSkipped} skipped)`);
  console.log(`[build-curriculum] Checksum verified: both files have SHA256 = ${v1Hash.slice(0, 8)}...`);
  return totalIncluded;
}

buildBundle();
