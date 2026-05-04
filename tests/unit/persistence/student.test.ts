import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '@/persistence/db';
import { studentRepo } from '@/persistence/repositories/student';
import { StudentId } from '@/types/branded';

const studentId = StudentId('student-coverage-001');

function makeStudentInput(id = studentId) {
  return {
    id,
    displayName: 'Ada',
    avatarConfig: { color: 'blue' },
    gradeLevel: 1 as const,
    lastActiveAt: 1,
    localOnly: true,
  };
}

describe('studentRepo', () => {
  beforeEach(async () => {
    await db.students.clear();
  });

  it('creates a local student row with timestamps and sync state', async () => {
    const created = await studentRepo.create(makeStudentInput());

    expect(created).toMatchObject({
      id: studentId,
      displayName: 'Ada',
      avatarConfig: { color: 'blue' },
      gradeLevel: 1,
      localOnly: true,
      syncState: 'local',
    });
    expect(created?.createdAt).toEqual(expect.any(Number));
    expect(created?.lastActiveAt).toEqual(expect.any(Number));
  });

  it('gets, lists, updates, and deletes students', async () => {
    const secondStudentId = StudentId('student-coverage-002');
    await studentRepo.create(makeStudentInput(studentId));
    await studentRepo.create({
      ...makeStudentInput(secondStudentId),
      displayName: 'Grace',
      gradeLevel: 2,
    });

    expect(await studentRepo.get(studentId)).toMatchObject({ displayName: 'Ada' });
    expect(await studentRepo.list({ limit: 1 })).toHaveLength(1);
    expect(await studentRepo.update(studentId, { displayName: 'Ada L.' })).toBe(true);
    expect(await studentRepo.get(studentId)).toMatchObject({ displayName: 'Ada L.' });

    await studentRepo.delete(studentId);

    expect(await studentRepo.get(studentId)).toBeUndefined();
    expect(await studentRepo.list()).toHaveLength(1);
  });

  it('reports false or empty values when rows are missing', async () => {
    expect(await studentRepo.get(StudentId('missing'))).toBeUndefined();
    expect(await studentRepo.update(StudentId('missing'), { displayName: 'Nope' })).toBe(false);
    expect(await studentRepo.list()).toEqual([]);

    await expect(studentRepo.delete(StudentId('missing'))).resolves.toBeUndefined();
  });
});
