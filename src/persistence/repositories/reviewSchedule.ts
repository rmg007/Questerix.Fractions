import { db } from "../db";
import type { ReviewSchedule } from "@/types/runtime";
import type { StudentId, SkillId } from "@/types/branded";

export const reviewScheduleRepo = {
  async get(studentId: StudentId, skillId: SkillId): Promise<ReviewSchedule | undefined> {
    return db.reviewSchedule.get([studentId, skillId]);
  },

  async upsert(row: ReviewSchedule): Promise<void> {
    await db.reviewSchedule.put(row);
  },

  async delete(studentId: StudentId, skillId: SkillId): Promise<void> {
    await db.reviewSchedule.delete([studentId, skillId]);
  },

  async getAllForStudent(studentId: StudentId): Promise<ReviewSchedule[]> {
    return db.reviewSchedule.where("studentId").equals(studentId).toArray();
  },

  async deleteAllForStudent(studentId: StudentId): Promise<void> {
    const keys = await db.reviewSchedule
      .where("studentId")
      .equals(studentId)
      .primaryKeys();
    await db.reviewSchedule.bulkDelete(keys);
  },
};
