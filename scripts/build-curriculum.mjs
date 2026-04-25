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

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT = resolve(__dirname, '..');

/** Archetypes allowed per level. */
const LEVEL_ARCHETYPES = {
  '01': ['partition', 'identify'],
  '02': ['identify', 'label'],
  '03': ['identify', 'label'],
  '04': ['make', 'partition'],
  '05': ['make', 'partition'],
  '06': ['compare', 'snap_match'],
  '07': ['compare', 'label'],
  '08': ['benchmark', 'placement'],
  '09': ['order', 'placement'],
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

  const bundle = {
    version: 1,
    generatedAt: new Date().toISOString(),
    levels,
  };

  const outDir = join(ROOT, 'public', 'curriculum');
  mkdirSync(outDir, { recursive: true });

  const outPath = join(outDir, 'v1.json');
  writeFileSync(outPath, JSON.stringify(bundle));

  console.log(`\n[build-curriculum] Done. ${totalIncluded} templates written to public/curriculum/v1.json (${totalSkipped} skipped)`);
  return totalIncluded;
}

buildBundle();
