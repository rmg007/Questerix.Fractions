/**
 * Mascot sleep effect — eyelid overlay, slow bob, floating Zzz cascade.
 */

import * as Phaser from 'phaser';
import { BODY_FONT } from '../../scenes/utils/levelTheme';
import { BODY_R } from './character';

export interface SleepFxState {
  sleepGfx: Phaser.GameObjects.Graphics | null;
  zzzTimer: Phaser.Time.TimerEvent | null;
  zzzTimerChain: Phaser.Time.TimerEvent[];
}

export function createSleepFxState(): SleepFxState {
  return { sleepGfx: null, zzzTimer: null, zzzTimerChain: [] };
}

export function clearSleepFx(state: SleepFxState, parent: Phaser.GameObjects.Container): void {
  if (state.sleepGfx) {
    parent.remove(state.sleepGfx as unknown as Phaser.GameObjects.GameObject);
    state.sleepGfx.destroy();
    state.sleepGfx = null;
  }
  state.zzzTimer?.remove(false);
  state.zzzTimer = null;
  for (const t of state.zzzTimerChain) t.remove(false);
  state.zzzTimerChain = [];
}

export function scheduleZzz(
  state: SleepFxState,
  scene: Phaser.Scene,
  mascot: Phaser.GameObjects.Container,
  isSleeping: () => boolean
): void {
  if (!isSleeping() || !mascot.active) return;
  floatOneZzz(scene, mascot, 'z', 16);
  state.zzzTimer = scene.time.delayedCall(700, () => {
    if (!isSleeping()) return;
    floatOneZzz(scene, mascot, 'Z', 20);
    const t2 = scene.time.delayedCall(700, () => {
      if (!isSleeping()) return;
      floatOneZzz(scene, mascot, 'Z', 26);
      const t3 = scene.time.delayedCall(1800, () => scheduleZzz(state, scene, mascot, isSleeping));
      state.zzzTimerChain.push(t3);
    });
    state.zzzTimerChain.push(t2);
  });
}

function floatOneZzz(
  scene: Phaser.Scene,
  mascot: Phaser.GameObjects.Container,
  letter: string,
  size: number
): void {
  if (!mascot.active) return;
  const text = scene.add
    .text(mascot.x + BODY_R + 10, mascot.y - BODY_R - size * 0.5, letter, {
      fontSize: `${size}px`,
      fontFamily: BODY_FONT,
      color: '#60a5fa',
      fontStyle: 'bold',
    })
    .setDepth(mascot.depth + 6)
    .setAlpha(0.9);
  scene.tweens.add({
    targets: text,
    y: text.y - 38,
    alpha: 0,
    duration: 1200,
    ease: 'Cubic.easeOut',
    onComplete: () => text.destroy(),
  });
}
