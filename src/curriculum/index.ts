/**
 * Curriculum barrel — public API for the curriculum subsystem.
 * per runtime-architecture.md §4.1
 */

export { loadCurriculumBundle } from './loader';
export type { CurriculumBundle } from './loader';
export { seedIfEmpty } from './seed';
export type { SeedResult } from './seed';
export { CURRICULUM_BUNDLE_URL, LEVEL_KEYS, levelNumberToKey } from './manifest';
export type { LevelKey } from './manifest';
