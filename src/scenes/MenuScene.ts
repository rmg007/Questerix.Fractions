/**
 * MenuScene — top-level menu.
 * Shows title, Start, Continue (if student exists), Settings placeholder.
 * per runtime-architecture.md §2 (MVP scene inventory)
 * per design-language.md §2 (palette), §3 (Nunito font), §6.2 (no ambient motion)
 */

import * as Phaser from 'phaser';
import { CLR, HEX } from './utils/colors';
import { injectSkipLink, labelCanvas } from '../components/SkipLink';
import { TestHooks } from './utils/TestHooks';

interface MenuData {
  lastStudentId: string | null;
}

// Logical canvas dimensions — per design-language.md §8.2
const CW = 800;
const CH = 1280;

// Button geometry — per design-language.md §5 (primary button min 56×48)
const BTN_W = 360;
const BTN_H = 72;
const BTN_RADIUS = 12;

export class MenuScene extends Phaser.Scene {
  private lastStudentId: string | null = null;

  constructor() {
    super({ key: 'MenuScene' });
  }

  init(data: MenuData): void {
    this.lastStudentId = data.lastStudentId ?? null;
  }

  create(): void {
    // WCAG 2.4.1 — inject skip link and label canvas on first menu render.
    labelCanvas();
    injectSkipLink();

    // ── Test hooks ─────────────────────────────────────────────────────────
    TestHooks.unmountAll();
    TestHooks.mountSentinel('menu-scene');
    // level-card-L1: interactive overlay positioned over the Start button (~y=580)
    TestHooks.mountInteractive('level-card-L1', () => {
      this.scene.start('Level01Scene', { studentId: this.lastStudentId });
    }, { width: '360px', height: '72px', top: '45%', left: '50%' });

    const cx = CW / 2;

    // Background — neutral-0 per design-language.md §2.4
    this.add.rectangle(cx, CH / 2, CW, CH, CLR.neutral0);

    // ── Title ──────────────────────────────────────────────────────────────
    // per design-language.md §3.3 text-2xl = 40px on md+
    this.add.text(cx, 280, 'Questerix\nFractions', {
      fontSize: '48px',
      fontFamily: '"Nunito", system-ui, sans-serif',
      fontStyle: 'bold',
      color: HEX.primary,
      align: 'center',
      lineSpacing: 8,
    }).setOrigin(0.5);

    // Subtitle
    this.add.text(cx, 420, 'Learning halves, one piece at a time', {
      fontSize: '22px',
      fontFamily: '"Nunito", system-ui, sans-serif',
      color: HEX.neutral600,
      align: 'center',
    }).setOrigin(0.5);

    // ── Buttons ────────────────────────────────────────────────────────────

    // "Start" → Level01Scene
    this.createButton(cx, 580, 'Start', CLR.primary, HEX.neutral0, () => {
      this.scene.start('Level01Scene', { studentId: this.lastStudentId });
    });

    // "Continue" — only visible if a returning student exists
    // per runtime-architecture.md §5.4b (resume from lastUsedStudentId)
    if (this.lastStudentId) {
      this.createButton(cx, 680, 'Continue', CLR.successSoft, HEX.success, () => {
        this.scene.start('Level01Scene', { studentId: this.lastStudentId, resume: true });
      });
    }

    // "Settings" — per runtime-architecture.md §2 (SettingsScene overlay)
    this.createButton(cx, this.lastStudentId ? 780 : 680, 'Settings', CLR.neutral100, HEX.neutral600, () => {
      this.scene.launch('SettingsScene');
    });
  }

  /**
   * Creates a rounded-rect button with label.
   * per design-language.md §5 — primary button min 56×48; we use 360×72.
   * per design-language.md §2.1 — primary / neutral fills, no neon.
   */
  private createButton(
    x: number,
    y: number,
    label: string,
    bgColor: number,
    textColor: string,
    onTap: () => void,
  ): void {
    const g = this.add.graphics();

    // Idle state
    const drawIdle = () => {
      g.clear();
      g.fillStyle(bgColor, 1);
      g.fillRoundedRect(x - BTN_W / 2, y - BTN_H / 2, BTN_W, BTN_H, BTN_RADIUS);
    };

    const drawPressed = () => {
      g.clear();
      g.fillStyle(CLR.primaryStrong, 1); // pressed state per design-language.md §2.1
      g.fillRoundedRect(x - BTN_W / 2, y - BTN_H / 2, BTN_W, BTN_H, BTN_RADIUS);
    };

    drawIdle();

    const text = this.add.text(x, y, label, {
      fontSize: '24px',
      fontFamily: '"Nunito", system-ui, sans-serif',
      fontStyle: 'bold',
      color: textColor,
    }).setOrigin(0.5);

    // Hit zone — ≥44×44 per design-language.md §5
    const hitZone = this.add.rectangle(x, y, BTN_W, BTN_H, 0x000000, 0)
      .setInteractive({ useHandCursor: true });

    hitZone.on('pointerdown', () => {
      drawPressed();
    });

    hitZone.on('pointerup', () => {
      drawIdle();
      onTap();
    });

    hitZone.on('pointerout', () => {
      drawIdle();
    });

    // Hover — per design-language.md §1.3 (drop zone tint)
    hitZone.on('pointerover', () => {
      g.clear();
      g.fillStyle(bgColor, 0.85);
      g.fillRoundedRect(x - BTN_W / 2, y - BTN_H / 2, BTN_W, BTN_H, BTN_RADIUS);
    });

    // Depth ordering
    g.setDepth(1);
    text.setDepth(2);
    hitZone.setDepth(3);
  }
}
