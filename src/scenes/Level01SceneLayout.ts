/**
 * Level01SceneLayout — shape drawing, layout construction, and UI element creation.
 * Extracted from Level01Scene.ts for clarity and reuse.
 * Contains Phaser-specific drawing and layout code.
 */

import * as Phaser from 'phaser';
import {
  createActionButton,
  createHintPillButton,
  HINT_TEXT_STYLE,
  TITLE_FONT,
  BODY_FONT,
  NAVY_HEX,
  NAVY,
  SKY_BG,
} from './utils/levelTheme';
import type { Scene } from 'phaser';

const CW = 800;
const CH = 1280;
const SHAPE_CX = CW / 2;
const SHAPE_CY = 450;
const SHAPE_W = 400;
const SHAPE_H = 520;

export function createHeader(scene: Scene): void {
  scene.add
    .text(CW / 2, 60, 'Level 1 — Halves', {
      fontSize: '32px',
      fontFamily: TITLE_FONT,
      fontStyle: 'bold',
      color: NAVY_HEX,
      stroke: '#FFFFFF',
      strokeThickness: 3,
    })
    .setOrigin(0.5)
    .setDepth(5);

  const backBtn = scene.add
    .text(52, 60, '← Menu', {
      fontSize: '18px',
      fontFamily: BODY_FONT,
      fontStyle: 'bold',
      color: NAVY_HEX,
      backgroundColor: 'rgba(255,255,255,0.75)',
      padding: { x: 10, y: 6 },
    })
    .setOrigin(0.5)
    .setDepth(5)
    .setInteractive({
      hitArea: new Phaser.Geom.Rectangle(-28, -20, 56, 40),
      hitAreaCallback: Phaser.Geom.Rectangle.Contains,
      useHandCursor: true,
    });

  let menuConfirmPending = false;
  let menuConfirmTimer: Phaser.Time.TimerEvent | null = null;

  const resetMenuBtn = () => {
    menuConfirmPending = false;
    menuConfirmTimer = null;
    backBtn.setText('← Menu').setColor(NAVY_HEX);
  };

  backBtn.on('pointerup', () => {
    if (!menuConfirmPending) {
      menuConfirmPending = true;
      backBtn.setText('Leave? ✕').setColor('#b45309');
      menuConfirmTimer = scene.time.delayedCall(2000, resetMenuBtn);
      scene.input.once('pointerdown', (ptr: Phaser.Input.Pointer, _objs: unknown[]) => {
        const hitX = ptr.x;
        const hitY = ptr.y;
        const btnBounds = backBtn.getBounds();
        if (!Phaser.Geom.Rectangle.Contains(btnBounds, hitX, hitY)) {
          menuConfirmTimer?.remove(false);
          resetMenuBtn();
        }
      });
    }
  });
}

export function createPromptArea(scene: Scene, promptText: string): void {
  scene.add
    .text(CW / 2, 160, promptText, {
      fontSize: '28px',
      fontFamily: BODY_FONT,
      fontStyle: 'bold',
      color: NAVY_HEX,
      align: 'center',
      wordWrap: { width: 720 },
    })
    .setOrigin(0.5)
    .setDepth(2);
}

export function createHintArea(scene: Scene): Phaser.GameObjects.Text {
  return scene.add.text(CW / 2, 200, '', HINT_TEXT_STYLE).setOrigin(0.5).setDepth(2);
}

export function createHintButton(scene: Scene, onRequest: () => void): Phaser.GameObjects.Container {
  const btn = createHintPillButton(scene, CW / 2, 720, onRequest);
  return btn;
}

export function createSubmitButton(scene: Scene, onSubmit: () => void): Phaser.GameObjects.Container {
  const btn = createActionButton(scene, CW / 2, 820, 'Check', onSubmit);
  return btn;
}

export function drawShapeBackground(
  g: Phaser.GameObjects.Graphics,
  shapeType: 'rectangle' | 'circle'
): void {
  g.clear();
  g.fillStyle(SKY_BG, 1);

  if (shapeType === 'rectangle') {
    g.fillRect(SHAPE_CX - SHAPE_W / 2, SHAPE_CY - SHAPE_H / 2, SHAPE_W, SHAPE_H);
  } else {
    g.fillCircleShape(new Phaser.Geom.Circle(SHAPE_CX, SHAPE_CY, Math.min(SHAPE_W, SHAPE_H) / 2));
  }
}

export function drawPartitionLine(
  g: Phaser.GameObjects.Graphics,
  handleX: number,
  shapeType: 'rectangle' | 'circle'
): void {
  g.lineStyle(3, NAVY, 1);

  if (shapeType === 'rectangle') {
    const minY = SHAPE_CY - SHAPE_H / 2;
    const maxY = SHAPE_CY + SHAPE_H / 2;
    g.lineBetween(handleX, minY, handleX, maxY);
  } else {
    const cy = SHAPE_CY;
    const cx = SHAPE_CX;
    const radius = Math.min(SHAPE_W, SHAPE_H) / 2;
    const dx = handleX - cx;
    if (Math.abs(dx) < radius) {
      const dy = Math.sqrt(radius * radius - dx * dx);
      g.lineBetween(handleX, cy - dy, handleX, cy + dy);
    }
  }
}

export function showGhostGuide(
  g: Phaser.GameObjects.Graphics,
  shapeType: 'rectangle' | 'circle'
): void {
  g.lineStyle(2, NAVY, 0.3);

  if (shapeType === 'rectangle') {
    const minY = SHAPE_CY - SHAPE_H / 2;
    const maxY = SHAPE_CY + SHAPE_H / 2;
    g.lineBetween(SHAPE_CX, minY, SHAPE_CX, maxY);
  } else {
    const cy = SHAPE_CY;
    const cx = SHAPE_CX;
    const radius = Math.min(SHAPE_W, SHAPE_H) / 2;
    g.lineBetween(cx, cy - radius, cx, cy + radius);
  }
}

export function drawCenterOverlay(g: Phaser.GameObjects.Graphics): void {
  g.clear();
  g.fillStyle(0x000000, 0.3);
  g.fillRect(0, 0, CW, CH);
  g.fillStyle(0xffffff, 0.1);
  g.fillCircle(SHAPE_CX, SHAPE_CY, 60);
}

export const SHAPE_CONSTANTS = {
  CW,
  CH,
  SHAPE_CX,
  SHAPE_CY,
  SHAPE_W,
  SHAPE_H,
};
