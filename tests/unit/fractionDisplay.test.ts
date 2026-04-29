/**
 * Tests for the FractionDisplay component (ux-elevation §9 T0).
 *
 * jsdom does not run Phaser's Canvas/WebGL pipeline, so we focus on the
 * pure logic: parseFraction, special-case detection (zero/one), and the
 * graceful-failure surface (fromString, invalid denominator).
 */

import { describe, expect, it } from 'vitest';
import { parseFraction } from '@/components/FractionDisplay';

describe('parseFraction', () => {
  it('parses ASCII slash form', () => {
    expect(parseFraction('1/2')).toEqual({ num: 1, den: 2 });
    expect(parseFraction('3/5')).toEqual({ num: 3, den: 5 });
    expect(parseFraction(' 7 / 8 ')).toEqual({ num: 7, den: 8 });
  });

  it('parses common Unicode glyphs', () => {
    expect(parseFraction('½')).toEqual({ num: 1, den: 2 });
    expect(parseFraction('¼')).toEqual({ num: 1, den: 4 });
    expect(parseFraction('¾')).toEqual({ num: 3, den: 4 });
    expect(parseFraction('⅓')).toEqual({ num: 1, den: 3 });
    expect(parseFraction('⅔')).toEqual({ num: 2, den: 3 });
  });

  it('parses whole numbers as a/1', () => {
    expect(parseFraction('0')).toEqual({ num: 0, den: 1 });
    expect(parseFraction('1')).toEqual({ num: 1, den: 1 });
    expect(parseFraction('5')).toEqual({ num: 5, den: 1 });
  });

  it('rejects malformed input', () => {
    expect(parseFraction('')).toBeNull();
    expect(parseFraction('abc')).toBeNull();
    expect(parseFraction('1/0')).toBeNull(); // zero denom rejected
    expect(parseFraction('1/-2')).toBeNull(); // negative denom not allowed
    expect(parseFraction('1.5/3')).toBeNull(); // decimal numerator rejected
  });
});
