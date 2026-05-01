/**
 * levelGroup — single source of truth for the
 * `'q:<arch>:L{N}:NNNN'` template-ID → Activity.levelGroup mapping.
 *
 * Per persistence-spec.md §4 (index: levelGroup) and harden-and-polish R14
 * (DRY pass on duplicated helpers). Previously cloned in `seed.ts` and
 * `questionTemplate.ts`; PLANS/code-quality-2026-05-01.md Phase 8.5 calls
 * for a single shared implementation.
 */

/** Discrete level-group buckets used by the static curriculum store. */
export type LevelGroup = '01-02' | '03-05' | '06-09';

/**
 * Derive the `levelGroup` bucket from a canonical template ID
 * (`q:<arch>:L{N}:NNNN`).
 *
 * If the level number cannot be parsed, the function logs a warning and
 * defaults to `'01-02'` — preserving the prior `seed.ts` behavior, which
 * is strictly more informative than the previous `questionTemplate.ts`
 * silent-fallback variant.
 */
export function deriveLevelGroup(id: string): LevelGroup {
  const match = /L(\d+):/i.exec(id);
  const matched = match?.[1];
  if (!matched) {
    console.warn(
      `[deriveLevelGroup] Failed to extract level from template ID "${id}", defaulting to 01-02`
    );
    return '01-02';
  }
  const level = parseInt(matched, 10);
  if (level <= 2) return '01-02';
  if (level <= 5) return '03-05';
  return '06-09';
}
