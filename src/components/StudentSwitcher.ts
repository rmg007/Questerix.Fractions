/**
 * StudentSwitcher — compact top-left profile chip that expands to a profile picker.
 *
 * Collapsed: small avatar chip + first name.
 * Expanded: up to 4 profile cards with switch affordance + "Add Player" button.
 *
 * per multi-student-and-first-run plan §Phase 3
 * per WCAG 2.5.5 — touch targets ≥ 44×44 CSS px (≥100 canvas px at 800 game width)
 * per A11yLayer — all interactive elements registered
 */

import * as Phaser from 'phaser';
import { A11yLayer } from './A11yLayer';
import { studentRepo, MAX_PROFILES } from '../persistence/repositories/studentRepo';
import type { Student } from '../types/runtime';
import type { AvatarKey } from '../types/runtime';
import { checkReduceMotion } from '../lib/preferences';
import { tween, Duration, Ease } from '../scenes/utils/motion';
import { BODY_FONT } from '../scenes/utils/levelTheme';

const LAST_STUDENT_KEY = 'questerix.lastUsedStudentId';

/** Avatar emoji map — each AvatarKey maps to a display emoji. */
const AVATAR_EMOJI: Record<AvatarKey, string> = {
  star: '⭐',
  rocket: '🚀',
  fox: '🦊',
  owl: '🦉',
  cat: '🐱',
  robot: '🤖',
  dragon: '🐉',
  bear: '🐻',
};

const DEFAULT_AVATAR: AvatarKey = 'star';

/** Chip dimensions (canvas pixels) */
const CHIP_W = 200;
const CHIP_H = 80;
const CHIP_X = 110; // left-aligned
const CHIP_Y = 60;

/** Expanded panel dimensions */
const PANEL_W = 340;
const CARD_H = 100;
const CARD_GAP = 12;
const ADD_BTN_H = 80;

export interface StudentSwitcherOptions {
  scene: Phaser.Scene;
  currentStudentId: string | null;
  /** Called when the user switches to a different profile. */
  onSwitch: (newStudentId: string) => void;
  /** Called when the user wants to add a new player (routes to FirstRunScene). */
  onAddPlayer: () => void;
}

export class StudentSwitcher {
  private scene: Phaser.Scene;
  private currentStudentId: string | null;
  private onSwitch: (id: string) => void;
  private onAddPlayer: () => void;
  private reduceMotion: boolean;

  private chip: Phaser.GameObjects.Container | null = null;
  private panel: Phaser.GameObjects.Container | null = null;
  private _expanded = false;
  private _students: Student[] = [];

  constructor(opts: StudentSwitcherOptions) {
    this.scene = opts.scene;
    this.currentStudentId = opts.currentStudentId;
    this.onSwitch = opts.onSwitch;
    this.onAddPlayer = opts.onAddPlayer;
    this.reduceMotion = checkReduceMotion();
  }

  /** Async factory — loads students then mounts the chip. */
  static async create(opts: StudentSwitcherOptions): Promise<StudentSwitcher> {
    const switcher = new StudentSwitcher(opts);
    await switcher._load();
    switcher._mountChip();
    switcher._registerA11y();
    return switcher;
  }

  private async _load(): Promise<void> {
    this._students = await studentRepo.list();
  }

  // ── Chip (collapsed state) ────────────────────────────────────────────────

  private _mountChip(): void {
    const current = this._students.find((s) => s.id === this.currentStudentId);
    const emoji = AVATAR_EMOJI[current?.avatar ?? DEFAULT_AVATAR];
    const name = (current?.displayName ?? 'Player').split(' ')[0] ?? 'Player';

    const container = this.scene.add.container(CHIP_X, CHIP_Y);
    container.setDepth(500);

    // Background pill
    const bg = this.scene.add.graphics();
    bg.fillStyle(0x1e3a8a, 0.9);
    bg.fillRoundedRect(-CHIP_W / 2, -CHIP_H / 2, CHIP_W, CHIP_H, 20);

    // Avatar emoji
    const avatarText = this.scene.add
      .text(-CHIP_W / 2 + 30, 0, emoji, { fontSize: '36px' })
      .setOrigin(0.5);

    // Name text
    const nameText = this.scene.add
      .text(10, 0, name, {
        fontFamily: BODY_FONT,
        fontSize: '26px',
        fontStyle: 'bold',
        color: '#ffffff',
      })
      .setOrigin(0, 0.5);

    // Chevron
    const chevron = this.scene.add
      .text(CHIP_W / 2 - 24, 0, '▾', {
        fontFamily: BODY_FONT,
        fontSize: '22px',
        color: '#93c5fd',
      })
      .setOrigin(0.5);

    container.add([bg, avatarText, nameText, chevron]);

    // Hit zone (≥100 canvas px tall → ≥44 CSS px at 360 vp)
    const hit = this.scene.add
      .rectangle(0, 0, CHIP_W, CHIP_H, 0x000000, 0)
      .setInteractive({ useHandCursor: true });
    container.add(hit);

    hit.on('pointerup', () => this._toggle());

    this.chip = container;
  }

  // ── Panel (expanded state) ────────────────────────────────────────────────

  private _toggle(): void {
    if (this._expanded) {
      this._collapse();
    } else {
      this._expand();
    }
  }

  private _expand(): void {
    if (this._expanded) return;
    this._expanded = true;

    const panelH =
      this._students.length * (CARD_H + CARD_GAP) +
      (this._students.length < MAX_PROFILES ? ADD_BTN_H + CARD_GAP : 0) +
      24;

    const panelX = CHIP_X;
    const panelY = CHIP_Y + CHIP_H / 2 + 12 + panelH / 2;

    const container = this.scene.add.container(panelX, panelY);
    container.setDepth(501);

    // Panel background
    const bg = this.scene.add.graphics();
    bg.fillStyle(0x1e3a8a, 0.97);
    bg.lineStyle(2, 0x60a5fa, 1);
    bg.fillRoundedRect(-PANEL_W / 2, -panelH / 2, PANEL_W, panelH, 16);
    bg.strokeRoundedRect(-PANEL_W / 2, -panelH / 2, PANEL_W, panelH, 16);
    container.add(bg);

    let cardY = -panelH / 2 + 12 + CARD_H / 2;

    for (const student of this._students) {
      this._addProfileCard(container, student, cardY);
      cardY += CARD_H + CARD_GAP;
    }

    // "+ Add Player" button
    if (this._students.length < MAX_PROFILES) {
      this._addAddPlayerButton(container, cardY);
    }

    // Entrance animation
    if (!this.reduceMotion) {
      container.setAlpha(0);
      container.setScale(0.9);
      tween(
        this.scene,
        container,
        { alpha: 1, scaleX: 1, scaleY: 1 },
        { duration: Duration.base, ease: Ease.out }
      );
    }

    this.panel = container;

    // Close on outside tap
    const closeZone = this.scene.add
      .rectangle(400, 640, 800, 1280, 0x000000, 0.01)
      .setInteractive()
      .setDepth(500);
    closeZone.on('pointerup', () => this._collapse());
    this.scene.events.once('shutdown', () => closeZone.destroy());
    (
      this.panel as Phaser.GameObjects.Container & { _closeZone?: Phaser.GameObjects.Rectangle }
    )._closeZone = closeZone;
  }

  private _addProfileCard(
    container: Phaser.GameObjects.Container,
    student: Student,
    y: number
  ): void {
    const isActive = student.id === this.currentStudentId;
    const emoji = AVATAR_EMOJI[student.avatar ?? DEFAULT_AVATAR];
    const name = student.displayName;

    // Card background
    const cardBg = this.scene.add.graphics();
    cardBg.fillStyle(isActive ? 0x1d4ed8 : 0x1e3a8a, 1);
    cardBg.lineStyle(2, isActive ? 0xfbbf24 : 0x3b82f6, 1);
    cardBg.fillRoundedRect(-PANEL_W / 2 + 8, y - CARD_H / 2, PANEL_W - 16, CARD_H, 12);
    cardBg.strokeRoundedRect(-PANEL_W / 2 + 8, y - CARD_H / 2, PANEL_W - 16, CARD_H, 12);
    container.add(cardBg);

    // Avatar
    container.add(
      this.scene.add.text(-PANEL_W / 2 + 50, y, emoji, { fontSize: '40px' }).setOrigin(0.5)
    );

    // Name
    container.add(
      this.scene.add
        .text(-PANEL_W / 2 + 90, y, name, {
          fontFamily: BODY_FONT,
          fontSize: '26px',
          fontStyle: isActive ? 'bold' : 'normal',
          color: '#ffffff',
        })
        .setOrigin(0, 0.5)
    );

    // Active indicator
    if (isActive) {
      container.add(
        this.scene.add
          .text(PANEL_W / 2 - 30, y, '✓', {
            fontFamily: BODY_FONT,
            fontSize: '28px',
            color: '#fbbf24',
          })
          .setOrigin(0.5)
      );
    }

    // Hit zone (≥100 canvas px tall)
    const hit = this.scene.add
      .rectangle(0, y, PANEL_W - 16, CARD_H, 0x000000, 0)
      .setInteractive({ useHandCursor: true });
    container.add(hit);

    if (!isActive) {
      hit.on('pointerup', () => {
        this._collapse();
        try {
          localStorage.setItem(LAST_STUDENT_KEY, student.id);
        } catch {
          /* ignore */
        }
        this.onSwitch(student.id);
      });
    }
  }

  private _addAddPlayerButton(container: Phaser.GameObjects.Container, y: number): void {
    const bg = this.scene.add.graphics();
    bg.fillStyle(0x059669, 1);
    bg.fillRoundedRect(-PANEL_W / 2 + 8, y - ADD_BTN_H / 2, PANEL_W - 16, ADD_BTN_H, 12);
    container.add(bg);

    container.add(
      this.scene.add
        .text(0, y, '+ Add Player', {
          fontFamily: BODY_FONT,
          fontSize: '26px',
          fontStyle: 'bold',
          color: '#ffffff',
        })
        .setOrigin(0.5)
    );

    const hit = this.scene.add
      .rectangle(0, y, PANEL_W - 16, ADD_BTN_H, 0x000000, 0)
      .setInteractive({ useHandCursor: true });
    container.add(hit);
    hit.on('pointerup', () => {
      this._collapse();
      this.onAddPlayer();
    });
  }

  private _collapse(): void {
    if (!this._expanded) return;
    this._expanded = false;

    const panel = this.panel;
    const closeZone = (
      panel as Phaser.GameObjects.Container & { _closeZone?: Phaser.GameObjects.Rectangle }
    )?._closeZone;
    closeZone?.destroy();

    if (panel) {
      if (!this.reduceMotion) {
        tween(
          this.scene,
          panel,
          { alpha: 0, scaleX: 0.9, scaleY: 0.9 },
          {
            duration: Duration.short,
            ease: Ease.in,
            onComplete: () => panel.destroy(),
          }
        );
      } else {
        panel.destroy();
      }
    }

    this.panel = null;
  }

  // ── A11y ─────────────────────────────────────────────────────────────────

  private _registerA11y(): void {
    A11yLayer.mountAction('student-switcher-toggle', 'Switch player profile', () => {
      this._toggle();
    });

    for (const student of this._students) {
      if (student.id !== this.currentStudentId) {
        A11yLayer.mountAction(
          `student-switch-${student.id}`,
          `Switch to ${student.displayName}`,
          () => {
            this._collapse();
            try {
              localStorage.setItem(LAST_STUDENT_KEY, student.id);
            } catch {
              /* ignore */
            }
            this.onSwitch(student.id);
          }
        );
      }
    }

    if (this._students.length < MAX_PROFILES) {
      A11yLayer.mountAction('student-add-player', 'Add a new player', () => {
        this._collapse();
        this.onAddPlayer();
      });
    }
  }

  /** Tear down all canvas and DOM objects. Call from the scene's shutdown handler. */
  destroy(): void {
    this._collapse();
    this.chip?.destroy();
    this.chip = null;
  }

  /** Expose current student list (for Settings etc.). */
  get students(): readonly Student[] {
    return this._students;
  }
}
