/**
 * SettingsScene — parent-facing settings: preferences, export backup, reset device.
 * per privacy-notice.md (export every byte, reset device)
 * per persistence-spec.md §6 (backupToFile, db.delete)
 * per accessibility.md §3 (keyboard-navigable), §5 (ARIA)
 */

import * as Phaser from 'phaser';
import { CLR, HEX } from './utils/colors';
import { TestHooks } from './utils/TestHooks';
import { fadeAndStart } from './utils/sceneTransition';
import { PreferenceToggle } from '../components/PreferenceToggle';
import { backupToFile, restoreFromFile } from '../persistence/backup';
import { db } from '../persistence/db';
import { lastUsedStudent } from '../persistence/lastUsedStudent';
import { deviceMetaRepo } from '../persistence/repositories/deviceMeta';
import { sfx } from '../audio/SFXService';
import { tts } from '../audio/TTSService';

const CW = 800;
const CH = 1280;
const BTN_W = 360;
const BTN_H = 60;
const BTN_RADIUS = 10;

type ResetStep = 'idle' | 'confirm';

export class SettingsScene extends Phaser.Scene {
  private toggles: PreferenceToggle[] = [];
  private volumeSliderWrapper: HTMLElement | null = null;

  constructor() {
    super({ key: 'SettingsScene' });
  }

  create(): void {
    TestHooks.unmountAll();
    TestHooks.mountSentinel('settings-scene');

    // Fade in from black on arrival
    try {
      if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        this.cameras.main.fadeIn(300, 0, 0, 0);
      }
    } catch { /* ignore */ }

    const cx = CW / 2;

    // Background
    this.add.rectangle(cx, CH / 2, CW, CH, CLR.neutral0);

    // Heading
    this.add
      .text(cx, 100, 'Settings', {
        fontSize: '40px',
        fontFamily: '"Lexend", "Nunito", system-ui, sans-serif',
        fontStyle: 'bold',
        color: HEX.primary,
      })
      .setOrigin(0.5);

    // ── Section labels ─────────────────────────────────────────────────────
    this.sectionLabel(cx, 190, 'Preferences');
    this.sectionLabel(cx, 560, 'Data');
    this.sectionLabel(cx, 920, 'Privacy');

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
        {
          key: 'audio',
          label: 'Audio Enabled',
          onChange: (val) => {
            const audioOn = val as boolean;
            if (this.volumeSliderWrapper) {
              const slider = this.volumeSliderWrapper.querySelector('input') as HTMLInputElement | null;
              if (slider) slider.disabled = !audioOn;
              this.volumeSliderWrapper.style.opacity = audioOn ? '1' : '0.4';
            }
          },
        },
        { top: toViewport(330), left: halfCanvas }
      ),
      new PreferenceToggle(
        { key: 'persistGranted', label: 'Storage Permission', readOnly: true },
        { top: toViewport(490), left: halfCanvas }
      )
    );

    // ── Volume slider (DOM overlay) ────────────────────────────────────────
    void this.createVolumeSlider(toViewport(410), halfCanvas);

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

    // ── Restore button ─────────────────────────────────────────────────────
    this.setupFileInput();
    TestHooks.mountInteractive('settings-restore-btn', () => this.triggerFilePicker(), {
      top: toViewport(720),
      left: halfCanvas,
      width: `${BTN_W * (this.sys.game.canvas.clientWidth / CW)}px`,
      height: `${BTN_H * scaleY}px`,
    });
    this.createButton(
      cx,
      720,
      'Restore from Backup',
      CLR.primary,
      HEX.neutral0,
      () => this.triggerFilePicker()
    );

    // ── Reset button ───────────────────────────────────────────────────────
    TestHooks.mountInteractive('settings-reset-btn', () => this.handleReset(), {
      top: toViewport(820),
      left: halfCanvas,
      width: `${BTN_W * (this.sys.game.canvas.clientWidth / CW)}px`,
      height: `${BTN_H * scaleY}px`,
    });
    this.createResetButton(cx, 820);

    // ── Privacy notice ─────────────────────────────────────────────────────
    this.createPrivacyLink(cx, 970);

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

  // ── Volume slider ─────────────────────────────────────────────────────────

  private async createVolumeSlider(top: string, left: string): Promise<void> {
    if (typeof document === 'undefined') return;

    const meta = await deviceMetaRepo.get();
    const currentVolume = meta.preferences.volume ?? 0.8;
    const audioEnabled = meta.preferences.audio;

    // Reuse the same container as PreferenceToggle
    let container = document.getElementById('qf-pref-toggles');
    if (!container) {
      container = document.createElement('div');
      container.id = 'qf-pref-toggles';
      Object.assign(container.style, {
        position: 'fixed',
        top: '0',
        left: '0',
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: '10000',
      });
      document.body.appendChild(container);
    }

    // Wrapper row — mirrors PreferenceToggle layout
    const wrapper = document.createElement('div');
    Object.assign(wrapper.style, {
      position: 'absolute',
      top,
      left,
      transform: 'translateX(-50%)',
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      pointerEvents: 'auto',
      opacity: audioEnabled ? '1' : '0.4',
    });

    // Label
    const labelEl = document.createElement('label');
    labelEl.setAttribute('for', 'qf-volume-slider');
    labelEl.textContent = 'Volume';
    Object.assign(labelEl.style, {
      fontFamily: '"Lexend", "Nunito", system-ui, sans-serif',
      fontSize: '18px',
      color: '#374151',
      minWidth: '180px',
    });

    // Range input
    const slider = document.createElement('input');
    slider.type = 'range';
    slider.id = 'qf-volume-slider';
    slider.min = '0';
    slider.max = '1';
    slider.step = '0.05';
    slider.value = String(currentVolume);
    slider.disabled = !audioEnabled;
    slider.setAttribute('aria-label', 'Volume');
    slider.setAttribute('data-testid', 'volume-slider');
    Object.assign(slider.style, {
      width: '160px',
      accentColor: '#6C63FF',
      cursor: 'pointer',
    });

    slider.addEventListener('input', () => {
      const vol = parseFloat(slider.value);
      void deviceMetaRepo.updatePreferences({ volume: vol });
      sfx.setVolume(vol);
      tts.setVolume(vol);
    });

    wrapper.appendChild(labelEl);
    wrapper.appendChild(slider);
    container.appendChild(wrapper);

    this.volumeSliderWrapper = wrapper;
  }

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
        fontFamily: '"Lexend", "Nunito", system-ui, sans-serif',
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
        fontFamily: '"Lexend", "Nunito", system-ui, sans-serif',
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
        fontFamily: '"Lexend", "Nunito", system-ui, sans-serif',
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
        fontFamily: '"Lexend", "Nunito", system-ui, sans-serif',
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
    } catch (err) {
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
    } catch (err) {
      this.showExportStatus('Export failed — please try again.');
    }
  }

  private showExportStatus(msg: string): void {
    this.exportStatusText?.destroy();
    this.exportStatusText = this.add
      .text(CW / 2, 680, msg, {
        fontSize: '16px',
        fontFamily: '"Lexend", "Nunito", system-ui, sans-serif',
        color: '#059669',
      })
      .setOrigin(0.5)
      .setDepth(5);

    this.time.delayedCall(3000, () => {
      this.exportStatusText?.destroy();
      this.exportStatusText = null;
    });
  }

  // ── Restore ────────────────────────────────────────────────────────────────
  private fileInput: HTMLInputElement | null = null;
  private restoreStatusText: Phaser.GameObjects.Text | null = null;

  private _restoreCountdownText: Phaser.GameObjects.Text | null = null;
  private _restoreCancelGraphic: Phaser.GameObjects.Graphics | null = null;
  private _restoreCancelBtnText: Phaser.GameObjects.Text | null = null;
  private _restoreCancelHit: Phaser.GameObjects.Rectangle | null = null;
  private _restoreTimerId: number | null = null;
  private _restoreIntervalId: number | null = null;

  private setupFileInput(): void {
    if (typeof document === 'undefined') return;
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.style.display = 'none';
    input.setAttribute('aria-hidden', 'true');
    input.addEventListener('change', () => {
      const file = input.files?.[0];
      if (file) void this.doRestore(file);
      input.value = '';
    });
    document.body.appendChild(input);
    this.fileInput = input;
  }

  private triggerFilePicker(): void {
    this.fileInput?.click();
  }

  private async doRestore(file?: File): Promise<void> {
    if (!file) return;
    try {
      const result = await restoreFromFile(file);
      this.startRestoreCountdown(result.added);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      if (msg.includes('unsupported schema version')) {
        this.showRestoreStatus('Error: incompatible backup file', true);
      } else if (msg.includes('invalid JSON')) {
        this.showRestoreStatus('Error: not a valid backup file', true);
      } else {
        this.showRestoreStatus('Restore failed — please try again', true);
      }
    }
  }

  private startRestoreCountdown(recordsAdded: number): void {
    this._clearRestoreCountdown();
    this.restoreStatusText?.destroy();
    this.restoreStatusText = null;

    const cx = CW / 2;
    const statusY = 760;
    const cancelY = 810;

    let remaining = 3;

    const countdownText = this.add
      .text(cx, statusY, this._countdownLabel(recordsAdded, remaining), {
        fontSize: '16px',
        fontFamily: '"Lexend", "Nunito", system-ui, sans-serif',
        color: '#059669',
        align: 'center',
      })
      .setOrigin(0.5)
      .setDepth(5);
    this._restoreCountdownText = countdownText;

    const cancelBtnW = 120;
    const cancelBtnH = 36;

    const cancelG = this.add.graphics();
    cancelG.fillStyle(0xe5e7eb, 1);
    cancelG.fillRoundedRect(cx - cancelBtnW / 2, cancelY - cancelBtnH / 2, cancelBtnW, cancelBtnH, 8);
    cancelG.setDepth(4);
    this._restoreCancelGraphic = cancelG;

    const cancelText = this.add
      .text(cx, cancelY, 'Cancel', {
        fontSize: '16px',
        fontFamily: '"Lexend", "Nunito", system-ui, sans-serif',
        fontStyle: 'bold',
        color: '#374151',
      })
      .setOrigin(0.5)
      .setDepth(5);
    this._restoreCancelBtnText = cancelText;

    const cancelHit = this.add
      .rectangle(cx, cancelY, cancelBtnW, cancelBtnH, 0x000000, 0)
      .setInteractive({ useHandCursor: true })
      .setDepth(6);
    this._restoreCancelHit = cancelHit;

    cancelHit.on('pointerup', () => {
      this._clearRestoreCountdown();
      this.showRestoreStatus('Reload cancelled');
    });

    this._restoreIntervalId = window.setInterval(() => {
      remaining -= 1;
      if (remaining > 0) {
        countdownText.setText(this._countdownLabel(recordsAdded, remaining));
      }
    }, 1000);

    this._restoreTimerId = window.setTimeout(() => {
      this._clearRestoreCountdown();
      if (typeof location !== 'undefined') location.reload();
    }, 3000);
  }

  private _countdownLabel(recordsAdded: number, seconds: number): string {
    return `Restored ${recordsAdded} records — reloading in ${seconds}…`;
  }

  private _clearRestoreCountdown(): void {
    if (this._restoreTimerId !== null) {
      window.clearTimeout(this._restoreTimerId);
      this._restoreTimerId = null;
    }
    if (this._restoreIntervalId !== null) {
      window.clearInterval(this._restoreIntervalId);
      this._restoreIntervalId = null;
    }
    this._restoreCountdownText?.destroy();
    this._restoreCountdownText = null;
    this._restoreCancelGraphic?.destroy();
    this._restoreCancelGraphic = null;
    this._restoreCancelBtnText?.destroy();
    this._restoreCancelBtnText = null;
    this._restoreCancelHit?.destroy();
    this._restoreCancelHit = null;
  }

  private showRestoreStatus(msg: string, isError = false): void {
    this.restoreStatusText?.destroy();
    this.restoreStatusText = this.add
      .text(CW / 2, 770, msg, {
        fontSize: '16px',
        fontFamily: '"Lexend", "Nunito", system-ui, sans-serif',
        color: isError ? '#DC2626' : '#059669',
      })
      .setOrigin(0.5)
      .setDepth(5);

    this.time.delayedCall(3000, () => {
      this.restoreStatusText?.destroy();
      this.restoreStatusText = null;
    });
  }

  // ── Privacy link ───────────────────────────────────────────────────────────
  private createPrivacyLink(cx: number, y: number): void {
    const text = this.add
      .text(cx, y, 'Privacy Notice →', {
        fontSize: '16px',
        fontFamily: '"Lexend", "Nunito", system-ui, sans-serif',
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
        fontFamily: '"Lexend", "Nunito", system-ui, sans-serif',
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
        fontFamily: '"Lexend", "Nunito", system-ui, sans-serif',
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
    fadeAndStart(this, 'MenuScene');
  }

  private cleanup(): void {
    if (this._keyHandler && typeof document !== 'undefined') {
      document.removeEventListener('keydown', this._keyHandler);
      this._keyHandler = null;
    }
    this._clearRestoreCountdown();
    this.toggles.forEach((t) => t.destroy());
    this.toggles = [];
    if (this.volumeSliderWrapper) {
      this.volumeSliderWrapper.remove();
      this.volumeSliderWrapper = null;
    }
    PreferenceToggle.destroyAll();
    TestHooks.unmountAll();
    if (this.fileInput) {
      this.fileInput.remove();
      this.fileInput = null;
    }
  }

  shutdown(): void {
    this.cleanup();
  }
}

