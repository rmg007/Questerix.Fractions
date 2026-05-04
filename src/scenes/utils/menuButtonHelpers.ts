import * as Phaser from 'phaser';
import { BODY_FONT, TITLE_FONT } from './levelTheme';
import { WHITE, NAVY } from './menuLayoutHelpers';

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
