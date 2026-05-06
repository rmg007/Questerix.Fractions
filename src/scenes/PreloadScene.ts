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
import { Mascot } from '../components/Mascot';
import { checkReduceMotion } from '../lib/preferences';
import { sfx } from '../audio';
import { RecoveryBus } from '../lib/recovery/recoveryBus';
import {
  loaderEvents,
  getLastCurriculumLoadFailure,
  clearLastCurriculumLoadFailure,
} from '../curriculum/loader';
import { A11yLayer } from '../components/A11yLayer';

interface PreloadData {
  lastStudentId: string | null;
}

/** Maximum asset-load retry attempts before routing to RecoveryScene. */
const MAX_LOAD_RETRIES = 3;

/** Exponential backoff delays in ms: 1s, 2s, 4s */
const RETRY_DELAYS = [1000, 2000, 4000];

// Logical canvas dimensions — per design-language.md §8.2
const CW = 800;
const CH = 1280;

export class PreloadScene extends Phaser.Scene {
  private progressBar!: Phaser.GameObjects.Rectangle;
  private loadingText!: Phaser.GameObjects.Text;
  private loadingDotsEvent?: Phaser.Time.TimerEvent;
  private timeoutEvent5s?: Phaser.Time.TimerEvent;
  private timeoutEvent12s?: Phaser.Time.TimerEvent;
  private announcedThresholds = new Set<number>();
  private lastStudentId: string | null = null;
  /** Count of asset-load errors encountered in the current load batch. */
  private loadErrorCount = 0;
  /** Retry attempt index (0-based). */
  private retryCount = 0;

  constructor() {
    super({ key: 'PreloadScene' });
  }

  init(data: PreloadData): void {
    this.lastStudentId = data.lastStudentId ?? null;
  }

  preload(): void {
    this.createProgressUI();

    // ── Load error handler with exponential-backoff retry ─────────────────
    // Distinguishes critical assets (those with 'curriculum' or 'v1.json' in
    // their URL) from cosmetic assets. After MAX_LOAD_RETRIES failures, routes
    // to RecoveryScene. Non-critical failures warn and continue.
    this.load.on('loaderror', (file: Phaser.Loader.File) => {
      const fileUrl = typeof file.url === 'string' ? file.url : '';
      const isCurriculumFile = fileUrl.includes('curriculum') || fileUrl.includes('v1.json');

      if (isCurriculumFile) {
        this.loadErrorCount++;
        console.warn(
          `[PreloadScene] Curriculum load error (attempt ${this.retryCount + 1}): ${fileUrl}`
        );
        if (this.retryCount < MAX_LOAD_RETRIES) {
          const delay = RETRY_DELAYS[this.retryCount] ?? 4000;
          this.retryCount++;
          console.info(`[PreloadScene] Retrying curriculum load in ${delay}ms…`);
          // Re-queue the same file by key + url via Phaser's typed loader methods.
          // We use 'json' since curriculum bundle is a JSON file.
          const fileKey = file.key as string;
          this.time.delayedCall(delay, () => {
            this.load.json(fileKey, fileUrl);
            this.load.start();
          });
        } else {
          const error = new Error(
            `Curriculum load failed after ${MAX_LOAD_RETRIES} retries: ${fileUrl}`
          );
          RecoveryBus.report({ kind: 'curriculum-fail', error, scene: 'PreloadScene' });
          this.scene.start('RecoveryScene', {
            kind: 'curriculum-fail',
            error,
            scene: 'PreloadScene',
            curriculumFail: true,
          });
        }
      } else {
        // Cosmetic asset failure — warn and continue, do not block game start
        console.warn(`[PreloadScene] Non-critical asset load error (ignoring): ${fileUrl}`);
      }
    });

    // Wire Phaser load progress events
    this.load.on('progress', (value: number) => {
      this.progressBar.width = CW * 0.6 * value;

      // Update fraction tiles in splash screen as loader progresses
      const tiles = document.querySelectorAll('#fraction-tiles svg');
      tiles.forEach((tile, index) => {
        // Tile appears at: 0 → 33% (first), 33% → 66% (second), 66% → 100% (third)
        const threshold = (index + 1) / tiles.length;
        (tile as HTMLElement).style.opacity = value >= threshold ? '1' : '0';
      });

      // A11y: announce at 25%, 50%, 75%, 100% milestones (once each)
      for (const pct of [25, 50, 75, 100]) {
        if (value * 100 >= pct && !this.announcedThresholds.has(pct)) {
          this.announcedThresholds.add(pct);
          A11yLayer.announce(`Loading ${pct}%`);
        }
      }
    });

    this.load.on('complete', () => {
      if (this.loadingDotsEvent) {
        this.loadingDotsEvent.destroy();
      }
      this.timeoutEvent5s?.destroy();
      this.timeoutEvent12s?.destroy();
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
    this.add.rectangle(cx, cy, trackW, 18, CLR.neutral100).setOrigin(0.5).setDepth(5);

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
      .text(cx, cy + 48, 'Loading', {
        fontSize: '32px',
        fontFamily: BODY_FONT,
        fontStyle: 'bold',
        color: NAVY_HEX,
      })
      .setOrigin(0.5)
      .setDepth(5);

    // Animate loading dots — cycle through "", ".", "..", "..."
    let dotCount = 0;
    this.loadingDotsEvent = this.time.addEvent({
      delay: 500,
      loop: true,
      callback: () => {
        dotCount = (dotCount + 1) % 4;
        const dots = '.'.repeat(dotCount);
        // We only update if we aren't showing the percentage from the progress listener,
        // or we could append it. The task says cycle "Loading", "Loading.", etc.
        // The progress listener also updates this text.
        // Let's make it consistent.
        this.updateLoadingText(dots);
      },
    });

    // Timeout UX: reassure the player if loading stalls
    this.timeoutEvent5s = this.time.delayedCall(5000, () => {
      if (this.load.progress < 1) {
        this.loadingText.setText('Still working…');
        A11yLayer.announce('Still loading, please wait');
      }
    });

    this.timeoutEvent12s = this.time.delayedCall(12000, () => {
      if (this.load.progress < 1) {
        this.loadingText.setText('This is taking longer than usual…\nTap to retry');
        A11yLayer.announce('Loading is taking longer than usual. Tap the screen to retry.');
        this.input.once('pointerdown', () => {
          this.scene.restart();
        });
      }
    });

    // Mascot — static during preload (idle timer and DOM sentinel are unsafe in preload context)
    new Mascot(this, cx + 220, cy - 160, 0.75);
  }

  private updateLoadingText(dots: string): void {
    const progress = this.load.progress;
    const percent = Math.floor(progress * 100);
    if (progress >= 1) {
      this.loadingText.setText('Ready!');
    } else {
      this.loadingText.setText(`Loading${dots} ${percent}%`);
    }
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
    const preloadCreateStart = performance.now();
    sfx.preload();

    // ── Phase 4: Check for boot-time curriculum failure ───────────────────
    // The curriculum loader fires before this scene exists. Poll the cached
    // failure slot and react if the boot-time load (via BootScene.seedIfEmpty)
    // failed and the bundled fallback was also unusable.
    const bootFailure = getLastCurriculumLoadFailure();
    if (bootFailure) {
      clearLastCurriculumLoadFailure();
      const error = new Error(`Curriculum load failed at boot: ${bootFailure.message}`);
      RecoveryBus.report({ kind: 'curriculum-fail', error, scene: 'PreloadScene' });
      this.scene.start('RecoveryScene', {
        kind: 'curriculum-fail',
        error,
        scene: 'PreloadScene',
        curriculumFail: true,
      });
      return;
    }

    // Subscribe to future curriculum failures surfaced by the loader during this scene's lifetime
    const onCurriculumFail = (ev: Event) => {
      const detail = (ev as CustomEvent).detail as { message: string };
      const error = new Error(`Curriculum schema failure: ${detail?.message ?? 'unknown'}`);
      RecoveryBus.report({ kind: 'curriculum-fail', error, scene: 'PreloadScene' });
      this.scene.start('RecoveryScene', {
        kind: 'curriculum-fail',
        error,
        scene: 'PreloadScene',
        curriculumFail: true,
      });
    };
    loaderEvents.addEventListener('curriculumLoadFailed', onCurriculumFail);
    this.events.once('shutdown', () => {
      loaderEvents.removeEventListener('curriculumLoadFailed', onCurriculumFail);
    });

    // Fade in from black as the scene becomes ready
    this.cameras.main.fadeIn(300, 0, 0, 0);

    // Brief pause so "Ready!" is visible, then fade out and start MenuScene
    const reduceMotion = checkReduceMotion();
    const delay = reduceMotion ? 0 : 300;

    console.info(
      `[PreloadScene] Create complete in ${Math.round(performance.now() - preloadCreateStart)}ms, transitioning to MenuScene in ${delay}ms`
    );

    this.time.delayedCall(delay, () => {
      fadeAndStart(this, 'MenuScene', { lastStudentId: this.lastStudentId });
    });
  }
}
