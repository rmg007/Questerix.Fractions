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

/**
 * Load pipeline/output/hints.json and return an index keyed by questionTemplateId.
 * Each value is a QuestionHints object: { tier1: { default, byMisconception }, tier2: ... }.
 * Returns an empty map if the hints file is absent.
 */
function loadHintIndex() {
  const hintsPath = join(ROOT, 'pipeline', 'output', 'hints.json');
  if (!existsSync(hintsPath)) {
    console.log('[build-curriculum] hints.json not found — skipping hint attachment');
    return {};
  }
  let raw;
  try {
    raw = JSON.parse(readFileSync(hintsPath, 'utf8'));
  } catch {
    console.warn('[build-curriculum] hints.json unreadable — skipping hint attachment');
    return {};
  }
  const index = {};
  for (const h of raw) {
    const tid = h.questionTemplateId;
    if (!tid) continue;
    if (!index[tid]) {
      index[tid] = { tier1: { default: '', byMisconception: {} }, tier2: { default: '', byMisconception: {} } };
    }
    const text = h.content?.text ?? '';
    if (h.type === 'verbal') index[tid].tier1.default = text;
    else if (h.type === 'visual_overlay') index[tid].tier2.default = text;
  }
  const count = Object.keys(index).length;
  console.log(`[build-curriculum] Loaded hints for ${count} templates from hints.json`);
  return index;
}

/** Attach QuestionHints to a template if an entry exists in the index. */
function attachHints(template, hintIndex) {
  const hints = hintIndex[template.id];
  if (!hints) return template;
  return { ...template, hints };
}

/** Emit public/curriculum/level-NN.json + index.json from the levels map. */
function writePerLevelFiles(outDir, levels, generatedAt) {
  const indexEntries = {};
  for (const levelKey of LEVELS) {
    const templates = levels[levelKey];
    if (!templates || templates.length === 0) continue;
    const levelBundle = JSON.stringify({
      version: 1,
      contentVersion: '1.0.0',
      generatedAt,
      levelKey,
      templates,
    });
    writeFileSync(join(outDir, `level-${levelKey}.json`), levelBundle);
    const sha256 = createHash('sha256').update(levelBundle).digest('hex');
    indexEntries[levelKey] = {
      url: `/curriculum/level-${levelKey}.json`,
      sha256,
      count: templates.length,
    };
  }
  writeFileSync(
    join(outDir, 'index.json'),
    JSON.stringify({ version: 1, generatedAt, levels: indexEntries })
  );
  console.log(`[build-curriculum] Per-level files and index.json written to public/curriculum/`);
}

/** Archetypes allowed per level — matches architecture spec exactly. */
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
  const hintIndex = loadHintIndex();
  const levels = {};
  let totalIncluded = 0;
  let totalSkipped = 0;
  let totalHintsAttached = 0;

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

    const withHints = filtered.map((t) => attachHints(t, hintIndex));
    const hintsAttached = withHints.filter((t) => t.hints !== undefined).length;
    totalHintsAttached += hintsAttached;
    levels[levelKey] = withHints;
    totalIncluded += withHints.length;
    console.log(`  [build-curriculum] L${levelKey}: ${withHints.length} records included (${raw.length - withHints.length} skipped, ${hintsAttached} with hints)`);
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
        console.log(`\n[build-curriculum] Content unchanged — skipping v1.json + bundle.json write (${totalIncluded} templates already current)`);
        // Still fall through to emit per-level files + index.json
        writePerLevelFiles(outDir, levels, existing.generatedAt ?? new Date().toISOString());
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

  console.log(`\n[build-curriculum] Done. ${totalIncluded} templates written to public/curriculum/v1.json and src/curriculum/bundle.json (${totalSkipped} skipped, ${totalHintsAttached} hints attached)`);
  console.log(`[build-curriculum] Checksum verified: both files have SHA256 = ${v1Hash.slice(0, 8)}...`);

  writePerLevelFiles(outDir, bundle.levels, bundle.generatedAt);

  return totalIncluded;
}

buildBundle();
