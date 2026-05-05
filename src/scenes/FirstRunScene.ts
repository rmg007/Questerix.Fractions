/**
 * FirstRunScene — new-device welcome flow.
 *
 * Shown when:
 *   - No student profiles exist AND no lastUsedStudentId in localStorage, OR
 *   - Profiles exist but lastUsedStudentId was cleared (deleted student).
 *
 * Presents a mascot greeting, a name input, and a "Skip / just play" shortcut
 * that creates a default-named "Player 1" profile. On completion routes to
 * OnboardingScene so new users get the full intro flow.
 *
 * per multi-student-and-first-run plan §Phase 2
 * per C1 — no external HTTP, no accounts
 * per C5 — only allowed localStorage key is lastUsedStudentId
 * per WCAG 2.1 AA — A11yLayer registered, reduced-motion-safe entrance
 */

import * as Phaser from 'phaser';
import { A11yLayer } from '../components/A11yLayer';
import { Mascot } from '../components/Mascot';
import { TestHooks } from './utils/TestHooks';
import { fadeAndStart } from './utils/sceneTransition';
import { studentRepo } from '../persistence/repositories/studentRepo';
import { checkReduceMotion } from '../lib/preferences';
import { tween, Duration, Ease } from './utils/motion';
import { Gesture } from './utils/interaction';
import { applyState } from './utils/states';
import { BODY_FONT } from './utils/levelTheme';

const LAST_STUDENT_KEY = 'questerix.lastUsedStudentId';

const CW = 800;
const CH = 1280;

export class FirstRunScene extends Phaser.Scene {
  private mascot: Mascot | null = null;
  private _inputEl: HTMLInputElement | null = null;
  private _inputContainer: HTMLDivElement | null = null;
  private reduceMotion = false;

  constructor() {
    super({ key: 'FirstRunScene' });
  }

  create(): void {
    this.reduceMotion = checkReduceMotion();

    TestHooks.unmountAll();
    TestHooks.mountSentinel('first-run-scene');

    // Fade in from black
    if (!this.reduceMotion) {
      this.cameras.main.fadeIn(300, 0, 0, 0);
    }

    // A11y layer
    A11yLayer.unmountAll();
    A11yLayer.pushLayer('first-run', 'Welcome — create your profile');
    this.events.once('shutdown', () => A11yLayer.popLayer());

    // ── Background ────────────────────────────────────────────────────────
    this.add.rectangle(CW / 2, CH / 2, CW, CH, 0x1e3a8a);

    // ── Stars decoration (simple procedural) ──────────────────────────────
    const g = this.add.graphics();
    g.fillStyle(0xffffff, 0.6);
    for (let i = 0; i < 30; i++) {
      const sx = Phaser.Math.Between(20, CW - 20);
      const sy = Phaser.Math.Between(20, 400);
      const sr = Phaser.Math.Between(2, 5);
      g.fillCircle(sx, sy, sr);
    }

    // ── Mascot ────────────────────────────────────────────────────────────
    this.mascot = new Mascot(this, CW / 2, 360);
    this.add.existing(this.mascot);
    this.mascot.setState('idle');

    // Entrance tween — slides up from below if motion is on
    if (!this.reduceMotion) {
      this.mascot.setY(500);
      this.mascot.setAlpha(0);
      tween(this, this.mascot, { y: 360, alpha: 1 }, { duration: Duration.long, ease: Ease.out });
    }

    // Wave after arriving
    this.time.delayedCall(this.reduceMotion ? 100 : 500, () => {
      this.mascot?.setState('wave');
    });

    // ── Copy ──────────────────────────────────────────────────────────────
    this.add
      .text(CW / 2, 580, "Hi! I'm your guide.\nWhat's your name?", {
        fontFamily: BODY_FONT,
        fontSize: '40px',
        color: '#ffffff',
        align: 'center',
        lineSpacing: 8,
      })
      .setOrigin(0.5);

    // ── DOM name input ────────────────────────────────────────────────────
    // Phaser can't do text input natively; we overlay a real <input>.
    this._mountInput();

    // ── Start button (canvas affordance) ──────────────────────────────────
    this._createStartButton();

    // ── Skip button ────────────────────────────────────────────────────────
    this._createSkipButton();

    // ── A11y actions ──────────────────────────────────────────────────────
    A11yLayer.mountAction('first-run-start', "Let's go!", () => {
      void this._handleStart();
    });
    A11yLayer.mountAction('first-run-skip', 'Skip and just play', () => {
      void this._handleSkip();
    });

    // ── Test hooks ────────────────────────────────────────────────────────
    TestHooks.mountInteractive('first-run-start-btn', () => void this._handleStart(), {
      width: '360px',
      height: '100px',
      top: '75%',
      left: '50%',
    });
    TestHooks.mountInteractive('first-run-skip-btn', () => void this._handleSkip(), {
      width: '260px',
      height: '80px',
      top: '87%',
      left: '50%',
    });
  }

  // ── DOM input ──────────────────────────────────────────────────────────────

  private _mountInput(): void {
    if (typeof document === 'undefined') return;

    const canvas = this.sys.game.canvas;
    const rect = canvas.getBoundingClientRect();
    const scaleY = canvas.clientHeight / CH;
    const scaleX = canvas.clientWidth / CW;

    const container = document.createElement('div');
    container.style.cssText = [
      'position:fixed',
      `top:${rect.top + 680 * scaleY}px`,
      `left:${rect.left + (CW / 2 - 200) * scaleX}px`,
      `width:${400 * scaleX}px`,
      `height:${80 * scaleY}px`,
      'z-index:20000',
      'display:flex',
      'align-items:center',
    ].join(';');

    const input = document.createElement('input');
    input.type = 'text';
    input.maxLength = 20;
    input.placeholder = 'Your name…';
    input.setAttribute('aria-label', 'Enter your name');
    input.style.cssText = [
      'width:100%',
      `height:${80 * scaleY}px`,
      `font-size:${28 * scaleY}px`,
      'padding:0 16px',
      'border:4px solid #60a5fa',
      'border-radius:16px',
      'background:#ffffff',
      'color:#1e3a8a',
      'font-family:Nunito,system-ui,sans-serif',
      'font-weight:bold',
      'outline:none',
      'box-sizing:border-box',
    ].join(';');

    container.appendChild(input);
    document.body.appendChild(container);

    this._inputEl = input;
    this._inputContainer = container;

    // Allow pressing Enter to start
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') void this._handleStart();
    });

    // Auto-focus with slight delay for mobile keyboard
    this.time.delayedCall(400, () => input.focus());
  }

  private _unmountInput(): void {
    this._inputEl = null;
    this._inputContainer?.remove();
    this._inputContainer = null;
  }

  // ── Canvas buttons ────────────────────────────────────────────────────────

  private _createStartButton(): void {
    const cx = CW / 2;
    const y = 920;
    const w = 360;
    const h = 100;

    const g = this.add.graphics();
    g.fillStyle(0xf59e0b, 1);
    g.fillRoundedRect(cx - w / 2, y - h / 2, w, h, 20);
    g.setDepth(1);

    this.add
      .text(cx, y, "Let's go! ▶", {
        fontFamily: BODY_FONT,
        fontSize: '36px',
        fontStyle: 'bold',
        color: '#78350f',
      })
      .setOrigin(0.5)
      .setDepth(2);

    const hit = this.add
      .rectangle(cx, y, w, h, 0x000000, 0)
      .setInteractive({ useHandCursor: true })
      .setDepth(3);
    hit.on('pointerup', () => void this._handleStart());
  }

  private _createSkipButton(): void {
    const cx = CW / 2;
    const y = 1060;
    const w = 260;
    // Raised from 80 → 100 canvas px so CSS touch target ≥ 44 px at 360 vp (WCAG 2.5.5).
    const h = 100;

    this.add
      .text(cx, y, 'No thanks, just play', {
        fontFamily: BODY_FONT,
        fontSize: '24px',
        color: '#bfdbfe',
        align: 'center',
      })
      .setOrigin(0.5)
      .setDepth(2);

    const hit = this.add
      .rectangle(cx, y, w, h, 0x000000, 0)
      .setInteractive({ useHandCursor: true })
      .setDepth(3);

    let lastTapAt = 0;
    hit.on('pointerdown', () => {
      const now = Date.now();
      if (now - lastTapAt < Gesture.doubleTapWindowMs) return;
      lastTapAt = now;
      applyState(hit, 'pressed', this);
    });
    hit.on('pointerup', () => {
      this.time.delayedCall(100, () => applyState(hit, 'idle', this));
      void this._handleSkip();
    });
    hit.on('pointerout', () => applyState(hit, 'idle', this));
  }

  // ── Actions ────────────────────────────────────────────────────────────────

  private async _handleStart(): Promise<void> {
    const name = this._inputEl?.value?.trim() || '';
    await this._createAndContinue(name || 'Player 1');
  }

  private async _handleSkip(): Promise<void> {
    await this._createAndContinue('Player 1');
  }

  private async _createAndContinue(displayName: string): Promise<void> {
    this._unmountInput();

    const result = await studentRepo.create({ displayName });
    if (!result.ok) {
      // Shouldn't happen on first run, but handle gracefully
      console.warn('[FirstRunScene] create failed:', result.reason);
      // Fall back to PreloadScene without a student
      fadeAndStart(this, 'PreloadScene', { lastStudentId: null });
      return;
    }

    const student = result.value;
    try {
      localStorage.setItem(LAST_STUDENT_KEY, student.id);
    } catch {
      // localStorage unavailable — continue in volatile mode
    }

    fadeAndStart(this, 'OnboardingScene', { studentId: student.id });
  }

  // ── Cleanup ────────────────────────────────────────────────────────────────

  shutdown(): void {
    this._unmountInput();
    this.mascot?.destroy();
    this.mascot = null;
    TestHooks.unmountAll();
  }
}
