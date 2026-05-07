/**
 * levelMeta — single source of level display information.
 * Concepts sourced from docs/INDEX.md per-level table.
 * per runtime-architecture.md §8 step 3 (MenuScene reads ProgressionStat to mark unlocked levels)
 */

export type LevelTrack = 'partition' | 'compare' | 'number-line' | 'operations';

/** All ten activity archetypes supported by the curriculum pipeline. */
export type ActivityArchetype =
  | 'equal_or_not'
  | 'identify'
  | 'partition'
  | 'label'
  | 'make'
  | 'snap_match'
  | 'compare'
  | 'placement'
  | 'benchmark'
  | 'order';

export interface LevelMeta {
  number: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
  name: string;
  concept: string;
  gradeBand: 'K' | '1' | '2' | '3' | '4' | '5' | '6' | '7';
  track: LevelTrack;
  /**
   * Intended archetype distribution for this level, in pedagogical order
   * (simpler → more complex). Used as the target for pipeline generation
   * and by level-spec-parity validation.
   * C8: denominators follow halves → thirds → fourths progression.
   */
  archetypes: ActivityArchetype[];
}

// per docs/INDEX.md §Per-Level Specs table
// archetypes ordered simpler → complex per activity-archetypes.md
export const LEVEL_META: LevelMeta[] = [
  {
    number: 1,
    name: 'Halves',
    concept: 'Equal parts',
    gradeBand: 'K',
    track: 'partition',
    // L1: first encounter — binary judgment, visual selection, draw, name, construct
    archetypes: ['equal_or_not', 'identify', 'partition', 'label', 'make'],
  },
  {
    number: 2,
    name: 'Halves Depth',
    concept: 'Identify halves across shapes',
    gradeBand: 'K',
    track: 'partition',
    // L2: deepen halves across shape variety; introduce snap_match for equivalence
    archetypes: ['equal_or_not', 'identify', 'partition', 'label', 'snap_match'],
  },
  {
    number: 3,
    name: 'Thirds & Fourths',
    concept: 'Identify thirds and fourths',
    gradeBand: '1',
    track: 'partition',
    // L3: thirds + fourths; add make and snap_match for new denominators (C8)
    archetypes: ['equal_or_not', 'identify', 'partition', 'make', 'snap_match'],
  },
  {
    number: 4,
    name: 'Make Halves',
    concept: 'Make and fold halves',
    gradeBand: '1',
    track: 'partition',
    // L4: construction focus; label introduced for symbolic naming
    archetypes: ['partition', 'make', 'identify', 'label', 'equal_or_not'],
  },
  {
    number: 5,
    name: 'Make Thirds & Fourths',
    concept: 'Make, fold, compositional',
    gradeBand: '1',
    track: 'partition',
    // L5: thirds/fourths construction; snap_match bridges partition → compare track
    archetypes: ['partition', 'make', 'snap_match', 'identify', 'label'],
  },
  {
    number: 6,
    name: 'Compare Same Denom.',
    concept: 'Compare same-denominator fractions',
    gradeBand: '1',
    track: 'compare',
    // L6: compare track begins; placement for number-line grounding
    archetypes: ['compare', 'identify', 'label', 'snap_match', 'placement'],
  },
  {
    number: 7,
    name: 'Compare Same Num.',
    concept: 'Compare same-numerator fractions',
    gradeBand: '2',
    track: 'compare',
    // L7: harder comparison direction; benchmark introduced
    archetypes: ['compare', 'identify', 'benchmark', 'snap_match', 'placement'],
  },
  {
    number: 8,
    name: 'Benchmarks',
    concept: 'Place fractions at 0, 1/2, and 1',
    gradeBand: '2',
    track: 'compare',
    // L8: benchmark and number-line placement are primary; compare reinforced
    archetypes: ['benchmark', 'placement', 'compare', 'identify', 'snap_match'],
  },
  {
    number: 9,
    name: 'Order Fractions',
    concept: 'Order 3+ fractions (capstone)',
    gradeBand: '2',
    track: 'compare',
    // L9: capstone — all four compare-track archetypes + identify for recall
    archetypes: ['order', 'compare', 'benchmark', 'placement', 'identify'],
  },
] as const;
