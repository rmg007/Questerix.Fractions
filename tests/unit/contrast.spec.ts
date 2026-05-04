// WCAG 2.1 AA color contrast tests
// per src/scenes/utils/colors.ts and accessibility.md
import { describe, it, expect } from 'vitest';
import { HEX } from '../../src/scenes/utils/colors';

// Helper: convert hex to RGB and compute relative luminance
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) throw new Error(`Invalid hex color: ${hex}`);
  return {
    r: parseInt(result[1]!, 16) / 255,
    g: parseInt(result[2]!, 16) / 255,
    b: parseInt(result[3]!, 16) / 255,
  };
}

function relativeLuminance(rgb: { r: number; g: number; b: number }): number {
  const rsRGB = rgb.r <= 0.03928 ? rgb.r / 12.92 : Math.pow((rgb.r + 0.055) / 1.055, 2.4);
  const gsRGB = rgb.g <= 0.03928 ? rgb.g / 12.92 : Math.pow((rgb.g + 0.055) / 1.055, 2.4);
  const bsRGB = rgb.b <= 0.03928 ? rgb.b / 12.92 : Math.pow((rgb.b + 0.055) / 1.055, 2.4);
  return 0.2126 * rsRGB + 0.7152 * gsRGB + 0.0722 * bsRGB;
}

function contrastRatio(hex1: string, hex2: string): number {
  const l1 = relativeLuminance(hexToRgb(hex1));
  const l2 = relativeLuminance(hexToRgb(hex2));
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

describe('Color contrast — WCAG 2.1 AA', () => {
  // WCAG AA requires 4.5:1 for normal text, 3:1 for large text (18pt+ or 14pt bold+)
  const WHITE = '#FFFFFF';
  const AA_NORMAL_TEXT = 4.5;

  it('primary on white — ≥ 4.5:1 (WCAG AA normal text)', () => {
    const ratio = contrastRatio(HEX.primary!, WHITE);
    expect(ratio).toBeGreaterThanOrEqual(AA_NORMAL_TEXT);
  });

  it('primaryStrong on white — ≥ 4.5:1 (WCAG AA normal text)', () => {
    const ratio = contrastRatio(HEX.primaryStrong!, WHITE);
    expect(ratio).toBeGreaterThanOrEqual(AA_NORMAL_TEXT);
  });

  it('success on white — ≥ 4.5:1 (WCAG AA normal text)', () => {
    const ratio = contrastRatio(HEX.success!, WHITE);
    expect(ratio).toBeGreaterThanOrEqual(AA_NORMAL_TEXT);
  });

  it('error on white — ≥ 4.5:1 (WCAG AA normal text)', () => {
    const ratio = contrastRatio(HEX.error, WHITE);
    expect(ratio).toBeGreaterThanOrEqual(AA_NORMAL_TEXT);
  });

  it('warning on white — ≥ 3:1 (WCAG AA large text per colors.ts comment)', () => {
    const ratio = contrastRatio(HEX.warning, WHITE);
    expect(ratio).toBeGreaterThanOrEqual(3);
  });

  it('neutral600 on white — ≥ 4.5:1 (WCAG AA normal text)', () => {
    const ratio = contrastRatio(HEX.neutral600, WHITE);
    expect(ratio).toBeGreaterThanOrEqual(AA_NORMAL_TEXT);
  });

  it('neutral900 on white — ≥ 4.5:1 (WCAG AA normal text)', () => {
    const ratio = contrastRatio(HEX.neutral900, WHITE);
    expect(ratio).toBeGreaterThanOrEqual(AA_NORMAL_TEXT);
  });

  // Accent and semantic soft colors are typically for large backgrounds, not critical text
  it('accentA on white — ≥ 3:1 (large text acceptable)', () => {
    const ratio = contrastRatio(HEX.accentA, WHITE);
    expect(ratio).toBeGreaterThanOrEqual(3);
  });

  it('accentB on white — ≥ 4.5:1 (WCAG AA normal text)', () => {
    const ratio = contrastRatio(HEX.accentB, WHITE);
    expect(ratio).toBeGreaterThanOrEqual(AA_NORMAL_TEXT);
  });

  it('accentC on white — ≥ 4.5:1 (WCAG AA normal text)', () => {
    const ratio = contrastRatio(HEX.accentC, WHITE);
    expect(ratio).toBeGreaterThanOrEqual(AA_NORMAL_TEXT);
  });
});
