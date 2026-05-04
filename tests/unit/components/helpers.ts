/**
 * Phaser mock factories and test utilities for component unit tests.
 * Reusable across all component test files following the patterns in
 * LevelCard.test.ts and SessionCompleteOverlay.test.ts.
 */

import { vi, expect } from 'vitest';

/**
 * Create a fluent-chaining Phaser GameObject mock.
 * Supports: setX, setY, setVisible, setAlpha, setDepth, destroy, on, setInteractive, etc.
 */
export function makeGameObject() {
  const go = {
    x: 0,
    y: 0,
    depth: 0,
    alpha: 1,
    scale: 1,
    visible: true,
    active: true,
    setDepth: vi.fn(function (this: unknown) {
      return this;
    }),
    setVisible: vi.fn(function (this: unknown) {
      return this;
    }),
    setAlpha: vi.fn(function (this: unknown) {
      return this;
    }),
    setX: vi.fn(function (this: unknown) {
      return this;
    }),
    setY: vi.fn(function (this: unknown) {
      return this;
    }),
    setPosition: vi.fn(function (this: unknown) {
      return this;
    }),
    setScale: vi.fn(function (this: unknown) {
      return this;
    }),
    destroy: vi.fn(),
    on: vi.fn(function (this: unknown) {
      return this;
    }),
    off: vi.fn(function (this: unknown) {
      return this;
    }),
    once: vi.fn(function (this: unknown) {
      return this;
    }),
    emit: vi.fn(function (this: unknown) {
      return this;
    }),
    setInteractive: vi.fn(function (this: unknown) {
      return this;
    }),
    disableInteractive: vi.fn(function (this: unknown) {
      return this;
    }),
    setStrokeStyle: vi.fn(function (this: unknown) {
      return this;
    }),
    setFillStyle: vi.fn(function (this: unknown) {
      return this;
    }),
  };
  return go as any;
}

/**
 * Create a Phaser Graphics GameObject mock for rendering shapes.
 */
export function makeGraphics() {
  const calls: Array<{ method: string; args: any[] }> = [];

  const graphics = {
    x: 0,
    y: 0,
    depth: 0,
    fillStyle: vi.fn(function (this: unknown, color: number) {
      calls.push({ method: 'fillStyle', args: [color] });
      return this;
    }),
    fillRect: vi.fn(function (this: unknown, x: number, y: number, w: number, h: number) {
      calls.push({ method: 'fillRect', args: [x, y, w, h] });
      return this;
    }),
    fillRoundedRect: vi.fn(function (
      this: unknown,
      x: number,
      y: number,
      w: number,
      h: number,
      r: number
    ) {
      calls.push({ method: 'fillRoundedRect', args: [x, y, w, h, r] });
      return this;
    }),
    lineStyle: vi.fn(function (this: unknown, width: number, color: number) {
      calls.push({ method: 'lineStyle', args: [width, color] });
      return this;
    }),
    strokePath: vi.fn(function (this: unknown) {
      calls.push({ method: 'strokePath', args: [] });
      return this;
    }),
    strokeRect: vi.fn(function (this: unknown, x: number, y: number, w: number, h: number) {
      calls.push({ method: 'strokeRect', args: [x, y, w, h] });
      return this;
    }),
    fillPath: vi.fn(function (this: unknown) {
      calls.push({ method: 'fillPath', args: [] });
      return this;
    }),
    beginPath: vi.fn(function (this: unknown) {
      calls.push({ method: 'beginPath', args: [] });
      return this;
    }),
    closePath: vi.fn(function (this: unknown) {
      calls.push({ method: 'closePath', args: [] });
      return this;
    }),
    moveTo: vi.fn(function (this: unknown, x: number, y: number) {
      calls.push({ method: 'moveTo', args: [x, y] });
      return this;
    }),
    lineTo: vi.fn(function (this: unknown, x: number, y: number) {
      calls.push({ method: 'lineTo', args: [x, y] });
      return this;
    }),
    clear: vi.fn(function (this: unknown) {
      calls.push({ method: 'clear', args: [] });
      calls.length = 0; // reset on clear
      return this;
    }),
    setDepth: vi.fn(function (this: unknown, _depth: number) {
      return this;
    }),
    setVisible: vi.fn(function (this: unknown, _visible: boolean) {
      return this;
    }),
    setAlpha: vi.fn(function (this: unknown, _alpha: number) {
      return this;
    }),
    destroy: vi.fn(),
    getCalls: () => [...calls], // for test introspection
  };

  return graphics as any;
}

/**
 * Create a Phaser Container mock (parent for grouped objects).
 */
export function makeContainer() {
  const container = {
    x: 0,
    y: 0,
    depth: 0,
    alpha: 1,
    list: [] as any[],
    add: vi.fn(function (this: { list: any[] }, child: any) {
      this.list.push(child);
      return this;
    }),
    remove: vi.fn(function (this: { list: any[] }, child: any) {
      const idx = this.list.indexOf(child);
      if (idx >= 0) this.list.splice(idx, 1);
      return this;
    }),
    removeAll: vi.fn(function (this: { list: any[] }) {
      this.list.length = 0;
      return this;
    }),
    setDepth: vi.fn(function (this: unknown) {
      return this;
    }),
    setVisible: vi.fn(function (this: unknown) {
      return this;
    }),
    setAlpha: vi.fn(function (this: unknown) {
      return this;
    }),
    setX: vi.fn(function (this: unknown) {
      return this;
    }),
    setY: vi.fn(function (this: unknown) {
      return this;
    }),
    setPosition: vi.fn(function (this: unknown) {
      return this;
    }),
    setScale: vi.fn(function (this: unknown) {
      return this;
    }),
    destroy: vi.fn(),
    on: vi.fn(function (this: unknown) {
      return this;
    }),
    off: vi.fn(function (this: unknown) {
      return this;
    }),
    setInteractive: vi.fn(function (this: unknown) {
      return this;
    }),
  };
  return container as any;
}

/**
 * Create a Phaser Scene stub with add.graphics, add.text, add.rectangle, etc.
 */
export function makeScene() {
  const scene = {
    add: {
      graphics: vi.fn(() => makeGraphics()),
      text: vi.fn(() => makeGameObject()),
      rectangle: vi.fn(() => makeGameObject()),
      existing: vi.fn((go: any) => go),
      container: vi.fn(() => makeContainer()),
      image: vi.fn(() => makeGameObject()),
      sprite: vi.fn(() => makeGameObject()),
    },
    tweens: {
      add: vi.fn(() => ({
        play: vi.fn(),
        stop: vi.fn(),
        destroy: vi.fn(),
      })),
      chain: vi.fn((config) => {
        if (config.tweens && config.tweens.length > 0) {
          const lastTween = config.tweens[config.tweens.length - 1];
          if (lastTween.onComplete) lastTween.onComplete();
        }
        if (config.onComplete) config.onComplete();
        return { stop: vi.fn(), destroy: vi.fn() };
      }),
      killTweensOf: vi.fn(),
    },
    physics: {
      add: {
        sprite: vi.fn(() => makeGameObject()),
      },
    },
    input: {
      on: vi.fn(),
      off: vi.fn(),
    },
    events: {
      once: vi.fn(),
      on: vi.fn(),
      off: vi.fn(),
      emit: vi.fn(),
    },
    keys: {},
    systems: {
      events: {
        once: vi.fn(),
        on: vi.fn(),
        off: vi.fn(),
        emit: vi.fn(),
      },
    },
  };
  return scene as any;
}

/**
 * Create a Text GameObject mock with update capability.
 */
export function makeText(initialText = '') {
  const text = {
    ...makeGameObject(),
    text: initialText,
    setText: vi.fn(function (this: { text: string }, t: string) {
      this.text = t;
      return this;
    }),
    setColor: vi.fn(function (this: unknown) {
      return this;
    }),
    setFontSize: vi.fn(function (this: unknown) {
      return this;
    }),
    setOrigin: vi.fn(function (this: unknown) {
      return this;
    }),
    setAlign: vi.fn(function (this: unknown) {
      return this;
    }),
  };
  return text as any;
}

/**
 * Builder: create a complete test scene with mocked add methods.
 */
export function createTestScene(options?: { graphics?: number; texts?: number }) {
  const scene = makeScene();

  if (options?.graphics) {
    const graphics: any[] = [];
    scene.add.graphics = vi.fn(() => {
      const g = makeGraphics();
      graphics.push(g);
      return g;
    });
    (scene as any)._graphics = graphics;
  }

  if (options?.texts) {
    const texts: any[] = [];
    scene.add.text = vi.fn(() => {
      const t = makeText();
      texts.push(t);
      return t;
    });
    (scene as any)._texts = texts;
  }

  return scene;
}

/**
 * Builder: assert that a mock was called with specific arguments.
 */
export function expectCall(mockFn: any, index: number, expectedArgs: any[]) {
  const actualCall = mockFn.mock.calls[index];
  expect(actualCall).toBeDefined();
  expect(actualCall).toEqual(expectedArgs);
}

/**
 * Builder: get all calls to a mocked function.
 */
export function getCalls(mockFn: any) {
  return mockFn.mock.calls;
}
