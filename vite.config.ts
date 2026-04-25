import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import { visualizer } from 'rollup-plugin-visualizer';
import path from 'path';

// PWA plugin is opt-in via PWA=1 (workbox-build install was flaky on first run).
// Enable for Phase 4 builds: PWA=1 npm run build
const enablePWA = process.env['PWA'] === '1';

export default defineConfig(async () => {
  const plugins: any[] = [tailwindcss()];

  if (enablePWA) {
    const { VitePWA } = await import('vite-plugin-pwa');
    plugins.push(
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['manifest.json', 'icons/*.png'],
        manifest: {
          name: 'Questerix Fractions',
          short_name: 'Questerix',
          display: 'standalone',
          theme_color: '#2F6FED',
          background_color: '#FFFFFF',
          icons: [
            { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
            { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
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
    port: 5173,
    host: true,
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
