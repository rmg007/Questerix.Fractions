/**
 * MenuScene font-consistency guard.
 *
 * Verifies that MenuScene does NOT declare its own local BODY_FONT constant
 * and instead relies on the value exported from levelTheme. This prevents
 * a future developer from accidentally re-introducing a local override that
 * would make the menu fall out of sync with the rest of the design system.
 *
 * Uses static source analysis so the test never needs a Phaser context.
 */

import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

vi.mock('phaser', () => {
  class Scene {}
  return {
    Scene,
    GameObjects: { Container: class {}, Text: class {}, Rectangle: class {}, Graphics: class {} },
    default: { Scene },
  };
});

import { BODY_FONT } from '@/scenes/utils/levelTheme';

const MENU_SCENE_PATH = resolve(__dirname, '../../../src/scenes/MenuScene.ts');
const menuSource = readFileSync(MENU_SCENE_PATH, 'utf8');

describe('MenuScene BODY_FONT consistency', () => {
  it('imports BODY_FONT from levelTheme', () => {
    expect(menuSource).toMatch(/import\s*\{[^}]*\bBODY_FONT\b[^}]*\}\s*from\s*['"]\.\/utils\/levelTheme['"]/);
  });

  it('does not declare a local BODY_FONT constant', () => {
    const localDeclarationPattern = /^\s*(?:const|let|var)\s+BODY_FONT\s*=/m;
    expect(menuSource).not.toMatch(localDeclarationPattern);
  });

  it('levelTheme BODY_FONT value is a non-empty string', () => {
    expect(typeof BODY_FONT).toBe('string');
    expect(BODY_FONT.length).toBeGreaterThan(0);
  });
});
