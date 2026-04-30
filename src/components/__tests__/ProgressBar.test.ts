/**
 * ProgressBar unit tests — star icons, aria attrs, and bounce tween.
 * Phaser is stubbed; each star gets its own vi.fn() spies for per-star assertions.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockTweensAdd = vi.fn();
const mockAddExisting = vi.fn();
const mockSetDepth = vi.fn().mockReturnThis();
const mockContainerAdd = vi.fn().mockReturnThis();

// Each star gets its own spy functions so per-star assertions are unambiguous.
const makeStarInstance = () => ({
  setOrigin: vi.fn().mockReturnThis(),
  setColor: vi.fn().mockReturnThis(),
  setScale: vi.fn().mockReturnThis(),
  setText: vi.fn().mockReturnThis(),
  text: '',
  style: { color: '' },
});

const mockAddText = vi.fn(() => makeStarInstance());

vi.mock('phaser', () => {
  class Container {
    scene: unknown;
    constructor(scene: unknown, _x: number, _y: number) {
      this.scene = scene;
    }
    add = mockContainerAdd;
    setDepth = mockSetDepth;
  }
  class Text {}
  class Scene {
    add = { text: mockAddText, existing: mockAddExisting };
    tweens = { add: mockTweensAdd };
  }
  return {
    default: { Scene, GameObjects: { Container, Text } },
    Scene,
    GameObjects: { Container, Text },
  };
});

let sentinelEl: HTMLElement;

vi.mock('@/scenes/utils/TestHooks', () => ({
  TestHooks: {
    mountSentinel: vi.fn(() => {
      sentinelEl = document.createElement('div');
      return sentinelEl;
    }),
    setAriaValueNow: vi.fn((_, n: number) => {
      sentinelEl?.setAttribute('aria-valuenow', String(n));
    }),
    get: vi.fn(() => sentinelEl),
  },
}));

vi.mock('@/scenes/utils/levelTheme', () => ({ TITLE_FONT: 'Arial' }));

import { ProgressBar } from '../ProgressBar';

function makePhaserScene() {
  return {
    add: { text: mockAddText, existing: mockAddExisting },
    tweens: { add: mockTweensAdd },
  } as unknown as import('phaser').Scene;
}

function buildBar(goal = 5) {
  const scene = makePhaserScene();
  const stars: ReturnType<typeof makeStarInstance>[] = [];
  mockAddText.mockImplementation(() => {
    const s = makeStarInstance();
    stars.push(s);
    return s;
  });
  const bar = new ProgressBar({ scene, x: 0, y: 0, width: 500, goal });
  return { bar, stars, scene };
}

describe('ProgressBar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockReturnValue({ matches: false }),
    });
  });

  describe('construction', () => {
    it('creates exactly 5 star text objects by default', () => {
      buildBar();
      expect(mockAddText).toHaveBeenCalledTimes(5);
    });

    it('creates the number of stars equal to the supplied goal', () => {
      buildBar(3);
      expect(mockAddText).toHaveBeenCalledTimes(3);
    });

    it('mounts the aria sentinel with role=progressbar', () => {
      buildBar();
      expect(sentinelEl.getAttribute('role')).toBe('progressbar');
    });

    it('sets aria-valuenow to 0 on the sentinel at construction', () => {
      buildBar();
      expect(sentinelEl.getAttribute('aria-valuenow')).toBe('0');
    });

    it('sets aria-valuemax to the goal on the sentinel', () => {
      buildBar(5);
      expect(sentinelEl.getAttribute('aria-valuemax')).toBe('5');
    });
  });

  describe('setProgress — filled/empty star state', () => {
    it('marks the first N stars as filled (★) and the rest as empty (☆)', () => {
      const { bar, stars } = buildBar(5);
      bar.setProgress(3);

      expect(stars[0].setText).toHaveBeenLastCalledWith('★');
      expect(stars[1].setText).toHaveBeenLastCalledWith('★');
      expect(stars[2].setText).toHaveBeenLastCalledWith('★');
      expect(stars[3].setText).toHaveBeenLastCalledWith('☆');
      expect(stars[4].setText).toHaveBeenLastCalledWith('☆');
    });

    it('sets the filled colour on filled stars and dim colour on empty stars', () => {
      const { bar, stars } = buildBar(5);
      bar.setProgress(2);

      expect(stars[0].setColor).toHaveBeenLastCalledWith('#F59E0B');
      expect(stars[1].setColor).toHaveBeenLastCalledWith('#F59E0B');
      expect(stars[2].setColor).toHaveBeenLastCalledWith('#D1D5DB');
    });

    it('exposes the correct value via the .value getter', () => {
      const { bar } = buildBar(5);
      bar.setProgress(4);
      expect(bar.value).toBe(4);
    });

    it('clamps to goal when value exceeds goal', () => {
      const { bar } = buildBar(5);
      bar.setProgress(99);
      expect(bar.value).toBe(5);
    });

    it('clamps to 0 when a negative value is supplied', () => {
      const { bar } = buildBar(5);
      bar.setProgress(-3);
      expect(bar.value).toBe(0);
    });
  });

  describe('aria-valuenow updates', () => {
    it('updates aria-valuenow on the sentinel after setProgress', () => {
      const { bar } = buildBar(5);
      bar.setProgress(2);
      expect(sentinelEl.getAttribute('aria-valuenow')).toBe('2');
    });

    it('updates aria-label to reflect current progress', () => {
      const { bar } = buildBar(5);
      bar.setProgress(3);
      expect(sentinelEl.getAttribute('aria-label')).toBe(
        'Progress: 3 of 5 questions correct'
      );
    });
  });

  describe('bounce tween', () => {
    it('fires a tween for the newly filled star under normal motion', () => {
      const { bar, stars } = buildBar(5);
      // prev=0, setProgress(1) → index 0 is newly filled (i === prev === 0)
      bar.setProgress(1);

      expect(stars[0].setScale).toHaveBeenCalledWith(1.4);
      expect(mockTweensAdd).toHaveBeenCalledWith(
        expect.objectContaining({ targets: stars[0], scale: 1, duration: 280 })
      );
    });

    it('does not scale any star to 1.4 when prefers-reduced-motion is true', () => {
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockReturnValue({ matches: true }),
      });

      const { bar, stars } = buildBar(5);
      bar.setProgress(1);

      expect(mockTweensAdd).not.toHaveBeenCalled();
      for (const star of stars) {
        expect(star.setScale).not.toHaveBeenCalledWith(1.4);
      }
    });
  });

  describe('isComplete', () => {
    it('returns false while progress is below goal', () => {
      const { bar } = buildBar(5);
      bar.setProgress(4);
      expect(bar.isComplete).toBe(false);
    });

    it('returns true when progress equals the goal', () => {
      const { bar } = buildBar(5);
      bar.setProgress(5);
      expect(bar.isComplete).toBe(true);
    });
  });
});
