/**
 * Tests for the typed string catalog mechanics (ux-elevation §9 T2).
 *
 * Quest-specific lint coverage lives in `questCatalog.test.ts`.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { registerCatalog, get, toLintInputs, _resetForTests } from '@/lib/i18n/catalog';

describe('catalog — registration', () => {
  beforeEach(() => _resetForTests());
  afterEach(() => _resetForTests());

  it('registers and retrieves entries', () => {
    registerCatalog({
      'test.hello': { text: 'Hi, {name}!', tone: 'persona-quest' },
    });
    expect(get('test.hello', { name: 'Sam' })).toBe('Hi, Sam!');
  });

  it('throws on duplicate registration', () => {
    registerCatalog({ 'dup.key': { text: 'a', tone: 'system' } });
    expect(() => registerCatalog({ 'dup.key': { text: 'b', tone: 'system' } })).toThrow(
      /duplicate key/
    );
  });

  it('throws on unknown key', () => {
    expect(() => get('does.not.exist')).toThrow(/unknown catalog key/);
  });

  it('routes formatting through the ICU layer (plural)', () => {
    registerCatalog({
      'test.parts': {
        text: 'I see {n, plural, one {one part} other {# parts}}.',
        tone: 'persona-quest',
      },
    });
    expect(get('test.parts', { n: 1 })).toBe('I see one part.');
    expect(get('test.parts', { n: 5 })).toBe('I see 5 parts.');
  });

  it('toLintInputs() expands ICU markup so the linter sees plain text', () => {
    registerCatalog({
      'test.greet': { text: 'Hi, {name}!', tone: 'persona-quest' },
      'test.long': {
        // "many parts here" (15 chars) is intentionally the longest branch
        // so the linter exercises the worst-case rendered length.
        text: 'I see {n, plural, one {a part} other {many # parts here}}.',
        tone: 'persona-quest',
      },
    });
    const inputs = toLintInputs();
    const greet = inputs.find((i) => i.id === 'test.greet');
    const long = inputs.find((i) => i.id === 'test.long');
    // {name} → "X" placeholder; plural picks longest branch with # → 5.
    expect(greet?.text).toBe('Hi, X!');
    expect(long?.text).toBe('I see many 5 parts here.');
  });

  it('toLintInputs() preserves the properNoun flag', () => {
    registerCatalog({
      'r.halves': { text: 'Halves Forest', tone: 'persona-quest', properNoun: true },
      'q.hi': { text: 'Hi!', tone: 'persona-quest' },
    });
    const inputs = toLintInputs();
    expect(inputs.find((i) => i.id === 'r.halves')?.properNoun).toBe(true);
    expect(inputs.find((i) => i.id === 'q.hi')?.properNoun).toBeUndefined();
  });
});
