import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';
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

export default defineConfig(async () => {
  const plugins: any[] = [tailwindcss()];

  if (enablePWA) {
    const { VitePWA } = await import('vite-plugin-pwa');
    plugins.push(
      VitePWA({
        registerType: 'autoUpdate',
        injectRegister: 'script',
        includeAssets: ['manifest.json', 'icons/*.png'],
        workbox: {
          navigateFallback: '/index.html',
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
          maximumFileSizeToCacheInBytes: 4 * 1024 * 1024, // 4 MB
          runtimeCaching: [
            {
              // Curriculum JSON fetched at runtime — cache-first so offline
              // sessions still load the curriculum after the first online visit.
              urlPattern: /\/curriculum\/v\d+\.json/,
              handler: 'CacheFirst',
              options: {
                cacheName: 'curriculum',
                expiration: { maxAgeSeconds: 30 * 86400 }, // 30 days
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
          display: 'standalone',
          theme_color: '#2F6FED',
          background_color: '#FFFFFF',
          icons: [
            { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
            { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
            {
              src: '/icons/icon-maskable-192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'maskable',
            },
            {
              src: '/icons/icon-maskable-512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
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
      },
    },
    server: {
      port: DEV_PORT,
      host: '0.0.0.0',
      allowedHosts: true,
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
    build: {
      target: 'es2022',
      outDir: 'dist',
      sourcemap: 'hidden',
      assetsInlineLimit: 0,
      chunkSizeWarningLimit: 1400,
      rollupOptions: {
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
