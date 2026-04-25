/**
 * Minimal setup for pure-function engine tests.
 * No Dexie / fake-indexeddb needed — engine layer has zero storage deps.
 * Phaser stub still required because tsconfig includes it via @/types chains.
 */
import { vi } from 'vitest';

// Mock matchMedia (jsdom stub)
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((q: string) => ({
    matches: false,
    media: q,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Minimal Phaser global stub
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any)['Phaser'] = {
  AUTO: 0,
  WEBGL: 1,
  CANVAS: 2,
  Scale: { FIT: 0, NONE: 0, CENTER_BOTH: 0 },
  Math: {
    Clamp: (v: number, min: number, max: number) => Math.max(min, Math.min(max, v)),
  },
};
