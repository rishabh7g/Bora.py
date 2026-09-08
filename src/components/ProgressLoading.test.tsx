// ProgressLoading render contract: the app is never a blank page while the
// stored progress is being read, and a stalled read says so in words the learner
// can act on (issue #35).
import { expect, it } from 'vitest';
import { renderToString } from 'react-dom/server';
import ProgressLoading from './ProgressLoading';

it('says it is loading while the read is still running', () => {
  const html = renderToString(<ProgressLoading stalled={false} />);
  expect(html).toContain('Loading your checkpoints');
  // Announced, not silent — the screen replaces itself without a navigation.
  expect(html).toContain('role="status"');
  // Nothing alarming until the read has actually stalled.
  expect(html).not.toContain('not loading');
});

it('explains a stalled read and offers a retry', () => {
  const html = renderToString(<ProgressLoading stalled />);
  expect(html).toContain('Your checkpoints are not loading');
  expect(html).toContain('storage');
  expect(html).toContain('Try again');
  expect(html).not.toContain('Loading your checkpoints');
});

it('renders visible text in both states — never an empty screen', () => {
  for (const stalled of [false, true]) {
    const html = renderToString(<ProgressLoading stalled={stalled} />);
    const text = html.replace(/<[^>]+>/g, '').trim();
    expect(text.length).toBeGreaterThan(10);
  }
});
