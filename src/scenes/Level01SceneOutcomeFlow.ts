/**
 * Level01SceneOutcomeFlow — feedback announcements and microcopy.
 */

import { tts } from '@/audio/TTSService';
import { AccessibilityAnnouncer } from '@/components/AccessibilityAnnouncer';

export type OutcomeKind = 'correct' | 'close' | 'incorrect';

export function classifyOutcome(outcome: 'correct' | 'partial' | 'incorrect'): OutcomeKind {
  if (outcome === 'correct') return 'correct';
  if (outcome === 'partial') return 'close';
  return 'incorrect';
}

export function announceOutcome(kind: OutcomeKind, questText: string | null): void {
  const announcement =
    questText ??
    (kind === 'correct'
      ? 'Correct! Great work.'
      : kind === 'close'
        ? 'Almost! Try a tiny adjustment.'
        : 'Not quite — try again.');
  tts.speak(announcement);
  AccessibilityAnnouncer.announce(announcement);
}

export function streakMicrocopy(streak: number): string | null {
  if (streak === 1) return 'Nice one!';
  if (streak === 2) return "You've got this!";
  if (streak >= 3) return 'On fire! 🔥';
  return null;
}

export function wrongAnswerMicrocopy(wrongCount: number): string | null {
  if (wrongCount === 1) return 'Oops! Try again 💪';
  if (wrongCount === 2) return "Almost... I'll give you a hint!";
  return null;
}
