import * as Phaser from 'phaser';
import { PATH_BLUE, WHITE } from './menuLayoutHelpers';

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
 * Draws the wavy number line path with marching dashes.
 * Returns the tick handler for the marching dashes animation.
 */
export function drawMenuPath(
  scene: Phaser.Scene,
  pathPts: { x: number; y: number }[],
  reduceMotion: boolean
): (() => void) | null {
  // Wide light-blue base stroke
  const base = scene.add.graphics().setDepth(2);
  base.lineStyle(28, PATH_BLUE, 1);
  base.beginPath();
  base.moveTo(pathPts[0]!.x, pathPts[0]!.y);
  for (let i = 1; i < pathPts.length; i++) base.lineTo(pathPts[i]!.x, pathPts[i]!.y);
  base.strokePath();

  // Round caps via filled circles at endpoints
  base.fillStyle(PATH_BLUE, 1);
  base.fillCircle(pathPts[0]!.x, pathPts[0]!.y, 14);
  base.fillCircle(pathPts[pathPts.length - 1]!.x, pathPts[pathPts.length - 1]!.y, 14);

  // Marching white dashes on top
  const dashG = scene.add.graphics().setDepth(3);
  const dashLen = 14;
  const gapLen = 14;
  const cycle = dashLen + gapLen;

  const drawDashes = (offset: number) => {
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
      // Find the first dash start in this segment
      let local = -traveled;
      // Snap to cycle so dashes are continuous across segments
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

  if (!reduceMotion) {
    let phase = 0;
    const tick = () => {
      phase = (phase + 0.6) % cycle;
      drawDashes(phase);
    };
    scene.events.on('update', tick);
    return tick;
  }

  return null;
}
