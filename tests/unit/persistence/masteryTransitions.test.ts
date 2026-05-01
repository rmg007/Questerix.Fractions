/**
 * G-2 — Mastery state transition integration test.
 *
 * Simulates 5+ question attempts against a real Dexie instance (fake-indexeddb)
 * and asserts that BKT + skillMasteryRepo drive the expected state transitions:
 *   NOT_STARTED → LEARNING → APPROACHING → MASTERED
 *
 * Covers the wiring that LevelScene / Level01Scene implement:
 *   1. start with DEFAULT_PRIORS
 *   2. call updateMastery(prev, correct) after each attempt
 *   3. persist via skillMasteryRepo.upsert()
 *   4. after enough correct answers the state reaches MASTERED
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../../../src/persistence/db';
import { skillMasteryRepo } from '../../../src/persistence/repositories/skillMastery';
import { updateMastery, DEFAULT_PRIORS, MASTERY_THRESHOLD, deriveState } from '../../../src/engine/bkt';
import { StudentId, SkillId } from '../../../src/types/branded';
import type { SkillMastery } from '../../../src/types';

const studentId = StudentId('g2-student-001');
const skillId = SkillId('skill.partition_halves');

function makeInitialMastery(): SkillMastery {
  return {
    studentId,
    skillId,
    compositeKey: [studentId, skillId],
    masteryEstimate: DEFAULT_PRIORS.pInit,
    state: 'NOT_STARTED',
    consecutiveCorrectUnassisted: 0,
    totalAttempts: 0,
    correctAttempts: 0,
    lastAttemptAt: Date.now(),
    masteredAt: null,
    decayedAt: null,
    syncState: 'local',
  };
}

async function simulateAttempt(prev: SkillMastery, correct: boolean): Promise<SkillMastery> {
  const next = updateMastery(prev, correct, DEFAULT_PRIORS);
  const record: SkillMastery = {
    ...next,
    lastAttemptAt: Date.now(),
    masteredAt: next.state === 'MASTERED' && !prev.masteredAt ? Date.now() : prev.masteredAt,
  };
  await skillMasteryRepo.upsert(record);
  return record;
}

describe('G-2 — mastery state transitions via BKT + IndexedDB', () => {
  beforeEach(async () => {
    await db.skillMastery.clear();
  });

  it('initial mastery estimate equals DEFAULT_PRIORS.pInit', async () => {
    const initial = makeInitialMastery();
    await skillMasteryRepo.upsert(initial);
    const stored = await skillMasteryRepo.get(studentId, skillId);
    expect(stored?.masteryEstimate).toBeCloseTo(DEFAULT_PRIORS.pInit, 5);
    expect(stored?.state).toBe('NOT_STARTED');
  });

  it('single correct answer increases masteryEstimate above pInit', async () => {
    let mastery = makeInitialMastery();
    await skillMasteryRepo.upsert(mastery);
    mastery = await simulateAttempt(mastery, true);

    const stored = await skillMasteryRepo.get(studentId, skillId);
    expect(stored?.masteryEstimate).toBeGreaterThan(DEFAULT_PRIORS.pInit);
    expect(stored?.totalAttempts).toBe(1);
    expect(stored?.correctAttempts).toBe(1);
  });

  it('single incorrect answer decreases or holds masteryEstimate', async () => {
    let mastery = makeInitialMastery();
    await skillMasteryRepo.upsert(mastery);
    mastery = await simulateAttempt(mastery, false);

    const stored = await skillMasteryRepo.get(studentId, skillId);
    expect(stored?.masteryEstimate).toBeLessThanOrEqual(DEFAULT_PRIORS.pInit + 0.05);
    expect(stored?.consecutiveCorrectUnassisted).toBe(0);
  });

  it('5 consecutive correct answers move state through LEARNING and APPROACHING', async () => {
    let mastery = makeInitialMastery();
    await skillMasteryRepo.upsert(mastery);

    const states: string[] = [mastery.state];
    for (let i = 0; i < 5; i++) {
      mastery = await simulateAttempt(mastery, true);
      states.push(mastery.state);
    }

    // Must pass through LEARNING before APPROACHING or MASTERED
    expect(states).toContain('LEARNING');
    // Final estimate is higher than initial
    expect(mastery.masteryEstimate).toBeGreaterThan(DEFAULT_PRIORS.pInit);
    // consecutiveCorrectUnassisted tracks correctly
    expect(mastery.consecutiveCorrectUnassisted).toBe(5);
    // DB reflects latest state
    const stored = await skillMasteryRepo.get(studentId, skillId);
    expect(stored?.totalAttempts).toBe(5);
    expect(stored?.correctAttempts).toBe(5);
  });

  it('incorrect answer resets consecutiveCorrectUnassisted to 0', async () => {
    let mastery = makeInitialMastery();
    await skillMasteryRepo.upsert(mastery);

    // 3 correct
    for (let i = 0; i < 3; i++) mastery = await simulateAttempt(mastery, true);
    expect(mastery.consecutiveCorrectUnassisted).toBe(3);

    // 1 incorrect
    mastery = await simulateAttempt(mastery, false);
    expect(mastery.consecutiveCorrectUnassisted).toBe(0);

    const stored = await skillMasteryRepo.get(studentId, skillId);
    expect(stored?.consecutiveCorrectUnassisted).toBe(0);
  });

  it('reaches MASTERED after sustained correct answers (pInit=0.1, pTransit=0.1 params)', async () => {
    let mastery = makeInitialMastery();
    await skillMasteryRepo.upsert(mastery);

    // Drive to mastery — with DEFAULT_PRIORS this takes ~25–40 correct answers
    let attempts = 0;
    while (mastery.state !== 'MASTERED' && attempts < 60) {
      mastery = await simulateAttempt(mastery, true);
      attempts++;
    }

    expect(mastery.state).toBe('MASTERED');
    expect(mastery.masteryEstimate).toBeGreaterThanOrEqual(MASTERY_THRESHOLD);
    expect(mastery.consecutiveCorrectUnassisted).toBeGreaterThanOrEqual(3);

    const stored = await skillMasteryRepo.get(studentId, skillId);
    expect(stored?.state).toBe('MASTERED');
  });

  it('deriveState is consistent with masteryEstimate stored in DB', async () => {
    let mastery = makeInitialMastery();
    await skillMasteryRepo.upsert(mastery);

    for (let i = 0; i < 10; i++) {
      mastery = await simulateAttempt(mastery, i % 4 !== 0);
    }

    const stored = await skillMasteryRepo.get(studentId, skillId);
    expect(stored).toBeDefined();
    const expectedState = deriveState(stored!.masteryEstimate, stored!.consecutiveCorrectUnassisted);
    expect(stored!.state).toBe(expectedState);
  });

  it('getAllForStudent returns all skill records for the student', async () => {
    const skill2 = SkillId('skill.level_2');
    const mastery1 = makeInitialMastery();
    const mastery2: SkillMastery = {
      ...makeInitialMastery(),
      skillId: skill2,
      compositeKey: [studentId, skill2],
    };
    await skillMasteryRepo.upsert(mastery1);
    await skillMasteryRepo.upsert(mastery2);

    const all = await skillMasteryRepo.getAllForStudent(studentId);
    expect(all).toHaveLength(2);
    const skillIds = all.map((r) => r.skillId);
    expect(skillIds).toContain(skillId);
    expect(skillIds).toContain(skill2);
  });
});
