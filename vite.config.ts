import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { pwaOptions } from './src/pwa/manifest';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), VitePWA(pwaOptions)],
  build: {
    // Emit the photocard SVGs as real files instead of inlining them as data
    // URIs, so the service worker's precache manifest lists every card by its
    // hashed URL (ENGINEERING.md §9) — the art is then verifiably offline.
    assetsInlineLimit: (filePath) => (filePath.endsWith('.svg') ? false : undefined),
  },
});
