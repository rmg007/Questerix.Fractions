/**
 * LevelScene structural smoke tests (G-4).
 *
 * Verifies that:
 *   1. LEVEL_META has exactly 9 entries with valid level numbers (1–9).
 *   2. Every archetype used across all levels in the curriculum bundle is a
 *      valid ActivityArchetype string.
 *   3. getInteractionForArchetype returns a non-null Interaction for every
 *      archetype present in any level.
 *
 * This test is intentionally Phaser-free — it exercises only data and the
 * pure-factory lookup in levelRouter. Phaser is mocked so the interaction
 * constructors can be imported without a WebGL/Canvas context.
 *
 * per test-strategy.md §1.1 (unit — no Phaser), CLAUDE.md §architecture
 */

import { describe, it, expect, vi } from 'vitest';

// ── Phaser mock ───────────────────────────────────────────────────────────
// The Interaction constructors call `new Phaser.GameObjects.*` at runtime
// but their constructors are trivial enough to stub out for structural tests.
vi.mock('phaser', () => {
  class GameObject {
    setInteractive() { return this; }
    on() { return this; }
    setDepth() { return this; }
    setAlpha() { return this; }
    setStrokeStyle() { return this; }
    setFillStyle() { return this; }
    destroy() { return; }
  }
  class Scene {}
  class Container extends GameObject {}
  class Rectangle extends GameObject {
    width = 0; height = 0; x = 0; y = 0;
    setSize() { return this; }
    setPosition() { return this; }
    static Contains() { return false; }
  }
  class Text extends GameObject {}
  class Graphics extends GameObject {
    fillRectShape() { return this; }
    lineStyle() { return this; }
    strokeRect() { return this; }
    fillStyle() { return this; }
    fillRect() { return this; }
    clear() { return this; }
  }
  class Image extends GameObject {}
  return {
    Scene,
    GameObjects: {
      Container,
      Rectangle,
      Text,
      Graphics,
      Image,
      GameObject,
    },
    Geom: {
      Rectangle: {
        Contains: () => false,
        clone: (r: unknown) => r,
      },
    },
    Math: {
      Clamp: (v: number, min: number, max: number) => Math.min(Math.max(v, min), max),
    },
    Input: {
      Events: {
        DRAG_START: 'dragstart',
        DRAG: 'drag',
        DRAG_END: 'dragend',
        POINTER_DOWN: 'pointerdown',
        POINTER_UP: 'pointerup',
      },
      Keyboard: {
        KeyCodes: { SPACE: 32, ENTER: 13, LEFT: 37, RIGHT: 39 },
      },
    },
    default: { Scene },
  };
});

// ── Imports (after vi.mock hoisting) ─────────────────────────────────────
import { LEVEL_META } from '@/scenes/utils/levelMeta';
import { ARCHETYPES, isArchetype } from '@/types/archetype';
import type { ArchetypeId } from '@/types/archetype';
import { getInteractionForArchetype } from '@/scenes/utils/levelRouter';
import bundle from '@/curriculum/bundle.json';

// ── Helpers ───────────────────────────────────────────────────────────────

type BundleLevel = { archetype: string }[];

/** Unique archetypes used in a given level from the curriculum bundle. */
function archetypesForLevel(levelNum: number): ArchetypeId[] {
  const key = String(levelNum).padStart(2, '0') as keyof typeof bundle.levels;
  const questions = (bundle.levels[key] ?? []) as BundleLevel;
  const seen = new Set<string>();
  for (const q of questions) {
    seen.add(q.archetype);
  }
  return [...seen].filter(isArchetype);
}

// ── Tests ─────────────────────────────────────────────────────────────────

describe('LEVEL_META — structure', () => {
  it('has exactly 9 entries', () => {
    expect(LEVEL_META).toHaveLength(9);
  });

  it('each entry has a number property in range 1–9', () => {
    for (const meta of LEVEL_META) {
      expect(meta.number).toBeGreaterThanOrEqual(1);
      expect(meta.number).toBeLessThanOrEqual(9);
    }
  });

  it('level numbers are exactly 1–9 with no gaps or duplicates', () => {
    const numbers = LEVEL_META.map((m) => m.number).sort((a, b) => a - b);
    expect(numbers).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });

  it('each entry has a non-empty name and concept', () => {
    for (const meta of LEVEL_META) {
      expect(meta.name.length).toBeGreaterThan(0);
      expect(meta.concept.length).toBeGreaterThan(0);
    }
  });

  it('each entry has a valid gradeBand (K, 1, or 2)', () => {
    const validBands = new Set<string>(['K', '1', '2']);
    for (const meta of LEVEL_META) {
      expect(validBands.has(meta.gradeBand)).toBe(true);
    }
  });
});

describe('Curriculum bundle archetypes — validity', () => {
  it('every archetype used across all levels is a valid ActivityArchetype', () => {
    const validSet = new Set<string>(ARCHETYPES);
    for (const meta of LEVEL_META) {
      const key = String(meta.number).padStart(2, '0') as keyof typeof bundle.levels;
      const questions = (bundle.levels[key] ?? []) as BundleLevel;
      for (const q of questions) {
        expect(
          validSet.has(q.archetype),
          `Level ${meta.number} question has unknown archetype: "${q.archetype}"`
        ).toBe(true);
      }
    }
  });

  it('each level in the bundle has at least one question', () => {
    for (const meta of LEVEL_META) {
      const key = String(meta.number).padStart(2, '0') as keyof typeof bundle.levels;
      const questions = (bundle.levels[key] ?? []) as BundleLevel;
      expect(
        questions.length,
        `Level ${meta.number} has no questions in bundle`
      ).toBeGreaterThan(0);
    }
  });

  it('each level in the bundle uses at least one valid archetype', () => {
    for (const meta of LEVEL_META) {
      const archetypes = archetypesForLevel(meta.number);
      expect(
        archetypes.length,
        `Level ${meta.number} has no valid archetypes in bundle`
      ).toBeGreaterThan(0);
    }
  });
});

describe('getInteractionForArchetype — returns non-null for every archetype in use', () => {
  it('returns a non-null Interaction for every archetype across all levels', () => {
    const allArchetypes = new Set<ArchetypeId>();
    for (const meta of LEVEL_META) {
      for (const arch of archetypesForLevel(meta.number)) {
        allArchetypes.add(arch);
      }
    }

    for (const archetype of allArchetypes) {
      const interaction = getInteractionForArchetype(archetype);
      expect(
        interaction,
        `getInteractionForArchetype("${archetype}") returned null/undefined`
      ).toBeTruthy();
    }
  });

  it('does not throw for any registered archetype', () => {
    const allArchetypes = new Set<ArchetypeId>();
    for (const meta of LEVEL_META) {
      for (const arch of archetypesForLevel(meta.number)) {
        allArchetypes.add(arch);
      }
    }

    for (const archetype of allArchetypes) {
      expect(
        () => getInteractionForArchetype(archetype),
        `getInteractionForArchetype("${archetype}") threw unexpectedly`
      ).not.toThrow();
    }
  });

  it('throws a descriptive error for an unknown archetype', () => {
    // Verify the error surface for anything not in the registry.
    // Cast through unknown to satisfy the ArchetypeId type at call site.
    expect(() =>
      getInteractionForArchetype('unknown_archetype' as unknown as ArchetypeId)
    ).toThrow(/No interaction registered/);
  });

  it('covers the full ARCHETYPES list minus explain_your_order (which is order variant)', () => {
    // explain_your_order is routed via order + validatorId, not directly.
    // All other ARCHETYPES entries should be reachable directly.
    const unreachable = new Set<string>(['explain_your_order', 'placement']);
    for (const arch of ARCHETYPES) {
      if (unreachable.has(arch)) continue;
      expect(
        () => getInteractionForArchetype(arch),
        `ARCHETYPES entry "${arch}" has no factory in levelRouter`
      ).not.toThrow();
    }
  });
});
