/**
 * MenuScene — top-level menu with the "Sunshine Split Horizon" K-2 design.
 * Sky-zone holds title + sun + clouds. A wavy horizon line crosses the canvas.
 * The fraction-face character straddles the horizon. 3D-shadow buttons sit
 * in the green action zone.
 *
 * per runtime-architecture.md §2 (MVP scene inventory)
 * per design-language.md §2 (palette), §3 (Nunito font), §6.2 (no ambient motion)
 *
 * Note: Decorative ambient motion (sun spin, cloud drift, character bob) is
 * disabled when prefers-reduced-motion is set, satisfying §6.4.
 */

import * as Phaser from 'phaser';
import { injectSkipLink, labelCanvas } from '../components/SkipLink';
import { TestHooks } from './utils/TestHooks';

interface MenuData {
  lastStudentId: string | null;
}

// Logical canvas dimensions — per design-language.md §8.2
const CW = 800;
const CH = 1280;

// ── Sunshine Split-Horizon palette (mockup-approved) ──────────────────────
const SKY = 0x38bdf8;
const GREEN = 0x4ade80;
const GREEN_DARK = 0x16a34a;
const SUN = 0xfcd34d;
const SUN_HOVER = 0xf59e0b;
const AMBER_DARK = 0xb45309;
const AMBER_TEXT = '#78350F';
const NAVY = 0x1e3a8a;
const NAVY_HEX = '#1E3A8A';
const SKY_HOVER = 0x0ea5e9;
const WHITE = 0xffffff;
const WHITE_HEX = '#FFFFFF';
const CHEEK = 0xef4444;

// Layout
const HORIZON_Y = Math.round(CH * 0.4); // 512
const TITLE_FONT = '"Fredoka One", "Nunito", system-ui, sans-serif';
const BODY_FONT = '"Nunito", system-ui, sans-serif';

interface BigButtonOpts {
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  fillColor: number;
  hoverColor: number;
  borderColor: number;
  textColor: string;
  fontSize: number;
  onTap: () => void;
}

export class MenuScene extends Phaser.Scene {
  private lastStudentId: string | null = null;
  private reduceMotion = false;
  private ambientTweens: Phaser.Tweens.Tween[] = [];

  constructor() {
    super({ key: 'MenuScene' });
  }

  init(data: MenuData): void {
    this.lastStudentId = data.lastStudentId ?? null;
    this.ambientTweens = [];
  }

  create(): void {
    this.reduceMotion = this.checkReduceMotion();

    // Ensure custom webfonts are decoded before Phaser snapshots glyphs into
    // its texture cache. Without this, the title falls back to a system font
    // for the first frame and stays cached that way.
    void this._renderAfterFontsReady();

    // WCAG 2.4.1 — inject skip link and label canvas on first menu render.
    labelCanvas();
    injectSkipLink();

    // ── Test hooks (kept identical so e2e selectors still work) ────────────
    TestHooks.unmountAll();
    TestHooks.mountSentinel('menu-scene');
    // Position test hook over the new Play! button location (~75% down).
    // Percentages are viewport-based (position: fixed), so this is only a
    // visual hint — Playwright should target by data-testid.
    TestHooks.mountInteractive(
      'level-card-L1',
      () => {
        this.scene.start('Level01Scene', { studentId: this.lastStudentId });
      },
      { width: '620px', height: '110px', top: '76%', left: '50%' }
    );
    TestHooks.mountInteractive(
      'level-card-L6',
      () => {
        this.scene.start('LevelScene', { levelNumber: 6, studentId: this.lastStudentId });
      },
      { width: '100px', height: '40px', top: '50%', left: '10%' }
    );
    TestHooks.mountInteractive(
      'level-card-L7',
      () => {
        this.scene.start('LevelScene', { levelNumber: 7, studentId: this.lastStudentId });
      },
      { width: '100px', height: '40px', top: '55%', left: '10%' }
    );

    // ── Background zones ───────────────────────────────────────────────────
    this.add.rectangle(CW / 2, HORIZON_Y / 2, CW, HORIZON_Y, SKY).setDepth(0);
    this.add
      .rectangle(CW / 2, HORIZON_Y + (CH - HORIZON_Y) / 2, CW, CH - HORIZON_Y, GREEN)
      .setDepth(0);

    // Wavy horizon — green path with curvy top edge bleeding into sky
    this.drawWavyHorizon();

    // ── Sky-zone decorations ───────────────────────────────────────────────
    this.drawSun(120, 150, 60);
    this.drawCloud(220, 1.2, this.reduceMotion ? 0 : 22);
    this.drawCloud(360, 0.9, this.reduceMotion ? 0 : 28);

    // ── Title in sky ───────────────────────────────────────────────────────
    this.add
      .text(CW / 2, 180, 'Questerix\nFractions', {
        fontFamily: TITLE_FONT,
        fontSize: '92px',
        color: WHITE_HEX,
        align: 'center',
        lineSpacing: 4,
        stroke: NAVY_HEX,
        strokeThickness: 8,
        shadow: {
          offsetX: 0,
          offsetY: 6,
          color: '#000000',
          blur: 8,
          fill: true,
        },
      })
      .setOrigin(0.5)
      .setDepth(5);

    this.add
      .text(CW / 2, 310, 'A math adventure! 🍕', {
        fontFamily: BODY_FONT,
        fontStyle: 'bold',
        fontSize: '34px',
        color: WHITE_HEX,
        align: 'center',
        shadow: {
          offsetX: 0,
          offsetY: 3,
          color: '#000000',
          blur: 4,
          fill: true,
        },
      })
      .setOrigin(0.5)
      .setDepth(5);

    // ── Character at horizon ───────────────────────────────────────────────
    const character = this.drawFractionCharacter(CW / 2, HORIZON_Y, 1.7);
    character.setDepth(8);

    if (!this.reduceMotion) {
      const t = this.tweens.add({
        targets: character,
        y: HORIZON_Y - 18,
        duration: 2000,
        ease: 'Sine.easeInOut',
        yoyo: true,
        repeat: -1,
      });
      this.ambientTweens.push(t);
    }

    // ── Action buttons in green zone ───────────────────────────────────────
    const btnW = 620;
    const btnXC = CW / 2;
    const playH = 110;
    const subH = 92;
    const gap = 24;

    // Y layout from bottom up: leave ~70px below settings for grass tufts
    const settingsY = CH - 70 - subH / 2;
    const continueY = settingsY - subH / 2 - gap - subH / 2;
    const playY = continueY - subH / 2 - gap - playH / 2;
    const playYWhenNoContinue = settingsY - subH / 2 - gap - playH / 2;

    // Has continue?
    const hasContinue = !!this.lastStudentId;

    // Play! (always shown)
    this.createBigButton({
      x: btnXC,
      y: hasContinue ? playY : playYWhenNoContinue,
      w: btnW,
      h: playH,
      label: 'Play!',
      fillColor: SUN,
      hoverColor: SUN_HOVER,
      borderColor: AMBER_DARK,
      textColor: AMBER_TEXT,
      fontSize: 56,
      onTap: () => {
        this.scene.start('Level01Scene', { studentId: this.lastStudentId });
      },
    });

    // Continue (if returning student)
    if (hasContinue) {
      this.createBigButton({
        x: btnXC,
        y: continueY,
        w: btnW,
        h: subH,
        label: 'Continue',
        fillColor: SKY,
        hoverColor: SKY_HOVER,
        borderColor: NAVY,
        textColor: WHITE_HEX,
        fontSize: 42,
        onTap: () => {
          this.scene.start('Level01Scene', { studentId: this.lastStudentId, resume: true });
        },
      });
    }

    // Settings (always shown, anchored to bottom)
    this.createBigButton({
      x: btnXC,
      y: settingsY,
      w: btnW,
      h: subH,
      label: 'Settings',
      fillColor: WHITE,
      hoverColor: 0xeef0f4,
      borderColor: NAVY,
      textColor: NAVY_HEX,
      fontSize: 42,
      onTap: () => {
        this.scene.launch('SettingsScene');
      },
    });

    // Grass tufts along bottom edge
    this.drawGrassTufts();

    // Stop tweens on shutdown so we don't leak
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      for (const t of this.ambientTweens) t.stop();
      this.ambientTweens = [];
    });

    // One-time storage warning banner (dev mode only)
    void this._showStorageBannerIfNeeded();
  }

  // ── Decorative drawing helpers ────────────────────────────────────────────

  /**
   * Sample the wavy horizon profile into an array of {x,y} points so we can
   * use the same curve for both the green fill and the lighter highlight band.
   * Phaser 4's Graphics doesn't expose bezierCurveTo, so we approximate manually.
   */
  private sampleHorizonWave(yOffset = 0): { x: number; y: number }[] {
    const waveAmp = 28;
    const pts: { x: number; y: number }[] = [];
    const segments: [number, number, number, number, number, number, number, number][] = [
      [
        0,
        HORIZON_Y + waveAmp * 0.4 + yOffset,
        CW * 0.2,
        HORIZON_Y - waveAmp + yOffset,
        CW * 0.35,
        HORIZON_Y + waveAmp + yOffset,
        CW * 0.5,
        HORIZON_Y - waveAmp * 0.2 + yOffset,
      ],
      [
        CW * 0.5,
        HORIZON_Y - waveAmp * 0.2 + yOffset,
        CW * 0.65,
        HORIZON_Y - waveAmp + yOffset,
        CW * 0.85,
        HORIZON_Y + waveAmp * 0.6 + yOffset,
        CW,
        HORIZON_Y - waveAmp * 0.4 + yOffset,
      ],
    ];
    pts.push({ x: segments[0][0], y: segments[0][1] });
    for (const [, , cx1, cy1, cx2, cy2, x1, y1] of segments) {
      const x0 = pts[pts.length - 1].x;
      const y0 = pts[pts.length - 1].y;
      const steps = 24;
      for (let i = 1; i <= steps; i++) {
        const t = i / steps;
        const u = 1 - t;
        const px = u * u * u * x0 + 3 * u * u * t * cx1 + 3 * u * t * t * cx2 + t * t * t * x1;
        const py = u * u * u * y0 + 3 * u * u * t * cy1 + 3 * u * t * t * cy2 + t * t * t * y1;
        pts.push({ x: px, y: py });
      }
    }
    return pts;
  }

  private drawWavyHorizon(): void {
    const wavePts = this.sampleHorizonWave();

    // Green hill: wave on top, full width fill down to canvas bottom
    const g = this.add.graphics().setDepth(2);
    g.fillStyle(GREEN, 1);
    g.beginPath();
    g.moveTo(0, CH);
    g.lineTo(0, wavePts[0].y);
    for (const p of wavePts) g.lineTo(p.x, p.y);
    g.lineTo(CW, CH);
    g.closePath();
    g.fillPath();

    // Lighter highlight band hugging the top of the wave
    const hlPtsTop = wavePts;
    const hlPtsBottom = this.sampleHorizonWave(10);
    const hl = this.add.graphics().setDepth(3);
    hl.fillStyle(0x86efac, 0.55);
    hl.beginPath();
    hl.moveTo(hlPtsTop[0].x, hlPtsTop[0].y);
    for (const p of hlPtsTop) hl.lineTo(p.x, p.y);
    for (let i = hlPtsBottom.length - 1; i >= 0; i--) {
      hl.lineTo(hlPtsBottom[i].x, hlPtsBottom[i].y);
    }
    hl.closePath();
    hl.fillPath();
  }

  private drawSun(cx: number, cy: number, radius: number): void {
    const container = this.add.container(cx, cy).setDepth(4);

    const rays = this.add.graphics();
    rays.lineStyle(8, SUN, 1);
    const rayInner = radius * 1.15;
    const rayOuter = radius * 1.7;
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      rays.lineBetween(
        Math.cos(angle) * rayInner,
        Math.sin(angle) * rayInner,
        Math.cos(angle) * rayOuter,
        Math.sin(angle) * rayOuter
      );
    }
    container.add(rays);

    const disc = this.add.graphics();
    disc.fillStyle(SUN, 1);
    disc.fillCircle(0, 0, radius);
    container.add(disc);

    if (!this.reduceMotion) {
      const t = this.tweens.add({
        targets: rays,
        rotation: Math.PI * 2,
        duration: 18000,
        repeat: -1,
        ease: 'Linear',
      });
      this.ambientTweens.push(t);
    }
  }

  private drawCloud(yPos: number, scale: number, durationSec: number): void {
    const startX = -160;
    const endX = CW + 160;

    const g = this.add.graphics().setDepth(4);
    g.fillStyle(WHITE, 0.9);
    // Cloud silhouette = overlapping circles + base rectangle
    g.fillCircle(0, 0, 28 * scale);
    g.fillCircle(28 * scale, -10 * scale, 32 * scale);
    g.fillCircle(60 * scale, 0, 26 * scale);
    g.fillCircle(80 * scale, 12 * scale, 22 * scale);
    g.fillRoundedRect(0, 0, 80 * scale, 24 * scale, 12 * scale);

    g.x = startX;
    g.y = yPos;

    if (durationSec > 0) {
      const t = this.tweens.add({
        targets: g,
        x: endX,
        duration: durationSec * 1000,
        repeat: -1,
        ease: 'Linear',
        delay: scale > 1 ? 0 : 4000,
      });
      this.ambientTweens.push(t);
    } else {
      g.x = CW * 0.7; // static placement under reduced-motion
    }
  }

  /**
   * The yellow fraction-face mascot — circle split by a dashed vertical line
   * with cartoon eyes, rosy cheeks, and a toothy grin.
   */
  private drawFractionCharacter(
    cx: number,
    cy: number,
    s: number
  ): Phaser.GameObjects.Container {
    const c = this.add.container(cx, cy);

    // ── Disc with thick amber stroke ─────────────────────────────────────
    const disc = this.add.graphics();
    disc.fillStyle(SUN, 1);
    disc.fillCircle(0, 0, 90 * s);
    disc.lineStyle(10 * s, AMBER_DARK, 1);
    disc.strokeCircle(0, 0, 90 * s);
    c.add(disc);

    // ── Dashed vertical "halves" line ────────────────────────────────────
    const dash = this.add.graphics();
    dash.lineStyle(7 * s, AMBER_DARK, 1);
    const dashLen = 10 * s;
    const gap = 8 * s;
    for (let y = -85 * s; y < 85 * s; y += dashLen + gap) {
      dash.lineBetween(0, y, 0, Math.min(y + dashLen, 85 * s));
    }
    c.add(dash);

    // ── Eyes (white ovals with amber outline) ────────────────────────────
    const eyes = this.add.graphics();
    eyes.fillStyle(WHITE, 1);
    eyes.fillEllipse(-35 * s, -25 * s, 30 * s, 50 * s);
    eyes.fillEllipse(35 * s, -25 * s, 30 * s, 50 * s);
    eyes.lineStyle(5 * s, AMBER_DARK, 1);
    eyes.strokeEllipse(-35 * s, -25 * s, 30 * s, 50 * s);
    eyes.strokeEllipse(35 * s, -25 * s, 30 * s, 50 * s);
    c.add(eyes);

    // ── Pupils (navy dots with white sparkle) ────────────────────────────
    const pupils = this.add.graphics();
    pupils.fillStyle(NAVY, 1);
    pupils.fillCircle(-30 * s, -20 * s, 8 * s);
    pupils.fillCircle(30 * s, -20 * s, 8 * s);
    pupils.fillStyle(WHITE, 1);
    pupils.fillCircle(-32 * s, -23 * s, 3 * s);
    pupils.fillCircle(28 * s, -23 * s, 3 * s);
    c.add(pupils);

    // ── Eyebrows (small amber arcs) ──────────────────────────────────────
    const brows = this.add.graphics();
    brows.lineStyle(6 * s, AMBER_DARK, 1);
    brows.beginPath();
    brows.arc(-35 * s, -55 * s, 18 * s, Math.PI, Math.PI * 2 - 0.2, false);
    brows.strokePath();
    brows.beginPath();
    brows.arc(35 * s, -55 * s, 18 * s, Math.PI + 0.2, Math.PI * 2, false);
    brows.strokePath();
    c.add(brows);

    // ── Rosy cheeks ──────────────────────────────────────────────────────
    const cheeks = this.add.graphics();
    cheeks.fillStyle(CHEEK, 0.45);
    cheeks.fillCircle(-55 * s, 15 * s, 14 * s);
    cheeks.fillCircle(55 * s, 15 * s, 14 * s);
    c.add(cheeks);

    // ── Toothy grin: filled mouth shape + tooth divider ──────────────────
    const mouth = this.add.graphics();
    mouth.fillStyle(WHITE, 1);
    mouth.beginPath();
    const x1 = -50 * s;
    const x2 = 50 * s;
    const yLip = 20 * s;
    const yBulge = 78 * s; // how far the smile dips
    mouth.moveTo(x1, yLip);
    const steps = 24;
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      const px = x1 * (1 - t) * (1 - t) + 2 * 0 * (1 - t) * t + x2 * t * t;
      const py = yLip * (1 - t) * (1 - t) + 2 * yBulge * (1 - t) * t + yLip * t * t;
      mouth.lineTo(px, py);
    }
    mouth.closePath();
    mouth.fillPath();
    mouth.lineStyle(6 * s, AMBER_DARK, 1);
    mouth.strokePath();

    // Upper-lip line across the mouth
    mouth.beginPath();
    mouth.moveTo(x1, yLip);
    const upperBulge = 38 * s;
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      const px = x1 * (1 - t) * (1 - t) + 2 * 0 * (1 - t) * t + x2 * t * t;
      const py = yLip * (1 - t) * (1 - t) + 2 * upperBulge * (1 - t) * t + yLip * t * t;
      mouth.lineTo(px, py);
    }
    mouth.lineStyle(6 * s, AMBER_DARK, 1);
    mouth.strokePath();
    c.add(mouth);

    return c;
  }

  private drawGrassTufts(): void {
    const tufts = this.add.graphics().setDepth(6);
    tufts.lineStyle(5, GREEN_DARK, 0.8);
    const positions = [
      { x: 60, h: 30 },
      { x: 220, h: 22 },
      { x: 360, h: 28 },
      { x: 480, h: 20 },
      { x: 600, h: 32 },
      { x: 740, h: 24 },
    ];
    for (const p of positions) {
      const baseY = CH - 8;
      tufts.lineBetween(p.x, baseY, p.x, baseY - p.h);
      tufts.lineBetween(p.x, baseY, p.x - p.h * 0.5, baseY - p.h * 0.6);
      tufts.lineBetween(p.x, baseY, p.x + p.h * 0.5, baseY - p.h * 0.6);
    }
  }

  // ── Big chunky pill button with 3D shadow ────────────────────────────────

  private createBigButton(opts: BigButtonOpts): void {
    const { x, y, w, h, label, fillColor, hoverColor, borderColor, textColor, fontSize, onTap } =
      opts;
    const radius = h / 2;
    const shadowOffset = 8;

    // Shadow plate (drawn under everything else for this button)
    const shadow = this.add.graphics().setDepth(10);
    shadow.fillStyle(borderColor, 1);
    shadow.fillRoundedRect(x - w / 2, y - h / 2 + shadowOffset, w, h, radius);

    // Top plate (button face)
    const face = this.add.graphics().setDepth(11);
    let pressedDy = 0;

    const drawFace = (fill: number, dy: number) => {
      face.clear();
      face.fillStyle(fill, 1);
      face.fillRoundedRect(x - w / 2, y - h / 2 + dy, w, h, radius);
      face.lineStyle(4, borderColor, 1);
      face.strokeRoundedRect(x - w / 2, y - h / 2 + dy, w, h, radius);
    };
    drawFace(fillColor, pressedDy);

    const text = this.add
      .text(x, y, label, {
        fontFamily: TITLE_FONT,
        fontSize: `${fontSize}px`,
        color: textColor,
      })
      .setOrigin(0.5)
      .setDepth(12);

    const hit = this.add
      .rectangle(x, y + shadowOffset / 2, w + 4, h + shadowOffset + 4, 0x000000, 0)
      .setInteractive({ useHandCursor: true })
      .setDepth(13);

    let isHovering = false;

    const press = () => {
      pressedDy = shadowOffset;
      drawFace(isHovering ? hoverColor : fillColor, pressedDy);
      text.setY(y + shadowOffset);
      shadow.setVisible(false);
    };
    const release = () => {
      pressedDy = 0;
      drawFace(isHovering ? hoverColor : fillColor, pressedDy);
      text.setY(y);
      shadow.setVisible(true);
    };

    hit.on('pointerover', () => {
      isHovering = true;
      drawFace(hoverColor, pressedDy);
    });
    hit.on('pointerout', () => {
      isHovering = false;
      release();
    });
    hit.on('pointerdown', () => {
      press();
    });
    hit.on('pointerup', () => {
      release();
      onTap();
    });
  }

  // ── Storage banner (preserved) ───────────────────────────────────────────

  private static readonly STORAGE_NOTICE_KEY = 'qf.storageNoticeShown';

  private async _showStorageBannerIfNeeded(): Promise<void> {
    if (!import.meta.env.DEV) return;

    try {
      const alreadyShown = sessionStorage.getItem(MenuScene.STORAGE_NOTICE_KEY) === '1';
      if (alreadyShown) return;

      const persisted = await navigator.storage?.persisted?.();
      if (persisted) return;

      sessionStorage.setItem(MenuScene.STORAGE_NOTICE_KEY, '1');
    } catch {
      return;
    }

    this._renderStorageBanner();
  }

  private _renderStorageBanner(): void {
    // Compact toast at the very top of the canvas — minimises intrusion on
    // the menu artwork while still being visible and dismissable.
    const bannerW = CW;
    const bannerH = 56;
    const bannerY = bannerH / 2;
    const cx = CW / 2;

    const bg = this.add.graphics().setDepth(20);
    bg.fillStyle(0xfef3c7, 0.96);
    bg.fillRect(0, 0, bannerW, bannerH);
    bg.lineStyle(2, 0xd97706, 1);
    bg.lineBetween(0, bannerH, bannerW, bannerH);

    const msg = this.add
      .text(cx, bannerY, '⚠ Preview mode — progress may not be saved. (Settings → Export Backup)', {
        fontSize: '15px',
        fontFamily: BODY_FONT,
        fontStyle: 'bold',
        color: '#92400E',
        align: 'center',
        wordWrap: { width: bannerW - 80 },
      })
      .setOrigin(0.5)
      .setDepth(21);

    const dismissBtn = this.add
      .text(bannerW - 24, bannerY, '✕', {
        fontSize: '20px',
        fontFamily: BODY_FONT,
        fontStyle: 'bold',
        color: '#92400E',
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .setDepth(22);

    dismissBtn.on('pointerup', () => {
      bg.destroy();
      msg.destroy();
      dismissBtn.destroy();
    });
  }

  private checkReduceMotion(): boolean {
    try {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch {
      return false;
    }
  }

  /**
   * Wait for the Fredoka One webfont to load, then force every existing Text
   * object to re-render so the title/buttons pick up the chunky display font
   * instead of the system fallback that was used at first paint.
   */
  private async _renderAfterFontsReady(): Promise<void> {
    try {
      const fonts = (document as Document & { fonts?: FontFaceSet }).fonts;
      if (!fonts) return;
      // Force-load Fredoka One at the sizes we use, then wait for ready.
      await Promise.all([
        fonts.load('400 92px "Fredoka One"'),
        fonts.load('400 56px "Fredoka One"'),
        fonts.load('400 42px "Fredoka One"'),
      ]).catch(() => undefined);
      await fonts.ready.catch(() => undefined);
      // Re-render all text objects in the scene with the now-loaded font.
      this.children.list.forEach((obj) => {
        if (obj instanceof Phaser.GameObjects.Text) {
          obj.setStyle(obj.style.toJSON());
        }
      });
    } catch {
      // ignore — we tried our best, fallback font will display
    }
  }

}
