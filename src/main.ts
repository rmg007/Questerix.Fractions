import './styles/index.css';
import * as Phaser from 'phaser';
import { log } from './lib/log';

// Global error sink — catches synchronous exceptions in Phaser callbacks
// and routes through the structured logger (C4b.1 audit Phase 1 fix).
window.addEventListener('error', (event) => {
  log.error('MAIN', 'uncaught_error', {
    message: event.message,
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
    stack: event.error instanceof Error ? event.error.stack : undefined,
  });
});

// Route storage-rejection errors through logger instead of silently dropping.
// App continues in volatile mode per runtime-architecture.md §10.
window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason;
  const message = reason instanceof Error ? reason.message : String(reason ?? '');
  if (/storage is not allowed|UnknownError|NotAllowedError|QuotaExceededError/i.test(message)) {
    log.warn('MAIN', 'storage_error_suppressed', { message });
    event.preventDefault();
  } else {
    log.error('MAIN', 'unhandled_rejection', {
      message,
      stack: reason instanceof Error ? reason.stack : undefined,
    });
  }
});

// BootScene is owned by another agent at src/scenes/BootScene.ts.
// Loaded lazily so missing scene doesn't block startup.
async function boot(): Promise<void> {
  let scenes: Phaser.Types.Scenes.SceneType[] = [];

  try {
    // Registration order matters: first scene auto-starts, others are lookup-able by key.
    const { BootScene, PreloadScene, MenuScene, Level01Scene, LevelScene, SettingsScene } =
      await import('./scenes');
    scenes = [BootScene, PreloadScene, MenuScene, Level01Scene, LevelScene, SettingsScene];
  } catch (err) {
    console.error('[main] Failed to load scenes:', err);
  }

  const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    parent: 'app',
    // Logical resolution per design-language §8.2 (portrait-tall reference)
    width: 800,
    height: 1280,
    backgroundColor: '#FFFFFF',
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    scene: scenes,
  };

  new Phaser.Game(config);

  // Request persistent storage for IndexedDB (per C5 / PWA requirements)
  if (navigator.storage?.persist) {
    navigator.storage.persist().catch(() => {
      // User may deny persistent storage; app continues in volatile mode
      console.warn('[main] Persistent storage not granted');
    });
  }
}

boot().catch((err: unknown) => {
  console.error('[main] Failed to boot Phaser:', err);
});
