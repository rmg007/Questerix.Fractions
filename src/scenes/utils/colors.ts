/**
 * Palette tokens for Phaser (number) and CSS (hex string).
 * per design-language.md §2 — Simple + Bright, no neon.
 * All hex values from design-language.md §2.1–2.4.
 */

// ── Hex strings (CSS / DOM usage) ─────────────────────────────────────────

export const HEX = {
  // §2.1 Primary
  primary:        '#2F6FED',
  primarySoft:    '#D9E5FB',
  primaryStrong:  '#1A4FBF',

  // §2.2 Accent
  accentA:        '#FFB400',
  accentB:        '#7B2CBF',
  accentC:        '#0FA968',

  // §2.3 Semantic
  success:        '#1FAA59',
  successSoft:    '#D6F1E0',
  error:          '#E5484D',
  errorSoft:      '#FBE3E4',
  warning:        '#F2A93B',

  // §2.4 Neutrals
  neutral0:       '#FFFFFF',
  neutral50:      '#F7F8FA',
  neutral100:     '#EEF0F4',
  neutral300:     '#C5CAD3',
  neutral600:     '#5B6478',
  neutral900:     '#101521',
} as const;

// ── Phaser number colors (0xRRGGBB) ───────────────────────────────────────

function hexToNum(hex: string): number {
  return parseInt(hex.replace('#', ''), 16);
}

export const CLR = {
  primary:        hexToNum(HEX.primary),
  primarySoft:    hexToNum(HEX.primarySoft),
  primaryStrong:  hexToNum(HEX.primaryStrong),

  accentA:        hexToNum(HEX.accentA),
  accentB:        hexToNum(HEX.accentB),
  accentC:        hexToNum(HEX.accentC),

  success:        hexToNum(HEX.success),
  successSoft:    hexToNum(HEX.successSoft),
  error:          hexToNum(HEX.error),
  errorSoft:      hexToNum(HEX.errorSoft),
  warning:        hexToNum(HEX.warning),

  neutral0:       hexToNum(HEX.neutral0),
  neutral50:      hexToNum(HEX.neutral50),
  neutral100:     hexToNum(HEX.neutral100),
  neutral300:     hexToNum(HEX.neutral300),
  neutral600:     hexToNum(HEX.neutral600),
  neutral900:     hexToNum(HEX.neutral900),
} as const;

export type ColorToken = keyof typeof CLR;
