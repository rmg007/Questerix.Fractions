import { describe, it, expect } from "vitest";
import {
  buildInitialSchedule,
  selectDueReviews,
  computeReviewOutcome,
  REVIEW_INTERVALS,
} from "@/engine/reviewScheduler";
import type { ReviewSchedule } from "@/types/runtime";
import type { StudentId, SkillId } from "@/types/branded";

const NOW = 1_700_000_000_000;
const DAY_MS = 24 * 60 * 60 * 1000;
const studentId = "student-1" as StudentId;
const skillId = "skill.partition_halves" as SkillId;

function makeSchedule(intervalDays: number, daysOverdue = 0): ReviewSchedule {
  return {
    studentId,
    skillId,
    intervalDays,
    dueAt: NOW - daysOverdue * DAY_MS,
    lastReviewedAt: NOW - (intervalDays + daysOverdue) * DAY_MS,
  };
}

describe("G-SR-1 — reviewScheduler", () => {
  describe("buildInitialSchedule", () => {
    it("creates a 1-day schedule due tomorrow", () => {
      const row = buildInitialSchedule(studentId, skillId, NOW);
      expect(row.intervalDays).toBe(1);
      expect(row.dueAt).toBe(NOW + DAY_MS);
      expect(row.lastReviewedAt).toBe(NOW);
    });
  });

  describe("selectDueReviews", () => {
    it("returns nothing when no schedules are due", () => {
      const future = makeSchedule(1, -2);
      expect(selectDueReviews([future], { now: NOW, max: 5 })).toHaveLength(0);
    });

    it("returns due schedules sorted by most overdue first", () => {
      const overdue3 = { ...makeSchedule(7, 3), skillId: "skill.a" as SkillId };
      const overdue1 = { ...makeSchedule(3, 1), skillId: "skill.b" as SkillId };
      const result = selectDueReviews([overdue1, overdue3], { now: NOW, max: 5 });
      expect(result[0]?.skillId).toBe("skill.a");
    });

    it("respects max cap", () => {
      const schedules = [1, 3, 7].map((d, i) => ({
        ...makeSchedule(d, 1),
        skillId: `skill.${i}` as SkillId,
      }));
      expect(selectDueReviews(schedules, { now: NOW, max: 2 })).toHaveLength(2);
    });

    it("filters by eligibleSkillIds", () => {
      const s1 = { ...makeSchedule(1, 1), skillId: "skill.a" as SkillId };
      const s2 = { ...makeSchedule(1, 1), skillId: "skill.b" as SkillId };
      const result = selectDueReviews([s1, s2], {
        now: NOW,
        max: 5,
        eligibleSkillIds: new Set(["skill.a"]),
      });
      expect(result).toHaveLength(1);
      expect(result[0]?.skillId).toBe("skill.a");
    });
  });

  describe("computeReviewOutcome", () => {
    it("advances interval on correct+unassisted", () => {
      const out = computeReviewOutcome(makeSchedule(1), true, false, NOW);
      expect(out.intervalDays).toBe(3);
      expect(out.dueAt).toBe(NOW + 3 * DAY_MS);
    });

    it("resets to 1d on incorrect", () => {
      const out = computeReviewOutcome(makeSchedule(7), false, false, NOW);
      expect(out.intervalDays).toBe(REVIEW_INTERVALS[0]);
    });

    it("resets to 1d on assisted even if correct", () => {
      const out = computeReviewOutcome(makeSchedule(7), true, true, NOW);
      expect(out.intervalDays).toBe(REVIEW_INTERVALS[0]);
    });

    it("caps at 60d", () => {
      const out = computeReviewOutcome(makeSchedule(60), true, false, NOW);
      expect(out.intervalDays).toBe(60);
    });

    it("advances through the full ladder 1->3->7->21->60->60", () => {
      let current = makeSchedule(1);
      for (const exp of [3, 7, 21, 60, 60]) {
        const out = computeReviewOutcome(current, true, false, NOW);
        expect(out.intervalDays).toBe(exp);
        current = { ...current, ...out };
      }
    });
  });
});
