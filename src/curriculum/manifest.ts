/**
 * Curriculum manifest — list of available level JSON files baked at build time.
 * Populated by scripts/build-curriculum.mjs into public/curriculum/v1.json.
 * per runtime-architecture.md §4.1
 */

/** Canonical bundle URL served from public/. */
export const CURRICULUM_BUNDLE_URL = '/curriculum/v1.json';

/** Level keys present in the bundle (01–09). */
export const LEVEL_KEYS = ['01', '02', '03', '04', '05', '06', '07', '08', '09'] as const;

export type LevelKey = (typeof LEVEL_KEYS)[number];

/** Map level number (1–9) to pipeline level key ('01'–'09'). */
export function levelNumberToKey(level: number): LevelKey {
  return String(level).padStart(2, '0') as LevelKey;
}

/** Index manifest URL listing per-level file locations + sha256s. */
export const CURRICULUM_INDEX_URL = '/curriculum/index.json';

/** URL for a single level's curriculum file. */
export function levelFileUrl(levelKey: LevelKey): string {
  return `/curriculum/level-${levelKey}.json`;
}
