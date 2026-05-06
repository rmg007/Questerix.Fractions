/**
 * SkillMastery repository — upsert via composite key [studentId+skillId].
 * Used by the BKT engine to read/write mastery estimates.
 * per persistence-spec.md §4
 */

import Dexie from 'dexie';
import { db } from '../db';
import { log } from '../../lib/log';
import type { SkillMastery, StudentId, SkillId, LevelId } from '../../types';

// ── Level mastery summary (read-model) ────────────────────────────────────────

/**
 * Three-state chip label for K–2 display.
 * Collapses BKT's five-state MasteryState into the three states shown in the UI:
 *   NOT_STARTED / DECAYED → UNSEEN
 *   LEARNING / APPROACHING → LEARNING
 *   MASTERED              → MASTERED
 */
export type ChipState = 'UNSEEN' | 'LEARNING' | 'MASTERED';

export function toChipState(state: SkillMastery['state']): ChipState {
  if (state === 'MASTERED') return 'MASTERED';
  if (state === 'NOT_STARTED' || state === 'DECAYED') return 'UNSEEN';
  return 'LEARNING';
}

export interface MisconceptionRecord {
  code: string;
  firstSeenAt: number;
  corrected: boolean;
}

export interface SkillSummaryEntry {
  skillId: SkillId;
  /** Human-readable label from skill registry; falls back to skillId string */
  label: string;
  state: ChipState;
  /** Number of attempts where a hint was used (approximated from hintsUsed on attempts) */
  assistedCount: number;
  misconceptions: MisconceptionRecord[];
  /**
   * True when a spaced-repetition warm-up review for this skill occurred in
   * the current session (lastReviewedAt within the last 2 hours).
   */
  keptFresh?: boolean;
}

export interface LevelMasterySummary {
  skills: SkillSummaryEntry[];
  questionsAnswered: number;
  questionsCorrect: number;
}

/**
 * Build a per-level mastery summary for display in ProgressBar chips and
 * SessionCompleteOverlay. Reads from skillMastery, attempts, and
 * misconceptionFlags tables. Never touches BKT fields directly.
 */
export async function selectLevelMasterySummary(
  studentId: StudentId,
  levelId: LevelId
): Promise<LevelMasterySummary> {
  try {
    const levelNumber = levelId as unknown as number;

    // 1. Load all attempts for this student × level to discover which skills
    //    were exercised and compute questions answered/correct totals.
    const allAttempts = await db.attempts
      .where('[studentId+submittedAt]')
      .between([studentId, Dexie.minKey], [studentId, Dexie.maxKey])
      .toArray();

    const levelAttempts = allAttempts.filter((a) => {
      // Level is encoded in the sessionId prefix or can be inferred from
      // skillIds on the attempt. We match on the level number embedded in
      // the questionTemplateId prefix (q:*:LN:*) or directly from skillIds.
      // Primary filter: activityId on the session is `level_N`.
      // Fallback: infer from questionTemplateId format 'q:*:LN:NNNN'.
      const qid = a.questionTemplateId as string;
      const levelPrefix = `:L${levelNumber}:`;
      return qid.includes(levelPrefix);
    });

    const questionsAnswered = levelAttempts.length;
    const questionsCorrect = levelAttempts.filter(
      (a) => a.outcome === 'EXACT' || a.outcome === 'CLOSE'
    ).length;

    // 2. Collect all distinct skill IDs exercised in this level.
    const skillIdSet = new Set<SkillId>();
    for (const attempt of levelAttempts) {
      if (attempt.skillIds && Array.isArray(attempt.skillIds)) {
        for (const sid of attempt.skillIds) skillIdSet.add(sid as SkillId);
      }
    }

    // If no skill IDs on attempts, fall back to the synthetic skill key used
    // by levelSceneSession.ts: `skill.level_N`.
    if (skillIdSet.size === 0 && questionsAnswered > 0) {
      const { SkillId: mkSkillId } = await import('../../types/branded');
      skillIdSet.add(mkSkillId(`skill.level_${levelNumber}`));
    }

    // 3. Load mastery rows and skill labels in parallel.
    const skillIds = Array.from(skillIdSet);

    const [masteryRows, skillRows, flagRows] = await Promise.all([
      Promise.all(skillIds.map((sid) => db.skillMastery.get([studentId, sid]))),
      db.skills
        .where('id')
        .anyOf(skillIds as string[])
        .toArray(),
      db.misconceptionFlags
        .where('[studentId+misconceptionId]')
        .between([studentId, Dexie.minKey], [studentId, Dexie.maxKey])
        .toArray(),
    ]);

    const labelBySkillId = new Map<string, string>(skillRows.map((s) => [s.id as string, s.name]));

    // Group misconception flags by whether they are associated with this level.
    // MisconceptionFlag does not carry a levelId so we include all flags and
    // filter to those that were first observed during attempts in this level.
    const levelAttemptIds = new Set(levelAttempts.map((a) => a.id as string));
    const flagsForLevel = flagRows.filter((f) =>
      f.evidenceAttemptIds.some((aid) => levelAttemptIds.has(aid as string))
    );

    // 4. Compute assistedCount per skill from level attempts.
    const assistedBySkill = new Map<string, number>();
    for (const attempt of levelAttempts) {
      if (attempt.hintsUsed && attempt.hintsUsed.length > 0 && attempt.skillIds) {
        for (const sid of attempt.skillIds as string[]) {
          assistedBySkill.set(sid, (assistedBySkill.get(sid) ?? 0) + 1);
        }
      }
    }

    // 5. Build per-skill summary entries.
    const skills: SkillSummaryEntry[] = skillIds.map((skillId, i) => {
      const mastery = masteryRows[i];
      const chipState: ChipState = mastery ? toChipState(mastery.state) : 'UNSEEN';
      const label =
        labelBySkillId.get(skillId as string) ??
        // Strip the synthetic prefix for display
        (skillId as string).replace('skill.level_', 'Level ');

      const misconceptions: MisconceptionRecord[] = flagsForLevel
        .filter((f) => (mastery ? f.studentId === mastery.studentId : f.studentId === studentId))
        .map((f) => ({
          code: f.misconceptionId as string,
          firstSeenAt: f.firstObservedAt,
          corrected: f.resolvedAt !== null,
        }));

      return {
        skillId,
        label,
        state: chipState,
        assistedCount: assistedBySkill.get(skillId as string) ?? 0,
        misconceptions,
      };
    });

    // 6. Mark skills kept fresh via warm-up: ReviewSchedule.lastReviewedAt
    //    within the last 2 hours indicates a review occurred this session.
    const TWO_HOURS_MS = 2 * 60 * 60 * 1000;
    const sessionStart = Date.now() - TWO_HOURS_MS;
    try {
      const { reviewScheduleRepo } = await import('./reviewSchedule');
      for (const entry of skills) {
        if (entry.state === 'MASTERED') {
          const sched = await reviewScheduleRepo.get(studentId, entry.skillId);
          if (sched && sched.lastReviewedAt >= sessionStart) {
            entry.keptFresh = true;
          }
        }
      }
    } catch {
      // Non-blocking: kept-fresh indicators are best-effort
    }

    return { skills, questionsAnswered, questionsCorrect };
  } catch (err) {
    log.warn('DB', 'level_mastery_summary_error', { error: String(err) });
    return { skills: [], questionsAnswered: 0, questionsCorrect: 0 };
  }
}

export type SkillMasteryResult = { ok: true } | { ok: false; error: Error };

export const skillMasteryRepo = {
  async get(studentId: StudentId, skillId: SkillId): Promise<SkillMastery | undefined> {
    try {
      return await db.skillMastery.get([studentId, skillId]);
    } catch (err) {
      return undefined;
    }
  },

  /**
   * Insert or fully replace the mastery row for this (studentId, skillId) pair.
   * Caller must supply the full SkillMastery shape; BKT engine owns the merge.
   * Returns explicit result to prevent silent failures in transactions.
   */
  async upsert(mastery: SkillMastery): Promise<SkillMasteryResult> {
    try {
      await db.skillMastery.put(mastery);
      return { ok: true };
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err ?? 'Unknown error'));
      if (err instanceof DOMException && err.name === 'QuotaExceededError') {
        log.warn('DB', 'quota_exceeded', { table: 'skillMastery' });
      }
      return { ok: false, error };
    }
  },

  async getAllForStudent(studentId: StudentId): Promise<SkillMastery[]> {
    try {
      return await db.skillMastery.where('studentId').equals(studentId).toArray();
    } catch (err) {
      return [];
    }
  },

  async delete(studentId: StudentId, skillId: SkillId): Promise<void> {
    try {
      await db.skillMastery.delete([studentId, skillId]);
    } catch (err) {
      // idempotent
    }
  },
};
