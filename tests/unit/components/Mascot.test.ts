/**
 * Unit tests for Mascot component — procedurally-drawn wizard character with state machine.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as Phaser from 'phaser';

// Mock Phaser
vi.mock('phaser', () => {
  class Container {
    scene: any;
    x: number;
    y: number;
    scaleY: number = 1;
    depth: number = 5;
    active: boolean = true;
    constructor(scene: any, x: number, y: number) {
      this.scene = scene;
      this.x = x;
      this.y = y;
    }
    add = vi.fn();
    remove = vi.fn();
    setDepth = vi.fn().mockReturnThis();
    setVisible = vi.fn().mockReturnThis();
    setAlpha = vi.fn().mockReturnThis();
    setScale = vi.fn().mockReturnThis();
    setAngle = vi.fn().mockReturnThis();
    setPosition = vi.fn().mockImplementation(function (this: any, x: number, y: number) {
      this.x = x;
      this.y = y;
    });
    destroy = vi.fn();
    setState(state: any) {
      return this;
    }
  }
  class Graphics {
    fillStyle = vi.fn().mockReturnThis();
    fillEllipse = vi.fn().mockReturnThis();
    fillCircle = vi.fn().mockReturnThis();
    fillTriangle = vi.fn().mockReturnThis();
    strokeTriangle = vi.fn().mockReturnThis();
    fillRect = vi.fn().mockReturnThis();
    strokeCircle = vi.fn().mockReturnThis();
    strokeEllipse = vi.fn().mockReturnThis();
    lineStyle = vi.fn().mockReturnThis();
    strokeRoundedRect = vi.fn().mockReturnThis();
    fillRoundedRect = vi.fn().mockReturnThis();
    setPosition = vi.fn().mockReturnThis();
    beginPath = vi.fn().mockReturnThis();
    moveTo = vi.fn().mockReturnThis();
    lineTo = vi.fn().mockReturnThis();
    closePath = vi.fn().mockReturnThis();
    strokePath = vi.fn().mockReturnThis();
    fillPath = vi.fn().mockReturnThis();
    arc = vi.fn().mockReturnThis();
    setAngle = vi.fn().mockReturnThis();
    setScale = vi.fn().mockReturnThis();
    setAlpha = vi.fn().mockReturnThis();
    setVisible = vi.fn().mockReturnThis();
    setDepth = vi.fn().mockReturnThis();
    destroy = vi.fn();
  }
  return {
    GameObjects: {
      Container,
      Graphics,
      Text: class {
        setAlpha = vi.fn().mockReturnThis();
        setOrigin = vi.fn().mockReturnThis();
        destroy = vi.fn();
      },
    },
    Scene: class {},
    Tweens: {
      Tween: class {
        stop = vi.fn();
      },
    },
  };
});

import { Mascot } from '../../../src/components/Mascot';
import { makeScene } from './helpers';

describe('Mascot', () => {
  let scene: any;

  beforeEach(() => {
    scene = makeScene();
    // Mock scene.time
    scene.time = {
      addEvent: vi.fn().mockImplementation((config) => {
        if (config.callback) config.callback.call(config.callbackScope);
        return { destroy: vi.fn() };
      }),
      delayedCall: vi.fn().mockImplementation((delay, callback) => {
        callback();
        return { remove: vi.fn() };
      }),
    };
    // Mock scene.add.existing
    scene.add.existing = vi.fn();
    // Mock scene.add.graphics
    scene.add.graphics = vi.fn().mockImplementation(() => new Phaser.GameObjects.Graphics());
    // Mock scene.add.container
    scene.add.container = vi.fn().mockImplementation((x, y) => {
      const c = new Phaser.GameObjects.Container(scene, x, y);
      return c;
    });
    // Mock scene.add.text
    scene.add.text = vi.fn().mockImplementation(() => ({
      width: 100,
      height: 20,
      setAlpha: vi.fn().mockReturnThis(),
      setOrigin: vi.fn().mockReturnThis(),
      destroy: vi.fn(),
    }));
    // Mock matchMedia for reduceMotion
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query) => ({
        matches: query === '(prefers-reduced-motion: reduce)' ? false : false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  });

  it('initializes at correct position', () => {
    const mascot = new Mascot(scene, 100, 200);
    expect(mascot.x).toBe(100);
    expect(mascot.y).toBe(200);
  });

  it('transitions state via setState', () => {
    const mascot = new Mascot(scene, 100, 100);
    mascot.setState('celebrate');
    expect(scene.tweens.chain).toHaveBeenCalled();
  });

  it('can show a speech bubble', () => {
    const mascot = new Mascot(scene, 100, 100);
    mascot.showSpeechBubble('Hello', 1000);
    expect(scene.add.container).toHaveBeenCalled();
  });

  it('can be destroyed cleanly', () => {
    const mascot = new Mascot(scene, 100, 100);
    expect(() => mascot.destroy()).not.toThrow();
  });

  it('resets idle timer', () => {
    const mascot = new Mascot(scene, 100, 100);
    mascot.startIdleTimer();
    expect(scene.time.addEvent).toHaveBeenCalled();
    mascot.resetIdleTimer();
    // Internal state check would be better but we've extracted the timer logic
  });
});
