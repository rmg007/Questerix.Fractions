import * as Phaser from 'phaser';
import { log } from './log';
import { SessionCompleteOverlay } from '@/components/SessionCompleteOverlay';
import { evaluateUnlockGate } from './unlockGate';
import type { StudentId } from '@/types';

const SESSION_GOAL = 5;

export interface SessionCompleteContext {
  scene: Phaser.Scene;
  levelNumber: number;
  studentId: string | null;
  attemptCount: number;
  correctCount: number;
  responseTimes: number[];
  canvasWidth: number;
  canvasHeight: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  mascot: any;
}

export interface SessionCompleteCallbacks {
  setInputLocked: (locked: boolean) => void;
  markLevelComplete: () => void;
  persistCompletion: () => Promise<void>;
  closeSession: () => Promise<void>;
  navigateNextLevel: (next: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9) => void;
  navigatePlayAgain: () => void;
  navigateMenu: () => void;
}

export async function showSessionCompleteForLevel(
  ctx: SessionCompleteContext,
  callbacks: SessionCompleteCallbacks
): Promise<void> {
  callbacks.setInputLocked(true);

  const accuracy = ctx.attemptCount > 0 ? +(ctx.correctCount / ctx.attemptCount).toFixed(3) : null;
  const avgResponseMs =
    ctx.responseTimes.length > 0
      ? Math.round(ctx.responseTimes.reduce((a, b) => a + b, 0) / ctx.responseTimes.length)
      : null;
  log.scene('session_complete', {
    level: ctx.levelNumber,
    attemptCount: ctx.attemptCount,
    correctCount: ctx.correctCount,
    accuracy,
    avgResponseMs,
  });

  // Phase 2a (D-1): gate next-level unlock on correctCount/never-stuck/researcher
  const gate = await evaluateUnlockGate({
    studentId: ctx.studentId as StudentId | null,
    levelNumber: ctx.levelNumber,
    correctCount: ctx.correctCount,
  });
  if (gate.passed) callbacks.markLevelComplete();
  if (gate.passed) void callbacks.persistCompletion();

  const nextLevel =
    ctx.levelNumber < 9 ? ((ctx.levelNumber + 1) as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9) : null;

  // T11: Scaffold recommendation. Gate failure forces 'stay' regardless of accuracy.
  const totalAttempts = ctx.responseTimes.length;
  const acc = totalAttempts > 0 ? ctx.correctCount / totalAttempts : 0;
  let scaffoldRec: 'advance' | 'stay' | 'regress' = 'stay';
  if (gate.passed && acc >= 0.8) scaffoldRec = 'advance';
  else if (gate.passed && acc < 0.4) scaffoldRec = 'regress';
  const isPerfect = gate.passed && acc === 1 && totalAttempts === SESSION_GOAL;

  new SessionCompleteOverlay({
    scene: ctx.scene,
    levelNumber: ctx.levelNumber,
    correctCount: ctx.correctCount,
    totalAttempts,
    width: ctx.canvasWidth,
    height: ctx.canvasHeight,
    scaffoldRecommendation: scaffoldRec,
    nextLevelNumber: scaffoldRec === 'advance' && nextLevel !== null ? nextLevel : null,
    isPerfect,
    ...(gate.passed && nextLevel !== null
      ? { onNextLevel: () => callbacks.navigateNextLevel(nextLevel) }
      : {}),
    onPlayAgain: () => callbacks.navigatePlayAgain(),
    onMenu: () => callbacks.navigateMenu(),
  });

  // T16: Quest session-complete speech line
  let completeLine = 'Great practice! Keep going!';
  if (!gate.passed) completeLine = "Let's practice a little more!";
  else if (scaffoldRec === 'advance') completeLine = 'I knew you could do it! ⭐';
  ctx.scene.time.delayedCall(800, () => ctx.mascot?.showSpeechBubble(completeLine, 3000));

  if (ctx.mascot) {
    ctx.mascot.setDepth(60);
    ctx.mascot.reposition(ctx.canvasWidth - 120, 400);
    ctx.mascot.setState(gate.passed ? 'cheer-big' : 'idle');
  }

  void callbacks.closeSession();
}
