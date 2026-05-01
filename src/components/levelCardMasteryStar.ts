/**
 * Mastery star badge — PLAN.md Phase 2d.
 *
 * Renders a 24 px, 5-pointed gold (#FFD700) star in the top-right corner of a
 * LevelCard when the level's BKT masteryEstimate ≥ 0.85. Replaces the prior
 * amber-400 top ribbon. Extracted from LevelCard.ts to keep that file under
 * its 300 LOC budget.
 *
 * The badge sits above the card body but below any focus ring (which scenes
 * draw at depth >= card depth + 1). Static — no tween — so reduced-motion is
 * a non-issue here.
 */
import * as Phaser from 'phaser';

const STAR_GOLD = 0xffd700; // true gold per spec
const STAR_BORDER = 0xb45309; // amber-700 outline for contrast on pale cards
const STAR_OUTER_R = 12; // 12 → 24 px star
const STAR_INNER_RATIO = 0.45; // 5-pointed star inner-to-outer radius
const STAR_PADDING = 6; // edge-to-centre offset from the card corner

/**
 * Draw a 24 px gold mastery star at the top-right corner of a card whose
 * local origin is centred at (0, 0) with size cardW × cardH.
 *
 * Dimensions are divided by `containerScale` so the star renders at a fixed
 * 24 screen-pixels regardless of any setScale the parent applies.
 */
export function drawMasteryStar(
  scene: Phaser.Scene,
  cardW: number,
  cardH: number,
  containerScale: number
): Phaser.GameObjects.Graphics {
  const cs = containerScale > 0 ? containerScale : 1;
  const r = STAR_OUTER_R / cs;
  const ri = r * STAR_INNER_RATIO;
  const pad = STAR_PADDING / cs;
  const cx = cardW / 2 - pad - r;
  const cy = -cardH / 2 + pad + r;

  // 5-pointed star polygon: 10 vertices alternating outer/inner radius.
  const pts: number[] = [];
  for (let i = 0; i < 10; i++) {
    const angle = (Math.PI / 5) * i - Math.PI / 2; // start at top
    const radius = i % 2 === 0 ? r : ri;
    pts.push(cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius);
  }

  const g = scene.add.graphics();
  g.fillStyle(STAR_GOLD, 1);
  g.lineStyle(Math.max(1, 2 / cs), STAR_BORDER, 1);
  g.beginPath();
  g.moveTo(pts[0]!, pts[1]!);
  for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i]!, pts[i + 1]!);
  g.closePath();
  g.fillPath();
  g.strokePath();
  return g;
}
