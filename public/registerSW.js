// Service worker registration with auto-update support.
// Loaded via <script src="/registerSW.js"> injected by vite-plugin-pwa.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then((registration) => {
        // Poll for updates every hour
        setInterval(() => registration.update(), 60 * 60 * 1000);

        registration.addEventListener('updatefound', () => {
          const next = registration.installing;
          if (!next) return;
          next.addEventListener('statechange', () => {
            // New SW installed and ready; reload to activate immediately (autoUpdate)
            if (next.state === 'installed' && navigator.serviceWorker.controller) {
              window.location.reload();
            }
          });
        });
      })
      .catch((err) => console.warn('[SW] Registration failed:', err));
  });
}
