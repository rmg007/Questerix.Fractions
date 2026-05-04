// Layout constants
export const CW = 800;
export const CH = 1280;
export const PLAY_Y = 1100;
export const CONT_Y = 700;
export const SET_Y = 420;
export const STATION_X = CW / 2;

// Colors
export const SKY_BG = 0xe0f2fe;
export const PATH_BLUE = 0x93c5fd;
export const WHITE = 0xffffff;
export const NAVY = 0x1e3a8a;
export const PLAY_FILL = 0xfcd34d;
export const PLAY_HOVER = 0xf59e0b;
export const CONT_FILL = 0x047857;
export const CONT_HOVER = 0x065f46;
export const SET_FILL = 0x60a5fa;
export const SET_HOVER = 0x3b82f6;
export const GLOW_EMERALD = 0x6ee7b7;
export const GLOW_BLUE = 0x93c5fd;

/**
 * Sample a wavy path from bottom (0) to top (1) on the canvas.
 */
export function samplePath(): { x: number; y: number }[] {
  const path: { x: number; y: number }[] = [];
  const baseline = PLAY_Y;
  const amplitude = 30;
  const frequency = 0.008;

  for (let y = baseline; y >= SET_Y - 10; y -= 10) {
    const waviness = amplitude * Math.sin((baseline - y) * frequency);
    path.push({ x: STATION_X + waviness, y });
  }

  return path;
}
