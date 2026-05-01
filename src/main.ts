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
    const {
      BootScene,
      PreloadScene,
      MenuScene,
      OnboardingScene,
      LevelMapScene,
      Level01Scene,
      LevelScene,
      SettingsScene,
    } = await import('./scenes');
    scenes = [
      BootScene,
      PreloadScene,
      MenuScene,
      OnboardingScene,
      LevelMapScene,
      Level01Scene,
      LevelScene,
      SettingsScene,
    ];
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

  // Phase 11.3 — Update-available banner.
  // `vite-plugin-pwa` is configured with `registerType: 'autoUpdate'`, so a
  // new bundle activates automatically; the running tab keeps executing the
  // stale code until it reloads. We listen for `controllerchange` (which
  // fires the moment the new SW takes over) and mount an `UpdateBanner` —
  // but only at safe checkpoints. Showing the banner mid-level would yank
  // the player out of an answer, so we wait until MenuScene becomes active.
  if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
    let updatePending = false;
    let bannerMounted = false;

    const mountBanner = (menu: import('phaser').Scene): void => {
      if (bannerMounted) return;
      bannerMounted = true;
      void import('./components/UpdateBanner')
        .then(({ UpdateBanner }) => {
          new UpdateBanner({ scene: menu });
        })
        .catch((err) => {
          console.warn('[main] UpdateBanner mount failed:', err);
        });
    };

    const tryMountIfMenuActive = (): void => {
      if (!updatePending || bannerMounted) return;
      const menu = game.scene.getScene('MenuScene');
      // Only mount when the player is actively on MenuScene — never mid-level.
      if (!menu || !game.scene.isActive('MenuScene')) return;
      mountBanner(menu);
    };

    navigator.serviceWorker.addEventListener('controllerchange', () => {
      updatePending = true;
      tryMountIfMenuActive();
    });

    // Re-check whenever MenuScene becomes active, so an update that arrived
    // mid-level surfaces the banner the next time the player returns to it.
    // We hook the scene's `create` event directly (single emitter, fires on
    // each MenuScene mount) rather than the global per-frame `step` tick.
    const hookMenu = (): void => {
      const menu = game.scene.getScene('MenuScene');
      if (!menu) return;
      menu.events.on('create', () => {
        if (updatePending && !bannerMounted) mountBanner(menu);
      });
    };
    if (game.scene.getScene('MenuScene')) hookMenu();
    else game.events.once('ready', hookMenu);
  }
}

boot().catch((err: unknown) => {
  errorReporter.report(err instanceof Error ? err : new Error(String(err)), {
    context: 'boot_phaser',
  });
  // If Phaser fails to load, leave the splash up so the user sees something
});
