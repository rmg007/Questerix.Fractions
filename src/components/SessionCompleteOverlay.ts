/**
 * SessionCompleteOverlay — trophy level-complete screen.
 * A full-screen sky-blue card slides up from below viewport with animated stars,
 * confetti, and action buttons. Stars: 1 = <60%, 2 = 60–89%, 3 = 90%+.
 * per interaction-model.md §6.2, design-language.md §6.4 (reduced-motion)
 */

import * as Phaser from 'phaser';
import { AccessibilityAnnouncer } from './AccessibilityAnnouncer';
import { A11yLayer } from './A11yLayer';
import { TestHooks } from '../scenes/utils/TestHooks';
import { sfx } from '../audio/SFXService';
import { checkReduceMotion } from '../lib/preferences';
import { announce as liveAnnounce } from '../lib/a11y/liveRegion';
import {
  animateTrophyWave,
  startGlowSync,
  animateStars,
  animateEntrance,
} from './sessionComplete/animations';
import { createButton } from './sessionComplete/buttons';
import { createScaffoldBanner } from './sessionComplete/scaffoldBanner';
import { starsFromAccuracy, calculateAccuracy } from './sessionComplete/scoring';
import {
  createCardBackground,
  createTrophy,
  createHeading,
  createStars,
  createPerfectLine,
  createEncouragement,
  createAccuracyText,
  encouragementLine,
} from './sessionComplete/layout';

export interface SessionCompleteConfig {
  scene: Phaser.Scene;
  levelNumber: number;
  correctCount: number;
  totalAttempts: number;
  width?: number;
  height?: number;
  depth?: number;
  onNextLevel?: () => void;
  onPlayAgain: () => void;
  onMenu: () => void;
  /** T11: Drives the scaffold banner text + tap target below the stars. */
  scaffoldRecommendation?: 'advance' | 'stay' | 'regress';
  /** T11: Passed alongside scaffoldRecommendation so the banner knows which level to name. */
  nextLevelNumber?: number | null;
  /** T15: When true, renders a gold "PERFECT!" variant instead of the sky-blue standard. */
  isPerfect?: boolean;
}

export class SessionCompleteOverlay {
  private readonly container: Phaser.GameObjects.Container;
  private readonly starTexts: Phaser.GameObjects.Text[] = [];
  private glowTween: Phaser.Tweens.Tween | null = null;
  private announced = false;

  constructor(config: SessionCompleteConfig) {
    const {
      scene,
      levelNumber,
      correctCount,
      totalAttempts,
      width = 800,
      height = 1280,
      depth = 50,
      onNextLevel,
      onPlayAgain,
      onMenu,
      scaffoldRecommendation,
      nextLevelNumber,
      isPerfect = false,
    } = config;

    const cx = width / 2;
    const reduceMotion = checkReduceMotion();

    const starCount = starsFromAccuracy(correctCount, totalAttempts);
    const accuracy = calculateAccuracy(correctCount, totalAttempts);

    // Container origin at (0, 0); starts below viewport, slides to y = 0.
    this.container = scene.add.container(0, reduceMotion ? 0 : height).setDepth(depth);

    // WCAG 2.1 AA: register accessibility layer for buttons
    A11yLayer.pushLayer(
      'session-complete',
      `Level ${levelNumber} complete! You earned ${starCount} ${starCount === 1 ? 'star' : 'stars'}.`
    );

    this.container.add(createCardBackground(scene, width, height, isPerfect));
    const trophyT = createTrophy(scene, cx, isPerfect, reduceMotion);
    this.container.add(trophyT);
    const headingT = createHeading(scene, cx, levelNumber, isPerfect);
    this.container.add(headingT);

    this.starTexts.push(...createStars(scene, cx, starCount));
    for (const st of this.starTexts) this.container.add(st);

    if (isPerfect) {
      this.container.add(createPerfectLine(scene, cx, width));
    }
    this.container.add(
      createEncouragement(
        scene,
        cx,
        width,
        isPerfect,
        encouragementLine(starCount as 1 | 2 | 3, isPerfect)
      )
    );
    this.container.add(
      createAccuracyText(scene, cx, isPerfect, correctCount, totalAttempts, accuracy)
    );

    if (scaffoldRecommendation) {
      const objs = createScaffoldBanner({
        scene,
        cx,
        y: isPerfect ? 760 : 740,
        recommendation: scaffoldRecommendation,
        nextLevelNumber,
        reduceMotion,
        onNextLevel,
        onPlayAgain,
        onMenu,
      });
      this.container.add(objs);
    }

    // Buttons — pushed down to account for banner
    const btnBaseY = scaffoldRecommendation ? 860 : 800;
    const addBtn = (
      x: number,
      y: number,
      label: string,
      onTap: () => void,
      variant: 'primary' | 'secondary',
      a11yKey: string,
      a11yLabel: string,
      testHookKey?: string,
      testHookOpts?: { width: string; height: string; top: string; left: string }
    ): void => {
      const objs = createButton({
        scene,
        x,
        y,
        label,
        onTap,
        variant,
        a11yKey,
        a11yLabel,
        ...(testHookKey && testHookOpts ? { testHookKey, testHookOpts } : {}),
      });
      this.container.add(objs);
    };
    // BTN_STRIDE: 110 px = 100 px button height + 10 px gap.
    // Buttons are now 100 canvas px tall (≥ 44 CSS px at 360 vp, WCAG 2.5.5).
    const BTN_STRIDE = 110;
    if (onNextLevel && !scaffoldRecommendation) {
      addBtn(
        cx,
        btnBaseY,
        'Next Level →',
        onNextLevel,
        'primary',
        'a11y-session-complete-next',
        'Continue to the next level',
        'next-level-btn',
        { width: '200px', height: '100px', top: '62%', left: '50%' }
      );
      addBtn(
        cx,
        btnBaseY + BTN_STRIDE,
        'Play Again',
        onPlayAgain,
        'primary',
        'a11y-session-complete-again',
        'Play this level again'
      );
      addBtn(
        cx,
        btnBaseY + BTN_STRIDE * 2,
        'Back to Menu',
        onMenu,
        'secondary',
        'a11y-session-complete-menu',
        'Return to main menu',
        'session-complete-menu',
        {
          width: '300px',
          height: '100px',
          top: `${(((btnBaseY + BTN_STRIDE * 2) / 1280) * 100).toFixed(1)}%`,
          left: `${((cx / 800) * 100).toFixed(1)}%`,
        }
      );
    } else {
      addBtn(
        cx,
        btnBaseY,
        'Play Again',
        onPlayAgain,
        'primary',
        'a11y-session-complete-again',
        'Play this level again'
      );
      addBtn(
        cx,
        btnBaseY + BTN_STRIDE,
        'Back to Menu',
        onMenu,
        'secondary',
        'a11y-session-complete-menu',
        'Return to main menu',
        'session-complete-menu',
        {
          width: '300px',
          height: '100px',
          top: `${(((btnBaseY + BTN_STRIDE) / 1280) * 100).toFixed(1)}%`,
          left: `${((cx / 800) * 100).toFixed(1)}%`,
        }
      );
    }

    // Mount sentinel immediately so tests can observe completion-screen as soon
    // as the overlay is constructed, regardless of animation duration.
    TestHooks.mountSentinel('completion-screen');
    this.announce(levelNumber, starCount);

    if (reduceMotion) {
      for (const st of this.starTexts) st.setScale(1);
      if (isPerfect) sfx.playPerfectFanfare();
      else sfx.playComplete();
      this.announce(levelNumber, starCount);
      return;
    }

    // Overlay entrance — panel slides in from below the viewport.
    animateEntrance(scene, this.container, () => {
      if (isPerfect) sfx.playPerfectFanfare();
      else sfx.playComplete();
      animateTrophyWave(scene, trophyT, () => {
        this.glowTween = startGlowSync(scene, headingT);
        animateStars(
          scene,
          this.starTexts,
          cx,
          530,
          depth,
          () => this.announce(levelNumber, starCount),
          isPerfect ? 80 : 40,
          isPerfect
        );
      });
    });
  }

  private announce(levelNumber: number, stars: number): void {
    if (this.announced) return;
    this.announced = true;
    const word = stars === 1 ? 'star' : 'stars';
    AccessibilityAnnouncer.announce(`Level ${levelNumber} complete! You earned ${stars} ${word}.`);
    // Phase 2 (a11y-parity): also push to ARIA live region so screen readers
    // outside the canvas hear the level-complete event. Assertive urgency
    // interrupts any in-progress reading — appropriate for a major milestone.
    liveAnnounce('Level complete!', 'assertive');
  }

  destroy(): void {
    if (this.glowTween) {
      this.glowTween.stop();
      this.glowTween = null;
    }
    A11yLayer.popLayer();
    this.container.destroy(true);
    this.starTexts.length = 0;
  }
}
