/**
 * sceneTransition unit tests — fadeAndStart fade timing and reduced-motion fallback.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('phaser', () => {
  class Scene {}
  return { default: { Scene }, Scene };
});

function makeMockScene() {
  const fadeOut = vi.fn();
  const once = vi.fn();
  const sceneStart = vi.fn();
  const scene = {
    cameras: { main: { fadeOut, once } },
    scene: { start: sceneStart },
  } as unknown as import('phaser').Scene;
  return { scene, fadeOut, once, sceneStart };
}

function setReduceMotion(active: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockReturnValue({ matches: active }),
  });
}

import { fadeAndStart } from '@/scenes/utils/sceneTransition';

describe('fadeAndStart', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setReduceMotion(false);
  });

  describe('standard transition (motion allowed)', () => {
    it('calls camera.fadeOut with 300 ms and pure black', () => {
      const { scene, fadeOut } = makeMockScene();
      fadeAndStart(scene, 'GameScene');
      expect(fadeOut).toHaveBeenCalledOnce();
      expect(fadeOut).toHaveBeenCalledWith(300, 0, 0, 0);
    });

    it('registers a camerafadeoutcomplete listener', () => {
      const { scene, once } = makeMockScene();
      fadeAndStart(scene, 'GameScene');
      expect(once).toHaveBeenCalledOnce();
      expect(once).toHaveBeenCalledWith('camerafadeoutcomplete', expect.any(Function));
    });

    it('does NOT call scene.start before the fade completes', () => {
      const { scene, sceneStart } = makeMockScene();
      fadeAndStart(scene, 'GameScene');
      expect(sceneStart).not.toHaveBeenCalled();
    });

    it('calls scene.start with the correct key when the fade completes', () => {
      const { scene, once, sceneStart } = makeMockScene();
      fadeAndStart(scene, 'GameScene');

      const callback = once.mock.calls[0][1] as () => void;
      callback();

      expect(sceneStart).toHaveBeenCalledOnce();
      expect(sceneStart).toHaveBeenCalledWith('GameScene', undefined);
    });

    it('forwards optional data to scene.start via the fade-complete callback', () => {
      const { scene, once, sceneStart } = makeMockScene();
      const data = { level: 3 };
      fadeAndStart(scene, 'LevelScene', data);

      const callback = once.mock.calls[0][1] as () => void;
      callback();

      expect(sceneStart).toHaveBeenCalledWith('LevelScene', data);
    });
  });

  describe('reduced-motion transition', () => {
    beforeEach(() => setReduceMotion(true));

    it('calls scene.start immediately without any fade', () => {
      const { scene, fadeOut, sceneStart } = makeMockScene();
      fadeAndStart(scene, 'MenuScene');

      expect(fadeOut).not.toHaveBeenCalled();
      expect(sceneStart).toHaveBeenCalledOnce();
      expect(sceneStart).toHaveBeenCalledWith('MenuScene', undefined);
    });

    it('does not register a camerafadeoutcomplete listener', () => {
      const { scene, once } = makeMockScene();
      fadeAndStart(scene, 'MenuScene');
      expect(once).not.toHaveBeenCalled();
    });

    it('forwards optional data to scene.start immediately', () => {
      const { scene, sceneStart } = makeMockScene();
      const data = { level: 1 };
      fadeAndStart(scene, 'LevelScene', data);
      expect(sceneStart).toHaveBeenCalledWith('LevelScene', data);
    });
  });
});
