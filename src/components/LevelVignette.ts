/* eslint-disable max-lines */
/**
 * LevelVignette — 2.5-second illustrated intro clip shown once per session
 * before the first question loads. Each of L1–L9 gets a unique mini-scene
 * that sets the thematic context. Auto-dismisses or skips on tap.
 * per plans/visual-game-ideas.md §3-E
 */

import * as Phaser from 'phaser';
import { NAVY, NAVY_HEX, TITLE_FONT, BODY_FONT } from '../scenes/utils/levelTheme';
import { checkReduceMotion } from '../lib/preferences';
import {
  CW,
  CH,
  CARD_W,
  CARD_H,
  CARD_CX,
  CARD_CY,
  ART_CX,
  ART_CY,
  ART_W,
  ART_H,
  AUTO_DISMISS_MS,
  DEPTH_OVERLAY,
  DEPTH_CARD,
  createAnimateInTweens,
  createAnimateOutTweens,
  SCENE_FNS,
  SceneCtx,
} from './VignetteAnimations';

// ── Per-level metadata ────────────────────────────────────────────────────────

const LEVEL_META: Record<number, { label: string; tagline: string; bgColor: number }> = {
  1: { label: 'Level 1 — Halves', tagline: 'Help share the food equally!', bgColor: 0xfff8e7 },
  2: { label: 'Level 2 — Thirds', tagline: 'Plant seeds in equal rows!', bgColor: 0xf0fdf4 },
  3: { label: 'Level 3 — Quarters', tagline: 'Explore the four-part park!', bgColor: 0xe0f2fe },
  4: { label: 'Level 4 — Identifying', tagline: 'Name every fraction you see!', bgColor: 0xf5f3ff },
  5: { label: 'Level 5 — Equivalent', tagline: 'Different shapes, same value!', bgColor: 0xfff1f2 },
  6: { label: 'Level 6 — Comparing', tagline: 'Which fraction is bigger?', bgColor: 0xf0fdf4 },
  7: {
    label: 'Level 7 — Ordering',
    tagline: 'Arrange them smallest to largest!',
    bgColor: 0xeef2ff,
  },
  8: {
    label: 'Level 8 — Benchmark ½',
    tagline: 'Is it more or less than one half?',
    bgColor: 0xe0f2fe,
  },
  9: {
    label: 'Level 9 — Mixed Review',
    tagline: 'Navigate the fraction galaxy!',
    bgColor: 0x0a1128,
  },
};

// ── Main class ────────────────────────────────────────────────────────────────

export class LevelVignette {
  private readonly scene: Phaser.Scene;
  private readonly levelNumber: number;
  private overlay!: Phaser.GameObjects.Rectangle;
  private card!: Phaser.GameObjects.Container;
  private dismissed = false;
  private onCompleteCb: (() => void) | null = null;

  // Tracked for cleanup on early dismiss
  private tweenRefs: Phaser.Tweens.Tween[] = [];
  private timerRefs: Phaser.Time.TimerEvent[] = [];
  private artObjects: Phaser.GameObjects.GameObject[] = [];

  constructor(scene: Phaser.Scene, levelNumber: number) {
    this.scene = scene;
    this.levelNumber = levelNumber;
  }

  play(onComplete: () => void): void {
    this.onCompleteCb = onComplete;
    this.buildOverlay();
    this.buildCard();

    if (checkReduceMotion()) {
      // Instant show — let the card sit for AUTO_DISMISS_MS then exit
      this.scheduleAutoDismiss(AUTO_DISMISS_MS);
    } else {
      this.animateIn(() => {
        this.scheduleAutoDismiss(AUTO_DISMISS_MS);
        this.drawSceneAnimation();
      });
    }

    // Tap anywhere to skip
    this.scene.input.once('pointerdown', () => this.dismiss());
  }

  dismiss(): void {
    if (this.dismissed) return;
    this.dismissed = true;

    // Kill all pending timers + tweens
    for (const t of this.timerRefs) t.remove(false);
    for (const tw of this.tweenRefs) tw.stop();
    this.timerRefs = [];
    this.tweenRefs = [];

    if (checkReduceMotion()) {
      this.cleanupAndComplete();
    } else {
      this.animateOut(() => this.cleanupAndComplete());
    }
  }

  destroy(): void {
    for (const t of this.timerRefs) t.remove(false);
    for (const tw of this.tweenRefs) tw.stop();
    for (const obj of this.artObjects) {
      if ((obj as Phaser.GameObjects.GameObject & { destroy?: () => void }).destroy) {
        (obj as Phaser.GameObjects.GameObject & { destroy: () => void }).destroy();
      }
    }
    this.overlay?.destroy();
    this.card?.destroy();
  }

  // ── Build helpers ───────────────────────────────────────────────────────────

  private buildOverlay(): void {
    this.overlay = this.scene.add
      .rectangle(CW / 2, CH / 2, CW, CH, 0x000000, 0.58)
      .setDepth(DEPTH_OVERLAY)
      .setAlpha(checkReduceMotion() ? 0.58 : 0);
  }

  private buildCard(): void {
    const meta = LEVEL_META[this.levelNumber] ?? LEVEL_META[1]!;
    const isSpace = this.levelNumber === 9;

    // Card background
    const cardBg = this.scene.add.graphics();
    cardBg.fillStyle(isSpace ? 0x0a1128 : 0xffffff, 1);
    cardBg.fillRoundedRect(-CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H, 24);
    cardBg.lineStyle(3, NAVY, isSpace ? 0.4 : 1);
    cardBg.strokeRoundedRect(-CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H, 24);

    // Artbox tinted background
    const artBg = this.scene.add.graphics();
    artBg.fillStyle(meta.bgColor, isSpace ? 1 : 0.55);
    artBg.fillRoundedRect(ART_CX - ART_W / 2, ART_CY - ART_H / 2, ART_W, ART_H, 14);
    artBg.lineStyle(2, isSpace ? 0x3730a3 : NAVY, 0.2);
    artBg.strokeRoundedRect(ART_CX - ART_W / 2, ART_CY - ART_H / 2, ART_W, ART_H, 14);

    // Level label
    const titleColor = isSpace ? '#c7d2fe' : NAVY_HEX;
    const levelLabel = this.scene.add
      .text(0, 90, meta.label, {
        fontSize: '32px',
        fontFamily: TITLE_FONT,
        fontStyle: 'bold',
        color: titleColor,
        align: 'center',
      })
      .setOrigin(0.5);

    // Tagline
    const taglineColor = isSpace ? '#a5b4fc' : '#374151';
    const tagline = this.scene.add
      .text(0, 142, meta.tagline, {
        fontSize: '24px',
        fontFamily: BODY_FONT,
        color: taglineColor,
        align: 'center',
        wordWrap: { width: CARD_W - 80 },
      })
      .setOrigin(0.5);

    // Skip hint
    const skipColor = isSpace ? '#6366f1' : '#9ca3af';
    const skipHint = this.scene.add
      .text(0, 225, 'Tap to skip →', {
        fontSize: '17px',
        fontFamily: BODY_FONT,
        color: skipColor,
      })
      .setOrigin(0.5)
      .setAlpha(0.7);

    this.card = this.scene.add
      .container(CARD_CX, CARD_CY, [cardBg, artBg, levelLabel, tagline, skipHint])
      .setDepth(DEPTH_CARD)
      .setAlpha(checkReduceMotion() ? 1 : 0)
      .setScale(checkReduceMotion() ? 1 : 0.88);
  }

  // ── Animations ──────────────────────────────────────────────────────────────

  private animateIn(onDone: () => void): void {
    const tweens = createAnimateInTweens(this.scene, this.overlay, this.card, onDone);
    this.tweenRefs.push(...tweens);
  }

  private animateOut(onDone: () => void): void {
    const tweens = createAnimateOutTweens(this.scene, this.overlay, this.card, onDone);
    this.tweenRefs.push(...tweens);
  }

  private scheduleAutoDismiss(ms: number): void {
    const t = this.scene.time.delayedCall(ms, () => this.dismiss());
    this.timerRefs.push(t);
  }

  private cleanupAndComplete(): void {
    for (const obj of this.artObjects) {
      (obj as unknown as { destroy(): void }).destroy?.();
    }
    this.overlay.destroy();
    this.card.destroy();
    this.onCompleteCb?.();
  }

  // ── Per-level scene animations ───────────────────────────────────────────────

  private drawSceneAnimation(): void {
    const fn = SCENE_FNS[this.levelNumber] ?? SCENE_FNS[1]!;
    const artSX = CARD_CX + ART_CX - ART_W / 2;
    const artSY = CARD_CY + ART_CY - ART_H / 2;
    const artCXScene = CARD_CX + ART_CX;
    const artCYScene = CARD_CY + ART_CY;

    const ctx: SceneCtx = {
      scene: this.scene,
      artSX,
      artSY,
      artCX: artCXScene,
      artCY: artCYScene,
      artW: ART_W,
      artH: ART_H,
      addTw: (tw: Phaser.Tweens.Tween) => this.tweenRefs.push(tw),
      addTm: (tm: Phaser.Time.TimerEvent) => this.timerRefs.push(tm),
      addObj: (o: Phaser.GameObjects.GameObject) => this.artObjects.push(o),
      depth: DEPTH_CARD + 1,
    };

    fn(ctx);
  }
}
