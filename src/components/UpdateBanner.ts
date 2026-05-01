/**
 * UpdateBanner — Phase 11.3.
 *
 * Non-blocking banner shown at the top of the canvas when a new service-worker
 * bundle has activated. Tapping the banner reloads the page so the player runs
 * the new code; the banner is only mounted from safe checkpoints (MenuScene)
 * so we never interrupt mid-level interaction.
 *
 * Plain class (not a Phaser Container) — matches FeedbackOverlay's pattern
 * (`src/components/FeedbackOverlay.ts`). Owners must call `destroy()` when
 * leaving the scene; tweens, timers, and the test sentinel are all torn down.
 *
 * Reduced-motion: skips the slide-in tween and shows the banner instantly.
 */

import * as Phaser from 'phaser';
import { CLR, HEX } from '../scenes/utils/colors';
import { BODY_FONT } from '../scenes/utils/levelTheme';
import { TestHooks } from '../scenes/utils/TestHooks';
import { checkReduceMotion } from '../lib/preferences';

export interface UpdateBannerConfig {
  scene: Phaser.Scene;
  /** Canvas logical width (800 per design-language.md §8.2). */
  width?: number;
  /** Canvas logical height (1280 per design-language.md §8.2). */
  height?: number;
  /** Depth — defaults above scene chrome but below modal overlays. */
  depth?: number;
  /** Called when the player taps the banner. Defaults to `location.reload()`. */
  onAccept?: () => void;
  /** Override the headline copy (rarely needed; for tests). */
  message?: string;
}

const DEFAULT_MESSAGE = 'A new version is ready — tap to refresh';
const BANNER_HEIGHT = 80;
const SLIDE_MS = 220;

export class UpdateBanner {
  private readonly scene: Phaser.Scene;
  private readonly bg: Phaser.GameObjects.Rectangle;
  private readonly label: Phaser.GameObjects.Text;
  private readonly hitZone: Phaser.GameObjects.Rectangle;
  private readonly onAccept: () => void;
  private dismissed = false;

  constructor(config: UpdateBannerConfig) {
    const { scene, width = 800, depth = 1500, message = DEFAULT_MESSAGE, onAccept } = config;

    this.scene = scene;
    this.onAccept =
      onAccept ??
      ((): void => {
        if (typeof location !== 'undefined') location.reload();
      });

    const reduceMotion = checkReduceMotion();
    const startY = reduceMotion ? BANNER_HEIGHT / 2 : -BANNER_HEIGHT / 2;
    const finalY = BANNER_HEIGHT / 2;

    // Banner background — primary fill so it reads as an actionable affordance.
    this.bg = scene.add
      .rectangle(width / 2, startY, width, BANNER_HEIGHT, CLR.primary, 0.96)
      .setDepth(depth);

    this.label = scene.add
      .text(width / 2, startY, message, {
        fontSize: '22px',
        fontFamily: BODY_FONT,
        fontStyle: 'bold',
        color: HEX.neutral0,
        align: 'center',
      })
      .setOrigin(0.5)
      .setDepth(depth + 1);

    // Full-banner hit zone — larger than the text so the touch target meets
    // the 44 CSS-px minimum on every viewport size we support.
    this.hitZone = scene.add
      .rectangle(width / 2, startY, width, BANNER_HEIGHT, 0x000000, 0)
      .setInteractive({ useHandCursor: true })
      .setDepth(depth + 2);

    this.hitZone.on('pointerup', () => this.handleAccept());

    // Test sentinel + DOM mirror so screen readers and Playwright pick it up.
    TestHooks.mountSentinel('update-banner');
    TestHooks.setText('update-banner', message);
    TestHooks.mountInteractive('update-banner-action', () => this.handleAccept(), {
      width: '100%',
      height: `${BANNER_HEIGHT}px`,
      top: '0px',
      left: '50%',
    });

    if (!reduceMotion) {
      scene.tweens.add({
        targets: [this.bg, this.label, this.hitZone],
        y: finalY,
        duration: SLIDE_MS,
        ease: 'Cubic.easeOut',
      });
    }
  }

  private handleAccept(): void {
    if (this.dismissed) return;
    this.dismissed = true;
    try {
      this.onAccept();
    } catch (err) {
      console.warn('[UpdateBanner] onAccept handler threw:', err);
    }
  }

  /** Programmatically dismiss without invoking the accept handler. */
  dismiss(): void {
    if (this.dismissed) return;
    this.dismissed = true;
    this.destroy();
  }

  destroy(): void {
    this.scene.tweens.killTweensOf([this.bg, this.label, this.hitZone]);
    this.bg.destroy();
    this.label.destroy();
    this.hitZone.destroy();
    TestHooks.unmount('update-banner');
    TestHooks.unmount('update-banner-action');
  }
}
