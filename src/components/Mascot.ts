/**
 * Mascot — a friendly procedurally-drawn character guide.
 *
 * A small amber/navy wizard drawn entirely from Phaser Graphics primitives
 * (no image files). Provides idle bob, celebrate jump, encourage wobble, and
 * wave animations. Returns to idle automatically after celebrate / encourage / wave.
 *
 * per design-language.md §7.3 (procedural shapes only)
 */

import * as Phaser from 'phaser';
import { ACTION_FILL, ACTION_BORDER, NAVY, BODY_FONT } from '../scenes/utils/levelTheme';
import { checkReduceMotion } from '../lib/preferences';

// ── Local palette tokens not exported from levelTheme ────────────────────────

const AMBER = ACTION_FILL;
const AMBER_DARK = ACTION_BORDER;
const WHITE = 0xffffff;
const ROSE = 0xfb7185;
const NAVY_HEX = '#1e3a8a';

// ── Character proportions ────────────────────────────────────────────────────

const BODY_R = 40;
const HAT_BASE = 50;
const HAT_H = 55;

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

  // T14: Speech bubble + idle timer fields
  private currentBubble: Phaser.GameObjects.Container | null = null;
  private idleTimerEvents: Phaser.Time.TimerEvent[] = [];

  // Sleep state
  private sleepGfx: Phaser.GameObjects.Graphics | null = null;
  private zzzTimer: Phaser.Time.TimerEvent | null = null;

  constructor(scene: Phaser.Scene, x: number, y: number, scale = 1) {
    super(scene, x, y);

    this.baseY = y;
    this.baseScale = scale;
    this.reduceMotion = checkReduceMotion();

    this.buildCharacter();

    if (scale !== 1) {
      this.setScale(scale);
    }

    scene.add.existing(this as Phaser.GameObjects.GameObject);
    this.setDepth(5);

    this.stateSentinel = Mascot.mountStateSentinel();
  }

  // ── Public API ────────────────────────────────────────────────────────────

  /**
   * Set the mascot's named state, update the DOM sentinel, and trigger the
   * corresponding animation. This is the preferred entry-point for scene code
   * so that Playwright tests can observe the current state via
   * [data-testid="mascot-state"][data-state="cheer|think|cheer-big|..."].
   */
  override setState(state: MascotState): this {
    // Keep Phaser's internal .state property in sync so any future code that
    // reads GameObject.state still sees the current mascot state.
    super.setState(state);
    if (this.stateSentinel) {
      this.stateSentinel.setAttribute('data-state', state);
    }
    switch (state) {
      case 'cheer':
        this.celebrate();
        break;
      case 'think':
        this.encourage();
        break;
      case 'cheer-big':
        this.cheerBig();
        break;
      case 'celebrate':
        this.celebrateHop();
        break;
      case 'oops':
        this.oops();
        break;
      case 'wave':
        this.wave();
        break;
      case 'sleep':
        this.sleep();
        break;
      case 'idle':
      default:
        this.idle();
        break;
    }
    return this;
  }

  /**
   * Reposition the mascot to a new base location.
   * Updates internal baseY so subsequent animations (idle bob, celebrate jump)
   * are anchored to the new position rather than the construction-time position.
   */
  reposition(x: number, y: number): void {
    this.stopCurrent();
    this.baseY = y;
    this.setPosition(x, y);
  }

  /** Gentle floating bob — loops until another animation takes over. */
  idle(): void {
    this.stopCurrent();
    if (this.reduceMotion) return;

    this.idleTween = this.scene.tweens.add({
      targets: this,
      y: this.baseY - 8,
      duration: 1500,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1,
    });
  }

  /** Jump + spin + scale burst (~500ms), then returns to idle. */
  celebrate(): void {
    this.stopCurrent();

    if (this.reduceMotion) {
      this.setState('idle');
      return;
    }

    const bs = this.baseScale;

    this.scene.tweens.chain({
      targets: this,
      tweens: [
        {
          y: this.baseY - 40,
          scaleX: bs * 1.4,
          scaleY: bs * 1.4,
          angle: 180,
          duration: 250,
          ease: 'Back.easeOut',
        },
        {
          y: this.baseY,
          scaleX: bs,
          scaleY: bs,
          angle: 360,
          duration: 250,
          ease: 'Bounce.easeOut',
          onComplete: () => {
            this.setAngle(0);
            this.setState('idle');
          },
        },
      ],
    });
  }

  /** Head-wobble (rotation ±8°, ~700ms total), then returns to idle. */
  encourage(): void {
    this.stopCurrent();

    if (this.reduceMotion) {
      this.setState('idle');
      return;
    }

    this.scene.tweens.chain({
      targets: this.face,
      tweens: [
        { angle: -8, duration: 150, ease: 'Sine.easeInOut' },
        { angle: 8, duration: 150, ease: 'Sine.easeInOut' },
        { angle: -6, duration: 120, ease: 'Sine.easeInOut' },
        { angle: 6, duration: 120, ease: 'Sine.easeInOut' },
        {
          angle: 0,
          duration: 100,
          ease: 'Linear',
          onComplete: () => {
            this.setState('idle');
          },
        },
      ],
    });
  }

  /**
   * Larger celebration for session-complete: 1.4× scale, full body bounce +
   * spin (360°), ~800ms, then returns to idle. Designed as the `cheer-big`
   * state counterpart to the standard `cheer` (celebrate).
   */
  cheerBig(): void {
    this.stopCurrent();

    if (this.reduceMotion) {
      this.setState('idle');
      return;
    }

    const bs = this.baseScale;

    this.scene.tweens.chain({
      targets: this,
      tweens: [
        {
          y: this.baseY - 60,
          scaleX: bs * 1.4,
          scaleY: bs * 1.4,
          angle: 180,
          duration: 400,
          ease: 'Back.easeOut',
        },
        {
          y: this.baseY,
          scaleX: bs,
          scaleY: bs,
          angle: 360,
          duration: 400,
          ease: 'Bounce.easeOut',
          onComplete: () => {
            this.setAngle(0);
            this.setState('idle');
          },
        },
      ],
    });
  }

  /**
   * "Oops!" reaction for wrong answers — clearly different from 'think'.
   * Body squashes down + springs back (~400ms), sweat-drop graphic appears
   * near the head and fades away, then returns to idle.
   */
  oops(): void {
    this.stopCurrent();
    super.setState('oops');
    this.stateSentinel?.setAttribute('data-state', 'oops');

    if (this.reduceMotion) {
      this.setState('idle');
      return;
    }

    const bs = this.baseScale;

    // Body squash + spring back
    this.scene.tweens.chain({
      targets: this,
      tweens: [
        {
          y: this.baseY + 10,
          scaleX: bs * 1.2,
          scaleY: bs * 0.8,
          duration: 120,
          ease: 'Sine.easeOut',
        },
        {
          y: this.baseY - 6,
          scaleX: bs * 0.95,
          scaleY: bs * 1.05,
          duration: 160,
          ease: 'Back.easeOut',
        },
        {
          y: this.baseY,
          scaleX: bs,
          scaleY: bs,
          duration: 720,
          ease: 'Sine.easeInOut',
          onComplete: () => {
            this.setState('idle');
          },
        },
      ],
    });

    // Sweat drop — small blue teardrop drawn near the right side of the head
    const drop = this.scene.add.graphics();
    const dropX = this.x + BODY_R * 0.9;
    const dropY = this.y - BODY_R * 0.3;
    drop.fillStyle(0x60a5fa, 0.9); // blue-400
    drop.fillCircle(dropX, dropY + 5, 5);
    drop.fillTriangle(dropX - 4, dropY + 5, dropX + 4, dropY + 5, dropX, dropY - 4);
    drop.setDepth(this.depth + 2);

    this.scene.time.delayedCall(250, () => {
      this.scene.tweens.add({
        targets: drop,
        alpha: 0,
        y: drop.y + 12,
        duration: 350,
        ease: 'Cubic.easeIn',
        onComplete: () => drop.destroy(),
      });
    });
  }

  /**
   * Issue #82 sub-item: quick bounce/hop — y -= 20 and back, 2 hops (~600ms),
   * then returns to idle. Used when a session completes.
   */
  celebrateHop(): void {
    this.stopCurrent();

    if (this.reduceMotion) {
      this.setState('idle');
      return;
    }

    this.scene.tweens.chain({
      targets: this,
      tweens: [
        { y: this.baseY - 20, duration: 130, ease: 'Sine.easeOut' },
        { y: this.baseY, duration: 130, ease: 'Bounce.easeOut' },
        { y: this.baseY - 20, duration: 130, ease: 'Sine.easeOut' },
        {
          y: this.baseY,
          duration: 130,
          ease: 'Bounce.easeOut',
          onComplete: () => {
            this.setState('idle');
          },
        },
      ],
    });
  }

  /**
   * Sleep: very slow bob, closed-eye overlay, floating Zzz text.
   * Triggered after 30 s idle. State persists until any new setState() call.
   */
  sleep(): void {
    this.stopCurrent();
    this.clearSleepFx();
    if (this.reduceMotion) return;

    // Very slow gentle bob
    this.idleTween = this.scene.tweens.add({
      targets: this,
      y: this.baseY - 4,
      duration: 2500,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1,
    });

    // Eyelid overlay added as a container child so it moves with the body
    this.sleepGfx = this.scene.add.graphics();
    this.drawSleepEyelids(this.sleepGfx);
    this.add(this.sleepGfx as unknown as Phaser.GameObjects.GameObject);

    // Start cascading Zzz floats
    this.scheduleZzz();
  }

  private drawSleepEyelids(g: Phaser.GameObjects.Graphics): void {
    // Face eyes are at (-11, -8) and (15, -8) in container-local coords.
    // Fill with body colour to hide pupils, then draw a closed-arc over each.
    g.fillStyle(AMBER, 1);
    g.fillEllipse(-11, -6, 20, 13);
    g.fillEllipse(15, -6, 20, 13);
    g.lineStyle(3, NAVY, 1);
    // Closed-eye arcs (flat side down)
    g.beginPath();
    g.arc(-11, -11, 9, 0, Math.PI, false, 16);
    g.strokePath();
    g.beginPath();
    g.arc(15, -11, 9, 0, Math.PI, false, 16);
    g.strokePath();
  }

  private scheduleZzz(): void {
    if ((this.state as string) !== 'sleep' || !this.active) return;
    this.floatOneZzz('z', 16);
    this.zzzTimer = this.scene.time.delayedCall(700, () => {
      if ((this.state as string) !== 'sleep') return;
      this.floatOneZzz('Z', 20);
      this.scene.time.delayedCall(700, () => {
        if ((this.state as string) !== 'sleep') return;
        this.floatOneZzz('Z', 26);
        this.scene.time.delayedCall(1800, () => this.scheduleZzz());
      });
    });
  }

  private floatOneZzz(letter: string, size: number): void {
    if (!this.active) return;
    const text = this.scene.add
      .text(this.x + BODY_R + 10, this.y - BODY_R - size * 0.5, letter, {
        fontSize: `${size}px`,
        fontFamily: BODY_FONT,
        color: '#60a5fa',
        fontStyle: 'bold',
      })
      .setDepth(this.depth + 6)
      .setAlpha(0.9);
    this.scene.tweens.add({
      targets: text,
      y: text.y - 38,
      alpha: 0,
      duration: 1200,
      ease: 'Cubic.easeOut',
      onComplete: () => text.destroy(),
    });
  }

  private clearSleepFx(): void {
    if (this.sleepGfx) {
      this.remove(this.sleepGfx as unknown as Phaser.GameObjects.GameObject);
      this.sleepGfx.destroy();
      this.sleepGfx = null;
    }
    this.zzzTimer?.remove(false);
    this.zzzTimer = null;
  }

  /** Arm-raise wave (~850ms), then returns to idle. */
  wave(): void {
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
          onComplete: () => {
            this.setState('idle');
          },
        },
      ],
    });
  }

  // ── Character construction ────────────────────────────────────────────────

  private buildCharacter(): void {
    this.hat = this.scene.add.graphics();
    this.drawHat(this.hat);
    this.add(this.hat);

    this.leftArm = this.scene.add.graphics();
    this.leftArm.setPosition(-BODY_R - 6, 4);
    this.drawArm(this.leftArm, 'left');
    this.add(this.leftArm);

    this.rightArm = this.scene.add.graphics();
    this.rightArm.setPosition(BODY_R + 6, 4);
    this.drawArm(this.rightArm, 'right');
    this.add(this.rightArm);

    this.bodyCircle = this.scene.add.graphics();
    this.drawBody(this.bodyCircle);
    this.add(this.bodyCircle);

    this.face = this.scene.add.container(0, -4);
    this.buildFace(this.face);
    this.add(this.face);
  }

  private drawHat(g: Phaser.GameObjects.Graphics): void {
    g.fillStyle(NAVY, 1);
    g.fillEllipse(0, -BODY_R + 4, HAT_BASE + 12, 14);

    g.fillStyle(NAVY, 1);
    g.fillTriangle(-HAT_BASE / 2, -BODY_R + 4, HAT_BASE / 2, -BODY_R + 4, 0, -BODY_R - HAT_H);

    g.fillStyle(AMBER, 0.45);
    g.fillTriangle(
      -HAT_BASE / 4,
      -BODY_R + 4,
      HAT_BASE / 4,
      -BODY_R + 4,
      0,
      -BODY_R - HAT_H * 0.55
    );

    g.fillStyle(AMBER, 1);
    g.fillCircle(0, -BODY_R - HAT_H * 0.55, 5);
  }

  private drawBody(g: Phaser.GameObjects.Graphics): void {
    g.fillStyle(AMBER_DARK, 0.35);
    g.fillCircle(3, 5, BODY_R);

    g.fillStyle(AMBER, 1);
    g.fillCircle(0, 0, BODY_R);

    g.lineStyle(3, AMBER_DARK, 1);
    g.strokeCircle(0, 0, BODY_R);

    g.fillStyle(WHITE, 0.25);
    g.fillCircle(-12, -10, 16);
  }

  private buildFace(container: Phaser.GameObjects.Container): void {
    const g = this.scene.add.graphics();

    g.fillStyle(WHITE, 1);
    g.fillCircle(-13, -8, 9);
    g.fillStyle(WHITE, 1);
    g.fillCircle(13, -8, 9);

    g.fillStyle(NAVY, 1);
    g.fillCircle(-11, -8, 5);
    g.fillStyle(NAVY, 1);
    g.fillCircle(15, -8, 5);

    g.fillStyle(WHITE, 1);
    g.fillCircle(-9, -11, 2);
    g.fillStyle(WHITE, 1);
    g.fillCircle(17, -11, 2);

    g.fillStyle(ROSE, 0.45);
    g.fillEllipse(-20, 2, 14, 8);
    g.fillStyle(ROSE, 0.45);
    g.fillEllipse(20, 2, 14, 8);

    g.fillStyle(AMBER_DARK, 0.7);
    g.fillEllipse(0, 14, 22, 10);
    g.fillStyle(AMBER, 1);
    g.fillRect(-11, 4, 22, 8);

    container.add(g);
  }

  private drawArm(g: Phaser.GameObjects.Graphics, side: 'left' | 'right'): void {
    const dir = side === 'left' ? -1 : 1;
    g.fillStyle(AMBER, 1);
    g.fillEllipse(dir * 8, 0, 20, 28);
    g.lineStyle(2, AMBER_DARK, 0.8);
    g.strokeEllipse(dir * 8, 0, 20, 28);
  }

  // ── T14: Speech bubble + idle timer API ───────────────────────────────────

  /**
   * Show a speech bubble above Quest's head with `text`, lasting `durationMs`
   * milliseconds before fading out. Any previously visible bubble is
   * dismissed instantly before the new one appears.
   */
  showSpeechBubble(text: string, durationMs: number): void {
    this.dismissBubble();

    const PAD = 24;
    const MAX_W = 300;

    // Measure text to size the bubble
    const measurer = this.scene.add
      .text(0, 0, text, {
        fontSize: '18px',
        fontFamily: BODY_FONT,
        wordWrap: { width: MAX_W - PAD * 2 },
      })
      .setAlpha(0);
    const tw = Math.min(measurer.width + PAD * 2, MAX_W);
    const th = measurer.height + PAD;
    measurer.destroy();

    // Position: above Quest's head in world-space
    const worldX = this.x;
    let worldY = this.y - (BODY_R + HAT_H) * this.scaleY - th - 16;

    // Constrain bubble to stay within viewport bounds
    const MIN_Y = th / 2 + 10; // Allow 10px padding at top
    const MAX_Y = 1280 - th / 2 - 10; // Allow 10px padding at bottom
    worldY = Math.max(MIN_Y, Math.min(worldY, MAX_Y));

    const bg = this.scene.add.graphics();
    bg.fillStyle(WHITE, 1);
    bg.fillRoundedRect(-tw / 2, -th / 2, tw, th, 12);
    bg.lineStyle(2, NAVY, 1);
    bg.strokeRoundedRect(-tw / 2, -th / 2, tw, th, 12);
    // Small tail pointing down-centre
    bg.fillStyle(WHITE, 1);
    bg.fillTriangle(-8, th / 2 - 1, 8, th / 2 - 1, 0, th / 2 + 10);
    bg.lineStyle(2, NAVY, 1);
    bg.strokeTriangle(-8, th / 2 - 1, 8, th / 2 - 1, 0, th / 2 + 10);

    const label = this.scene.add
      .text(0, 0, text, {
        fontSize: '18px',
        fontFamily: BODY_FONT,
        color: NAVY_HEX,
        align: 'center',
        wordWrap: { width: tw - PAD },
      })
      .setOrigin(0.5);

    const container = this.scene.add.container(worldX, worldY, [bg, label]);
    container.setDepth((this.depth ?? 5) + 10);
    container.setAlpha(0);

    this.currentBubble = container;

    if (this.reduceMotion) {
      container.setAlpha(1);
      this.scene.time.delayedCall(durationMs, () => {
        if (this.currentBubble === container) this.dismissBubble();
      });
      return;
    }

    this.scene.tweens.add({
      targets: container,
      alpha: 1,
      duration: 200,
      ease: 'Cubic.easeOut',
    });

    this.scene.time.delayedCall(durationMs, () => {
      if (this.currentBubble !== container) return;
      this.scene.tweens.add({
        targets: container,
        alpha: 0,
        duration: 300,
        ease: 'Cubic.easeIn',
        onComplete: () => {
          if (this.currentBubble === container) {
            container.destroy();
            this.currentBubble = null;
          }
        },
      });
    });
  }

  /**
   * Dismiss any visible speech bubble immediately (no fade).
   */
  dismissBubble(): void {
    if (this.currentBubble) {
      this.currentBubble.destroy();
      this.currentBubble = null;
    }
  }

  /**
   * T14: Start three-stage idle escalation. Call after each question loads.
   * Stage 1 at 10 s — think + "Hmm... 🤔"
   * Stage 2 at 18 s — wave + "Psst! Over here! 👋"
   * Stage 3 at 28 s — cheer + "Let's go, I believe in you! ⭐"
   */
  startIdleTimer(): void {
    this.resetIdleTimer();
    const add = (delay: number, fn: () => void) =>
      this.idleTimerEvents.push(
        this.scene.time.addEvent({ delay, callback: fn, callbackScope: this })
      );

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
    add(38_000, () => {
      this.setState('sleep');
    });
  }

  /**
   * T14: Reset all idle timers and dismiss any active speech bubble.
   */
  resetIdleTimer(): void {
    for (const ev of this.idleTimerEvents) ev.destroy();
    this.idleTimerEvents = [];
    this.dismissBubble();
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  override destroy(fromScene?: boolean): void {
    this.resetIdleTimer();
    this.clearSleepFx();
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

  // ── Helpers ───────────────────────────────────────────────────────────────

  /** Stop all active tweens and reset to the stable resting state. */
  private stopCurrent(): void {
    if (this.idleTween) {
      this.idleTween.stop();
      this.idleTween = null;
    }
    this.scene.tweens.killTweensOf(this);
    this.scene.tweens.killTweensOf(this.face);
    this.scene.tweens.killTweensOf(this.rightArm);

    this.clearSleepFx();

    this.setPosition(this.x, this.baseY);
    this.setScale(this.baseScale);
    this.setAngle(0);
    this.face.setAngle(0);
    this.rightArm.setAngle(0);
  }

  /**
   * Create and attach a hidden DOM sentinel so Playwright tests can read the
   * current mascot state without inspecting the Phaser canvas.
   * Returns null in SSR / non-browser environments.
   */
  private static mountStateSentinel(): HTMLElement | null {
    if (typeof document === 'undefined') return null;
    const existing = document.querySelector('[data-testid="mascot-state"]');
    if (existing instanceof HTMLElement) {
      existing.remove();
    }
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
