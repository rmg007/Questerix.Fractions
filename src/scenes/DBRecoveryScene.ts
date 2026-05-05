/**
 * DBRecoveryScene — shown when the DB integrity probe detects corruption.
 *
 * Three CTAs:
 *   "Continue with last backup" — routes to SettingsScene (backup restore flow)
 *   "Start fresh"               — deletes DB, preserves lastUsedStudentId, reloads
 *   "Cancel"                    — returns to BootScene without any change
 *
 * Per crash-and-recovery plan Phase 2 §2.
 * Per WCAG 2.1 AA — keyboard accessible, A11yLayer registered.
 * Per C1 — no external HTTP calls.
 * Per C5 — only localStorage key preserved on "Start fresh" is lastUsedStudentId.
 */

import * as Phaser from 'phaser';
import { Mascot } from '../components/Mascot';
import { A11yLayer } from '../components/A11yLayer';
import { get } from '../lib/i18n/catalog';
import { tween, Duration, Ease } from './utils/motion';
import { applyState } from './utils/states';
import { drawAdventureBackground, BODY_FONT, TITLE_FONT } from './utils/levelTheme';
import { CLR, HEX } from './utils/colors';
import { deleteDatabase } from '../persistence/integrity';
import { TestHooks } from './utils/TestHooks';

const CW = 800;
const CH = 1280;
const BTN_W = 360;
const BTN_H = 72;
const BTN_RADIUS = 12;

const LAST_STUDENT_KEY = 'questerix.lastUsedStudentId'; // C5

export class DBRecoveryScene extends Phaser.Scene {
  constructor() {
    super({ key: 'DBRecoveryScene' });
  }

  create(): void {
    const cx = CW / 2;

    drawAdventureBackground(this, CW, CH);

    // ── Mascot in 'oops' pose ────────────────────────────────────────────
    const mascot = new Mascot(this, cx, 340, 1.0);
    this.add.existing(mascot);
    mascot.setState('oops');

    // ── Copy ─────────────────────────────────────────────────────────────
    const titleObj = this.add
      .text(cx, 620, get('db.recovery.title'), {
        fontFamily: TITLE_FONT,
        fontSize: '36px',
        color: HEX.primary,
        align: 'center',
        wordWrap: { width: CW - 80 },
      })
      .setOrigin(0.5)
      .setDepth(5)
      .setAlpha(0);

    const bodyObj = this.add
      .text(cx, 700, get('db.recovery.body'), {
        fontFamily: BODY_FONT,
        fontSize: '26px',
        color: '#444444',
        align: 'center',
        wordWrap: { width: CW - 80 },
      })
      .setOrigin(0.5)
      .setDepth(5)
      .setAlpha(0);

    tween(this, titleObj, { alpha: 1 }, { duration: Duration.long, ease: Ease.out, delay: 120 });
    tween(this, bodyObj, { alpha: 1 }, { duration: Duration.long, ease: Ease.out, delay: 220 });

    // ── CTAs ─────────────────────────────────────────────────────────────
    const backupBtn = this.makeButton(
      cx,
      820,
      get('db.recovery.cta.backup'),
      CLR.primary,
      '#FFFFFF',
      'db-recovery-backup-btn',
      () => this.handleBackup()
    );

    const freshBtn = this.makeButton(
      cx,
      920,
      get('db.recovery.cta.fresh'),
      0xe55c5c,
      '#FFFFFF',
      'db-recovery-fresh-btn',
      () => this.handleFresh()
    );

    const cancelBtn = this.makeButton(
      cx,
      1020,
      get('db.recovery.cta.cancel'),
      CLR.neutral100,
      HEX.primary,
      'db-recovery-cancel-btn',
      () => this.handleCancel()
    );

    // Entrance animation
    const startY = CH + 60;
    backupBtn.y = startY;
    freshBtn.y = startY + 100;
    cancelBtn.y = startY + 200;

    tween(this, backupBtn, { y: 820 }, { duration: Duration.long, ease: Ease.spring, delay: 300 });
    tween(this, freshBtn, { y: 920 }, { duration: Duration.long, ease: Ease.spring, delay: 380 });
    tween(this, cancelBtn, { y: 1020 }, { duration: Duration.long, ease: Ease.spring, delay: 440 });

    // ── A11y layer ────────────────────────────────────────────────────────
    A11yLayer.pushLayer('db-recovery', 'Database recovery options');
    const primaryBtn = A11yLayer.mountAction(
      'db-recovery-backup-btn',
      get('db.recovery.cta.backup'),
      () => this.handleBackup()
    );
    A11yLayer.mountAction('db-recovery-fresh-btn', get('db.recovery.cta.fresh'), () =>
      this.handleFresh()
    );
    A11yLayer.mountAction('db-recovery-cancel-btn', get('db.recovery.cta.cancel'), () =>
      this.handleCancel()
    );

    // Auto-focus the primary (least destructive) CTA so keyboard users land on it.
    if (primaryBtn) {
      this.time.delayedCall(50, () => primaryBtn.focus());
    }

    this.events.once('shutdown', () => {
      A11yLayer.popLayer();
    });

    TestHooks.unmountAll();
    TestHooks.mountSentinel('db-recovery-scene');
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
        fontSize: '24px',
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

    TestHooks.mountInteractive(testId, onPress, {
      width: `${BTN_W}px`,
      height: `${BTN_H}px`,
    });

    return container;
  }

  private handleBackup(): void {
    // Route to SettingsScene where the restore-from-backup UI lives
    this.scene.start('SettingsScene');
  }

  private handleFresh(): void {
    // Preserve lastUsedStudentId per C5, then wipe DB and reload
    const lastStudentId = (() => {
      try {
        return localStorage.getItem(LAST_STUDENT_KEY);
      } catch {
        return null;
      }
    })();

    deleteDatabase()
      .then(() => {
        // Restore the one allowed localStorage key after delete
        if (lastStudentId) {
          try {
            localStorage.setItem(LAST_STUDENT_KEY, lastStudentId);
          } catch {
            /* ignore */
          }
        }
        location.reload();
      })
      .catch((err) => {
        console.warn('[DBRecoveryScene] Failed to delete database — reloading anyway:', err);
        // Fall back to plain reload — Dexie will recreate the schema on next open
        location.reload();
      });
  }

  private handleCancel(): void {
    this.scene.start('BootScene');
  }
}
