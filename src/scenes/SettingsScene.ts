/**
 * SettingsScene — parent-facing settings: preferences, export backup, reset device.
 * per privacy-notice.md (export every byte, reset device)
 * per persistence-spec.md §6 (backupToFile, db.delete)
 * per accessibility.md §3 (keyboard-navigable), §5 (ARIA)
 */

import * as Phaser from 'phaser';
import { CLR, HEX } from './utils/colors';
import { BODY_FONT } from './utils/levelTheme';
import { TestHooks } from './utils/TestHooks';
import { fadeAndStart } from './utils/sceneTransition';
import { PreferenceToggle } from '../components/PreferenceToggle';
import { attachVersionTapToggle } from './settings/versionTapToggle';

import { ResetDeviceHandler } from './settings/ResetDeviceHandler';
import { BackupRestoreHandler } from './settings/BackupRestoreHandler';

const CW = 800;
const CH = 1280;
const BTN_W = 360;
const BTN_H = 60;
const BTN_RADIUS = 10;

export class SettingsScene extends Phaser.Scene {
  private toggles: PreferenceToggle[] = [];
  private resetHandler!: ResetDeviceHandler;
  private backupHandler!: BackupRestoreHandler;
  private statusText: Phaser.GameObjects.Text | null = null;

  constructor() {
    super({ key: 'SettingsScene' });
  }

  create(): void {
    this.resetHandler = new ResetDeviceHandler(this);
    this.backupHandler = new BackupRestoreHandler(this);

    TestHooks.unmountAll();
    TestHooks.mountSentinel('settings-scene');

    // Fade in from black on arrival
    try {
      if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        this.cameras.main.fadeIn(300, 0, 0, 0);
      }
    } catch {
      /* ignore */
    }

    const cx = CW / 2;

    // Background
    this.add.rectangle(cx, CH / 2, CW, CH, CLR.neutral0);

    // Heading
    this.add
      .text(cx, 100, 'Settings', {
        fontSize: '40px',
        fontFamily: BODY_FONT,
        fontStyle: 'bold',
        color: HEX.primary,
      })
      .setOrigin(0.5);

    // ── Section labels ─────────────────────────────────────────────────────
    this.sectionLabel(cx, 190, 'Preferences');
    this.sectionLabel(cx, 560, 'Data');
    this.sectionLabel(cx, 940, 'Privacy');

    // ── Preferences toggles (DOM overlays) ─────────────────────────────────
    const rect = this.sys.game.canvas.getBoundingClientRect?.();
    const canvasTop = rect?.top ?? 0;
    const canvasLeft = rect?.left ?? 0;
    const scaleY = this.sys.game.canvas.clientHeight / CH;
    const toViewport = (canvasY: number) => `${canvasTop + canvasY * scaleY}px`;
    const halfCanvas = `${canvasLeft + this.sys.game.canvas.clientWidth / 2}px`;

    this.toggles.push(
      new PreferenceToggle(
        { key: 'reduceMotion', label: 'Reduced Motion' },
        { top: toViewport(250), left: halfCanvas }
      ),
      new PreferenceToggle(
        { key: 'audio', label: 'Audio Enabled' },
        { top: toViewport(330), left: halfCanvas }
      ),
      new PreferenceToggle(
        { key: 'ttsEnabled', label: 'Read Questions Aloud' },
        { top: toViewport(410), left: halfCanvas }
      ),
      new PreferenceToggle(
        { key: 'persistGranted', label: 'Storage Permission', readOnly: true },
        { top: toViewport(490), left: halfCanvas }
      )
    );

    // ── Export button ──────────────────────────────────────────────────────
    TestHooks.mountInteractive('settings-export-btn', () => void this.backupHandler.doExport(680), {
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
      () => void this.backupHandler.doExport(680)
    );

    // ── Restore button ─────────────────────────────────────────────────────
    TestHooks.mountInteractive(
      'settings-restore-btn',
      () => this.backupHandler.triggerFilePicker(),
      {
        top: toViewport(720),
        left: halfCanvas,
        width: `${BTN_W * (this.sys.game.canvas.clientWidth / CW)}px`,
        height: `${BTN_H * scaleY}px`,
      }
    );
    this.createButton(cx, 720, 'Restore from Backup', CLR.primary, HEX.neutral0, () =>
      this.backupHandler.triggerFilePicker()
    );

    // ── Reset button ───────────────────────────────────────────────────────
    TestHooks.mountInteractive(
      'settings-reset-btn',
      () => this.resetHandler.handleExternalReset(),
      {
        top: toViewport(820),
        left: halfCanvas,
        width: `${BTN_W * (this.sys.game.canvas.clientWidth / CW)}px`,
        height: `${BTN_H * scaleY}px`,
      }
    );
    this.resetHandler.create(cx, 820);

    // ── Check for App Update button (Phase 14) ──────────────────────────────
    // Allows users to explicitly check for and apply app updates.
    TestHooks.mountInteractive('settings-update-btn', () => void this.doCheckForAppUpdate(), {
      top: toViewport(910),
      left: halfCanvas,
      width: `${BTN_W * (this.sys.game.canvas.clientWidth / CW)}px`,
      height: `${BTN_H * scaleY}px`,
    });
    this.createButton(
      cx,
      910,
      'Check for App Update',
      CLR.primary,
      HEX.neutral0,
      () => void this.doCheckForAppUpdate()
    );

    // ── Refresh Curriculum button (Phase 11.1) ─────────────────────────────
    // Sits inside the Data section so a parent can force a curriculum
    // re-download when the pipeline ships new question content. Deletes the
    // service-worker cache (`curriculum-cache` per vite.config.ts) and
    // reloads the page to trigger a fresh fetch.
    TestHooks.mountInteractive(
      'settings-refresh-curriculum-btn',
      () => void this.doRefreshCurriculum(),
      {
        top: toViewport(1000),
        left: halfCanvas,
        width: `${BTN_W * (this.sys.game.canvas.clientWidth / CW)}px`,
        height: `${BTN_H * scaleY}px`,
      }
    );
    this.createButton(
      cx,
      1000,
      'Refresh Curriculum',
      CLR.primary,
      HEX.neutral0,
      () => void this.doRefreshCurriculum()
    );

    // ── Privacy notice ─────────────────────────────────────────────────────
    this.createPrivacyLink(cx, 990);

    // ── Back button ────────────────────────────────────────────────────────
    TestHooks.mountInteractive('settings-back-btn', () => this.goBack(), {
      top: toViewport(1100),
      left: halfCanvas,
      width: `${BTN_W * (this.sys.game.canvas.clientWidth / CW)}px`,
      height: `${BTN_H * scaleY}px`,
    });
    this.createButton(cx, 1100, 'Back', CLR.neutral100, HEX.neutral600, () => this.goBack());

    // ── Version label (triple-tap = researcher unlock-gate bypass; D-1) ────
    attachVersionTapToggle(this, cx, 1200);

    // ── Keyboard navigation ────────────────────────────────────────────────
    if (typeof document !== 'undefined') {
      this._keyHandler = (e: KeyboardEvent) => {
        if (e.key === 'Escape') this.goBack();
      };
      document.addEventListener('keydown', this._keyHandler);
    }
  }

  private _keyHandler: ((e: KeyboardEvent) => void) | null = null;

  private showStatus(
    msg: string,
    y: number,
    duration: number | null = 3000,
    isError = false
  ): void {
    this.statusText?.destroy();
    const color = isError ? '#DC2626' : '#059669';
    this.statusText = this.add
      .text(CW / 2, y, msg, { fontSize: '16px', fontFamily: BODY_FONT, color })
      .setOrigin(0.5)
      .setDepth(5);
    if (duration) {
      this.time.delayedCall(duration, () => {
        this.statusText?.destroy();
        this.statusText = null;
      });
    }
  }

  // ── Refresh Curriculum (Phase 11.1) ────────────────────────────────────────
  private async doRefreshCurriculum(): Promise<void> {
    let cacheCleared = false;
    try {
      if (typeof caches !== 'undefined') {
        cacheCleared = await caches.delete('curriculum-cache');
      }
    } catch (err) {
      console.warn('[SettingsScene] curriculum-cache delete failed:', err);
    }

    this.showStatus(cacheCleared ? 'Refreshing curriculum…' : 'Reloading…', 935, null);
    this.time.delayedCall(600, () => {
      if (typeof location !== 'undefined') location.reload();
    });
  }

  // ── Check for App Update (Phase 14) ────────────────────────────────────────
  private updateCheckListener: ((e: Event) => void) | null = null;

  private async doCheckForAppUpdate(): Promise<void> {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
      this.showStatus('Updates not available', 960);
      return;
    }

    this.showStatus('Checking for updates...', 960, null);
    let updateFound = false;

    const handleControllerChange = (): void => {
      if (updateFound) return;
      updateFound = true;
      this.showStatus('New version ready — reloading...', 960, null);
      this.time.delayedCall(1000, () => {
        if (typeof location !== 'undefined') location.reload();
      });
    };

    this.updateCheckListener = handleControllerChange;
    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);

    try {
      const reg = await navigator.serviceWorker.ready;
      if (reg) await reg.update();
    } catch (err) {
      console.warn('[SettingsScene] update check failed:', err);
    }

    this.time.delayedCall(5000, () => {
      if (!updateFound && this.updateCheckListener) {
        navigator.serviceWorker.removeEventListener('controllerchange', this.updateCheckListener);
        this.updateCheckListener = null;
        this.showStatus('Up to date', 960);
      }
    });
  }

  // ── Privacy link ───────────────────────────────────────────────────────────
  private createPrivacyLink(cx: number, y: number): void {
    const text = this.add
      .text(cx, y, 'Privacy Notice →', {
        fontSize: '16px',
        fontFamily: BODY_FONT,
        color: '#5848D6',
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .setDepth(3);
    text.on('pointerup', () => {
      if (typeof window !== 'undefined') window.open('/privacy.html', '_blank', 'noopener');
    });
  }

  // ── Section label ──────────────────────────────────────────────────────────
  private sectionLabel(cx: number, y: number, label: string): void {
    this.add
      .text(cx, y, label, {
        fontSize: '22px',
        fontFamily: BODY_FONT,
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
        fontFamily: BODY_FONT,
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
    if (
      this.updateCheckListener &&
      typeof navigator !== 'undefined' &&
      'serviceWorker' in navigator
    ) {
      navigator.serviceWorker.removeEventListener('controllerchange', this.updateCheckListener);
      this.updateCheckListener = null;
    }
    this.toggles.forEach((t) => t.destroy());
    this.toggles = [];
    PreferenceToggle.destroyAll();
    TestHooks.unmountAll();
    this.resetHandler.destroy();
    this.backupHandler.destroy();
    this.statusText?.destroy();
  }

  shutdown(): void {
    this.cleanup();
  }
}
