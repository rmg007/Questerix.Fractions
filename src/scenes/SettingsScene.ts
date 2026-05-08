/**
 * SettingsScene — parent-facing settings: preferences, export backup, reset device.
 * per privacy-notice.md (export every byte, reset device)
 * per persistence-spec.md §6 (backupToFile, db.delete)
 * per accessibility.md §3 (keyboard-navigable), §5 (ARIA)
 */

import * as Phaser from 'phaser';
import { CLR, HEX } from './utils/colors';
import {
  BODY_FONT,
  TITLE_FONT,
  NAVY_HEX,
  drawAdventureBackground,
  drawSoftGlow,
} from './utils/levelTheme';
import { TestHooks } from './utils/TestHooks';
import { fadeAndStart } from './utils/sceneTransition';
import { PreferenceToggle } from '../components/PreferenceToggle';
import { attachVersionTapToggle } from './settings/versionTapToggle';
import { updatePreferences } from '../lib/preferences';

import { ResetDeviceHandler } from './settings/ResetDeviceHandler';
import { BackupRestoreHandler } from './settings/BackupRestoreHandler';
import { applyState } from './utils/states';
import { Gesture } from './utils/interaction';
import { A11yLayer } from '../components/A11yLayer';

const CW = 800;
const CH = 1280;

// Full-width button (Back, Reset)
const FULL_W = 500;
const FULL_H = 100;

// Side-by-side pair buttons (Export/Restore, Update/Refresh)
const PAIR_W = 360;
const PAIR_H = 100;
const PAIR_LEFT = 200; // cx of left button in a pair
const PAIR_RIGHT = 600; // cx of right button in a pair

const BTN_RADIUS = 16;

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

    A11yLayer.unmountAll();
    A11yLayer.mountAction(
      'settings-export',
      'Export Backup',
      () => void this.backupHandler.doExport(775)
    );
    A11yLayer.mountAction('settings-restore', 'Restore Backup', () =>
      this.backupHandler.triggerFilePicker()
    );
    A11yLayer.mountAction('settings-reset', 'Reset Device', () =>
      this.resetHandler.handleExternalReset()
    );
    A11yLayer.mountAction(
      'settings-update',
      'Check for Update',
      () => void this.doCheckForAppUpdate()
    );
    A11yLayer.mountAction(
      'settings-refresh-curriculum',
      'Refresh Curriculum',
      () => void this.doRefreshCurriculum()
    );
    A11yLayer.mountAction('settings-privacy', 'Privacy Notice', () => {
      if (typeof window !== 'undefined') window.open('/privacy.html', '_blank', 'noopener');
    });
    A11yLayer.mountAction('settings-back', 'Back', () => this.goBack());

    try {
      if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        this.cameras.main.fadeIn(300, 0, 0, 0);
      }
    } catch {
      /* ignore */
    }

    const cx = CW / 2;

    // ── Adventure background (matches PreloadScene / MenuScene theme) ─────
    drawAdventureBackground(this, CW, CH);
    drawSoftGlow(this, cx, 75, 180, 0xfcd34d, 0.15);

    // ── Title ──────────────────────────────────────────────────────────────
    this.add
      .text(cx, 75, 'Settings', {
        fontFamily: TITLE_FONT,
        fontSize: '64px',
        color: HEX.neutral0,
        stroke: NAVY_HEX,
        strokeThickness: 6,
        shadow: { offsetX: 0, offsetY: 4, color: NAVY_HEX, blur: 0, fill: true },
      })
      .setOrigin(0.5)
      .setDepth(5);

    // ── Viewport helpers for DOM toggle positioning ────────────────────────
    const rect = this.sys.game.canvas.getBoundingClientRect?.();
    const canvasTop = rect?.top ?? 0;
    const canvasLeft = rect?.left ?? 0;
    const scaleY = this.sys.game.canvas.clientHeight / CH;
    const scaleX = this.sys.game.canvas.clientWidth / CW;
    const toViewport = (canvasY: number) => `${canvasTop + canvasY * scaleY}px`;
    const halfCanvas = `${canvasLeft + this.sys.game.canvas.clientWidth / 2}px`;

    // ── Preferences section ────────────────────────────────────────────────
    this.sectionLabel(cx, 160, 'Preferences');

    this.toggles.push(
      new PreferenceToggle(
        { key: 'audio', label: 'Audio Enabled' },
        { top: toViewport(225), left: halfCanvas }
      ),
      new PreferenceToggle(
        { key: 'ttsEnabled', label: 'Read Questions Aloud' },
        { top: toViewport(305), left: halfCanvas }
      ),
      new PreferenceToggle(
        {
          key: 'warmUpsEnabled',
          label: 'Warm-Ups',
          onChange: (value) => {
            void updatePreferences({ warmUpsEnabled: value === true });
          },
        },
        { top: toViewport(385), left: halfCanvas }
      ),
      new PreferenceToggle(
        { key: 'reduceMotion', label: 'Reduced Motion' },
        { top: toViewport(465), left: halfCanvas }
      ),
      new PreferenceToggle(
        {
          key: 'slowMode',
          label: 'Slow Mode',
          onChange: (value) => {
            const enabled = value === true;
            void updatePreferences({ slowMode: enabled });
            this.sys.game.registry.set('slowMode', enabled);
          },
        },
        { top: toViewport(545), left: halfCanvas }
      ),
      new PreferenceToggle(
        { key: 'persistGranted', label: 'Storage Permission', readOnly: true },
        { top: toViewport(625), left: halfCanvas }
      )
    );

    // ── Your Data section ──────────────────────────────────────────────────
    this.sectionLabel(cx, 705, 'Your Data');

    // Export | Restore (pair)
    TestHooks.mountInteractive('settings-export-btn', () => void this.backupHandler.doExport(775), {
      top: toViewport(775),
      left: `${canvasLeft + PAIR_LEFT * scaleX}px`,
      width: `${PAIR_W}px`,
      height: `${PAIR_H}px`,
    });
    this.createButton(
      PAIR_LEFT,
      775,
      'Export Backup',
      CLR.primary,
      HEX.neutral0,
      () => void this.backupHandler.doExport(775),
      PAIR_W,
      PAIR_H
    );

    TestHooks.mountInteractive(
      'settings-restore-btn',
      () => this.backupHandler.triggerFilePicker(),
      {
        top: toViewport(775),
        left: `${canvasLeft + PAIR_RIGHT * scaleX}px`,
        width: `${PAIR_W}px`,
        height: `${PAIR_H}px`,
      }
    );
    this.createButton(
      PAIR_RIGHT,
      775,
      'Restore Backup',
      CLR.primary,
      HEX.neutral0,
      () => this.backupHandler.triggerFilePicker(),
      PAIR_W,
      PAIR_H
    );

    // Reset (full width)
    TestHooks.mountInteractive(
      'settings-reset-btn',
      () => this.resetHandler.handleExternalReset(),
      {
        top: toViewport(875),
        left: `${canvasLeft + cx * scaleX}px`,
        width: `${FULL_W}px`,
        height: `${FULL_H}px`,
      }
    );
    this.resetHandler.create(cx, 875);

    // Update | Refresh (pair)
    TestHooks.mountInteractive('settings-update-btn', () => void this.doCheckForAppUpdate(), {
      top: toViewport(970),
      left: `${canvasLeft + PAIR_LEFT * scaleX}px`,
      width: `${PAIR_W}px`,
      height: `${PAIR_H}px`,
    });
    this.createButton(
      PAIR_LEFT,
      970,
      'Check for Update',
      CLR.primary,
      HEX.neutral0,
      () => void this.doCheckForAppUpdate(),
      PAIR_W,
      PAIR_H
    );

    TestHooks.mountInteractive(
      'settings-refresh-curriculum-btn',
      () => void this.doRefreshCurriculum(),
      {
        top: toViewport(970),
        left: `${canvasLeft + PAIR_RIGHT * scaleX}px`,
        width: `${PAIR_W}px`,
        height: `${PAIR_H}px`,
      }
    );
    this.createButton(
      PAIR_RIGHT,
      970,
      'Refresh Curriculum',
      CLR.primary,
      HEX.neutral0,
      () => void this.doRefreshCurriculum(),
      PAIR_W,
      PAIR_H
    );

    // ── Privacy notice ─────────────────────────────────────────────────────
    this.createPrivacyLink(cx, 1060);

    // ── Back button ────────────────────────────────────────────────────────
    TestHooks.mountInteractive('settings-back-btn', () => this.goBack(), {
      top: toViewport(1145),
      left: `${canvasLeft + cx * scaleX}px`,
      width: `${FULL_W}px`,
      height: `${FULL_H}px`,
    });
    this.createButton(cx, 1145, 'Back', CLR.neutral100, HEX.neutral600, () => this.goBack());

    // ── Version label (triple-tap = researcher unlock-gate bypass; D-1) ────
    attachVersionTapToggle(this, cx, 1230);

    // ── Keyboard navigation ────────────────────────────────────────────────
    if (typeof document !== 'undefined') {
      this._keyHandler = (e: KeyboardEvent) => {
        if (e.key === 'Escape') this.goBack();
      };
      document.addEventListener('keydown', this._keyHandler);
    }

    // Move focus into the scene for keyboard users (WCAG 2.4.3)
    if (typeof document !== 'undefined') {
      requestAnimationFrame(() => {
        const firstAction = document.querySelector(
          '[data-a11y-id="settings-export"]'
        ) as HTMLElement | null;
        firstAction?.focus();
      });
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
    const color = isError ? HEX.error : HEX.success;
    this.statusText = this.add
      .text(CW / 2, y, msg, { fontSize: '26px', fontFamily: BODY_FONT, color })
      .setOrigin(0.5)
      .setDepth(5);
    if (duration) {
      this.time.delayedCall(duration, () => {
        this.statusText?.destroy();
        this.statusText = null;
      });
    }
  }

  private async doRefreshCurriculum(): Promise<void> {
    let cacheCleared = false;
    try {
      if (typeof caches !== 'undefined') {
        cacheCleared = await caches.delete('curriculum-cache');
      }
    } catch (err) {
      console.warn('[SettingsScene] curriculum-cache delete failed:', err);
    }

    this.showStatus(cacheCleared ? 'Refreshing curriculum…' : 'Reloading…', 1095, null);
    this.time.delayedCall(600, () => {
      if (typeof location !== 'undefined') location.reload();
    });
  }

  private updateCheckListener: ((e: Event) => void) | null = null;

  private async doCheckForAppUpdate(): Promise<void> {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
      this.showStatus('Updates not available', 1095);
      return;
    }

    this.showStatus('Checking for updates...', 1095, null);
    let updateFound = false;

    const handleControllerChange = (): void => {
      if (updateFound) return;
      updateFound = true;
      this.showStatus('New version ready — reloading...', 1095, null);
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
        this.showStatus('Up to date', 1095);
      }
    });
  }

  private createPrivacyLink(cx: number, y: number): void {
    this.add
      .text(cx, y, 'Privacy Notice →', {
        fontSize: '28px',
        fontFamily: BODY_FONT,
        color: HEX.accentB,
      })
      .setOrigin(0.5)
      .setDepth(3);

    const HIT_W = 220;
    const HIT_H = 100;
    const hitZone = this.add
      .rectangle(cx, y, HIT_W, HIT_H, 0x000000, 0)
      .setInteractive({ useHandCursor: true })
      .setDepth(4);

    let lastTapAt = 0;
    hitZone.on('pointerdown', () => {
      const now = Date.now();
      if (now - lastTapAt < Gesture.doubleTapWindowMs) return;
      lastTapAt = now;
      applyState(hitZone, 'pressed', this);
    });
    hitZone.on('pointerup', () => {
      this.time.delayedCall(100, () => applyState(hitZone, 'idle', this));
      if (typeof window !== 'undefined') window.open('/privacy.html', '_blank', 'noopener');
    });
    hitZone.on('pointerout', () => applyState(hitZone, 'idle', this));
  }

  private sectionLabel(cx: number, y: number, label: string): void {
    this.add
      .text(cx, y, label, {
        fontSize: '28px',
        fontFamily: BODY_FONT,
        fontStyle: 'bold',
        color: NAVY_HEX,
      })
      .setOrigin(0.5)
      .setDepth(5);
  }

  private createButton(
    x: number,
    y: number,
    label: string,
    bgColor: number,
    textColor: string,
    onTap: () => void,
    w = FULL_W,
    h = FULL_H
  ): void {
    const g = this.add.graphics();
    g.fillStyle(bgColor, 1);
    g.fillRoundedRect(x - w / 2, y - h / 2, w, h, BTN_RADIUS);
    g.setDepth(1);

    this.add
      .text(x, y, label, {
        fontSize: '26px',
        fontFamily: BODY_FONT,
        fontStyle: 'bold',
        color: textColor,
      })
      .setOrigin(0.5)
      .setDepth(2);

    const hitZone = this.add
      .rectangle(x, y, w, h, 0x000000, 0)
      .setInteractive({ useHandCursor: true })
      .setDepth(3);

    let lastTapAt = 0;
    hitZone.on('pointerdown', () => {
      const now = Date.now();
      if (now - lastTapAt < Gesture.doubleTapWindowMs) return;
      lastTapAt = now;
      applyState(hitZone, 'pressed', this);
    });
    hitZone.on('pointerup', () => {
      this.time.delayedCall(100, () => applyState(hitZone, 'idle', this));
      onTap();
    });
    hitZone.on('pointerout', () => applyState(hitZone, 'idle', this));
  }

  private goBack(): void {
    this.cleanup();
    fadeAndStart(this, 'MenuScene');
  }

  private cleanup(): void {
    // Dismiss the Reset confirm modal if it's still open (covers Escape/Back-mid-modal exit).
    this.resetHandler.popModalIfOpen();
    A11yLayer.unmountAll();
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
