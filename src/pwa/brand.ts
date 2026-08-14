// The ONE place the app's two brand colours are read from — never retyped
// (#105, ui-baseline §15: "theme_color and the <meta name="theme-color"> must
// match the CSS token. Read both from one source... retyping a hex in three
// files guarantees they drift.").
//
// Node-only, on purpose: this module runs at build time (imported by
// src/pwa/manifest.ts, which vite.config.ts and this module's own test load
// directly), never inside the browser bundle — so reading the design system's
// CSS file straight off disk is safe and needs no build tooling of its own.
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

// The design system's token declarations (design/README.md) — the single
// source of truth for the brand's colours.
const TOKENS_PATH = 'design/_ds/modernist-86c43557-9db6-4330-a863-9ea3a48fad23/styles.css';

/** Reads one `--custom-property: #hex;` declaration out of the token file.
 *  Loud on purpose (src/strings/t.ts takes the same stance): a token that
 *  moved or got renamed should fail the build, not silently ship `undefined`. */
export function readColorToken(property: string): string {
  const css = readFileSync(join(repoRoot, TOKENS_PATH), 'utf8');
  const match = new RegExp(`${property}:\\s*(#[0-9a-fA-F]{3,8})\\s*;`).exec(css);
  if (!match) {
    throw new Error(`brand.ts: no hex value for "${property}" in ${TOKENS_PATH}`);
  }
  return match[1];
}

/** `--color-accent` — the app's page colour and the installed app's title-bar
 *  / task-switcher tint (manifest `theme_color`, `<meta name="theme-color">`). */
export const themeColor = readColorToken('--color-accent');

/** `--color-bg` — the splash-screen backdrop before the app's own CSS paints
 *  (manifest `background_color`). */
export const backgroundColor = readColorToken('--color-bg');

/** Substitutes `index.html`'s `__THEME_COLOR__` placeholder (#105) — a pure
 *  string transform so it is unit-testable with no real Vite build. */
export function injectThemeColor(html: string): string {
  return html.replaceAll('__THEME_COLOR__', themeColor);
}

/** The Vite plugin that runs the substitution above at build time — the same
 *  `<meta name="theme-color">` `index.html` ships with locally (`npm run dev`
 *  transforms it too) and in the built `dist/index.html`. */
export function themeColorPlugin() {
  return {
    name: 'bora-theme-color',
    transformIndexHtml: injectThemeColor,
  };
}
