/**
 * SessionCompleteOverlay button factory.
 * Consolidates Play Again, Next Level, and Menu button creation.
 */

import * as Phaser from 'phaser';
import {
  TITLE_FONT,
  BODY_FONT,
  NAVY_HEX,
  NAVY,
  ACTION_FILL,
  ACTION_BORDER,
  ACTION_TEXT,
} from '../../scenes/utils/levelTheme';
import { A11yLayer } from '../A11yLayer';
import { TestHooks } from '../../scenes/utils/TestHooks';

export type ButtonVariant = 'primary' | 'secondary';

export interface ButtonConfig {
  scene: Phaser.Scene;
  x: number;
  y: number;
  label: string;
  onTap: () => void;
  variant: ButtonVariant;
  a11yKey: string;
  a11yLabel: string;
  testHookKey?: string;
  testHookOpts?: { width: string; height: string; top: string; left: string };
}

export function createButton(config: ButtonConfig): Phaser.GameObjects.GameObject[] {
  const { scene, x, y, label, onTap, variant, a11yKey, a11yLabel, testHookKey, testHookOpts } =
    config;
  const isPrimary = variant === 'primary';
  const W = 300;
  // H raised from 64/54 → 100 canvas px so that at 360 px viewport (scale ≈ 0.45)
  // the CSS touch target is ≥ 44 px (WCAG 2.5.5; previous 64 → 29 CSS, 54 → 24 CSS).
  const H = 100;
  const R = isPrimary ? 32 : 27;
  const SHADOW = isPrimary ? 7 : 0;

  const objects: Phaser.GameObjects.GameObject[] = [];

  if (isPrimary) {
    const shadow = scene.add.graphics();
    shadow.fillStyle(ACTION_BORDER, 1);
    shadow.fillRoundedRect(x - W / 2, y - H / 2 + SHADOW, W, H, R);
    objects.push(shadow);

    const face = scene.add.graphics();
    face.fillStyle(ACTION_FILL, 1);
    face.fillRoundedRect(x - W / 2, y - H / 2, W, H, R);
    face.lineStyle(5, ACTION_BORDER, 1);
    face.strokeRoundedRect(x - W / 2, y - H / 2, W, H, R);
    objects.push(face);
  } else {
    const bg = scene.add.graphics();
    bg.fillStyle(0xffffff, 1);
    bg.fillRoundedRect(x - W / 2, y - H / 2, W, H, R);
    bg.lineStyle(4, NAVY, 1);
    bg.strokeRoundedRect(x - W / 2, y - H / 2, W, H, R);
    objects.push(bg);
  }

  const txt = scene.add
    .text(x, y, label, {
      fontFamily: isPrimary ? TITLE_FONT : BODY_FONT,
      fontSize: isPrimary ? '26px' : '20px',
      color: isPrimary ? ACTION_TEXT : NAVY_HEX,
      fontStyle: 'bold',
    })
    .setOrigin(0.5);
  objects.push(txt);

  const hit = scene.add
    .rectangle(x, y, W, H + SHADOW, 0, 0)
    .setInteractive({ useHandCursor: true })
    .on('pointerup', onTap);
  if (!isPrimary) hit.setDepth(50);
  objects.push(hit);

  A11yLayer.mountAction(a11yKey, a11yLabel, onTap);

  if (testHookKey && testHookOpts) {
    TestHooks.mountInteractive(testHookKey, onTap, testHookOpts);
  }

  return objects;
}
