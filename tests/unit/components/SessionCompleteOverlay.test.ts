/**
 * SessionCompleteOverlay — unit tests.
 *
 * 1. starsFromAccuracy — three accuracy-band assertions (pure function).
 * 2. Trophy card visible — overlay mounts the 'completion-screen' TestHook
 *    sentinel synchronously when reduced-motion is enabled, proving the
 *    trophy screen is reachable without depending on tween timing.
 *
 * Phaser is mocked to avoid a WebGL/Canvas context requirement.
 * window.matchMedia is overridden per test to control the reduced-motion path.
 */

import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

vi.mock('phaser', () => {
  class EventEmitter {
    emit = vi.fn();
    on = vi.fn();
    destroy = vi.fn();
  }
  class Scene {}
  return {
    Scene,
    Events: { EventEmitter },
    GameObjects: { Container: class {}, Text: class {}, Rectangle: class {} },
    Geom: { Rectangle: { Contains: () => false } },
    default: { Scene },
  };
});

vi.mock('@/components/AccessibilityAnnouncer', () => ({
  AccessibilityAnnouncer: { announce: vi.fn() },
}));

vi.mock('@/scenes/utils/TestHooks', () => ({
  TestHooks: {
    mountSentinel: vi.fn(),
    unmount: vi.fn(),
    unmountAll: vi.fn(),
    setText: vi.fn(),
    mountInteractive: vi.fn(),
  },
}));

import { starsFromAccuracy } from '@/components/SessionCompleteOverlay';
import { SessionCompleteOverlay } from '@/components/SessionCompleteOverlay';
import { TestHooks } from '@/scenes/utils/TestHooks';

function makeGameObject() {
  const go: Record<string, unknown> = { x: 400, y: 640, depth: 100, alpha: 1, scale: 1 };
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

function makeContainer() {
  const c: Record<string, unknown> = { y: 0, depth: 0 };
  for (const m of ['setDepth', 'add', 'destroy']) {
    c[m] = vi.fn().mockReturnValue(c);
  }
  return c;
}

function makeGraphics() {
  const g: Record<string, unknown> = {};
  for (const m of [
    'fillStyle', 'fillRect', 'fillRoundedRect', 'lineStyle',
    'lineBetween', 'strokeRoundedRect', 'setDepth',
  ]) {
    g[m] = vi.fn().mockReturnValue(g);
  }
  g['destroy'] = vi.fn();
  return g;
}

function makeSceneStub() {
  return {
    add: {
      rectangle: vi.fn().mockReturnValue(makeGameObject()),
      text: vi.fn().mockImplementation(() => makeGameObject()),
      graphics: vi.fn().mockImplementation(() => makeGraphics()),
      container: vi.fn().mockReturnValue(makeContainer()),
      particles: vi.fn().mockReturnValue({
        setDepth: vi.fn().mockReturnThis(),
        explode: vi.fn(),
        destroy: vi.fn(),
      }),
    },
    time: { delayedCall: vi.fn() },
    tweens: { add: vi.fn() },
    textures: { exists: vi.fn().mockReturnValue(false) },
    events: { once: vi.fn(), off: vi.fn() },
  };
}

describe('starsFromAccuracy', () => {
  it('returns 3 stars for ≥ 90 % accuracy', () => {
    expect(starsFromAccuracy(9, 10)).toBe(3);
    expect(starsFromAccuracy(10, 10)).toBe(3);
    expect(starsFromAccuracy(5, 5)).toBe(3);
  });

  it('returns 2 stars for 60–89 % accuracy', () => {
    expect(starsFromAccuracy(6, 10)).toBe(2);
    expect(starsFromAccuracy(3, 5)).toBe(2);
    expect(starsFromAccuracy(89, 100)).toBe(2);
  });

  it('returns 1 star for < 60 % accuracy', () => {
    expect(starsFromAccuracy(0, 5)).toBe(1);
    expect(starsFromAccuracy(2, 5)).toBe(1);
    expect(starsFromAccuracy(59, 100)).toBe(1);
  });

  it('returns 1 star when total is 0 (no division by zero)', () => {
    expect(starsFromAccuracy(0, 0)).toBe(1);
  });
});

describe('SessionCompleteOverlay — trophy card', () => {
  let origMatchMedia: typeof window.matchMedia;

  beforeEach(() => {
    origMatchMedia = window.matchMedia;
    vi.mocked(TestHooks.mountSentinel).mockClear();
  });

  afterEach(() => {
    Object.defineProperty(window, 'matchMedia', { value: origMatchMedia, writable: true });
  });

  it('mounts the completion-screen sentinel synchronously under reduced motion', () => {
    Object.defineProperty(window, 'matchMedia', {
      value: vi.fn().mockReturnValue({ matches: true }),
      writable: true,
    });

    const scene = makeSceneStub();
    new SessionCompleteOverlay({
      scene: scene as unknown as import('phaser').Scene,
      levelNumber: 1,
      correctCount: 4,
      totalAttempts: 5,
      onPlayAgain: vi.fn(),
      onMenu: vi.fn(),
    });

    expect(vi.mocked(TestHooks.mountSentinel)).toHaveBeenCalledWith('completion-screen');
  });
});
