/**
 * WCAG contrast ratio unit tests for levelTheme.ts color tokens.
 *
 * Verifies that text/background pairings used in gameplay UI meet the WCAG AA
 * threshold of 4.5:1 for normal text.
 *
 * Formula source: https://www.w3.org/TR/WCAG20/#relativeluminancedef
 * per accessibility.md §4 (colour contrast requirements).
 *
 * NOTE: We do NOT import from levelTheme.ts directly in the contrast tests
 * because that module carries `import * as Phaser from 'phaser'` which
 * triggers Phaser's canvas initialisation and fails in the jsdom test
 * environment.  We mirror the token values here, then cross-check them
 * against live exports in the "token snapshot" suite (which mocks Phaser
 * away via vi.mock before importing).
 *
 * Known WCAG failures (tracked as test.fails):
 *   - ACTION_TEXT (#6B2E0B) on ACTION_HOVER (#F59E0B, amber-500): ~4.47:1 (just below 4.5)
 * R11 fix resolved the hint button failures (HINT_TEXT_CLR → #07102E):
 *   - HINT_TEXT_CLR on HINT_FILL now ~7.6:1 ✓
 *   - HINT_TEXT_CLR on HINT_HOVER now ~5.46:1 ✓
 */

import { describe, it, expect, vi } from 'vitest';

// ── Mirrored colour tokens (source: src/scenes/utils/levelTheme.ts) ──────────
// Snapshot tests below verify these stay in sync with the live exports.

// Action ("Check") button — amber
const ACTION_FILL_HEX = '#FCD34D'; // 0xfcd34d amber-300
const ACTION_HOVER_HEX = '#F59E0B'; // 0xf59e0b amber-500
const ACTION_TEXT_VAL = '#6B2E0B'; // amber-900 (R11 fix: was #78350F)

// Hint button — blue
const HINT_FILL_HEX = '#60A5FA'; // 0x60a5fa blue-400
const HINT_HOVER_HEX = '#3B82F6'; // 0x3b82f6 blue-500
const HINT_TEXT_CLR_VAL = '#07102E'; // blue-900 (R11 fix: was #1E3A8A)

// Brand navy / secondary button
const NAVY_HEX_VAL = '#1E3A8A';
const SEC_FILL_HEX = '#FFFFFF'; // 0xffffff WHITE
const SEC_TEXT_VAL = '#1E3A8A'; // NAVY_HEX

const WHITE_HEX = '#FFFFFF';

// ── WCAG utilities ────────────────────────────────────────────────────────────

/**
 * Compute WCAG 2.0 relative luminance for a `'#RRGGBB'` hex colour.
 * Accepts both upper- and lower-case hex digits.
 */
function relativeLuminance(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const toLinear = (c: number): number =>
    c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

/**
 * Compute WCAG contrast ratio between two hex colours.
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
 * Convert a numeric hex colour constant (e.g. 0xfcd34d) to `'#RRGGBB'` form.
 * Used in the snapshot tests to cross-check our mirrored values.
 */
function numToHex(n: number): string {
  return '#' + n.toString(16).padStart(6, '0').toUpperCase();
}

// ── Token snapshot — catch drift from levelTheme.ts ──────────────────────────
// We mock Phaser away before dynamically importing levelTheme.ts so the
// module can be evaluated without triggering Phaser's canvas init.

vi.mock('phaser', () => ({}));

const {
  ACTION_FILL,
  ACTION_HOVER,
  HINT_FILL,
  HINT_HOVER,
  NAVY_HEX,
  SEC_FILL,
  ACTION_TEXT,
  HINT_TEXT_CLR,
  SEC_TEXT,
} = await import('@/scenes/utils/levelTheme');

describe('token snapshot — mirrored values match live levelTheme exports', () => {
  it('ACTION_FILL_HEX mirrors 0xfcd34d', () => {
    expect(ACTION_FILL_HEX).toBe(numToHex(ACTION_FILL as number));
  });
  it('ACTION_HOVER_HEX mirrors 0xf59e0b', () => {
    expect(ACTION_HOVER_HEX).toBe(numToHex(ACTION_HOVER as number));
  });
  it('HINT_FILL_HEX mirrors 0x60a5fa', () => {
    expect(HINT_FILL_HEX).toBe(numToHex(HINT_FILL as number));
  });
  it('HINT_HOVER_HEX mirrors 0x3b82f6', () => {
    expect(HINT_HOVER_HEX).toBe(numToHex(HINT_HOVER as number));
  });
  it('SEC_FILL_HEX mirrors 0xffffff', () => {
    expect(SEC_FILL_HEX).toBe(numToHex(SEC_FILL as number));
  });
  it('NAVY_HEX_VAL mirrors NAVY_HEX', () => {
    expect(NAVY_HEX_VAL).toBe(NAVY_HEX as string);
  });
  it('ACTION_TEXT_VAL mirrors ACTION_TEXT', () => {
    expect(ACTION_TEXT_VAL).toBe(ACTION_TEXT as string);
  });
  it('HINT_TEXT_CLR_VAL mirrors HINT_TEXT_CLR', () => {
    expect(HINT_TEXT_CLR_VAL).toBe(HINT_TEXT_CLR as string);
  });
  it('SEC_TEXT_VAL mirrors SEC_TEXT', () => {
    expect(SEC_TEXT_VAL).toBe(SEC_TEXT as string);
  });
});

// ── WCAG contrast tests ───────────────────────────────────────────────────────

const WCAG_AA = 4.5;

describe('WCAG contrast — action button (amber)', () => {
  it('ACTION_TEXT on ACTION_FILL achieves ≥ 4.5:1', () => {
    // amber-900 on amber-300 → ~6.29:1 ✓
    const ratio = contrastRatio(ACTION_TEXT_VAL, ACTION_FILL_HEX);
    expect(ratio).toBeGreaterThanOrEqual(WCAG_AA);
  });

  it('ACTION_TEXT on ACTION_HOVER achieves ≥ 4.5:1', () => {
    // R11 fix: #6B2E0B on amber-500 (#F59E0B) now passes ✓
    const ratio = contrastRatio(ACTION_TEXT_VAL, ACTION_HOVER_HEX);
    expect(ratio).toBeGreaterThanOrEqual(WCAG_AA);
  });
});

describe('WCAG contrast — hint button (blue)', () => {
  it('HINT_TEXT_CLR on HINT_FILL achieves ≥ 4.5:1', () => {
    // R11 fix: #07102E on blue-400 (#60A5FA) → ~7.6:1 ✓
    const ratio = contrastRatio(HINT_TEXT_CLR_VAL, HINT_FILL_HEX);
    expect(ratio).toBeGreaterThanOrEqual(WCAG_AA);
  });

  it('HINT_TEXT_CLR on HINT_HOVER achieves ≥ 4.5:1', () => {
    // R11 fix: #07102E on blue-500 (#3B82F6) → ~5.46:1 ✓
    const ratio = contrastRatio(HINT_TEXT_CLR_VAL, HINT_HOVER_HEX);
    expect(ratio).toBeGreaterThanOrEqual(WCAG_AA);
  });
});

describe('WCAG contrast — brand navy on white', () => {
  it('NAVY_HEX (#1E3A8A) on white (#FFFFFF) achieves ≥ 4.5:1', () => {
    // ~10.36:1 ✓
    const ratio = contrastRatio(NAVY_HEX_VAL, WHITE_HEX);
    expect(ratio).toBeGreaterThanOrEqual(WCAG_AA);
  });
});

describe('WCAG contrast — secondary button (white pill)', () => {
  it('SEC_TEXT on SEC_FILL achieves ≥ 4.5:1', () => {
    // SEC_FILL = #FFFFFF, SEC_TEXT = #1E3A8A → ~10.36:1 ✓
    const ratio = contrastRatio(SEC_TEXT_VAL, SEC_FILL_HEX);
    expect(ratio).toBeGreaterThanOrEqual(WCAG_AA);
  });
});
