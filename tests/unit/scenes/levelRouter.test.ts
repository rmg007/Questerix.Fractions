/**
 * Unit tests for the validator-variant registry in levelRouter.
 *
 * Covers:
 *   1. The default archetype factory path (no validatorId).
 *   2. The pre-registered `validator.order.withRuleExplanation` variant
 *      dispatches to ExplainYourOrderInteraction.
 *   3. A synthetic variant added at runtime via registerValidatorVariant
 *      is dispatched to its custom factory.
 *   4. A validatorId whose archetype mismatches falls through to the
 *      archetype default (defensive guard).
 *   5. Unknown archetype rejects with a descriptive error.
 *
 * Per PLANS/code-quality-2026-05-01.md Phase 8.3 (OCP).
 *
 * Phaser is mocked because the Interaction constructors `new` Phaser
 * GameObjects on instantiation.
 */

import { describe, it, expect, vi, afterEach } from 'vitest';

// ── Phaser mock (mirrors LevelScene.smoke.test.ts) ────────────────────────
vi.mock('phaser', () => {
  class GameObject {
    setInteractive() {
      return this;
    }
    on() {
      return this;
    }
    setDepth() {
      return this;
    }
    setAlpha() {
      return this;
    }
    setStrokeStyle() {
      return this;
    }
    setFillStyle() {
      return this;
    }
    destroy() {
      return;
    }
  }
  class Scene {}
  class Container extends GameObject {}
  class Rectangle extends GameObject {
    width = 0;
    height = 0;
    x = 0;
    y = 0;
    setSize() {
      return this;
    }
    setPosition() {
      return this;
    }
    static Contains() {
      return false;
    }
  }
  class Text extends GameObject {}
  class Graphics extends GameObject {
    fillRectShape() {
      return this;
    }
    lineStyle() {
      return this;
    }
    strokeRect() {
      return this;
    }
    fillStyle() {
      return this;
    }
    fillRect() {
      return this;
    }
    clear() {
      return this;
    }
  }
  class Image extends GameObject {}
  return {
    Scene,
    GameObjects: { Container, Rectangle, Text, Graphics, Image, GameObject },
    Geom: {
      Rectangle: { Contains: () => false, clone: (r: unknown) => r },
    },
    Math: {
      Clamp: (v: number, min: number, max: number) => Math.min(Math.max(v, min), max),
    },
    Input: {
      Events: {
        DRAG_START: 'dragstart',
        DRAG: 'drag',
        DRAG_END: 'dragend',
        POINTER_DOWN: 'pointerdown',
        POINTER_UP: 'pointerup',
      },
      Keyboard: { KeyCodes: { SPACE: 32, ENTER: 13, LEFT: 37, RIGHT: 39 } },
    },
    default: { Scene },
  };
});

// ── Imports (after vi.mock hoisting) ─────────────────────────────────────
import {
  getInteractionForArchetype,
  registerValidatorVariant,
  unregisterValidatorVariant,
} from '@/scenes/utils/levelRouter';
import { OrderInteraction } from '@/scenes/interactions/OrderInteraction';
import { ExplainYourOrderInteraction } from '@/scenes/interactions/ExplainYourOrderInteraction';
import { CompareInteraction } from '@/scenes/interactions/CompareInteraction';
import type { ArchetypeId } from '@/types/archetype';
import type { Interaction } from '@/scenes/interactions/types';

describe('getInteractionForArchetype — default factory dispatch', () => {
  it('returns the archetype default when no validatorId is supplied', async () => {
    const interaction = await getInteractionForArchetype('order');
    expect(interaction).toBeInstanceOf(OrderInteraction);
  });

  it('returns the archetype default when validatorId is unknown', async () => {
    const interaction = await getInteractionForArchetype('order', 'validator.order.unknown');
    expect(interaction).toBeInstanceOf(OrderInteraction);
  });

  it('rejects with a descriptive error for an unregistered archetype', async () => {
    await expect(
      getInteractionForArchetype('not_a_real_archetype' as unknown as ArchetypeId)
    ).rejects.toThrow(/No interaction registered/);
  });
});

describe('getInteractionForArchetype — pre-registered variant', () => {
  it('dispatches validator.order.withRuleExplanation → ExplainYourOrderInteraction', async () => {
    const interaction = await getInteractionForArchetype(
      'order',
      'validator.order.withRuleExplanation'
    );
    expect(interaction).toBeInstanceOf(ExplainYourOrderInteraction);
  });

  it('does NOT dispatch the variant if the archetype mismatches', async () => {
    // Defensive: the variant entry pins archetype = 'order'. A caller passing
    // 'compare' with the order-variant validatorId must fall through to the
    // compare default rather than silently swap interactions.
    const interaction = await getInteractionForArchetype(
      'compare',
      'validator.order.withRuleExplanation'
    );
    expect(interaction).toBeInstanceOf(CompareInteraction);
  });
});

describe('registerValidatorVariant — runtime extension', () => {
  const SYNTHETIC_ID = 'validator.test.synthetic';

  afterEach(() => {
    unregisterValidatorVariant(SYNTHETIC_ID);
  });

  it('dispatches to a freshly-registered variant factory', async () => {
    class StubInteraction implements Interaction {
      archetype: ArchetypeId = 'compare';
      mount(): void {}
      unmount(): void {}
    }

    let factoryCalls = 0;
    registerValidatorVariant(SYNTHETIC_ID, {
      archetype: 'compare',
      factory: async () => {
        factoryCalls++;
        return new StubInteraction();
      },
    });

    const interaction = await getInteractionForArchetype('compare', SYNTHETIC_ID);
    expect(interaction).toBeInstanceOf(StubInteraction);
    expect(factoryCalls).toBe(1);
  });

  it('after unregister, falls back to the archetype default', async () => {
    class StubInteraction implements Interaction {
      archetype: ArchetypeId = 'compare';
      mount(): void {}
      unmount(): void {}
    }

    registerValidatorVariant(SYNTHETIC_ID, {
      archetype: 'compare',
      factory: async () => new StubInteraction(),
    });
    unregisterValidatorVariant(SYNTHETIC_ID);

    const interaction = await getInteractionForArchetype('compare', SYNTHETIC_ID);
    expect(interaction).toBeInstanceOf(CompareInteraction);
  });
});
