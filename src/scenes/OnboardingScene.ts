/**
 * OnboardingScene — ~60-second first-play drag tutorial for K-2 learners.
 *
 * Shown once per device before the student's first Level 1 attempt.
 * Gate: localStorage key 'questerix.onboardingSeen' — absent on first boot,
 * set to '1' when the student completes or skips the tutorial.
 *
 * 3-step wizard:
 *   Step 1 — WATCH  : animated demo of the drag mechanic (auto-plays ~15 s)
 *   Step 2 — TRY    : interactive practice on a real shape
 *   Step 3 — DONE   : celebration + "Let's Play!" button → Level01Scene
 *
 * per open-questions Q4 (first-time drag instruction)
 * per design-language.md §2–§6 (adventure palette, motion, typography)
 * per accessibility.md §7 (TTS narration for every on-screen instruction)
 */

import * as Phaser from 'phaser';
import {
  drawAdventureBackground,
  createActionButton,
  TITLE_FONT,
  BODY_FONT,
  NAVY,
  NAVY_HEX,
  PATH_BLUE,
  ACTION_FILL,
} from './utils/levelTheme';
import { TestHooks } from './utils/TestHooks';
import { A11yLayer } from '../components/A11yLayer';
import { DragHandle } from '../components/DragHandle';
import { Mascot } from '../components/Mascot';
import { tts } from '../audio/TTSService';
import { fadeAndStart } from './utils/sceneTransition';

// ── Onboarding completion gate ────────────────────────────────────────────────
// Backed by `DeviceMeta.onboardingComplete` in IndexedDB (per C5; v7 schema).
// The legacy `questerix.onboardingSeen` localStorage key is auto-migrated by
// the v6→v7 upgrade callback in `src/persistence/db.ts`.

// ── Canvas layout ─────────────────────────────────────────────────────────────
const CW = 800;
const CH = 1280;
const SHAPE_CX = CW / 2;
const SHAPE_CY = CH / 2 - 60;
const SHAPE_W = 340;
const SHAPE_H = 260;

// Generous snap tolerance so practice always succeeds — onboarding isn't scored
const ONBOARDING_SNAP_PCT = 0.22;
// Max relative area difference to count practice as "close enough"
const CLOSE_ENOUGH_DELTA = 0.32;

type OnboardingStep = 'watch' | 'try' | 'done';

interface OnboardingData {
  studentId?: string | null;
}

export class OnboardingScene extends Phaser.Scene {
  private studentId: string | null = null;
  private step: OnboardingStep = 'watch';

  // Handle tracking
  private handlePos: number = SHAPE_CX;
  private inputLocked: boolean = true;

  // Graphics
  private shapeGraphics!: Phaser.GameObjects.Graphics;
  private partitionLine!: Phaser.GameObjects.Graphics;
  private dragHandle: DragHandle | null = null;

  // UI elements
  private mascot!: Mascot;
  private instructionText!: Phaser.GameObjects.Text;
  private stepBadge!: Phaser.GameObjects.Text;
  private actionBtn!: Phaser.GameObjects.Container;
  private handPointer!: Phaser.GameObjects.Text;
  private skipText!: Phaser.GameObjects.Text;
  // T9: timers and tweens for Step 1 demo — stored so tap-to-skip can cancel them
  private watchTimers: Phaser.Time.TimerEvent[] = [];
  private demoTween: Phaser.Tweens.Tween | null = null;
  private tapSkipHint: Phaser.GameObjects.Text | null = null;
  private stepDots: Phaser.GameObjects.Graphics[] = [];

  constructor() {
    super({ key: 'OnboardingScene' });
  }

  init(data: OnboardingData): void {
    this.studentId = data?.studentId ?? null;
    this.step = 'watch';
    this.inputLocked = true;
    this.handlePos = SHAPE_CX - SHAPE_W * 0.3;
  }

  create(): void {
    TestHooks.unmountAll();
    TestHooks.mountSentinel('onboarding-scene');

    drawAdventureBackground(this, CW, CH);

    try {
      if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        this.cameras.main.fadeIn(400, 0, 0, 0);
      }
    } catch {
      /* ignore */
    }

    // ── Title ─────────────────────────────────────────────────────────────────
    this.add
      .text(CW / 2, 72, 'How to Play', {
        fontSize: '40px',
        fontFamily: TITLE_FONT,
        fontStyle: 'bold',
        color: NAVY_HEX,
        stroke: '#FFFFFF',
        strokeThickness: 3,
      })
      .setOrigin(0.5)
      .setDepth(5);

    // ── Step badge ────────────────────────────────────────────────────────────
    this.stepBadge = this.add
      .text(CW / 2, 132, 'Step 1 of 3', {
        fontSize: '20px',
        fontFamily: BODY_FONT,
        color: '#475569',
      })
      .setOrigin(0.5)
      .setDepth(5);

    // ── Step dots ─────────────────────────────────────────────────────────────
    const startX = CW / 2 - 32;
    for (let i = 0; i < 3; i++) {
      const dot = this.add.graphics().setDepth(5);
      dot.setPosition(startX + i * 32, 165);
      this.stepDots.push(dot);
    }
    this.updateStepDots(0);

    // ── Mascot ────────────────────────────────────────────────────────────────
    this.mascot = new Mascot(this, 715, 185, 0.75);
    this.mascot.setState('idle');

    // ── Instruction text ──────────────────────────────────────────────────────
    this.instructionText = this.add
      .text(CW / 2, 245, '', {
        fontSize: '24px',
        fontFamily: BODY_FONT,
        fontStyle: 'bold',
        color: NAVY_HEX,
        align: 'center',
        wordWrap: { width: 600 },
        backgroundColor: 'rgba(255,255,255,0.88)',
        padding: { x: 16, y: 10 },
      })
      .setOrigin(0.5)
      .setDepth(5);

    // ── Shape + partition line ────────────────────────────────────────────────
    this.shapeGraphics = this.add.graphics().setDepth(5);
    this.partitionLine = this.add.graphics().setDepth(6);

    // ── Animated hand pointer (emoji) ─────────────────────────────────────────
    this.handPointer = this.add
      .text(0, 0, '👆', { fontSize: '48px' })
      .setOrigin(0.5)
      .setDepth(10)
      .setVisible(false);

    // ── Action button (hidden until Step 2) ──────────────────────────────────
    this.actionBtn = createActionButton(this, CW / 2, CH - 178, 'Check ✓', () => {
      this.onActionTap();
    });
    this.actionBtn.setAlpha(0); // hidden until step 2

    // ── Skip link ─────────────────────────────────────────────────────────────
    this.skipText = this.add
      .text(CW / 2, CH - 90, 'Skip tutorial', {
        fontSize: '20px',
        fontFamily: BODY_FONT,
        color: NAVY_HEX,
        padding: { x: 12, y: 12 },
      })
      .setOrigin(0.5)
      .setDepth(35)
      .setInteractive({ useHandCursor: true });

    // Subtle navy underline/border
    const skipUnderline = this.add.graphics().setDepth(5);
    skipUnderline.lineStyle(2, NAVY, 0.5);
    skipUnderline.lineBetween(
      CW / 2 - this.skipText.width / 2,
      CH - 90 + this.skipText.height / 2 - 8,
      CW / 2 + this.skipText.width / 2,
      CH - 90 + this.skipText.height / 2 - 8
    );

    this.skipText.on('pointerup', () => this.completeOnboarding());

    // ── Accessibility ─────────────────────────────────────────────────────────
    A11yLayer.unmountAll();
    A11yLayer.mountAction('a11y-skip-onboarding', 'Skip tutorial, go straight to game', () => {
      this.completeOnboarding();
    });

    // ── Test hooks ────────────────────────────────────────────────────────────
    TestHooks.mountInteractive('onboarding-skip-btn', () => this.completeOnboarding(), {
      width: '200px',
      height: '44px',
      top: '93%',
      left: '50%',
    });
    TestHooks.mountInteractive('onboarding-action-btn', () => this.onActionTap(), {
      width: '320px',
      height: '64px',
      top: '82%',
      left: '50%',
    });

    // Draw shape and start tutorial
    this.drawShape();
    this.startWatchStep();
  }

  // ── Shape rendering ───────────────────────────────────────────────────────

  private drawShape(): void {
    const g = this.shapeGraphics;
    g.clear();
    const x = SHAPE_CX - SHAPE_W / 2;
    const y = SHAPE_CY - SHAPE_H / 2;
    g.fillStyle(0xffffff, 0.9);
    g.fillRect(x, y, SHAPE_W, SHAPE_H);
    g.lineStyle(3, 0x1e3a8a, 0.35);
    g.strokeRect(x, y, SHAPE_W, SHAPE_H);
    this.updatePartitionLine(this.handlePos);
  }

  private updatePartitionLine(x: number): void {
    const g = this.partitionLine;
    g.clear();
    const top = SHAPE_CY - SHAPE_H / 2 - 20;
    const bottom = SHAPE_CY + SHAPE_H / 2 + 20;

    // B3 fix: single solid line replaces per-frame dashed-loop (~15 segments).
    // The light-blue center stripe gives the same visual intent without the FPS hit.
    g.lineStyle(12, PATH_BLUE, 1);
    g.lineBetween(x, top, x, bottom);
    g.lineStyle(4, 0xffffff, 0.6);
    g.lineBetween(x, top, x, bottom);
  }

  // ── Step 1: WATCH — animated drag demonstration ───────────────────────────

  private startWatchStep(): void {
    this.step = 'watch';
    this.stepBadge.setText('Step 1 of 3');
    this.updateStepDots(0);
    this.inputLocked = true;

    const msg = 'Watch! Drag the line to the middle to cut the shape in half.';
    this.instructionText.setText(msg);
    tts.speak(msg);
    this.mascot.setState('idle');

    this.handlePos = SHAPE_CX - SHAPE_W * 0.3;
    this.updatePartitionLine(this.handlePos);

    // T9 Fix 1: Hand pointer now at the drag-handle's actual vertical center
    const handY = SHAPE_CY;
    this.handPointer.setPosition(this.handlePos, handY).setVisible(true);

    // T9 Fix 2: "Tap to skip" hint at bottom of screen
    if (!this.tapSkipHint) {
      this.tapSkipHint = this.add
        .text(SHAPE_CX, CH - 120, 'Tap anywhere to skip', {
          fontFamily: BODY_FONT,
          fontSize: '16px',
          color: NAVY_HEX,
          alpha: 0.5,
        } as Phaser.Types.GameObjects.Text.TextStyle)
        .setOrigin(0.5)
        .setAlpha(0.5)
        .setDepth(30);
    }

    // Tap-to-advance: any tap during the demo skips straight to the try step
    const skipHit = this.add
      .rectangle(SHAPE_CX, CH / 2, CW, CH, 0, 0)
      .setInteractive()
      .setDepth(29);
    skipHit.once('pointerup', () => {
      for (const t of this.watchTimers) t.destroy();
      this.watchTimers = [];
      this.demoTween?.stop();
      this.demoTween = null;
      skipHit.destroy();
      this.tapSkipHint?.destroy();
      this.tapSkipHint = null;
      this.startTryStep();
    });

    // Wait 1.8 s then animate the drag — store timer so tap can cancel it
    this.watchTimers.push(this.time.delayedCall(1800, () => this.playDemoAnimation()));
  }

  private playDemoAnimation(): void {
    const reduceMotion = this.checkReduceMotion();
    const startX = SHAPE_CX - SHAPE_W * 0.3;
    const endX = SHAPE_CX;
    // T9 Fix 1: hand Y at shape center (drag handle center), not below shape
    const handY = SHAPE_CY;

    if (reduceMotion) {
      // Static jump for prefers-reduced-motion
      this.handlePos = endX;
      this.updatePartitionLine(endX);
      this.handPointer.setPosition(endX, handY);
      this.watchTimers.push(this.time.delayedCall(800, () => this.afterDemoComplete()));
      return;
    }

    const tweenProxy = { x: startX };
    this.demoTween = this.tweens.add({
      targets: tweenProxy,
      x: endX,
      duration: 1600,
      ease: 'Sine.easeInOut',
      onUpdate: () => {
        this.handlePos = tweenProxy.x;
        this.updatePartitionLine(tweenProxy.x);
        this.handPointer.setPosition(tweenProxy.x, handY);
      },
      onComplete: () => {
        this.demoTween = null;
        this.mascot.setState('cheer');
        // Pause on the correct position so the student sees success
        this.watchTimers.push(this.time.delayedCall(1400, () => this.afterDemoComplete()));
      },
    });
  }

  private afterDemoComplete(): void {
    // Show a brief "Did you see that?" pause, then prompt practice
    const msg = 'Did you see that? Now you try!';
    this.instructionText.setText(msg);
    tts.speak(msg);
    this.mascot.setState('idle');

    this.watchTimers.push(this.time.delayedCall(2200, () => this.startTryStep()));
  }

  // ── Step 2: TRY — interactive practice ───────────────────────────────────

  private startTryStep(): void {
    this.step = 'try';
    this.stepBadge.setText('Step 2 of 3');
    this.updateStepDots(1);
    this.handPointer.setVisible(false);

    const msg = 'Your turn! Drag the line to the middle of the shape.';
    this.instructionText.setText(msg);
    tts.speak(msg);
    this.mascot.setState('idle');

    // Reset handle to starting offset so it's clearly not centered
    this.handlePos = SHAPE_CX - SHAPE_W * 0.3;
    this.updatePartitionLine(this.handlePos);

    // Allow drag input
    this.inputLocked = false;
    this.createDragHandle();

    // Show action button
    this.tweens.add({ targets: this.actionBtn, alpha: 1, duration: 300 });
  }

  private createDragHandle(): void {
    this.dragHandle?.destroy();
    const minX = SHAPE_CX - SHAPE_W / 2;
    const maxX = SHAPE_CX + SHAPE_W / 2;
    const snapThreshold = SHAPE_W * ONBOARDING_SNAP_PCT;

    this.dragHandle = new DragHandle({
      scene: this,
      x: this.handlePos,
      y: SHAPE_CY,
      trackLength: SHAPE_H + 40,
      axis: 'horizontal',
      minPos: minX,
      maxPos: maxX,
      snapThreshold,
      snapTargets: [SHAPE_CX],
      depth: 20,
      onMove: (pos) => {
        if (!this.inputLocked) {
          this.handlePos = pos;
          this.updatePartitionLine(pos);
        }
      },
      onCommit: (pos) => {
        this.handlePos = pos;
        this.updatePartitionLine(pos);
      },
    });
  }

  private onActionTap(): void {
    if (this.step === 'try') {
      this.checkPracticeAnswer();
    } else if (this.step === 'done') {
      this.completeOnboarding();
    }
  }

  private checkPracticeAnswer(): void {
    if (this.inputLocked) return;
    this.inputLocked = true;

    // Snap-on-submit if within generous threshold
    if (Math.abs(this.handlePos - SHAPE_CX) <= SHAPE_W * ONBOARDING_SNAP_PCT) {
      this.handlePos = SHAPE_CX;
      this.updatePartitionLine(SHAPE_CX);
    }

    const leftArea = this.handlePos - (SHAPE_CX - SHAPE_W / 2);
    const rightArea = SHAPE_CX + SHAPE_W / 2 - this.handlePos;
    const relativeDelta = Math.abs(leftArea - rightArea) / ((leftArea + rightArea) / 2);

    if (relativeDelta <= CLOSE_ENOUGH_DELTA) {
      this.showDoneStep();
    } else {
      // Encourage and let them try again
      const msg = 'Almost! Drag the line a little closer to the middle and try again.';
      this.instructionText.setText(msg);
      tts.speak(msg);
      this.mascot.setState('oops');
      this.inputLocked = false;
    }
  }

  // ── Step 3: DONE — celebration ───────────────────────────────────────────

  private showDoneStep(): void {
    this.step = 'done';
    this.stepBadge.setText('Step 3 of 3');
    this.updateStepDots(2);
    this.inputLocked = true;

    const msg = 'Amazing! You did it! Ready to play the game?';
    this.instructionText.setText(msg);
    tts.speak(msg);
    this.mascot.setState('cheer-big');

    // Change button label to "Let's Play!"
    const txt = this.actionBtn.getAt(2) as Phaser.GameObjects.Text;
    txt.setText("Let's Play! 🎉");
    txt.setFontSize('32px');

    // Hide skip — no longer needed once tutorial is complete
    this.skipText.setVisible(false);
  }

  // ── Step dots ─────────────────────────────────────────────────────────────

  private updateStepDots(activeIndex: number): void {
    const RADIUS = 14;
    this.stepDots.forEach((dot, i) => {
      dot.clear();
      if (i === activeIndex) {
        dot.fillStyle(ACTION_FILL, 1);
        dot.fillCircle(0, 0, RADIUS);
      }
      dot.lineStyle(2, NAVY, 1);
      dot.strokeCircle(0, 0, RADIUS);
    });
  }

  // ── Completion ───────────────────────────────────────────────────────────

  private completeOnboarding(): void {
    // Persist completion through deviceMetaRepo (replaces localStorage per C5).
    // Fire-and-forget — onboarding completes its UI transition regardless of DB success.
    void (async () => {
      try {
        const { deviceMetaRepo } = await import('../persistence/repositories/deviceMeta');
        await deviceMetaRepo.setOnboardingComplete(true);
      } catch {
        /* non-critical — onboarding gate is forward-looking; UI still proceeds */
      }
    })();

    tts.stop();
    A11yLayer.unmountAll();
    TestHooks.unmountAll();

    fadeAndStart(this, 'Level01Scene', { studentId: this.studentId });
  }

  // ── Utilities ────────────────────────────────────────────────────────────

  private checkReduceMotion(): boolean {
    try {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch {
      return false;
    }
  }

  preDestroy(): void {
    A11yLayer.unmountAll();
    TestHooks.unmountAll();
    this.dragHandle?.destroy();
    this.dragHandle = null;
  }
}
