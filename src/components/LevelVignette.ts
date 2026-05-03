/**
 * LevelVignette — 2.5-second illustrated intro clip shown once per session
 * before the first question loads. Each of L1–L9 gets a unique mini-scene
 * that sets the thematic context. Auto-dismisses or skips on tap.
 * per plans/visual-game-ideas.md §3-E
 */

import * as Phaser from 'phaser';
import { NAVY, NAVY_HEX, TITLE_FONT, BODY_FONT, ACTION_FILL } from '../scenes/utils/levelTheme';
import { checkReduceMotion } from '../lib/preferences';

// ── Layout constants ──────────────────────────────────────────────────────────

const CW = 800;
const CH = 1280;

/** Card dimensions and position */
const CARD_W = 680;
const CARD_H = 510;
const CARD_CX = CW / 2; // 400
const CARD_CY = 590;    // slightly above canvas centre for visual weight

/** Artbox — the illustrated mini-scene area, in container-local coords */
const ART_CX = 0;
const ART_CY = -68;
const ART_W = 620;
const ART_H = 256;

const ENTRY_MS = 380;
const AUTO_DISMISS_MS = 2600; // after entry completes
const EXIT_MS = 280;

/** Depth above all chrome (header = 4–10, interactions = 5–9). */
const DEPTH_OVERLAY = 48;
const DEPTH_CARD = 50;

// ── Per-level metadata ────────────────────────────────────────────────────────

const LEVEL_META: Record<number, { label: string; tagline: string; bgColor: number }> = {
  1: { label: 'Level 1 — Halves',            tagline: 'Help share the food equally!',           bgColor: 0xfff8e7 },
  2: { label: 'Level 2 — Thirds',             tagline: 'Plant seeds in equal rows!',             bgColor: 0xf0fdf4 },
  3: { label: 'Level 3 — Quarters',           tagline: 'Explore the four-part park!',            bgColor: 0xe0f2fe },
  4: { label: 'Level 4 — Identifying',        tagline: 'Name every fraction you see!',           bgColor: 0xf5f3ff },
  5: { label: 'Level 5 — Equivalent',         tagline: 'Different shapes, same value!',          bgColor: 0xfff1f2 },
  6: { label: 'Level 6 — Comparing',          tagline: 'Which fraction is bigger?',              bgColor: 0xf0fdf4 },
  7: { label: 'Level 7 — Ordering',           tagline: 'Arrange them smallest to largest!',      bgColor: 0xeef2ff },
  8: { label: 'Level 8 — Benchmark ½',        tagline: 'Is it more or less than one half?',      bgColor: 0xe0f2fe },
  9: { label: 'Level 9 — Mixed Review',       tagline: 'Navigate the fraction galaxy!',          bgColor: 0x0a1128 },
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
    const overlayTween = this.scene.tweens.add({
      targets: this.overlay,
      alpha: 0.58,
      duration: ENTRY_MS,
      ease: 'Cubic.easeOut',
    });
    const cardTween = this.scene.tweens.add({
      targets: this.card,
      alpha: 1,
      scaleX: 1,
      scaleY: 1,
      y: CARD_CY,
      duration: ENTRY_MS,
      ease: 'Back.easeOut',
      onComplete: () => onDone(),
    });
    this.tweenRefs.push(overlayTween, cardTween);
  }

  private animateOut(onDone: () => void): void {
    const overlayTween = this.scene.tweens.add({
      targets: this.overlay,
      alpha: 0,
      duration: EXIT_MS,
      ease: 'Cubic.easeIn',
    });
    const cardTween = this.scene.tweens.add({
      targets: this.card,
      alpha: 0,
      scaleX: 0.9,
      scaleY: 0.9,
      duration: EXIT_MS,
      ease: 'Cubic.easeIn',
      onComplete: () => onDone(),
    });
    this.tweenRefs.push(overlayTween, cardTween);
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
    // artbox origin in scene space
    const artSX = CARD_CX + ART_CX - ART_W / 2;  // left edge of artbox in scene
    const artSY = CARD_CY + ART_CY - ART_H / 2;  // top edge in scene
    const artCX = CARD_CX + ART_CX;               // centre x in scene
    const artCY = CARD_CY + ART_CY;               // centre y in scene

    const addTw = (tw: Phaser.Tweens.Tween) => { this.tweenRefs.push(tw); };
    const addTm = (tm: Phaser.Time.TimerEvent) => { this.timerRefs.push(tm); };
    const addObj = (o: Phaser.GameObjects.GameObject) => { this.artObjects.push(o); };

    fn({
      scene: this.scene,
      artSX, artSY,
      artCX, artCY,
      artW: ART_W,
      artH: ART_H,
      addTw, addTm, addObj,
      depth: DEPTH_CARD + 1,
    });
  }
}

// ── Scene drawing functions ──────────────────────────────────────────────────

interface SceneCtx {
  scene: Phaser.Scene;
  artSX: number; artSY: number;
  artCX: number; artCY: number;
  artW: number;  artH: number;
  depth: number;
  addTw: (t: Phaser.Tweens.Tween) => void;
  addTm: (t: Phaser.Time.TimerEvent) => void;
  addObj: (o: Phaser.GameObjects.GameObject) => void;
}

type SceneFn = (ctx: SceneCtx) => void;

/** L1 — Halves: sandwich cut by a sliding knife line */
function drawL1(ctx: SceneCtx): void {
  const { scene, artCX, artCY, depth, addTw, addObj } = ctx;

  // Bread (two rounded ellipses stacked)
  const g = scene.add.graphics().setDepth(depth);
  addObj(g);
  g.fillStyle(0xd97706, 0.85);
  g.fillRoundedRect(artCX - 130, artCY - 44, 260, 88, 44);
  g.fillStyle(0xfef3c7, 0.9);
  g.fillRoundedRect(artCX - 115, artCY - 32, 230, 64, 32);
  // Lettuce frills
  g.fillStyle(0x4ade80, 0.7);
  for (let i = 0; i < 5; i++) {
    g.fillCircle(artCX - 90 + i * 45, artCY - 10, 18);
  }
  // Tomato slices
  g.fillStyle(0xef4444, 0.7);
  g.fillCircle(artCX - 50, artCY + 14, 14);
  g.fillCircle(artCX + 40, artCY + 14, 14);

  // Knife (starts above, slides down diagonally)
  const knife = scene.add.graphics().setDepth(depth + 1);
  addObj(knife);
  knife.fillStyle(0x9ca3af, 1);
  knife.fillRect(-4, -80, 8, 80);   // blade
  knife.fillStyle(0x78716c, 1);
  knife.fillRect(-6, -100, 14, 24); // handle
  knife.setPosition(artCX + 100, artCY - 120);
  knife.setAngle(35);

  addTw(scene.tweens.add({
    targets: knife,
    y: artCY - 10,
    duration: 600,
    ease: 'Back.easeOut',
    delay: 200,
  }));

  // Dashed cut line appearing
  const cutLine = scene.add.graphics().setDepth(depth + 1);
  addObj(cutLine);
  cutLine.setAlpha(0);
  addTw(scene.tweens.add({
    targets: cutLine,
    alpha: 1,
    duration: 250,
    delay: 820,
    onStart: () => {
      cutLine.lineStyle(3, 0xfbbf24, 1);
      cutLine.lineBetween(artCX - 140, artCY - 2, artCX + 140, artCY - 2);
    },
  }));
}

/** L2 — Thirds: three flower pots with blooming flowers */
function drawL2(ctx: SceneCtx): void {
  const { scene, artCX, artCY, depth, addTw, addObj, addTm } = ctx;
  const POTS = 3;
  const spacing = 160;

  for (let i = 0; i < POTS; i++) {
    const px = artCX + (i - 1) * spacing;
    const g = scene.add.graphics().setDepth(depth);
    addObj(g);

    // Pot
    g.fillStyle(0xd97706, 0.85);
    g.fillRect(px - 22, artCY + 30, 44, 36);
    g.fillStyle(0xb45309, 0.9);
    g.fillRect(px - 26, artCY + 26, 52, 10);

    // Stem (grows from pot upward)
    const stem = scene.add.graphics().setDepth(depth + 1);
    addObj(stem);
    stem.lineStyle(4, 0x16a34a, 1);
    stem.lineBetween(px, artCY + 30, px, artCY - 36);
    stem.setScale(1, 0);
    stem.setY(artCY + 30);

    addTw(scene.tweens.add({
      targets: stem,
      scaleY: 1,
      y: 0,
      duration: 350,
      ease: 'Sine.easeOut',
      delay: 200 + i * 220,
    }));

    // Flower (blooms after stem)
    const flowerColors = [0xf472b6, 0xfbbf24, 0xa78bfa];
    const flower = scene.add.graphics().setDepth(depth + 2);
    addObj(flower);
    for (let p = 0; p < 5; p++) {
      const ang = (p / 5) * Math.PI * 2;
      flower.fillStyle(flowerColors[i]!, 0.9);
      flower.fillCircle(px + Math.cos(ang) * 14, artCY - 46 + Math.sin(ang) * 14, 10);
    }
    flower.fillStyle(0xfef3c7, 1);
    flower.fillCircle(px, artCY - 46, 9);
    flower.setScale(0);

    addTm(scene.time.delayedCall(550 + i * 220, () => {
      addTw(scene.tweens.add({
        targets: flower,
        scaleX: 1.15,
        scaleY: 1.15,
        duration: 220,
        ease: 'Back.easeOut',
        yoyo: true,
        onComplete: () => flower.setScale(1),
      }));
    }));
  }
}

/** L3 — Quarters: square subdividing into 4 coloured sections */
function drawL3(ctx: SceneCtx): void {
  const { scene, artCX, artCY, depth, addTw, addObj } = ctx;
  const SZ = 180;
  const L = artCX - SZ / 2;
  const T = artCY - SZ / 2;

  const quadColors = [0xbae6fd, 0xd9f99d, 0xfef08a, 0xfbcfe8];
  const quads = [
    { x: L, y: T, w: SZ / 2, h: SZ / 2 },
    { x: artCX, y: T, w: SZ / 2, h: SZ / 2 },
    { x: L, y: artCY, w: SZ / 2, h: SZ / 2 },
    { x: artCX, y: artCY, w: SZ / 2, h: SZ / 2 },
  ];

  quads.forEach(({ x, y, w, h }, i) => {
    const qg = scene.add.graphics().setDepth(depth).setAlpha(0);
    addObj(qg);
    qg.fillStyle(quadColors[i]!, 0.7);
    qg.fillRect(x, y, w, h);
    addTw(scene.tweens.add({
      targets: qg,
      alpha: 1,
      duration: 300,
      delay: 600 + i * 120,
      ease: 'Sine.easeOut',
    }));
  });

  // Outline
  const border = scene.add.graphics().setDepth(depth + 1);
  addObj(border);
  border.lineStyle(3, NAVY, 0.8);
  border.strokeRect(L, T, SZ, SZ);

  // Horizontal divider drawing left→right
  const hLine = scene.add.graphics().setDepth(depth + 2);
  addObj(hLine);
  hLine.lineStyle(3, NAVY, 0.9);
  addTw(scene.tweens.add({
    targets: { p: 0 },
    p: 1,
    duration: 380,
    delay: 180,
    ease: 'Sine.easeInOut',
    onUpdate: (_, obj: { p: number }) => {
      hLine.clear();
      hLine.lineStyle(3, NAVY, 0.9);
      hLine.lineBetween(L, artCY, L + SZ * obj.p, artCY);
    },
  }));

  // Vertical divider drawing top→bottom
  const vLine = scene.add.graphics().setDepth(depth + 2);
  addObj(vLine);
  addTw(scene.tweens.add({
    targets: { p: 0 },
    p: 1,
    duration: 380,
    delay: 380,
    ease: 'Sine.easeInOut',
    onUpdate: (_, obj: { p: number }) => {
      vLine.clear();
      vLine.lineStyle(3, NAVY, 0.9);
      vLine.lineBetween(artCX, T, artCX, T + SZ * obj.p);
    },
  }));
}

/** L4 — Library: books flying onto shelves */
function drawL4(ctx: SceneCtx): void {
  const { scene, artCX, artCY, depth, addTw, addObj } = ctx;
  const bookColors = [0xef4444, 0xfbbf24, 0x22c55e, 0x3b82f6, 0xa855f7, 0xec4899];

  // Two shelves
  const shelfG = scene.add.graphics().setDepth(depth);
  addObj(shelfG);
  shelfG.fillStyle(0xd8b4fe, 0.6);
  shelfG.fillRect(artCX - 210, artCY - 20, 420, 14);
  shelfG.fillRect(artCX - 210, artCY + 58, 420, 14);
  shelfG.lineStyle(2, 0xa855f7, 0.5);
  shelfG.strokeRect(artCX - 210, artCY - 20, 420, 14);
  shelfG.strokeRect(artCX - 210, artCY + 58, 420, 14);

  // Books slide in from right
  const bookW = 34;
  const bookH = 52;
  for (let i = 0; i < 6; i++) {
    const shelf = i < 3 ? 0 : 1;
    const slot = i % 3;
    const bx = artCX - 160 + slot * 76;
    const by = shelf === 0 ? artCY - 20 - bookH : artCY + 58 - bookH;

    const book = scene.add.graphics().setDepth(depth + 1);
    addObj(book);
    book.fillStyle(bookColors[i]!, 0.85);
    book.fillRoundedRect(0, 0, bookW, bookH, 3);
    book.setPosition(artCX + 300, by);

    addTw(scene.tweens.add({
      targets: book,
      x: bx,
      duration: 260,
      delay: 150 + i * 120,
      ease: 'Back.easeOut',
    }));
  }
}

/** L5 — Equivalent: two fraction bars → merge into a single value */
function drawL5(ctx: SceneCtx): void {
  const { scene, artCX, artCY, depth, addTw, addObj } = ctx;

  const drawBar = (x: number, n: number, _d: number, filled: number): Phaser.GameObjects.Graphics => {
    const g = scene.add.graphics().setDepth(depth);
    const barW = n * 40;
    const barH = 44;
    const bx = x - barW / 2;
    const by = artCY - barH / 2;
    for (let i = 0; i < n; i++) {
      g.fillStyle(i < filled ? ACTION_FILL : 0xe5e7eb, 0.85);
      g.fillRoundedRect(bx + i * 40, by, 36, barH, 5);
      g.lineStyle(2, NAVY, 0.5);
      g.strokeRoundedRect(bx + i * 40, by, 36, barH, 5);
    }
    addObj(g);
    return g;
  };

  // Left: 1/2 bar
  const leftBar = drawBar(artCX - 140, 2, 2, 1);
  leftBar.setAlpha(0);
  addTw(scene.tweens.add({ targets: leftBar, alpha: 1, duration: 300, delay: 100 }));

  // Right: 2/4 bar
  const rightBar = drawBar(artCX + 120, 4, 4, 2);
  rightBar.setAlpha(0);
  addTw(scene.tweens.add({ targets: rightBar, alpha: 1, duration: 300, delay: 320 }));

  // "=" sign appears then glows
  const eqText = scene.add
    .text(artCX - 12, artCY - 18, '=', {
      fontSize: '56px',
      fontFamily: TITLE_FONT,
      color: NAVY_HEX,
    })
    .setDepth(depth + 1)
    .setAlpha(0);
  addObj(eqText);

  addTw(scene.tweens.add({
    targets: eqText,
    alpha: 1,
    scaleX: 1.3,
    scaleY: 1.3,
    duration: 300,
    delay: 600,
    ease: 'Back.easeOut',
    yoyo: true,
    onComplete: () => eqText.setAlpha(1).setScale(1),
  }));

  // Fraction labels
  const labels = [
    scene.add.text(artCX - 140, artCY + 38, '1/2', { fontSize: '22px', fontFamily: TITLE_FONT, color: NAVY_HEX }).setOrigin(0.5).setDepth(depth + 1).setAlpha(0),
    scene.add.text(artCX + 120, artCY + 38, '2/4', { fontSize: '22px', fontFamily: TITLE_FONT, color: NAVY_HEX }).setOrigin(0.5).setDepth(depth + 1).setAlpha(0),
  ];
  labels.forEach((l, i) => {
    addObj(l);
    addTw(scene.tweens.add({ targets: l, alpha: 1, duration: 250, delay: 200 + i * 220 }));
  });
}

/** L6 — Comparing: two fraction bars of different heights with labels */
function drawL6(ctx: SceneCtx): void {
  const { scene, artCX, artCY, depth, addTw, addObj } = ctx;

  const drawFracBar = (x: number, fraction: number, label: string, color: number): void => {
    const maxH = 170;
    const barW = 72;
    const barH = Math.round(maxH * fraction);
    const bx = x - barW / 2;
    const by = artCY + 50 - barH; // bottom-aligned

    const g = scene.add.graphics().setDepth(depth).setAlpha(0);
    addObj(g);
    g.fillStyle(color, 0.8);
    g.fillRoundedRect(bx, by, barW, barH, 8);
    g.lineStyle(2, NAVY, 0.5);
    g.strokeRoundedRect(bx, by, barW, barH, 8);

    // Ground line
    g.lineStyle(3, NAVY, 0.4);
    g.lineBetween(bx - 10, artCY + 50, bx + barW + 10, artCY + 50);

    const lbl = scene.add
      .text(x, artCY + 70, label, {
        fontSize: '28px',
        fontFamily: TITLE_FONT,
        color: NAVY_HEX,
      })
      .setOrigin(0.5)
      .setDepth(depth + 1)
      .setAlpha(0);
    addObj(lbl);

    addTw(scene.tweens.add({ targets: g, alpha: 1, duration: 350, ease: 'Sine.easeOut' }));
    addTw(scene.tweens.add({ targets: lbl, alpha: 1, duration: 350, delay: 150 }));
  };

  drawFracBar(artCX - 130, 1 / 3, '1/3', 0x93c5fd);
  drawFracBar(artCX + 130, 1 / 2, '1/2', ACTION_FILL);

  // ">" arrow appears in the middle
  const arrow = scene.add
    .text(artCX - 14, artCY - 20, '<', {
      fontSize: '52px',
      fontFamily: TITLE_FONT,
      color: '#22c55e',
    })
    .setDepth(depth + 2)
    .setAlpha(0);
  addObj(arrow);
  addTw(scene.tweens.add({
    targets: arrow,
    alpha: 1,
    scaleX: 1.25,
    scaleY: 1.25,
    duration: 300,
    delay: 650,
    ease: 'Back.easeOut',
    yoyo: true,
    onComplete: () => { arrow.setAlpha(1); arrow.setScale(1); },
  }));
}

/** L7 — Ordering: staircase steps lighting up one by one */
function drawL7(ctx: SceneCtx): void {
  const { scene, artCX, artCY, depth, addTw, addObj, addTm } = ctx;
  const STEPS = 5;
  const stepW = 76;
  const stepH = 28;
  const totalW = STEPS * stepW;

  for (let i = 0; i < STEPS; i++) {
    const sx = artCX - totalW / 2 + i * stepW;
    const sy = artCY + 60 - (i + 1) * stepH;

    const stepG = scene.add.graphics().setDepth(depth);
    addObj(stepG);
    stepG.fillStyle(0xc7d2fe, 0.35);
    stepG.fillRect(sx, sy, stepW - 2, stepH * (i + 1));
    stepG.lineStyle(2, NAVY, 0.25);
    stepG.strokeRect(sx, sy, stepW - 2, stepH * (i + 1));

    // Active step highlight (appears sequentially)
    const activeStep = scene.add.graphics().setDepth(depth + 1).setAlpha(0);
    addObj(activeStep);
    activeStep.fillStyle(ACTION_FILL, 0.85);
    activeStep.fillRoundedRect(sx + 2, sy + 2, stepW - 6, stepH - 4, 5);

    addTm(scene.time.delayedCall(180 + i * 180, () => {
      addTw(scene.tweens.add({
        targets: activeStep,
        alpha: 1,
        duration: 200,
        ease: 'Sine.easeOut',
      }));
    }));

    // Fraction labels on each step
    const fracs = ['1/5', '2/5', '3/5', '4/5', '1'];
    const lbl = scene.add
      .text(sx + stepW / 2 - 1, sy + stepH / 2, fracs[i]!, {
        fontSize: '15px',
        fontFamily: BODY_FONT,
        color: NAVY_HEX,
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setDepth(depth + 2)
      .setAlpha(0);
    addObj(lbl);
    addTm(scene.time.delayedCall(240 + i * 180, () => {
      addTw(scene.tweens.add({ targets: lbl, alpha: 1, duration: 180 }));
    }));
  }

  // Star at top of staircase
  const star = scene.add
    .text(artCX + totalW / 2 - stepW / 2, artCY + 60 - STEPS * stepH - 36, '★', {
      fontSize: '36px',
      fontFamily: TITLE_FONT,
      color: '#f59e0b',
    })
    .setOrigin(0.5)
    .setDepth(depth + 2)
    .setAlpha(0);
  addObj(star);
  addTm(scene.time.delayedCall(1100, () => {
    addTw(scene.tweens.add({
      targets: star,
      alpha: 1,
      y: star.y - 6,
      duration: 400,
      ease: 'Back.easeOut',
      yoyo: true,
      repeat: -1,
    }));
  }));
}

/** L8 — Benchmark: a seesaw that tips then balances */
function drawL8(ctx: SceneCtx): void {
  const { scene, artCX, artCY, depth, addTw, addObj } = ctx;
  const PLANK_L = 240;

  // Pivot triangle
  const pivG = scene.add.graphics().setDepth(depth);
  addObj(pivG);
  pivG.fillStyle(0x78716c, 0.8);
  pivG.fillTriangle(artCX - 18, artCY + 60, artCX + 18, artCY + 60, artCX, artCY + 24);

  // Ground line
  pivG.lineStyle(3, 0x9ca3af, 0.5);
  pivG.lineBetween(artCX - 180, artCY + 60, artCX + 180, artCY + 60);

  // Plank (rotates tilted → level)
  const plankContainer = scene.add.container(artCX, artCY + 24).setDepth(depth + 1);
  addObj(plankContainer);
  const plankG = scene.add.graphics();
  plankG.fillStyle(0x92400e, 0.8);
  plankG.fillRect(-PLANK_L / 2, -6, PLANK_L, 12);
  plankContainer.add(plankG);
  plankContainer.setAngle(18); // starts tilted

  // Kids on each end
  const kidColors = [0xfb923c, 0x60a5fa];
  const kidSides = [-1, 1];
  kidSides.forEach((side, i) => {
    const kid = scene.add.graphics().setDepth(depth + 2);
    addObj(kid);
    kid.fillStyle(kidColors[i]!, 0.9);
    kid.fillCircle(artCX + side * PLANK_L / 2, artCY + 24, 18);
  });

  // Plank tilts to level
  addTw(scene.tweens.add({
    targets: plankContainer,
    angle: 0,
    duration: 700,
    delay: 400,
    ease: 'Sine.easeInOut',
  }));

  // "½" label appears at balance point
  const halfLabel = scene.add
    .text(artCX, artCY - 24, '½', {
      fontSize: '48px',
      fontFamily: TITLE_FONT,
      color: NAVY_HEX,
    })
    .setOrigin(0.5)
    .setDepth(depth + 3)
    .setAlpha(0);
  addObj(halfLabel);
  addTw(scene.tweens.add({
    targets: halfLabel,
    alpha: 1,
    y: artCY - 32,
    duration: 350,
    delay: 1150,
    ease: 'Back.easeOut',
  }));
}

/** L9 — Space: starfield + rocket rising with flame trail */
function drawL9(ctx: SceneCtx): void {
  const { scene, artSX, artSY, artCX, artW, artH, depth, addTw, addObj, addTm } = ctx;

  // Stars (seeded, consistent)
  const starG = scene.add.graphics().setDepth(depth);
  addObj(starG);
  let seed = 99;
  const rng = () => { seed = (seed * 1664525 + 1013904223) & 0xffffffff; return (seed >>> 0) / 0x100000000; };
  for (let i = 0; i < 55; i++) {
    const sx = artSX + rng() * artW;
    const sy = artSY + rng() * artH;
    const sr = rng() * 1.6 + 0.4;
    starG.fillStyle(0xffffff, 0.35 + rng() * 0.5);
    starG.fillCircle(sx, sy, sr);
  }

  // Planet (top-right)
  const planetG = scene.add.graphics().setDepth(depth + 1);
  addObj(planetG);
  planetG.fillStyle(0x4f46e5, 0.6);
  planetG.fillCircle(artSX + artW - 55, artSY + 48, 38);
  planetG.lineStyle(4, 0x818cf8, 0.45);
  planetG.strokeEllipse(artSX + artW - 55, artSY + 48, 100, 24);

  // Rocket — starts below artbox, rises up
  const rocketG = scene.add.graphics().setDepth(depth + 2);
  addObj(rocketG);
  // Body
  rocketG.fillStyle(0xe2e8f0, 0.9);
  rocketG.fillRoundedRect(-10, -30, 20, 48, 5);
  // Nose
  rocketG.fillStyle(0xe2e8f0, 0.9);
  rocketG.fillTriangle(-10, -30, 10, -30, 0, -55);
  // Fins
  rocketG.fillStyle(0xf59e0b, 0.8);
  rocketG.fillTriangle(-10, 8, -22, 22, -10, 16);
  rocketG.fillTriangle(10, 8, 22, 22, 10, 16);
  // Window
  rocketG.fillStyle(0x7dd3fc, 0.7);
  rocketG.fillCircle(0, -12, 7);

  const rocketStartY = artSY + artH + 40;
  const rocketEndY = artSY + 80;
  rocketG.setPosition(artCX, rocketStartY);

  addTw(scene.tweens.add({
    targets: rocketG,
    y: rocketEndY,
    duration: 1100,
    delay: 200,
    ease: 'Cubic.easeOut',
  }));

  // Flame trail — small orange circles appear at rocket's old position
  const spawnFlame = () => {
    if (!rocketG.active) return;
    const flame = scene.add.graphics().setDepth(depth + 1);
    addObj(flame);
    const fr = 6 + Math.random() * 6;
    flame.fillStyle(0xf97316, 0.7);
    flame.fillCircle(artCX, rocketG.y + 38, fr);
    addTw(scene.tweens.add({
      targets: flame,
      alpha: 0,
      y: flame.y + 20,
      duration: 420,
      ease: 'Cubic.easeIn',
      onComplete: () => flame.destroy(),
    }));
  };

  // Spawn flames while rocket is rising (14 total, 80ms apart)
  for (let i = 0; i < 14; i++) {
    addTm(scene.time.delayedCall(200 + i * 80, spawnFlame));
  }

  // "3...2...1..." countdown
  const countTexts = ['3', '2', '1', '🚀'];
  countTexts.forEach((txt, i) => {
    const ct = scene.add
      .text(artCX - 80, artSY + artH / 2, txt, {
        fontSize: '40px',
        fontFamily: TITLE_FONT,
        color: i < 3 ? '#c7d2fe' : '#fbbf24',
      })
      .setOrigin(0.5)
      .setDepth(depth + 3)
      .setAlpha(0);
    addObj(ct);
    addTm(scene.time.delayedCall(i * 200, () => {
      addTw(scene.tweens.add({
        targets: ct,
        alpha: 1,
        scaleX: 1.3,
        scaleY: 1.3,
        duration: 160,
        ease: 'Back.easeOut',
        yoyo: true,
        onComplete: () => ct.setAlpha(0.6),
      }));
    }));
  });
}

// ── Scene function registry ───────────────────────────────────────────────────

const SCENE_FNS: Record<number, SceneFn> = {
  1: drawL1,
  2: drawL2,
  3: drawL3,
  4: drawL4,
  5: drawL5,
  6: drawL6,
  7: drawL7,
  8: drawL8,
  9: drawL9,
};
