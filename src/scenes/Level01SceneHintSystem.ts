/**
 * Level01SceneHintSystem — hint escalation, display, and recording.
 */

import * as Phaser from 'phaser';
import { HintLadder } from '@/components/HintLadder';
import { TestHooks } from './utils/TestHooks';
import { log } from '@/lib/log';
import { tts } from '@/audio/TTSService';
import { NAVY } from './utils/levelTheme';
import { checkReduceMotion } from '@/lib/preferences';
import type { HintTier } from '@/types';

const SHAPE_CX = 400;
const SHAPE_H = 520;

export class HintSystem {
  private scene: Phaser.Scene;
  private hintLadder: HintLadder | null = null;
  private hintText: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, hintText: Phaser.GameObjects.Text) {
    this.scene = scene;
    this.hintText = hintText;
  }

  setLadder(ladder: HintLadder): void {
    this.hintLadder = ladder;
  }

  requestNextTier(): HintTier | null {
    if (!this.hintLadder) return null;
    return this.hintLadder.next();
  }

  showHintForTier(
    tier: HintTier,
    questMessage: string,
    shapeCy: number,
    _inputLocked: boolean,
    onInputLocked: (locked: boolean) => void
  ): void {
    this.hintText.setVisible(true);
    this.hintText.setText(questMessage);
    tts.speak(questMessage);

    switch (tier) {
      case 'verbal':
        break;

      case 'visual_overlay':
        this.drawCenterOverlay(shapeCy);
        break;

      case 'worked_example':
        this.animateWorkedExample(shapeCy, onInputLocked);
        break;
    }

    TestHooks.setText('hint-text', questMessage);
  }

  private drawCenterOverlay(shapeCy: number): void {
    const overlay = this.scene.add.graphics().setDepth(8).setAlpha(0.4);
    overlay.lineStyle(3, NAVY, 1);
    overlay.lineBetween(SHAPE_CX, shapeCy - SHAPE_H / 2 - 20, SHAPE_CX, shapeCy + SHAPE_H / 2 + 20);
    this.scene.time.delayedCall(3000, () => {
      this.scene.tweens.add({
        targets: overlay,
        alpha: 0,
        duration: 400,
        onComplete: () => overlay.destroy(),
      });
    });
  }

  private animateWorkedExample(_shapeCy: number, onInputLocked: (locked: boolean) => void): void {
    if (checkReduceMotion()) {
      this.drawCenterOverlay(_shapeCy);
      this.scene.time.delayedCall(1200, () => {
        this.hintText.setText('Now you try! Drag the line to the middle.');
      });
      return;
    }
    onInputLocked(true);
    this.scene.time.delayedCall(700, () => {
      this.scene.time.delayedCall(800, () => {
        onInputLocked(false);
        this.hintText.setText('Now you try! Drag the line to the middle.');
      });
    });
  }

  pulseButton(hintButton: Phaser.GameObjects.Container): void {
    if (checkReduceMotion()) return;

    this.scene.tweens.add({
      targets: hintButton,
      scaleX: 1.1,
      scaleY: 1.1,
      duration: 200,
      yoyo: true,
      repeat: 2,
    });
  }

  async recordHintEvent(
    tier: HintTier,
    sessionId: string | null,
    _questionIndex: number
  ): Promise<string | null> {
    if (!sessionId) return null;

    try {
      const { hintEventRepo } = await import('@/persistence/repositories/hintEvent');
      const pointCost = tier === 'verbal' ? 5 : tier === 'visual_overlay' ? 15 : 30;
      const event = await hintEventRepo.record({
        attemptId: '' as unknown as import('@/types').AttemptId,
        hintId: `hint.partition.${tier}`,
        tier,
        shownAt: Date.now(),
        acceptedByStudent: true,
        pointCostApplied: pointCost,
        syncState: 'local',
      });
      if (event) {
        log.hint('record_ok', { hintId: `hint.partition.${tier}`, pointCost, eventId: event.id });
        return event.id;
      } else {
        log.warn('HINT', 'record_quota', { hintId: `hint.partition.${tier}` });
        return null;
      }
    } catch (err) {
      log.warn('HINT', 'record_error', { error: String(err) });
      return null;
    }
  }

  destroy(): void {
    this.hintText?.destroy();
  }
}
