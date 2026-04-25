/**
 * Student repository — thin Dexie wrapper.
 * per persistence-spec.md §4 (dynamic stores)
 */

import { db } from '../db';
import type { Student, StudentId } from '../../types';

export const studentRepo = {
  async create(
    input: Omit<Student, 'id' | 'createdAt' | 'syncState'> & { id: StudentId },
  ): Promise<Student> {
    const record: Student = {
      ...input,
      createdAt: Date.now(),
      lastActiveAt: Date.now(),
      syncState: 'local',
    };
    await db.students.add(record);
    return record;
  },

  async get(id: StudentId): Promise<Student | undefined> {
    try {
      return await db.students.get(id);
    } catch {
      return undefined;
    }
  },

  async list(): Promise<Student[]> {
    try {
      return await db.students.orderBy('createdAt').toArray();
    } catch {
      return [];
    }
  },

  async update(id: StudentId, patch: Partial<Omit<Student, 'id'>>): Promise<boolean> {
    try {
      const updated = await db.students.update(id, { ...patch, lastActiveAt: Date.now() });
      return updated > 0;
    } catch {
      return false;
    }
  },

  async delete(id: StudentId): Promise<void> {
    try {
      await db.students.delete(id);
    } catch {
      // swallow — idempotent delete
    }
  },
};
