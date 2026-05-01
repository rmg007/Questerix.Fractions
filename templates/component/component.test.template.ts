// TODO: scaffolded by npm run scaffold:component. Replace stubs and remove this comment.
/**
 * __NAME__ — unit tests.
 *
 * Phaser is mocked so the test exercises just the component's contract:
 * - registers an A11yLayer action on mount
 * - removes that action on destroy
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockMountAction = vi.fn();
const mockUnmount = vi.fn();

vi.mock('../A11yLayer', () => ({
  A11yLayer: {
    mountAction: (...args: unknown[]) => mockMountAction(...args),
    unmount: (...args: unknown[]) => mockUnmount(...args),
  },
}));

vi.mock('phaser', () => {
  class Container {
    scene: unknown;
    constructor(scene: unknown, _x: number, _y: number) {
      this.scene = scene;
    }
    setDepth() {
      return this;
    }
    destroy(_fromScene?: boolean) {
      // base no-op so subclass `super.destroy()` resolves
    }
  }
  class Scene {
    add = { existing: vi.fn() };
  }
  return {
    default: { Scene, GameObjects: { Container } },
    Scene,
    GameObjects: { Container },
  };
});

import { __NAME__ } from '../__NAME__';

function makeScene(): import('phaser').Scene {
  return { add: { existing: vi.fn() } } as unknown as import('phaser').Scene;
}

describe('__NAME__', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('registers an A11yLayer action on construction', () => {
    new __NAME__({ scene: makeScene(), x: 0, y: 0, label: 'Test action' });
    expect(mockMountAction).toHaveBeenCalledTimes(1);
    expect(mockMountAction).toHaveBeenCalledWith(
      expect.stringContaining('__NAME__'),
      'Test action',
      expect.any(Function)
    );
  });

  it('unregisters the A11yLayer action on destroy', () => {
    const c = new __NAME__({ scene: makeScene(), x: 0, y: 0 });
    c.destroy();
    expect(mockUnmount).toHaveBeenCalledTimes(1);
  });
});
