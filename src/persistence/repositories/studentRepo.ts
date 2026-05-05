/**
 * studentRepo — Multi-student CRUD with a 4-profile cap.
 * per multi-student-and-first-run plan §Phase 1
 * per C5 — no new localStorage keys
 * per persistence-spec.md §4 (dynamic stores)
 */

import { db } from '../db';
import { log } from '../../lib/log';
import type { Student } from '../../types/runtime';
import type { AvatarKey } from '../../types/runtime';
import type { StudentId } from '../../types/branded';

/** Maximum number of student profiles allowed per device. */
export const MAX_PROFILES = 4;

/** Default avatar assigned to new profiles when none is specified. */
const DEFAULT_AVATAR: AvatarKey = 'star';

export type StudentRepoError =
  | { ok: false; reason: 'at_capacity' }
  | { ok: false; reason: 'last_profile' }
  | { ok: false; reason: 'not_found' }
  | { ok: false; reason: 'quota_exceeded' };

export type StudentRepoResult<T> = { ok: true; value: T } | StudentRepoError;

export const studentRepo = {
  /**
   * Returns all student profiles sorted by creation date ascending.
   * Always caps at MAX_PROFILES rows.
   */
  async list(): Promise<Student[]> {
    try {
      return await db.students.orderBy('createdAt').limit(MAX_PROFILES).toArray();
    } catch {
      return [];
    }
  },

  /** Fetch a single student by ID. Returns undefined if not found. */
  async get(id: StudentId): Promise<Student | undefined> {
    try {
      return await db.students.get(id);
    } catch {
      return undefined;
    }
  },

  /**
   * Create a new student profile.
   * Returns `at_capacity` if 4 profiles already exist.
   */
  async create(opts: {
    displayName?: string;
    avatar?: AvatarKey;
  }): Promise<StudentRepoResult<Student>> {
    try {
      const existing = await db.students.count();
      if (existing >= MAX_PROFILES) {
        return { ok: false, reason: 'at_capacity' };
      }
      const id = crypto.randomUUID() as StudentId;
      const now = Date.now();
      const record: Student = {
        id,
        displayName: opts.displayName?.trim() || 'Player',
        avatar: opts.avatar ?? DEFAULT_AVATAR,
        avatarConfig: {},
        gradeLevel: 1,
        createdAt: now,
        lastActiveAt: now,
        localOnly: true,
        syncState: 'local',
      };
      await db.students.add(record);
      return { ok: true, value: record };
    } catch (err) {
      if (err instanceof DOMException && err.name === 'QuotaExceededError') {
        log.warn('DB', 'quota_exceeded', { table: 'students' });
        return { ok: false, reason: 'quota_exceeded' };
      }
      throw err;
    }
  },

  /**
   * Create a student with full explicit fields (used by BootScene auto-create).
   * No cap enforcement — caller is responsible.
   */
  async createRaw(input: Omit<Student, 'createdAt' | 'syncState'>): Promise<Student | undefined> {
    const record: Student = {
      ...input,
      createdAt: Date.now(),
      lastActiveAt: Date.now(),
      syncState: 'local',
    };
    try {
      await db.students.add(record);
      return record;
    } catch (err) {
      if (err instanceof DOMException && err.name === 'QuotaExceededError') {
        log.warn('DB', 'quota_exceeded', { table: 'students' });
        return undefined;
      }
      throw err;
    }
  },

  /**
   * Rename a student profile.
   * Returns `not_found` if the student doesn't exist.
   */
  async rename(id: StudentId, displayName: string): Promise<StudentRepoResult<void>> {
    try {
      const updated = await db.students.update(id, {
        displayName: displayName.trim() || 'Player',
        lastActiveAt: Date.now(),
      });
      if (updated === 0) return { ok: false, reason: 'not_found' };
      return { ok: true, value: undefined };
    } catch {
      return { ok: false, reason: 'not_found' };
    }
  },

  /**
   * Remove a student profile.
   * Returns `last_profile` if this is the only profile (prevents removing all profiles).
   * Callers must handle updating lastUsedStudentId in localStorage.
   */
  async remove(id: StudentId): Promise<StudentRepoResult<void>> {
    try {
      const count = await db.students.count();
      if (count <= 1) return { ok: false, reason: 'last_profile' };
      await db.students.delete(id);
      return { ok: true, value: undefined };
    } catch {
      return { ok: false, reason: 'not_found' };
    }
  },

  /**
   * Update the avatar for a student profile.
   * Returns `not_found` if the student doesn't exist.
   */
  async setAvatar(id: StudentId, avatar: AvatarKey): Promise<StudentRepoResult<void>> {
    try {
      const updated = await db.students.update(id, { avatar, lastActiveAt: Date.now() });
      if (updated === 0) return { ok: false, reason: 'not_found' };
      return { ok: true, value: undefined };
    } catch {
      return { ok: false, reason: 'not_found' };
    }
  },

  /** Update any fields on a student row. Used internally by scenes. */
  async update(id: StudentId, patch: Partial<Omit<Student, 'id'>>): Promise<boolean> {
    try {
      const updated = await db.students.update(id, { ...patch, lastActiveAt: Date.now() });
      return updated > 0;
    } catch {
      return false;
    }
  },

  /** Delete a student row without cap enforcement. Used by reset flows. */
  async delete(id: StudentId): Promise<void> {
    try {
      await db.students.delete(id);
    } catch {
      // swallow — idempotent delete
    }
  },
};
