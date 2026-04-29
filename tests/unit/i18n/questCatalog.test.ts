/**
 * Quest catalog gate — every Quest entry must pass copy lint AND persona
 * forbidden-line checks (ux-elevation §4 + §9 T2).
 *
 * This file deliberately does NOT call `_resetForTests()`. The Quest module
 * registers its catalog as a load-time side effect; we want that side effect
 * to fire exactly once for the lifetime of the test file.
 */

import { describe, expect, it } from 'vitest';
import '@/lib/i18n/keys/quest'; // side-effect: registers QUEST_COPY
import { allEntries, toLintInputs } from '@/lib/i18n/catalog';
import { lintCatalog } from '@/lib/copyLinter';
import { validateQuestLine } from '@/lib/persona/quest';

describe('Quest catalog gate', () => {
  it('passes copyLinter on every Quest entry', () => {
    const report = lintCatalog(toLintInputs());
    if (!report.ok) {
      const msg = report.violations
        .map((v) => `  ${v.id}: ${v.reason} — ${v.detail}`)
        .join('\n');
      throw new Error(`Quest catalog failed copy lint:\n${msg}`);
    }
    expect(report.ok).toBe(true);
  });

  it('passes persona check on every persona-quest entry (non-proper-noun)', () => {
    const failures: string[] = [];
    for (const [key, entry] of allEntries()) {
      if (entry.tone !== 'persona-quest') continue;
      if (entry.properNoun) continue;
      const v = validateQuestLine(entry.text);
      if (v.length > 0) {
        failures.push(`${key} ("${entry.text}"): ${v.map((x) => x.reason).join('; ')}`);
      }
    }
    if (failures.length > 0) {
      throw new Error('Persona violations:\n' + failures.join('\n'));
    }
    expect(failures).toEqual([]);
  });

  it('registers at least the 5 region proper nouns mentioned in §6', () => {
    const regionKeys = allEntries()
      .filter(([k, e]) => k.startsWith('region.') && e.properNoun)
      .map(([k]) => k);
    expect(regionKeys.length).toBeGreaterThanOrEqual(5);
  });
});
