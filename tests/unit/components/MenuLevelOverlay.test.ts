/**
 * MenuLevelOverlay smoke test — verifies that the class can be instantiated
 * with a mocked scene and that close() is idempotent before any open() call.
 *
 * The overlay's full open()/render flow is exercised by the existing menu
 * E2E flow (overlay-card-LN test hooks). Per refactor-god-objects-2026-05-01.md
 * Phaser-touching extractions can skip unit tests but the orchestrator must
 * be exercised by an E2E or integration test — both apply here.
 */

import { describe, it, expect, vi } from 'vitest';

vi.mock('phaser', () => {
  class Scene {}
  return {
    Scene,
    GameObjects: { Container: class {}, Text: class {}, Rectangle: class {}, Graphics: class {} },
    default: { Scene },
  };
});

import { MenuLevelOverlay } from '@/components/MenuLevelOverlay';

function makeMockScene(): { scene: { isActive: () => boolean } } {
  return {
    scene: {
      isActive: () => true,
    },
  };
}

describe('MenuLevelOverlay', () => {
  it('instantiates with valid deps', () => {
    const overlay = new MenuLevelOverlay({
      scene: makeMockScene() as never,
      getStudentId: () => null,
      onSelectLevel: () => undefined,
      onOpenMap: () => undefined,
    });
    expect(overlay).toBeInstanceOf(MenuLevelOverlay);
  });

  it('close() is a no-op when nothing has been rendered', () => {
    const overlay = new MenuLevelOverlay({
      scene: makeMockScene() as never,
      getStudentId: () => null,
      onSelectLevel: () => undefined,
      onOpenMap: () => undefined,
    });
    expect(() => overlay.close()).not.toThrow();
    // Calling close twice should still not throw.
    expect(() => overlay.close()).not.toThrow();
  });
});
