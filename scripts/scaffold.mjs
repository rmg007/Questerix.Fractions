#!/usr/bin/env node
/**
 * scaffold.mjs — generates pre-split files from templates so new work cannot
 * be born monolithic. Per D-30 and `PLANS/agent-tooling-2026-05-01.md`
 * → "Scaffolding that enforces the split".
 *
 * Usage:
 *   node scripts/scaffold.mjs scene <Name>
 *   node scripts/scaffold.mjs validator <archetype>
 *   node scripts/scaffold.mjs component <Name>
 *
 * Refuses to overwrite existing files. Reports the list of created files at
 * the end. No executable bits set (these are .ts / .json sources).
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(import.meta.url), '..', '..');
const TEMPLATE_DIR = join(ROOT, 'templates');

const ARCHETYPES = [
  'partition',
  'identify',
  'label',
  'make',
  'compare',
  'benchmark',
  'order',
  'snap_match',
  'equal_or_not',
  'placement',
  'explain_your_order',
];

function die(msg) {
  process.stderr.write(`scaffold: ${msg}\n`);
  process.exit(1);
}

function pascalCase(input) {
  // Accepts already-PascalCase ("Demo"), kebab-case ("level-map"), or
  // snake_case ("level_map") and returns PascalCase.
  if (!/^[A-Za-z][A-Za-z0-9_-]*$/.test(input)) {
    die(`name must match /^[A-Za-z][A-Za-z0-9_-]*$/, got: ${input}`);
  }
  return input
    .split(/[-_]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
}

function readTemplate(rel) {
  const p = join(TEMPLATE_DIR, rel);
  if (!existsSync(p)) die(`template missing: ${p}`);
  return readFileSync(p, 'utf8');
}

function substitute(content, replacements) {
  let out = content;
  for (const [needle, value] of Object.entries(replacements)) {
    out = out.split(needle).join(value);
  }
  return out;
}

function writeNew(target, content) {
  if (existsSync(target)) {
    die(`refusing to overwrite existing file: ${target}`);
  }
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, content);
}

function rel(p) {
  return p.startsWith(ROOT) ? p.slice(ROOT.length + 1) : p;
}

// ── kind: scene ──────────────────────────────────────────────────────────
function scaffoldScene(name) {
  if (!name) die('usage: scaffold.mjs scene <Name>');
  const Name = pascalCase(name);

  const targets = [
    {
      tpl: 'scene/Scene.template.ts',
      out: join(ROOT, 'src', 'scenes', `${Name}Scene.ts`),
    },
    {
      tpl: 'scene/Controller.template.ts',
      out: join(ROOT, 'src', 'scenes', `${Name}Controller.ts`),
    },
    {
      tpl: 'scene/State.template.ts',
      out: join(ROOT, 'src', 'scenes', `${Name}State.ts`),
    },
    {
      tpl: 'scene/Scene.test.template.ts',
      out: join(ROOT, 'src', 'scenes', '__tests__', `${Name}Scene.test.ts`),
    },
  ];

  // Pre-flight: refuse if any target already exists, before we write anything.
  for (const t of targets) {
    if (existsSync(t.out)) die(`refusing to overwrite existing file: ${t.out}`);
  }

  const created = [];
  for (const t of targets) {
    const body = substitute(readTemplate(t.tpl), { __NAME__: Name });
    writeNew(t.out, body);
    created.push(t.out);
  }
  return created;
}

// ── kind: validator ──────────────────────────────────────────────────────
function scaffoldValidator(archetype) {
  if (!archetype) die('usage: scaffold.mjs validator <archetype>');
  if (!ARCHETYPES.includes(archetype)) {
    die(
      `archetype must be one of: ${ARCHETYPES.join(', ')} (got: ${archetype})`
    );
  }

  const targets = [
    {
      tpl: 'validator/validator.template.ts',
      out: join(ROOT, 'src', 'validators', `${archetype}.ts`),
    },
    {
      tpl: 'validator/validator.test.template.ts',
      out: join(ROOT, 'src', 'validators', '__tests__', `${archetype}.test.ts`),
    },
    {
      tpl: 'validator/parity-fixture.template.json',
      out: join(ROOT, 'pipeline', 'fixtures', 'parity', `${archetype}_basic.json`),
    },
  ];

  for (const t of targets) {
    if (existsSync(t.out)) die(`refusing to overwrite existing file: ${t.out}`);
  }

  const created = [];
  for (const t of targets) {
    const body = substitute(readTemplate(t.tpl), { __ARCHETYPE__: archetype });
    writeNew(t.out, body);
    created.push(t.out);
  }
  return created;
}

// ── kind: component ──────────────────────────────────────────────────────
function scaffoldComponent(name) {
  if (!name) die('usage: scaffold.mjs component <Name>');
  const Name = pascalCase(name);

  const targets = [
    {
      tpl: 'component/component.template.ts',
      out: join(ROOT, 'src', 'components', `${Name}.ts`),
    },
    {
      tpl: 'component/component.test.template.ts',
      out: join(ROOT, 'src', 'components', '__tests__', `${Name}.test.ts`),
    },
  ];

  for (const t of targets) {
    if (existsSync(t.out)) die(`refusing to overwrite existing file: ${t.out}`);
  }

  const created = [];
  for (const t of targets) {
    const body = substitute(readTemplate(t.tpl), { __NAME__: Name });
    writeNew(t.out, body);
    created.push(t.out);
  }
  return created;
}

// ── entry ────────────────────────────────────────────────────────────────
const [, , kind, name] = process.argv;
if (!kind) {
  die(
    'usage: scaffold.mjs <scene|validator|component> <name>\n' +
      '  scene <Name>          → src/scenes/<Name>Scene.ts + Controller + State + test\n' +
      '  validator <archetype> → src/validators/<archetype>.ts + test + parity stub\n' +
      '  component <Name>      → src/components/<Name>.ts + test'
  );
}

let created;
switch (kind) {
  case 'scene':
    created = scaffoldScene(name);
    break;
  case 'validator':
    created = scaffoldValidator(name);
    break;
  case 'component':
    created = scaffoldComponent(name);
    break;
  default:
    die(`unknown kind: ${kind} (expected scene | validator | component)`);
}

process.stdout.write(`scaffold:${kind} created ${created.length} file(s):\n`);
for (const c of created) {
  process.stdout.write(`  ${rel(c)}\n`);
}
