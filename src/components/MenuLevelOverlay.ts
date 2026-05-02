/**
 * MenuLevelOverlay — in-scene modal listing unlocked levels as cards.
 *
 * Extracted from MenuScene. Instantiate once per scene and call open() /
 * close() as needed; the instance owns the lifecycle of every Phaser object
 * it creates and tears them down on close.
 *
 * Pedagogy notes:
 * - Mastered levels (BKT estimate ≥ MASTERY_THRESHOLD) display the gold
 *   ribbon — see PLAN.md Phase 2d.
 * - "Suggested next" is the lowest unlocked, not-yet-completed level.
 * - Only unlocked levels are shown; this is a quick-pick view, not a full
 *   browse-all (LevelMapScene serves that role).
 */

import * as Phaser from 'phaser';
import { LevelCard } from './LevelCard';
import { LEVEL_META } from '../scenes/utils/levelMeta';
import { TestHooks } from '../scenes/utils/TestHooks';
import { skillMasteryRepo } from '../persistence/repositories/skillMastery';
import { levelProgressionRepo } from '../persistence/repositories/levelProgression';
import { StudentId } from '../types/branded';
import { BODY_FONT, TITLE_FONT } from '../scenes/utils/levelTheme';

const CW = 800;
const CH = 1280;
const WHITE = 0xffffff;
const NAVY = 0x1e3a8a;
const NAVY_HEX = '#1E3A8A';

const OVERLAY_CARD_SCALE = 0.8;
const OVERLAY_DEPTH = 50;
const MASTERY_THRESHOLD = 0.8;

function skillIdForLevel(level: number): string {
  if (level === 1) return 'skill.partition_halves';
  return `skill.level_${level}`;
}

export interface MenuLevelOverlayDeps {
  scene: Phaser.Scene;
  getStudentId: () => string | null;
  onSelectLevel: (levelNumber: number) => void;
  onOpenMap: () => void;
}

export class MenuLevelOverlay {
  private readonly scene: Phaser.Scene;
  private readonly getStudentId: () => string | null;
  private readonly onSelectLevel: (level: number) => void;
  private readonly onOpenMap: () => void;
  private objects: Phaser.GameObjects.GameObject[] = [];

  constructor(deps: MenuLevelOverlayDeps) {
    this.scene = deps.scene;
    this.getStudentId = deps.getStudentId;
    this.onSelectLevel = deps.onSelectLevel;
    this.onOpenMap = deps.onOpenMap;
  }

  async open(): Promise<void> {
    this.close();

    const studentId = this.getStudentId();
    const unlocked = await this.getUnlockedLevels(studentId);
    const completed = await this.getCompletedLevels(studentId);
    const mastered = await this.getMasteredLevels(studentId);

    if (!this.scene.scene || !this.scene.scene.isActive()) return;

    this.renderScrim();
    const { panelX, panelY, panelW, panelH } = this.renderPanel();
    this.renderTitle(panelX, panelY, panelH);
    this.renderCloseButton(panelX, panelY, panelW, panelH);
    this.renderCardGrid(unlocked, completed, mastered);
    this.renderMapLink(panelX, panelY, panelH);

    TestHooks.mountSentinel('choose-level-overlay');
  }

  close(): void {
    for (const obj of this.objects) {
      if (obj && (obj as Phaser.GameObjects.GameObject & { scene: unknown }).scene) {
        obj.destroy();
      }
    }
    this.objects = [];
    TestHooks.unmount('choose-level-overlay');
    for (const meta of LEVEL_META) {
      TestHooks.unmount(`overlay-card-L${meta.number}`);
    }
  }

  private track<T extends Phaser.GameObjects.GameObject>(obj: T): T {
    this.objects.push(obj);
    return obj;
  }

  private async getUnlockedLevels(studentId: string | null): Promise<Set<number>> {
    if (!studentId) return new Set([1]);
    try {
      return await levelProgressionRepo.getUnlockedLevels(StudentId(studentId));
    } catch {
      return new Set([1]);
    }
  }

  private async getCompletedLevels(studentId: string | null): Promise<Set<number>> {
    if (!studentId) return new Set();
    try {
      return await levelProgressionRepo.getCompletedLevels(StudentId(studentId));
    } catch {
      return new Set();
    }
  }

  private async getMasteredLevels(studentId: string | null): Promise<Set<number>> {
    const result = new Set<number>();
    if (!studentId) return result;
    try {
      const records = await skillMasteryRepo.getAllForStudent(StudentId(studentId));
      for (const rec of records) {
        if (rec.masteryEstimate < MASTERY_THRESHOLD) continue;
        for (const meta of LEVEL_META) {
          if (rec.skillId === skillIdForLevel(meta.number)) {
            result.add(meta.number);
            break;
          }
        }
      }
    } catch {
      // Renders without ribbons on any error.
    }
    return result;
  }

  private renderScrim(): void {
    const scrim = this.scene.add
      .rectangle(CW / 2, CH / 2, CW, CH, 0x000000, 0.7)
      .setDepth(OVERLAY_DEPTH)
      .setInteractive();
    this.track(scrim);
  }

  private renderPanel(): { panelX: number; panelY: number; panelW: number; panelH: number } {
    const panelW = 760;
    const panelH = 600;
    const panelX = CW / 2;
    const panelY = 600;
    const g = this.scene.add.graphics().setDepth(OVERLAY_DEPTH + 1);
    g.fillStyle(WHITE, 1);
    g.fillRoundedRect(panelX - panelW / 2, panelY - panelH / 2, panelW, panelH, 20);
    g.lineStyle(4, NAVY, 1);
    g.strokeRoundedRect(panelX - panelW / 2, panelY - panelH / 2, panelW, panelH, 20);
    this.track(g);
    return { panelX, panelY, panelW, panelH };
  }

  private renderTitle(panelX: number, panelY: number, panelH: number): void {
    this.track(
      this.scene.add
        .text(panelX, panelY - panelH / 2 + 44, 'Choose a Level', {
          fontFamily: TITLE_FONT,
          fontSize: '38px',
          color: NAVY_HEX,
        })
        .setOrigin(0.5)
        .setDepth(OVERLAY_DEPTH + 2)
    );
  }

  private renderCloseButton(panelX: number, panelY: number, panelW: number, panelH: number): void {
    const closeX = panelX + panelW / 2 - 36;
    const closeY = panelY - panelH / 2 + 36;
    const closeBg = this.scene.add.graphics().setDepth(OVERLAY_DEPTH + 2);
    closeBg.fillStyle(0xe2e8f0, 1);
    closeBg.fillCircle(closeX, closeY, 24);
    this.track(closeBg);
    this.track(
      this.scene.add
        .text(closeX, closeY, '×', {
          fontFamily: BODY_FONT,
          fontStyle: 'bold',
          fontSize: '34px',
          color: NAVY_HEX,
        })
        .setOrigin(0.5, 0.5)
        .setDepth(OVERLAY_DEPTH + 3)
    );
    const closeHit = this.scene.add
      .circle(closeX, closeY, 28, 0x000000, 0)
      .setDepth(OVERLAY_DEPTH + 4)
      .setInteractive({ useHandCursor: true })
      .on('pointerup', () => this.close());
    this.track(closeHit);
  }

  private renderCardGrid(
    unlocked: Set<number>,
    completed: Set<number>,
    mastered: Set<number>
  ): void {
    const colX = [160, 400, 640];
    const rowY = [470, 620, 770];
    const unlockedMeta = LEVEL_META.filter((m) => unlocked.has(m.number));
    const suggested = unlockedMeta.find((m) => !completed.has(m.number))?.number ?? null;

    for (let i = 0; i < unlockedMeta.length; i++) {
      const meta = unlockedMeta[i]!;
      const cx = colX[i % 3]!;
      const cy = rowY[Math.floor(i / 3)]!;
      const card = new LevelCard({
        scene: this.scene,
        x: cx,
        y: cy,
        meta,
        unlocked: true,
        suggested: meta.number === suggested,
        mastered: mastered.has(meta.number),
        containerScale: OVERLAY_CARD_SCALE,
        testHookPrefix: 'overlay-card',
        onTap: (levelNumber) => {
          this.close();
          this.onSelectLevel(levelNumber);
        },
      });
      card.setScale(OVERLAY_CARD_SCALE).setDepth(OVERLAY_DEPTH + 2);
      this.track(card);
    }
  }

  private renderMapLink(panelX: number, panelY: number, panelH: number): void {
    const mapY = panelY + panelH / 2 - 38;
    const bg = this.scene.add.graphics().setDepth(OVERLAY_DEPTH + 2);
    bg.fillStyle(NAVY, 0.12);
    bg.fillRoundedRect(panelX - 140, mapY - 20, 280, 40, 20);
    this.track(bg);
    this.track(
      this.scene.add
        .text(panelX, mapY, '🗺 Full Adventure Map →', {
          fontFamily: BODY_FONT,
          fontStyle: 'bold',
          fontSize: '20px',
          color: NAVY_HEX,
        })
        .setOrigin(0.5)
        .setDepth(OVERLAY_DEPTH + 3)
    );
    const hit = this.scene.add
      .rectangle(panelX, mapY, 280, 40, 0x000000, 0)
      .setDepth(OVERLAY_DEPTH + 4)
      .setInteractive({ useHandCursor: true })
      .on('pointerup', () => {
        this.close();
        this.onOpenMap();
      });
    this.track(hit);
  }
}
