/**
 * Level01SceneShapeRenderer — shape drawing, partition line, feedback visuals.
 */

import * as Phaser from 'phaser';
import { NAVY_HEX, NAVY, SKY_BG, ACTION_FILL, BODY_FONT, TITLE_FONT } from './utils/levelTheme';
import { sfx } from '@/audio/SFXService';

const CW = 800;
const SHAPE_CX = CW / 2;
const SHAPE_W = 400;
const SHAPE_H = 520;

export class ShapeRenderer {
  private shapeGraphics: Phaser.GameObjects.Graphics;
  private partitionLine: Phaser.GameObjects.Graphics;
  private ghostGuideGraphics: Phaser.GameObjects.Graphics | null = null;
  private ghostGuideLabel: Phaser.GameObjects.Text | null = null;
  private correctFillGraphics: Phaser.GameObjects.Graphics | null = null;
  private fractionLabels: Phaser.GameObjects.Text[] = [];
  private tapZone: Phaser.GameObjects.Rectangle | null = null;
  private scene: Phaser.Scene;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.shapeGraphics = scene.add.graphics().setDepth(5);
    this.partitionLine = scene.add.graphics().setDepth(6);
  }

  drawShape(
    shapeType: 'rectangle' | 'circle',
    shapeCy: number,
    handlePos: number,
    inputLocked: boolean,
    onTapZone: (x: number) => void
  ): void {
    this.shapeGraphics.clear();
    if (shapeType === 'rectangle') {
      this.drawRectShape(shapeCy, handlePos, inputLocked, onTapZone);
    } else {
      this.drawCircleShape(shapeCy);
    }
    this.updatePartitionLine(handlePos, shapeCy);
  }

  private drawRectShape(
    shapeCy: number,
    _handlePos: number,
    inputLocked: boolean,
    onTapZone: (x: number) => void
  ): void {
    const g = this.shapeGraphics;
    const x = SHAPE_CX - SHAPE_W / 2;
    const y = shapeCy - SHAPE_H / 2;

    g.fillStyle(SKY_BG, 0.55);
    g.fillRect(x, y, SHAPE_W, SHAPE_H);
    g.lineStyle(3, 0x1e3a8a, 0.6);
    g.strokeRect(x, y, SHAPE_W, SHAPE_H);

    if (!this.tapZone) {
      this.tapZone = this.scene.add
        .rectangle(SHAPE_CX, shapeCy, SHAPE_W, SHAPE_H, 0x000000, 0)
        .setDepth(4)
        .setInteractive({ useHandCursor: true });
      this.tapZone.on('pointerdown', (ptr: Phaser.Input.Pointer) => {
        if (inputLocked) return;
        const minX = SHAPE_CX - SHAPE_W / 2;
        const maxX = SHAPE_CX + SHAPE_W / 2;
        const clamped = Phaser.Math.Clamp(ptr.x, minX, maxX);
        onTapZone(clamped);
      });
    }
  }

  private drawCircleShape(shapeCy: number): void {
    const g = this.shapeGraphics;
    g.fillStyle(SKY_BG, 0.55);
    g.fillCircle(SHAPE_CX, shapeCy, SHAPE_W / 2);
    g.lineStyle(3, 0x1e3a8a, 0.6);
    g.strokeCircle(SHAPE_CX, shapeCy, SHAPE_W / 2);
  }

  updatePartitionLine(handleX: number, shapeCy: number): void {
    const g = this.partitionLine;
    g.clear();
    const top = shapeCy - SHAPE_H / 2 - 20;
    const bottom = shapeCy + SHAPE_H / 2 + 20;
    // UI-S1: 16px navy line with 2px white outline (no dashes)
    g.lineStyle(20, 0xffffff, 1);
    g.lineBetween(handleX, top, handleX, bottom);
    g.lineStyle(16, NAVY, 1);
    g.lineBetween(handleX, top, handleX, bottom);
  }

  showGhostGuide(shapeCy: number): void {
    this.ghostGuideGraphics?.destroy();
    this.ghostGuideLabel?.destroy();

    const g = this.scene.add.graphics().setDepth(8).setAlpha(0.28);
    this.ghostGuideGraphics = g;
    g.lineStyle(3, NAVY, 1);

    const top = shapeCy - SHAPE_H / 2;
    const bottom = shapeCy + SHAPE_H / 2;
    const dashLen = 12,
      gapLen = 8,
      cycle = dashLen + gapLen;
    let pos = 0;
    const len = bottom - top;
    while (pos < len) {
      const seg = Math.min(dashLen, len - pos);
      g.lineBetween(SHAPE_CX, top + pos, SHAPE_CX, top + pos + seg);
      pos += cycle;
    }

    this.ghostGuideLabel = this.scene.add
      .text(SHAPE_CX + SHAPE_W / 2 + 6, shapeCy, 'half', {
        fontFamily: BODY_FONT,
        fontSize: '14px',
        color: NAVY_HEX,
      })
      .setOrigin(0, 0.5)
      .setAlpha(0.35)
      .setDepth(8);
  }

  showCorrectFeedback(shapeCy: number): void {
    sfx.playSnap();

    const n = 2;
    const left = SHAPE_CX - SHAPE_W / 2;
    const top = shapeCy - SHAPE_H / 2;
    const partW = SHAPE_W / n;
    const colors: number[] = [ACTION_FILL, SKY_BG];

    const fillG = this.scene.add.graphics().setDepth(5).setAlpha(0);
    this.correctFillGraphics = fillG;

    for (let i = 0; i < n; i++) {
      fillG.fillStyle(colors[i % n]!, 0.45);
      fillG.fillRect(left + partW * i, top, partW, SHAPE_H);
    }

    this.scene.tweens.add({
      targets: fillG,
      alpha: 1,
      duration: 350,
      ease: 'Sine.easeOut',
    });

    this.scene.time.delayedCall(200, () => {
      for (let i = 0; i < n; i++) {
        const lx = left + partW * i + partW / 2;
        const label = this.scene.add
          .text(lx, shapeCy, `1/${n}`, {
            fontFamily: TITLE_FONT,
            fontSize: '28px',
            color: NAVY_HEX,
          })
          .setOrigin(0.5)
          .setDepth(9)
          .setScale(0.5);
        this.fractionLabels.push(label);
        this.scene.tweens.add({
          targets: label,
          scaleX: 1,
          scaleY: 1,
          duration: 300,
          ease: 'Back.easeOut',
        });
      }
    });
  }

  cleanup(): void {
    this.ghostGuideGraphics?.destroy();
    this.ghostGuideLabel?.destroy();
    this.correctFillGraphics?.destroy();
    this.fractionLabels.forEach((l) => l.destroy());
    this.fractionLabels = [];
    this.tapZone?.destroy();
    this.shapeGraphics?.destroy();
    this.partitionLine?.destroy();
  }
}
