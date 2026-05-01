/**
 * UpdateBanner unit tests — construction + accept handler.
 *
 * Phaser scenes are hard to mount in Vitest (the renderer + event system
 * pulls in a browser canvas), so we stub Phaser's GameObject factory and
 * tween manager. Coverage focuses on the public contract: the banner
 * paints a sentinel, calls `onAccept` once when tapped, and tears down its
 * sentinel on `destroy()`.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

// ── Phaser stub ─────────────────────────────────────────────────────────────

let lastPointerHandler: (() => void) | null = null;

// Plain `Record<string, unknown>` keeps Vitest's mock-typing happy while
// still letting us assert against `setDepth.mock.calls` etc.
type StubRect = Record<string, unknown>;

const makeRect = (): StubRect => {
  const rect: StubRect = {
    setDepth: vi.fn().mockReturnThis(),
    setOrigin: vi.fn().mockReturnThis(),
    setStrokeStyle: vi.fn().mockReturnThis(),
    setInteractive: vi.fn().mockReturnThis(),
    on: vi.fn((event: string, fn: () => void) => {
      if (event === 'pointerup') lastPointerHandler = fn;
      return rect;
    }),
    destroy: vi.fn(),
  };
  return rect;
};

const makeText = (): {
  setOrigin: ReturnType<typeof vi.fn>;
  setDepth: ReturnType<typeof vi.fn>;
  destroy: ReturnType<typeof vi.fn>;
} => ({
  setOrigin: vi.fn().mockReturnThis(),
  setDepth: vi.fn().mockReturnThis(),
  destroy: vi.fn(),
});

const tweenAdd = vi.fn();
const tweenKill = vi.fn();

vi.mock('phaser', () => {
  class Scene {
    add = {
      rectangle: vi.fn(() => makeRect()),
      text: vi.fn(() => makeText()),
    };
    tweens = {
      add: tweenAdd,
      killTweensOf: tweenKill,
    };
  }
  return { default: { Scene }, Scene };
});

// ── Companion stubs ─────────────────────────────────────────────────────────

let lastSentinelText: string | null = null;
let sentinelMounted = false;
let interactiveMounted = false;

vi.mock('@/scenes/utils/TestHooks', () => ({
  TestHooks: {
    mountSentinel: vi.fn(() => {
      sentinelMounted = true;
      return document.createElement('div');
    }),
    setText: vi.fn((_: string, text: string) => {
      lastSentinelText = text;
    }),
    mountInteractive: vi.fn(() => {
      interactiveMounted = true;
    }),
    unmount: vi.fn((id: string) => {
      if (id === 'update-banner') sentinelMounted = false;
      if (id === 'update-banner-action') interactiveMounted = false;
    }),
  },
}));

vi.mock('@/scenes/utils/colors', () => ({
  CLR: { primary: 0x2f6fed },
  HEX: { neutral0: '#FFFFFF' },
}));

vi.mock('@/lib/preferences', () => ({
  checkReduceMotion: vi.fn(() => false),
}));

import { UpdateBanner } from '../UpdateBanner';

function makeScene(): import('phaser').Scene {
  return {
    add: {
      rectangle: vi.fn(() => makeRect()),
      text: vi.fn(() => makeText()),
    },
    tweens: {
      add: tweenAdd,
      killTweensOf: tweenKill,
    },
  } as unknown as import('phaser').Scene;
}

describe('UpdateBanner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    lastPointerHandler = null;
    lastSentinelText = null;
    sentinelMounted = false;
    interactiveMounted = false;
  });

  describe('construction', () => {
    it('mounts the test sentinel with the default copy', () => {
      const scene = makeScene();
      new UpdateBanner({ scene });
      expect(sentinelMounted).toBe(true);
      expect(lastSentinelText).toBe('A new version is ready — tap to refresh');
    });

    it('mounts the interactive overlay so screen readers see the affordance', () => {
      const scene = makeScene();
      new UpdateBanner({ scene });
      expect(interactiveMounted).toBe(true);
    });

    it('schedules a slide-in tween when motion is allowed', () => {
      const scene = makeScene();
      new UpdateBanner({ scene });
      expect(tweenAdd).toHaveBeenCalled();
    });

    it('honours a custom message override', () => {
      const scene = makeScene();
      new UpdateBanner({ scene, message: 'Custom copy' });
      expect(lastSentinelText).toBe('Custom copy');
    });
  });

  describe('accept handler', () => {
    it('invokes onAccept exactly once when the banner is tapped', () => {
      const scene = makeScene();
      const onAccept = vi.fn();
      new UpdateBanner({ scene, onAccept });
      // Simulate the canvas pointerup that the constructor wired.
      lastPointerHandler?.();
      expect(onAccept).toHaveBeenCalledTimes(1);
    });

    it('does not invoke onAccept twice when tapped repeatedly', () => {
      const scene = makeScene();
      const onAccept = vi.fn();
      new UpdateBanner({ scene, onAccept });
      lastPointerHandler?.();
      lastPointerHandler?.();
      expect(onAccept).toHaveBeenCalledTimes(1);
    });
  });

  describe('lifecycle', () => {
    it('unmounts both sentinels on destroy()', () => {
      const scene = makeScene();
      const banner = new UpdateBanner({ scene });
      banner.destroy();
      expect(sentinelMounted).toBe(false);
      expect(interactiveMounted).toBe(false);
    });

    it('dismiss() tears down the banner without calling onAccept', () => {
      const scene = makeScene();
      const onAccept = vi.fn();
      const banner = new UpdateBanner({ scene, onAccept });
      banner.dismiss();
      expect(onAccept).not.toHaveBeenCalled();
      expect(sentinelMounted).toBe(false);
    });
  });
});
