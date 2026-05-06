import { selectDueReviews } from '@/engine/reviewScheduler';
import { isWarmUpsEnabled } from '@/lib/preferences';
import type { QuestionTemplate } from '@/types';
import type { SkillId } from '@/types/branded';

/** Max warm-up questions per level entry. */
const WARM_UP_MAX = 3;

/**
 * Load warm-up QuestionTemplates for a student at level entry.
 * Returns up to WARM_UP_MAX templates whose corresponding skills have a
 * due ReviewSchedule row. Returns [] if no reviews are due or on any error.
 */
export async function loadWarmUpTemplates(
  studentId: string | null,
  now: number
): Promise<QuestionTemplate[]> {
  if (!studentId || !isWarmUpsEnabled()) return [];
  try {
    const { reviewScheduleRepo } = await import('@/persistence/repositories/reviewSchedule');
    const schedules = await reviewScheduleRepo.getAllForStudent(
      studentId as import('@/types/branded').StudentId
    );
    const due = selectDueReviews(schedules, { now, max: WARM_UP_MAX });
    if (due.length === 0) return [];

    const { db } = await import('@/persistence/db');
    const allTemplates: QuestionTemplate[] = await db.questionTemplates.toArray();

    const result: QuestionTemplate[] = [];
    for (const sched of due) {
      const match = allTemplates.find(
        (t: QuestionTemplate) =>
          Array.isArray(t.skillIds) &&
          t.skillIds.some((sid: SkillId) => (sid as string) === (sched.skillId as string))
      );
      if (match && !result.some((r: QuestionTemplate) => r.id === match.id)) {
        result.push(match);
      }
    }
    return result.slice(0, WARM_UP_MAX);
  } catch {
    return [];
  }
}
