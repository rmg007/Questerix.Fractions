import { describe, it, expect, beforeEach } from "vitest";
import "fake-indexeddb/auto";
import { db } from "@/persistence/db";
import { reviewScheduleRepo } from "@/persistence/repositories/reviewSchedule";
import type { StudentId, SkillId } from "@/types/branded";
import type { ReviewSchedule } from "@/types/runtime";

const sid = "student-1" as StudentId;
const sk1 = "skill.a" as SkillId;
const sk2 = "skill.b" as SkillId;
const NOW = 1_700_000_000_000;

function makeRow(skillId: SkillId): ReviewSchedule {
  return { studentId: sid, skillId, intervalDays: 1, dueAt: NOW + 86400000, lastReviewedAt: NOW };
}

beforeEach(async () => {
  await db.reviewSchedule.clear();
});

describe("G-SR-2 — reviewSchedule repo", () => {
  it("get returns undefined for missing row", async () => {
    expect(await reviewScheduleRepo.get(sid, sk1)).toBeUndefined();
  });

  it("upsert + get round-trip", async () => {
    await reviewScheduleRepo.upsert(makeRow(sk1));
    expect((await reviewScheduleRepo.get(sid, sk1))?.intervalDays).toBe(1);
  });

  it("upsert overwrites existing row", async () => {
    await reviewScheduleRepo.upsert(makeRow(sk1));
    await reviewScheduleRepo.upsert({ ...makeRow(sk1), intervalDays: 7 });
    expect((await reviewScheduleRepo.get(sid, sk1))?.intervalDays).toBe(7);
  });

  it("delete removes the row", async () => {
    await reviewScheduleRepo.upsert(makeRow(sk1));
    await reviewScheduleRepo.delete(sid, sk1);
    expect(await reviewScheduleRepo.get(sid, sk1)).toBeUndefined();
  });

  it("getAllForStudent returns all rows", async () => {
    await reviewScheduleRepo.upsert(makeRow(sk1));
    await reviewScheduleRepo.upsert(makeRow(sk2));
    expect(await reviewScheduleRepo.getAllForStudent(sid)).toHaveLength(2);
  });

  it("deleteAllForStudent removes all rows", async () => {
    await reviewScheduleRepo.upsert(makeRow(sk1));
    await reviewScheduleRepo.upsert(makeRow(sk2));
    await reviewScheduleRepo.deleteAllForStudent(sid);
    expect(await reviewScheduleRepo.getAllForStudent(sid)).toHaveLength(0);
  });
});
