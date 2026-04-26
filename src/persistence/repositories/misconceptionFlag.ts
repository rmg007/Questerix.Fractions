/**
 * MisconceptionFlag repository — tracks confirmed misconceptions per student.
 * per persistence-spec.md §4, data-schema.md §3.5
 */

import Dexie from 'dexie';
import { db } from '../db';
import type { MisconceptionFlag, StudentId, MisconceptionId } from '../../types';

export const misconceptionFlagRepo = {
  async get(id: string): Promise<MisconceptionFlag | undefined> {
    try {
      return await db.misconceptionFlags.get(id);
    } catch {
      return undefined;
    }
  },

  async upsert(flag: MisconceptionFlag): Promise<void> {
    try {
      await db.misconceptionFlags.put(flag);
    } catch {
      // swallow
    }
  },

  async getForStudent(studentId: StudentId, misconceptionId: MisconceptionId): Promise<MisconceptionFlag | undefined> {
    try {
      const rows = await db.misconceptionFlags
        .where('[studentId+misconceptionId]')
        .equals([studentId, misconceptionId])
        .toArray();
      return rows[0];
    } catch {
      return undefined;
    }
  },

  async getActiveForStudent(studentId: StudentId): Promise<MisconceptionFlag[]> {
    try {
      const all = await db.misconceptionFlags
        .where('[studentId+misconceptionId]')
        .between([studentId, Dexie.minKey], [studentId, Dexie.maxKey])
        .toArray();
      return all.filter((f) => f.resolvedAt === null);
    } catch {
      return [];
    }
  },

  async getAllForStudent(studentId: StudentId): Promise<MisconceptionFlag[]> {
    try {
      return await db.misconceptionFlags
        .where('[studentId+misconceptionId]')
        .between([studentId, Dexie.minKey], [studentId, Dexie.maxKey])
        .toArray();
    } catch {
      return [];
    }
  },

  async resolve(id: string): Promise<boolean> {
    try {
      const updated = await db.misconceptionFlags.update(id, { resolvedAt: Date.now() });
      return updated > 0;
    } catch {
      return false;
    }
  },
};
