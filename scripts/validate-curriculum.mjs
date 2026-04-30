#!/usr/bin/env node
// Validates curriculum payloads against per-archetype shape requirements.
// Catches the kind of data/code shape mismatch that produced "undefined/undefined"
// fractions in production (L6/L7/L8/L9 on 2026-04-28).
// Exit 0 if all payloads are valid; exit 1 otherwise.

import { readFileSync } from 'fs';

const bundle = JSON.parse(readFileSync('src/curriculum/bundle.json', 'utf8'));
const v1 = JSON.parse(readFileSync('public/curriculum/v1.json', 'utf8'));

const issues = [];

// Each archetype declares which payload fields it accepts. The interaction
// must be able to render a fraction from one of these field combinations.
// Keep this in lockstep with src/scenes/interactions/*.ts payload contracts.
const ARCHETYPE_RULES = {
  partition: (p) => ('shapeType' in p && 'targetPartitions' in p ? null : 'missing shapeType/targetPartitions'),
  identify:  (p) => {
    if (Array.isArray(p.options) && p.options.length >= 2) return null;
    if (typeof p.fractionId === 'string' && Array.isArray(p.distractors) && p.distractors.length >= 1)
      return null;
    return 'must have options[] or fractionId+distractors';
  },
  equal_or_not: (p) => ('shapeType' in p ? null : 'missing shapeType'),
  label:     (p) => null, // label has flexible payloads
  make:      (p) => null,
  snap_match:(p) => ('leftItems' in p && 'rightItems' in p ? null : 'missing leftItems/rightItems'),
  compare:   (p) => {
    // Must have parseable fractionA + fractionB
    const ok = (f) => typeof f === 'string' || (f && typeof f === 'object' && 'numerator' in f && 'denominator' in f);
    if (!ok(p.fractionA) && !p.leftLabel) return 'fractionA must be string|{n,d} or leftLabel must exist';
    if (!ok(p.fractionB) && !p.rightLabel) return 'fractionB must be string|{n,d} or rightLabel must exist';
    return null;
  },
  benchmark: (p) => {
    const hasFracRef = p.targetFracId || p.targetLabel || p.fractionId || p.numerator !== undefined;
    return hasFracRef ? null : 'missing targetFracId | targetLabel | fractionId | numerator';
  },
  order: (p) => {
    if (Array.isArray(p.fractions) && p.fractions.length >= 2) return null;
    if (Array.isArray(p.fractionIds) && p.fractionIds.length >= 2) return null;
    return 'must have fractions[] or fractionIds[] with ≥2 items';
  },
  place: () => null,
};

function validate(source, levels) {
  for (const [lv, templates] of Object.entries(levels)) {
    for (const t of templates) {
      const rule = ARCHETYPE_RULES[t.archetype];
      if (!rule) {
        issues.push(`${source} L${lv} ${t.id}: unknown archetype "${t.archetype}"`);
        continue;
      }
      if (!t.payload || typeof t.payload !== 'object') {
        issues.push(`${source} L${lv} ${t.id}: payload missing or not an object`);
        continue;
      }
      const err = rule(t.payload);
      if (err) issues.push(`${source} L${lv} ${t.id} (${t.archetype}): ${err}`);

      // Universal: all "frac:N/D" references must parse to finite numbers
      const refs = [];
      if (typeof t.payload.fractionA === 'string') refs.push(t.payload.fractionA);
      if (typeof t.payload.fractionB === 'string') refs.push(t.payload.fractionB);
      if (typeof t.payload.fractionId === 'string') refs.push(t.payload.fractionId);
      if (typeof t.payload.targetFracId === 'string') refs.push(t.payload.targetFracId);
      for (const id of t.payload.fractionIds ?? []) refs.push(id);
      for (const id of t.payload.expectedOrder ?? []) refs.push(id);
      for (const ref of refs) {
        const stripped = ref.startsWith('frac:') ? ref.slice(5) : ref;
        const [n, d] = stripped.split('/').map(Number);
        if (!Number.isFinite(n) || !Number.isFinite(d) || d === 0) {
          issues.push(`${source} L${lv} ${t.id}: unparseable fraction reference "${ref}"`);
        }
      }
    }
  }
}

console.log('Validating curriculum payloads against archetype contracts…');
validate('bundle.json', bundle.levels);
validate('v1.json', v1.levels);

// Bundle parity — both files must have identical content
const bundleStr = JSON.stringify(bundle.levels);
const v1Str = JSON.stringify(v1.levels);
if (bundleStr !== v1Str) {
  issues.push('PARITY: bundle.json and v1.json have diverged — they must be identical');
}

if (issues.length > 0) {
  console.error(`\n❌ ${issues.length} curriculum issue(s) found:\n`);
  for (const i of issues) console.error('  ' + i);
  console.error('');
  process.exit(1);
}

const totalBundle = Object.values(bundle.levels).reduce((s, l) => s + l.length, 0);
console.log(`✅ Curriculum valid — ${totalBundle} templates across ${Object.keys(bundle.levels).length} levels.`);
