/**
 * MenuStationButton — extracted station-button factory used on MenuScene.
 *
 * Each button is a Phaser Container with a chunky 3D shadow effect: a
 * shadow layer behind, a face on top that sinks down on press, and a
 * hover-tint that lightens the face. Used for Play (pill), Continue
 * (pill), and Settings (circle) on the menu number line.
 */

import * as Phaser from 'phaser';
import { TITLE_FONT } from '../scenes/utils/levelTheme';

export interface StationButtonOpts {
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

export function createStationButton(
  scene: Phaser.Scene,
  opts: StationButtonOpts
): Phaser.GameObjects.Container {
  const { x, y, w, h, fillColor, hoverColor, borderColor, textColor, shadowOffset, rounded } = opts;

  const container = scene.add.container(x, y).setDepth(15);
  const radius = rounded ? h / 2 : Math.min(w, h) / 2;
  const half = { w: w / 2, h: h / 2 };

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

  const draw = (color: number, dy: number): void => {
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
  const refresh = (): void => {
    const dy = isPressed ? shadowOffset : 0;
    const color = isHovering ? hoverColor : fillColor;
    draw(color, dy);
    txt.setY(dy);
  };

  container.on('pointerover', () => {
    isHovering = true;
    refresh();
  });
  container.on('pointerout', () => {
    isHovering = false;
    isPressed = false;
    refresh();
  });
  container.on('pointerdown', () => {
    isPressed = true;
    refresh();
  });
  container.on('pointerup', () => {
    isPressed = false;
    refresh();
    opts.onTap();
  });

  return container;
}
