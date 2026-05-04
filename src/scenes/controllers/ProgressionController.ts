/**
 * ProgressionController — manages session lifecycle, attempt recording, and completion.
 * Extracted from LevelScene to reduce coupling and LOC.
 */

import {
  openSessionForLevel,
  recordAttemptAndMasteryForLevel,
  closeSessionForLevel,
  persistLevelCompletionForLevel,
} from '../../lib/levelSceneSession';
import { showSessionCompleteForLevel } from '../../lib/levelSceneSessionComplete';
import type { SessionId, StudentId, QuestionTemplate, ValidatorResult, ProgressionEvent } from '@/types';
import { log } from '../../lib/log';
import type { Mascot } from '../../components/Mascot';

export class ProgressionController {
  private sessionId: SessionId | null = null;
  private attemptCount: number = 0;
  private correctCount: number = 0;
  private responseTimes: number[] = [];
  private studentDisplayName: string | null = null;

  constructor(private scene: Phaser.Scene) {}

  reset(): void {
    this.sessionId = null;
    this.attemptCount = 0;
    this.correctCount = 0;
    this.responseTimes = [];
    this.studentDisplayName = null;
  }

  getSessionId(): SessionId | null {
    return this.sessionId;
  }

  getAttemptCount(): number {
    return this.attemptCount;
  }

  getCorrectCount(): number {
    return this.correctCount;
  }

  getResponseTimes(): number[] {
    return this.responseTimes;
  }

  getStudentDisplayName(): string | null {
    return this.studentDisplayName;
  }

  async openSession(studentId: StudentId, levelNumber: number): Promise<void> {
    if (!studentId) return;
    try {
      const { studentRepo } = await import('@/persistence/repositories/student');
      const student = await studentRepo.get(studentId);
      this.studentDisplayName = student?.displayName ?? null;
    } catch (err) {
      log.warn('SESS', 'displayname_lookup_error', { error: String(err) });
      this.studentDisplayName = null;
    }
    this.sessionId = await openSessionForLevel(studentId, levelNumber);
  }

  async recordAttempt(
    studentId: StudentId,
    levelNumber: number,
    currentTemplate: QuestionTemplate,
    questionIndex: number,
    wrongCount: number,
    result: ValidatorResult,
    responseMs: number,
    lastPayload: unknown,
    currentQuestionHintIds: string[],
    currentRoundEvents: ProgressionEvent[]
  ): Promise<void> {
    if (!this.sessionId) return;
    await recordAttemptAndMasteryForLevel(
      studentId,
      this.sessionId,
      levelNumber,
      currentTemplate,
      questionIndex,
      wrongCount,
      result,
      responseMs,
      lastPayload,
      currentQuestionHintIds,
      currentRoundEvents
    );
  }

  async closeSession(
    levelNumber: number,
    attemptCount: number,
    correctCount: number,
    responseTimes: number[]
  ): Promise<void> {
    if (!this.sessionId) return;
    await closeSessionForLevel(this.sessionId, levelNumber, attemptCount, correctCount, responseTimes);
  }

  async persistLevelCompletion(studentId: StudentId, levelNumber: number, correctCount: number): Promise<void> {
    if (!studentId) return;
    await persistLevelCompletionForLevel(studentId, levelNumber, correctCount);
  }

  async showSessionComplete(
    levelNumber: number,
    studentId: StudentId | null,
    attemptCount: number,
    correctCount: number,
    responseTimes: number[],
    canvasWidth: number,
    canvasHeight: number,
    mascot: Mascot,
    callbacks: {
      setInputLocked: (locked: boolean) => void;
      markLevelComplete: (level: number, student: StudentId | null) => void;
      persistCompletion: () => Promise<void>;
      closeSession: () => Promise<void>;
      navigateNextLevel: (next: number) => void;
      navigatePlayAgain: () => void;
      navigateMenu: () => void;
    }
  ): Promise<void> {
    await showSessionCompleteForLevel(
      {
        scene: this.scene,
        levelNumber,
        studentId,
        attemptCount,
        correctCount,
        responseTimes,
        canvasWidth,
        canvasHeight,
        mascot,
      },
      callbacks
    );
  }
}
