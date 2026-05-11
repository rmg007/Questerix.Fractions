/**
 * Renderer tokens for Pixi interactions.
 * Design system constants: colors, spacing, typography, motion, stroke.
 * Per React+PixiJS migration plan §5
 */

/**
 * Color palette — reused from existing theme system.
 */
export const COLORS = {
  // Primary UI
  primary: 0x2f6fed,
  primaryLight: 0x5b8fff,
  primaryDark: 0x1a4fc3,

  // Feedback
  correct: 0x4caf50,
  incorrect: 0xf44336,
  warning: 0xff9800,
  neutral: 0x9e9e9e,

  // UI elements
  buttonActive: 0x2196f3,
  buttonInactive: 0xbdbdbd,
  buttonHover: 0x1976d2,

  // Text & backgrounds
  textPrimary: 0x212121,
  textSecondary: 0x757575,
  textInverse: 0xffffff,
  backgroundLight: 0xfafafa,
  backgroundDark: 0xf5f5f5,

  // Interaction states
  selected: 0x2196f3,
  hovered: 0xe3f2fd,
  disabled: 0xeeeeee,

  // Borders & dividers
  border: 0xbdbdbd,
  divider: 0xe0e0e0,
  transparent: 0x000000,
} as const;

/**
 * Spacing scale (in pixels).
 */
export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

/**
 * Typography sizes (in pixels).
 */
export const TYPOGRAPHY = {
  caption: 10,
  body: 12,
  small: 14,
  normal: 16,
  heading: 20,
  title: 24,
} as const;

/**
 * Touch target and hit area sizing (minimum 44x44 per WCAG).
 */
export const TOUCH_TARGETS = {
  minimum: 44,
  button: 48,
  smallButton: 40,
  sliderTrack: 50,
} as const;

/**
 * Stroke widths (in pixels).
 */
export const STROKE = {
  thin: 1,
  normal: 2,
  medium: 3,
  bold: 4,
  thick: 5,
} as const;

/**
 * Motion durations (in milliseconds).
 */
export const MOTION = {
  instant: 0,
  fast: 150,
  normal: 300,
  slow: 500,
  verySlow: 800,
} as const;

/**
 * Easing curves (normalized 0..1 over time).
 */
export const EASING = {
  linear: (t: number) => t,
  easeIn: (t: number) => t * t,
  easeOut: (t: number) => t * (2 - t),
  easeInOut: (t: number) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),
} as const;

/**
 * Responsive breakpoints (width in pixels).
 */
export const BREAKPOINTS = {
  mobile: 360,
  tablet: 768,
  desktop: 1024,
} as const;

/**
 * Z-index scale (Pixi layer depth).
 */
export const Z_INDEX = {
  background: 0,
  base: 100,
  interactive: 200,
  overlay: 300,
  modal: 400,
  tooltip: 500,
} as const;

/**
 * Corner radius (in pixels).
 */
export const RADIUS = {
  none: 0,
  sm: 2,
  md: 4,
  lg: 8,
  xl: 12,
  full: 9999,
} as const;
