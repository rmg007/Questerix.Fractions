/**
 * Canonical 10 activity archetypes.
 * Replaces the old Activity.mechanic / QuestionTemplate.type split.
 * per data-schema.md §2.7 (audit §1.5 fix) and activity-archetypes.md
 */

export const ARCHETYPES = [
  'partition',
  'identify',
  'label',
  'make',
  'compare',
  'benchmark',
  'order',
  'snap_match',
  'equal_or_not',
  'placement',
] as const;

export type ArchetypeId = typeof ARCHETYPES[number];

export const isArchetype = (s: string): s is ArchetypeId =>
  (ARCHETYPES as readonly string[]).includes(s);
