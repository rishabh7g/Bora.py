// The app's one failure primitive (#96, UI baseline §10): role="alert",
// title as an h1 by default (a raised notice IS the screen when nothing else
// has loaded), a body, an optional detail line and an optional action.
import { expect, it } from 'vitest';
import { renderToString } from 'react-dom/server';
import Notice from './Notice';

it('renders role="alert" with the title as an h1 by default', () => {
  const html = renderToString(<Notice title="Something went wrong." body="Try again." />);
  expect(html).toContain('role="alert"');
  expect(html).toMatch(/<h1[^>]*>Something went wrong\.<\/h1>/);
});

it('drops to an h2 when the screen already has its own h1', () => {
  const html = renderToString(
    <Notice level="h2" title="Import failed." body="That file is not valid." />,
  );
  expect(html).toMatch(/<h2[^>]*>Import failed\.<\/h2>/);
  expect(html).not.toContain('<h1');
});

it('renders an optional detail line and an optional action, and omits both when absent', () => {
  const withBoth = renderToString(
    <Notice
      title="Something went wrong."
      body="Reloading is safe."
      detail="TypeError: Failed to fetch"
      action={{ label: 'Reload', onClick: () => {} }}
    />,
  );
  expect(withBoth).toContain('TypeError: Failed to fetch');
  expect(withBoth).toContain('Reload');

  const withNeither = renderToString(<Notice title="Something went wrong." body="No detail here." />);
  expect(withNeither).not.toContain('<button');
});
