import './styles/index.css';
// Side-effect import: registers Quest microcopy in the typed i18n catalog.
// Per ux-elevation §9 T28 — keys must be available before any scene calls
// catalog.get('quest.…'). registerCatalog is HMR-safe (idempotent on
// deep-equal content), so re-evaluation under Vite hot reload is fine.
import './lib/i18n/keys/quest';
import './lib/i18n/keys/system';
import { initObservability, errorReporter } from './lib/observability';
import { deviceMetaRepo } from './persistence/repositories/deviceMeta';
import { RecoveryBus, registerGame } from './lib/recovery/recoveryBus';

// R8 / crash-and-recovery §1: Catch synchronous errors (e.g., in scene callbacks)
// that could freeze the canvas. Routes to RecoveryScene when the game is up;
// falls back to a pure-DOM error UI when Phaser hasn't booted yet.
window.addEventListener('error', (event) => {
  const error =
    event.error instanceof Error ? event.error : new Error(String(event.error ?? event.message));
  console.error('[main] Uncaught error:', error.message);

  // Try to route via RecoveryBus first (game may already be running)
  try {
    RecoveryBus.report({ kind: 'unknown', error });
    // If RecoveryBus successfully dispatched, it will handle the UI.
    // Keep the DOM fallback as a safety net in case the scene can't mount.
  } catch {
    /* ignore */
  }

  // Pure-DOM fallback: shown when Phaser itself crashed or hasn't loaded yet
  if (!document.getElementById('qf-error-overlay')) {
    const container = document.createElement('div');
    container.id = 'qf-error-overlay';
    container.style.cssText =
      'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:#f8d7da;border:1px solid #f5c6cb;border-radius:8px;padding:20px;max-width:500px;z-index:9999;font-family:sans-serif;text-align:center';
    const heading = document.createElement('h2');
    heading.textContent = 'Something went wrong';
    heading.style.cssText = 'color:#721c24;margin:0 0 10px 0';
    const message = document.createElement('p');
    message.textContent = error.message;
    message.style.cssText = 'color:#721c24;margin:0 0 20px 0';
    const button = document.createElement('button');
    button.textContent = 'Refresh';
    button.style.cssText =
      'background:#721c24;color:white;border:none;padding:10px 20px;border-radius:4px;cursor:pointer';
    button.addEventListener('click', () => location.reload());
    container.appendChild(heading);
    container.appendChild(message);
    container.appendChild(button);
    document.body.appendChild(container);
  }
});

// crash-and-recovery §1: Swallow unhandled promise rejections from storage
// (e.g. embedded preview iframes where IndexedDB and localStorage are blocked).
// Non-storage promise rejections are forwarded to RecoveryBus.
// The game continues in volatile mode per runtime-architecture.md §10.
window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason;
  const message = reason instanceof Error ? reason.message : String(reason ?? '');
  if (/storage is not allowed|UnknownError|NotAllowedError|QuotaExceededError/i.test(message)) {
    console.warn('[main] Suppressed storage-restricted error:', message);
    event.preventDefault();
  } else if (reason instanceof Error) {
    errorReporter.report(reason, { source: 'unhandledrejection' });
    try {
      RecoveryBus.report({ kind: 'unknown', error: reason });
    } catch {
      /* ignore */
    }
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
  // Guarantee the splash always hides — even if an early await rejects
  // (e.g. IndexedDB blocked in a sandboxed preview iframe).
  // Cleared early when Phaser fires 'ready'; the 3s in-game fallback below
  // is a closer net for the normal happy path.
  const splashSafetyTimer = window.setTimeout(hideSplash, 6000);

  // 1. Load preferences to check telemetry consent
  let meta: Awaited<ReturnType<typeof deviceMetaRepo.get>>;
  try {
    meta = await deviceMetaRepo.get();
  } catch {
    // IndexedDB may be unavailable in sandboxed iframes — continue with defaults
    meta = { preferences: {} } as Awaited<ReturnType<typeof deviceMetaRepo.get>>;
  }

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
      RecoveryScene,
      DBRecoveryScene,
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
      RecoveryScene,
      DBRecoveryScene,
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
    // Plan 1 Phase 1b — multi-touch: 3 simultaneous pointers prevents a
    // resting finger from claiming pointer 0 and killing an active drag.
    input: {
      activePointers: 3,
    },
    scene: scenes,
  };

  const game = new Phaser.Game(config);

  // crash-and-recovery §1 — register the game instance with RecoveryBus so it
  // can route to RecoveryScene/DBRecoveryScene from the global error boundary.
  registerGame(game);

  // Plan 5 Phase 3 — Background throttling fix:
  // Pause all scene tweens when the tab is hidden so timers don't drift or
  // fire stale callbacks that could corrupt state. Resume on visibility restore.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      game.scene.scenes.forEach((s) => {
        s.tweens?.pauseAll?.();
      });
    } else {
      game.scene.scenes.forEach((s) => {
        s.tweens?.resumeAll?.();
      });
    }
  });

  // crash-and-recovery §1 — wire the recovery:report event from RecoveryBus
  // (emitted via game.registry.events) to the scene router.
  game.events.once('ready', () => {
    // Listen for recovery reports emitted after the game is ready
    game.registry.events.on(
      'recovery:report',
      (report: import('./lib/recovery/recoveryBus').RecoveryReport) => {
        RecoveryBus.routeToScene(report);
      }
    );

    // Also handle any recovery reports that fired via window event before the
    // game was ready (e.g. an error during Phaser's own boot).
    window.addEventListener('qf:recovery', (ev: Event) => {
      const report = (ev as CustomEvent<import('./lib/recovery/recoveryBus').RecoveryReport>)
        .detail;
      RecoveryBus.routeToScene(report);
    });
  });

  // 3. Instrument the game instance (non-fatal)
  try {
    const { instrumentGame } = await import('./lib/observability/phaserInstrumentation');
    instrumentGame(game);
  } catch (err) {
    console.warn('[main] phaserInstrumentation failed — continuing without game telemetry:', err);
  }

  // Hide splash on the first rendered frame (boot scene + canvas are up)
  game.events.once('ready', () => {
    window.clearTimeout(splashSafetyTimer);
    hideSplash();
  });
  // Safety net: also hide after 3s in case 'ready' never fires
  setTimeout(hideSplash, 3000);

  // Request persistent storage for IndexedDB (per C5 / PWA requirements)
  if (navigator.storage?.persist) {
    navigator.storage.persist().catch(() => {
      // User may deny persistent storage; app continues in volatile mode
      console.warn('[main] Persistent storage not granted');
    });
  }

  // Phase 14 — Service worker registration error handling.
  // If SW registration fails (e.g., blocked by corporate proxy, offline),
  // dispatch an event for visibility. Only log; error UX is non-critical.
  if (typeof window !== 'undefined') {
    window.addEventListener('sw-register-failed', (evt: Event) => {
      const err = (evt as CustomEvent).detail;
      console.warn('[main] SW registration failed; offline features unavailable:', err);
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
