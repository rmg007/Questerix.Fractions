/**
 * contrast.test.ts — WCAG contrast ratio unit tests for levelTheme.ts color tokens.
 *
 * Validates that interactive UI color pairs meet the WCAG 2.1 AA minimum of 4.5:1
 * for normal text. Formula: relative luminance per IEC 61966-2-1 (sRGB).
 *
 * per accessibility.md §4, design-language.md §6.3
 */

import { describe, it, expect } from 'vitest';
import {
  ACTION_FILL,
  ACTION_HOVER,
  ACTION_TEXT,
  HINT_FILL,
  HINT_HOVER,
  HINT_TEXT_CLR,
  SEC_FILL,
  SEC_TEXT,
  NAVY_HEX,
} from '../../../src/scenes/utils/levelTheme';

// ── WCAG helpers ──────────────────────────────────────────────────────────────

/**
 * Convert a hex color string (#RRGGBB) to WCAG relative luminance.
 * Formula per WCAG 2.1 §1.4.3 / IEC 61966-2-1.
 */
function relativeLuminance(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const toLinear = (c: number) =>
    c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

/**
 * Compute the WCAG contrast ratio between two hex colors.
 * Returns a value in [1, 21].
 */
function contrastRatio(hex1: string, hex2: string): number {
  const l1 = relativeLuminance(hex1);
  const l2 = relativeLuminance(hex2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Convert a numeric hex color (e.g. 0xfcd34d) to a CSS hex string (#FCD34D).
 */
function numToHex(color: number): string {
  return '#' + color.toString(16).padStart(6, '0').toUpperCase();
}

// ── Constants derived from numeric tokens ─────────────────────────────────────

const ACTION_FILL_HEX = numToHex(ACTION_FILL);   // #FCD34D (amber-300)
const ACTION_HOVER_HEX = numToHex(ACTION_HOVER);  // #F59E0B (amber-500)
const HINT_FILL_HEX = numToHex(HINT_FILL);        // #60A5FA (blue-400)
const HINT_HOVER_HEX = numToHex(HINT_HOVER);      // #3B82F6 (blue-500)
const SEC_FILL_HEX = numToHex(SEC_FILL);           // #FFFFFF (white)

const WCAG_AA_NORMAL = 4.5;

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('WCAG contrast ratios — levelTheme.ts color pairs', () => {
  it('ACTION_TEXT on ACTION_FILL achieves ≥ 4.5:1', () => {
    const ratio = contrastRatio(ACTION_TEXT, ACTION_FILL_HEX);
    expect(ratio).toBeGreaterThanOrEqual(WCAG_AA_NORMAL);
  });

  it('ACTION_TEXT on ACTION_HOVER achieves ≥ 4.5:1', () => {
    const ratio = contrastRatio(ACTION_TEXT, ACTION_HOVER_HEX);
    expect(ratio).toBeGreaterThanOrEqual(WCAG_AA_NORMAL);
  });

  it('HINT_TEXT_CLR on HINT_FILL achieves ≥ 4.5:1', () => {
    const ratio = contrastRatio(HINT_TEXT_CLR, HINT_FILL_HEX);
    expect(ratio).toBeGreaterThanOrEqual(WCAG_AA_NORMAL);
  });

  it('HINT_TEXT_CLR on HINT_HOVER achieves ≥ 4.5:1', () => {
    const ratio = contrastRatio(HINT_TEXT_CLR, HINT_HOVER_HEX);
    expect(ratio).toBeGreaterThanOrEqual(WCAG_AA_NORMAL);
  });

  it('NAVY_HEX (#1E3A8A) on white (#FFFFFF) achieves ≥ 4.5:1', () => {
    const ratio = contrastRatio(NAVY_HEX, '#FFFFFF');
    expect(ratio).toBeGreaterThanOrEqual(WCAG_AA_NORMAL);
  });

  it('SEC_TEXT on SEC_FILL achieves ≥ 4.5:1', () => {
    const ratio = contrastRatio(SEC_TEXT, SEC_FILL_HEX);
    expect(ratio).toBeGreaterThanOrEqual(WCAG_AA_NORMAL);
  });
});

describe('relativeLuminance — sanity checks', () => {
  it('white (#FFFFFF) has luminance 1.0', () => {
    expect(relativeLuminance('#FFFFFF')).toBeCloseTo(1.0, 5);
  });

  it('black (#000000) has luminance 0.0', () => {
    expect(relativeLuminance('#000000')).toBeCloseTo(0.0, 5);
  });

  it('black on white yields maximum ratio of 21:1', () => {
    const ratio = contrastRatio('#000000', '#FFFFFF');
    expect(ratio).toBeCloseTo(21, 0);
  });
});
