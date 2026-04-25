import 'fake-indexeddb/auto';
import { vi } from 'vitest';

// Mock matchMedia for prefers-reduced-motion (per accessibility.md §4)
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

// Mock storage.persist — app calls this on boot (per test-strategy.md §1.2)
Object.defineProperty(navigator, 'storage', {
  value: {
    persist: vi.fn().mockResolvedValue(true),
    persisted: vi.fn().mockResolvedValue(true),
  },
  configurable: true,
});

// Minimal Phaser global stub — jsdom has no WebGL
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any)['Phaser'] = {
  AUTO: 0,
  WEBGL: 1,
  CANVAS: 2,
  Scale: {
    FIT: 0,
    NONE: 0,
    CENTER_BOTH: 0,
  },
  Math: {
    Clamp: (v: number, min: number, max: number) => Math.max(min, Math.min(max, v)),
  },
};
