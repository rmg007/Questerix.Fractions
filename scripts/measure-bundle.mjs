#!/usr/bin/env node
// Prints gzipped bundle composition for every JS file in dist/assets.
// Usage: node scripts/measure-bundle.mjs
// Or via: npm run measure-bundle
import { readFileSync, readdirSync } from 'node:fs';
import { gzipSync, brotliCompressSync } from 'node:zlib';
import { join, resolve } from 'node:path';

const distDir = resolve(process.cwd(), 'dist', 'assets');
const BUDGET_BYTES = 1_048_576; // 1 MB

// Per-chunk budgets in KB (gzipped)
const CHUNK_BUDGETS = {
  phaser: 380,
  scenes: 100,
  observability: 12,
  dexie: 35,
};

let files;
try {
  files = readdirSync(distDir).filter((f) => f.endsWith('.js'));
} catch {
  console.error('dist/assets not found — run npm run build first.');
  process.exit(1);
}

let totalGz = 0;
let totalBr = 0;
const rows = [];
const chunkSizes = {};

for (const f of files.sort()) {
  const raw = readFileSync(join(distDir, f));
  const gz = gzipSync(raw).length;
  const br = brotliCompressSync(raw).length;
  totalGz += gz;
  totalBr += br;
  rows.push({ file: f, raw: raw.length, gz, br });

  // Track chunk sizes for per-chunk budget validation
  for (const [chunkName, budgetKB] of Object.entries(CHUNK_BUDGETS)) {
    if (f.includes(`${chunkName}-`)) {
      chunkSizes[chunkName] = { gz, br, budgetBytes: budgetKB * 1024 };
    }
  }
}

const maxLen = Math.max(...rows.map((r) => r.file.length));
console.log('\nBundle composition (dist/assets/*.js):\n');
for (const { file, raw, gz } of rows) {
  const padded = file.padEnd(maxLen);
  console.log(`  ${padded}  ${String(raw).padStart(10)} raw  /  ${String(gz).padStart(8)} gz`);
}

const pct = ((totalGz / BUDGET_BYTES) * 100).toFixed(1);
const status = totalGz <= BUDGET_BYTES ? 'PASS' : 'FAIL';
console.log(`\nTotal gzipped JS : ${totalGz} bytes (${(totalGz / 1024).toFixed(1)} KB)`);
console.log(`Budget (1 MB)    : ${BUDGET_BYTES} bytes`);
console.log(`Budget used      : ${pct}%  [${status}]`);

if (totalGz > BUDGET_BYTES) process.exit(1);
