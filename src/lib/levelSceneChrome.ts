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
  PATH_BLUE,
  OPTION_BG,
} from '@/scenes/utils/levelTheme';
import { log } from './log';

const CW = 800;
const CH = 1280;

export interface HeaderResult {
  questionCounterText: Phaser.GameObjects.Text;
}

export function createHeader(
  scene: Phaser.Scene,
  levelNumber: number,
  opts: {
    sessionGoal: number;
    onBackToMenu: () => void;
    backLogContext: () => Record<string, unknown>;
  }
): HeaderResult {
  const headerG = scene.add.graphics().setDepth(4);
  headerG.fillStyle(OPTION_BG, 0.95);
  headerG.fillRoundedRect(10, 10, CW - 20, 92, 20);
  headerG.lineStyle(3, NAVY, 1);
  headerG.strokeRoundedRect(10, 10, CW - 20, 92, 20);

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

  const BACK_W = 64;
  const BACK_H = 52;
  const backG = scene.add.graphics().setDepth(5);
  backG.fillStyle(SKY_BG, 1);
  backG.fillRoundedRect(18, 34, BACK_W, BACK_H, 14);
  backG.lineStyle(2, NAVY, 1);
  backG.strokeRoundedRect(18, 34, BACK_W, BACK_H, 14);

  const backBtn = scene.add
    .text(18 + BACK_W / 2, 34 + BACK_H / 2, '🏠', {
      fontSize: '36px',
    })
    .setOrigin(0.5)
    .setDepth(6)
    .setInteractive({
      hitArea: new Phaser.Geom.Rectangle(-BACK_W / 2, -BACK_H / 2, BACK_W, BACK_H),
      hitAreaCallback: Phaser.Geom.Rectangle.Contains,
      useHandCursor: true,
    });

  let menuConfirmPending = false;
  let menuConfirmTimer: Phaser.Time.TimerEvent | null = null;

  const resetMenuBtn = (): void => {
    menuConfirmPending = false;
    menuConfirmTimer = null;
    backBtn.setText('🏠').setStyle({ fontSize: '36px', color: undefined });
  };

  backBtn.on('pointerup', () => {
    if (!menuConfirmPending) {
      menuConfirmPending = true;
      backBtn.setText('✕ Leave?').setStyle({ fontSize: '18px', color: '#b45309' });
      menuConfirmTimer = scene.time.delayedCall(2000, resetMenuBtn);
      scene.input.once('pointerdown', (ptr: Phaser.Input.Pointer, _objs: unknown[]) => {
        const btnBounds = backBtn.getBounds();
        if (!Phaser.Geom.Rectangle.Contains(btnBounds, ptr.x, ptr.y)) {
          menuConfirmTimer?.remove(false);
          resetMenuBtn();
        }
      });
    } else {
      menuConfirmTimer?.remove(false);
      log.input('back_to_menu', opts.backLogContext());
      opts.onBackToMenu();
    }
  });

  const CTR_W = 140;
  const CTR_H = 52;
  const ctrX = CW - 18 - CTR_W;
  const ctrY = 34;
  const ctrG = scene.add.graphics().setDepth(5);
  ctrG.fillStyle(SKY_BG, 1);
  ctrG.fillRoundedRect(ctrX, ctrY, CTR_W, CTR_H, 14);
  ctrG.lineStyle(2, NAVY, 1);
  ctrG.strokeRoundedRect(ctrX, ctrY, CTR_W, CTR_H, 14);

  const questionCounterText = scene.add
    .text(ctrX + CTR_W / 2, ctrY + CTR_H / 2, `1 / ${opts.sessionGoal}`, {
      fontSize: '22px',
      fontFamily: BODY_FONT,
      fontStyle: 'bold',
      color: NAVY_HEX,
    })
    .setOrigin(0.5)
    .setDepth(6);

  return { questionCounterText };
}

export function createPromptArea(scene: Phaser.Scene): Phaser.GameObjects.Text {
  const promptG = scene.add.graphics().setDepth(4);
  promptG.fillStyle(OPTION_BG, 1);
  promptG.fillRoundedRect(60, 114, CW - 120, 100, 18);
  promptG.lineStyle(3, PATH_BLUE, 1);
  promptG.strokeRoundedRect(60, 114, CW - 120, 100, 18);

  return scene.add
    .text(CW / 2, 164, '', {
      fontSize: '28px',
      fontFamily: BODY_FONT,
      fontStyle: 'bold',
      color: NAVY_HEX,
      align: 'center',
      wordWrap: { width: CW - 180 },
    })
    .setOrigin(0.5)
    .setDepth(5);
}

export function createHintArea(scene: Phaser.Scene): Phaser.GameObjects.Text {
  return scene.add
    .text(CW / 2, CH - 280, '', HINT_TEXT_STYLE)
    .setOrigin(0.5)
    .setDepth(5)
    .setVisible(false);
}

export function createHintButton(
  scene: Phaser.Scene,
  opts: {
    onTap: () => void;
    logContext: () => Record<string, unknown>;
  }
): Phaser.GameObjects.Container {
  // Phase 3 layout pass (S): amber pill button 100×60 px, centered at y≈720
  return createHintPillButton(
    scene,
    CW / 2,
    720,
    () => {
      log.input('hint_button_tap', opts.logContext());
      opts.onTap();
    },
    10
  );
}

export function createSubmitButton(
  scene: Phaser.Scene,
  opts: {
    onTap: () => void;
    logContext: () => Record<string, unknown>;
  }
): Phaser.GameObjects.Container {
  // Phase 3 layout pass (S): check button repositioned to y≈820 in layout arc
  return createActionButton(
    scene,
    CW / 2,
    820,
    'Check ✓',
    () => {
      log.input('check_button_tap', opts.logContext());
      opts.onTap();
    },
    10
  );
}
