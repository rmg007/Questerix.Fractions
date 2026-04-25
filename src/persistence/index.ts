/**
 * Persistence layer barrel export.
 * per persistence-spec.md §4
 */

// Database instance and helpers
export { db, ensurePersistenceGranted } from './db';
export type { QuesterixDB } from './db';

// Repositories — static (curriculum)
export { curriculumPackRepo } from './repositories/curriculumPack';
export { skillRepo } from './repositories/skill';
export { activityRepo } from './repositories/activity';
export { activityLevelRepo } from './repositories/activityLevel';
export { fractionBankRepo } from './repositories/fractionBank';
export { questionTemplateRepo } from './repositories/questionTemplate';
export { misconceptionRepo } from './repositories/misconception';
export { hintRepo } from './repositories/hint';

// Repositories — dynamic (student progress)
export { studentRepo } from './repositories/student';
export { sessionRepo } from './repositories/session';
export { attemptRepo } from './repositories/attempt';
export { skillMasteryRepo } from './repositories/skillMastery';
export { deviceMetaRepo } from './repositories/deviceMeta';
export { bookmarkRepo } from './repositories/bookmark';
export { hintEventRepo } from './repositories/hintEvent';
export { misconceptionFlagRepo } from './repositories/misconceptionFlag';
export { progressionStatRepo } from './repositories/progressionStat';

// Backup / restore
export { backupToFile, restoreFromFile } from './backup';

// C5 note 1 — only allowed localStorage key
export { lastUsedStudent } from './lastUsedStudent';
