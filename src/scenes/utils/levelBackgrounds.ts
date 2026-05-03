/**
 * levelBackgrounds — per-level illustrated scene backgrounds.
 * Each of levels 1–9 gets a distinct themed background drawn entirely
 * with Phaser Graphics (no image assets). Falls back to the shared sky
 * gradient for any unrecognised level number.
 * per plans/visual-game-ideas.md §3-A
 */

import * as Phaser from 'phaser';
import { drawSoftGlow } from './levelTheme';

const DEPTH = 0;

// ── Shared palette ───────────────────────────────────────────────────────────

const AMBER = 0xf59e0b;
const SKY = 0xdbeafe; // blue-100

// ── Public entry point ───────────────────────────────────────────────────────

export function drawLevelBackground(
  scene: Phaser.Scene,
  levelNumber: number,
  cw: number,
  ch: number
): void {
  const draw = LEVEL_DRAWS[levelNumber] ?? drawDefaultBg;
  draw(scene, cw, ch);
}

// ── Per-level drawing functions ──────────────────────────────────────────────

const LEVEL_DRAWS: Record<number, (scene: Phaser.Scene, cw: number, ch: number) => void> = {
  1: drawLevel1,
  2: drawLevel2,
  3: drawLevel3,
  4: drawLevel4,
  5: drawLevel5,
  6: drawLevel6,
  7: drawLevel7,
  8: drawLevel8,
  9: drawLevel9,
};

/** Default: the original shared sky. Used as fallback for L10+. */
function drawDefaultBg(scene: Phaser.Scene, cw: number, ch: number): void {
  scene.add.rectangle(cw / 2, ch / 2, cw, ch, SKY).setDepth(DEPTH);
  drawSoftGlow(scene, 100, ch - 160, 260, 0x10b981, 0.35);
  drawSoftGlow(scene, cw - 80, 380, 300, 0x3b82f6, 0.35);
}

/** L1 — Halves: warm kitchen with a counter and two plates */
function drawLevel1(scene: Phaser.Scene, cw: number, ch: number): void {
  // Warm cream background
  scene.add.rectangle(cw / 2, ch / 2, cw, ch, 0xfff8e7).setDepth(DEPTH);

  // Glows
  drawSoftGlow(scene, cw / 2, ch / 2, 400, 0xfbbf24, 0.18);
  drawSoftGlow(scene, 80, ch - 200, 220, 0xf59e0b, 0.22);

  const g = scene.add.graphics().setDepth(DEPTH + 1);

  // Counter / table surface near bottom
  const tabY = ch * 0.72;
  g.fillStyle(0xe8c99a, 1);
  g.fillRect(0, tabY, cw, ch - tabY);
  g.lineStyle(3, 0xc8a96a, 1);
  g.lineBetween(0, tabY, cw, tabY);

  // Left plate
  drawPlate(g, cw * 0.28, tabY - 30, 80);
  // Right plate
  drawPlate(g, cw * 0.72, tabY - 30, 80);

  // Sandwich silhouette between plates
  g.fillStyle(0xfde68a, 0.55);
  g.fillRoundedRect(cw / 2 - 60, tabY - 70, 120, 40, 8);
  g.lineStyle(2, 0xd97706, 0.6);
  g.strokeRoundedRect(cw / 2 - 60, tabY - 70, 120, 40, 8);

  // Title label strip (subtle)
  g.fillStyle(0xfef3c7, 0.5);
  g.fillRoundedRect(cw / 2 - 90, 20, 180, 36, 10);
}

/** L2 — Thirds: garden with three flower beds */
function drawLevel2(scene: Phaser.Scene, cw: number, ch: number): void {
  scene.add.rectangle(cw / 2, ch / 2, cw, ch, 0xf0fdf4).setDepth(DEPTH);
  drawSoftGlow(scene, 400, ch - 200, 350, 0x22c55e, 0.2);
  drawSoftGlow(scene, 100, 300, 200, 0x86efac, 0.25);

  const g = scene.add.graphics().setDepth(DEPTH + 1);

  // Sky strip
  g.fillStyle(0xbae6fd, 0.4);
  g.fillRect(0, 0, cw, ch * 0.35);

  // Ground strip
  const groundY = ch * 0.68;
  g.fillStyle(0x4ade80, 0.35);
  g.fillRect(0, groundY, cw, ch - groundY);
  g.lineStyle(2, 0x16a34a, 0.4);
  g.lineBetween(0, groundY, cw, groundY);

  // Three flower beds at bottom
  const bedW = cw / 3 - 24;
  const bedH = 70;
  const bedY = groundY + 20;
  const bedColors = [0x86efac, 0x6ee7b7, 0xa7f3d0];
  for (let i = 0; i < 3; i++) {
    const bx = 12 + i * (cw / 3) + (cw / 3 - bedW) / 2;
    g.fillStyle(bedColors[i]!, 0.7);
    g.fillRoundedRect(bx, bedY, bedW, bedH, 8);
    g.lineStyle(2, 0x16a34a, 0.5);
    g.strokeRoundedRect(bx, bedY, bedW, bedH, 8);

    // Flowers in each bed
    drawFlowers(g, bx + bedW / 2, bedY + 24, 3, 0xfde68a);
  }
}

/** L3 — Quarters: park divided into 4 quadrants by a path */
function drawLevel3(scene: Phaser.Scene, cw: number, ch: number): void {
  scene.add.rectangle(cw / 2, ch / 2, cw, ch, 0xecfdf5).setDepth(DEPTH);
  drawSoftGlow(scene, cw / 2, ch / 2, 380, 0x0ea5e9, 0.18);
  drawSoftGlow(scene, cw - 60, ch - 150, 200, 0x22c55e, 0.2);

  const g = scene.add.graphics().setDepth(DEPTH + 1);

  // Quadrant fill colours
  const quadColors = [0xbae6fd, 0xd9f99d, 0xfef08a, 0xfbcfe8];
  const mid = { x: cw / 2, y: ch * 0.52 };
  const extents = [
    { x: 0, y: ch * 0.22 },
    { x: cw / 2 + 8, y: ch * 0.22 },
    { x: 0, y: mid.y + 8 },
    { x: cw / 2 + 8, y: mid.y + 8 },
  ];
  const qw = cw / 2 - 8;
  const qh = (ch * 0.52 - ch * 0.22) - 8;

  quadColors.forEach((c, i) => {
    g.fillStyle(c, 0.38);
    g.fillRect(extents[i]!.x, extents[i]!.y, qw, qh);
  });

  // Cross-path (horizontal + vertical)
  const PATH_W = 16;
  g.fillStyle(0xe5e7eb, 0.7);
  g.fillRect(0, mid.y - PATH_W / 2, cw, PATH_W);
  g.fillRect(mid.x - PATH_W / 2, ch * 0.22, PATH_W, ch * 0.52 - ch * 0.22 + PATH_W / 2);
  g.lineStyle(2, 0x9ca3af, 0.5);
  g.lineBetween(0, mid.y, cw, mid.y);
  g.lineBetween(mid.x, ch * 0.22, mid.x, mid.y + PATH_W / 2);

  // Small tree circles in two quadrants
  drawTree(g, cw * 0.25, ch * 0.38);
  drawTree(g, cw * 0.75, ch * 0.38);
}

/** L4 — Identifying: library with shelves */
function drawLevel4(scene: Phaser.Scene, cw: number, ch: number): void {
  scene.add.rectangle(cw / 2, ch / 2, cw, ch, 0xf5f3ff).setDepth(DEPTH);
  drawSoftGlow(scene, 160, ch / 2, 300, 0x818cf8, 0.2);
  drawSoftGlow(scene, cw - 100, 350, 260, 0xa78bfa, 0.18);

  const g = scene.add.graphics().setDepth(DEPTH + 1);

  // Wall
  g.fillStyle(0xede9fe, 0.55);
  g.fillRect(0, ch * 0.18, cw, ch * 0.62);

  // Two bookshelves
  drawShelf(g, cw / 2 - 160, ch * 0.3, 320, 90);
  drawShelf(g, cw / 2 - 160, ch * 0.46, 320, 90);
  drawShelf(g, cw / 2 - 160, ch * 0.62, 320, 90);

  // Floor
  g.fillStyle(0xddd6fe, 0.4);
  g.fillRect(0, ch * 0.78, cw, ch * 0.22);
}

/** L5 — Art studio: colour mixing with paint blobs */
function drawLevel5(scene: Phaser.Scene, cw: number, ch: number): void {
  scene.add.rectangle(cw / 2, ch / 2, cw, ch, 0xfff1f2).setDepth(DEPTH);
  drawSoftGlow(scene, 160, ch * 0.4, 260, 0xf472b6, 0.2);
  drawSoftGlow(scene, cw - 140, ch * 0.55, 260, 0x60a5fa, 0.2);
  drawSoftGlow(scene, cw * 0.5, ch * 0.7, 200, 0xfbbf24, 0.18);

  const g = scene.add.graphics().setDepth(DEPTH + 1);

  // Canvas / easel silhouette
  g.fillStyle(0xfbcfe8, 0.3);
  g.fillRoundedRect(cw * 0.25, ch * 0.25, cw * 0.5, ch * 0.38, 8);
  g.lineStyle(2, 0xf9a8d4, 0.5);
  g.strokeRoundedRect(cw * 0.25, ch * 0.25, cw * 0.5, ch * 0.38, 8);

  // Paint blobs
  const blobs: [number, number, number, number][] = [
    [cw * 0.15, ch * 0.55, 44, 0xef4444],
    [cw * 0.28, ch * 0.62, 36, 0xfbbf24],
    [cw * 0.72, ch * 0.55, 40, 0x60a5fa],
    [cw * 0.85, ch * 0.6, 32, 0x34d399],
    [cw * 0.5, ch * 0.68, 28, 0xa78bfa],
  ];
  for (const [bx, by, br, bc] of blobs) {
    g.fillStyle(bc, 0.35);
    g.fillCircle(bx, by, br);
  }
}

/** L6 — Sports field / comparing */
function drawLevel6(scene: Phaser.Scene, cw: number, ch: number): void {
  scene.add.rectangle(cw / 2, ch / 2, cw, ch, 0xf0fdf4).setDepth(DEPTH);
  drawSoftGlow(scene, cw / 2, ch * 0.55, 400, 0x22c55e, 0.2);

  const g = scene.add.graphics().setDepth(DEPTH + 1);

  // Field
  const fieldY = ch * 0.28;
  const fieldH = ch * 0.52;
  g.fillStyle(0x4ade80, 0.25);
  g.fillRect(20, fieldY, cw - 40, fieldH);
  g.lineStyle(3, 0x16a34a, 0.4);
  g.strokeRect(20, fieldY, cw - 40, fieldH);

  // Centre line
  g.lineStyle(2, 0xffffff, 0.6);
  g.lineBetween(cw / 2, fieldY, cw / 2, fieldY + fieldH);

  // Centre circle
  g.lineStyle(2, 0xffffff, 0.45);
  g.strokeCircle(cw / 2, fieldY + fieldH / 2, 60);

  // Goal posts
  drawGoal(g, 20, fieldY + fieldH / 2, 'left');
  drawGoal(g, cw - 20, fieldY + fieldH / 2, 'right');

  // Dashed lane lines
  g.lineStyle(2, 0xffffff, 0.3);
  for (let lx = cw * 0.25; lx < cw; lx += cw * 0.25) {
    if (Math.abs(lx - cw / 2) < 10) continue;
    drawDashedLine(g, lx, fieldY, lx, fieldY + fieldH, 14, 10);
  }
}

/** L7 — Ordering: mountain staircase */
function drawLevel7(scene: Phaser.Scene, cw: number, ch: number): void {
  scene.add.rectangle(cw / 2, ch / 2, cw, ch, 0xeef2ff).setDepth(DEPTH);
  drawSoftGlow(scene, cw * 0.5, ch * 0.4, 360, 0x818cf8, 0.18);
  drawSoftGlow(scene, 80, ch - 120, 200, 0x6366f1, 0.15);

  const g = scene.add.graphics().setDepth(DEPTH + 1);

  // Sky gradient strip
  g.fillStyle(0xbae6fd, 0.3);
  g.fillRect(0, 0, cw, ch * 0.45);

  // Mountain silhouettes (back to front)
  drawMountain(g, cw * 0.5, ch * 0.65, 500, 0x6366f1, 0.25);
  drawMountain(g, cw * 0.25, ch * 0.7, 360, 0x818cf8, 0.3);
  drawMountain(g, cw * 0.78, ch * 0.72, 320, 0x818cf8, 0.28);
  drawMountain(g, cw * 0.12, ch * 0.75, 240, 0xa5b4fc, 0.35);
  drawMountain(g, cw * 0.88, ch * 0.75, 200, 0xa5b4fc, 0.35);

  // Stair path ascending left to right
  g.lineStyle(3, AMBER, 0.55);
  const steps = 5;
  const stepW = cw / (steps + 1);
  const stepH = ch * 0.08;
  let sx = stepW * 0.5;
  let sy = ch * 0.75;
  for (let i = 0; i < steps; i++) {
    g.lineBetween(sx, sy, sx + stepW, sy);
    g.lineBetween(sx + stepW, sy, sx + stepW, sy - stepH);
    sx += stepW;
    sy -= stepH;
  }
}

/** L8 — Benchmark: playground with a seesaw */
function drawLevel8(scene: Phaser.Scene, cw: number, ch: number): void {
  scene.add.rectangle(cw / 2, ch / 2, cw, ch, 0xe0f2fe).setDepth(DEPTH);
  drawSoftGlow(scene, cw * 0.5, ch * 0.5, 380, 0x38bdf8, 0.18);
  drawSoftGlow(scene, 80, ch - 160, 200, 0x0ea5e9, 0.2);

  const g = scene.add.graphics().setDepth(DEPTH + 1);

  // Ground
  g.fillStyle(0xa3e635, 0.3);
  g.fillRect(0, ch * 0.72, cw, ch * 0.28);
  g.lineStyle(2, 0x65a30d, 0.35);
  g.lineBetween(0, ch * 0.72, cw, ch * 0.72);

  // Seesaw
  const pivot = { x: cw / 2, y: ch * 0.65 };
  const plankTilt = 12; // degrees
  const plankL = 280;
  const plankH = 12;
  const rad = (plankTilt * Math.PI) / 180;
  const dx = Math.cos(rad) * plankL / 2;
  const dy = Math.sin(rad) * plankL / 2;

  // Plank
  g.fillStyle(0x854d0e, 0.7);
  g.beginPath();
  g.moveTo(pivot.x - dx, pivot.y + dy - plankH / 2);
  g.lineTo(pivot.x + dx, pivot.y - dy - plankH / 2);
  g.lineTo(pivot.x + dx, pivot.y - dy + plankH / 2);
  g.lineTo(pivot.x - dx, pivot.y + dy + plankH / 2);
  g.closePath();
  g.fillPath();

  // Pivot triangle
  g.fillStyle(0x78716c, 0.8);
  g.fillTriangle(pivot.x - 20, ch * 0.72, pivot.x + 20, ch * 0.72, pivot.x, pivot.y);

  // Kids on each end (simple circles)
  g.fillStyle(0xfb923c, 0.8);
  g.fillCircle(pivot.x - dx - 2, pivot.y + dy - 28, 18);
  g.fillStyle(0x60a5fa, 0.8);
  g.fillCircle(pivot.x + dx + 2, pivot.y - dy - 28, 18);

  // Clouds
  drawCloud(g, cw * 0.2, ch * 0.15, 60);
  drawCloud(g, cw * 0.7, ch * 0.1, 80);
}

/** L9 — Space station: dark sky, stars, planet */
function drawLevel9(scene: Phaser.Scene, cw: number, ch: number): void {
  scene.add.rectangle(cw / 2, ch / 2, cw, ch, 0x0a1128).setDepth(DEPTH);
  drawSoftGlow(scene, cw * 0.3, ch * 0.45, 300, 0x6366f1, 0.3);
  drawSoftGlow(scene, cw * 0.75, ch * 0.6, 240, 0x818cf8, 0.22);

  const g = scene.add.graphics().setDepth(DEPTH + 1);

  // Star field
  const rng = seededRandom(42);
  for (let i = 0; i < 80; i++) {
    const sx = rng() * cw;
    const sy = rng() * ch;
    const sr = rng() * 1.8 + 0.4;
    const sa = 0.4 + rng() * 0.6;
    g.fillStyle(0xffffff, sa);
    g.fillCircle(sx, sy, sr);
  }

  // Large planet (bottom-right)
  g.fillStyle(0x4f46e5, 0.55);
  g.fillCircle(cw * 0.82, ch * 0.78, 100);
  g.fillStyle(0x6366f1, 0.4);
  g.fillCircle(cw * 0.82 - 20, ch * 0.78 - 24, 70);

  // Ring around planet
  g.lineStyle(4, 0x818cf8, 0.45);
  g.strokeEllipse(cw * 0.82, ch * 0.78, 240, 50);

  // Rocket silhouette (top-left, small)
  drawRocket(g, cw * 0.18, ch * 0.25);

  // Small moon
  g.fillStyle(0xe5e7eb, 0.4);
  g.fillCircle(cw * 0.62, ch * 0.2, 36);
}

// ── Drawing helpers ──────────────────────────────────────────────────────────

function drawPlate(g: Phaser.GameObjects.Graphics, cx: number, cy: number, r: number): void {
  g.fillStyle(0xffffff, 0.75);
  g.fillCircle(cx, cy, r);
  g.lineStyle(3, 0xd1d5db, 0.7);
  g.strokeCircle(cx, cy, r);
}

function drawFlowers(
  g: Phaser.GameObjects.Graphics,
  cx: number,
  cy: number,
  count: number,
  petalColor: number
): void {
  const spacing = 28;
  for (let i = 0; i < count; i++) {
    const fx = cx + (i - (count - 1) / 2) * spacing;
    for (let p = 0; p < 5; p++) {
      const angle = (p / 5) * Math.PI * 2;
      g.fillStyle(petalColor, 0.7);
      g.fillCircle(fx + Math.cos(angle) * 8, cy + Math.sin(angle) * 8, 6);
    }
    g.fillStyle(0xfef3c7, 1);
    g.fillCircle(fx, cy, 5);
    // Stem
    g.lineStyle(2, 0x16a34a, 0.7);
    g.lineBetween(fx, cy + 5, fx, cy + 20);
  }
}

function drawTree(g: Phaser.GameObjects.Graphics, cx: number, cy: number): void {
  g.lineStyle(3, 0x713f12, 0.5);
  g.lineBetween(cx, cy, cx, cy + 40);
  g.fillStyle(0x16a34a, 0.35);
  g.fillCircle(cx, cy - 20, 36);
}

function drawShelf(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  w: number,
  h: number
): void {
  // Shelf board
  g.fillStyle(0xd8b4fe, 0.45);
  g.fillRoundedRect(x, y + h - 14, w, 14, 4);
  g.lineStyle(2, 0xa855f7, 0.4);
  g.strokeRoundedRect(x, y + h - 14, w, 14, 4);

  // Books on the shelf
  const bookColors = [0xef4444, 0xf59e0b, 0x22c55e, 0x3b82f6, 0xa855f7, 0xec4899, 0x14b8a6];
  const bookW = Math.floor(w / bookColors.length) - 4;
  for (let i = 0; i < bookColors.length; i++) {
    const bx = x + i * (bookW + 4) + 2;
    const bh = 30 + (i % 3) * 10;
    g.fillStyle(bookColors[i]!, 0.6);
    g.fillRoundedRect(bx, y + h - 14 - bh, bookW, bh, 2);
  }
}

function drawMountain(
  g: Phaser.GameObjects.Graphics,
  cx: number,
  base: number,
  w: number,
  color: number,
  alpha: number
): void {
  g.fillStyle(color, alpha);
  g.fillTriangle(cx - w / 2, base, cx + w / 2, base, cx, base - w * 0.7);
}

function drawGoal(
  g: Phaser.GameObjects.Graphics,
  x: number,
  cy: number,
  side: 'left' | 'right'
): void {
  const dir = side === 'left' ? 1 : -1;
  const w = 30;
  const h = 50;
  g.lineStyle(3, 0xffffff, 0.5);
  g.lineBetween(x, cy - h, x + dir * w, cy - h);
  g.lineBetween(x + dir * w, cy - h, x + dir * w, cy + h);
  g.lineBetween(x, cy + h, x + dir * w, cy + h);
}

function drawCloud(g: Phaser.GameObjects.Graphics, cx: number, cy: number, r: number): void {
  g.fillStyle(0xffffff, 0.35);
  g.fillCircle(cx, cy, r * 0.6);
  g.fillCircle(cx - r * 0.5, cy + r * 0.2, r * 0.45);
  g.fillCircle(cx + r * 0.55, cy + r * 0.15, r * 0.5);
  g.fillCircle(cx + r * 0.1, cy + r * 0.35, r * 0.4);
}

function drawRocket(g: Phaser.GameObjects.Graphics, cx: number, cy: number): void {
  // Body
  g.fillStyle(0xe2e8f0, 0.55);
  g.fillRoundedRect(cx - 10, cy - 30, 20, 50, 6);
  // Nose
  g.fillStyle(0xe2e8f0, 0.55);
  g.fillTriangle(cx - 10, cy - 30, cx + 10, cy - 30, cx, cy - 58);
  // Fins
  g.fillStyle(0xf59e0b, 0.5);
  g.fillTriangle(cx - 10, cy + 10, cx - 22, cy + 26, cx - 10, cy + 20);
  g.fillTriangle(cx + 10, cy + 10, cx + 22, cy + 26, cx + 10, cy + 20);
  // Window
  g.fillStyle(0x7dd3fc, 0.6);
  g.fillCircle(cx, cy - 10, 7);
}

function drawDashedLine(
  g: Phaser.GameObjects.Graphics,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  dashLen: number,
  gapLen: number
): void {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const total = Math.sqrt(dx * dx + dy * dy);
  const ux = dx / total;
  const uy = dy / total;
  let t = 0;
  let drawing = true;
  while (t < total) {
    const seg = Math.min(drawing ? dashLen : gapLen, total - t);
    if (drawing) {
      g.lineBetween(x1 + ux * t, y1 + uy * t, x1 + ux * (t + seg), y1 + uy * (t + seg));
    }
    t += seg;
    drawing = !drawing;
  }
}

/** Simple seeded pseudo-random for consistent star field. */
function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0x100000000;
  };
}
