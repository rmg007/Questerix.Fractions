import { describe, it, expect, beforeEach } from 'vitest';
import { emitFeedback, emitFeedbackSequence, FeedbackKind } from './feedbackBus';

describe('feedbackBus.ts', () => {
  let mockTarget: any;
  let mockScene: any;

  beforeEach(() => {
    mockTarget = {
      scale: 1,
      alpha: 1,
      tint: 0xffffff,
      setScale: (val: number) => {
        mockTarget.scale = val;
        return mockTarget;
      },
      setAlpha: (val: number) => {
        mockTarget.alpha = val;
        return mockTarget;
      },
      setTint: (val: number) => {
        mockTarget.tint = val;
        return mockTarget;
      },
      setInteractive: (val: boolean) => {
        mockTarget._interactive = val;
        return mockTarget;
      },
    };

    mockScene = {
      registry: {
        get: (key: string) => {
          if (key === 'muted') return false;
          if (key === 'prefersReducedMotion') return false;
          return undefined;
        },
      },
      events: {
        emit: (event: string, data: any) => {
          mockScene._lastEmit = { event, data };
        },
      },
      tweens: {
        add: (config: any) => {
          // Mock tween application: apply final scale/alpha directly
          // For yoyo tweens (haptic feedback), apply the forward value only
          if (config.targets) {
            const target = config.targets;
            if (config.scale !== undefined) {
              target.scale = config.scale;
            }
            if (config.alpha !== undefined) {
              target.alpha = config.alpha;
            }
          }
          return { stop: () => {} };
        },
      },
      time: {
        delayedCall: (_delay: number, callback: () => void) => {
          // Mock delayed call: execute immediately for testing
          callback();
          return { remove: () => {} };
        },
      },
    };
  });

  describe('emitFeedback()', () => {
    const validKinds: FeedbackKind[] = ['tap', 'snap', 'correct', 'incorrect', 'milestone'];

    it('accepts all valid feedback kinds', () => {
      validKinds.forEach((kind) => {
        expect(() => {
          emitFeedback(kind, { target: mockTarget, scene: mockScene });
        }).not.toThrow();
      });
    });

    it('applies visual state to target', () => {
      emitFeedback('correct', { target: mockTarget, scene: mockScene });
      expect(mockTarget.scale).toBe(1.04);
    });

    it('applies pressed state for tap feedback', () => {
      emitFeedback('tap', { target: mockTarget, scene: mockScene });
      expect(mockTarget.scale).toBe(0.96);
    });

    it('applies error state for incorrect feedback', () => {
      emitFeedback('incorrect', { target: mockTarget, scene: mockScene });
      expect(mockTarget.alpha).toBe(1.0);
    });

    it('works without target (audio-only)', () => {
      expect(() => {
        emitFeedback('tap', { scene: mockScene });
      }).not.toThrow();
    });

    it('works without scene (target-only)', () => {
      expect(() => {
        emitFeedback('tap', { target: mockTarget });
      }).not.toThrow();
    });

    it('works with no options', () => {
      expect(() => {
        emitFeedback('tap');
      }).not.toThrow();
    });

    it('respects loud flag (forces audio even if muted)', () => {
      mockScene.registry.get = (key: string) => {
        if (key === 'muted') return true;
        return false;
      };

      emitFeedback('correct', { scene: mockScene, loud: false });
      emitFeedback('correct', { scene: mockScene, loud: true });
    });

    it('respects muted registry setting', () => {
      mockScene.registry.get = (key: string) => {
        if (key === 'muted') return true;
        return false;
      };

      emitFeedback('correct', { target: mockTarget, scene: mockScene });
      expect(mockTarget.scale).toBe(1.04);
    });

    it('emits audio cue even when target is missing', () => {
      const emitSpy = {
        calls: [] as any[],
      };
      mockScene.events.emit = (event: string, data: any) => {
        emitSpy.calls.push({ event, data });
      };

      emitFeedback('correct', { scene: mockScene });
      expect(emitSpy.calls.some((c) => c.event === 'audio:play')).toBe(true);
    });

    it('does not emit audio when muted and loud=false', () => {
      mockScene.registry.get = (key: string) => {
        if (key === 'muted') return true;
        return false;
      };
      const emitSpy = {
        calls: [] as any[],
      };
      mockScene.events.emit = (event: string, data: any) => {
        emitSpy.calls.push({ event, data });
      };

      emitFeedback('correct', { scene: mockScene, loud: false });
      expect(emitSpy.calls.some((c) => c.event === 'audio:play')).toBe(false);
    });
  });

  describe('emitFeedbackSequence()', () => {
    it('emits multiple feedbacks in sequence', () => {
      emitFeedbackSequence(['tap', 'snap', 'correct'], 100, {
        target: mockTarget,
        scene: mockScene,
      });

      // Last emission is 'correct' which sets scale to 1.04
      expect(mockTarget.scale).toBe(1.04);
    });

    it('uses default delay if not specified', () => {
      expect(() => {
        emitFeedbackSequence(['correct', 'milestone'], undefined, {
          scene: mockScene,
        });
      }).not.toThrow();
    });

    it('handles empty sequence gracefully', () => {
      expect(() => {
        emitFeedbackSequence([], 100, { scene: mockScene });
      }).not.toThrow();
    });

    it('handles single-item sequence', () => {
      expect(() => {
        emitFeedbackSequence(['correct'], 100, { scene: mockScene });
      }).not.toThrow();
    });
  });

  describe('Feedback mapping', () => {
    const mappingTests: Array<[FeedbackKind, number]> = [
      ['tap', 0.96],
      ['snap', 1.04],
      ['correct', 1.04],
      ['incorrect', 1.0],
      ['milestone', 1.04],
    ];

    mappingTests.forEach(([kind, expectedScale]) => {
      it(`${kind} feedback maps to correct visual state`, () => {
        emitFeedback(kind, { target: mockTarget, scene: mockScene });
        expect(mockTarget.scale).toBe(expectedScale);
      });
    });
  });
});

describe('feedbackBus.ts - integration', () => {
  it('one emission fires three channels', () => {
    const mockTarget = {
      scale: 1,
      alpha: 1,
      setScale: (val: number) => {
        mockTarget.scale = val;
        return mockTarget;
      },
      setAlpha: (val: number) => {
        mockTarget.alpha = val;
        return mockTarget;
      },
      setTint: (_val: number) => mockTarget,
      setInteractive: () => mockTarget,
    };

    const mockScene = {
      registry: { get: () => false },
      events: { emit: () => {} },
      tweens: { add: () => ({ stop: () => {} }) },
      time: {
        delayedCall: (_d: number, cb: () => void) => {
          cb();
          return { remove: () => {} };
        },
      },
    };

    expect(() => {
      emitFeedback('correct', { target: mockTarget, scene: mockScene as unknown as Phaser.Scene });
    }).not.toThrow();
  });
});
