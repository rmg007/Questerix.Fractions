import { get as getCopy } from './i18n/catalog';
import { log } from './log';
import type { HintTier } from '@/types';

export function determineFeedbackKind(outcome: string): 'correct' | 'incorrect' | 'close' {
  if (outcome === 'correct') return 'correct';
  if (outcome === 'partial') return 'close';
  return 'incorrect';
}

export function questFeedbackText(
  kind: 'correct' | 'incorrect' | 'close',
  currentArchetype: string | undefined,
  levelNumber: number
): string | null {
  if (kind === 'correct') {
    const denomKey = levelNumber === 1 ? 'half' : levelNumber === 2 ? 'third' : 'fourth';
    return getCopy(`quest.feedback.correct.${denomKey}`);
  }
  if (kind === 'incorrect') {
    const archetype = currentArchetype ?? 'unequal';
    try {
      return getCopy(`quest.feedback.wrong.${archetype}`);
    } catch {
      return getCopy('quest.feedback.wrong.unequal');
    }
  }
  return null;
}

export function getStreakBannerText(streak: number): string {
  if (streak === 3) return '3 in a Row! 🔥';
  if (streak === 5) return '5 Streak! 🌟';
  if (streak >= 10) return `${streak} Correct! ⭐⭐⭐`;
  return '';
}

export function questPersonalityText(
  kind: 'correct' | 'incorrect',
  gatePassed: boolean,
  masteryAdvancing: boolean
): string {
  if (kind === 'correct') {
    if (masteryAdvancing) return 'I knew you could do it! ⭐';
    return 'Great! Keep going!';
  }
  if (gatePassed) return "Let's practice a little more!";
  return 'Oops! Try again!';
}

export function sessionCompleteText(gatePassed: boolean, advancing: boolean): string {
  if (!gatePassed) return "Let's practice a little more!";
  if (advancing) return 'I knew you could do it! ⭐';
  return 'Great practice! Keep going!';
}

export function computeScaffoldRecommendation(
  masteryEstimate: number,
  correctCount: number,
  responseTimes: number[]
): 'advance' | 'stay' | 'regress' {
  if (masteryEstimate >= 0.85) return 'advance';
  if (
    masteryEstimate > 0 &&
    responseTimes.length >= 5 &&
    correctCount / responseTimes.length < 0.4
  ) {
    return 'regress';
  }
  return 'stay';
}

export function isPerfectSession(
  correctCount: number,
  totalAttempts: number,
  sessionGoal: number
): boolean {
  return correctCount >= sessionGoal && totalAttempts === sessionGoal;
}

export function logScaffoldRecommendation(
  correctCount: number,
  totalAttempts: number,
  masteryEstimate: number
): void {
  const advance = correctCount / Math.max(totalAttempts, 1) >= 0.8;
  log.scene('scaffold_recommendation', {
    correctCount,
    totalAttempts,
    masteryEstimate: +masteryEstimate.toFixed(4),
    recommendation: advance ? 'advance' : 'stay',
  });
}

export function logOutcome(
  outcome: string,
  score: number,
  feedback: string,
  responseMs: number,
  questionId: string
): void {
  log.valid('result', { outcome, score, feedback, responseMs, questionId });
}

export function logWrongAnswer(wrongCount: number, hintCount: number): void {
  log.scene('wrong_answer', { wrongCount, hintsUsed: hintCount });
}

export function logHintRequest(tier: HintTier): void {
  log.scene('hint_request', { tier });
}
