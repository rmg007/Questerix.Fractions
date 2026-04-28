import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import { visualizer } from 'rollup-plugin-visualizer';
import path from 'path';

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
          runtimeCaching: [
            {
              urlPattern: /\/curriculum\/v\d+\.json/,
              handler: 'CacheFirst',
              options: {
                cacheName: 'curriculum',
                expiration: { maxAgeSeconds: 30 * 86400 }, // 30 days
              },
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
            { src: '/icons/icon-maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
            { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          ],
        },
      })
    );
  }

  if (process.env['BUNDLE_ANALYZE']) {
    plugins.push(visualizer({ open: true, gzipSize: true, brotliSize: true }));
  }

  return {
  plugins,
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  server: {
    port: 5000,
    host: '0.0.0.0',
    allowedHosts: true,
    watch: {
      // Ignore non-source directories to prevent Replit's internal writes
      // (e.g. .roadie/project-model.db-wal) from triggering spurious HMR reloads.
      ignored: [
        '**/.roadie/**',
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
