#!/usr/bin/env node
/**
 * agent-doctor.mjs
 *
 * Sanity-checks the Claude Code agent harness:
 *   - All CLAUDE.md files are non-empty
 *   - All .claude/agents/*.md have required frontmatter
 *   - All .claude/commands/*.md have a description
 *   - .claude/learnings.md exists and isn't empty
 *   - .claude/settings.json is valid JSON
 *
 * Run: node scripts/agent-doctor.mjs
 * Exit 0 = healthy, Exit 1 = issues found
 */

import { readFileSync, readdirSync, existsSync } from 'fs';
import { join } from 'path';

const ROOT = new URL('..', import.meta.url).pathname;
let issues = 0;
let checks = 0;

function pass(msg) {
  checks++;
  console.log(`  ✓ ${msg}`);
}

function fail(msg) {
  checks++;
  issues++;
  console.error(`  ✗ ${msg}`);
}

function check(label, fn) {
  try {
    fn();
  } catch (e) {
    fail(`${label}: ${e.message}`);
  }
}

function readFrontmatter(content) {
  const m = content.match(/^---\n([\s\S]*?)\n---/);
  if (!m) return {};
  const fm = {};
  for (const line of m[1].split('\n')) {
    const [k, ...v] = line.split(':');
    if (k && v.length) fm[k.trim()] = v.join(':').trim();
  }
  return fm;
}

// ── 1. CLAUDE.md files ────────────────────────────────────────────────────────
console.log('\n1. CLAUDE.md files');
const claudeMds = [
  'CLAUDE.md',
  'src/scenes/interactions/CLAUDE.md',
  'src/validators/CLAUDE.md',
  'src/persistence/CLAUDE.md',
  'src/engine/CLAUDE.md',
  'pipeline/CLAUDE.md',
];
for (const rel of claudeMds) {
  const p = join(ROOT, rel);
  check(rel, () => {
    if (!existsSync(p)) { fail(`${rel}: missing`); return; }
    const content = readFileSync(p, 'utf8');
    if (content.trim().length < 100) { fail(`${rel}: suspiciously short (${content.length} bytes)`); return; }
    pass(`${rel} (${content.length} bytes)`);
  });
}

// ── 2. Subagent frontmatter ────────────────────────────────────────────────────
console.log('\n2. Subagents (.claude/agents/)');
const agentsDir = join(ROOT, '.claude/agents');
if (existsSync(agentsDir)) {
  for (const f of readdirSync(agentsDir).filter(f => f.endsWith('.md'))) {
    const p = join(agentsDir, f);
    check(f, () => {
      const content = readFileSync(p, 'utf8');
      const fm = readFrontmatter(content);
      if (!fm.name) throw new Error('missing frontmatter: name');
      if (!fm.description) throw new Error('missing frontmatter: description');
      if (!fm.tools) throw new Error('missing frontmatter: tools');
      pass(`${f} (name=${fm.name})`);
    });
  }
} else {
  fail('.claude/agents/ directory missing');
}

// ── 3. Slash command descriptions ─────────────────────────────────────────────
console.log('\n3. Slash commands (.claude/commands/)');
const commandsDir = join(ROOT, '.claude/commands');
if (existsSync(commandsDir)) {
  for (const f of readdirSync(commandsDir).filter(f => f.endsWith('.md'))) {
    const p = join(commandsDir, f);
    check(f, () => {
      const content = readFileSync(p, 'utf8');
      const fm = readFrontmatter(content);
      if (!fm.description) throw new Error('missing frontmatter: description');
      pass(`${f} ("${fm.description.slice(0, 60)}...")`);
    });
  }
} else {
  fail('.claude/commands/ directory missing');
}

// ── 4. learnings.md health ────────────────────────────────────────────────────
console.log('\n4. learnings.md');
check('learnings.md', () => {
  const p = join(ROOT, '.claude/learnings.md');
  if (!existsSync(p)) throw new Error('missing — create it');
  const content = readFileSync(p, 'utf8');
  const entries = content.split('\n').filter(l => /^\d{4}-\d{2}-\d{2}/.test(l));
  if (entries.length === 0) throw new Error('no entries found — is the file empty?');
  if (entries.length > 200) fail(`learnings.md: ${entries.length} entries — consider archiving old ones`);
  else pass(`${entries.length} entries`);
});

// ── 5. settings.json valid JSON ───────────────────────────────────────────────
console.log('\n5. settings.json');
check('settings.json', () => {
  const p = join(ROOT, '.claude/settings.json');
  if (!existsSync(p)) throw new Error('missing — autonomous mode not configured');
  const raw = readFileSync(p, 'utf8');
  JSON.parse(raw); // throws if invalid
  pass('valid JSON');
});

// ── Summary ───────────────────────────────────────────────────────────────────
console.log(`\n${'─'.repeat(50)}`);
if (issues === 0) {
  console.log(`✅ Agent harness healthy — ${checks} checks passed`);
} else {
  console.error(`❌ ${issues} issue(s) found across ${checks} checks`);
  process.exit(1);
}
