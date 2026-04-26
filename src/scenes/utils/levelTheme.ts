/**
 * levelTheme — shared visual language for gameplay scenes.
 *
 * Carries the "Number Line Quest" aesthetic established by MenuScene into every
 * Level/activity scene: sky-blue background, soft ambient glow circles, Fredoka
 * One display font, and chunky 3-D buttons (amber action, blue hint).
 *
 * per design-language.md §2–§3, §6.4 (reduced-motion)
 */

import * as Phaser from 'phaser';

// ── Palette (mirrors MenuScene constants) ────────────────────────────────────

export const SKY_BG    = 0xe0f2fe; // #E0F2FE — pale sky
export const PATH_BLUE = 0x93c5fd; // #93C5FD — light blue path / partition line bg

const WHITE     = 0xffffff;
const WHITE_HEX = '#FFFFFF';
const NAVY      = 0x1e3a8a;
export const NAVY_HEX  = '#1E3A8A';

// Action ("Check") button — amber, matching the Play! station
export const ACTION_FILL   = 0xfcd34d; // amber-300
export const ACTION_HOVER  = 0xf59e0b; // amber-500
export const ACTION_BORDER = 0xb45309; // amber-700
export const ACTION_TEXT   = '#78350F'; // amber-900

// Hint button — blue, matching the Settings station
export const HINT_FILL   = 0x60a5fa; // blue-400
export const HINT_HOVER  = 0x3b82f6; // blue-500
export const HINT_BORDER = 0x1e3a8a; // blue-900
export const HINT_TEXT_CLR = '#1E3A8A'; // blue-900

// Secondary ("Back to menu") button — white pill with navy border
export const SEC_FILL   = WHITE;
export const SEC_BORDER = NAVY;
export const SEC_TEXT   = NAVY_HEX;

const GLOW_EMERALD = 0x6ee7b7; // emerald-300
const GLOW_BLUE    = 0x93c5fd; // blue-300

export const TITLE_FONT = '"Fredoka One", "Nunito", system-ui, sans-serif';
export const BODY_FONT  = '"Nunito", system-ui, sans-serif';

// ── Background ───────────────────────────────────────────────────────────────

/**
 * Draw the pale-sky backdrop + two ambient soft-glow circles.
 * Must be called early in create() at depth 0–1.
 */
export function drawAdventureBackground(
  scene: Phaser.Scene,
  cw: number,
  ch: number,
): void {
  scene.add.rectangle(cw / 2, ch / 2, cw, ch, SKY_BG).setDepth(0);
  drawSoftGlow(scene, 100,       ch - 160, 260, GLOW_EMERALD, 0.4);
  drawSoftGlow(scene, cw - 80,  380,       300, GLOW_BLUE,    0.4);
}

/**
 * Stack translucent ellipses to simulate a blurred glow circle.
 * Identical approach to MenuScene.drawSoftGlow — no shader required.
 */
export function drawSoftGlow(
  scene: Phaser.Scene,
  cx: number,
  cy: number,
  radius: number,
  color: number,
  alpha: number,
): void {
  const g = scene.add.graphics().setDepth(1);
  const layers = 5;
  for (let i = 0; i < layers; i++) {
    const t = (i + 1) / layers;
    g.fillStyle(color, alpha * (1 - t * 0.6));
    g.fillCircle(cx, cy, radius * t);
  }
}

// ── Chunky action button ("Check") ───────────────────────────────────────────

/**
 * Amber 3-D pill button matching the Play! station style.
 * Returns the container so callers can setAlpha for lock/unlock.
 */
export function createActionButton(
  scene: Phaser.Scene,
  x: number,
  y: number,
  label: string,
  onTap: () => void,
  depth = 10,
): Phaser.GameObjects.Container {
  const W = 320, H = 64, SHADOW = 7, R = 32;

  const shadow = scene.add.graphics();
  shadow.fillStyle(ACTION_BORDER, 1);
  shadow.fillRoundedRect(-W / 2, -H / 2 + SHADOW, W, H, R);

  const face = scene.add.graphics();

  const txt = scene.add
    .text(0, 0, label, {
      fontFamily: TITLE_FONT,
      fontSize: '28px',
      color: ACTION_TEXT,
      fontStyle: 'bold',
    })
    .setOrigin(0.5);

  let isHovering = false;
  let isPressed  = false;

  const draw = () => {
    face.clear();
    const color = isHovering ? ACTION_HOVER : ACTION_FILL;
    const dy    = isPressed  ? SHADOW : 0;
    face.fillStyle(color, 1);
    face.fillRoundedRect(-W / 2, -H / 2 + dy, W, H, R);
    face.lineStyle(5, ACTION_BORDER, 1);
    face.strokeRoundedRect(-W / 2, -H / 2 + dy, W, H, R);
    txt.setY(dy);
  };
  draw();

  const container = scene.add
    .container(x, y, [shadow, face, txt])
    .setDepth(depth);

  container.setSize(W, H + SHADOW);
  container.setInteractive(
    new Phaser.Geom.Rectangle(-W / 2, -H / 2, W, H + SHADOW),
    Phaser.Geom.Rectangle.Contains,
  );
  container.input!.cursor = 'pointer';

  container.on('pointerover',  () => { isHovering = true;  draw(); });
  container.on('pointerout',   () => { isHovering = false; isPressed = false; draw(); });
  container.on('pointerdown',  () => { isPressed  = true;  draw(); });
  container.on('pointerup',    () => { isPressed  = false; draw(); onTap(); });

  return container;
}

// ── Chunky hint button ("?") ─────────────────────────────────────────────────

/**
 * Blue 3-D circular button matching the Settings station style.
 * Returns the container so callers can tween it for the pulse hint.
 */
export function createHintCircleButton(
  scene: Phaser.Scene,
  x: number,
  y: number,
  onTap: () => void,
  depth = 10,
): Phaser.GameObjects.Container {
  const R = 36, SHADOW = 6;

  const shadow = scene.add.graphics();
  shadow.fillStyle(HINT_BORDER, 1);
  shadow.fillCircle(0, SHADOW, R);

  const face = scene.add.graphics();

  const txt = scene.add
    .text(0, 0, '?', {
      fontFamily: TITLE_FONT,
      fontSize: '30px',
      color: HINT_TEXT_CLR,
      fontStyle: 'bold',
    })
    .setOrigin(0.5);

  let isHovering = false;
  let isPressed  = false;

  const draw = () => {
    face.clear();
    const color = isHovering ? HINT_HOVER : HINT_FILL;
    const dy    = isPressed  ? SHADOW : 0;
    face.fillStyle(color, 1);
    face.fillCircle(0, dy, R);
    face.lineStyle(4, HINT_BORDER, 1);
    face.strokeCircle(0, dy, R);
    txt.setY(dy);
  };
  draw();

  const container = scene.add
    .container(x, y, [shadow, face, txt])
    .setDepth(depth);

  const D = R * 2 + SHADOW;
  container.setSize(D, D);
  container.setInteractive(
    new Phaser.Geom.Rectangle(-R, -R, D, D),
    Phaser.Geom.Rectangle.Contains,
  );
  container.input!.cursor = 'pointer';

  container.on('pointerover',  () => { isHovering = true;  draw(); });
  container.on('pointerout',   () => { isHovering = false; isPressed = false; draw(); });
  container.on('pointerdown',  () => { isPressed  = true;  draw(); });
  container.on('pointerup',    () => { isPressed  = false; draw(); onTap(); });

  return container;
}

// ── Modal secondary button ────────────────────────────────────────────────────

/**
 * White pill button with navy border — used in session-complete modal.
 */
export function createSecondaryButton(
  scene: Phaser.Scene,
  x: number,
  y: number,
  label: string,
  onTap: () => void,
  depth = 52,
): void {
  const W = 320, H = 56, R = 28;
  const g = scene.add.graphics().setDepth(depth);
  g.fillStyle(SEC_FILL, 1);
  g.fillRoundedRect(x - W / 2, y - H / 2, W, H, R);
  g.lineStyle(4, SEC_BORDER, 1);
  g.strokeRoundedRect(x - W / 2, y - H / 2, W, H, R);
  scene.add
    .text(x, y, label, {
      fontFamily: BODY_FONT,
      fontSize: '20px',
      fontStyle: 'bold',
      color: NAVY_HEX,
    })
    .setOrigin(0.5)
    .setDepth(depth + 1);
  scene.add
    .rectangle(x, y, W, H, 0, 0)
    .setInteractive({ useHandCursor: true })
    .setDepth(depth + 2)
    .on('pointerup', onTap);
}

// ── Hint text badge ───────────────────────────────────────────────────────────

/**
 * Style string for the hint text game object — white badge with navy text,
 * matching the fraction-badge / tagline-pill look from MenuScene.
 */
export const HINT_TEXT_STYLE: Phaser.Types.GameObjects.Text.TextStyle = {
  fontSize: '18px',
  fontFamily: BODY_FONT,
  color: NAVY_HEX,
  align: 'center',
  wordWrap: { width: 600 },
  backgroundColor: WHITE_HEX,
  padding: { x: 16, y: 12 },
};
