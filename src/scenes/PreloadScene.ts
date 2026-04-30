/**
 * PreloadScene — loads minimal assets and shows a themed progress indicator.
 * Transitions to MenuScene after loading completes.
 * per runtime-architecture.md §5 (boot sequence step 3d)
 * per design-language.md §2 (palette), task-25 (adventure theme redesign)
 */

import * as Phaser from 'phaser';
import {
  drawAdventureBackground,
  drawSoftGlow,
  ACTION_FILL,
  ACTION_BORDER,
  TITLE_FONT,
  BODY_FONT,
  NAVY_HEX,
} from './utils/levelTheme';
import { CLR } from './utils/colors';
import { fadeAndStart } from './utils/sceneTransition';

interface PreloadData {
  lastStudentId: string | null;
}

// Logical canvas dimensions — per design-language.md §8.2
const CW = 800;
const CH = 1280;

export class PreloadScene extends Phaser.Scene {
  private progressBar!: Phaser.GameObjects.Rectangle;
  private loadingText!: Phaser.GameObjects.Text;
  private lastStudentId: string | null = null;

  constructor() {
    super({ key: 'PreloadScene' });
  }

  init(data: PreloadData): void {
    this.lastStudentId = data.lastStudentId ?? null;
  }

  preload(): void {
    this.createProgressUI();

    // Wire Phaser load progress events
    this.load.on('progress', (value: number) => {
      this.progressBar.width = CW * 0.6 * value;
      this.loadingText.setText(`Loading… ${Math.floor(value * 100)}%`);
    });

    this.load.on('complete', () => {
      this.loadingText.setText('Ready!');
    });

    // ── Asset loading ──────────────────────────────────────────────────────
    // Fonts are loaded via @font-face in CSS (src/styles/index.css).
    // Shape primitives are procedural — no images needed per design-language.md §7.3.
    this.createPaletteTextures();
  }

  /**
   * Render the adventure-themed loading screen.
   * Sky-blue background, Fredoka One title, amber progress bar, navy status text.
   * per task-25 "Done looks like", levelTheme.ts tokens.
   */
  private createProgressUI(): void {
    const cx = CW / 2;
    const cy = CH / 2;

    // Sky-blue adventure background + ambient glow circles (matching all other scenes)
    drawAdventureBackground(this, CW, CH);

    // Extra warm glow near the title to add visual depth
    drawSoftGlow(this, cx, cy - 80, 220, 0xfcd34d, 0.18);

    // Title — Fredoka One matching MenuScene's style
    this.add
      .text(cx, cy - 180, 'Questerix\nFractions', {
        fontFamily: TITLE_FONT,
        fontSize: '64px',
        color: '#FFFFFF',
        align: 'center',
        lineSpacing: 2,
        stroke: NAVY_HEX,
        strokeThickness: 6,
        shadow: { offsetX: 0, offsetY: 4, color: NAVY_HEX, blur: 0, fill: true },
      })
      .setOrigin(0.5)
      .setDepth(5);

    // Progress bar track — neutral-100
    const trackW = CW * 0.6;
    this.add
      .rectangle(cx, cy, trackW, 18, CLR.neutral100)
      .setOrigin(0.5)
      .setDepth(5);

    // Progress bar fill — amber (ACTION_FILL) to match adventure theme
    this.progressBar = this.add
      .rectangle(cx - trackW / 2, cy, 0, 18, ACTION_FILL)
      .setOrigin(0, 0.5)
      .setDepth(6);

    // Amber border around track for visual definition
    const trackBorderG = this.add.graphics().setDepth(7);
    trackBorderG.lineStyle(2, ACTION_BORDER, 0.5);
    trackBorderG.strokeRect(cx - trackW / 2, cy - 9, trackW, 18);

    // Status text — navy matching level scene body text
    this.loadingText = this.add
      .text(cx, cy + 48, 'Loading…', {
        fontSize: '20px',
        fontFamily: BODY_FONT,
        fontStyle: 'bold',
        color: NAVY_HEX,
      })
      .setOrigin(0.5)
      .setDepth(5);
  }

  /** Create 1×1 Phaser textures for each palette token (used by shapes later). */
  private createPaletteTextures(): void {
    const palette: Record<string, number> = {
      'clr-primary': CLR.primary,
      'clr-success': CLR.success,
      'clr-successSoft': CLR.successSoft,
      'clr-error': CLR.error,
      'clr-neutral100': CLR.neutral100,
      'clr-neutral300': CLR.neutral300,
      'clr-neutral50': CLR.neutral50,
      'clr-accentA': CLR.accentA,
    };

    for (const [key, color] of Object.entries(palette)) {
      if (!this.textures.exists(key)) {
        const g = this.add.graphics();
        g.fillStyle(color, 1);
        g.fillRect(0, 0, 1, 1);
        g.generateTexture(key, 1, 1);
        g.destroy();
      }
    }
  }

  create(): void {
    // Fade in from black as the scene becomes ready
    this.cameras.main.fadeIn(300, 0, 0, 0);

    // Brief pause so "Ready!" is visible, then fade out and start MenuScene
    const reduceMotion = this.checkReduceMotion();
    const delay = reduceMotion ? 0 : 300;

    this.time.delayedCall(delay, () => {
      fadeAndStart(this, 'MenuScene', { lastStudentId: this.lastStudentId });
    });
  }

  private checkReduceMotion(): boolean {
    try {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch {
      return false;
    }
  }
}
