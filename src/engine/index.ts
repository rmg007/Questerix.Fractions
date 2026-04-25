/**
 * Barrel export — BKT engine and adaptive router.
 * Import from '@/engine' to access all engine functions.
 */

export {
  DEFAULT_PRIORS,
  MASTERY_THRESHOLD,
  updatePKnown,
  updateMastery,
  predictCorrect,
  deriveState,
  isMastered,
} from './bkt';

export type { SelectionArgs } from './selection';
export { selectNextQuestion } from './selection';

export type { RouterArgs } from './router';
export { decideNextLevel } from './router';

export type { CalibrationState } from './calibration';
export {
  CALIBRATION_ITEMS,
  startCalibration,
  recordCalibrationAttempt,
  isCalibrationComplete,
  shouldUseCalibration,
} from './calibration';
