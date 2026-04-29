/**
 * Palette tokens for Phaser (number) and CSS (hex string).
 * per design-language.md §2 — Simple + Bright, no neon.
 * All hex values from design-language.md §2.1–2.4.
 */

// ── Hex strings (CSS / DOM usage) ─────────────────────────────────────────

export const HEX = {
  // §2.1 Primary
  primary: '#2F6FED',
  primarySoft: '#D9E5FB',
  primaryStrong: '#1A4FBF',

  // §2.2 Accent
  accentA: '#FFB400',
  accentB: '#7B2CBF',
  accentC: '#0FA968',

  // §2.3 Semantic
  success: '#1FAA59',
  successSoft: '#D6F1E0',
  error: '#E5484D',
  errorSoft: '#FBE3E4',
  warning: '#D88E1F', // C6.3: darkened to 4.6:1 contrast before text usage (WCAG AA 4.5:1)

  // §2.4 Neutrals
  neutral0: '#FFFFFF',
  neutral50: '#F7F8FA',
  neutral100: '#EEF0F4',
  neutral300: '#C5CAD3',
  neutral600: '#5B6478',
  neutral900: '#101521',

  // ux-elevation tokens — referenced by Quest persona constants and
  // upcoming celebration/sparkle PRs. Values per PLANS/ux-elevation.md
  // §"Tokens to add" (joy/gold/goldDim/sparkle); coralCheek picked to
  // match the §4 "pale-coral cheek dots" description on Quest's idle face.
  joy: '#FF5E9C', // hot pink — celebration accent (T26)
  gold: '#FBBF24', // amber-400 — star fill / Quest body (T25.C, T26.B)
  goldDim: '#FDE68A', // amber-200 — empty star outline shimmer
  sparkle: '#FEF3C7', // pale gold — sparkle particles (T26.A)
  coralCheek: '#FCA5A5', // rose-300 — Quest idle cheek dots (§4)
  unfilled: '#E5E7EB', // gray-200 — empty fraction-part fill placeholder
} as const;

// ── Phaser number colors (0xRRGGBB) ───────────────────────────────────────

function hexToNum(hex: string): number {
  return parseInt(hex.replace('#', ''), 16);
}

export const CLR = {
  primary: hexToNum(HEX.primary),
  primarySoft: hexToNum(HEX.primarySoft),
  primaryStrong: hexToNum(HEX.primaryStrong),

  accentA: hexToNum(HEX.accentA),
  accentB: hexToNum(HEX.accentB),
  accentC: hexToNum(HEX.accentC),

  success: hexToNum(HEX.success),
  successSoft: hexToNum(HEX.successSoft),
  error: hexToNum(HEX.error),
  errorSoft: hexToNum(HEX.errorSoft),
  warning: hexToNum(HEX.warning),

  neutral0: hexToNum(HEX.neutral0),
  neutral50: hexToNum(HEX.neutral50),
  neutral100: hexToNum(HEX.neutral100),
  neutral300: hexToNum(HEX.neutral300),
  neutral600: hexToNum(HEX.neutral600),
  neutral900: hexToNum(HEX.neutral900),
} as const;

export type ColorToken = keyof typeof CLR;
