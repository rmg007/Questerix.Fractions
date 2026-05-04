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
import { LevelCard } from '../components/LevelCard';
import { LEVEL_META } from './utils/levelMeta';
import { skillMasteryRepo } from '../persistence/repositories/skillMastery';
import { levelProgressionRepo } from '../persistence/repositories/levelProgression';
import { deviceMetaRepo } from '../persistence/repositories/deviceMeta';
import { StudentId } from '../types/branded';
import { BODY_FONT } from './utils/levelTheme';
import { checkReduceMotion } from '../lib/preferences';
import { getStreak } from '../lib/streak';
import { get } from '../lib/i18n/catalog';
import {
  CW,
  CH,
  PLAY_Y,
  CONT_Y,
  SET_Y,
  STATION_X,
  SKY_BG,
  PATH_BLUE,
  WHITE,
  NAVY,
  PLAY_FILL,
  PLAY_HOVER,
  CONT_FILL,
  CONT_HOVER,
  SET_FILL,
  SET_HOVER,
  GLOW_EMERALD,
  GLOW_BLUE,
  samplePath,
} from './utils/menuLayoutHelpers';
import { createStationButton, drawTaglinePill } from './utils/menuButtonHelpers';

// Tracks whether the greeting wave has already fired this browser session.
// Module-level so it persists across _closeLevelGrid re-renders and scene returns.
let mascotGreeted = false;

interface MenuData {
  lastStudentId: string | null;
}

// ── Color constants (imported from menuLayoutHelpers)
const WHITE_HEX = '#FFFFFF';
const NAVY_HEX = '#1E3A8A';

const PLAY_BORDER = 0xb45309; // amber-700
const PLAY_TEXT = '#78350F'; // amber-900

const CONT_BORDER = 0x064e3b; // emerald-900
const CONT_TEXT = '#FFFFFF';

const SET_BORDER = 0x1e3a8a; // blue-900
const SET_TEXT = '#1E3A8A';

const TITLE_FONT = '"Fredoka One", "Nunito", system-ui, sans-serif';

// ── Choose-level overlay ───────────────────────────────────────────────────
const OVERLAY_CARD_SCALE = 0.8;
const OVERLAY_DEPTH = 50;
const OVERLAY_MASTERY_THRESHOLD = 0.8; // PLAN.md Phase 2d — gold star at masteryEstimate >= 0.8
// Skill ID mapping mirrors LevelMapScene — Level 1 uses a named skill.
function menuSkillIdForLevel(level: number): string {
  if (level === 1) return 'skill.partition_halves';
  return `skill.level_${level}`;
}

export class MenuScene extends Phaser.Scene {
  private lastStudentId: string | null = null;
  private reduceMotion = false;
  private ambientTweens: Phaser.Tweens.Tween[] = [];
  private dashTickHandler: (() => void) | null = null;
  private mascot: Mascot | null = null;
  private _overlayObjects: Phaser.GameObjects.GameObject[] = [];

  constructor() {
    super({ key: 'MenuScene' });
  }

  init(data: MenuData): void {
    this.lastStudentId = data.lastStudentId ?? null;
    this.ambientTweens = [];
    this.dashTickHandler = null;
  }

  async create(): Promise<void> {
    const menuCreateStart = performance.now();
    console.info('[MenuScene] Create started');
    this.reduceMotion = checkReduceMotion();

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
      void this._openChooseLevelOverlay();
    });
    A11yLayer.announce(get('menu.welcome.announce'));

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
    // R31: level-card-L2..L5, L8, L9 testids for E2E coverage
    for (const n of [2, 3, 4, 5, 8, 9] as const) {
      TestHooks.mountInteractive(
        `level-card-L${n}`,
        () => {
          fadeAndStart(this, 'LevelScene', { levelNumber: n, studentId: this.lastStudentId });
        },
        { width: '100px', height: '40px', top: `${50 + (n - 2) * 5}%`, left: '90%' }
      );
    }

    // Continue button testid for E2E testing (only shown if lastStudentId exists)
    if (this.lastStudentId) {
      TestHooks.mountInteractive(
        'continue-btn',
        () => {
          this._startLevel(currentLevel, true);
        },
        { width: '360px', height: '90px', top: '54.7%', left: '50%' }
      );
    }

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
    this.drawSoftGlow(120, CH - 120, 280, GLOW_EMERALD, 0.45);
    this.drawSoftGlow(CW - 80, 480, 320, GLOW_BLUE, 0.45);

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
    const pathPts = samplePath();
    this.drawPath(pathPts);

    // ── Stations ──────────────────────────────────────────────────────────
    const hasContinue = !!this.lastStudentId;

    // Settings — top of the line (icon + word label, no fraction badge —
    // see file header comment + 2026-05-01 menu-pedagogy decision).
    createStationButton(this, {
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
      createStationButton(this, {
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
    createStationButton(this, {
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
    });

    console.info(
      `[MenuScene] Create complete (${Math.round(performance.now() - menuCreateStart)}ms)`
    );
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
      .text(bx, by, get('menu.choose_level'), {
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
      .on('pointerup', () => void this._openChooseLevelOverlay());
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

  /**
   * Show an in-scene modal with a 3×3 grid of LevelCards.
   * Mastered levels (BKT estimate ≥ 0.85) display the gold ribbon.
   * Tapping a card starts that level; the × closes the overlay.
   */
  private async _openChooseLevelOverlay(): Promise<void> {
    // Close any existing overlay first.
    this._closeChooseLevelOverlay();

    const unlocked = await this._getUnlockedLevels();
    const completedLevels = await this._getCompletedLevels();

    // Query mastery estimates from IndexedDB.
    const masteredLevels = new Set<number>();
    try {
      if (this.lastStudentId) {
        const records = await skillMasteryRepo.getAllForStudent(StudentId(this.lastStudentId));
        for (const rec of records) {
          if (rec.masteryEstimate < OVERLAY_MASTERY_THRESHOLD) continue;
          for (const meta of LEVEL_META) {
            if (rec.skillId === menuSkillIdForLevel(meta.number)) {
              masteredLevels.add(meta.number);
              break;
            }
          }
        }
      }
    } catch {
      // Overlay renders without ribbons on any error.
    }

    // If the scene was destroyed while we awaited, bail out.
    if (!this.scene || !this.scene.isActive()) return;

    const track = <T extends Phaser.GameObjects.GameObject>(obj: T): T => {
      this._overlayObjects.push(obj);
      return obj;
    };

    // ── Dark scrim ───────────────────────────────────────────────────────────
    const scrim = this.add
      .rectangle(CW / 2, CH / 2, CW, CH, 0x000000, 0.7)
      .setDepth(OVERLAY_DEPTH)
      .setInteractive(); // block clicks below
    track(scrim);

    // ── White panel ──────────────────────────────────────────────────────────
    const panelW = 760,
      panelH = 600;
    const panelX = CW / 2,
      panelY = 600;
    const panelG = this.add.graphics().setDepth(OVERLAY_DEPTH + 1);
    panelG.fillStyle(WHITE, 1);
    panelG.fillRoundedRect(panelX - panelW / 2, panelY - panelH / 2, panelW, panelH, 20);
    panelG.lineStyle(4, NAVY, 1);
    panelG.strokeRoundedRect(panelX - panelW / 2, panelY - panelH / 2, panelW, panelH, 20);
    track(panelG);

    // ── Title ────────────────────────────────────────────────────────────────
    track(
      this.add
        .text(panelX, panelY - panelH / 2 + 44, 'Choose a Level', {
          fontFamily: TITLE_FONT,
          fontSize: '38px',
          color: NAVY_HEX,
        })
        .setOrigin(0.5)
        .setDepth(OVERLAY_DEPTH + 2)
    );

    // ── Close button (×) ─────────────────────────────────────────────────────
    const closeX = panelX + panelW / 2 - 36;
    const closeY = panelY - panelH / 2 + 36;
    const closeBg = this.add.graphics().setDepth(OVERLAY_DEPTH + 2);
    closeBg.fillStyle(0xe2e8f0, 1);
    closeBg.fillCircle(closeX, closeY, 24);
    track(closeBg);
    track(
      this.add
        .text(closeX, closeY, '×', {
          fontFamily: BODY_FONT,
          fontStyle: 'bold',
          fontSize: '34px',
          color: NAVY_HEX,
        })
        .setOrigin(0.5, 0.5)
        .setDepth(OVERLAY_DEPTH + 3)
    );
    const closeHit = this.add
      .circle(closeX, closeY, 28, 0x000000, 0)
      .setDepth(OVERLAY_DEPTH + 4)
      .setInteractive({ useHandCursor: true })
      .on('pointerup', () => this._closeChooseLevelOverlay());
    track(closeHit);

    // ── Unlocked-only card grid ───────────────────────────────────────────────
    // Show only unlocked levels so the overlay acts as a quick-pick for
    // levels the player can actually play (not a full browse-all view).
    // At OVERLAY_CARD_SCALE=0.8: 220*0.8=176px wide, 160*0.8=128px tall.
    // Columns centred at x=160, 400, 640 (240px apart).
    // Rows centred at y=470, 620, 770 (150px apart).
    const colX = [160, 400, 640];
    const rowY = [470, 620, 770];

    const unlockedMeta = LEVEL_META.filter((m) => unlocked.has(m.number));

    // "Suggested next" = lowest unlocked and not-yet-completed level.
    const suggestedLevel = unlockedMeta.find((m) => !completedLevels.has(m.number))?.number ?? null;

    for (let i = 0; i < unlockedMeta.length; i++) {
      const meta = unlockedMeta[i]!;
      const cx = colX[i % 3]!;
      const cy = rowY[Math.floor(i / 3)]!;
      const card = new LevelCard({
        scene: this,
        x: cx,
        y: cy,
        meta,
        unlocked: true,
        suggested: meta.number === suggestedLevel,
        mastered: masteredLevels.has(meta.number),
        containerScale: OVERLAY_CARD_SCALE,
        testHookPrefix: 'overlay-card',
        onTap: (levelNumber) => {
          this._closeChooseLevelOverlay();
          this._startLevel(levelNumber);
        },
      });
      card.setScale(OVERLAY_CARD_SCALE).setDepth(OVERLAY_DEPTH + 2);
      track(card);
    }

    // ── "Full Adventure Map →" link ──────────────────────────────────────────
    const mapY = panelY + panelH / 2 - 38;
    const mapLinkBg = this.add.graphics().setDepth(OVERLAY_DEPTH + 2);
    mapLinkBg.fillStyle(NAVY, 0.12);
    mapLinkBg.fillRoundedRect(panelX - 140, mapY - 20, 280, 40, 20);
    track(mapLinkBg);
    const mapLink = this.add
      .text(panelX, mapY, '🗺 Full Adventure Map →', {
        fontFamily: BODY_FONT,
        fontStyle: 'bold',
        fontSize: '20px',
        color: NAVY_HEX,
      })
      .setOrigin(0.5)
      .setDepth(OVERLAY_DEPTH + 3);
    track(mapLink);
    const mapHit = this.add
      .rectangle(panelX, mapY, 280, 40, 0x000000, 0)
      .setDepth(OVERLAY_DEPTH + 4)
      .setInteractive({ useHandCursor: true })
      .on('pointerup', () => {
        this._closeChooseLevelOverlay();
        fadeAndStart(this, 'LevelMapScene', { studentId: this.lastStudentId });
      });
    track(mapHit);

    // TestHook sentinel so E2E tests can confirm the overlay opened.
    TestHooks.mountSentinel('choose-level-overlay');
  }

  /** Tear down all objects created by _openChooseLevelOverlay. */
  private _closeChooseLevelOverlay(): void {
    for (const obj of this._overlayObjects) {
      if (obj && (obj as Phaser.GameObjects.GameObject & { scene: unknown }).scene) {
        obj.destroy();
      }
    }
    this._overlayObjects = [];
    // Unmount overlay-specific TestHooks
    TestHooks.unmount('choose-level-overlay');
    for (const meta of LEVEL_META) {
      TestHooks.unmount(`overlay-card-L${meta.number}`);
    }
  }

  /** Read completed levels from IndexedDB. */
  private async _getCompletedLevels(): Promise<Set<number>> {
    if (!this.lastStudentId) return new Set();
    try {
      return await levelProgressionRepo.getCompletedLevels(StudentId(this.lastStudentId));
    } catch {
      // Ignore storage errors — default to empty set
      return new Set();
    }
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

  // ── Drawing helpers ───────────────────────────────────────────────────────

  /**
   * Approximate a CSS-style blur by stacking translucent ellipses. Faster and
   * more reliable across browsers than Phaser blur shaders.
   */
  private drawSoftGlow(cx: number, cy: number, radius: number, color: number, alpha: number): void {
    const g = this.add.graphics().setDepth(1);
    const layers = 5;
    for (let i = 0; i < layers; i++) {
      const t = (i + 1) / layers;
      g.fillStyle(color, alpha * (1 - t * 0.6));
      g.fillCircle(cx, cy, radius * t);
    }
  }

  private drawPath(pathPts: { x: number; y: number }[]): void {
    // Wide light-blue base stroke
    const base = this.add.graphics().setDepth(2);
    base.lineStyle(28, PATH_BLUE, 1);
    base.beginPath();
    base.moveTo(pathPts[0]!.x, pathPts[0]!.y);
    for (let i = 1; i < pathPts.length; i++) base.lineTo(pathPts[i]!.x, pathPts[i]!.y);
    base.strokePath();
    // Round caps via filled circles at endpoints
    base.fillStyle(PATH_BLUE, 1);
    base.fillCircle(pathPts[0]!.x, pathPts[0]!.y, 14);
    base.fillCircle(pathPts[pathPts.length - 1]!.x, pathPts[pathPts.length - 1]!.y, 14);

    // Marching white dashes on top
    const dashG = this.add.graphics().setDepth(3);
    const dashLen = 14;
    const gapLen = 14;
    const cycle = dashLen + gapLen;

    const drawDashes = (offset: number) => {
      dashG.clear();
      dashG.lineStyle(10, WHITE, 1);
      let traveled = -offset;
      for (let i = 1; i < pathPts.length; i++) {
        const a = pathPts[i - 1]!;
        const b = pathPts[i]!;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const segLen = Math.hypot(dx, dy);
        if (segLen === 0) continue;
        const ux = dx / segLen;
        const uy = dy / segLen;
        // Find the first dash start in this segment
        let local = -traveled;
        // Snap to cycle so dashes are continuous across segments
        while (local < 0) local += cycle;
        while (local < segLen) {
          const dashStart = local;
          const dashEnd = Math.min(segLen, local + dashLen);
          if (dashEnd > dashStart) {
            dashG.lineBetween(
              a.x + ux * dashStart,
              a.y + uy * dashStart,
              a.x + ux * dashEnd,
              a.y + uy * dashEnd
            );
          }
          local += cycle;
        }
        traveled += segLen;
      }
    };

    drawDashes(0);

    if (!this.reduceMotion) {
      let phase = 0;
      const tick = () => {
        phase = (phase + 0.6) % cycle;
        drawDashes(phase);
      };
      this.events.on('update', tick);
      this.dashTickHandler = tick;
    }
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
