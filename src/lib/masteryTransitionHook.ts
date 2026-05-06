import type { MasteryState } from '@/types/runtime';
import type { StudentId, SkillId } from '@/types/branded';
import { log } from './log';

/**
 * Syncs ReviewSchedule store on BKT mastery state transitions.
 * MASTERED transition => create schedule; demotion => delete it.
 * Errors are caught and logged — never thrown to caller.
 */
export async function handleMasteryTransition(
  studentId: StudentId,
  skillId: SkillId,
  prevState: MasteryState,
  newState: MasteryState,
  now: number
): Promise<void> {
  const justMastered = prevState !== 'MASTERED' && newState === 'MASTERED';
  const justDemoted = prevState === 'MASTERED' && newState !== 'MASTERED';
  if (!justMastered && !justDemoted) return;

  try {
    const { reviewScheduleRepo } = await import('../persistence/repositories/reviewSchedule');
    if (justMastered) {
      const { buildInitialSchedule } = await import('../engine/reviewScheduler');
      const row = buildInitialSchedule(studentId, skillId, now);
      await reviewScheduleRepo.upsert(row);
      log.bkt('review_schedule_created', { skill: skillId, intervalDays: row.intervalDays });
    } else {
      await reviewScheduleRepo.delete(studentId, skillId);
      log.bkt('review_schedule_cleared', { skill: skillId });
    }
  } catch (err) {
    log.warn('BKT', 'mastery_transition_hook_error', { error: String(err) });
  }
}
