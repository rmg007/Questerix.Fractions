/**
 * Persistence layer barrel export.
 * per persistence-spec.md §4
 */

// Database instance and helpers
export { db, ensurePersistenceGranted } from './db';
export type { QuesterixDB } from './db';

// Repositories
export { studentRepo } from './repositories/student';
export { sessionRepo } from './repositories/session';
export { attemptRepo } from './repositories/attempt';
export { skillMasteryRepo } from './repositories/skillMastery';
export { deviceMetaRepo } from './repositories/deviceMeta';
export { bookmarkRepo } from './repositories/bookmark';

// Backup / restore
export { backupToFile, restoreFromFile } from './backup';

// C5 note 1 — only allowed localStorage key
export { lastUsedStudent } from './lastUsedStudent';
