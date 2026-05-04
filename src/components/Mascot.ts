/**
 * Mascot — a friendly procedurally-drawn character guide.
 *
 * Procedurally drawn from Phaser Graphics primitives (no image files).
 * Provides idle bob, celebrate, encourage, cheer-big, oops, wave, and sleep states.
 * per design-language.md §7.3 (procedural shapes only)
 */

import * as Phaser from 'phaser';
import { checkReduceMotion } from '../lib/preferences';
import { buildCharacter, BODY_R, HAT_H } from './mascot/character';
import {
  playIdle,
  playCelebrate,
  playEncourage,
  playCheerBig,
  playOops,
  playCelebrateHop,
  drawSleepEyelids,
  type MascotAnimContext,
} from './mascot/stateAnimations';
import { createSpeechBubble } from './mascot/speechBubble';
import { createSleepFxState, clearSleepFx, scheduleZzz, type SleepFxState } from './mascot/sleepFx';

export type MascotState =
  | 'idle'
  | 'cheer'
  | 'think'
  | 'oops'
  | 'cheer-big'
  | 'wave'
  | 'celebrate'
  | 'sleep';

export class Mascot extends Phaser.GameObjects.Container {
  private readonly reduceMotion: boolean;
  private baseY: number;
  private readonly baseScale: number;
  private idleTween: Phaser.Tweens.Tween | null = null;

  private bodyCircle!: Phaser.GameObjects.Graphics;
  private face!: Phaser.GameObjects.Container;
  private hat!: Phaser.GameObjects.Graphics;
  private leftArm!: Phaser.GameObjects.Graphics;
  private rightArm!: Phaser.GameObjects.Graphics;

  private stateSentinel: HTMLElement | null = null;
  private currentBubble: Phaser.GameObjects.Container | null = null;
  private idleTimerEvents: Phaser.Time.TimerEvent[] = [];
  private sleepFx: SleepFxState = createSleepFxState();

  constructor(scene: Phaser.Scene, x: number, y: number, scale = 1) {
    super(scene, x, y);
    this.baseY = y;
    this.baseScale = scale;
    this.reduceMotion = checkReduceMotion();

    const parts = buildCharacter(scene);
    this.hat = parts.hat;
    this.bodyCircle = parts.bodyCircle;
    this.face = parts.face;
    this.leftArm = parts.leftArm;
    this.rightArm = parts.rightArm;
    this.add(this.hat);
    this.add(this.leftArm);
    this.add(this.rightArm);
    this.add(this.bodyCircle);
    this.add(this.face);

    if (scale !== 1) this.setScale(scale);
    scene.add.existing(this as Phaser.GameObjects.GameObject);
    this.setDepth(5);
    this.stateSentinel = Mascot.mountStateSentinel();
  }

  private get animCtx(): MascotAnimContext {
    return {
      scene: this.scene,
      mascot: this,
      face: this.face,
      baseY: this.baseY,
      baseScale: this.baseScale,
      reduceMotion: this.reduceMotion,
      toIdle: () => this.setState('idle'),
    };
  }

  override setState(state: MascotState): this {
    super.setState(state);
    if (this.stateSentinel) this.stateSentinel.setAttribute('data-state', state);
    this.stopCurrent();
    switch (state) {
      case 'cheer':
        playCelebrate(this.animCtx);
        break;
      case 'think':
        playEncourage(this.animCtx);
        break;
      case 'cheer-big':
        playCheerBig(this.animCtx);
        break;
      case 'celebrate':
        playCelebrateHop(this.animCtx);
        break;
      case 'oops':
        playOops(this.animCtx);
        break;
      case 'wave':
        this.wave();
        break;
      case 'sleep':
        this.sleep();
        break;
      case 'idle':
      default:
        this.idleTween = playIdle(this.animCtx);
        break;
    }
    return this;
  }

  reposition(x: number, y: number): void {
    this.stopCurrent();
    this.baseY = y;
    this.setPosition(x, y);
  }

  private wave(): void {
    if (this.reduceMotion) {
      this.setState('idle');
      return;
    }
    this.scene.tweens.chain({
      targets: this.rightArm,
      tweens: [
        { angle: -60, duration: 200, ease: 'Back.easeOut' },
        { angle: -30, duration: 150, ease: 'Sine.easeInOut' },
        { angle: -60, duration: 150, ease: 'Sine.easeInOut' },
        { angle: -30, duration: 150, ease: 'Sine.easeInOut' },
        {
          angle: 0,
          duration: 200,
          ease: 'Back.easeIn',
          onComplete: () => this.setState('idle'),
        },
      ],
    });
  }

  private sleep(): void {
    clearSleepFx(this.sleepFx, this);
    if (this.reduceMotion) return;
    this.idleTween = this.scene.tweens.add({
      targets: this,
      y: this.baseY - 4,
      duration: 2500,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1,
    });
    this.sleepFx.sleepGfx = this.scene.add.graphics();
    drawSleepEyelids(this.sleepFx.sleepGfx);
    // sleepGfx was just assigned above — non-null at this point
    this.add(this.sleepFx.sleepGfx!);
    scheduleZzz(this.sleepFx, this.scene, this, () => (this.state as string) === 'sleep');
  }

  showSpeechBubble(text: string, durationMs: number): void {
    this.dismissBubble();
    this.currentBubble = createSpeechBubble(
      {
        scene: this.scene,
        x: this.x,
        y: this.y,
        scaleY: this.scaleY,
        depth: this.depth ?? 5,
        reduceMotion: this.reduceMotion,
      },
      text,
      durationMs,
      (container) => {
        if (this.currentBubble === container) {
          container.destroy();
          this.currentBubble = null;
        }
      }
    );
  }

  dismissBubble(): void {
    if (this.currentBubble) {
      this.currentBubble.destroy();
      this.currentBubble = null;
    }
  }

  startIdleTimer(): void {
    this.resetIdleTimer();
    const add = (delay: number, fn: () => void): void => {
      this.idleTimerEvents.push(
        this.scene.time.addEvent({ delay, callback: fn, callbackScope: this })
      );
    };
    add(10_000, () => {
      this.setState('think');
      this.showSpeechBubble('Hmm... 🤔', 3000);
    });
    add(18_000, () => {
      this.setState('wave');
      this.showSpeechBubble('Psst! Over here! 👋', 3000);
    });
    add(28_000, () => {
      this.setState('cheer');
      this.showSpeechBubble("Let's go, I believe in you! ⭐", 3000);
    });
    add(38_000, () => this.setState('sleep'));
  }

  resetIdleTimer(): void {
    for (const ev of this.idleTimerEvents) ev.destroy();
    this.idleTimerEvents = [];
    this.dismissBubble();
  }

  override destroy(fromScene?: boolean): void {
    this.resetIdleTimer();
    clearSleepFx(this.sleepFx, this);
    if (this.idleTween) {
      this.idleTween.stop();
      this.idleTween = null;
    }
    this.scene.tweens.killTweensOf(this);
    if (this.face) this.scene.tweens.killTweensOf(this.face);
    if (this.rightArm) this.scene.tweens.killTweensOf(this.rightArm);
    if (this.stateSentinel) {
      this.stateSentinel.remove();
      this.stateSentinel = null;
    }
    super.destroy(fromScene);
  }

  private stopCurrent(): void {
    if (this.idleTween) {
      this.idleTween.stop();
      this.idleTween = null;
    }
    this.scene.tweens.killTweensOf(this);
    this.scene.tweens.killTweensOf(this.face);
    this.scene.tweens.killTweensOf(this.rightArm);
    clearSleepFx(this.sleepFx, this);
    this.setPosition(this.x, this.baseY);
    this.setScale(this.baseScale);
    this.setAngle(0);
    this.face.setAngle(0);
    this.rightArm.setAngle(0);
  }

  private static mountStateSentinel(): HTMLElement | null {
    if (typeof document === 'undefined') return null;
    const existing = document.querySelector('[data-testid="mascot-state"]');
    if (existing instanceof HTMLElement) existing.remove();
    const el = document.createElement('div');
    el.setAttribute('data-testid', 'mascot-state');
    el.setAttribute('data-state', 'idle');
    el.setAttribute('aria-hidden', 'true');
    el.style.cssText =
      'position:fixed;top:0;left:0;width:1px;height:1px;opacity:0.01;pointer-events:none;overflow:hidden;z-index:-1;';
    document.body.appendChild(el);
    return el;
  }
}

// Re-export for downstream tests/code that import from Mascot
export { BODY_R, HAT_H };
