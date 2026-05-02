/**
 * MenuScene — top-level menu rendered with the "Number Line Quest" design.
 *
 * The composition itself enacts the math: a wavy number line travels from 0
 * (Play) at the bottom through ½ (Continue) in the middle to 1 (Settings) at
 * the top. Each station is a chunky kid-friendly button with a fraction
 * badge above it. The dashed white path "marches" toward the destination,
 * previewing the game as a journey from 0 to 1.
 *
 * per runtime-architecture.md §2 (MVP scene inventory)
 * per design-language.md §3 (Lexend body / Fredoka One display), §6.4 (motion)
 *
 * Note: ambient motion (marching dashes, settings-gear spin) is disabled
 * when prefers-reduced-motion is set, satisfying §6.4.
 */

import * as Phaser from 'phaser';
import { injectSkipLink, labelCanvas } from '../components/SkipLink';
import { A11yLayer } from '../components/A11yLayer';
import { TestHooks } from './utils/TestHooks';
import { fadeAndStart } from './utils/sceneTransition';
import { Mascot } from '../components/Mascot';
import { MenuLevelOverlay } from '../components/MenuLevelOverlay';
import { levelProgressionRepo } from '../persistence/repositories/levelProgression';
import { deviceMetaRepo } from '../persistence/repositories/deviceMeta';
import { StudentId } from '../types/branded';
import { BODY_FONT } from './utils/levelTheme';
import { checkReduceMotion } from '../lib/preferences';
import { getStreak } from '../lib/streak';
import { samplePath, drawPath, drawSoftGlow, drawTaglinePill } from './utils/MenuPath';

// Tracks whether the greeting wave has already fired this browser session.
// Module-level so it persists across _closeLevelGrid re-renders and scene returns.
let mascotGreeted = false;

interface MenuData {
  lastStudentId: string | null;
}

// Logical canvas dimensions — per design-language.md §8.2
const CW = 800;
const CH = 1280;

// ── Number Line Quest palette (mockup-approved) ───────────────────────────
const SKY_BG = 0xe0f2fe; // #E0F2FE pale sky
const WHITE = 0xffffff;
const WHITE_HEX = '#FFFFFF';
const NAVY = 0x1e3a8a;
const NAVY_HEX = '#1E3A8A';

const PLAY_FILL = 0xfcd34d; // amber-300
const PLAY_HOVER = 0xf59e0b; // amber-500
const PLAY_BORDER = 0xb45309; // amber-700
const PLAY_TEXT = '#78350F'; // amber-900

const CONT_FILL = 0x34d399; // emerald-400
const CONT_HOVER = 0x10b981; // emerald-500
const CONT_BORDER = 0x064e3b; // emerald-900
const CONT_TEXT = '#FFFFFF';

const SET_FILL = 0x60a5fa; // blue-400
const SET_HOVER = 0x3b82f6; // blue-500
const SET_BORDER = 0x1e3a8a; // blue-900
const SET_TEXT = '#1E3A8A';

const GLOW_EMERALD = 0x6ee7b7; // emerald-300
const GLOW_BLUE = 0x93c5fd; // blue-300

const TITLE_FONT = '"Fredoka One", "Nunito", system-ui, sans-serif';

// Layout: stations sit on a wavy path from bottom (0) to top (1)
const PLAY_Y = 1100;
const CONT_Y = 700;
const SET_Y = 420;
const STATION_X = CW / 2;

interface StationButtonOpts {
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  iconChar?: string;
  fillColor: number;
  hoverColor: number;
  borderColor: number;
  textColor: string;
  fontSize: number;
  shadowOffset: number;
  rounded: boolean; // true = pill, false = circle
  onTap: () => void;
}

export class MenuScene extends Phaser.Scene {
  private lastStudentId: string | null = null;
  private reduceMotion = false;
  private ambientTweens: Phaser.Tweens.Tween[] = [];
  private dashTickHandler: (() => void) | null = null;
  private mascot: Mascot | null = null;
  private levelOverlay: MenuLevelOverlay | null = null;

  constructor() {
    super({ key: 'MenuScene' });
  }

  init(data: MenuData): void {
    this.lastStudentId = data.lastStudentId ?? null;
    this.ambientTweens = [];
    this.dashTickHandler = null;
  }

  async create(): Promise<void> {
    this.reduceMotion = checkReduceMotion();
    this.levelOverlay = new MenuLevelOverlay({
      scene: this,
      getStudentId: () => this.lastStudentId,
      onSelectLevel: (level) => this._startLevel(level),
      onOpenMap: () => fadeAndStart(this, 'LevelMapScene', { studentId: this.lastStudentId }),
    });

    // Fade in from black on arrival (complements the 300ms fade-out on departure)
    if (!this.reduceMotion) {
      this.cameras.main.fadeIn(300, 0, 0, 0);
    }

    // Ensure custom webfonts are decoded before Phaser snapshots glyphs into
    // its texture cache. Without this, the title falls back to a system font
    // for the first frame and stays cached that way.
    void this._renderAfterFontsReady();

    // WCAG 2.4.1 — inject skip link and label canvas on first menu render.
    labelCanvas();
    injectSkipLink();

    // ── Accessibility: real DOM buttons mirror canvas controls (WCAG 4.1.2)
    const unlocked = await this._getUnlockedLevels();
    const currentLevel = Math.max(...Array.from(unlocked));

    A11yLayer.unmountAll();
    A11yLayer.mountAction('a11y-play', 'Open Adventure Map', async () => {
      const isComplete = await deviceMetaRepo.getOnboardingComplete();
      if (!isComplete) {
        fadeAndStart(this, 'OnboardingScene', { studentId: this.lastStudentId });
      } else {
        fadeAndStart(this, 'LevelMapScene', { studentId: this.lastStudentId });
      }
    });
    if (this.lastStudentId) {
      A11yLayer.mountAction('a11y-continue', 'Continue from your last spot', () => {
        this._startLevel(currentLevel, true);
      });
    }
    A11yLayer.mountAction('a11y-settings', 'Open Settings', () => {
      fadeAndStart(this, 'SettingsScene');
    });
    A11yLayer.mountAction('a11y-choose-level', 'Choose a level to play', () => {
      void this.levelOverlay?.open();
    });
    A11yLayer.announce(
      'Welcome to Questerix Fractions. Press Tab to find game controls, or click Play to open the Adventure Map.'
    );

    // ── Test hooks ─────────────────────────────────────────────────────────
    // level-card-L1 mirrors the Play! button which opens the Adventure Map.
    // Tests that need to start a specific level directly can use LevelMapScene's
    // own test hooks or the off-canvas L6/L7 shortcuts below.
    TestHooks.unmountAll();
    TestHooks.mountSentinel('menu-scene');
    // Position test hook over the Play! button location (~86% down).
    TestHooks.mountInteractive(
      'level-card-L1',
      async () => {
        const isComplete = await deviceMetaRepo.getOnboardingComplete();
        if (!isComplete) {
          fadeAndStart(this, 'OnboardingScene', { studentId: this.lastStudentId });
        } else {
          fadeAndStart(this, 'LevelMapScene', { studentId: this.lastStudentId });
        }
      },
      { width: '420px', height: '120px', top: '86%', left: '50%' }
    );
    TestHooks.mountInteractive(
      'level-card-L6',
      () => {
        fadeAndStart(this, 'LevelScene', { levelNumber: 6, studentId: this.lastStudentId });
      },
      { width: '100px', height: '40px', top: '50%', left: '10%' }
    );
    TestHooks.mountInteractive(
      'level-card-L7',
      () => {
        fadeAndStart(this, 'LevelScene', { levelNumber: 7, studentId: this.lastStudentId });
      },
      { width: '100px', height: '40px', top: '55%', left: '10%' }
    );

    // R30: settings-btn testid for E2E testing
    TestHooks.mountInteractive(
      'settings-btn',
      () => {
        fadeAndStart(this, 'SettingsScene');
      },
      { width: '100px', height: '100px', top: '32.8%', left: '50%' }
    );

    // ── Background: pale sky + soft glow circles ──────────────────────────
    this.add.rectangle(CW / 2, CH / 2, CW, CH, SKY_BG).setDepth(0);

    // Decorative soft glows (multi-layer ellipses fake the blur)
    drawSoftGlow(this, 120, CH - 120, 280, GLOW_EMERALD, 0.45);
    drawSoftGlow(this, CW - 80, 480, 320, GLOW_BLUE, 0.45);

    // ── Title ─────────────────────────────────────────────────────────────
    this.add
      .text(CW / 2, 140, 'Questerix\nFractions', {
        fontFamily: TITLE_FONT,
        fontSize: '76px',
        color: WHITE_HEX,
        align: 'center',
        lineSpacing: 2,
        stroke: NAVY_HEX,
        strokeThickness: 7,
        shadow: {
          offsetX: 0,
          offsetY: 5,
          color: NAVY_HEX,
          blur: 0,
          fill: true,
        },
      })
      .setOrigin(0.5)
      .setDepth(20);

    // Tagline pill (rotated slightly like the mockup)
    drawTaglinePill(this, CW / 2, 270, 'A math adventure! 🚀');

    // ── The number line path ──────────────────────────────────────────────
    const pathPts = samplePath({
      stationX: STATION_X,
      playY: PLAY_Y,
      continueY: CONT_Y,
      settingsY: SET_Y,
    });
    this.dashTickHandler = drawPath(this, pathPts, this.reduceMotion);

    // ── Stations ──────────────────────────────────────────────────────────
    const hasContinue = !!this.lastStudentId;

    // Settings — top of the line (icon + word label, no fraction badge —
    // see file header comment + 2026-05-01 menu-pedagogy decision).
    this.createStationButton({
      x: STATION_X,
      y: SET_Y,
      w: 100,
      h: 100,
      label: '',
      iconChar: '⚙',
      fillColor: SET_FILL,
      hoverColor: SET_HOVER,
      borderColor: SET_BORDER,
      textColor: SET_TEXT,
      fontSize: 56,
      shadowOffset: 6,
      rounded: false,
      onTap: () => {
        fadeAndStart(this, 'SettingsScene');
      },
    });
    drawTaglinePill(this, STATION_X, SET_Y + 95, 'Settings', 28, 0.85);

    // Continue — middle of the line (only if returning student).
    if (hasContinue) {
      this.createStationButton({
        x: STATION_X,
        y: CONT_Y,
        w: 360,
        h: 90,
        label: 'Continue',
        iconChar: '📍',
        fillColor: CONT_FILL,
        hoverColor: CONT_HOVER,
        borderColor: CONT_BORDER,
        textColor: CONT_TEXT,
        fontSize: 42,
        shadowOffset: 6,
        rounded: true,
        onTap: () => {
          this._startLevel(currentLevel, true);
        },
      });
    }

    // Play — bottom of the line (always shown).
    this.createStationButton({
      x: STATION_X,
      y: PLAY_Y,
      w: 440,
      h: 110,
      label: 'Play',
      iconChar: '▶',
      fillColor: PLAY_FILL,
      hoverColor: PLAY_HOVER,
      borderColor: PLAY_BORDER,
      textColor: PLAY_TEXT,
      fontSize: 56,
      shadowOffset: 8,
      rounded: true,
      onTap: async () => {
        const isComplete = await deviceMetaRepo.getOnboardingComplete();
        if (!isComplete) {
          fadeAndStart(this, 'OnboardingScene', { studentId: this.lastStudentId });
        } else {
          fadeAndStart(this, 'LevelMapScene', { studentId: this.lastStudentId });
        }
      },
    });

    // T17: Streak pill — async load from DB, render below Play button
    void this.renderStreakDisplay();

    // "Choose Level" pill button — opens the Adventure Map (LevelMapScene)
    // where players can see all levels on a winding path and tap to choose one.
    this.createChooseLevelButton();

    // ── Mascot — friendly guide character ────────────────────────────────────
    // Destroy previous mascot instance (create() is re-called by _closeLevelGrid)
    this.mascot?.destroy();
    this.mascot = new Mascot(this, 680, 980);
    this.mascot.setState('idle');
    // Wave only on the first menu load; skip on _closeLevelGrid re-renders
    if (!mascotGreeted) {
      mascotGreeted = true;
      this.time.delayedCall(400, () => {
        this.mascot?.setState('wave');
      });
    }

    // Stop tweens / handlers on shutdown so we don't leak
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      for (const t of this.ambientTweens) t.stop();
      this.ambientTweens = [];
      if (this.dashTickHandler) {
        this.events.off('update', this.dashTickHandler);
        this.dashTickHandler = null;
      }
      this.levelOverlay?.close();
      this.levelOverlay = null;
    });
  }

  // ── Adventure Map entry button ────────────────────────────────────────────

  /**
   * Tiny pill button that opens the in-scene choose-level overlay.
   * Placed below the Play button so it doesn't compete with primary CTA.
   */
  private createChooseLevelButton(): void {
    const bx = STATION_X;
    const by = PLAY_Y + 90;
    const W = 220,
      H = 48;

    const g = this.add.graphics().setDepth(16);
    g.fillStyle(WHITE, 0.9);
    g.fillRoundedRect(bx - W / 2, by - H / 2, W, H, H / 2);
    g.lineStyle(3, NAVY, 1);
    g.strokeRoundedRect(bx - W / 2, by - H / 2, W, H, H / 2);

    this.add
      .text(bx, by, '🗺 Choose Level', {
        fontFamily: BODY_FONT,
        fontStyle: 'bold',
        fontSize: '22px',
        color: NAVY_HEX,
      })
      .setOrigin(0.5)
      .setDepth(17);

    this.add
      .rectangle(bx, by, W, H, 0, 0)
      .setInteractive({ useHandCursor: true })
      .setDepth(18)
      .on('pointerup', () => void this.levelOverlay?.open());
  }

  /**
   * T17: Load the daily streak from the DB and render a flame pill badge
   * in the top-right corner. Uses amber background with white text.
   */
  private async renderStreakDisplay(): Promise<void> {
    const streak = await getStreak(this.lastStudentId);
    if (streak <= 0) return;

    const label = `🔥 ${streak}`;
    const PILL_H = 40;
    const PILL_PAD = 16;

    // Measure text width
    const probe = this.add
      .text(0, 0, label, { fontFamily: BODY_FONT, fontSize: '18px' })
      .setAlpha(0);
    const tw = probe.width + PILL_PAD * 2;
    probe.destroy();

    const px = CW - 16 - tw / 2;
    const py = 36;

    const bg = this.add.graphics().setDepth(25);
    bg.fillStyle(0xf59e0b, 1); // amber-400
    bg.fillRoundedRect(px - tw / 2, py - PILL_H / 2, tw, PILL_H, PILL_H / 2);

    this.add
      .text(px, py, label, {
        fontFamily: BODY_FONT,
        fontSize: '18px',
        color: '#FFFFFF',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setDepth(26);
  }

  /** Read unlocked levels from IndexedDB. */
  private async _getUnlockedLevels(): Promise<Set<number>> {
    if (!this.lastStudentId) {
      return new Set([1]); // Level 1 always unlocked
    }
    try {
      return await levelProgressionRepo.getUnlockedLevels(StudentId(this.lastStudentId));
    } catch {
      // Ignore storage errors — default to level 1 only
      return new Set([1]);
    }
  }

  /** Persist that a level was completed so the next one unlocks. */
  /** Helper to route to Level01 (hardcoded archetype) or LevelScene (generic). */
  private _startLevel(levelNumber: number, resume = false): void {
    const data = { levelNumber, studentId: this.lastStudentId, resume };
    if (levelNumber === 1) {
      fadeAndStart(this, 'Level01Scene', data);
    } else {
      fadeAndStart(this, 'LevelScene', data);
    }
  }

  static async markLevelComplete(levelNumber: number, studentId: string | null): Promise<void> {
    if (!studentId) return; // No-op for non-logged-in students
    try {
      await levelProgressionRepo.complete(StudentId(studentId), levelNumber);
    } catch (err) {
      // Ignore storage errors — caller will retry on next session
    }
  }

  /**
   * A station on the number line — either a pill (Play, Continue) or a
   * circle (Settings). All buttons share the same chunky 3D-shadow look
   * with hover/press states.
   */
  private createStationButton(opts: StationButtonOpts): void {
    const { x, y, w, h, fillColor, hoverColor, borderColor, textColor, shadowOffset, rounded } =
      opts;

    const container = this.add.container(x, y).setDepth(15);
    const radius = rounded ? h / 2 : Math.min(w, h) / 2;
    const half = { w: w / 2, h: h / 2 };

    const draw = (color: number, dy: number) => {
      face.clear();
      // Shadow stays put; we move the face down on press
      face.fillStyle(color, 1);
      if (rounded) {
        face.fillRoundedRect(-half.w, -half.h + dy, w, h, radius);
      } else {
        face.fillCircle(0, dy, radius);
      }
      face.lineStyle(5, borderColor, 1);
      if (rounded) {
        face.strokeRoundedRect(-half.w, -half.h + dy, w, h, radius);
      } else {
        face.strokeCircle(0, dy, radius);
      }
    };

    // Shadow layer (behind, doesn't move)
    const shadow = this.add.graphics();
    shadow.fillStyle(borderColor, 1);
    if (rounded) {
      shadow.fillRoundedRect(-half.w, -half.h + shadowOffset, w, h, radius);
    } else {
      shadow.fillCircle(0, shadowOffset, radius);
    }
    container.add(shadow);

    const face = this.add.graphics();
    container.add(face);
    draw(fillColor, 0);

    // Icon + label as a single text (icon on left)
    const display = opts.iconChar
      ? opts.label
        ? `${opts.iconChar}  ${opts.label}`
        : opts.iconChar
      : opts.label;
    const txt = this.add
      .text(0, 0, display, {
        fontFamily: TITLE_FONT,
        fontSize: `${opts.fontSize}px`,
        color: textColor,
      })
      .setOrigin(0.5);
    container.add(txt);

    // Hit area covers the full button
    container.setSize(w, h + shadowOffset);
    container.setInteractive(
      new Phaser.Geom.Rectangle(-half.w, -half.h, w, h + shadowOffset),
      Phaser.Geom.Rectangle.Contains
    );
    container.input!.cursor = 'pointer';

    let isHovering = false;
    let isPressed = false;
    const update = () => {
      const dy = isPressed ? shadowOffset : 0;
      const color = isHovering ? hoverColor : fillColor;
      draw(color, dy);
      txt.setY(dy);
    };

    container.on('pointerover', () => {
      isHovering = true;
      update();
    });
    container.on('pointerout', () => {
      isHovering = false;
      isPressed = false;
      update();
    });
    container.on('pointerdown', () => {
      isPressed = true;
      update();
    });
    container.on('pointerup', () => {
      isPressed = false;
      update();
      opts.onTap();
    });
  }

  /**
   * Phaser caches text glyph textures on first paint. If our custom display
   * font (Fredoka One) hasn't loaded yet, the title bakes in a fallback font
   * forever. After document.fonts becomes ready we walk all Text objects in
   * the scene and force a restyle so they re-rasterize with the right font.
   */
  private async _renderAfterFontsReady(): Promise<void> {
    try {
      const fonts = (document as Document).fonts;
      if (!fonts) return;
      await Promise.all([
        fonts.load('700 88px "Fredoka One"'),
        fonts.load('700 30px "Nunito"'),
        fonts.load('400 30px "Nunito"'),
      ]).catch(() => undefined);
      await fonts.ready;
      this.children.list.forEach((obj) => {
        const recurse = (o: Phaser.GameObjects.GameObject) => {
          if (o instanceof Phaser.GameObjects.Text) {
            o.setStyle(o.style.toJSON());
          } else if (o instanceof Phaser.GameObjects.Container) {
            o.list.forEach(recurse);
          }
        };
        recurse(obj);
      });
    } catch (err) {
      // ignore — fallback font will display
    }
  }
}
