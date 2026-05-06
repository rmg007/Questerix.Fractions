import type { ReviewSchedule } from '@/types/runtime';
import type { StudentId, SkillId } from '@/types/branded';

export const REVIEW_INTERVALS = [1, 3, 7, 21, 60] as const;
export type ReviewInterval = (typeof REVIEW_INTERVALS)[number];

const DAY_MS = 24 * 60 * 60 * 1000;

function nextInterval(current: number): number {
  const idx = (REVIEW_INTERVALS as readonly number[]).indexOf(current);
  if (idx === -1 || idx >= REVIEW_INTERVALS.length - 1) return 60;
  return (REVIEW_INTERVALS as readonly number[])[idx + 1]!;
}

/** Create the initial ReviewSchedule row when a skill first reaches MASTERED. */
export function buildInitialSchedule(
  studentId: StudentId,
  skillId: SkillId,
  now: number
): ReviewSchedule {
  return {
    studentId,
    skillId,
    intervalDays: REVIEW_INTERVALS[0],
    dueAt: now + REVIEW_INTERVALS[0] * DAY_MS,
    lastReviewedAt: now,
  };
}

/** Return reviews due at or before opts.now, up to opts.max items. */
export function selectDueReviews(
  schedules: ReviewSchedule[],
  opts: { now: number; max: number; eligibleSkillIds?: ReadonlySet<string> }
): ReviewSchedule[] {
  const { now, max, eligibleSkillIds } = opts;
  const due = schedules.filter(
    (s) => s.dueAt <= now && (!eligibleSkillIds || eligibleSkillIds.has(s.skillId))
  );
  due.sort((a, b) => a.dueAt - b.dueAt);
  return due.slice(0, max);
}

/**
 * Compute the updated interval + due date after a review outcome.
 * correct && !assisted => advance; incorrect || assisted => reset to 1d.
 */
export function computeReviewOutcome(
  current: ReviewSchedule,
  correct: boolean,
  assisted: boolean,
  now: number
): Pick<ReviewSchedule, 'intervalDays' | 'dueAt' | 'lastReviewedAt'> {
  const newIntervalDays =
    correct && !assisted ? nextInterval(current.intervalDays) : REVIEW_INTERVALS[0];
  return {
    intervalDays: newIntervalDays,
    dueAt: now + newIntervalDays * DAY_MS,
    lastReviewedAt: now,
  };
}
