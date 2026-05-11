import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';
import path from 'path';
import { execSync } from 'child_process';
import { DEV_PORT } from './src/config/shared';

// Inject git short SHA + build time so the live site exposes its version.
// Surfaced via meta tag in index.html and queryable via postdeploy.
const buildSha = (() => {
  try {
    return execSync('git rev-parse --short HEAD').toString().trim();
  } catch {
    return 'unknown';
  }
})();
const buildTime = new Date().toISOString();

// PWA enabled in production by default (Phase 8)
const enablePWA = process.env['NODE_ENV'] === 'production' || process.env['PWA'] === '1';

// Phase 1: spike mode uses React entry point; production uses Phaser
const isSpikeMode = process.env['VITE_SPIKE'] === '1';

export default defineConfig(async () => {
  const plugins: any[] = [tailwindcss(), react()];

  if (enablePWA) {
    const { VitePWA } = await import('vite-plugin-pwa');
    plugins.push(
      VitePWA({
        registerType: 'prompt',
        injectRegister: 'script',
        includeAssets: ['manifest.json', 'icons/*.png', 'screenshots/*.png'],
        workbox: {
          navigateFallback: '/index.html',
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
          maximumFileSizeToCacheInBytes: 4 * 1024 * 1024, // 4 MB
          runtimeCaching: [
            {
              // Curriculum JSON fetched at runtime — cache-first so offline
              // sessions still load the curriculum after the first online visit.
              // Phase 11.1: TTL reduced from 30d → 7d so curriculum updates
              // shipped via the pipeline reach students within a week even
              // without an explicit "Refresh Curriculum" tap.
              // Cache name `curriculum-cache` is referenced by SettingsScene's
              // "Refresh Curriculum" affordance — keep the strings in sync.
              urlPattern: /\/curriculum\/(v\d+|index|level-\d+)\.json/,
              handler: 'CacheFirst',
              options: {
                cacheName: 'curriculum-cache',
                expiration: { maxAgeSeconds: 7 * 86400 }, // 7 days (Phase 11.1)
              },
            },
            {
              // Custom webfonts (Fredoka One, Lexend) loaded from CDN.
              // StaleWhileRevalidate keeps them fresh while still serving offline.
              urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\//,
              handler: 'StaleWhileRevalidate',
              options: { cacheName: 'google-fonts' },
            },
          ],
        },
        manifest: {
          name: 'Questerix Fractions',
          short_name: 'Questerix',
          description: 'K-2 fraction concepts educational game',
          display: 'standalone',
          orientation: 'portrait',
          start_url: '/',
          theme_color: '#2F6FED',
          background_color: '#FFFFFF',
          categories: ['education', 'games'],
          icons: [
            { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
            { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
            {
              src: '/icons/icon-192-maskable.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'maskable',
            },
            {
              src: '/icons/icon-512-maskable.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
          screenshots: [
            {
              src: '/screenshots/mobile-540x720.png',
              sizes: '540x720',
              form_factor: 'narrow',
              type: 'image/png',
            },
            {
              src: '/screenshots/tablet-1024x768.png',
              sizes: '1024x768',
              form_factor: 'wide',
              type: 'image/png',
            },
          ],
        },
      })
    );
  }

  if (process.env['BUNDLE_ANALYZE']) {
    plugins.push(visualizer({ open: true, gzipSize: true, brotliSize: true }));
  }

  // Plugin to inject build SHA / time into index.html placeholders
  plugins.push({
    name: 'inject-build-version',
    transformIndexHtml(html: string) {
      return html.replace(/%BUILD_SHA%/g, buildSha).replace(/%BUILD_TIME%/g, buildTime);
    },
  });

  // Plugin to upload source maps to Sentry after build
  // Gated on SENTRY_AUTH_TOKEN to enable in CI/production builds
  plugins.push({
    name: 'sentry-sourcemap-upload',
    apply: 'build',
    async writeBundle() {
      const sentryAuthToken = process.env['SENTRY_AUTH_TOKEN'];
      const sentryDsn = process.env['VITE_SENTRY_DSN'];

      if (!sentryAuthToken || !sentryDsn) {
        return; // Skip upload if credentials are not configured
      }

      // Parse DSN to extract org and project
      // DSN format: https://key@host/organization/project
      const dsnMatch = sentryDsn.match(/https?:\/\/[^@]+@[^/]+\/([^/]+)\/([^/]+)/);
      if (!dsnMatch) {
        console.warn('[sentry] Invalid VITE_SENTRY_DSN format, skipping source map upload');
        return;
      }

      const org = dsnMatch[1];
      const project = dsnMatch[2];

      try {
        console.log(`[sentry] Uploading source maps for release ${buildSha}...`);
        execSync(
          `sentry-cli releases files upload-sourcemaps ./dist/assets --org ${org} --project ${project} --release ${buildSha}`,
          { stdio: 'inherit' }
        );
        console.log('[sentry] Source maps uploaded successfully');
      } catch (error) {
        console.warn('[sentry] Source map upload failed:', error instanceof Error ? error.message : String(error));
        // Non-fatal: don't fail the build if upload fails
      }
    },
  });

  return {
    plugins,
    define: {
      __BUILD_SHA__: JSON.stringify(buildSha),
      __BUILD_TIME__: JSON.stringify(buildTime),
      'import.meta.env.VITE_GIT_SHA': JSON.stringify(buildSha),
      'import.meta.env.VITE_BUILD_TIME': JSON.stringify(buildTime),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
        '@app': path.resolve(__dirname, 'src/app'),
        '@interactions': path.resolve(__dirname, 'src/interactions'),
      },
    },
    server: {
      port: DEV_PORT,
      host: '0.0.0.0',
      allowedHosts: true,
      middlewareMode: false,
      watch: {
        // Ignore non-source directories to prevent spurious HMR reloads
        ignored: [
          '**/.local/**',
          '**/.git/**',
          '**/.claude/**',
          '**/validation-data/**',
          '**/PLANS/**',
          '**/*.db',
          '**/*.db-wal',
          '**/*.db-shm',
        ],
      },
    },
    appType: isSpikeMode ? 'spa' : 'mpa',
    build: {
      target: 'es2022',
      outDir: 'dist',
      sourcemap: 'hidden',
      assetsInlineLimit: 0,
      chunkSizeWarningLimit: 1400,
      rollupOptions: {
        input: isSpikeMode
          ? path.resolve(__dirname, 'spike.html')
          : path.resolve(__dirname, 'index.html'),
        output: {
          manualChunks: (id: string) => {
            if (id.includes('node_modules/phaser')) return 'phaser';
            if (id.includes('node_modules/dexie')) return 'dexie';
          },
        },
      },
    },
  };
});
