/**
 * LevelMapScene — visual adventure path between MenuScene and the level scenes.
 *
 * Displays all 9 levels as themed LevelCard tiles arranged on a winding path.
 * Locked levels show the LevelCard lock icon and muted slate palette; unlocked
 * levels show the sky-blue adventure card with level name and concept; the
 * first unlocked-but-not-completed level receives the amber "Suggested next"
 * badge from LevelCard.
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
  TITLE_FONT,
  BODY_FONT,
  drawAdventureBackground,
} from './utils/levelTheme';
import { fadeAndStart } from './utils/sceneTransition';
import { A11yLayer } from '../components/A11yLayer';
import { TestHooks } from './utils/TestHooks';
import { LEVEL_META } from './utils/levelMeta';
import { LevelCard } from '../components/LevelCard';

// ── Canvas constants ──────────────────────────────────────────────────────────
const CW = 800;
const CH = 1280;

// ── Palette extras ────────────────────────────────────────────────────────────
const WHITE = 0xffffff;
const WHITE_HEX = '#FFFFFF';

// ── Card scale — shrink LevelCard to fit the winding-path layout ──────────────
const CARD_SCALE = 0.65;

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

  constructor() {
    super({ key: 'LevelMapScene' });
  }

  init(data: LevelMapData): void {
    this.studentId = data?.studentId ?? null;
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

    // "Suggested next" = the lowest unlocked level that has not been completed.
    const suggestedLevel = LEVEL_META.find(
      (m) => unlocked.has(m.number) && !completedLevels.has(m.number)
    )?.number ?? null;

    // ── Path line (drawn first so cards sit on top) ─────────────────────────
    this._drawConnectingPath();

    // ── Level cards ────────────────────────────────────────────────────────
    for (let i = 0; i < LEVEL_META.length; i++) {
      const meta = LEVEL_META[i];
      const [nx, ny] = NODE_POSITIONS[i];
      const isUnlocked = unlocked.has(meta.number);
      const isSuggested = meta.number === suggestedLevel;
      const card = new LevelCard({
        scene: this,
        x: nx,
        y: ny,
        meta,
        unlocked: isUnlocked,
        suggested: isSuggested,
        onTap: (levelNumber) => this._startLevel(levelNumber),
      });
      card.setScale(CARD_SCALE).setDepth(10);
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
    // Every node gets a non-interactive sentinel (map-node-<N>) so Playwright
    // can assert that all 9 nodes are present in the DOM regardless of lock
    // state.  Unlocked nodes additionally get a transparent interactive button
    // (map-level-<N>) that forwards clicks into the scene without relying on
    // canvas coordinates.  The hook id matches the MenuScene convention to
    // avoid collisions with the existing level-card-L* ids.
    TestHooks.unmountAll();
    TestHooks.mountSentinel('level-map-scene');
    for (let i = 0; i < LEVEL_META.length; i++) {
      const meta = LEVEL_META[i];
      const lvl = meta.number;
      // Sentinel for every node — allows E2E tests to count all 9 nodes.
      TestHooks.mountSentinel(`map-node-${lvl}`);
      if (!unlocked.has(meta.number)) continue;
      const [nx, ny] = NODE_POSITIONS[i];
      const topPct = `${((ny / CH) * 100).toFixed(1)}%`;
      const leftPct = `${((nx / CW) * 100).toFixed(1)}%`;
      TestHooks.mountInteractive(
        `map-level-${lvl}`,
        () => this._startLevel(lvl),
        { width: '110px', height: '110px', top: topPct, left: leftPct }
      );
    }

    // ── Cleanup on shutdown ────────────────────────────────────────────────
    // (Path animation cleans up its own update listener on shutdown — see _drawConnectingPath)
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
