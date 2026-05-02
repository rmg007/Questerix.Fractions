/**
 * MenuPath — drawing helpers extracted from MenuScene.
 *
 * Functions are stateless and receive the Phaser scene as their first argument
 * so they can be unit-tested in isolation (mock the scene) and reused if a
 * future menu variant wants the same number-line aesthetic.
 *
 * per design-language.md §3 (Lexend body / Fredoka One display), §6.4 (motion)
 */

import * as Phaser from 'phaser';
import { BODY_FONT } from './levelTheme';

const PATH_BLUE = 0x93c5fd;
const WHITE = 0xffffff;
const NAVY = 0x1e3a8a;
const NAVY_HEX = '#1E3A8A';

export interface PathPoint {
  x: number;
  y: number;
}

export interface SamplePathOpts {
  stationX: number;
  playY: number;
  continueY: number;
  settingsY: number;
}

/**
 * Sample the snake-like number-line path into points so we can draw both
 * the wide colored line AND the marching white dashes from one source of
 * truth. Phaser 4 Graphics has no bezierCurveTo, so we sample manually.
 *
 * Path mirrors the SVG from the approved mockup:
 *   start at PLAY (bottom)
 *   curve LEFT up to CONTINUE (middle)
 *   curve RIGHT up to SETTINGS (top)
 */
export function samplePath(opts: SamplePathOpts): PathPoint[] {
  const { stationX, playY, continueY, settingsY } = opts;
  const segments: [number, number, number, number, number, number, number, number][] = [
    [stationX, playY, 200, playY - 100, 200, continueY + 100, stationX, continueY],
    [stationX, continueY, 600, continueY - 100, 600, settingsY + 100, stationX, settingsY],
  ];
  const pts: PathPoint[] = [];
  pts.push({ x: segments[0]![0]!, y: segments[0]![1]! });
  for (const [x0, y0, cx1, cy1, cx2, cy2, x1, y1] of segments) {
    const steps = 48;
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      const u = 1 - t;
      const px = u * u * u * x0 + 3 * u * u * t * cx1 + 3 * u * t * t * cx2 + t * t * t * x1;
      const py = u * u * u * y0 + 3 * u * u * t * cy1 + 3 * u * t * t * cy2 + t * t * t * y1;
      pts.push({ x: px, y: py });
    }
  }
  return pts;
}

/**
 * Approximate a CSS-style blur by stacking translucent ellipses. Faster and
 * more reliable across browsers than Phaser blur shaders.
 */
export function drawSoftGlow(
  scene: Phaser.Scene,
  cx: number,
  cy: number,
  radius: number,
  color: number,
  alpha: number
): void {
  const g = scene.add.graphics().setDepth(1);
  const layers = 5;
  for (let i = 0; i < layers; i++) {
    const t = (i + 1) / layers;
    g.fillStyle(color, alpha * (1 - t * 0.6));
    g.fillCircle(cx, cy, radius * t);
  }
}

/**
 * Render the wide light-blue base path plus the marching white dashes.
 * Returns the per-frame tick handler so the caller can detach it on shutdown.
 * Returns null when reduced-motion is active (no animation registered).
 */
export function drawPath(
  scene: Phaser.Scene,
  pathPts: PathPoint[],
  reduceMotion: boolean
): (() => void) | null {
  // Wide light-blue base stroke
  const base = scene.add.graphics().setDepth(2);
  base.lineStyle(28, PATH_BLUE, 1);
  base.beginPath();
  base.moveTo(pathPts[0]!.x, pathPts[0]!.y);
  for (let i = 1; i < pathPts.length; i++) base.lineTo(pathPts[i]!.x, pathPts[i]!.y);
  base.strokePath();
  base.fillStyle(PATH_BLUE, 1);
  base.fillCircle(pathPts[0]!.x, pathPts[0]!.y, 14);
  base.fillCircle(pathPts[pathPts.length - 1]!.x, pathPts[pathPts.length - 1]!.y, 14);

  const dashG = scene.add.graphics().setDepth(3);
  const dashLen = 14;
  const gapLen = 14;
  const cycle = dashLen + gapLen;

  const drawDashes = (offset: number): void => {
    dashG.clear();
    dashG.lineStyle(10, WHITE, 1);
    let traveled = -offset;
    for (let i = 1; i < pathPts.length; i++) {
      const a = pathPts[i - 1]!;
      const b = pathPts[i]!;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const segLen = Math.hypot(dx, dy);
      if (segLen === 0) continue;
      const ux = dx / segLen;
      const uy = dy / segLen;
      let local = -traveled;
      while (local < 0) local += cycle;
      while (local < segLen) {
        const dashStart = local;
        const dashEnd = Math.min(segLen, local + dashLen);
        if (dashEnd > dashStart) {
          dashG.lineBetween(
            a.x + ux * dashStart,
            a.y + uy * dashStart,
            a.x + ux * dashEnd,
            a.y + uy * dashEnd
          );
        }
        local += cycle;
      }
      traveled += segLen;
    }
  };

  drawDashes(0);

  if (reduceMotion) return null;

  let phase = 0;
  const tick = (): void => {
    phase = (phase + 0.6) % cycle;
    drawDashes(phase);
  };
  scene.events.on('update', tick);
  return tick;
}

/**
 * White rounded pill with navy border + body text. Used for the title tagline
 * and station word labels (Settings, etc.). When the text contains "!" the
 * pill rotates slightly for playfulness — that detail comes from the mockup.
 */
export function drawTaglinePill(
  scene: Phaser.Scene,
  cx: number,
  cy: number,
  text: string,
  fontSize = 30,
  bgAlpha = 0.95
): Phaser.GameObjects.Container {
  const padX = 22;
  const padY = 12;
  const txt = scene.add
    .text(0, 0, text, {
      fontFamily: BODY_FONT,
      fontStyle: 'bold',
      fontSize: `${fontSize}px`,
      color: NAVY_HEX,
    })
    .setOrigin(0.5);
  const w = txt.width + padX * 2;
  const h = txt.height + padY * 2;

  const bg = scene.add.graphics();
  bg.fillStyle(WHITE, bgAlpha);
  bg.fillRoundedRect(-w / 2, -h / 2, w, h, h / 2);
  bg.lineStyle(4, NAVY, 1);
  bg.strokeRoundedRect(-w / 2, -h / 2, w, h, h / 2);

  const container = scene.add.container(cx, cy, [bg, txt]).setDepth(20);
  if (text.includes('!')) container.setAngle(-2.5);
  return container;
}
