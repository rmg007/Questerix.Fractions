import './styles/index.css';
import * as Phaser from 'phaser';

// Swallow unhandled storage errors from third-party / sandboxed contexts
// (e.g. embedded preview iframes where IndexedDB and localStorage are blocked).
// The game continues in volatile mode per runtime-architecture.md §10.
window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason;
  const message = reason instanceof Error ? reason.message : String(reason ?? '');
  if (
    /storage is not allowed|UnknownError|NotAllowedError|QuotaExceededError/i.test(message)
  ) {
    console.warn('[main] Suppressed storage-restricted error:', message);
    event.preventDefault();
  }
});

// BootScene is owned by another agent at src/scenes/BootScene.ts.
// Loaded lazily so missing scene doesn't block startup.
async function boot(): Promise<void> {
  let scenes: Phaser.Types.Scenes.SceneType[] = [];

  try {
    // Registration order matters: first scene auto-starts, others are lookup-able by key.
    const { BootScene, PreloadScene, MenuScene, Level01Scene, LevelScene, SettingsScene } = await import('./scenes');
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
}

boot().catch((err: unknown) => {
  console.error('[main] Failed to boot Phaser:', err);
});
