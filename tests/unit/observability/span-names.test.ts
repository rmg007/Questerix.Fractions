/**
 * Span-name registry guards (Phase 12.1).
 *
 * Two invariants:
 *   1. Every leaf is a `<domain>.<verb>` string — lowercase, no whitespace,
 *      single dot. This keeps OTLP backend filters predictable and rules out
 *      typo-shaped names slipping in.
 *   2. No two domains accidentally register the same wire-format name. A
 *      duplicate would make it impossible to distinguish their callers in a
 *      trace view, defeating the registry's purpose.
 */

import { describe, expect, it } from 'vitest';
import { SPAN_NAMES, type SpanName } from '@/lib/observability/span-names';

/**
 * Recursively flatten the const-object tree to `[path, value]` pairs.
 * `path` is the chain of keys (e.g. `['DB', 'MUTATE']`) — useful for assertion
 * messages.
 */
function leaves(
  node: unknown,
  path: string[] = []
): Array<{ path: string[]; value: string }> {
  if (typeof node === 'string') return [{ path, value: node }];
  if (node && typeof node === 'object') {
    const out: Array<{ path: string[]; value: string }> = [];
    for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
      out.push(...leaves(v, [...path, k]));
    }
    return out;
  }
  return [];
}

describe('SPAN_NAMES registry', () => {
  const allLeaves = leaves(SPAN_NAMES);

  it('contains at least one leaf', () => {
    expect(allLeaves.length).toBeGreaterThan(0);
  });

  it('every leaf matches the <domain>.<verb> shape', () => {
    // Lowercase letters / digits in each segment, exactly one dot.
    const SHAPE = /^[a-z][a-z0-9]*\.[a-z][a-z0-9_]*$/;
    for (const { path, value } of allLeaves) {
      expect(value, `SPAN_NAMES.${path.join('.')} = "${value}"`).toMatch(SHAPE);
    }
  });

  it('every leaf domain prefix matches its top-level key (case-insensitive)', () => {
    // SPAN_NAMES.DB.MUTATE = 'db.mutate'  → 'db' === 'DB'.toLowerCase()
    for (const { path, value } of allLeaves) {
      const topKey = path[0]?.toLowerCase();
      const valueDomain = value.split('.')[0];
      expect(valueDomain, `SPAN_NAMES.${path.join('.')} = "${value}"`).toBe(topKey);
    }
  });

  it('contains no duplicate values across the tree', () => {
    const seen = new Map<string, string[]>();
    for (const { path, value } of allLeaves) {
      const where = seen.get(value);
      if (where) {
        seen.set(value, [...where, path.join('.')]);
      } else {
        seen.set(value, [path.join('.')]);
      }
    }
    const duplicates = [...seen.entries()].filter(([, paths]) => paths.length > 1);
    expect(duplicates, `Duplicate span names: ${JSON.stringify(duplicates)}`).toEqual([]);
  });

  it('exports the documented domains', () => {
    // If the README enumerates these, the registry must too. Drift between the
    // doc and code is the failure mode this test pins.
    const top = Object.keys(SPAN_NAMES);
    for (const domain of ['DB', 'SCENE', 'QUESTION', 'MASTERY', 'HINT', 'TTS']) {
      expect(top).toContain(domain);
    }
  });
});

describe('SpanName helper type', () => {
  it('admits every registered leaf at the type level', () => {
    // This is a compile-time check — if any of the assignments below stop
    // compiling, the test fails before runtime. Runtime assertion is just
    // belt-and-suspenders.
    const samples: SpanName[] = [
      SPAN_NAMES.DB.MUTATE,
      SPAN_NAMES.DB.GET,
      SPAN_NAMES.DB.QUERY,
      SPAN_NAMES.SCENE.INIT,
      SPAN_NAMES.SCENE.CREATE,
      SPAN_NAMES.SCENE.SHUTDOWN,
      SPAN_NAMES.QUESTION.LOAD,
      SPAN_NAMES.QUESTION.VALIDATE,
      SPAN_NAMES.QUESTION.SUBMIT,
      SPAN_NAMES.MASTERY.UPDATE,
      SPAN_NAMES.HINT.REQUEST,
      SPAN_NAMES.TTS.SPEAK,
    ];
    expect(samples.length).toBeGreaterThan(0);
    for (const s of samples) expect(typeof s).toBe('string');
  });
});
