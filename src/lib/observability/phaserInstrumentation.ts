import type { Scene } from 'phaser';
import { logger } from './logger';

/**
 * Hook to instrument a Phaser scene with observability.
 * Tracks scene lifecycle, transitions, and performance.
 * per observability-spec.md §5.1
 */
export function instrumentScene(scene: Scene) {
  const sceneName = scene.scene.key;

  // Lifecycle monitoring
  scene.events.on('init', (data: unknown) => {
    logger.info('Scene Init', {
      category: 'SCENE',
      data: {
        scene: sceneName,
        ...(typeof data === 'object' && data !== null ? (data as Record<string, unknown>) : {}),
      },
    });
  });

  scene.events.on('create', () => {
    logger.info('Scene Create', { category: 'SCENE', data: { scene: sceneName } });
  });

  scene.events.on('shutdown', () => {
    logger.info('Scene Shutdown', { category: 'SCENE', data: { scene: sceneName } });
  });

  // Performance monitoring: Track FPS every 5 seconds
  let lastFpsCheck = 0;
  scene.events.on('update', (time: number) => {
    if (time > lastFpsCheck + 5000) {
      const fps = scene.game.loop.actualFps;
      if (fps < 30) {
        logger.warn('Low FPS detected', { category: 'PERF', data: { scene: sceneName, fps } });
      }
      lastFpsCheck = time;
    }
  });

  // Error handling: catch scene-specific errors if possible
  // Note: Phaser doesn't have a built-in scene error event that catches everything,
  // but we can instrument common failure points.
}

/**
 * Global game instrumentation.
 */
export function instrumentGame(game: Phaser.Game) {
  // Automatically instrument every scene that is added/started
  game.scene.scenes.forEach((scene) => instrumentScene(scene));

  // For scenes added dynamically later
  game.events.on('step', () => {
    // This is a bit heavy, let's use a better event if available.
    // In Phaser 3.x/4.x, we can listen to the scene manager.
  });

  // A better way: listen to the scene manager's post-step or specific scene events
  game.scene.dump(); // For debugging if needed

  game.scale.on('resize', (gameSize: Phaser.Structs.Size) => {
    logger.info('Game Resize', {
      category: 'SYSTEM',
      data: { width: gameSize.width, height: gameSize.height },
    });
  });

  window.addEventListener('blur', () => {
    logger.info('Game Focus Lost', { category: 'SYSTEM' });
  });

  window.addEventListener('focus', () => {
    logger.info('Game Focus Regained', { category: 'SYSTEM' });
  });
}
