#!/usr/bin/env node
/**
 * sync-claude-md.mjs
 *
 * Regenerates the auto-managed sections of root `CLAUDE.md` from the
 * source-of-truth files under `.claude/agents/*.md` and
 * `.claude/commands/*.md`.
 *
 * Marker pairs in CLAUDE.md:
 *   <!-- AUTO:subagents-table:start -->     ... <!-- AUTO:subagents-table:end -->
 *   <!-- AUTO:slash-commands-list:start --> ... <!-- AUTO:slash-commands-list:end -->
 *
 * The script is idempotent — running twice produces zero diff. If a marker
 * pair is missing, it leaves the file alone and prints a stderr note.
 *
 * Always exits 0 — wired into a PostToolUse hook and a husky pre-commit
 * drift check; never fails the user's commit.
 *
 * Run: node scripts/sync-claude-md.mjs
 */

import { readFileSync, readdirSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

const ROOT = new URL('..', import.meta.url).pathname;
const CLAUDE_MD = join(ROOT, 'CLAUDE.md');
const AGENTS_DIR = join(ROOT, '.claude/agents');
const COMMANDS_DIR = join(ROOT, '.claude/commands');

/**
 * Parse a small subset of YAML frontmatter (the `key: value` lines we care
 * about). Values may contain colons; we split on the first one only.
 * Strips surrounding single/double quotes if present.
 */
function readFrontmatter(content) {
  const m = content.match(/^---\n([\s\S]*?)\n---/);
  if (!m) return {};
  const fm = {};
  for (const line of m[1].split('\n')) {
    const idx = line.indexOf(':');
    if (idx <= 0) continue;
    const k = line.slice(0, idx).trim();
    let v = line.slice(idx + 1).trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    fm[k] = v;
  }
  return fm;
}

function listMarkdown(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith('.md'))
    .sort();
}

/**
 * Build the rendered subagents markdown table body (header rows are kept
 * outside the marker block in CLAUDE.md so we render only the data rows).
 */
function buildSubagentsTable() {
  const rows = [];
  for (const f of listMarkdown(AGENTS_DIR)) {
    const content = readFileSync(join(AGENTS_DIR, f), 'utf8');
    const fm = readFrontmatter(content);
    const name = fm.name || f.replace(/\.md$/, '');
    const description = (fm.description || '').replace(/\|/g, '\\|');
    rows.push(`| \`${name}\` | ${description} |`);
  }
  return rows.join('\n');
}

/**
 * Build the rendered slash-commands bulleted list. Format:
 *   - `/<name>` — <description>
 */
function buildSlashCommandsList() {
  const items = [];
  for (const f of listMarkdown(COMMANDS_DIR)) {
    const content = readFileSync(join(COMMANDS_DIR, f), 'utf8');
    const fm = readFrontmatter(content);
    const name = f.replace(/\.md$/, '');
    const description = fm.description || '';
    items.push(`- \`/${name}\` — ${description}`);
  }
  return items.join('\n');
}

/**
 * Replace the body between a marker pair, preserving the markers themselves.
 * Returns { changed, output, found }.
 */
function replaceBetweenMarkers(source, startMarker, endMarker, body) {
  const startIdx = source.indexOf(startMarker);
  const endIdx = source.indexOf(endMarker);
  if (startIdx === -1 || endIdx === -1 || endIdx < startIdx) {
    return { changed: false, output: source, found: false };
  }
  const before = source.slice(0, startIdx + startMarker.length);
  const after = source.slice(endIdx);
  // Ensure exactly one newline on each side of the body.
  const replacement = `${before}\n${body}\n${after}`;
  return {
    changed: replacement !== source,
    output: replacement,
    found: true,
  };
}

function main() {
  if (!existsSync(CLAUDE_MD)) {
    console.error('note: CLAUDE.md not found; nothing to sync');
    process.exit(0);
  }

  const original = readFileSync(CLAUDE_MD, 'utf8');
  let updated = original;
  let foundAny = false;

  const subagentsTable = buildSubagentsTable();
  const r1 = replaceBetweenMarkers(
    updated,
    '<!-- AUTO:subagents-table:start -->',
    '<!-- AUTO:subagents-table:end -->',
    subagentsTable
  );
  if (r1.found) {
    foundAny = true;
    updated = r1.output;
  }

  const slashList = buildSlashCommandsList();
  const r2 = replaceBetweenMarkers(
    updated,
    '<!-- AUTO:slash-commands-list:start -->',
    '<!-- AUTO:slash-commands-list:end -->',
    slashList
  );
  if (r2.found) {
    foundAny = true;
    updated = r2.output;
  }

  if (!foundAny) {
    console.error('note: no AUTO markers in CLAUDE.md; nothing to sync');
    process.exit(0);
  }

  if (updated !== original) {
    writeFileSync(CLAUDE_MD, updated);
    console.log('sync-claude-md: CLAUDE.md updated');
  } else {
    console.log('sync-claude-md: CLAUDE.md already in sync');
  }

  process.exit(0);
}

main();
