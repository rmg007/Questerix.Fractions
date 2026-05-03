/**
 * Session completion UI and flow for Level01Scene.
 */

import * as Phaser from 'phaser';
import { SessionCompleteOverlay } from '@/components/SessionCompleteOverlay';
import { fadeAndStart } from '@/scenes/utils/sceneTransition';
import { MenuScene } from '@/scenes/MenuScene';
import { log } from './log';
import type { StudentId, LevelId } from '@/types';
import type { CalibrationState } from '@/engine/calibration';

const CW = 800;
const CH = 1280;
const SESSION_GOAL = 5;

export interface SessionCompleteContext {
  scene: Phaser.Scene;
  studentId: StudentId | null;
  correctCount: number;
  totalAttempts: number;
  responseTimes: number[];
  attemptCount: number;
  recentOutcomes: boolean[];
  calibrationState: CalibrationState | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  mascot: any;
  persistLevelCompletion: () => Promise<void>;
  checkAllLevelsComplete: () => Promise<boolean>;
}

export async function runSessionCompleteFlow(ctx: SessionCompleteContext): Promise<void> {
  log.scene('session_complete', {
    attemptCount: ctx.attemptCount,
    correctCount: ctx.correctCount,
    totalAttempted: ctx.totalAttempts,
    accuracy: ctx.totalAttempts > 0 ? +(ctx.correctCount / ctx.totalAttempts).toFixed(3) : null,
    avgResponseMs:
      ctx.responseTimes.length > 0
        ? Math.round(ctx.responseTimes.reduce((a, b) => a + b, 0) / ctx.responseTimes.length)
        : null,
  });

  const { evaluateUnlockGate } = await import('./unlockGate');
  const gate = await evaluateUnlockGate({
    studentId: ctx.studentId,
    levelNumber: 1,
    correctCount: ctx.correctCount,
  });
  if (gate.passed) MenuScene.markLevelComplete(1, ctx.studentId);
  if (gate.passed) await ctx.persistLevelCompletion();

  try {
    const { decideNextLevel } = await import('@/engine/router');
    const inCalibration = !!(ctx.calibrationState && ctx.calibrationState.remaining > 0);
    const suggestedLevel = decideNextLevel({
      currentLevel: 1 as LevelId,
      masteries: new Map(),
      prereqsMet: false,
      inCalibration,
      recentOutcomes: ctx.recentOutcomes.slice(-5),
    });
    const suggestKey = ctx.studentId ? `suggestedLevel:${ctx.studentId}` : 'suggestedLevel';
    sessionStorage.setItem(suggestKey, String(suggestedLevel));
  } catch (err) {
    log.warn('ROUT', 'decision_error', { error: String(err) });
  }

  const allDone = await ctx.checkAllLevelsComplete();
  if (allDone) {
    const { QuestCompleteOverlay } = await import('@/components/QuestCompleteOverlay');
    new QuestCompleteOverlay({
      scene: ctx.scene,
      width: CW,
      height: CH,
      onPlayAgainFromStart: () =>
        fadeAndStart(ctx.scene, 'LevelScene', { levelNumber: 1, studentId: ctx.studentId }),
      onMenu: () => fadeAndStart(ctx.scene, 'MenuScene', { lastStudentId: ctx.studentId }),
    });
    if (ctx.mascot) {
      ctx.mascot.setDepth(60);
      ctx.mascot.reposition(700, 250);
      ctx.mascot.setState('celebrate');
    }
    return;
  }

  const advance =
    gate.passed && ctx.totalAttempts > 0 && ctx.correctCount / ctx.totalAttempts >= 0.8;
  const scaffoldRec: 'advance' | 'stay' = advance ? 'advance' : 'stay';
  const isPerfect =
    gate.passed && ctx.correctCount >= SESSION_GOAL && ctx.totalAttempts === SESSION_GOAL;

  new SessionCompleteOverlay({
    scene: ctx.scene,
    levelNumber: 1,
    correctCount: ctx.correctCount,
    totalAttempts: ctx.totalAttempts,
    width: CW,
    height: CH,
    scaffoldRecommendation: scaffoldRec,
    nextLevelNumber: scaffoldRec === 'advance' ? 2 : null,
    isPerfect,
    ...(gate.passed
      ? {
          onNextLevel: () =>
            fadeAndStart(ctx.scene, 'LevelScene', { levelNumber: 2, studentId: ctx.studentId }),
        }
      : {}),
    onPlayAgain: () => fadeAndStart(ctx.scene, 'Level01Scene', { studentId: ctx.studentId }),
    onMenu: () =>
      fadeAndStart(ctx.scene, 'LevelMapScene', {
        studentId: ctx.studentId,
        postSession: true,
        levelNumber: 1,
        completedScore: ctx.correctCount,
      }),
  });

  let completeLine = 'Great practice! Keep going!';
  if (!gate.passed) completeLine = "Let's practice a little more!";
  else if (advance) completeLine = 'I knew you could do it! ⭐';
  ctx.scene.time.delayedCall(800, () => ctx.mascot?.showSpeechBubble(completeLine, 3000));

  if (ctx.mascot) {
    ctx.mascot.setDepth(60);
    ctx.mascot.reposition(700, 250);
    ctx.mascot.setState(gate.passed ? 'cheer-big' : 'idle');
  }
}
