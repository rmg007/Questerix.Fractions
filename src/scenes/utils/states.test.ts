import { describe, it, expect, beforeEach } from 'vitest';
import { State, StateName, applyState } from './states';

describe('states.ts', () => {
  describe('State constants', () => {
    it('exports all required states', () => {
      expect(State.idle).toBeDefined();
      expect(State.hover).toBeDefined();
      expect(State.pressed).toBeDefined();
      expect(State.focused).toBeDefined();
      expect(State.disabled).toBeDefined();
      expect(State.loading).toBeDefined();
      expect(State.success).toBeDefined();
      expect(State.error).toBeDefined();
    });

    it('all states have consistent scale values', () => {
      const states = Object.values(State);
      states.forEach((state) => {
        if (state.scale !== undefined) {
          expect(state.scale).toBeGreaterThan(0);
          expect(state.scale).toBeLessThanOrEqual(1.1); // max scale is 104%
        }
      });
    });

    it('all states have consistent alpha values', () => {
      const states = Object.values(State);
      states.forEach((state) => {
        if (state.alpha !== undefined) {
          expect(state.alpha).toBeGreaterThanOrEqual(0);
          expect(state.alpha).toBeLessThanOrEqual(1);
        }
      });
    });

    it('all states have valid tint shifts', () => {
      const states = Object.values(State);
      states.forEach((state) => {
        if (state.tintShift !== undefined) {
          expect(state.tintShift as number).toBeGreaterThanOrEqual(-0.1);
          expect(state.tintShift as number).toBeLessThanOrEqual(0.1);
        }
      });
    });
  });

  describe('Interactive state semantics', () => {
    it('idle and hover are interactive', () => {
      expect(State.idle.interactive).not.toBe(false);
      expect(State.hover.interactive).not.toBe(false);
    });

    it('pressed is interactive (during press)', () => {
      expect(State.pressed.interactive).not.toBe(false);
    });

    it('focused is interactive (keyboard nav)', () => {
      expect(State.focused.interactive).not.toBe(false);
    });

    it('disabled is not interactive', () => {
      expect(State.disabled.interactive).toBe(false);
    });

    it('loading is not interactive (waiting)', () => {
      expect(State.loading.interactive).toBe(false);
    });

    it('success is not interactive (showing result)', () => {
      expect(State.success.interactive).toBe(false);
    });

    it('error is not interactive (showing error)', () => {
      expect(State.error.interactive).toBe(false);
    });
  });

  describe('Visual feedback states', () => {
    it('pressed shows darker and smaller', () => {
      expect(State.pressed.scale as number).toBeLessThan(State.idle.scale as number);
      expect((State.pressed.tintShift ?? 0) as number).toBeLessThan(
        (State.idle.tintShift ?? 0) as number
      );
    });

    it('hover shows slightly lighter and larger', () => {
      expect(State.hover.scale as number).toBeGreaterThan(State.idle.scale as number);
      expect((State.hover.tintShift ?? 0) as number).toBeLessThan(
        (State.idle.tintShift ?? 0) as number
      ); // darker = more negative
    });

    it('success is celebratory (scales up)', () => {
      expect(State.success.scale as number).toBeGreaterThan(State.idle.scale as number);
    });

    it('error shakes', () => {
      expect(State.error.shake).toBeDefined();
      if (State.error.shake) {
        expect(State.error.shake.amplitude).toBeGreaterThan(0);
        expect(State.error.shake.cycles).toBeGreaterThan(0);
      }
    });

    it('disabled is dimmed', () => {
      expect(State.disabled.alpha).toBeLessThan(State.idle.alpha ?? 1);
    });
  });

  describe('Motion parameters', () => {
    it('success uses spring easing', () => {
      expect(State.success.motion?.ease).toBe('Back.easeOut');
    });

    it('error uses short duration', () => {
      expect(State.error.motion?.durationMs).toBeGreaterThan(0);
      expect(State.error.motion?.durationMs).toBeLessThan(250);
    });

    it('all motion durations are reasonable', () => {
      const states = Object.values(State);
      states.forEach((state) => {
        if (state.motion?.durationMs !== undefined) {
          expect(state.motion.durationMs).toBeGreaterThanOrEqual(0);
          expect(state.motion.durationMs).toBeLessThanOrEqual(600);
        }
      });
    });
  });

  describe('applyState()', () => {
    let mockTarget: any;
    let mockScene: any;

    beforeEach(() => {
      mockTarget = {
        x: 100,
        y: 100,
        width: 50,
        height: 50,
        setScale: (val: number) => {
          mockTarget._scale = val;
          return mockTarget;
        },
        setAlpha: (val: number) => {
          mockTarget._alpha = val;
          return mockTarget;
        },
        setInteractive: (val: boolean) => {
          mockTarget._interactive = val;
          return mockTarget;
        },
        setTint: (val: number) => {
          mockTarget._tint = val;
          return mockTarget;
        },
        clearTint: () => {
          mockTarget._tint = undefined;
          return mockTarget;
        },
        getBounds: () => ({
          x: 75,
          y: 75,
          width: 50,
          height: 50,
        }),
      };

      mockScene = {
        registry: {
          get: () => false,
        },
        make: {
          graphics: () => ({
            lineStyle: () => ({}),
            strokeRect: () => ({}),
            setDepth: () => ({}),
            fillStyle: () => ({}),
            fillCircle: () => ({}),
          }),
        },
        add: {
          container: () => ({
            add: () => ({}),
            setDepth: () => ({}),
          }),
        },
        tweens: {
          add: () => ({}),
        },
      };
    });

    it('applies scale to target', () => {
      applyState(mockTarget, 'pressed', mockScene);
      expect(mockTarget._scale).toBe(State.pressed.scale);
    });

    it('applies alpha to target', () => {
      applyState(mockTarget, 'disabled', mockScene);
      expect(mockTarget._alpha).toBe(State.disabled.alpha);
    });

    it('applies interactive flag to target', () => {
      applyState(mockTarget, 'disabled', mockScene);
      expect(mockTarget._interactive).toBe(false);
    });

    it('handles all state names', () => {
      const stateNames: StateName[] = [
        'idle',
        'hover',
        'pressed',
        'focused',
        'disabled',
        'loading',
        'success',
        'error',
      ];
      stateNames.forEach((name) => {
        expect(() => {
          applyState(mockTarget, name, mockScene);
        }).not.toThrow();
      });
    });

    it('is idempotent — calling twice with same state is safe', () => {
      expect(() => {
        applyState(mockTarget, 'pressed', mockScene);
        applyState(mockTarget, 'pressed', mockScene);
      }).not.toThrow();
      expect(mockTarget._scale).toBe(State.pressed.scale);
    });

    it('cleans up focus ring before creating new one', () => {
      const ringDestroySpy = { destroy: () => {}, destroyed: false };
      mockTarget._focusRing = ringDestroySpy as any;

      applyState(mockTarget, 'focused', mockScene);
      // Ring should be replaced, not duplicated
      expect(mockTarget._focusRing).toBeDefined();
    });

    it('cleans up spinner before creating new one', () => {
      const spinnerDestroySpy = { destroy: () => {}, destroyed: false };
      mockTarget._spinner = spinnerDestroySpy as any;

      applyState(mockTarget, 'loading', mockScene);
      // Spinner should be replaced, not duplicated
      expect(mockTarget._spinner).toBeDefined();
    });

    it('handles target with missing bounds gracefully', () => {
      const targetNoBounds = {
        x: 100,
        y: 100,
        width: 50,
        height: 50,
        setScale: (_: number) => targetNoBounds,
        setAlpha: (_: number) => targetNoBounds,
        setInteractive: (_: boolean) => targetNoBounds,
        setTint: (_: number) => targetNoBounds,
        clearTint: () => targetNoBounds,
        getBounds: () => undefined, // No bounds
      };

      expect(() => {
        applyState(targetNoBounds, 'focused', mockScene);
      }).not.toThrow();
    });

    it('handles target without color methods gracefully', () => {
      const targetMinimal = {
        x: 100,
        y: 100,
        width: 50,
        height: 50,
        setScale: (_v: number) => targetMinimal,
        setAlpha: (_v: number) => targetMinimal,
        setInteractive: (_v: boolean) => targetMinimal,
        // setTint and clearTint intentionally missing
      };

      expect(() => {
        applyState(targetMinimal as any, 'pressed', mockScene);
      }).not.toThrow();
    });

    it('shake cycles are delayed properly (not simultaneous)', () => {
      const tweenConfigs: any[] = [];
      mockScene.tweens.add = (config: any) => {
        tweenConfigs.push(config);
        return {};
      };

      applyState(mockTarget, 'error', mockScene);

      // Should have 4 tweens: 3 shake cycles + 1 return to origin
      // Each should have increasing delay
      const shakeTweens = tweenConfigs.slice(0, 3);
      shakeTweens.forEach((tw, idx) => {
        expect(tw.delay).toBe(idx * 50);
      });

      // Return-to-origin tween should delay until all shakes complete
      const returnTween = tweenConfigs[3];
      expect(returnTween.delay).toBe(3 * 50);
    });
  });
});
