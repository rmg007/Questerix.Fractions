/**
 * levelMeta — single source of level display information.
 * Concepts sourced from docs/INDEX.md per-level table.
 * per runtime-architecture.md §8 step 3 (MenuScene reads ProgressionStat to mark unlocked levels)
 */

export type LevelTrack = 'partition' | 'compare' | 'number-line' | 'operations';

export interface LevelMeta {
  number: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
  name: string;
  concept: string;
  gradeBand: 'K' | '1' | '2' | '3' | '4' | '5' | '6' | '7';
  track: LevelTrack;
}

// per docs/INDEX.md §Per-Level Specs table
export const LEVEL_META: LevelMeta[] = [
  { number: 1, name: 'Halves', concept: 'Equal parts', gradeBand: 'K', track: 'partition' },
  {
    number: 2,
    name: 'Halves Depth',
    concept: 'Identify halves across shapes',
    gradeBand: 'K',
    track: 'partition',
  },
  {
    number: 3,
    name: 'Thirds & Fourths',
    concept: 'Identify thirds and fourths',
    gradeBand: '1',
    track: 'partition',
  },
  {
    number: 4,
    name: 'Make Halves',
    concept: 'Make and fold halves',
    gradeBand: '1',
    track: 'partition',
  },
  {
    number: 5,
    name: 'Make Thirds & Fourths',
    concept: 'Make, fold, compositional',
    gradeBand: '1',
    track: 'partition',
  },
  {
    number: 6,
    name: 'Compare Same Denom.',
    concept: 'Compare same-denominator fractions',
    gradeBand: '1',
    track: 'compare',
  },
  {
    number: 7,
    name: 'Compare Same Num.',
    concept: 'Compare same-numerator fractions',
    gradeBand: '2',
    track: 'compare',
  },
  {
    number: 8,
    name: 'Benchmarks',
    concept: 'Place fractions at 0, 1/2, and 1',
    gradeBand: '2',
    track: 'compare',
  },
  {
    number: 9,
    name: 'Order Fractions',
    concept: 'Order 3+ fractions (capstone)',
    gradeBand: '2',
    track: 'compare',
  },
] as const;
