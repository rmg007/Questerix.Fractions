/**
 * Student repository � re-exports the multi-student repo.
 * Legacy callers that import from './student' continue to work.
 * New callers should import from './studentRepo' directly.
 * per multi-student-and-first-run plan �Phase 1
 */

export { studentRepo, MAX_PROFILES } from './studentRepo';
export type { StudentRepoError, StudentRepoResult } from './studentRepo';
