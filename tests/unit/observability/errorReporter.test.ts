/**
 * Unit tests for the Sentry studentId scrub (Slice 5 from
 * PLANS/forensic-deep-dive-2026-05-01.md).
 *
 * Covers the two privacy primitives in errorReporter.ts:
 *   1. pseudonymize(s)  — stable, equal-input → equal-output, but not the raw value
 *   2. stripPII(ctx)     — removes well-known PII keys before passing to Sentry
 *
 * Sentry-side behavior (setUser, setContext, captureException) is integration-
 * tested via mocks at a later phase; this file pins the deterministic helpers.
 */

import { describe, it, expect } from 'vitest';
import { __testing } from '@/lib/observability/errorReporter';

const { pseudonymize, stripPII, PII_KEYS } = __testing;

describe('pseudonymize', () => {
  it('returns undefined for undefined input', () => {
    expect(pseudonymize(undefined)).toBeUndefined();
  });

  it('returns undefined for empty string', () => {
    expect(pseudonymize('')).toBeUndefined();
  });

  it('returns 8-character lowercase hex for non-empty input', () => {
    const out = pseudonymize('00000000-0000-4000-8000-00000000000a');
    expect(out).toMatch(/^[0-9a-f]{8}$/);
  });

  it('is stable: equal inputs produce equal outputs', () => {
    const a = pseudonymize('student-123');
    const b = pseudonymize('student-123');
    expect(a).toBe(b);
  });

  it('different inputs produce different outputs (smoke check)', () => {
    const set = new Set([
      pseudonymize('00000000-0000-4000-8000-00000000000a'),
      pseudonymize('00000000-0000-4000-8000-00000000000b'),
      pseudonymize('00000000-0000-4000-8000-00000000000c'),
      pseudonymize('00000000-0000-4000-8000-00000000000d'),
    ]);
    // 4 unique inputs should yield ≥ 3 unique hashes (collision unlikely at 8 hex)
    expect(set.size).toBeGreaterThanOrEqual(3);
  });

  it('does not contain the raw input as a substring', () => {
    const raw = '00000000-0000-4000-8000-deadbeef0000';
    const out = pseudonymize(raw);
    expect(out).toBeDefined();
    expect(raw).not.toContain(out!);
    expect(out!.length).toBeLessThan(raw.length);
  });
});

describe('stripPII', () => {
  it('returns undefined for undefined input', () => {
    expect(stripPII(undefined)).toBeUndefined();
  });

  it('removes all documented PII keys', () => {
    const input = {
      studentId: 'raw-uuid',
      student_id: 'raw-uuid-snake',
      sessionId: 'sess-uuid',
      session_id: 'sess-uuid-snake',
      installId: 'install-uuid',
      install_id: 'install-uuid-snake',
      email: 'a@b.com',
      name: 'Alice',
      displayName: 'Alice',
      display_name: 'Alice',
      keepThis: 'visible',
    };
    const out = stripPII(input);
    expect(out).toEqual({ keepThis: 'visible' });
  });

  it('preserves keys that are not on the PII list', () => {
    const input = { archetype: 'partition', durationMs: 1234, level: 1 };
    const out = stripPII(input);
    expect(out).toEqual(input);
  });

  it('returns an empty object when every key is PII', () => {
    const input = { studentId: 'a', sessionId: 'b' };
    const out = stripPII(input);
    expect(out).toEqual({});
  });

  it('does not mutate the input object', () => {
    const input = { studentId: 'a', kept: 1 };
    const before = JSON.stringify(input);
    stripPII(input);
    expect(JSON.stringify(input)).toBe(before);
  });

  it('PII_KEYS set covers the documented six categories', () => {
    expect(PII_KEYS.has('studentId')).toBe(true);
    expect(PII_KEYS.has('sessionId')).toBe(true);
    expect(PII_KEYS.has('installId')).toBe(true);
    expect(PII_KEYS.has('email')).toBe(true);
    expect(PII_KEYS.has('name')).toBe(true);
    expect(PII_KEYS.has('displayName')).toBe(true);
  });
});
