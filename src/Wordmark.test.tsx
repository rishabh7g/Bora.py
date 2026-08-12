// Wordmark render contract — the brand lockup exactly as design/brand/BRAND.md
// specifies it: the name lowercase with the dot, `.py` in --color-accent-700,
// the primary mark inlined (no outlines, no fetch), announced once.
import { expect, it } from 'vitest';
import { renderToString } from 'react-dom/server';
import HomeMap from './HomeMap';
import Wordmark, { BRAND_NAME } from './Wordmark';
import { loadCurriculum } from './content/load';
import { emptyProgress } from './state/progress';

it('sets the name lowercase with the dot, .py in the accent tone', () => {
  const html = renderToString(<Wordmark />);
  expect(BRAND_NAME).toBe('bora.py');
  expect(html).toContain('bora<span class="wordmark-dot">.py</span>');
  // The tone itself lives in wordmark.css as --color-accent-700, never a hex.
  expect(html).not.toMatch(/#[0-9a-f]{3,6}/i);
});

it('draws the mark inline from the brand geometry, hidden from assistive tech', () => {
  const html = renderToString(<Wordmark />);
  expect(html).toContain('viewBox="0 0 64 64"'); // logo.svg geometry
  expect(html).toContain('points="17,18 31,32 17,46"'); // the prompt chevron
  expect(html).toContain(`aria-label="${BRAND_NAME}"`); // announced once…
  expect((html.match(/aria-hidden="true"/g) ?? []).length).toBe(2); // …mark + text muted
});

it('labels the map — the app root — with the lockup', () => {
  const html = renderToString(
    <HomeMap curriculum={loadCurriculum()} progress={emptyProgress()} />,
  );
  expect(html).toContain('wordmark-dot');
  expect(html).toContain(`aria-label="${BRAND_NAME}"`);
});
