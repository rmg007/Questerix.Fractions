/**
 * Mascot character builder — procedurally draws hat, body, face, and arms.
 */

import * as Phaser from 'phaser';
import { ACTION_FILL, ACTION_BORDER, NAVY } from '../../scenes/utils/levelTheme';

const AMBER = ACTION_FILL;
const AMBER_DARK = ACTION_BORDER;
const WHITE = 0xffffff;
const ROSE = 0xfb7185;

export const BODY_R = 40;
export const HAT_BASE = 50;
export const HAT_H = 55;

export interface CharacterParts {
  hat: Phaser.GameObjects.Graphics;
  bodyCircle: Phaser.GameObjects.Graphics;
  face: Phaser.GameObjects.Container;
  leftArm: Phaser.GameObjects.Graphics;
  rightArm: Phaser.GameObjects.Graphics;
}

export function buildCharacter(scene: Phaser.Scene): CharacterParts {
  const hat = scene.add.graphics();
  drawHat(hat);
  const leftArm = scene.add.graphics();
  leftArm.setPosition(-BODY_R - 6, 4);
  drawArm(leftArm, 'left');
  const rightArm = scene.add.graphics();
  rightArm.setPosition(BODY_R + 6, 4);
  drawArm(rightArm, 'right');
  const bodyCircle = scene.add.graphics();
  drawBody(bodyCircle);
  const face = scene.add.container(0, -4);
  buildFace(scene, face);
  return { hat, bodyCircle, face, leftArm, rightArm };
}

function drawHat(g: Phaser.GameObjects.Graphics): void {
  g.fillStyle(NAVY, 1);
  g.fillEllipse(0, -BODY_R + 4, HAT_BASE + 12, 14);
  g.fillStyle(NAVY, 1);
  g.fillTriangle(-HAT_BASE / 2, -BODY_R + 4, HAT_BASE / 2, -BODY_R + 4, 0, -BODY_R - HAT_H);
  g.fillStyle(AMBER, 0.45);
  g.fillTriangle(-HAT_BASE / 4, -BODY_R + 4, HAT_BASE / 4, -BODY_R + 4, 0, -BODY_R - HAT_H * 0.55);
  g.fillStyle(AMBER, 1);
  g.fillCircle(0, -BODY_R - HAT_H * 0.55, 5);
}

function drawBody(g: Phaser.GameObjects.Graphics): void {
  g.fillStyle(AMBER_DARK, 0.35);
  g.fillCircle(3, 5, BODY_R);
  g.fillStyle(AMBER, 1);
  g.fillCircle(0, 0, BODY_R);
  g.lineStyle(3, AMBER_DARK, 1);
  g.strokeCircle(0, 0, BODY_R);
  g.fillStyle(WHITE, 0.25);
  g.fillCircle(-12, -10, 16);
}

function buildFace(scene: Phaser.Scene, container: Phaser.GameObjects.Container): void {
  const g = scene.add.graphics();
  g.fillStyle(WHITE, 1);
  g.fillCircle(-13, -8, 9);
  g.fillStyle(WHITE, 1);
  g.fillCircle(13, -8, 9);
  g.fillStyle(NAVY, 1);
  g.fillCircle(-11, -8, 5);
  g.fillStyle(NAVY, 1);
  g.fillCircle(15, -8, 5);
  g.fillStyle(WHITE, 1);
  g.fillCircle(-9, -11, 2);
  g.fillStyle(WHITE, 1);
  g.fillCircle(17, -11, 2);
  g.fillStyle(ROSE, 0.45);
  g.fillEllipse(-20, 2, 14, 8);
  g.fillStyle(ROSE, 0.45);
  g.fillEllipse(20, 2, 14, 8);
  g.fillStyle(AMBER_DARK, 0.7);
  g.fillEllipse(0, 14, 22, 10);
  g.fillStyle(AMBER, 1);
  g.fillRect(-11, 4, 22, 8);
  container.add(g);
}

function drawArm(g: Phaser.GameObjects.Graphics, side: 'left' | 'right'): void {
  const dir = side === 'left' ? -1 : 1;
  g.fillStyle(AMBER, 1);
  g.fillEllipse(dir * 8, 0, 20, 28);
  g.lineStyle(2, AMBER_DARK, 0.8);
  g.strokeEllipse(dir * 8, 0, 20, 28);
}
