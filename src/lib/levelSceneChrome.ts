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
import { checkReduceMotion } from './preferences';

const CW = 800;
const CH = 1280;

const STAR_COUNT = 5; // mirrors SESSION_GOAL
const STAR_FILL = '#F59E0B'; // amber-400
const STAR_EMPTY = '#CBD5E1'; // slate-300

export interface HeaderResult {
  /** Hidden text kept for backward-compat — do not rely on its content. */
  questionCounterText: Phaser.GameObjects.Text;
  /** Call after each question loads to fill the next star and animate it. */
  updateCounter: (answered: number, total: number) => void;
  /** Container holding the 5 stars — use as the animateCounterBadge target. */
  counterContainer: Phaser.GameObjects.Container;
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

  // ── Star question counter ────────────────────────────────────────────────

  const CTR_W = 140;
  const CTR_H = 52;
  const ctrX = CW - 18 - CTR_W;
  const ctrY = 34;

  // Background pill for the stars
  const ctrG = scene.add.graphics().setDepth(5);
  ctrG.fillStyle(SKY_BG, 1);
  ctrG.fillRoundedRect(ctrX, ctrY, CTR_W, CTR_H, 14);
  ctrG.lineStyle(2, NAVY, 1);
  ctrG.strokeRoundedRect(ctrX, ctrY, CTR_W, CTR_H, 14);

  // 5 star Text objects, positioned relative to the container centre
  const starSpacing = CTR_W / STAR_COUNT; // 28 px per slot
  const stars = Array.from({ length: STAR_COUNT }, (_, i) => {
    const relX = (i - (STAR_COUNT - 1) / 2) * starSpacing; // -56, -28, 0, 28, 56
    return scene.add
      .text(relX, 0, '★', {
        fontSize: '20px',
        fontFamily: TITLE_FONT,
        color: STAR_EMPTY,
      })
      .setOrigin(0.5);
  });

  const counterContainer = scene.add
    .container(
      ctrX + CTR_W / 2,
      ctrY + CTR_H / 2,
      stars as unknown as Phaser.GameObjects.GameObject[]
    )
    .setDepth(6);

  // Hidden legacy text kept so existing ctx.questionCounterText.setText() calls
  // don't throw. Its content isn't displayed (positioned off-screen at depth 0).
  const questionCounterText = scene.add
    .text(-200, -200, '1 / 5', {
      fontSize: '1px',
      color: '#000000',
    })
    .setAlpha(0)
    .setDepth(0);

  const updateCounter = (answered: number, _total: number): void => {
    const n = Math.min(answered, STAR_COUNT);
    stars.forEach((star, i) => {
      const filled = i < n;
      star.setColor(filled ? STAR_FILL : STAR_EMPTY);

      // Pop tween on the star that just got filled
      if (filled && i === n - 1 && !checkReduceMotion()) {
        star.setScale(0.5);
        scene.tweens.add({
          targets: star,
          scaleX: 1,
          scaleY: 1,
          duration: 300,
          ease: 'Back.easeOut',
        });
      }
    });
  };

  return { questionCounterText, updateCounter, counterContainer };
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
