import * as Phaser from 'phaser';
import { BODY_FONT } from '../utils/levelTheme';
import { db } from '../../persistence/db';
import { lastUsedStudent } from '../../persistence/lastUsedStudent';
import { AccessibilityAnnouncer } from '../../components/AccessibilityAnnouncer';
import { A11yLayer } from '../../components/A11yLayer';

const BTN_W = 500;
const BTN_H = 80;
const BTN_RADIUS = 16;

type ResetStep = 'idle' | 'confirm';

export class ResetDeviceHandler {
  private scene: Phaser.Scene;
  private step: ResetStep = 'idle';
  private graphics: Phaser.GameObjects.Graphics | null = null;
  private texts: Phaser.GameObjects.Text[] = [];
  private buttons: Phaser.GameObjects.Rectangle[] = [];
  private confirmTexts: Phaser.GameObjects.Text[] = [];
  private confirmButtons: Phaser.GameObjects.Rectangle[] = [];
  private confirmGraphics: Phaser.GameObjects.Graphics[] = [];

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  create(cx: number, y: number): void {
    this.graphics = this.scene.add.graphics();
    this.drawResetIdle(cx, y);

    const resetText = this.scene.add
      .text(cx, y, 'Reset Device', {
        fontSize: '28px',
        fontFamily: BODY_FONT,
        fontStyle: 'bold',
        color: '#DC2626',
      })
      .setOrigin(0.5)
      .setDepth(2);

    const hitZone = this.scene.add
      .rectangle(cx, y, BTN_W, BTN_H, 0x000000, 0)
      .setInteractive({ useHandCursor: true })
      .setDepth(3);

    hitZone.on('pointerup', () => {
      if (this.step === 'idle') {
        this.step = 'confirm';
        resetText.setVisible(false);
        hitZone.setVisible(false);
        this.showConfirmUI(cx, y);
      }
    });

    this.texts.push(resetText);
    this.buttons.push(hitZone);
  }

  private drawResetIdle(cx: number, y: number): void {
    if (!this.graphics) return;
    this.graphics.clear();
    this.graphics.fillStyle(0xfee2e2, 1);
    this.graphics.fillRoundedRect(cx - BTN_W / 2, y - BTN_H / 2, BTN_W, BTN_H, BTN_RADIUS);
    this.graphics.setDepth(1);
  }

  private showConfirmUI(cx: number, baseY: number): void {
    const label = this.scene.add
      .text(cx, baseY - 30, 'Reset Device — are you sure?\nThis deletes everything.', {
        fontSize: '26px',
        fontFamily: BODY_FONT,
        color: '#DC2626',
        align: 'center',
      })
      .setOrigin(0.5)
      .setDepth(2);

    // "Yes, reset" button
    const yesG = this.scene.add.graphics();
    yesG.fillStyle(0xdc2626, 1);
    yesG.fillRoundedRect(cx - 250, baseY + 40, 240, 80, 10);
    yesG.setDepth(1);

    const yesText = this.scene.add
      .text(cx - 130, baseY + 80, 'Yes, reset', {
        fontSize: '26px',
        fontFamily: BODY_FONT,
        fontStyle: 'bold',
        color: '#FFFFFF',
      })
      .setOrigin(0.5)
      .setDepth(2);

    const yesHit = this.scene.add
      .rectangle(cx - 130, baseY + 80, 240, 80, 0x000000, 0)
      .setInteractive({ useHandCursor: true })
      .setDepth(3);

    yesHit.on('pointerup', () => void this.executeReset());

    // "Cancel" button
    const cancelG = this.scene.add.graphics();
    cancelG.fillStyle(0xe5e7eb, 1);
    cancelG.fillRoundedRect(cx + 10, baseY + 40, 240, 80, 10);
    cancelG.setDepth(1);

    const cancelText = this.scene.add
      .text(cx + 130, baseY + 80, 'Cancel', {
        fontSize: '26px',
        fontFamily: BODY_FONT,
        fontStyle: 'bold',
        color: '#374151',
      })
      .setOrigin(0.5)
      .setDepth(2);

    const cancelHit = this.scene.add
      .rectangle(cx + 130, baseY + 80, 240, 80, 0x000000, 0)
      .setInteractive({ useHandCursor: true })
      .setDepth(3);

    cancelHit.on('pointerup', () => this.cancelReset(cx, baseY));

    this.confirmTexts.push(label, yesText, cancelText);
    this.confirmGraphics.push(yesG, cancelG);
    this.confirmButtons.push(yesHit, cancelHit);

    // A11yLayer parity for keyboard / screen-reader users (W-1)
    AccessibilityAnnouncer.announce('Confirm device reset. This deletes everything.');
    A11yLayer.pushLayer('reset-confirm', 'Confirm device reset');
    A11yLayer.mountAction('reset-confirm-yes', 'Yes, reset device', () => void this.executeReset());
    A11yLayer.mountAction('reset-confirm-cancel', 'Cancel reset', () =>
      this.cancelReset(cx, baseY)
    );
    if (typeof document !== 'undefined') {
      requestAnimationFrame(() => {
        const cancelBtn = document.querySelector(
          '[data-a11y-id="reset-confirm-cancel"]'
        ) as HTMLElement | null;
        cancelBtn?.focus(); // focus Cancel by default — safer than Yes
      });
    }
  }

  private cancelReset(cx: number, y: number): void {
    this.step = 'idle';
    A11yLayer.popLayer();
    this.confirmTexts.forEach((t) => t.destroy());
    this.confirmButtons.forEach((b) => b.destroy());
    this.confirmGraphics.forEach((g) => g.destroy());
    this.confirmTexts = [];
    this.confirmButtons = [];
    this.confirmGraphics = [];
    this.texts.forEach((t) => t.setVisible(true));
    this.buttons.forEach((b) => b.setVisible(true));
    this.drawResetIdle(cx, y);
  }

  private async executeReset(): Promise<void> {
    A11yLayer.popLayer();
    AccessibilityAnnouncer.announce('Resetting device. Please wait.');
    try {
      await db.delete();
    } catch {
      // ignore — DB may already be gone
    }
    lastUsedStudent.clear();
    if (typeof location !== 'undefined') location.reload();
  }

  handleExternalReset(): void {
    const hit = this.buttons[0];
    if (hit) hit.emit('pointerup');
  }

  destroy(): void {
    this.graphics?.destroy();
    this.texts.forEach((t) => t.destroy());
    this.buttons.forEach((b) => b.destroy());
    this.confirmTexts.forEach((t) => t.destroy());
    this.confirmButtons.forEach((b) => b.destroy());
    this.confirmGraphics.forEach((g) => g.destroy());
  }
}
