/**
 * Level01SceneLayout — UI chrome creation (header, buttons, text areas).
 * Extracted from Level01Scene for clarity.
 */

import * as Phaser from 'phaser';
import {
  createActionButton,
  createHintPillButton,
  TITLE_FONT,
  BODY_FONT,
  NAVY_HEX,
  NAVY,
  SKY_BG,
} from './utils/levelTheme';

const CW = 800;

const SESSION_GOAL = 5;

export function createHeaderUI(
  scene: Phaser.Scene,
  onBackConfirm: () => void,
  questionIndex: number
): {
  backBtn: Phaser.GameObjects.Text;
  questionCounterText: Phaser.GameObjects.Text;
} {
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
    .text(52, 60, '🏠', {
      fontSize: '36px',
      fontFamily: BODY_FONT,
      backgroundColor: 'rgba(255,255,255,0.75)',
      padding: { x: 10, y: 6 },
    })
    .setOrigin(0.5)
    .setDepth(5)
    .setInteractive({
      hitArea: new Phaser.Geom.Rectangle(-32, -28, 64, 56),
      hitAreaCallback: Phaser.Geom.Rectangle.Contains,
      useHandCursor: true,
    });

  let menuConfirmPending = false;
  let menuConfirmTimer: Phaser.Time.TimerEvent | null = null;

  const resetMenuBtn = () => {
    menuConfirmPending = false;
    menuConfirmTimer = null;
    backBtn.setText('🏠').setStyle({ color: undefined });
  };

  backBtn.on('pointerup', () => {
    if (!menuConfirmPending) {
      menuConfirmPending = true;
      backBtn.setText('✕ Leave?').setStyle({ fontSize: '20px', color: '#b45309' });
      menuConfirmTimer = scene.time.delayedCall(2000, resetMenuBtn);
      scene.input.once('pointerdown', (ptr: Phaser.Input.Pointer) => {
        const btnBounds = backBtn.getBounds();
        if (!Phaser.Geom.Rectangle.Contains(btnBounds, ptr.x, ptr.y)) {
          menuConfirmTimer?.remove(false);
          resetMenuBtn();
        }
      });
    } else {
      menuConfirmTimer?.remove(false);
      onBackConfirm();
    }
  });

  const CTR_W = 140,
    CTR_H = 52;
  const ctrX = CW - 18 - CTR_W;
  const ctrY = 34;
  const ctrG = scene.add.graphics().setDepth(5);
  ctrG.fillStyle(SKY_BG, 1);
  ctrG.fillRoundedRect(ctrX, ctrY, CTR_W, CTR_H, 14);
  ctrG.lineStyle(2, NAVY, 1);
  ctrG.strokeRoundedRect(ctrX, ctrY, CTR_W, CTR_H, 14);
  const questionCounterText = scene.add
    .text(ctrX + CTR_W / 2, ctrY + CTR_H / 2, `${questionIndex + 1} / ${SESSION_GOAL}`, {
      fontSize: '22px',
      fontFamily: BODY_FONT,
      fontStyle: 'bold',
      color: NAVY_HEX,
    })
    .setOrigin(0.5)
    .setDepth(6);

  return { backBtn, questionCounterText };
}

export function createPromptUI(scene: Phaser.Scene): Phaser.GameObjects.Text {
  return scene.add
    .text(CW / 2, 160, '', {
      fontSize: '28px',
      fontFamily: BODY_FONT,
      fontStyle: 'bold',
      color: NAVY_HEX,
      align: 'center',
      wordWrap: { width: 600 },
      backgroundColor: 'rgba(255,255,255,0.75)',
      padding: { x: 14, y: 8 },
    })
    .setOrigin(0.5)
    .setDepth(5);
}

export function createHintTextUI(
  scene: Phaser.Scene,
  hintTextStyle: Phaser.Types.GameObjects.Text.TextStyle
): Phaser.GameObjects.Text {
  return scene.add
    .text(CW / 2, 680, '', hintTextStyle)
    .setOrigin(0.5)
    .setDepth(5)
    .setVisible(false);
}

export function createHintButtonUI(
  scene: Phaser.Scene,
  onHintTap: () => void
): Phaser.GameObjects.Container {
  return createHintPillButton(scene, CW / 2, 720, onHintTap, 10);
}

export function createSubmitButtonUI(
  scene: Phaser.Scene,
  onSubmitTap: () => void
): Phaser.GameObjects.Container {
  return createActionButton(scene, CW / 2, 820, 'Check ✓', onSubmitTap, 10);
}
