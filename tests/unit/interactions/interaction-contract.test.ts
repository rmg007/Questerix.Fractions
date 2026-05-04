/**
 * Interaction Contract Test — Phase 6 Hardening
 * Validates that all interactions:
 * 1. Implement the Interaction interface correctly
 * 2. Have required properties (archetype, mount, unmount)
 * 3. Optional methods (showVisualOverlay, showGhostGuide, showCorrectFeedback) are properly typed
 *
 * per CLAUDE.md § "Interaction Contract" and Phase 6 plan
 * Note: Runtime lifecycle testing (mount→unmount→mount) requires Phaser rendering,
 * which is tested via E2E suite. This test validates static contracts only.
 */

import { describe, it, expect, vi } from 'vitest';

// Mock Phaser before importing interactions
vi.mock('phaser', async () => {
  const EventEmitter = class {
    emit = vi.fn();
    on = vi.fn().mockReturnThis();
    off = vi.fn().mockReturnThis();
    destroy = vi.fn();
  };

  return {
    Scene: class Scene {
      add = {
        graphics: vi.fn().mockReturnValue({
          setDepth: vi.fn().mockReturnThis(),
          clear: vi.fn().mockReturnThis(),
          destroy: vi.fn(),
        }),
        rectangle: vi.fn().mockReturnValue({
          setOrigin: vi.fn().mockReturnThis(),
          setDepth: vi.fn().mockReturnThis(),
          setInteractive: vi.fn().mockReturnThis(),
          on: vi.fn().mockReturnThis(),
          destroy: vi.fn(),
          setAlpha: vi.fn().mockReturnThis(),
          setScale: vi.fn().mockReturnThis(),
          setFillStyle: vi.fn().mockReturnThis(),
          setStrokeStyle: vi.fn().mockReturnThis(),
          setPosition: vi.fn().mockReturnThis(),
          x: 0,
          y: 0,
        }),
        circle: vi.fn().mockReturnValue({
          setDepth: vi.fn().mockReturnThis(),
          setStrokeStyle: vi.fn().mockReturnThis(),
          setAlpha: vi.fn().mockReturnThis(),
          setScale: vi.fn().mockReturnThis(),
          setPosition: vi.fn().mockReturnThis(),
          destroy: vi.fn(),
          x: 0,
          y: 0,
        }),
        text: vi.fn().mockReturnValue({
          setOrigin: vi.fn().mockReturnThis(),
          setDepth: vi.fn().mockReturnThis(),
          setAlpha: vi.fn().mockReturnThis(),
          setScale: vi.fn().mockReturnThis(),
          setPosition: vi.fn().mockReturnThis(),
          setX: vi.fn().mockReturnThis(),
          destroy: vi.fn(),
          x: 0,
          y: 0,
        }),
        arc: vi.fn().mockReturnValue({
          setDepth: vi.fn().mockReturnThis(),
          setStrokeStyle: vi.fn().mockReturnThis(),
          setAlpha: vi.fn().mockReturnThis(),
          setScale: vi.fn().mockReturnThis(),
          setPosition: vi.fn().mockReturnThis(),
          destroy: vi.fn(),
          x: 0,
          y: 0,
        }),
      };
      time = {
        delayedCall: vi.fn(),
      };
      tweens = {
        add: vi.fn().mockReturnValue({ stop: vi.fn() }),
      };
      input = {
        keyboard: {
          on: vi.fn().mockReturnThis(),
          off: vi.fn().mockReturnThis(),
        },
      };
      events = new EventEmitter();
      scene = {
        systems: {
          game: {
            events: new EventEmitter(),
          },
        },
      };
    },
    Events: { EventEmitter },
    Input: {
      Pointer: class {},
    },
    GameObjects: {
      Graphics: class {},
      Container: class {},
      Text: class {},
      Rectangle: class {},
      Arc: class {},
    },
    Math: {
      Clamp: (v: number, min: number, max: number) => Math.max(min, Math.min(max, v)),
    },
    Geom: { Rectangle: { Contains: () => false } },
  };
});

// Mock components and utilities that may depend on Phaser/DOM
vi.mock('@/components/A11yLayer', () => ({
  A11yLayer: {
    unmountAll: vi.fn(),
    mountAction: vi.fn(),
    mountElement: vi.fn(),
  },
}));

vi.mock('@/components/DragHandle', () => ({
  DragHandle: class DragHandle {
    destroy = vi.fn();
  },
}));

vi.mock('@/scenes/utils/TestHooks', () => ({
  TestHooks: {
    mountInteractive: vi.fn(),
    unmount: vi.fn(),
    mountSentinel: vi.fn(),
  },
}));

vi.mock('@/lib/log', () => ({
  log: {
    scene: vi.fn(),
    drag: vi.fn(),
  },
}));

vi.mock('@/audio/SFXService', () => ({
  sfx: {
    playSnap: vi.fn(),
  },
}));

vi.mock('@/lib/preferences', () => ({
  checkReduceMotion: vi.fn(() => false),
}));

vi.mock('@/components/SymbolicFractionDisplay', () => ({
  SymbolicFractionDisplay: class SymbolicFractionDisplay {
    destroy = vi.fn();
  },
}));

vi.mock('@/scenes/interactions/utils', () => ({
  BarModel: class BarModel {
    destroy = vi.fn();
  },
  NumberLine: class NumberLine {
    destroy = vi.fn();
  },
  ChocolateBarModel: class ChocolateBarModel {
    snapTargets = vi.fn(() => []);
    showFeedback = vi.fn();
    destroy = vi.fn();
  },
}));

import { PartitionInteraction } from '@/scenes/interactions/PartitionInteraction';
import { IdentifyInteraction } from '@/scenes/interactions/IdentifyInteraction';
import { LabelInteraction } from '@/scenes/interactions/LabelInteraction';
import { MakeInteraction } from '@/scenes/interactions/MakeInteraction';
import { CompareInteraction } from '@/scenes/interactions/CompareInteraction';
import { SnapMatchInteraction } from '@/scenes/interactions/SnapMatchInteraction';
import { BenchmarkInteraction } from '@/scenes/interactions/BenchmarkInteraction';
import { PlacementInteraction } from '@/scenes/interactions/PlacementInteraction';
import { OrderInteraction } from '@/scenes/interactions/OrderInteraction';
import { EqualOrNotInteraction } from '@/scenes/interactions/EqualOrNotInteraction';
import { ExplainYourOrderInteraction } from '@/scenes/interactions/ExplainYourOrderInteraction';

// List of all interaction archetypes — must be exhaustive
const ALL_INTERACTIONS = [
  PartitionInteraction,
  IdentifyInteraction,
  LabelInteraction,
  MakeInteraction,
  CompareInteraction,
  SnapMatchInteraction,
  BenchmarkInteraction,
  PlacementInteraction,
  OrderInteraction,
  EqualOrNotInteraction,
  ExplainYourOrderInteraction,
];

describe('Interaction Contract', () => {
  describe('Interface Implementation', () => {
    it('all interactions export a class', () => {
      ALL_INTERACTIONS.forEach((InteractionClass) => {
        expect(InteractionClass).toBeDefined();
        expect(typeof InteractionClass).toBe('function'); // constructor
      });
    });

    it('all interactions have archetype property', () => {
      ALL_INTERACTIONS.forEach((InteractionClass) => {
        const instance = new InteractionClass();
        expect(instance.archetype).toBeDefined();
        expect(typeof instance.archetype).toBe('string');
      });
    });

    it('all interactions have mount method', () => {
      ALL_INTERACTIONS.forEach((InteractionClass) => {
        const instance = new InteractionClass();
        expect(typeof instance.mount).toBe('function');
        expect(instance.mount.length).toBeGreaterThanOrEqual(1); // expects InteractionContext
      });
    });

    it('all interactions have unmount method', () => {
      ALL_INTERACTIONS.forEach((InteractionClass) => {
        const instance = new InteractionClass();
        expect(typeof instance.unmount).toBe('function');
        expect(instance.unmount.length).toBe(0); // no parameters
      });
    });

    it('all interactions have valid optional methods', () => {
      ALL_INTERACTIONS.forEach((InteractionClass) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const instance: any = new InteractionClass();

        // These are optional, but if present, must be functions
        if (instance.showVisualOverlay !== undefined) {
          expect(typeof instance.showVisualOverlay).toBe('function');
        }
        if (instance.showGhostGuide !== undefined) {
          expect(typeof instance.showGhostGuide).toBe('function');
        }
        if (instance.showCorrectFeedback !== undefined) {
          expect(typeof instance.showCorrectFeedback).toBe('function');
        }
      });
    });
  });

  describe('Archetype Validity', () => {
    it('every interaction has a unique archetype', () => {
      const archetypes = ALL_INTERACTIONS.map((C) => new C().archetype);
      const uniqueArchetypes = new Set(archetypes);
      expect(uniqueArchetypes.size).toBe(archetypes.length);
    });

    it('all archetypes are valid ArchetypeId values', () => {
      const validArchetypes = [
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
        'explain_your_order',
      ] as const;

      ALL_INTERACTIONS.forEach((InteractionClass) => {
        const instance = new InteractionClass();
        expect(validArchetypes).toContain(instance.archetype);
      });
    });
  });

  describe('Interaction Completeness', () => {
    it('11 interaction archetypes are implemented', () => {
      expect(ALL_INTERACTIONS.length).toBe(11);
    });

    it('archetype names match class names', () => {
      const archetypeMap: Record<string, string> = {
        partition: 'PartitionInteraction',
        identify: 'IdentifyInteraction',
        label: 'LabelInteraction',
        make: 'MakeInteraction',
        compare: 'CompareInteraction',
        benchmark: 'BenchmarkInteraction',
        order: 'OrderInteraction',
        snap_match: 'SnapMatchInteraction',
        equal_or_not: 'EqualOrNotInteraction',
        placement: 'PlacementInteraction',
        explain_your_order: 'ExplainYourOrderInteraction',
      };

      ALL_INTERACTIONS.forEach((InteractionClass) => {
        const instance = new InteractionClass();
        const expectedName = archetypeMap[instance.archetype];
        expect(InteractionClass.name).toBe(expectedName);
      });
    });
  });
});
