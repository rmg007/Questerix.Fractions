/**
 * PreloadScene — loads minimal assets and shows a progress indicator.
 * Transitions to MenuScene after loading completes.
 * per runtime-architecture.md §5 (boot sequence step 3d)
 * per design-language.md §2 (palette colors for loader)
 */

import * as Phaser from 'phaser';
import { CLR, HEX } from './utils/colors';

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
    // No audio assets in first pass per task spec ("no audio yet").
    // Fonts are loaded via @font-face in CSS (src/styles/index.css).
    // Shape primitives are procedural — no images needed per design-language.md §7.3.

    // Placeholder: palette swatch texture (1×1 colored pixel atlas)
    // In production this would load icon sprites, TTS audio, etc.
    // We create minimal programmatic textures to satisfy Phaser's asset pipeline.
    this.createPaletteTextures();
  }

  /** Render a simple Phaser progress bar using palette colors. per design-language.md §2 */
  private createProgressUI(): void {
    const cx = CW / 2;
    const cy = CH / 2;

    // Background
    this.add.rectangle(cx, cy, CW, CH, CLR.neutral0);

    // Title
    this.add
      .text(cx, cy - 120, 'Questerix Fractions', {
        fontSize: '40px',
        fontFamily: '"Nunito", system-ui, sans-serif',
        fontStyle: 'bold',
        color: HEX.neutral900,
      })
      .setOrigin(0.5);

    // Track — per design-language.md §2.4 neutral-100
    const trackW = CW * 0.6;
    this.add.rectangle(cx, cy, trackW, 16, CLR.neutral100).setOrigin(0.5);

    // Fill — per design-language.md §2.1 primary
    this.progressBar = this.add
      .rectangle(cx - trackW / 2, cy, 0, 16, CLR.primary)
      .setOrigin(0, 0.5);

    // Status text
    this.loadingText = this.add
      .text(cx, cy + 40, 'Loading…', {
        fontSize: '18px',
        fontFamily: '"Nunito", system-ui, sans-serif',
        color: HEX.neutral600,
      })
      .setOrigin(0.5);
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
    // Brief pause so "Ready!" is visible before transition
    const reduceMotion = this.checkReduceMotion();
    const delay = reduceMotion ? 0 : 200;

    this.time.delayedCall(delay, () => {
      // per runtime-architecture.md §5 — pass lastStudentId through to MenuScene
      this.scene.start('MenuScene', { lastStudentId: this.lastStudentId });
    });
  }

  private checkReduceMotion(): boolean {
    try {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch (err) {
      return false;
    }
  }
}

