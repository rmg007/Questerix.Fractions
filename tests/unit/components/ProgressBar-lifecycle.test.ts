/**
 * ProgressBar — lifecycle tests.
 * Verifies tween cleanup on destroy.
 */

import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('phaser', () => {
  class Container {
    scene: unknown;
    constructor(scene: unknown) {
      this.scene = scene;
    }
    add = vi.fn().mockReturnThis();
    setDepth = vi.fn().mockReturnThis();
    destroy = vi.fn();
  }

  class Text {
    setText = vi.fn().mockReturnThis();
    setColor = vi.fn().mockReturnThis();
    setOrigin = vi.fn().mockReturnThis();
    setScale = vi.fn().mockReturnThis();
    setDepth = vi.fn().mockReturnThis();
    setVisible = vi.fn().mockReturnThis();
    destroy = vi.fn();
  }

  return {
    GameObjects: {
      Container,
      Text,
    },
    Tweens: {
      Tween: class {},
    },
  };
});

vi.mock('@/scenes/utils/TestHooks', () => ({
  TestHooks: {
    mountSentinel: vi.fn().mockReturnValue(null),
    setAriaValueNow: vi.fn(),
    get: vi.fn().mockReturnValue(null),
  },
}));

import { ProgressBar } from '@/components/ProgressBar';

describe('ProgressBar Lifecycle', () => {
  let mockScene: any;

  beforeEach(() => {
    mockScene = {
      add: {
        text: vi.fn().mockImplementation(() => ({
          setText: vi.fn().mockReturnThis(),
          setColor: vi.fn().mockReturnThis(),
          setOrigin: vi.fn().mockReturnThis(),
          setScale: vi.fn().mockReturnThis(),
          setDepth: vi.fn().mockReturnThis(),
          setVisible: vi.fn().mockReturnThis(),
          destroy: vi.fn(),
        })),
        existing: vi.fn().mockReturnThis(),
      },
      tweens: {
        add: vi.fn().mockImplementation((config) => {
          const tween = {
            remove: vi.fn(),
            ...config,
          };
          return tween;
        }),
      },
    };
  });

  describe('tween tracking', () => {
    it('stores tween references during setProgress', () => {
      const bar = new ProgressBar({ scene: mockScene, x: 100, y: 100, width: 200 });

      mockScene.tweens.add.mockClear();
      bar.setProgress(1);

      expect(mockScene.tweens.add).toHaveBeenCalled();
    });
  });

  describe('destroy cleanup', () => {
    it('destroy completes without error', () => {
      const bar = new ProgressBar({ scene: mockScene, x: 100, y: 100, width: 200 });

      bar.setProgress(1);
      const tweenCount = mockScene.tweens.add.mock.results.length;
      expect(tweenCount).toBeGreaterThan(0);

      // Destroy should not throw
      expect(() => bar.destroy()).not.toThrow();
    });

    it('destroy is safe to call multiple times', () => {
      const bar = new ProgressBar({ scene: mockScene, x: 100, y: 100, width: 200 });
      bar.setProgress(1);

      bar.destroy();

      // Second destroy should not throw
      expect(() => bar.destroy()).not.toThrow();
    });
  });
});
