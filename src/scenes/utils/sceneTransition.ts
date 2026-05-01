/**
 * sceneTransition — thin wrapper around Phaser camera fades for scene changes.
 * Adds a 300ms black fade-out before every scene.start() call, with
 * prefers-reduced-motion fallback (instant cut, no tween).
 * per design-language.md §6.4 (reduced motion), task-25 implementation notes.
 */

import * as Phaser from 'phaser';
import { checkReduceMotion } from '../../lib/preferences';

/**
 * Fade the current scene to black then start `key` with optional `data`.
 * If prefers-reduced-motion, performs an instant cut with no animation.
 */
export function fadeAndStart(scene: Phaser.Scene, key: string, data?: object): void {
  if (checkReduceMotion()) {
    scene.scene.start(key, data);
    return;
  }
  scene.cameras.main.fadeOut(300, 0, 0, 0);
  scene.cameras.main.once('camerafadeoutcomplete', () => {
    scene.scene.start(key, data);
  });
}
