/**
 * Tests for the minimal ICU formatter (ux-elevation §9 T2).
 */

import { describe, expect, it } from 'vitest';
import { format } from '@/lib/i18n/format';

describe('format() — simple substitution', () => {
  it('substitutes a single named param', () => {
    expect(format('Hi, {name}!', { name: 'Sam' })).toBe('Hi, Sam!');
  });

  it('substitutes multiple named params', () => {
    expect(format('{greeting}, {name}!', { greeting: 'Hello', name: 'Sam' })).toBe('Hello, Sam!');
  });

  it('coerces number params to string', () => {
    expect(format('{n} apples', { n: 3 })).toBe('3 apples');
  });

  it('throws on a missing param', () => {
    expect(() => format('Hi, {name}!', {})).toThrow(/missing param "name"/);
  });

  it('returns the input unchanged when there are no params', () => {
    expect(format('Hi! I am Quest.', {})).toBe('Hi! I am Quest.');
  });
});

describe('format() — ICU plural', () => {
  it('selects the "one" branch when count === 1', () => {
    expect(format('I see {n, plural, one {one part} other {# parts}}.', { n: 1 })).toBe(
      'I see one part.'
    );
  });

  it('selects the "other" branch and substitutes # for the count', () => {
    expect(format('I see {n, plural, one {one part} other {# parts}}.', { n: 4 })).toBe(
      'I see 4 parts.'
    );
  });

  it('handles a plural at the start of the template', () => {
    expect(format('{n, plural, one {1 dog} other {# dogs}} ran.', { n: 7 })).toBe('7 dogs ran.');
  });

  it('throws when the plural param is not a number', () => {
    expect(() =>
      format('{n, plural, one {a} other {b}}', { n: 'two' as unknown as number })
    ).toThrow(/must be a number/);
  });
});

describe('format() — combined plural + var', () => {
  it('expands plurals first, then substitutes other vars', () => {
    const out = format("{name}: I see {n, plural, one {one part} other {# parts}}.", {
      name: 'Sam',
      n: 2,
    });
    expect(out).toBe('Sam: I see 2 parts.');
  });
});
