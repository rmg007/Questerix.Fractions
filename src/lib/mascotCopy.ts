/**
 * Mascot copy constants for Level 1 hint tiers.
 *
 * Level 1 is always halves (denominator 2). Each hint tier shows progressively
 * more helpful language to match the visual escalation in Level01Scene.
 *
 * These strings are the canonical source of truth. They are imported by
 * src/lib/i18n/keys/quest.ts so the catalog stays in sync without duplication,
 * and the catalog key names are exported here so Level01Scene can look them up
 * without magic strings.
 *
 * ── Copy-lint exemption note ────────────────────────────────────────────────
 * The Tier 2 and Tier 3 strings exceed the FK ≤ 2.0 cap, and the Tier 3
 * string contains "The answer is" which the persona gate normally forbids.
 * These are intentional per the product spec (task #49). The corresponding
 * i18n catalog entries carry `skipCopyLint: true` to document the exemption
 * explicitly; see src/lib/i18n/catalog.ts `CatalogEntry.skipCopyLint`.
 */

import type { HintTier } from '@/types/hint';

/** Display strings for each hint tier in the Level 1 halves context. */
export const level01HintCopy: Record<HintTier, string> = {
  verbal: 'Try moving the line a little.',
  visual_overlay: 'Think about where halfway is.',
  worked_example: 'The answer is right around here — give it a try!',
};

/** Catalog key names for the Level 1 halves hint tiers. */
export const level01HintKeys: Record<HintTier, string> = {
  verbal: 'quest.hint.split2.verbal',
  visual_overlay: 'quest.hint.split2.visual',
  worked_example: 'quest.hint.split2.worked',
};
