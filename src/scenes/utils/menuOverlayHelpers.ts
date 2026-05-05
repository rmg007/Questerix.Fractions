import * as Phaser from 'phaser';
import { LEVEL_META } from './levelMeta';
import { LevelCard } from '../../components/LevelCard';
import { TestHooks } from './TestHooks';
import { fadeAndStart } from './sceneTransition';
import { skillMasteryRepo } from '../../persistence/repositories/skillMastery';
import { StudentId } from '../../types/branded';
import { CW, CH, WHITE, NAVY } from './menuLayoutHelpers';
import { BODY_FONT } from './levelTheme';

const OVERLAY_CARD_SCALE = 0.8;
const OVERLAY_DEPTH = 50;
const OVERLAY_MASTERY_THRESHOLD = 0.8;

export async function openChooseLevelOverlay(
  scene: Phaser.Scene,
  studentId: string | null,
  overlayObjects: Phaser.GameObjects.GameObject[],
  _getUnlockedLevels: () => Promise<Set<number>>,
  _getCompletedLevels: () => Promise<Set<number>>,
  _startLevel: (levelNumber: number) => void
): Promise<void> {
  closeChooseLevelOverlay(overlayObjects);

  const unlocked = await _getUnlockedLevels();
  const completedLevels = await _getCompletedLevels();

  const masteredLevels = new Set<number>();
  try {
    if (studentId) {
      const records = await skillMasteryRepo.getAllForStudent(StudentId(studentId));
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

  if (!scene.scene || !scene.scene.isActive()) return;

  const track = <T extends Phaser.GameObjects.GameObject>(obj: T): T => {
    overlayObjects.push(obj);
    return obj;
  };

  // Dark scrim
  const scrim = scene.add
    .rectangle(CW / 2, CH / 2, CW, CH, 0x000000, 0.7)
    .setDepth(OVERLAY_DEPTH)
    .setInteractive();
  track(scrim);

  // White panel
  const panelW = 760,
    panelH = 600;
  const panelX = CW / 2,
    panelY = 600;
  const panelG = scene.add.graphics().setDepth(OVERLAY_DEPTH + 1);
  panelG.fillStyle(WHITE, 1);
  panelG.fillRoundedRect(panelX - panelW / 2, panelY - panelH / 2, panelW, panelH, 20);
  panelG.lineStyle(4, NAVY, 1);
  panelG.strokeRoundedRect(panelX - panelW / 2, panelY - panelH / 2, panelW, panelH, 20);
  track(panelG);

  // Title
  track(
    scene.add
      .text(panelX, panelY - panelH / 2 + 44, 'Choose a Level', {
        fontFamily: '"Fredoka One", "Nunito", system-ui, sans-serif',
        fontSize: '38px',
        color: '#1E3A8A',
      })
      .setOrigin(0.5)
      .setDepth(OVERLAY_DEPTH + 2)
  );

  // Close button
  const closeX = panelX + panelW / 2 - 36;
  const closeY = panelY - panelH / 2 + 36;
  const closeBg = scene.add.graphics().setDepth(OVERLAY_DEPTH + 2);
  closeBg.fillStyle(0xe2e8f0, 1);
  closeBg.fillCircle(closeX, closeY, 24);
  track(closeBg);
  track(
    scene.add
      .text(closeX, closeY, '×', {
        fontFamily: BODY_FONT,
        fontStyle: 'bold',
        fontSize: '34px',
        color: '#1E3A8A',
      })
      .setOrigin(0.5, 0.5)
      .setDepth(OVERLAY_DEPTH + 3)
  );
  const closeHit = scene.add
    .circle(closeX, closeY, 28, 0x000000, 0)
    .setDepth(OVERLAY_DEPTH + 4)
    .setInteractive({ useHandCursor: true })
    .on('pointerup', () => closeChooseLevelOverlay(overlayObjects));
  track(closeHit);

  // Level card grid
  const colX = [160, 400, 640];
  const rowY = [470, 620, 770];
  const unlockedMeta = LEVEL_META.filter((m) => unlocked.has(m.number));
  const suggestedLevel = unlockedMeta.find((m) => !completedLevels.has(m.number))?.number ?? null;

  for (let i = 0; i < unlockedMeta.length; i++) {
    const meta = unlockedMeta[i]!;
    const cx = colX[i % 3]!;
    const cy = rowY[Math.floor(i / 3)]!;
    const card = new LevelCard({
      scene,
      x: cx,
      y: cy,
      meta,
      unlocked: true,
      suggested: meta.number === suggestedLevel,
      mastered: masteredLevels.has(meta.number),
      containerScale: OVERLAY_CARD_SCALE,
      testHookPrefix: 'overlay-card',
      onTap: (levelNumber) => {
        closeChooseLevelOverlay(overlayObjects);
        _startLevel(levelNumber);
      },
    });
    card.setScale(OVERLAY_CARD_SCALE).setDepth(OVERLAY_DEPTH + 2);
    track(card);
  }

  // "Full Adventure Map →" link
  const mapY = panelY + panelH / 2 - 38;
  const mapLinkBg = scene.add.graphics().setDepth(OVERLAY_DEPTH + 2);
  mapLinkBg.fillStyle(NAVY, 0.12);
  mapLinkBg.fillRoundedRect(panelX - 140, mapY - 20, 280, 40, 20);
  track(mapLinkBg);
  const mapLink = scene.add
    .text(panelX, mapY, '🗺 Full Adventure Map →', {
      fontFamily: BODY_FONT,
      fontStyle: 'bold',
      fontSize: '32px',
      color: '#1E3A8A',
    })
    .setOrigin(0.5)
    .setDepth(OVERLAY_DEPTH + 3);
  track(mapLink);
  const mapHit = scene.add
    .rectangle(panelX, mapY, 280, 40, 0x000000, 0)
    .setDepth(OVERLAY_DEPTH + 4)
    .setInteractive({ useHandCursor: true })
    .on('pointerup', () => {
      closeChooseLevelOverlay(overlayObjects);
      fadeAndStart(scene, 'LevelMapScene', { studentId });
    });
  track(mapHit);

  TestHooks.mountSentinel('choose-level-overlay');
}

export function closeChooseLevelOverlay(overlayObjects: Phaser.GameObjects.GameObject[]): void {
  for (const obj of overlayObjects) {
    if (obj && (obj as Phaser.GameObjects.GameObject & { scene: unknown }).scene) {
      obj.destroy();
    }
  }
  overlayObjects.length = 0;
  TestHooks.unmount('choose-level-overlay');
  for (const meta of LEVEL_META) {
    TestHooks.unmount(`overlay-card-L${meta.number}`);
  }
}

function menuSkillIdForLevel(level: number): string {
  if (level === 1) return 'skill.partition_halves';
  return `skill.level_${level}`;
}
