/**
 * Level01SceneFeedback — feedback orchestration helpers and logging utilities.
 * Extracted from Level01Scene.ts for testability and reuse.
 * Handles feedback text selection, personality copy, and outcome logging.
 */

import { log } from '../lib/log';
import { get as getCopy } from '../lib/i18n/catalog';
import { level01HintKeys } from '../lib/mascotCopy';

/**
 * Compute quest-voiced feedback for outcome kind.
 * Correct picks the denominator-named line; Level 1 is always halves (2).
 * Incorrect switches on archetype with generic fallback.
 * null for partial/close outcomes.
 */
export function questFeedbackText(
  kind: 'correct' | 'incorrect' | 'close',
  currentArchetype: string | undefined
): string | null {
  if (kind === 'correct') {
    return getCopy('quest.feedback.correct.half');
  }
  if (kind === 'incorrect') {
    switch (currentArchetype) {
      case 'equal_or_not':
      case 'compare':
      case 'order':
      case 'benchmark':
      case 'label':
      case 'make':
      case 'snap_match':
        try {
          return getCopy(`quest.feedback.wrong.${currentArchetype}`);
        } catch {
          return getCopy('quest.feedback.wrong.unequal');
        }
      default:
        return getCopy('quest.feedback.wrong.unequal');
    }
  }
  return null;
}

/**
 * Quest-voiced hint for partition archetype at given tier.
 * Level 1 is always halves (denominator 2), so tier-specific keys (verbal/visual/worked).
 */
export function questHintText(tier: import('@/types').HintTier): string {
  return getCopy(level01HintKeys[tier]);
}

/**
 * Determine feedback kind from validator outcome.
 */
export function determineFeedbackKind(outcome: string): 'correct' | 'incorrect' | 'close' {
  if (outcome === 'correct') return 'correct';
  if (outcome === 'partial') return 'close';
  return 'incorrect';
}

/**
 * Log a scaffold recommendation change based on performance.
 */
export function logScaffoldRecommendation(
  correctCount: number,
  totalAttempts: number,
  currentMasteryEstimate: number
): void {
  const advance = correctCount / Math.max(totalAttempts, 1) >= 0.8;
  log.scene('scaffold_recommendation', {
    correctCount,
    totalAttempts,
    masteryEstimate: +currentMasteryEstimate.toFixed(4),
    recommendation: advance ? 'advance' : 'stay',
  });
}

/**
 * Compute streak banner text from streak count.
 */
export function getStreakBannerText(streak: number): string {
  if (streak === 3) return '3 in a Row! 🔥';
  if (streak === 5) return '5 Streak! 🌟';
  if (streak >= 10) return `${streak} Correct! ⭐⭐⭐`;
  return '';
}

/**
 * Quest personality text for outcome kind and gate result.
 */
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

/**
 * Session-complete personality text.
 */
export function sessionCompleteText(gatePassed: boolean, advancing: boolean): string {
  if (!gatePassed) return "Let's practice a little more!";
  if (advancing) return 'I knew you could do it! ⭐';
  return 'Great practice! Keep going!';
}

/**
 * Compute scaffold recommendation from mastery and performance.
 */
export function computeScaffoldRecommendation(
  currentMasteryEstimate: number,
  correctCount: number,
  responseTimes: number[]
): 'advance' | 'stay' | 'regress' {
  if (currentMasteryEstimate >= 0.85) return 'advance';
  if (
    currentMasteryEstimate > 0 &&
    responseTimes.length >= 5 &&
    correctCount / responseTimes.length < 0.4
  ) {
    return 'regress';
  }
  return 'stay';
}

/**
 * Determine if this is a perfect session (all correct, all in goal time).
 */
export function isPerfectSession(
  correctCount: number,
  totalAttempts: number,
  sessionGoal: number
): boolean {
  return correctCount >= sessionGoal && totalAttempts === sessionGoal;
}

/**
 * Log outcome with full context (used by onSubmit).
 */
export function logOutcome(
  outcome: string,
  score: number,
  feedback: string,
  responseMs: number,
  questionId: string
): void {
  log.valid('result', {
    outcome,
    score,
    feedback,
    responseMs,
    questionId,
  });
}

/**
 * Log wrong-answer context (used by onWrongAnswer).
 */
export function logWrongAnswer(wrongCount: number, hintCount: number): void {
  log.scene('wrong_answer', {
    wrongCount,
    hintsUsed: hintCount,
  });
}

/**
 * Log hint request and tier.
 */
export function logHintRequest(tier: import('@/types').HintTier): void {
  log.scene('hint_request', {
    tier,
  });
}
