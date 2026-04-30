/**
 * LevelCard — unit tests.
 *
 * Asserts that a gold mastery ribbon graphics object is added to the container
 * when `mastered: true`, and that no ribbon is drawn when `mastered: false`.
 *
 * Phaser is mocked to avoid a WebGL/Canvas context requirement.
 * Uses the same mock pattern as FeedbackOverlay and SessionCompleteOverlay tests.
 */

import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('phaser', () => {
  class EventEmitter {
    emit = vi.fn();
    on = vi.fn();
    destroy = vi.fn();
  }
  class Container {
    scene: unknown;
    add = vi.fn();
    constructor(scene: unknown) {
      this.scene = scene;
    }
  }
  class Scene {}
  return {
    Scene,
    Events: { EventEmitter },
    GameObjects: {
      Container,
      Text: class {},
      Rectangle: class {},
    },
    Geom: { Rectangle: { Contains: () => false } },
    default: { Scene },
  };
});

vi.mock('@/scenes/utils/TestHooks', () => ({
  TestHooks: {
    mountSentinel: vi.fn(),
    unmount: vi.fn(),
    unmountAll: vi.fn(),
    setText: vi.fn(),
    mountInteractive: vi.fn(),
  },
}));

import { LevelCard } from '@/components/LevelCard';
import type { LevelMeta } from '@/scenes/utils/levelMeta';

function makeGameObject() {
  const go: Record<string, unknown> = { x: 0, y: 0, depth: 0, alpha: 1, scale: 1 };
  for (const m of [
    'setDepth', 'setVisible', 'setOrigin', 'setScale', 'setAlpha',
    'setX', 'setY', 'setFillStyle', 'setText', 'setColor',
    'setInteractive', 'on',
  ]) {
    go[m] = vi.fn().mockReturnValue(go);
  }
  go['destroy'] = vi.fn();
  return go;
}

function makeGraphics() {
  const g: Record<string, unknown> = {};
  for (const m of [
    'fillStyle', 'fillRect', 'fillRoundedRect', 'lineStyle',
    'strokeRoundedRect', 'clear', 'setDepth',
  ]) {
    g[m] = vi.fn().mockReturnValue(g);
  }
  g['destroy'] = vi.fn();
  return g;
}

function makeSceneStub() {
  return {
    add: {
      existing: vi.fn(),
      graphics: vi.fn().mockImplementation(() => makeGraphics()),
      text: vi.fn().mockImplementation(() => makeGameObject()),
      rectangle: vi.fn().mockImplementation(() => makeGameObject()),
    },
  };
}

const baseMeta: LevelMeta = {
  number: 1,
  name: 'Halves',
  concept: 'Equal parts',
  gradeBand: 'K–2',
};

function makeCardOpts(scene: ReturnType<typeof makeSceneStub>, mastered: boolean) {
  return {
    scene: scene as unknown as import('phaser').Scene,
    x: 0,
    y: 0,
    meta: baseMeta,
    unlocked: true,
    suggested: false,
    mastered,
    onTap: vi.fn(),
  };
}

describe('LevelCard — gold mastery ribbon', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'matchMedia', {
      value: vi.fn().mockReturnValue({ matches: false }),
      writable: true,
    });
  });

  it('creates a ribbon graphics object and adds it to the container when mastered is true', () => {
    // Capture every graphics object returned by the scene so we can identify
    // the ribbon instance (the second one created).
    const graphicsObjects: ReturnType<typeof makeGraphics>[] = [];
    const scene = makeSceneStub();
    scene.add.graphics.mockImplementation(() => {
      const g = makeGraphics();
      graphicsObjects.push(g);
      return g;
    });

    const card = new LevelCard(makeCardOpts(scene, true));

    // build() calls scene.add.graphics() once for the bg and once for the ribbon.
    expect(graphicsObjects.length).toBeGreaterThanOrEqual(2);

    // The ribbon is the second graphics object. It must be drawn with gold fill
    // and passed to this.add() on the container.
    const ribbonG = graphicsObjects[1];
    expect(ribbonG.fillStyle).toHaveBeenCalledWith(0xfbbf24, 1); // RIBBON_GOLD
    expect(ribbonG.fillRoundedRect).toHaveBeenCalled();
    expect(ribbonG.strokeRoundedRect).toHaveBeenCalled();

    // Verify the ribbon was actually added to the LevelCard container.
    const addCalls = (card as unknown as { add: ReturnType<typeof vi.fn> }).add.mock.calls;
    const wasAddedToContainer = addCalls.some(([arg]) => arg === ribbonG);
    expect(wasAddedToContainer).toBe(true);
  });

  it('does NOT create a ribbon graphics object when mastered is false', () => {
    const scene = makeSceneStub();
    new LevelCard(makeCardOpts(scene, false));

    // With mastered=false the build() method only calls scene.add.graphics()
    // once — for the background card — so the ribbon is absent.
    const graphicsCalls = scene.add.graphics.mock.calls.length;
    expect(graphicsCalls).toBe(1);
  });

  it('does NOT create a ribbon graphics object when mastered is omitted (defaults false)', () => {
    const scene = makeSceneStub();
    const opts = makeCardOpts(scene, false);
    // Omit mastered entirely (default is false per LevelCardOptions)
    const { mastered: _omit, ...optsWithoutMastered } = opts;
    new LevelCard(optsWithoutMastered);

    // No ribbon — only 1 graphics call for the background
    expect(scene.add.graphics.mock.calls.length).toBe(1);
  });
});
