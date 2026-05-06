/**
 * RecoveryScene — full-screen error recovery UI shown when a scene throws or
 * assets fail to load after all retries.
 *
 * Presents two CTAs:
 *   "Try again"    — relaunches the originating scene (or BootScene if unknown)
 *   "Back to menu" — starts MenuScene
 *
 * Per crash-and-recovery plan Phase 1 §3.
 * Per WCAG 2.1 AA — keyboard accessible, A11yLayer registered.
 * Per C1 — no external HTTP calls.
 */

import * as Phaser from 'phaser';
import { Mascot } from '../components/Mascot';
import { A11yLayer } from '../components/A11yLayer';
import { TestHooks } from './utils/TestHooks';
import { get } from '../lib/i18n/catalog';
import { tween, Duration, Ease } from './utils/motion';
import { applyState } from './utils/states';
import { drawAdventureBackground, BODY_FONT, TITLE_FONT } from './utils/levelTheme';
import { CLR, HEX } from './utils/colors';
import type { RecoveryReport } from '../lib/recovery/recoveryBus';

const CW = 800;
const CH = 1280;
const BTN_W = 340;
const BTN_H = 100;
const BTN_RADIUS = 12;

interface RecoverySceneData extends RecoveryReport {
  /** If true, show the curriculum-fail variant copy. */
  curriculumFail?: boolean;
}

export class RecoveryScene extends Phaser.Scene {
  private recoveryData!: RecoverySceneData;
  private retryBtn!: Phaser.GameObjects.Container;
  private menuBtn!: Phaser.GameObjects.Container;

  constructor() {
    super({ key: 'RecoveryScene' });
  }

  init(d: RecoverySceneData): void {
    this.recoveryData = d ?? { kind: 'unknown', error: new Error('unknown') };
  }

  create(): void {
    const cx = CW / 2;

    drawAdventureBackground(this, CW, CH);

    // ── Mascot in 'oops' pose ────────────────────────────────────────────
    const mascot = new Mascot(this, cx, 360, 1.1);
    this.add.existing(mascot);
    mascot.setState('oops');

    // ── Copy ─────────────────────────────────────────────────────────────
    const isCurriculumFail = this.recoveryData.kind === 'curriculum-fail';
    const titleKey = isCurriculumFail ? 'recovery.curriculum.title' : 'recovery.title';
    const bodyKey = isCurriculumFail ? 'recovery.curriculum.body' : 'recovery.body';
    const retryKey = isCurriculumFail ? 'recovery.cta.reload' : 'recovery.cta.retry';

    this.add
      .text(cx, 660, get(titleKey), {
        fontFamily: TITLE_FONT,
        fontSize: '40px',
        color: HEX.primary,
        align: 'center',
        wordWrap: { width: CW - 80 },
      })
      .setOrigin(0.5)
      .setDepth(5)
      .setAlpha(0);

    const titleObj = this.children.getChildren().at(-1) as Phaser.GameObjects.Text;

    this.add
      .text(cx, 740, get(bodyKey), {
        fontFamily: BODY_FONT,
        fontSize: '28px',
        color: '#444444',
        align: 'center',
        wordWrap: { width: CW - 80 },
      })
      .setOrigin(0.5)
      .setDepth(5)
      .setAlpha(0);

    const bodyObj = this.children.getChildren().at(-1) as Phaser.GameObjects.Text;

    // Fade in title + body (reduced-motion safe via tween wrapper)
    tween(this, titleObj, { alpha: 1 }, { duration: Duration.long, ease: Ease.out, delay: 120 });
    tween(this, bodyObj, { alpha: 1 }, { duration: Duration.long, ease: Ease.out, delay: 220 });

    // ── CTAs ─────────────────────────────────────────────────────────────
    this.retryBtn = this.makeButton(
      cx,
      880,
      get(retryKey),
      CLR.primary,
      '#FFFFFF',
      'recovery-retry-btn',
      () => this.handleRetry()
    );

    this.menuBtn = this.makeButton(
      cx,
      980,
      get('recovery.cta.menu'),
      CLR.neutral100,
      HEX.primary,
      'recovery-menu-btn',
      () => this.handleMenu()
    );

    // Entrance animation — slide up from slightly below
    const startY = CH + 60;
    this.retryBtn.y = startY;
    this.menuBtn.y = startY + 100;

    tween(
      this,
      this.retryBtn,
      { y: 880 },
      { duration: Duration.long, ease: Ease.spring, delay: 300 }
    );
    tween(
      this,
      this.menuBtn,
      { y: 980 },
      { duration: Duration.long, ease: Ease.spring, delay: 380 }
    );

    // ── A11y layer ────────────────────────────────────────────────────────
    A11yLayer.pushLayer('recovery', 'Error recovery');
    const primaryBtn = A11yLayer.mountAction('recovery-retry-btn', get(retryKey), () =>
      this.handleRetry()
    );
    A11yLayer.mountAction('recovery-menu-btn', get('recovery.cta.menu'), () => this.handleMenu());

    // Auto-focus the primary CTA so keyboard users land on it immediately.
    // Defer by one tick so the DOM node is fully attached before focus fires.
    if (primaryBtn) {
      this.time.delayedCall(50, () => primaryBtn.focus());
    }

    this.events.once('shutdown', () => {
      A11yLayer.popLayer();
    });
  }

  private makeButton(
    x: number,
    y: number,
    label: string,
    bgColor: number,
    textColor: string,
    testId: string,
    onPress: () => void
  ): Phaser.GameObjects.Container {
    const bg = this.add.graphics();
    bg.fillStyle(bgColor, 1);
    bg.fillRoundedRect(-BTN_W / 2, -BTN_H / 2, BTN_W, BTN_H, BTN_RADIUS);

    const txt = this.add
      .text(0, 0, label, {
        fontFamily: BODY_FONT,
        fontSize: '32px',
        fontStyle: 'bold',
        color: textColor,
      })
      .setOrigin(0.5);

    const container = this.add.container(x, y, [bg, txt]).setDepth(10);
    container.setSize(BTN_W, BTN_H);
    container.setInteractive({ useHandCursor: true });

    container.on('pointerover', () => applyState(container, 'hover', this));
    container.on('pointerout', () => applyState(container, 'idle', this));
    container.on('pointerdown', () => {
      applyState(container, 'pressed', this);
      this.time.delayedCall(120, onPress);
    });

    // data-testid for E2E
    TestHooks.mountInteractive(testId, onPress, { width: `${BTN_W}px`, height: `${BTN_H}px` });

    return container;
  }

  private handleRetry(): void {
    // curriculum-fail: the curriculum bundle must be re-fetched — a scene restart
    // won't reload the network resource. Do a full page reload instead.
    if (this.recoveryData.kind === 'curriculum-fail') {
      location.reload();
      return;
    }
    const originScene = this.recoveryData.scene ?? 'BootScene';
    this.scene.start(originScene);
  }

  private handleMenu(): void {
    this.scene.start('MenuScene');
  }
}
