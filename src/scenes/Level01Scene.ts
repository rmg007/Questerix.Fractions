/**
 * Level01Scene — partition_halves activity for Level 1.
 * Student drags a line to split a shape into 2 equal parts.
 * per level-01.md §4.3 (partition_halves mechanic)
 * per interaction-model.md §1–§4 (drag vocab, feedback timing, hint ladder)
 * per runtime-architecture.md §6 (end-to-end lifecycle)
 * per design-language.md §2–§6 (palette, motion)
 * per C9 — 5 problems minimum per session
 */

import * as Phaser from 'phaser';
import { CLR } from './utils/colors';
import {
  drawAdventureBackground,
  createActionButton,
  createHintCircleButton,
  HINT_TEXT_STYLE,
  TITLE_FONT,
  BODY_FONT,
  NAVY_HEX,
  PATH_BLUE,
} from './utils/levelTheme';
import { TestHooks } from './utils/TestHooks';
import { DragHandle } from '../components/DragHandle';
import { FeedbackOverlay } from '../components/FeedbackOverlay';
import { HintLadder } from '../components/HintLadder';
import { ProgressBar } from '../components/ProgressBar';
import { AccessibilityAnnouncer } from '../components/AccessibilityAnnouncer';
import type { ValidatorResult, QuestionTemplate } from '@/types';
import type { PartitionInput, PartitionPayload } from '../validators/partition';

// ── Canvas & layout constants ─────────────────────────────────────────────

const CW = 800;
const CH = 1280;

// Shape rendering region — centre of canvas
const SHAPE_CX = CW / 2;
const SHAPE_CY = CH / 2 - 80;
const SHAPE_W = 340;
const SHAPE_H = 260;

// Session goal per C9
const SESSION_GOAL = 5;

// Snap threshold (±5% of half-width) per level-01.md §4.3 Easy tier
const SNAP_PCT = 0.05;

// ── Question definition (inline for MVP — curriculum loader is out of scope) ─

interface L01Question {
  id: string;
  shapeType: 'rectangle' | 'circle';
  difficultyTier: 'easy' | 'medium' | 'hard';
  areaTolerance: number;
  /** Only axis mode snaps to true halves. per level-01.md §4.3 */
  snapMode: 'axis' | 'free';
  promptText: string;
}

const QUESTIONS: L01Question[] = [
  {
    id: 'q:ph:L1:0001',
    shapeType: 'rectangle',
    difficultyTier: 'easy',
    areaTolerance: 0.05,
    snapMode: 'axis',
    promptText: 'Cut this shape into two equal parts.',
  },
  {
    id: 'q:ph:L1:0002',
    shapeType: 'rectangle',
    difficultyTier: 'easy',
    areaTolerance: 0.05,
    snapMode: 'axis',
    promptText: 'Drag the line to make two equal parts.',
  },
  {
    id: 'q:ph:L1:0003',
    shapeType: 'rectangle',
    difficultyTier: 'medium',
    areaTolerance: 0.05,
    snapMode: 'free',
    promptText: 'Split the rectangle in half.',
  },
  {
    id: 'q:ph:L1:0004',
    shapeType: 'circle',
    difficultyTier: 'medium',
    areaTolerance: 0.05,
    snapMode: 'free',
    promptText: 'Cut this circle into two equal parts.',
  },
  {
    id: 'q:ph:L1:0008',
    shapeType: 'circle',
    difficultyTier: 'hard',
    areaTolerance: 0.03,
    snapMode: 'free',
    promptText: 'Cut this circle into two equal parts.',
  },
];

// ── Scene ──────────────────────────────────────────────────────────────────

interface Level01Data {
  studentId: string | null;
  resume?: boolean;
}

export class Level01Scene extends Phaser.Scene {
  // Session state
  private studentId: string | null = null;
  private sessionId: string | null = null;
  private questionIndex: number = 0;
  private attemptCount: number = 0; // total across session
  private wrongCount: number = 0; // wrong attempts on current question
  private inputLocked: boolean = false;
  private resume: boolean = false;

  // Current question — may come from DB pool or synthetic fallback
  private currentQuestion!: L01Question;
  /** Real templates fetched from Dexie. Empty → synthetic fallback. */
  private templatePool: QuestionTemplate[] = [];

  // UI components
  private feedbackOverlay!: FeedbackOverlay;
  private progressBar!: ProgressBar;
  private hintLadder!: HintLadder;
  private dragHandle!: DragHandle;

  // Graphics
  private shapeGraphics!: Phaser.GameObjects.Graphics;
  private partitionLine!: Phaser.GameObjects.Graphics;
  private promptText!: Phaser.GameObjects.Text;
  private hintText!: Phaser.GameObjects.Text;
  private hintButton!: Phaser.GameObjects.Container;
  /** Submit button container — used by setInputLocked to toggle interactivity. */
  private submitButtonContainer!: Phaser.GameObjects.Container;

  // Track handle position for validation
  private handlePos: number = SHAPE_CX; // logical X (horizontal drag only in MVP)

  constructor() {
    super({ key: 'Level01Scene' });
  }

  init(data: Level01Data): void {
    this.studentId = data.studentId ?? null;
    this.resume = data.resume ?? false;
    this.questionIndex = 0;
    this.attemptCount = 0;
    this.wrongCount = 0;
    this.inputLocked = false;
  }

  async create(): Promise<void> {
    // Clear any stale sentinels from prior scenes
    TestHooks.unmountAll();

    // Adventure sky background — matches the MenuScene world
    drawAdventureBackground(this, CW, CH);

    // ── Load real templates from Dexie (partition + identify pool for L1) ──
    // per runtime-architecture.md §4.1 — ActivityScene loads QuestionTemplates via repo
    try {
      const { questionTemplateRepo } = await import('../persistence/repositories/questionTemplate');
      const all = await questionTemplateRepo.getByLevel(1);
      // Filter to archetypes expected for L1: partition, identify
      this.templatePool = all
        .filter((t) => t.archetype === 'partition' || t.archetype === 'identify')
        .slice(0, 5); // first 5 distinct templates for the session
      if (this.templatePool.length > 0) {
        console.info(`[Level01Scene] Loaded ${this.templatePool.length} real templates from Dexie`);
      } else {
        console.info('[Level01Scene] No real templates found — using synthetic fallback');
      }
    } catch (err) {
      // Graceful degradation — synthetic content per runtime-architecture.md §10
      console.warn('[Level01Scene] Template fetch failed — using synthetic fallback:', err);
      this.templatePool = [];
    }

    // ── Open session in persistence ────────────────────────────────────────
    // per runtime-architecture.md §8 step 4 — new Session row on scene load
    await this.openSession();

    // ── UI chrome ──────────────────────────────────────────────────────────
    this.createHeader();
    this.createPromptArea();
    this.createHintArea();
    this.createHintButton();
    this.createSubmitButton();

    // Progress bar — N / 5 per C9
    this.progressBar = new ProgressBar({
      scene: this,
      x: CW / 2 - 200,
      y: CH - 100,
      width: 400,
      goal: SESSION_GOAL,
    });

    // Feedback overlay — per interaction-model.md §2 (<800ms)
    this.feedbackOverlay = new FeedbackOverlay({ scene: this });

    // Shape graphics placeholder
    this.shapeGraphics = this.add.graphics().setDepth(5);
    this.partitionLine = this.add.graphics().setDepth(6);

    // ── Test hooks ─────────────────────────────────────────────────────────
    // NOTE: must run AFTER ProgressBar construction so progress-bar sentinel is not wiped
    TestHooks.mountSentinel('level01-scene');
    // partition-target: transparent button over canvas centre — clicking it submits
    TestHooks.mountInteractive(
      'partition-target',
      () => {
        void this.onSubmit();
      },
      { width: '120px', height: '120px', top: '50%', left: '50%' }
    );
    // hint-btn: transparent button over the ? button (upper-right)
    TestHooks.mountInteractive(
      'hint-btn',
      () => {
        this.onHintRequest();
      },
      { width: '80px', height: '48px', top: '12.5%', left: 'calc(50% + 280px)' }
    );
    // hint-text: starts hidden (no text). showHintForTier makes it visible.
    // Sentinel is a span with role=status; visibility toggled by data-visible attr.
    this.mountHintTextSentinel();

    // Load first question
    this.loadQuestion(0);
  }

  /** Mount hint-text sentinel; invisible until text is set via showHintForTier. */
  private mountHintTextSentinel(): void {
    // Use mountSentinel (opacity:0) — once text is set we switch to opacity:0.01
    // so Playwright's visibility check passes.
    TestHooks.mountSentinel('hint-text');
  }

  // ── Session persistence ──────────────────────────────────────────────────

  private async openSession(): Promise<void> {
    if (!this.studentId) return;
    try {
      // C7.5-C7.6: Record lastUsedStudentId for session resumption
      const { lastUsedStudent } = await import('../persistence/lastUsedStudent');
      lastUsedStudent.set(this.studentId as import('@/types').StudentId);

      // ── Resume existing session if flag is true ────────────────────────────
      if (this.resume === true) {
        const { sessionRepo } = await import('../persistence/repositories/session');
        const sessions = await sessionRepo.listForStudent(
          this.studentId as import('@/types').StudentId
        );

        if (sessions.length > 0) {
          const lastSession = sessions[0]!;
          this.sessionId = lastSession.id as string;

          // Restore prior attempt count
          const { attemptRepo } = await import('../persistence/repositories/attempt');
          const priorAttempts = await attemptRepo.listForSession(lastSession.id);
          this.attemptCount = priorAttempts.length;

          // Update progressBar if it exists
          if (this.progressBar) {
            this.progressBar.setProgress(this.attemptCount);
          }

          console.info(
            `[Level01Scene] Session resumed: ${this.sessionId} with ${this.attemptCount} prior attempts`
          );
          return;
        }
      }

      // ── Create new session ─────────────────────────────────────────────────
      const { sessionRepo } = await import('../persistence/repositories/session');
      const { nanoid } = await import('nanoid').catch(() => ({ nanoid: () => `s-${Date.now()}` }));
      const id = nanoid() as import('@/types').SessionId;

      const session = await sessionRepo.create({
        id,
        studentId: this.studentId as import('@/types').StudentId,
        activityId: 'partition_halves' as import('@/types').ActivityId,
        levelNumber: 1,
        scaffoldLevel: 1,
        startedAt: Date.now(),
        endedAt: null,
        totalAttempts: 0,
        correctAttempts: 0,
        accuracy: null,
        avgResponseMs: null,
        xpEarned: 0,
        scaffoldRecommendation: null,
        endLevel: 1,
        device: {
          type: 'unknown',
          viewport: { width: window.innerWidth, height: window.innerHeight },
        },
        syncState: 'local',
      });
      this.sessionId = session.id;
      console.info('[Level01Scene] Session opened:', this.sessionId);
    } catch (err) {
      // Volatile mode — continue without session record per runtime-architecture.md §10
      console.warn('[Level01Scene] Could not open session:', err);
    }
  }

  // ── UI construction ──────────────────────────────────────────────────────

  private createHeader(): void {
    // Level title — Fredoka One display font, matching MenuScene station labels
    this.add
      .text(CW / 2, 60, 'Level 1 — Halves', {
        fontSize: '32px',
        fontFamily: TITLE_FONT,
        fontStyle: 'bold',
        color: NAVY_HEX,
        stroke: '#FFFFFF',
        strokeThickness: 3,
      })
      .setOrigin(0.5)
      .setDepth(5);

    const backBtn = this.add
      .text(52, 60, '← Menu', {
        fontSize: '18px',
        fontFamily: BODY_FONT,
        fontStyle: 'bold',
        color: NAVY_HEX,
        backgroundColor: 'rgba(255,255,255,0.75)',
        padding: { x: 10, y: 6 },
      })
      .setOrigin(0.5)
      .setDepth(5)
      .setInteractive({
        hitArea: new Phaser.Geom.Rectangle(-28, -20, 56, 40),
        hitAreaCallback: Phaser.Geom.Rectangle.Contains,
        useHandCursor: true,
      });

    backBtn.on('pointerup', () => {
      this.scene.start('MenuScene', { lastStudentId: this.studentId });
    });
  }

  private createPromptArea(): void {
    this.promptText = this.add
      .text(CW / 2, 160, '', {
        fontSize: '22px',
        fontFamily: BODY_FONT,
        fontStyle: 'bold',
        color: NAVY_HEX,
        align: 'center',
        wordWrap: { width: 640 },
        backgroundColor: 'rgba(255,255,255,0.75)',
        padding: { x: 14, y: 8 },
      })
      .setOrigin(0.5)
      .setDepth(5);
  }

  private createHintArea(): void {
    this.hintText = this.add
      .text(CW / 2, CH - 280, '', HINT_TEXT_STYLE)
      .setOrigin(0.5)
      .setDepth(5)
      .setVisible(false);
  }

  private createHintButton(): void {
    this.hintButton = createHintCircleButton(
      this,
      CW - 60,
      160,
      () => this.onHintRequest(),
      10,
    );
  }

  private createSubmitButton(): void {
    this.submitButtonContainer = createActionButton(
      this,
      CW / 2,
      CH - 180,
      'Check ✓',
      () => { this.onSubmit(); },
      10,
    );
  }

  // ── Question loading ──────────────────────────────────────────────────────

  private loadQuestion(index: number): void {
    this.questionIndex = index % Math.max(this.templatePool.length || QUESTIONS.length);

    if (this.templatePool.length > 0) {
      // Use real template from Dexie pool — map to L01Question shape for this scene
      const tmpl = this.templatePool[this.questionIndex % this.templatePool.length]!;
      const payload = tmpl.payload as Partial<PartitionPayload> & {
        shapeType?: 'rectangle' | 'circle';
      };
      this.currentQuestion = {
        id: tmpl.id,
        shapeType: payload.shapeType ?? 'rectangle',
        difficultyTier: tmpl.difficultyTier,
        areaTolerance: payload.areaTolerance ?? 0.05,
        snapMode: tmpl.difficultyTier === 'easy' ? 'axis' : 'free',
        promptText: tmpl.prompt.text,
      };
    } else {
      // Synthetic fallback — keeps game playable with no curriculum bundle
      this.currentQuestion = QUESTIONS[this.questionIndex % QUESTIONS.length]!;
    }

    this.wrongCount = 0;
    this.inputLocked = false;
    this.handlePos = SHAPE_CX; // reset to center

    // Hint ladder resets per question per interaction-model.md §4.1
    this.hintLadder = new HintLadder(this.currentQuestion.difficultyTier);
    this.hintText.setVisible(false);

    this.promptText.setText(this.currentQuestion.promptText);

    this.drawShape();
    this.createDragHandle();
  }

  // ── Shape rendering ───────────────────────────────────────────────────────

  private drawShape(): void {
    this.shapeGraphics.clear();

    const { shapeType } = this.currentQuestion;

    if (shapeType === 'rectangle') {
      this.drawRectShape();
    } else {
      this.drawCircleShape();
    }

    this.updatePartitionLine(this.handlePos);
  }

  private drawRectShape(): void {
    const g = this.shapeGraphics;
    const x = SHAPE_CX - SHAPE_W / 2;
    const y = SHAPE_CY - SHAPE_H / 2;

    // Soft white fill with a light navy border — lives in the adventure world
    g.fillStyle(0xffffff, 0.9);
    g.fillRect(x, y, SHAPE_W, SHAPE_H);
    g.lineStyle(3, 0x1e3a8a, 0.35);
    g.strokeRect(x, y, SHAPE_W, SHAPE_H);
  }

  private drawCircleShape(): void {
    const g = this.shapeGraphics;

    g.fillStyle(0xffffff, 0.9);
    g.fillCircle(SHAPE_CX, SHAPE_CY, SHAPE_W / 2);
    g.lineStyle(3, 0x1e3a8a, 0.35);
    g.strokeCircle(SHAPE_CX, SHAPE_CY, SHAPE_W / 2);
  }

  /**
   * Draw the partition line as a dashed path — the same visual language
   * as the marching-dash number line on the MenuScene.
   *
   * Renders: thick PATH_BLUE background rail + white dashes on top.
   */
  private updatePartitionLine(handleX: number): void {
    const g = this.partitionLine;
    g.clear();

    const top    = SHAPE_CY - SHAPE_H / 2 - 20;
    const bottom = SHAPE_CY + SHAPE_H / 2 + 20;
    const len    = bottom - top;

    // Background rail (light-blue, matching the path)
    g.lineStyle(12, PATH_BLUE, 1);
    g.lineBetween(handleX, top, handleX, bottom);

    // White dashes
    const dashLen = 14;
    const gapLen  = 10;
    const cycle   = dashLen + gapLen;
    g.lineStyle(6, 0xffffff, 1);

    let pos = 0;
    while (pos < len) {
      const segEnd = Math.min(len, pos + dashLen);
      g.lineBetween(handleX, top + pos, handleX, top + segEnd);
      pos += cycle;
    }
  }

  // ── Drag handle creation ──────────────────────────────────────────────────

  private createDragHandle(): void {
    // Destroy previous handle if any
    (this.dragHandle as DragHandle | undefined)?.destroy();

    const minX = SHAPE_CX - SHAPE_W / 2;
    const maxX = SHAPE_CX + SHAPE_W / 2;
    const snapThreshold = SHAPE_W * SNAP_PCT; // per level-01.md §4.3 ±5%

    // Only snap in axis mode per level-01.md §4.3
    const snapTargets = this.currentQuestion.snapMode === 'axis' ? [SHAPE_CX] : [];

    this.dragHandle = new DragHandle({
      scene: this,
      x: SHAPE_CX,
      y: SHAPE_CY,
      trackLength: SHAPE_H + 40,
      axis: 'horizontal',
      minPos: minX,
      maxPos: maxX,
      snapThreshold,
      snapTargets,
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

  // ── Validation ────────────────────────────────────────────────────────────

  private async onSubmit(): Promise<void> {
    if (this.inputLocked) return;

    // per interaction-model.md §2.1 — disable input until outcome animation completes
    this.inputLocked = true;
    this.submitButtonContainer?.setAlpha(0.5);

    const startedAt = Date.now();

    // Compute areas from handle position
    // Horizontal line splits rectangle by X position
    const leftArea = this.handlePos - (SHAPE_CX - SHAPE_W / 2);
    const rightArea = SHAPE_CX + SHAPE_W / 2 - this.handlePos;

    const input: PartitionInput = { regionAreas: [leftArea, rightArea] };
    const payload: PartitionPayload = {
      targetPartitions: 2,
      areaTolerance: this.currentQuestion.areaTolerance,
    };

    let result: ValidatorResult;

    try {
      if (this.templatePool.length > 0) {
        // Use validator registry with the template's validatorId
        // per runtime-architecture.md §4.2 (ValidatorRegistry)
        const { validatorRegistry } = await import('../validators/registry');
        const reg = validatorRegistry.get(this.currentQuestion.id as never);
        // Fall back to direct partition validator if ID not found in registry
        if (reg) {
          result = (reg as { fn: (i: unknown, p: unknown) => ValidatorResult }).fn(input, payload);
        } else {
          const { partitionEqualAreas } = await import('../validators/partition');
          result = partitionEqualAreas.fn(input, payload);
        }
      } else {
        const { partitionEqualAreas } = await import('../validators/partition');
        result = partitionEqualAreas.fn(input, payload);
      }
    } catch (err) {
      console.error('[Level01Scene] Validator error — marking ABANDONED:', err);
      result = { outcome: 'incorrect', score: 0, feedback: 'validator_error' };
    }

    const responseMs = Date.now() - startedAt;
    await this.recordAttempt(result, responseMs, input);

    this.showOutcome(result);
  }

  private showOutcome(result: ValidatorResult): void {
    const kind =
      result.outcome === 'correct'
        ? 'correct'
        : result.outcome === 'partial'
          ? 'close'
          : 'incorrect';

    // Update progress bar immediately on correct so tests can check aria-valuenow
    // before the feedback overlay is dismissed.
    if (kind === 'correct') {
      this.progressBar.setProgress(this.attemptCount + 1);
    }

    // FeedbackOverlay — per interaction-model.md §2 (<800ms)
    this.feedbackOverlay.show(kind, () => {
      this.inputLocked = false;
      this.submitButtonContainer?.setAlpha(1);
      if (kind === 'correct') {
        this.onCorrectAnswer();
      } else {
        this.onWrongAnswer();
      }
    });

    // ARIA live announcement — per interaction-model.md §9
    // per interaction-model.md §5.1 — never say "wrong"
    const announcement =
      kind === 'correct'
        ? 'Correct! Great work.'
        : kind === 'close'
          ? 'Almost! Try a tiny adjustment.'
          : 'Not quite — try again.';
    AccessibilityAnnouncer.announce(announcement);
  }

  private onCorrectAnswer(): void {
    this.attemptCount++;
    this.progressBar.setProgress(this.attemptCount);

    if (this.attemptCount >= SESSION_GOAL) {
      this.showSessionComplete();
    } else {
      // Advance to next question
      this.loadQuestion(this.questionIndex + 1);
    }
  }

  private onWrongAnswer(): void {
    this.wrongCount++;

    // Auto-escalate hint after wrong attempt per interaction-model.md §4 + §5.4
    const tier = this.hintLadder.tierForAttemptCount(this.wrongCount);
    if (tier) {
      this.showHintForTier(tier);
    }

    // per interaction-model.md §5.4 — after 3 wrong, auto-pulse hint button
    if (this.wrongCount >= 3) {
      this.pulseHintButton();
    }

    this.inputLocked = false;
  }

  // ── Hint handling ─────────────────────────────────────────────────────────

  private onHintRequest(): void {
    const tier = this.hintLadder.next();
    this.showHintForTier(tier);
  }

  /**
   * Show hint text or visual overlay based on tier.
   * per interaction-model.md §4 (3 tiers: verbal, visual_overlay, worked_example)
   */
  private showHintForTier(tier: import('@/types').HintTier): void {
    this.hintText.setVisible(true);

    let hintMessage = '';
    switch (tier) {
      case 'verbal':
        // Tier 1 — verbal prompt per interaction-model.md §4
        hintMessage = 'Tip: Equal parts means each piece is the same size. Try the middle!';
        this.hintText.setText(hintMessage);
        break;

      case 'visual_overlay':
        // Tier 2 — faint center line overlay per interaction-model.md §4
        hintMessage = 'Look for the center of the shape.';
        this.hintText.setText(hintMessage);
        this.drawCenterOverlay();
        break;

      case 'worked_example':
        // Tier 3 — animated demo per interaction-model.md §4
        // per interaction-model.md §4.1 — Tier 3 never auto-completes; canvas resets after demo
        hintMessage = 'Watch where to place the line, then try yourself.';
        this.hintText.setText(hintMessage);
        this.animateWorkedExample();
        break;
    }
    // Mirror hint text to DOM sentinel for tests
    TestHooks.setText('hint-text', hintMessage);
  }

  /** Tier 2: faint dashed center-line overlay. per interaction-model.md §4 */
  private drawCenterOverlay(): void {
    const overlay = this.add.graphics().setDepth(8).setAlpha(0.4);
    overlay.lineStyle(3, CLR.neutral600, 1);
    overlay.lineBetween(
      SHAPE_CX,
      SHAPE_CY - SHAPE_H / 2 - 20,
      SHAPE_CX,
      SHAPE_CY + SHAPE_H / 2 + 20
    );
    // Fade out after 3 seconds
    this.time.delayedCall(3000, () => {
      this.tweens.add({
        targets: overlay,
        alpha: 0,
        duration: 400,
        onComplete: () => overlay.destroy(),
      });
    });
  }

  /**
   * Tier 3: animate handle to center, then reset for student attempt.
   * per interaction-model.md §4 — Tier 3 never auto-completes; per §7 reduced motion = static overlay.
   * per design-language.md §6.1 (partition demonstration 400–600ms)
   */
  private animateWorkedExample(): void {
    const reduceMotion = this.checkReduceMotion();

    if (reduceMotion) {
      // per design-language.md §6.4 — static overlay
      this.drawCenterOverlay();
      // Reset handle position after a brief pause
      this.time.delayedCall(1200, () => {
        this.handlePos = SHAPE_CX;
        this.dragHandle.moveTo(SHAPE_CX, false);
        this.updatePartitionLine(SHAPE_CX);
      });
      return;
    }

    // Animate handle to correct center position
    this.inputLocked = true;
    this.dragHandle.moveTo(SHAPE_CX, true); // 500ms animation

    this.time.delayedCall(700, () => {
      // Brief pause showing correct position, then reset for student attempt
      this.time.delayedCall(800, () => {
        this.handlePos = SHAPE_CX + SHAPE_W * 0.3; // deliberately off-center
        this.dragHandle.moveTo(this.handlePos, false);
        this.updatePartitionLine(this.handlePos);
        this.inputLocked = false;
        this.hintText.setText('Now you try! Drag the line to the middle.');
      });
    });
  }

  /** One-time pulse on the hint button per interaction-model.md §5.4 */
  private pulseHintButton(): void {
    const reduceMotion = this.checkReduceMotion();
    if (reduceMotion) return;

    this.tweens.add({
      targets: this.hintButton,
      scaleX: 1.1,
      scaleY: 1.1,
      duration: 200,
      yoyo: true,
      repeat: 2,
    });
  }

  // ── Persistence ────────────────────────────────────────────────────────────

  private async recordAttempt(
    result: ValidatorResult,
    responseMs: number,
    input: PartitionInput
  ): Promise<void> {
    if (!this.studentId || !this.sessionId) return;

    try {
      const { attemptRepo } = await import('../persistence/repositories/attempt');
      const { nanoid } = await import('nanoid').catch(() => ({ nanoid: () => `a-${Date.now()}` }));

      const outcome: import('@/types').AttemptOutcome =
        result.outcome === 'correct' ? 'EXACT' : result.outcome === 'partial' ? 'CLOSE' : 'WRONG';

      await attemptRepo.record({
        id: nanoid() as import('@/types').AttemptId,
        sessionId: this.sessionId as import('@/types').SessionId,
        studentId: this.studentId as import('@/types').StudentId,
        questionTemplateId: this.currentQuestion.id as import('@/types').QuestionTemplateId,
        archetype: 'partition' as import('@/types').ArchetypeId,
        roundNumber: this.questionIndex + 1,
        attemptNumber: Math.min(this.wrongCount + 1, 4) as 1 | 2 | 3 | 4,
        startedAt: Date.now() - responseMs,
        submittedAt: Date.now(),
        responseMs,
        studentAnswerRaw: input,
        correctAnswerRaw: null,
        outcome,
        errorMagnitude: null,
        pointsEarned: result.score,
        hintsUsedIds: [],
        hintsUsed: [],
        flaggedMisconceptionIds: [],
        validatorPayload: result,
        syncState: 'local',
      });
    } catch (err) {
      // Never crash on persistence failure per task spec
      console.warn('[Level01Scene] Could not record attempt:', err);
    }
  }

  // ── Session complete ───────────────────────────────────────────────────────

  /** Show "Session complete" card after SESSION_GOAL correct answers. per C9, interaction-model.md §6.2 */
  private async showSessionComplete(): Promise<void> {
    this.inputLocked = true;
    TestHooks.mountSentinel('completion-screen');

    // Dim background
    const overlay = this.add.rectangle(CW / 2, CH / 2, CW, CH, 0x1e3a8a, 0.45).setDepth(50);

    // Card — white rounded card matching the adventure theme
    const cardG = this.add.graphics().setDepth(51);
    cardG.fillStyle(0xe0f2fe, 1);
    cardG.fillRoundedRect(CW / 2 - 280, CH / 2 - 220, 560, 440, 24);
    cardG.lineStyle(5, 0x1e3a8a, 1);
    cardG.strokeRoundedRect(CW / 2 - 280, CH / 2 - 220, 560, 440, 24);

    this.add
      .text(CW / 2, CH / 2 - 150, '🎉 Session complete!', {
        fontSize: '36px',
        fontFamily: TITLE_FONT,
        fontStyle: 'bold',
        color: NAVY_HEX,
      })
      .setOrigin(0.5)
      .setDepth(52);

    this.add
      .text(CW / 2, CH / 2 - 60, `You finished ${this.attemptCount} problems!`, {
        fontSize: '22px',
        fontFamily: BODY_FONT,
        color: NAVY_HEX,
      })
      .setOrigin(0.5)
      .setDepth(52);

    // "Keep going" — amber action button
    const keepBtn = createActionButton(
      this,
      CW / 2,
      CH / 2 + 60,
      'Keep going ▶',
      () => {
        overlay.destroy();
        cardG.destroy();
        keepBtn.destroy();
        this.attemptCount = 0;
        this.inputLocked = false;
        this.loadQuestion(this.questionIndex + 1);
      },
      52,
    );

    // "Back to menu" — secondary button
    this.createModalButton(
      CW / 2,
      CH / 2 + 160,
      'Back to menu',
      0xffffff,
      NAVY_HEX,
      () => {
        this.time.delayedCall(200, () => {
          this.scene.start('MenuScene', { lastStudentId: this.studentId });
        });
      },
      52
    );

    // ARIA announcement
    AccessibilityAnnouncer.announce(
      `Session complete! You finished ${this.attemptCount} problems.`
    );

    // Close session in persistence
    await this.closeSession();
  }

  private createModalButton(
    x: number,
    y: number,
    label: string,
    bg: number,
    textColor: string,
    onTap: () => void,
    depth: number
  ): void {
    const g = this.add.graphics().setDepth(depth);
    g.fillStyle(bg, 1);
    g.fillRoundedRect(x - 160, y - 28, 320, 56, 28);
    g.lineStyle(4, 0x1e3a8a, 1);
    g.strokeRoundedRect(x - 160, y - 28, 320, 56, 28);

    this.add
      .text(x, y, label, {
        fontSize: '20px',
        fontFamily: BODY_FONT,
        fontStyle: 'bold',
        color: textColor,
      })
      .setOrigin(0.5)
      .setDepth(depth + 1);

    this.add
      .rectangle(x, y, 320, 56, 0, 0)
      .setInteractive({ useHandCursor: true })
      .setDepth(depth + 2)
      .on('pointerup', onTap);
  }

  private async closeSession(): Promise<void> {
    if (!this.sessionId) return;
    try {
      const { sessionRepo } = await import('../persistence/repositories/session');
      await sessionRepo.close(this.sessionId as import('@/types').SessionId, {
        endedAt: Date.now(),
        totalAttempts: this.attemptCount,
        correctAttempts: this.attemptCount, // all counted correct in session-complete branch
        accuracy: 1,
        avgResponseMs: null,
        xpEarned: this.attemptCount * 10,
        scaffoldRecommendation: 'stay',
        endLevel: 1,
      });
    } catch (err) {
      console.warn('[Level01Scene] Could not close session:', err);
    }
  }

  // ── Utilities ─────────────────────────────────────────────────────────────

  private checkReduceMotion(): boolean {
    try {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch {
      return false;
    }
  }

  // Called by Phaser when scene is shut down
  preDestroy(): void {
    AccessibilityAnnouncer.destroy();
    TestHooks.unmountAll();
  }
}
