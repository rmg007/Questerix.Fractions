/**
 * MisconceptionFlag repository — tracks confirmed misconceptions per student.
 * per persistence-spec.md §4, data-schema.md §3.5
 */

import Dexie from 'dexie';
import { db, withQuotaGuard } from '../db';
import { log } from '../../lib/log';
import type {
  MisconceptionFlag,
  StudentId,
  MisconceptionId,
  MisconceptionFlagId,
} from '../../types';

export const misconceptionFlagRepo = {
  async get(id: MisconceptionFlagId): Promise<MisconceptionFlag | undefined> {
    try {
      return await db.misconceptionFlags.get(id);
    } catch (err) {
      return undefined;
    }
  },

  async upsert(flag: MisconceptionFlag): Promise<void> {
    const result = await withQuotaGuard(() => db.misconceptionFlags.put(flag));
    if (result === null) {
      log.warn('DB', 'quota_exceeded', { table: 'misconceptionFlags' });
    }
  },

  async getForStudent(
    studentId: StudentId,
    misconceptionId: MisconceptionId
  ): Promise<MisconceptionFlag | undefined> {
    try {
      const rows = await db.misconceptionFlags
        .where('[studentId+misconceptionId]')
        .equals([studentId, misconceptionId])
        .toArray();
      return rows[0];
    } catch (err) {
      return undefined;
    }
  },

  async getActiveForStudent(
    studentId: StudentId,
    options?: { limit?: number }
  ): Promise<MisconceptionFlag[]> {
    try {
      const all = await db.misconceptionFlags
        .where('[studentId+misconceptionId]')
        .between([studentId, Dexie.minKey], [studentId, Dexie.maxKey])
        .limit(options?.limit ?? 1000)
        .toArray();
      return all.filter((f) => f.resolvedAt === null);
    } catch (err) {
      return [];
    }
  },

  async getAllForStudent(
    studentId: StudentId,
    options?: { limit?: number }
  ): Promise<MisconceptionFlag[]> {
    try {
      return await db.misconceptionFlags
        .where('[studentId+misconceptionId]')
        .between([studentId, Dexie.minKey], [studentId, Dexie.maxKey])
        .limit(options?.limit ?? 1000)
        .toArray();
    } catch (err) {
      return [];
    }
  },

  async resolve(id: MisconceptionFlagId): Promise<boolean> {
    try {
      const updated = await db.misconceptionFlags.update(id, { resolvedAt: Date.now() });
      return updated > 0;
    } catch (err) {
      return false;
    }
  },
};
