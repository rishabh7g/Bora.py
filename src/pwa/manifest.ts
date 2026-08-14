// PWA options — the ONE owner of the web app manifest and the service-worker
// precache rules (ENGINEERING.md §9). vite.config.ts feeds this straight to
// vite-plugin-pwa; nothing else configures the app's offline behaviour.
//
// Base-path rule: every URL here is RELATIVE. The app is served from a static
// host at an unknown prefix (GitHub Pages puts it under /Bora.py/), so
// `start_url: '.'` and `scope: './'` resolve against wherever the manifest
// itself lands. An absolute '/' would break the moment the app moves off root.
import type { ManifestOptions, VitePWAOptions } from 'vite-plugin-pwa';

// Copied verbatim from public/ into the build, then precached below.
export const includedAssets = [
  'favicon.svg',
  'icons/apple-touch-icon-180.png',
  'icons/favicon-32.png',
];

export const webManifest: Partial<ManifestOptions> = {
  // The brand name, always lowercase and always with the dot (BRAND.md).
  name: 'bora.py',
  short_name: 'bora.py',
  description:
    'Learn the Pareto slice of Python — you write and run the code, the app keeps the checkpoints.',
  lang: 'en',
  // Set explicitly (#104) — otherwise the browser derives identity from
  // start_url, which resolves against whatever prefix the app is deployed
  // under. A prefix change (repo rename, custom domain, different mount)
  // would then re-install the app as a second, unrelated copy, stranding
  // the first one's IndexedDB progress under the old origin path.
  id: './',
  start_url: '.',
  scope: './',
  display: 'standalone',
  orientation: 'portrait',
  // The mark's field and the app's page colour (BRAND.md variants).
  theme_color: '#ec3013',
  background_color: '#f3f2f2',
  icons: [
    { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
    { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
    // Full-bleed red field with the glyphs pulled inside the 80% safe zone, so
    // Android's mask can crop it to any shape without clipping the mark.
    {
      src: 'icons/icon-maskable-512.png',
      sizes: '512x512',
      type: 'image/png',
      purpose: 'maskable',
    },
  ],
};

export const pwaOptions: Partial<VitePWAOptions> = {
  // Content fixes ship invisibly: the new service worker takes over on the next
  // launch, with no "update available" prompt to dismiss (ENGINEERING.md §9).
  registerType: 'autoUpdate',
  // main.tsx registers the worker itself, so the plugin must not inject a
  // second registration script into index.html.
  injectRegister: null,
  includeAssets: includedAssets,
  manifest: webManifest,
  workbox: {
    // Precache the whole app: shell, hashed JS/CSS (curriculum.json and the
    // photocard SVGs are bundled into it), icons and any emitted asset.
    globPatterns: ['**/*.{html,js,css,svg,png,ico,json,webmanifest,woff,woff2}'],
    // Hash routing means every route is index.html; offline navigations must
    // still resolve to the shell.
    navigateFallback: 'index.html',
    cleanupOutdatedCaches: true,
    clientsClaim: true,
    // Archivo is self-hosted (#95): the three woff2 files sit beside the
    // design-system stylesheet, so globPatterns' woff2 entry above precaches
    // them with everything else. No third-party origin is fetched at
    // runtime, so there is nothing to list here.
    runtimeCaching: [],
  },
};
