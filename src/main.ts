import './styles/index.css';

// Swallow unhandled storage errors from third-party / sandboxed contexts
// (e.g. embedded preview iframes where IndexedDB and localStorage are blocked).
// The game continues in volatile mode per runtime-architecture.md §10.
window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason;
  const message = reason instanceof Error ? reason.message : String(reason ?? '');
  if (/storage is not allowed|UnknownError|NotAllowedError|QuotaExceededError/i.test(message)) {
    console.warn('[main] Suppressed storage-restricted error:', message);
    event.preventDefault();
  }
});

/**
 * Hide the HTML splash screen once the Phaser canvas is mounted.
 * The splash gives the browser something to paint as LCP target while
 * Phaser (1.3 MB raw / 351 KB gz) loads in a separate chunk.
 */
function hideSplash(): void {
  const splash = document.getElementById('splash');
  if (!splash) return;
  splash.style.opacity = '0';
  splash.style.transition = 'opacity 0.25s ease-out';
  // Remove after fade completes so it doesn't intercept clicks
  setTimeout(() => splash.remove(), 300);
}

async function boot(): Promise<void> {
  // Phaser is dynamically imported so the entry chunk stays tiny and the
  // HTML splash can paint immediately. Phaser lives in its own bundle chunk
  // (see vite.config.ts manualChunks) so this download is parallelisable.
  const Phaser = await import('phaser');

  let scenes: import('phaser').Types.Scenes.SceneType[] = [];

  try {
    const { BootScene, PreloadScene, MenuScene, Level01Scene, LevelScene, SettingsScene } =
      await import('./scenes');
    scenes = [BootScene, PreloadScene, MenuScene, Level01Scene, LevelScene, SettingsScene];
  } catch (err) {
    console.error('[main] Failed to load scenes:', err);
  }

  const config: import('phaser').Types.Core.GameConfig = {
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

  const game = new Phaser.Game(config);

  // Hide splash on the first rendered frame (boot scene + canvas are up)
  game.events.once('ready', hideSplash);
  // Safety net: also hide after 3s in case 'ready' never fires
  setTimeout(hideSplash, 3000);

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
  // If Phaser fails to load, leave the splash up so the user sees something
});
