/**
 * FeedbackOverlay — unit tests.
 *
 * Asserts that `burstStarParticles` mounts the 'sparkle-burst' TestHook
 * sentinel when a correct answer is shown with the 'clr-accentA' texture
 * available and reduced-motion disabled.
 *
 * Phaser is mocked; window.matchMedia is overridden to control the
 * reduced-motion code path.
 */

import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

vi.mock('phaser', () => {
  class EventEmitter {
    emit = vi.fn();
    on = vi.fn().mockReturnThis();
    destroy = vi.fn();
  }
  class Scene {}
  return {
    Scene,
    Events: { EventEmitter },
    GameObjects: {
      Container: class {},
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

import { FeedbackOverlay } from '@/components/FeedbackOverlay';
import { TestHooks } from '@/scenes/utils/TestHooks';

function makeGameObject() {
  const go: Record<string, unknown> = { x: 400, y: 640, depth: 100, alpha: 1, scale: 1 };
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

function makeSceneStub(textureExists: boolean) {
  const emitter = {
    setDepth: vi.fn().mockReturnThis(),
    explode: vi.fn(),
    destroy: vi.fn(),
  };
  return {
    add: {
      rectangle: vi.fn().mockImplementation(() => makeGameObject()),
      text: vi.fn().mockImplementation(() => makeGameObject()),
      graphics: vi.fn().mockImplementation(() => {
        const g: Record<string, unknown> = {};
        for (const m of [
          'fillStyle',
          'fillRoundedRect',
          'lineStyle',
          'strokeRoundedRect',
          'setDepth',
          'setVisible',
          'setAlpha',
          'setX',
          'clear',
        ]) {
          g[m] = vi.fn().mockReturnValue(g);
        }
        g['destroy'] = vi.fn();
        return g;
      }),
      particles: vi.fn().mockReturnValue(emitter),
    },
    time: { delayedCall: vi.fn() },
    tweens: {
      add: vi.fn().mockImplementation((cfg: Record<string, unknown>) => {
        if (typeof cfg.onComplete === 'function') (cfg.onComplete as () => void)();
      }),
      chain: vi.fn(),
    },
    textures: { exists: vi.fn().mockReturnValue(textureExists) },
  };
}

describe('FeedbackOverlay — sparkle burst', () => {
  let origMatchMedia: typeof window.matchMedia;

  beforeEach(() => {
    origMatchMedia = window.matchMedia;
    vi.mocked(TestHooks.mountSentinel).mockClear();
    vi.mocked(TestHooks.mountInteractive).mockClear();
  });

  afterEach(() => {
    Object.defineProperty(window, 'matchMedia', { value: origMatchMedia, writable: true });
  });

  it('mounts the sparkle-burst sentinel when showing a correct answer with texture available', () => {
    Object.defineProperty(window, 'matchMedia', {
      value: vi.fn().mockReturnValue({ matches: false }),
      writable: true,
    });

    const scene = makeSceneStub(true);
    const overlay = new FeedbackOverlay({
      scene: scene as unknown as import('phaser').Scene,
    });

    overlay.show('correct');

    expect(vi.mocked(TestHooks.mountSentinel)).toHaveBeenCalledWith('sparkle-burst');
  });

  it('does NOT mount sparkle-burst when showing an incorrect answer', () => {
    Object.defineProperty(window, 'matchMedia', {
      value: vi.fn().mockReturnValue({ matches: false }),
      writable: true,
    });

    const scene = makeSceneStub(true);
    const overlay = new FeedbackOverlay({
      scene: scene as unknown as import('phaser').Scene,
    });

    overlay.show('incorrect');

    const calls = vi.mocked(TestHooks.mountSentinel).mock.calls.map(([id]) => id);
    expect(calls).not.toContain('sparkle-burst');
  });

  it('does NOT mount sparkle-burst when texture is missing', () => {
    Object.defineProperty(window, 'matchMedia', {
      value: vi.fn().mockReturnValue({ matches: false }),
      writable: true,
    });

    const scene = makeSceneStub(false);
    const overlay = new FeedbackOverlay({
      scene: scene as unknown as import('phaser').Scene,
    });

    overlay.show('correct');

    const calls = vi.mocked(TestHooks.mountSentinel).mock.calls.map(([id]) => id);
    expect(calls).not.toContain('sparkle-burst');
  });
});
