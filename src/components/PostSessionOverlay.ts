/**
 * PostSessionOverlay — Phase 2b (UI-11). Routing modal shown on top of
 * LevelMapScene after a session completes. Three buttons (Next / Play Again /
 * Menu) intercept the post-session return so the next decision is obvious for
 * a K-2 child who just finished a quest. Map loads behind us — no extra wait.
 *
 * Visual contract matches SessionCompleteOverlay (sky-blue card, navy stroke).
 * Tweens are gated on prefers-reduced-motion via checkReduceMotion().
 */

import * as Phaser from 'phaser';
import {
  TITLE_FONT,
  BODY_FONT,
  NAVY,
  NAVY_HEX,
  SKY_BG,
  ACTION_FILL,
  ACTION_BORDER,
  ACTION_TEXT,
  HINT_FILL,
  HINT_BORDER,
  HINT_TEXT_CLR,
} from '../scenes/utils/levelTheme';
import { A11yLayer } from './A11yLayer';
import { TestHooks } from '../scenes/utils/TestHooks';
import { checkReduceMotion } from '../lib/preferences';

export interface PostSessionOverlayConfig {
  scene: Phaser.Scene;
  /** Level the player just completed. Drives the Next Level target (N+1). */
  levelNumber: number;
  width?: number;
  height?: number;
  depth?: number;
  /** Hide Next Level button (e.g. last level reached, or N+1 not unlocked). */
  hideNextLevel?: boolean;
  onNextLevel?: () => void;
  onPlayAgain: () => void;
  onMenu: () => void;
}

interface ButtonStyle {
  w: number;
  h: number;
  r: number;
  shadow: number;
  fill: number;
  border: number;
  textColor: string;
  fontSize: string;
  fontFamily: string;
}

// prettier-ignore
const PRIMARY: ButtonStyle = { w: 360, h: 110, r: 28, shadow: 6, fill: ACTION_FILL, border: ACTION_BORDER, textColor: ACTION_TEXT, fontSize: '32px', fontFamily: TITLE_FONT };
// prettier-ignore
const SECONDARY: ButtonStyle = { w: 320, h: 90, r: 24, shadow: 5, fill: HINT_FILL, border: HINT_BORDER, textColor: HINT_TEXT_CLR, fontSize: '26px', fontFamily: TITLE_FONT };
// prettier-ignore
const TERTIARY: ButtonStyle = { w: 260, h: 60, r: 30, shadow: 0, fill: 0xffffff, border: NAVY, textColor: NAVY_HEX, fontSize: '20px', fontFamily: BODY_FONT };

const HOOK_IDS = [
  'post-session-overlay',
  'post-session-next',
  'post-session-replay',
  'post-session-menu',
] as const;

export class PostSessionOverlay {
  private readonly container: Phaser.GameObjects.Container;
  private readonly scrim: Phaser.GameObjects.Rectangle;
  private destroyed = false;

  constructor(config: PostSessionOverlayConfig) {
    const {
      scene,
      levelNumber,
      width = 800,
      height = 1280,
      depth = 60,
      hideNextLevel = false,
      onNextLevel,
      onPlayAgain,
      onMenu,
    } = config;

    const cx = width / 2;
    const reduceMotion = checkReduceMotion();
    const showNext = !hideNextLevel && Boolean(onNextLevel);

    A11yLayer.pushLayer('post-session', 'Session complete: choose what next');

    this.scrim = scene.add
      .rectangle(0, 0, width, height, 0x000000, reduceMotion ? 0.4 : 0)
      .setOrigin(0, 0)
      .setDepth(depth)
      .setInteractive();
    if (!reduceMotion) {
      scene.tweens.add({
        targets: this.scrim,
        fillAlpha: 0.4,
        duration: 240,
        ease: 'Cubic.easeOut',
      });
    }

    const CARD_W = Math.min(560, width - 60);
    const CARD_H = showNext ? 460 : 340;
    const CARD_Y = height / 2;
    const CARD_R = 32;

    this.container = scene.add
      .container(cx, reduceMotion ? CARD_Y : CARD_Y + 40)
      .setDepth(depth + 1)
      .setAlpha(reduceMotion ? 1 : 0);

    const cardBg = scene.add.graphics();
    cardBg.fillStyle(SKY_BG, 1);
    cardBg.fillRoundedRect(-CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H, CARD_R);
    cardBg.lineStyle(4, NAVY, 1);
    cardBg.strokeRoundedRect(-CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H, CARD_R);
    this.container.add(cardBg);

    const headingY = -CARD_H / 2 + 64;
    const heading = scene.add
      .text(0, headingY, '✨ Great job! ✨', {
        fontFamily: TITLE_FONT,
        fontSize: '38px',
        fontStyle: 'bold',
        color: NAVY_HEX,
      })
      .setOrigin(0.5);
    this.container.add(heading);

    let cursorY = headingY + 70;
    if (showNext && onNextLevel) {
      this.addButton(scene, 0, cursorY, '→ Next Level', PRIMARY, () =>
        this.dismiss(scene, onNextLevel)
      );
      cursorY += 130;
    }
    this.addButton(scene, 0, cursorY, '↺ Play Again', SECONDARY, () =>
      this.dismiss(scene, onPlayAgain)
    );
    cursorY += 110;
    this.addButton(scene, 0, cursorY, 'Back to Menu', TERTIARY, () => this.dismiss(scene, onMenu));

    if (showNext && onNextLevel) {
      A11yLayer.mountAction('a11y-post-session-next', `Next level: Level ${levelNumber + 1}`, () =>
        this.dismiss(scene, onNextLevel)
      );
    }
    A11yLayer.mountAction('a11y-post-session-replay', `Play Level ${levelNumber} again`, () =>
      this.dismiss(scene, onPlayAgain)
    );
    A11yLayer.mountAction('a11y-post-session-menu', 'Back to main menu', () =>
      this.dismiss(scene, onMenu)
    );
    A11yLayer.announce(
      `Great job finishing Level ${levelNumber}! Choose Next Level, Play Again, or Menu.`
    );

    TestHooks.mountSentinel('post-session-overlay');
    if (showNext && onNextLevel) {
      TestHooks.mountInteractive('post-session-next', () => this.dismiss(scene, onNextLevel), {
        width: '300px',
        height: '110px',
        top: '40%',
        left: '50%',
      });
    }
    TestHooks.mountInteractive('post-session-replay', () => this.dismiss(scene, onPlayAgain), {
      width: '300px',
      height: '90px',
      top: '52%',
      left: '50%',
    });
    TestHooks.mountInteractive('post-session-menu', () => this.dismiss(scene, onMenu), {
      width: '260px',
      height: '70px',
      top: '62%',
      left: '50%',
    });

    if (!reduceMotion) {
      scene.tweens.add({
        targets: this.container,
        y: CARD_Y,
        alpha: 1,
        duration: 320,
        ease: 'Back.easeOut',
        delay: 60,
      });
    }
  }

  private addButton(
    scene: Phaser.Scene,
    x: number,
    y: number,
    label: string,
    style: ButtonStyle,
    onTap: () => void
  ): void {
    const { w, h, r, shadow, fill, border, textColor, fontSize, fontFamily } = style;
    const parts: Phaser.GameObjects.GameObject[] = [];

    if (shadow > 0) {
      const sh = scene.add.graphics();
      sh.fillStyle(border, 1);
      sh.fillRoundedRect(x - w / 2, y - h / 2 + shadow, w, h, r);
      parts.push(sh);
    }
    const face = scene.add.graphics();
    face.fillStyle(fill, 1);
    face.fillRoundedRect(x - w / 2, y - h / 2, w, h, r);
    face.lineStyle(shadow > 0 ? 5 : 3, border, 1);
    face.strokeRoundedRect(x - w / 2, y - h / 2, w, h, r);
    parts.push(face);

    parts.push(
      scene.add
        .text(x, y, label, { fontFamily, fontSize, fontStyle: 'bold', color: textColor })
        .setOrigin(0.5)
    );
    parts.push(
      scene.add
        .rectangle(x, y, w, h + shadow, 0, 0)
        .setInteractive({ useHandCursor: true })
        .on('pointerup', onTap)
    );
    this.container.add(parts);
  }

  private dismiss(scene: Phaser.Scene, after: () => void): void {
    if (this.destroyed) return;
    this.destroyed = true;

    for (const id of HOOK_IDS) TestHooks.unmount(id);
    A11yLayer.popLayer();

    if (checkReduceMotion()) {
      this.scrim.destroy();
      this.container.destroy(true);
      after();
      return;
    }
    scene.tweens.add({
      targets: this.container,
      alpha: 0,
      y: this.container.y + 20,
      duration: 180,
      ease: 'Cubic.easeIn',
    });
    scene.tweens.add({
      targets: this.scrim,
      fillAlpha: 0,
      duration: 180,
      onComplete: () => {
        this.scrim.destroy();
        this.container.destroy(true);
        after();
      },
    });
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    for (const id of HOOK_IDS) TestHooks.unmount(id);
    A11yLayer.popLayer();
    this.scrim.destroy();
    this.container.destroy(true);
  }
}
