/**
 * Bookmark repository — stores where a student left off.
 * per persistence-spec.md §4 (dynamic stores)
 */

import { db } from '../db';
import type { Bookmark, StudentId } from '../../types';

export const bookmarkRepo = {
  async save(bookmark: Bookmark): Promise<Bookmark> {
    await db.bookmarks.put(bookmark);
    return bookmark;
  },

  async get(id: string): Promise<Bookmark | undefined> {
    try {
      return await db.bookmarks.get(id);
    } catch (err) {
      return undefined;
    }
  },

  async getLatestForStudent(studentId: StudentId): Promise<Bookmark | undefined> {
    try {
      const rows = await db.bookmarks.where('studentId').equals(studentId).toArray();
      if (rows.length === 0) return undefined;
      return rows.reduce((latest: Bookmark, b: Bookmark) =>
        b.savedAt > latest.savedAt ? b : latest
      );
    } catch (err) {
      return undefined;
    }
  },

  async listForStudent(studentId: StudentId): Promise<Bookmark[]> {
    try {
      return await db.bookmarks.where('studentId').equals(studentId).toArray();
    } catch (err) {
      return [];
    }
  },

  async delete(id: string): Promise<void> {
    try {
      await db.bookmarks.delete(id);
    } catch (err) {
      // idempotent
    }
  },
};
