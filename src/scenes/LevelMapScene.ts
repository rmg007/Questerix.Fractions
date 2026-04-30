/**
 * LevelMapScene — visual adventure path between MenuScene and the level scenes.
 *
 * Displays all 9 levels as circular nodes arranged on a winding path.
 * Completed levels show a star badge; the current (first unlocked) level
 * pulses gently; locked levels are dimmed with a padlock icon.
 *
 * Visual language follows design-language.md §2–§3 (palette, fonts) and the
 * sky-blue adventure theme established in MenuScene / levelTheme.ts.
 *
 * per runtime-architecture.md §2 (MVP scene inventory)
 * per design-language.md §6.4 (prefers-reduced-motion)
 */

import * as Phaser from 'phaser';
import {
  PATH_BLUE,
  NAVY,
  NAVY_HEX,
  ACTION_FILL,
  ACTION_BORDER,
  ACTION_TEXT,
  TITLE_FONT,
  BODY_FONT,
  drawAdventureBackground,
} from './utils/levelTheme';
import { fadeAndStart } from './utils/sceneTransition';
import { A11yLayer } from '../components/A11yLayer';
import { TestHooks } from './utils/TestHooks';
import { LEVEL_META } from './utils/levelMeta';

// ── Canvas constants ──────────────────────────────────────────────────────────
const CW = 800;
const CH = 1280;

// ── Palette extras ────────────────────────────────────────────────────────────
const WHITE = 0xffffff;
const WHITE_HEX = '#FFFFFF';
const EMERALD = 0x34d399;
const EMERALD_DARK = 0x064e3b;
const STAR_GOLD = 0xfbbf24;
const STAR_DARK = 0xb45309;
const GRAY_LIGHT = 0xd1d5db;
const GRAY_BORDER = 0x9ca3af;
const GRAY_TEXT = '#6b7280';

// ── Node radius ───────────────────────────────────────────────────────────────
const NODE_R = 52;

// ── Winding path node positions (x, y) — bottom (L1) to top (L9) ─────────────
// Designed for 800×1280 portrait canvas; the path snakes left↔right.
const NODE_POSITIONS: [number, number][] = [
  [200, 1130], // Level 1 — bottom-left
  [580, 1000], // Level 2 — bottom-right
  [220, 870], // Level 3 — mid-left
  [560, 740], // Level 4 — mid-right
  [380, 625], // Level 5 — centre
  [190, 500], // Level 6 — upper-left
  [590, 380], // Level 7 — upper-right
  [260, 250], // Level 8 — near-top-left
  [550, 148], // Level 9 — top-right
];

interface LevelMapData {
  studentId: string | null;
}

export class LevelMapScene extends Phaser.Scene {
  private studentId: string | null = null;
  private reduceMotion = false;
  private pulseTweens: Phaser.Tweens.Tween[] = [];

  constructor() {
    super({ key: 'LevelMapScene' });
  }

  init(data: LevelMapData): void {
    this.studentId = data?.studentId ?? null;
    this.pulseTweens = [];
  }

  create(): void {
    this.reduceMotion = this._checkReduceMotion();

    // Fade in from black
    if (!this.reduceMotion) {
      this.cameras.main.fadeIn(300, 0, 0, 0);
    }

    // ── Background ─────────────────────────────────────────────────────────
    drawAdventureBackground(this, CW, CH);

    // ── Title ──────────────────────────────────────────────────────────────
    this.add
      .text(CW / 2, 72, 'Adventure Map', {
        fontFamily: TITLE_FONT,
        fontSize: '60px',
        color: WHITE_HEX,
        stroke: NAVY_HEX,
        strokeThickness: 7,
        shadow: { offsetX: 0, offsetY: 4, color: NAVY_HEX, blur: 0, fill: true },
      })
      .setOrigin(0.5)
      .setDepth(20);

    // ── Unlock data ────────────────────────────────────────────────────────
    const unlocked = this._getUnlockedLevels();
    const completedLevels = this._getCompletedLevels();

    // ── Path line ──────────────────────────────────────────────────────────
    this._drawConnectingPath();

    // ── Level nodes ────────────────────────────────────────────────────────
    for (let i = 0; i < LEVEL_META.length; i++) {
      const meta = LEVEL_META[i];
      const [nx, ny] = NODE_POSITIONS[i];
      const isCompleted = completedLevels.has(meta.number);
      const isUnlocked = unlocked.has(meta.number);
      this._drawNode(nx, ny, meta.number, isCompleted, isUnlocked);
    }

    // ── Back to menu button ────────────────────────────────────────────────
    this._drawBackButton();

    // ── Accessibility ──────────────────────────────────────────────────────
    A11yLayer.unmountAll();
    A11yLayer.mountAction('a11y-back-menu', 'Back to main menu', () => {
      fadeAndStart(this, 'MenuScene', { lastStudentId: this.studentId });
    });
    for (const meta of LEVEL_META) {
      if (unlocked.has(meta.number)) {
        A11yLayer.mountAction(`a11y-map-level-${meta.number}`, `Play Level ${meta.number}: ${meta.name}`, () => {
          this._startLevel(meta.number);
        });
      }
    }
    A11yLayer.announce('Adventure Map. Select a level to play, or press Back to return to the menu.');

    // ── Test hooks — DOM selectors for E2E tests ────────────────────────────
    // Each unlocked level node gets a transparent hit-zone in DOM space so
    // Playwright tests can click through to specific levels without relying on
    // canvas coordinates.  The hook id matches the MenuScene convention
    // (map-level-<N>) to avoid collisions with the existing level-card-L* ids.
    TestHooks.unmountAll();
    TestHooks.mountSentinel('level-map-scene');
    for (let i = 0; i < LEVEL_META.length; i++) {
      const meta = LEVEL_META[i];
      if (!unlocked.has(meta.number)) continue;
      const [nx, ny] = NODE_POSITIONS[i];
      const topPct = `${((ny / CH) * 100).toFixed(1)}%`;
      const leftPct = `${((nx / CW) * 100).toFixed(1)}%`;
      const lvl = meta.number;
      TestHooks.mountInteractive(
        `map-level-${lvl}`,
        () => this._startLevel(lvl),
        { width: '110px', height: '110px', top: topPct, left: leftPct }
      );
    }

    // ── Cleanup on shutdown ────────────────────────────────────────────────
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      for (const t of this.pulseTweens) t.stop();
      this.pulseTweens = [];
    });
  }

  // ── Path drawing ─────────────────────────────────────────────────────────────

  private _drawConnectingPath(): void {
    const g = this.add.graphics().setDepth(2);

    // Wide coloured track
    g.lineStyle(22, PATH_BLUE, 1);
    g.beginPath();
    g.moveTo(NODE_POSITIONS[0][0], NODE_POSITIONS[0][1]);
    for (let i = 1; i < NODE_POSITIONS.length; i++) {
      const [x, y] = NODE_POSITIONS[i];
      g.lineTo(x, y);
    }
    g.strokePath();

    // Round caps at each node junction for a "road" feel
    g.fillStyle(PATH_BLUE, 1);
    for (const [x, y] of NODE_POSITIONS) {
      g.fillCircle(x, y, 11);
    }

    // White dashes on top of the track (static when reduce-motion, animated otherwise)
    const dashG = this.add.graphics().setDepth(3);
    const dashLen = 12;
    const gapLen = 12;
    const cycle = dashLen + gapLen;

    const drawDashes = (offset: number) => {
      dashG.clear();
      dashG.lineStyle(8, WHITE, 0.8);
      for (let seg = 0; seg < NODE_POSITIONS.length - 1; seg++) {
        const [ax, ay] = NODE_POSITIONS[seg];
        const [bx, by] = NODE_POSITIONS[seg + 1];
        const dx = bx - ax;
        const dy = by - ay;
        const len = Math.hypot(dx, dy);
        if (len === 0) continue;
        const ux = dx / len;
        const uy = dy / len;
        let local = offset % cycle;
        while (local < len) {
          const start = local;
          const end = Math.min(len, local + dashLen);
          if (end > start) {
            dashG.lineBetween(ax + ux * start, ay + uy * start, ax + ux * end, ay + uy * end);
          }
          local += cycle;
        }
      }
    };

    drawDashes(0);

    if (!this.reduceMotion) {
      let phase = 0;
      const tick = () => {
        phase = (phase + 0.5) % cycle;
        drawDashes(phase);
      };
      this.events.on('update', tick);
      this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
        this.events.off('update', tick);
      });
    }
  }

  // ── Node drawing ─────────────────────────────────────────────────────────────

  private _drawNode(
    x: number,
    y: number,
    level: number,
    completed: boolean,
    unlocked: boolean
  ): void {
    const depth = 10;

    if (!unlocked) {
      // ── Locked node: gray circle + padlock ──
      const g = this.add.graphics().setDepth(depth);
      g.fillStyle(GRAY_LIGHT, 1);
      g.fillCircle(x, y, NODE_R);
      g.lineStyle(5, GRAY_BORDER, 1);
      g.strokeCircle(x, y, NODE_R);

      this.add
        .text(x, y - 10, '🔒', { fontSize: '28px' })
        .setOrigin(0.5)
        .setDepth(depth + 1);

      this.add
        .text(x, y + 24, `${level}`, {
          fontFamily: TITLE_FONT,
          fontSize: '22px',
          color: GRAY_TEXT,
        })
        .setOrigin(0.5)
        .setDepth(depth + 1);

      return;
    }

    if (completed) {
      // ── Completed node: amber circle + star ──
      // Shadow
      const shadow = this.add.graphics().setDepth(depth - 1);
      shadow.fillStyle(STAR_DARK, 0.5);
      shadow.fillCircle(x + 3, y + 5, NODE_R);

      const g = this.add.graphics().setDepth(depth);
      g.fillStyle(ACTION_FILL, 1);
      g.fillCircle(x, y, NODE_R);
      g.lineStyle(5, ACTION_BORDER, 1);
      g.strokeCircle(x, y, NODE_R);

      // Big star icon
      this.add
        .text(x, y - 8, '⭐', { fontSize: '32px' })
        .setOrigin(0.5)
        .setDepth(depth + 1);

      // Small level number below star
      this.add
        .text(x, y + 26, `${level}`, {
          fontFamily: TITLE_FONT,
          fontSize: '18px',
          color: ACTION_TEXT,
        })
        .setOrigin(0.5)
        .setDepth(depth + 1);

      // Invisible hit zone for completed levels (allow replay)
      this.add
        .circle(x, y, NODE_R, 0, 0)
        .setInteractive({ useHandCursor: true })
        .setDepth(depth + 2)
        .on('pointerup', () => this._startLevel(level));

      return;
    }

    // ── Unlocked (current) node: emerald circle + level number, pulses ──
    // Build as a container so the entire node can be scale-pulsed cleanly.
    const container = this.add.container(x, y).setDepth(depth);

    // Drop shadow
    const shadowG = this.add.graphics();
    shadowG.fillStyle(EMERALD_DARK, 0.35);
    shadowG.fillCircle(3, 6, NODE_R);
    container.add(shadowG);

    // Main circle
    const circleG = this.add.graphics();
    circleG.fillStyle(EMERALD, 1);
    circleG.fillCircle(0, 0, NODE_R);
    circleG.lineStyle(6, EMERALD_DARK, 1);
    circleG.strokeCircle(0, 0, NODE_R);
    container.add(circleG);

    // Level number
    const numTxt = this.add
      .text(0, -10, `${level}`, {
        fontFamily: TITLE_FONT,
        fontSize: '36px',
        color: WHITE_HEX,
      })
      .setOrigin(0.5);
    container.add(numTxt);

    // Level name
    const nameTxt = this.add
      .text(0, 22, LEVEL_META[level - 1].name, {
        fontFamily: BODY_FONT,
        fontSize: '13px',
        color: WHITE_HEX,
        fontStyle: 'bold',
        wordWrap: { width: NODE_R * 1.7 },
        align: 'center',
      })
      .setOrigin(0.5);
    container.add(nameTxt);

    // "Play" label pill below the node (positioned in scene space)
    this._drawPlayPill(x, y + NODE_R + 22);

    // Gentle scale-pulse to draw the eye
    if (!this.reduceMotion) {
      const t = this.tweens.add({
        targets: container,
        scaleX: 1.07,
        scaleY: 1.07,
        duration: 700,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
      this.pulseTweens.push(t);
    }

    // Hit zone (placed in scene, above container)
    this.add
      .circle(x, y, NODE_R, 0, 0)
      .setInteractive({ useHandCursor: true })
      .setDepth(depth + 3)
      .on('pointerup', () => this._startLevel(level));
  }

  private _drawPlayPill(cx: number, cy: number): void {
    const W = 88,
      H = 30,
      R = 15;
    const g = this.add.graphics().setDepth(11);
    g.fillStyle(STAR_GOLD, 1);
    g.fillRoundedRect(cx - W / 2, cy - H / 2, W, H, R);
    g.lineStyle(3, STAR_DARK, 1);
    g.strokeRoundedRect(cx - W / 2, cy - H / 2, W, H, R);

    this.add
      .text(cx, cy, '▶ Play', {
        fontFamily: BODY_FONT,
        fontStyle: 'bold',
        fontSize: '15px',
        color: ACTION_TEXT,
      })
      .setOrigin(0.5)
      .setDepth(12);
  }

  // ── Back button ───────────────────────────────────────────────────────────────

  private _drawBackButton(): void {
    const bx = 76,
      by = CH - 54;
    const W = 136,
      H = 52;

    const g = this.add.graphics().setDepth(20);
    g.fillStyle(WHITE, 0.95);
    g.fillRoundedRect(bx - W / 2, by - H / 2, W, H, H / 2);
    g.lineStyle(4, NAVY, 1);
    g.strokeRoundedRect(bx - W / 2, by - H / 2, W, H, H / 2);

    this.add
      .text(bx, by, '← Menu', {
        fontFamily: BODY_FONT,
        fontStyle: 'bold',
        fontSize: '22px',
        color: NAVY_HEX,
      })
      .setOrigin(0.5)
      .setDepth(21);

    this.add
      .rectangle(bx, by, W, H, 0, 0)
      .setInteractive({ useHandCursor: true })
      .setDepth(22)
      .on('pointerup', () => {
        fadeAndStart(this, 'MenuScene', { lastStudentId: this.studentId });
      });
  }

  // ── Legend ────────────────────────────────────────────────────────────────────

  // ── Helpers ───────────────────────────────────────────────────────────────────

  private _getUnlockedLevels(): Set<number> {
    const unlocked = new Set<number>([1]);
    try {
      const key = this.studentId ? `unlockedLevels:${this.studentId}` : 'unlockedLevels';
      const raw = localStorage.getItem(key);
      if (raw) {
        const arr = JSON.parse(raw) as number[];
        arr.forEach((n) => unlocked.add(n));
      }
    } catch {
      // Fall back to level 1 only on storage error
    }
    return unlocked;
  }

  private _getCompletedLevels(): Set<number> {
    const completed = new Set<number>();
    try {
      // Read from the explicit completedLevels key written by MenuScene.markLevelComplete.
      // This correctly covers Level 9 which has no successor level to unlock.
      const key = this.studentId ? `completedLevels:${this.studentId}` : 'completedLevels';
      const raw = localStorage.getItem(key);
      if (raw) {
        const arr = JSON.parse(raw) as number[];
        arr.forEach((n) => completed.add(n));
      }
    } catch {
      // Ignore storage errors — map renders without star badges on failure
    }
    return completed;
  }

  private _startLevel(levelNumber: number): void {
    const data = { levelNumber, studentId: this.studentId };
    if (levelNumber === 1) {
      fadeAndStart(this, 'Level01Scene', data);
    } else {
      fadeAndStart(this, 'LevelScene', data);
    }
  }

  private _checkReduceMotion(): boolean {
    try {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch {
      return false;
    }
  }
}
