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
    'setDepth',
    'setVisible',
    'setOrigin',
    'setScale',
    'setAlpha',
    'setX',
    'setY',
    'setFillStyle',
    'setText',
    'setColor',
    'setInteractive',
    'on',
  ]) {
    go[m] = vi.fn().mockReturnValue(go);
  }
  go['destroy'] = vi.fn();
  return go;
}

function makeGraphics() {
  const g: Record<string, unknown> = {};
  for (const m of [
    'fillStyle',
    'fillRect',
    'fillRoundedRect',
    'lineStyle',
    'strokeRoundedRect',
    'fillCircle',
    'strokeCircle',
    'beginPath',
    'moveTo',
    'lineTo',
    'closePath',
    'fillPath',
    'strokePath',
    'clear',
    'setDepth',
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

  it('creates a 0xFFD700 gold star graphics object and adds it to the container when mastered is true', () => {
    const graphicsObjects: ReturnType<typeof makeGraphics>[] = [];
    const scene = makeSceneStub();
    scene.add.graphics.mockImplementation(() => {
      const g = makeGraphics();
      graphicsObjects.push(g);
      return g;
    });

    const card = new LevelCard(makeCardOpts(scene, true));

    // build() calls scene.add.graphics() at least twice: bg + mastery star.
    expect(graphicsObjects.length).toBeGreaterThanOrEqual(2);

    // The mastery star is drawn with true-gold fill (0xFFD700 per PLAN.md
    // Phase 2d) using a 5-pointed polygon (fillPath/strokePath, not rounded
    // rect or circle).
    const starG = graphicsObjects.find((g) =>
      (g.fillStyle as ReturnType<typeof vi.fn>).mock.calls.some(([c]) => c === 0xffd700)
    );
    expect(starG).toBeDefined();
    expect(starG!.fillPath).toHaveBeenCalled();
    expect(starG!.strokePath).toHaveBeenCalled();

    // Verify the star was actually added to the LevelCard container.
    const addCalls = (card as unknown as { add: ReturnType<typeof vi.fn> }).add.mock.calls;
    const wasAddedToContainer = addCalls.some(([arg]) => arg === starG);
    expect(wasAddedToContainer).toBe(true);
  });

  it('does NOT create a gold mastery star when mastered is false', () => {
    const graphicsObjects: ReturnType<typeof makeGraphics>[] = [];
    const scene = makeSceneStub();
    scene.add.graphics.mockImplementation(() => {
      const g = makeGraphics();
      graphicsObjects.push(g);
      return g;
    });
    new LevelCard(makeCardOpts(scene, false));

    const goldStar = graphicsObjects.find((g) =>
      (g.fillStyle as ReturnType<typeof vi.fn>).mock.calls.some(([c]) => c === 0xffd700)
    );
    expect(goldStar).toBeUndefined();
  });

  it('does NOT create a gold mastery star when mastered is omitted (defaults false)', () => {
    const graphicsObjects: ReturnType<typeof makeGraphics>[] = [];
    const scene = makeSceneStub();
    scene.add.graphics.mockImplementation(() => {
      const g = makeGraphics();
      graphicsObjects.push(g);
      return g;
    });
    const opts = makeCardOpts(scene, false);
    const { mastered: _omit, ...optsWithoutMastered } = opts;
    new LevelCard(optsWithoutMastered);

    const goldStar = graphicsObjects.find((g) =>
      (g.fillStyle as ReturnType<typeof vi.fn>).mock.calls.some(([c]) => c === 0xffd700)
    );
    expect(goldStar).toBeUndefined();
  });

  it('does NOT show the gold mastery star on locked cards even if mastered=true (race-condition guard)', () => {
    const graphicsObjects: ReturnType<typeof makeGraphics>[] = [];
    const scene = makeSceneStub();
    scene.add.graphics.mockImplementation(() => {
      const g = makeGraphics();
      graphicsObjects.push(g);
      return g;
    });
    const opts = { ...makeCardOpts(scene, true), unlocked: false };
    new LevelCard(opts);

    const goldStar = graphicsObjects.find((g) =>
      (g.fillStyle as ReturnType<typeof vi.fn>).mock.calls.some(([c]) => c === 0xffd700)
    );
    expect(goldStar).toBeUndefined();
  });
});
