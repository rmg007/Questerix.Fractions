/**
 * SettingsScene — parent-facing settings: preferences, export backup, reset device.
 * per privacy-notice.md (export every byte, reset device)
 * per persistence-spec.md §6 (backupToFile, db.delete)
 * per accessibility.md §3 (keyboard-navigable), §5 (ARIA)
 */

import * as Phaser from 'phaser';
import { CLR, HEX } from './utils/colors';
import { TestHooks } from './utils/TestHooks';
import { PreferenceToggle } from '../components/PreferenceToggle';
import { backupToFile } from '../persistence/backup';
import { db } from '../persistence/db';
import { lastUsedStudent } from '../persistence/lastUsedStudent';

const CW = 800;
const CH = 1280;
const BTN_W = 360;
const BTN_H = 60;
const BTN_RADIUS = 10;

type ResetStep = 'idle' | 'confirm';

export class SettingsScene extends Phaser.Scene {
  private toggles: PreferenceToggle[] = [];

  constructor() {
    super({ key: 'SettingsScene' });
  }

  create(): void {
    TestHooks.unmountAll();
    TestHooks.mountSentinel('settings-scene');

    const cx = CW / 2;

    // Background
    this.add.rectangle(cx, CH / 2, CW, CH, CLR.neutral0);

    // Heading
    this.add
      .text(cx, 100, 'Settings', {
        fontSize: '40px',
        fontFamily: '"Nunito", system-ui, sans-serif',
        fontStyle: 'bold',
        color: HEX.primary,
      })
      .setOrigin(0.5);

    // ── Section labels ─────────────────────────────────────────────────────
    this.sectionLabel(cx, 190, 'Preferences');
    this.sectionLabel(cx, 560, 'Data');
    this.sectionLabel(cx, 820, 'Privacy');

    // ── Preferences toggles (DOM overlays) ─────────────────────────────────
    // Canvas top ~100px; section label at 190 canvas px.
    // We position relative to viewport using approximate mapping.
    const canvasTop = this.sys.game.canvas.getBoundingClientRect?.().top ?? 0;
    const scaleY = this.sys.game.canvas.clientHeight / CH;

    const toViewport = (canvasY: number) => `${canvasTop + canvasY * scaleY}px`;

    const halfCanvas = `${(this.sys.game.canvas.getBoundingClientRect?.().left ?? 0) + this.sys.game.canvas.clientWidth / 2}px`;

    this.toggles.push(
      new PreferenceToggle(
        { key: 'reduceMotion', label: 'Reduced Motion' },
        { top: toViewport(250), left: halfCanvas }
      ),
      new PreferenceToggle(
        { key: 'audio', label: 'TTS Enabled' },
        { top: toViewport(330), left: halfCanvas }
      ),
      new PreferenceToggle(
        { key: 'persistGranted', label: 'Storage Permission', readOnly: true },
        { top: toViewport(410), left: halfCanvas }
      )
    );

    // ── Export button ──────────────────────────────────────────────────────
    TestHooks.mountInteractive('settings-export-btn', () => void this.doExport(), {
      top: toViewport(630),
      left: halfCanvas,
      width: `${BTN_W * (this.sys.game.canvas.clientWidth / CW)}px`,
      height: `${BTN_H * scaleY}px`,
    });
    this.createButton(
      cx,
      630,
      'Export My Backup',
      CLR.primary,
      HEX.neutral0,
      () => void this.doExport()
    );

    // ── Reset button ───────────────────────────────────────────────────────
    TestHooks.mountInteractive('settings-reset-btn', () => this.handleReset(), {
      top: toViewport(720),
      left: halfCanvas,
      width: `${BTN_W * (this.sys.game.canvas.clientWidth / CW)}px`,
      height: `${BTN_H * scaleY}px`,
    });
    this.createResetButton(cx, 720);

    // ── Privacy notice ─────────────────────────────────────────────────────
    this.createPrivacyLink(cx, 870);

    // ── Back button ────────────────────────────────────────────────────────
    TestHooks.mountInteractive('settings-back-btn', () => this.goBack(), {
      top: toViewport(1100),
      left: halfCanvas,
      width: `${BTN_W * (this.sys.game.canvas.clientWidth / CW)}px`,
      height: `${BTN_H * scaleY}px`,
    });
    this.createButton(cx, 1100, 'Back', CLR.neutral100, HEX.neutral600, () => this.goBack());

    // ── Keyboard navigation ────────────────────────────────────────────────
    if (typeof document !== 'undefined') {
      this._keyHandler = (e: KeyboardEvent) => {
        if (e.key === 'Escape') this.goBack();
      };
      document.addEventListener('keydown', this._keyHandler);
    }
  }

  private _keyHandler: ((e: KeyboardEvent) => void) | null = null;

  // ── Reset state ───────────────────────────────────────────────────────────
  private resetStep: ResetStep = 'idle';
  private resetGraphics: Phaser.GameObjects.Graphics | null = null;
  private resetTexts: Phaser.GameObjects.Text[] = [];
  private resetButtons: Phaser.GameObjects.Rectangle[] = [];

  private createResetButton(cx: number, y: number): void {
    this.resetGraphics = this.add.graphics();
    this.drawResetIdle(cx, y);

    const resetText = this.add
      .text(cx, y, 'Reset Device', {
        fontSize: '22px',
        fontFamily: '"Nunito", system-ui, sans-serif',
        fontStyle: 'bold',
        color: '#DC2626',
      })
      .setOrigin(0.5)
      .setDepth(2);

    const hitZone = this.add
      .rectangle(cx, y, BTN_W, BTN_H, 0x000000, 0)
      .setInteractive({ useHandCursor: true })
      .setDepth(3);

    hitZone.on('pointerup', () => {
      if (this.resetStep === 'idle') {
        this.resetStep = 'confirm';
        resetText.setVisible(false);
        hitZone.setVisible(false);
        this.showConfirmUI(cx, y);
      }
    });

    this.resetTexts.push(resetText);
    this.resetButtons.push(hitZone);
  }

  private drawResetIdle(cx: number, y: number): void {
    if (!this.resetGraphics) return;
    this.resetGraphics.clear();
    this.resetGraphics.fillStyle(0xfee2e2, 1);
    this.resetGraphics.fillRoundedRect(cx - BTN_W / 2, y - BTN_H / 2, BTN_W, BTN_H, BTN_RADIUS);
    this.resetGraphics.setDepth(1);
  }

  private confirmTexts: Phaser.GameObjects.Text[] = [];
  private confirmButtons: Phaser.GameObjects.Rectangle[] = [];
  private confirmGraphics: Phaser.GameObjects.Graphics[] = [];

  private showConfirmUI(cx: number, baseY: number): void {
    // Confirmation label
    const label = this.add
      .text(cx, baseY - 20, 'Reset Device — are you sure?\nThis deletes everything.', {
        fontSize: '18px',
        fontFamily: '"Nunito", system-ui, sans-serif',
        color: '#DC2626',
        align: 'center',
      })
      .setOrigin(0.5)
      .setDepth(2);

    // "Yes, reset" button
    const yesG = this.add.graphics();
    yesG.fillStyle(0xdc2626, 1);
    yesG.fillRoundedRect(cx - 170, baseY + 50, 150, 48, 8);
    yesG.setDepth(1);

    const yesText = this.add
      .text(cx - 95, baseY + 74, 'Yes, reset', {
        fontSize: '18px',
        fontFamily: '"Nunito", system-ui, sans-serif',
        fontStyle: 'bold',
        color: '#FFFFFF',
      })
      .setOrigin(0.5)
      .setDepth(2);

    const yesHit = this.add
      .rectangle(cx - 95, baseY + 74, 150, 48, 0x000000, 0)
      .setInteractive({ useHandCursor: true })
      .setDepth(3);

    yesHit.on('pointerup', () => void this.executeReset());

    // "Cancel" button
    const cancelG = this.add.graphics();
    cancelG.fillStyle(0xe5e7eb, 1);
    cancelG.fillRoundedRect(cx + 20, baseY + 50, 150, 48, 8);
    cancelG.setDepth(1);

    const cancelText = this.add
      .text(cx + 95, baseY + 74, 'Cancel', {
        fontSize: '18px',
        fontFamily: '"Nunito", system-ui, sans-serif',
        fontStyle: 'bold',
        color: '#374151',
      })
      .setOrigin(0.5)
      .setDepth(2);

    const cancelHit = this.add
      .rectangle(cx + 95, baseY + 74, 150, 48, 0x000000, 0)
      .setInteractive({ useHandCursor: true })
      .setDepth(3);

    cancelHit.on('pointerup', () => this.cancelReset(cx, baseY));

    this.confirmTexts.push(label, yesText, cancelText);
    this.confirmGraphics.push(yesG, cancelG);
    this.confirmButtons.push(yesHit, cancelHit);
  }

  private cancelReset(cx: number, y: number): void {
    this.resetStep = 'idle';
    this.confirmTexts.forEach((t) => t.destroy());
    this.confirmButtons.forEach((b) => b.destroy());
    this.confirmGraphics.forEach((g) => g.destroy());
    this.confirmTexts = [];
    this.confirmButtons = [];
    this.confirmGraphics = [];
    this.resetTexts.forEach((t) => t.setVisible(true));
    this.resetButtons.forEach((b) => b.setVisible(true));
    this.drawResetIdle(cx, y);
  }

  private async executeReset(): Promise<void> {
    try {
      await db.delete();
    } catch {
      // ignore — DB may already be gone
    }
    lastUsedStudent.clear();
    if (typeof location !== 'undefined') location.reload();
  }

  private handleReset(): void {
    // Programmatic trigger from TestHook overlay — simulate step 1 click on canvas button
    const hit = this.resetButtons[0];
    if (hit) hit.emit('pointerup');
  }

  // ── Export ─────────────────────────────────────────────────────────────────
  private exportStatusText: Phaser.GameObjects.Text | null = null;

  private async doExport(): Promise<void> {
    try {
      await backupToFile();
      this.showExportStatus('Saved! Check your downloads.');
    } catch {
      this.showExportStatus('Export failed — please try again.');
    }
  }

  private showExportStatus(msg: string): void {
    this.exportStatusText?.destroy();
    this.exportStatusText = this.add
      .text(CW / 2, 680, msg, {
        fontSize: '16px',
        fontFamily: '"Nunito", system-ui, sans-serif',
        color: '#059669',
      })
      .setOrigin(0.5)
      .setDepth(5);

    this.time.delayedCall(3000, () => {
      this.exportStatusText?.destroy();
      this.exportStatusText = null;
    });
  }

  // ── Privacy link ───────────────────────────────────────────────────────────
  private createPrivacyLink(cx: number, y: number): void {
    const text = this.add
      .text(cx, y, 'Privacy Notice →', {
        fontSize: '16px',
        fontFamily: '"Nunito", system-ui, sans-serif',
        color: '#5848D6', // C6.1: darkened to 5.2:1 contrast (WCAG AA 4.5:1)
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .setDepth(3);

    text.on('pointerup', () => {
      if (typeof window !== 'undefined') {
        window.open('/privacy.html', '_blank', 'noopener');
      }
    });
  }

  // ── Section label ──────────────────────────────────────────────────────────
  private sectionLabel(cx: number, y: number, label: string): void {
    this.add
      .text(cx, y, label, {
        fontSize: '22px',
        fontFamily: '"Nunito", system-ui, sans-serif',
        fontStyle: 'bold',
        color: HEX.neutral600,
      })
      .setOrigin(0.5);
  }

  // ── Generic button ─────────────────────────────────────────────────────────
  private createButton(
    x: number,
    y: number,
    label: string,
    bgColor: number,
    textColor: string,
    onTap: () => void
  ): void {
    const g = this.add.graphics();
    const draw = (alpha = 1) => {
      g.clear();
      g.fillStyle(bgColor, alpha);
      g.fillRoundedRect(x - BTN_W / 2, y - BTN_H / 2, BTN_W, BTN_H, BTN_RADIUS);
    };
    draw();

    this.add
      .text(x, y, label, {
        fontSize: '22px',
        fontFamily: '"Nunito", system-ui, sans-serif',
        fontStyle: 'bold',
        color: textColor,
      })
      .setOrigin(0.5)
      .setDepth(2);

    const hitZone = this.add
      .rectangle(x, y, BTN_W, BTN_H, 0x000000, 0)
      .setInteractive({ useHandCursor: true })
      .setDepth(3);

    hitZone.on('pointerdown', () => draw(0.75));
    hitZone.on('pointerup', () => {
      draw();
      onTap();
    });
    hitZone.on('pointerout', () => draw());

    g.setDepth(1);
  }

  // ── Navigation ─────────────────────────────────────────────────────────────
  private goBack(): void {
    this.cleanup();
    this.scene.start('MenuScene');
  }

  private cleanup(): void {
    if (this._keyHandler && typeof document !== 'undefined') {
      document.removeEventListener('keydown', this._keyHandler);
      this._keyHandler = null;
    }
    this.toggles.forEach((t) => t.destroy());
    this.toggles = [];
    PreferenceToggle.destroyAll();
    TestHooks.unmountAll();
  }

  shutdown(): void {
    this.cleanup();
  }
}
