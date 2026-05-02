import * as Phaser from 'phaser';
import {
  createActionButton,
  createHintPillButton,
  HINT_TEXT_STYLE,
  TITLE_FONT,
  BODY_FONT,
  NAVY_HEX,
} from '../scenes/utils/levelTheme';
import type { Scene } from 'phaser';

const CW = 800;
const CH = 1280;

export function createHeader(scene: Scene, levelNumber: number): void {
  scene.add
    .text(CW / 2, 60, `Level ${levelNumber}`, {
      fontSize: '32px',
      fontFamily: TITLE_FONT,
      fontStyle: 'bold',
      color: NAVY_HEX,
      stroke: '#FFFFFF',
      strokeThickness: 3,
    })
    .setOrigin(0.5)
    .setDepth(5);
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
  return scene.add
    .text(CW / 2, 200, '', HINT_TEXT_STYLE)
    .setOrigin(0.5)
    .setDepth(2);
}

export function createHintButton(
  scene: Scene,
  onRequest: () => void
): Phaser.GameObjects.Container {
  return createHintPillButton(scene, CW / 2, 720, onRequest);
}

export function createSubmitButton(
  scene: Scene,
  onSubmit: () => void
): Phaser.GameObjects.Container {
  return createActionButton(scene, CW / 2, 820, 'Check', onSubmit);
}

export const LEVEL_LAYOUT_CONSTANTS = { CW, CH };
