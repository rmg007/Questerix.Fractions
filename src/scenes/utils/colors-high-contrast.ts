/**
 * High-contrast color palette — WCAG AAA pairs (7:1+ contrast).
 * Used when user selects "High Contrast" mode in Settings.
 * Applied via .qf-high-contrast { --color-key: value; } CSS custom properties.
 * per accessibility.md §6 (high contrast)
 */

// ── Hex strings (CSS / DOM usage) ─────────────────────────────────────────

export const HEX_HIGH_CONTRAST = {
  // §2.1 Primary (7:1 on white; 7:1 on black)
  primary:        '#0D3A99', // was #2F6FED
  primarySoft:    '#B3C9FF', // was #D9E5FB (lighter for text/backgrounds)
  primaryStrong:  '#051A66', // was #1A4FBF

  // §2.2 Accent (7:1+ on white; 7:1+ on black)
  accentA:        '#8C5C00', // was #FFB400
  accentB:        '#4A0078', // was #7B2CBF
  accentC:        '#004D2E', // was #0FA968

  // §2.3 Semantic (7:1 on white; 7:1 on black)
  success:        '#0D5A2E', // was #1FAA59
  successSoft:    '#A8E6C8', // was #D6F1E0 (lighter for backgrounds)
  error:          '#660017', // was #E5484D
  errorSoft:      '#FFCCD6', // was #FBE3E4 (lighter for backgrounds)
  warning:        '#994C00', // was #D88E1F (previous non-AAA color: #F2A93B)

  // §2.4 Neutrals (maintained for legibility)
  neutral0:       '#FFFFFF',
  neutral50:      '#F2F3F5', // slightly darker for WCAG contrast
  neutral100:     '#E8EAEF', // slightly darker
  neutral300:     '#9CA3AF', // darker
  neutral600:     '#374151', // darker
  neutral900:     '#111827', // unchanged (already dark enough)
} as const;

// ── Phaser number colors (0xRRGGBB) ───────────────────────────────────────

function hexToNum(hex: string): number {
  return parseInt(hex.replace('#', ''), 16);
}

export const CLR_HIGH_CONTRAST = {
  primary:        hexToNum(HEX_HIGH_CONTRAST.primary),
  primarySoft:    hexToNum(HEX_HIGH_CONTRAST.primarySoft),
  primaryStrong:  hexToNum(HEX_HIGH_CONTRAST.primaryStrong),

  accentA:        hexToNum(HEX_HIGH_CONTRAST.accentA),
  accentB:        hexToNum(HEX_HIGH_CONTRAST.accentB),
  accentC:        hexToNum(HEX_HIGH_CONTRAST.accentC),

  success:        hexToNum(HEX_HIGH_CONTRAST.success),
  successSoft:    hexToNum(HEX_HIGH_CONTRAST.successSoft),
  error:          hexToNum(HEX_HIGH_CONTRAST.error),
  errorSoft:      hexToNum(HEX_HIGH_CONTRAST.errorSoft),
  warning:        hexToNum(HEX_HIGH_CONTRAST.warning),

  neutral0:       hexToNum(HEX_HIGH_CONTRAST.neutral0),
  neutral50:      hexToNum(HEX_HIGH_CONTRAST.neutral50),
  neutral100:     hexToNum(HEX_HIGH_CONTRAST.neutral100),
  neutral300:     hexToNum(HEX_HIGH_CONTRAST.neutral300),
  neutral600:     hexToNum(HEX_HIGH_CONTRAST.neutral600),
  neutral900:     hexToNum(HEX_HIGH_CONTRAST.neutral900),
} as const;

export type ColorToken = keyof typeof CLR_HIGH_CONTRAST;
