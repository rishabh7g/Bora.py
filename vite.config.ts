import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { pwaOptions } from './src/pwa/manifest';
import { themeColorPlugin } from './src/pwa/brand';

// https://vite.dev/config/
export default defineConfig({
  // GitHub Pages serves the app from https://rishabh7g.github.io/Bora.py/, so
  // every emitted asset URL — and the generated service-worker registration —
  // must carry the repo subpath (ENGINEERING.md §10). Hard-coded rather than
  // env-driven so a local `npm run build` produces exactly what CI deploys.
  // The manifest itself stays base-relative (src/pwa/manifest.ts).
  base: '/Bora.py/',
  plugins: [react(), VitePWA(pwaOptions), themeColorPlugin()],
  build: {
    // Emit the photocard SVGs as real files instead of inlining them as data
    // URIs, so the service worker's precache manifest lists every card by its
    // hashed URL (ENGINEERING.md §9) — the art is then verifiably offline.
    assetsInlineLimit: (filePath) => (filePath.endsWith('.svg') ? false : undefined),
  },
});
