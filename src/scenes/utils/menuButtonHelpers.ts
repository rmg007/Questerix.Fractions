import * as Phaser from 'phaser';
import { BODY_FONT, TITLE_FONT } from './levelTheme';
import { WHITE, NAVY, CW, STATION_X, PLAY_Y } from './menuLayoutHelpers';
import { getStreak } from '../../lib/streak';
import { get } from '../../lib/i18n/catalog';

const NAVY_HEX = '#1E3A8A';

interface StationButtonOpts {
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  iconChar?: string;
  fillColor: number;
  hoverColor: number;
  borderColor: number;
  textColor: string;
  fontSize: number;
  shadowOffset: number;
  rounded: boolean;
  onTap: () => void;
}

export function createStationButton(scene: Phaser.Scene, opts: StationButtonOpts): void {
  const { x, y, w, h, fillColor, hoverColor, borderColor, textColor, shadowOffset, rounded } = opts;

  const container = scene.add.container(x, y).setDepth(15);
  const radius = rounded ? h / 2 : Math.min(w, h) / 2;
  const half = { w: w / 2, h: h / 2 };

  const draw = (color: number, dy: number) => {
    face.clear();
    face.fillStyle(color, 1);
    if (rounded) {
      face.fillRoundedRect(-half.w, -half.h + dy, w, h, radius);
    } else {
      face.fillCircle(0, dy, radius);
    }
    face.lineStyle(5, borderColor, 1);
    if (rounded) {
      face.strokeRoundedRect(-half.w, -half.h + dy, w, h, radius);
    } else {
      face.strokeCircle(0, dy, radius);
    }
  };

  const shadow = scene.add.graphics();
  shadow.fillStyle(borderColor, 1);
  if (rounded) {
    shadow.fillRoundedRect(-half.w, -half.h + shadowOffset, w, h, radius);
  } else {
    shadow.fillCircle(0, shadowOffset, radius);
  }
  container.add(shadow);

  const face = scene.add.graphics();
  container.add(face);
  draw(fillColor, 0);

  const display = opts.iconChar
    ? opts.label
      ? `${opts.iconChar}  ${opts.label}`
      : opts.iconChar
    : opts.label;
  const txt = scene.add
    .text(0, 0, display, {
      fontFamily: TITLE_FONT,
      fontSize: `${opts.fontSize}px`,
      color: textColor,
    })
    .setOrigin(0.5);
  container.add(txt);

  container.setSize(w, h + shadowOffset);
  container.setInteractive(
    new Phaser.Geom.Rectangle(-half.w, -half.h, w, h + shadowOffset),
    Phaser.Geom.Rectangle.Contains
  );
  container.input!.cursor = 'pointer';

  let isHovering = false;
  let isPressed = false;
  const update = () => {
    const dy = isPressed ? shadowOffset : 0;
    const color = isHovering ? hoverColor : fillColor;
    draw(color, dy);
    txt.setY(dy);
  };

  container.on('pointerover', () => {
    isHovering = true;
    update();
  });
  container.on('pointerout', () => {
    isHovering = false;
    isPressed = false;
    update();
  });
  container.on('pointerdown', () => {
    isPressed = true;
    update();
  });
  container.on('pointerup', () => {
    isPressed = false;
    update();
    opts.onTap();
  });
}

export function drawTaglinePill(
  scene: Phaser.Scene,
  cx: number,
  cy: number,
  text: string,
  fontSize = 30,
  bgAlpha = 0.95
): void {
  const padX = 22;
  const padY = 12;
  const txt = scene.add
    .text(0, 0, text, {
      fontFamily: BODY_FONT,
      fontStyle: 'bold',
      fontSize: `${fontSize}px`,
      color: '#1E3A8A',
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
}

/**
 * T17: Load the daily streak from the DB and render a flame pill badge
 * in the top-right corner. Uses amber background with white text.
 */
export async function renderStreakDisplay(
  scene: Phaser.Scene,
  studentId: string | null
): Promise<void> {
  const streak = await getStreak(studentId);
  if (streak <= 0) return;

  const label = `🔥 ${streak}`;
  const PILL_H = 40;
  const PILL_PAD = 16;

  // Measure text width
  const probe = scene.add
    .text(0, 0, label, { fontFamily: BODY_FONT, fontSize: '28px' })
    .setAlpha(0);
  const tw = probe.width + PILL_PAD * 2;
  probe.destroy();

  const px = CW - 16 - tw / 2;
  const py = 36;

  const bg = scene.add.graphics().setDepth(25);
  bg.fillStyle(0xf59e0b, 1); // amber-400
  bg.fillRoundedRect(px - tw / 2, py - PILL_H / 2, tw, PILL_H, PILL_H / 2);

  scene.add
    .text(px, py, label, {
      fontFamily: BODY_FONT,
      fontSize: '28px',
      color: '#FFFFFF',
      fontStyle: 'bold',
    })
    .setOrigin(0.5)
    .setDepth(26);
}

/**
 * Tiny pill button that opens the in-scene choose-level overlay.
 * Placed below the Play button so it doesn't compete with primary CTA.
 */
export function createChooseLevelButton(scene: Phaser.Scene, onTap: () => void): void {
  const bx = STATION_X;
  const by = PLAY_Y + 100;
  // H raised from 48 → 100 canvas px so that at 360 px viewport (scale ≈ 0.45)
  // the CSS touch target is ≥ 44 px (WCAG 2.5.5).
  const W = 240,
    H = 100;

  const g = scene.add.graphics().setDepth(16);
  g.fillStyle(WHITE, 0.9);
  g.fillRoundedRect(bx - W / 2, by - H / 2, W, H, H / 2);
  g.lineStyle(3, NAVY, 1);
  g.strokeRoundedRect(bx - W / 2, by - H / 2, W, H, H / 2);

  scene.add
    .text(bx, by, get('menu.choose_level'), {
      fontFamily: BODY_FONT,
      fontStyle: 'bold',
      fontSize: '32px',
      color: NAVY_HEX,
    })
    .setOrigin(0.5)
    .setDepth(17);

  scene.add
    .rectangle(bx, by, W, H, 0, 0)
    .setInteractive({ useHandCursor: true })
    .setDepth(18)
    .on('pointerup', onTap);
}
