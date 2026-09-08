import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier/flat';

export default tseslint.config(
  {
    // dist/ is build output. design/ is the read-only handoff bundle, kept exactly as
    // delivered (README.md § Naming), so it is not ours to fix. `.claude/` is the harness's
    // scratch state; its worktrees hold whole checkouts of this repo, which would otherwise
    // be linted alongside the real source.
    ignores: ['dist', 'design', 'coverage', '.claude'],
  },
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      prettier,
    ],
    languageOptions: {
      ecmaVersion: 2023,
      globals: globals.browser,
    },
    rules: {
      // tsconfig.json sets noUnusedParameters, and tsc already exempts the
      // leading underscore; eslint is told the same convention so a parameter
      // kept only to document a signature (ErrorBoundary.componentDidCatch) is
      // not reported by one gate and accepted by the other.
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
  {
    // content/lint.ts and tools/ hold the build-time CLIs the npm scripts run, and
    // vite.config.ts is the build config; they run in Node, not the browser.
    files: ['content/**/*.ts', 'tools/**/*.ts', 'vite.config.ts'],
    languageOptions: {
      globals: globals.node,
    },
  },
  {
    // scripts/ holds the .mjs harnesses (icon generation, contrast audit, headless probes).
    // They run in Node, but the callbacks they hand to Playwright's page.evaluate() are
    // serialised and run inside the page, so `document` and `getComputedStyle` are real
    // there and both global sets apply.
    files: ['scripts/**/*.mjs'],
    extends: [js.configs.recommended, prettier],
    languageOptions: {
      ecmaVersion: 2023,
      globals: { ...globals.node, ...globals.browser },
    },
  },
);
