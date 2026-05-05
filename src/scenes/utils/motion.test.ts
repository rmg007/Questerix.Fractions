import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { Duration, Ease, Distance, tween } from './motion';

// Mock the preferences module so tween() tests can control checkReduceMotion()
// without needing a real IndexedDB or matchMedia in the test environment.
vi.mock('../../lib/preferences', () => ({
  checkReduceMotion: vi.fn(() => false),
  isSlowModeEnabled: vi.fn(() => false),
}));

import { checkReduceMotion } from '../../lib/preferences';

describe('motion.ts', () => {
  describe('Duration constants', () => {
    it('exports all required durations', () => {
      expect(Duration.instant).toBe(0);
      expect(Duration.micro).toBe(80);
      expect(Duration.short).toBe(160);
      expect(Duration.base).toBe(240);
      expect(Duration.long).toBe(400);
      expect(Duration.ceremony).toBe(600);
    });

    it('durations are in ascending order', () => {
      const vals = [
        Duration.instant,
        Duration.micro,
        Duration.short,
        Duration.base,
        Duration.long,
        Duration.ceremony,
      ];
      for (let i = 1; i < vals.length; i++) {
        expect(vals[i] as number).toBeGreaterThanOrEqual(vals[i - 1] as number);
      }
    });

    it('max duration does not exceed K–2 perception limit', () => {
      // Input-feedback link breaks after ~600 ms for K–2 children
      expect(Duration.ceremony).toBeLessThanOrEqual(600);
    });
  });

  describe('Ease constants', () => {
    it('exports all required easing functions', () => {
      expect(Ease.out).toBe('Cubic.easeOut');
      expect(Ease.in).toBe('Cubic.easeIn');
      expect(Ease.inOut).toBe('Cubic.easeInOut');
      expect(Ease.spring).toBe('Back.easeOut');
      expect(Ease.bounce).toBe('Sine.easeInOut');
    });

    it('all easing values are valid Phaser easing names', () => {
      const eases = Object.values(Ease);
      eases.forEach((ease) => {
        expect(typeof ease).toBe('string');
        expect(ease.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Distance constants', () => {
    it('exports all required distances', () => {
      expect(Distance.press).toBe(1);
      expect(Distance.hover).toBe(2);
      expect(Distance.shake).toBe(6);
    });

    it('distances are reasonable pixel values', () => {
      const dists = Object.values(Distance);
      dists.forEach((dist) => {
        expect(dist).toBeGreaterThan(0);
        expect(dist).toBeLessThan(20);
      });
    });
  });

  describe('tween() wrapper', () => {
    let mockScene: Phaser.Scene;
    let mockTarget: any;
    let addedTween: any;

    beforeEach(() => {
      mockTarget = { x: 0, y: 0, scale: 1 };

      mockScene = {
        tweens: {
          add: (config: any) => {
            addedTween = config;
            return { stop: () => {} }; // minimal tween-like object
          },
        },
        // registry is not used by tween() — checkReduceMotion() is called instead
        registry: {
          get: (_key: string) => undefined,
        },
      } as any;

      // Default: normal motion
      vi.mocked(checkReduceMotion).mockReturnValue(false);
    });

    afterEach(() => {
      vi.mocked(checkReduceMotion).mockReturnValue(false);
    });

    it('creates a tween with default duration and easing', () => {
      tween(mockScene, mockTarget, { x: 100 });

      expect(addedTween.targets).toBe(mockTarget);
      expect(addedTween.x).toBe(100);
      expect(addedTween.duration).toBe(Duration.base);
      expect(addedTween.ease).toBe(Ease.out);
    });

    it('respects custom duration and easing', () => {
      tween(
        mockScene,
        mockTarget,
        { scale: 1.2 },
        {
          duration: Duration.long,
          ease: Ease.spring,
        }
      );

      expect(addedTween.duration).toBe(Duration.long);
      expect(addedTween.ease).toBe(Ease.spring);
    });

    it('uses instant duration when prefersReducedMotion is true', () => {
      vi.mocked(checkReduceMotion).mockReturnValue(true);

      tween(mockScene, mockTarget, { alpha: 0.5 }, { duration: Duration.ceremony });

      expect(addedTween.duration).toBe(Duration.instant);
    });

    it('still uses instant for custom durations in reduced-motion mode', () => {
      vi.mocked(checkReduceMotion).mockReturnValue(true);

      tween(mockScene, mockTarget, { alpha: 0.5 }, { duration: 999 });

      expect(addedTween.duration).toBe(Duration.instant);
    });

    it('merges opts into the final config', () => {
      tween(
        mockScene,
        mockTarget,
        { x: 50 },
        {
          duration: Duration.short,
          delay: 100,
          repeat: 2,
        }
      );

      expect(addedTween.duration).toBe(Duration.short);
      expect(addedTween.delay).toBe(100);
      expect(addedTween.repeat).toBe(2);
    });

    it('props override opts in case of conflict', () => {
      // props.ease should take precedence if both are provided
      tween(
        mockScene,
        mockTarget,
        { x: 50 },
        {
          duration: Duration.base,
          ease: Ease.in,
        }
      );

      expect(addedTween.duration).toBe(Duration.base);
      // opts.ease should be used as default, not props
      expect(addedTween.ease).toBe(Ease.in);
    });

    it('handles targets array (multiple objects)', () => {
      const target1 = { x: 0 };
      const target2 = { x: 100 };
      const targets = [target1, target2];

      tween(mockScene, targets, { x: 50 });

      expect(addedTween.targets).toEqual(targets);
      expect(addedTween.x).toBe(50);
    });

    it('respects zero duration without preferring reduced-motion', () => {
      tween(mockScene, mockTarget, { alpha: 0.5 }, { duration: 0 });
      expect(addedTween.duration).toBe(0);
    });

    it('works even when scene.registry is null (registry is not used by tween())', () => {
      // tween() uses checkReduceMotion() from preferences, not scene.registry,
      // so a null registry must not cause a throw.
      const sceneNoRegistry = {
        tweens: {
          add: (config: any) => {
            addedTween = config;
            return { stop: () => {} };
          },
        },
        registry: null,
      } as any;

      expect(() => {
        tween(sceneNoRegistry, mockTarget, { scale: 1.2 });
      }).not.toThrow();
    });

    it('passes additional tween config options through', () => {
      tween(
        mockScene,
        mockTarget,
        { x: 100 },
        {
          duration: Duration.short,
          delay: 200,
          yoyo: true,
          repeat: 2,
          onComplete: () => {},
        }
      );

      expect(addedTween.delay).toBe(200);
      expect(addedTween.yoyo).toBe(true);
      expect(addedTween.repeat).toBe(2);
      expect(addedTween.onComplete).toBeDefined();
    });
  });
});
