/**
 * lastUsedStudent — localStorage accessor for last-used student ID.
 * C5 note 1 — only allowed localStorage key (UI hint, not progress data).
 * All actual progress is in IndexedDB via Dexie.
 * per persistence-spec.md §1 (rejected alternatives note) and constraints C5
 */

import type { StudentId } from '../types';

const KEY = 'questerix.lastUsedStudentId';

export const lastUsedStudent = {
  get(): StudentId | null {
    try {
      const v = localStorage.getItem(KEY);
      return v ? (v as StudentId) : null;
    } catch (err) {
      return null;
    }
  },

  set(id: StudentId): void {
    try {
      localStorage.setItem(KEY, id);
    } catch (err) {
      // ignore — this is a UI hint only; failure is non-critical
    }
  },

  clear(): void {
    try {
      localStorage.removeItem(KEY);
    } catch (err) {
      // ignore
    }
  },
};

