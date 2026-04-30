import './styles/index.css';
// Side-effect import: registers Quest microcopy in the typed i18n catalog.
// Per ux-elevation §9 T28 — keys must be available before any scene calls
// catalog.get('quest.…'). registerCatalog is HMR-safe (idempotent on
// deep-equal content), so re-evaluation under Vite hot reload is fine.
import './lib/i18n/keys/quest';
import { initObservability, errorReporter } from './lib/observability';
import { deviceMetaRepo } from './persistence/repositories/deviceMeta';
// Side-effect import: registers Quest microcopy in the typed i18n catalog.
// Per ux-elevation §9 T28 — keys must be available before any scene calls
// catalog.get('quest.…'). registerCatalog is HMR-safe (idempotent on
// deep-equal content), so re-evaluation under Vite hot reload is fine.
import './lib/i18n/keys/quest';

// Swallow unhandled storage errors from third-party / sandboxed contexts
// (e.g. embedded preview iframes where IndexedDB and localStorage are blocked).
// The game continues in volatile mode per runtime-architecture.md §10.
window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason;
  const message = reason instanceof Error ? reason.message : String(reason ?? '');
  if (/storage is not allowed|UnknownError|NotAllowedError|QuotaExceededError/i.test(message)) {
    console.warn('[main] Suppressed storage-restricted error:', message);
    event.preventDefault();
  } else if (reason instanceof Error) {
    errorReporter.report(reason, { source: 'unhandledrejection' });
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
  // 1. Load preferences to check telemetry consent
  const meta = await deviceMetaRepo.get();
  
  // 2. Initialize observability ASAP (non-fatal: SDK version mismatches must not block boot)
  try {
    initObservability({
      telemetryConsent: meta.preferences.telemetryConsent,
      sentryDsn: import.meta.env.VITE_SENTRY_DSN,
    });
  } catch (err) {
    console.warn('[main] Observability init failed — continuing without telemetry:', err);
  }

  // Phaser is dynamically imported so the entry chunk stays tiny and the
  // HTML splash can paint immediately. Phaser lives in its own bundle chunk
  // (see vite.config.ts manualChunks) so this download is parallelisable.
  const Phaser = await import('phaser');

  let scenes: import('phaser').Types.Scenes.SceneType[] = [];

  try {
    const { BootScene, PreloadScene, MenuScene, LevelMapScene, Level01Scene, LevelScene, SettingsScene, OnboardingScene } =
      await import('./scenes');
    scenes = [BootScene, PreloadScene, MenuScene, LevelMapScene, Level01Scene, LevelScene, SettingsScene, OnboardingScene];
  } catch (err) {
    errorReporter.report(err instanceof Error ? err : new Error(String(err)), {
      context: 'boot_scenes',
    });
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
  
  // 3. Instrument the game instance (non-fatal)
  try {
    const { instrumentGame } = await import('./lib/observability/phaserInstrumentation');
    instrumentGame(game);
  } catch (err) {
    console.warn('[main] phaserInstrumentation failed — continuing without game telemetry:', err);
  }

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
  errorReporter.report(err instanceof Error ? err : new Error(String(err)), {
    context: 'boot_phaser',
  });
  // If Phaser fails to load, leave the splash up so the user sees something
});
