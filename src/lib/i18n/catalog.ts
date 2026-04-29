/**
 * Typed string catalog — single source of truth for player-facing copy.
 *
 * Per ux-elevation.md §9 T2: every player-facing string lives here with:
 *   - a stable key (`quest.greet.first`)
 *   - the canonical English text
 *   - author notes for translators / reviewers
 *   - a tone tag (which voice is speaking)
 *   - an optional properNoun flag (region/level names exempt from FK gates)
 *
 * Callers retrieve strings via `get(key, params?)` which routes through the
 * ICU formatter — never via direct property access. This guarantees ICU
 * substitution and pluralization are enforced uniformly.
 *
 * Linting: `lintCatalog(allEntries())` runs in unit tests and gates merges
 * (per copy-linter rules in src/lib/copyLinter.ts).
 */

import { format, expandForLint, type ICUParams } from './format';
import type { LintInput } from '../copyLinter';

/** Tone tag — which voice is speaking. */
export type Tone =
  | 'persona-quest' // Quest's voice — K-2, ≤7 words/sentence, FK ≤ 2.0
  | 'caregiver-stat' // Caregiver-facing chip — short, neutral, factual
  | 'system'; // System prompts (settings, errors); Plain English allowed

export interface CatalogEntry {
  /** Canonical English text (may include ICU `{name}` and plural blocks). */
  text: string;
  /** Author notes for translators / reviewers. */
  notes?: string;
  /** Voice tag. */
  tone: Tone;
  /** Mark as a proper noun (region/level name); subject to alt-gates. */
  properNoun?: boolean;
}

/** Keys are stable identifiers — never change once shipped. */
export type CatalogKey = string;

/** A registered catalog map. */
export type Catalog = Readonly<Record<CatalogKey, CatalogEntry>>;

const REGISTERED: Record<CatalogKey, CatalogEntry> = {};

/**
 * Register a chunk of catalog entries (called from each `keys/*.ts` module
 * at module-load time). Duplicate keys whose entries are *deep-equal* are
 * silently ignored — this makes the registration idempotent under Vite's
 * dev HMR, where the keys module can be re-evaluated. Genuine collisions
 * (same key, different content) still throw immediately so accidental
 * overwrites stay loud.
 */
export function registerCatalog(entries: Catalog): void {
  for (const [key, entry] of Object.entries(entries)) {
    const existing = REGISTERED[key];
    if (existing) {
      if (entriesEqual(existing, entry)) continue; // HMR re-load — same content.
      throw new Error(`registerCatalog(): duplicate key "${key}"`);
    }
    REGISTERED[key] = entry;
  }
}

function entriesEqual(a: CatalogEntry, b: CatalogEntry): boolean {
  return (
    a.text === b.text &&
    a.tone === b.tone &&
    (a.notes ?? '') === (b.notes ?? '') &&
    (a.properNoun ?? false) === (b.properNoun ?? false)
  );
}

/** Retrieve a formatted string by key, with optional ICU params. */
export function get(key: CatalogKey, params?: ICUParams): string {
  const entry = REGISTERED[key];
  if (!entry) {
    throw new Error(`get(): unknown catalog key "${key}"`);
  }
  return format(entry.text, params);
}

/** Look up a raw entry without formatting. For tooling and tests only. */
export function getEntry(key: CatalogKey): CatalogEntry | undefined {
  return REGISTERED[key];
}

/** Snapshot of all registered entries for linting/reporting. */
export function allEntries(): ReadonlyArray<readonly [CatalogKey, CatalogEntry]> {
  return Object.entries(REGISTERED).map(([k, v]) => [k, v] as const);
}

/**
 * Convert all registered entries into copy-linter input form.
 *
 * ICU markup (plural blocks and `{var}` refs) is expanded via
 * `expandForLint()` so the linter sees the worst-case rendered text,
 * never literal `{...}` syntax that would inflate word/syllable counts.
 */
export function toLintInputs(): LintInput[] {
  return allEntries().map(([key, entry]) => {
    const input: LintInput = { id: key, text: expandForLint(entry.text) };
    if (entry.properNoun) input.properNoun = true;
    return input;
  });
}

/** Test-only escape hatch to clear the registry between tests. */
export function _resetForTests(): void {
  for (const k of Object.keys(REGISTERED)) delete REGISTERED[k];
}
