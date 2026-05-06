import { describe, it, expect, beforeEach, vi } from "vitest";
import "fake-indexeddb/auto";
import { db } from "@/persistence/db";
import { handleMasteryTransition } from "@/lib/masteryTransitionHook";
import type { StudentId, SkillId } from "@/types/branded";

const sid = "student-hook" as StudentId;
const skillId = "skill.partition_halves" as SkillId;
const NOW = 1_700_000_000_000;

beforeEach(async () => {
  await db.reviewSchedule.clear();
  vi.restoreAllMocks();
});

describe("G-SR-3 — handleMasteryTransition", () => {
  it("no-op for non-transition", async () => {
    await handleMasteryTransition(sid, skillId, "LEARNING", "APPROACHING", NOW);
    expect(await db.reviewSchedule.toArray()).toHaveLength(0);
  });

  it("creates schedule row on MASTERED transition", async () => {
    await handleMasteryTransition(sid, skillId, "APPROACHING", "MASTERED", NOW);
    const row = await db.reviewSchedule.get([sid, skillId]);
    expect(row).toBeDefined();
    expect(row?.intervalDays).toBe(1);
    expect(row?.dueAt).toBe(NOW + 24 * 60 * 60 * 1000);
  });

  it("deletes schedule row on demotion from MASTERED", async () => {
    await handleMasteryTransition(sid, skillId, "APPROACHING", "MASTERED", NOW);
    await handleMasteryTransition(sid, skillId, "MASTERED", "LEARNING", NOW);
    expect(await db.reviewSchedule.get([sid, skillId])).toBeUndefined();
  });

  it("upsert is idempotent for repeat MASTERED calls", async () => {
    await handleMasteryTransition(sid, skillId, "APPROACHING", "MASTERED", NOW);
    await handleMasteryTransition(sid, skillId, "APPROACHING", "MASTERED", NOW + 1000);
    expect(await db.reviewSchedule.toArray()).toHaveLength(1);
  });
});
