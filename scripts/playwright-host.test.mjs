// #137 — the browser-cache lookup must answer for the host it runs on, and the
// Pi's answer must not move. Both probes run on macOS (where the author sits)
// and on the Raspberry Pi (where the app is worked on), and a Pi is not
// available to test against, so the Pi's behaviour is pinned here instead:
// `browserCacheRoots` takes `env` and `home` as parameters precisely so both
// hosts' answers can be asserted from either host.
//
// What that does and does not prove: the roots are chosen from `env` alone, not
// from `process.platform`, so the list below IS the list the Pi gets. What the
// Pi then finds inside those directories is a property of its disk, not of this
// code — and the first entry, the only path the lookup ever had before #137, is
// still searched first and still wins outright when it holds the build.
import { homedir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { browserCacheRoots, noPlaywrightMessage } from './playwright-host.mjs';

const HOME = '/home/pi';
const linuxCache = join(HOME, '.cache', 'ms-playwright');
const macCache = join(HOME, 'Library', 'Caches', 'ms-playwright');

describe('browserCacheRoots', () => {
  it('searches the Linux/Pi cache first — the path the lookup has always used', () => {
    expect(browserCacheRoots({}, HOME)[0]).toBe(linuxCache);
  });

  it('adds the macOS cache as a fallback, so a mac finds the browser it has', () => {
    expect(browserCacheRoots({}, HOME)).toEqual([linuxCache, macCache]);
  });

  it('honours PLAYWRIGHT_BROWSERS_PATH outright when it is set', () => {
    expect(browserCacheRoots({ PLAYWRIGHT_BROWSERS_PATH: '/opt/browsers' }, HOME)).toEqual([
      '/opt/browsers',
    ]);
  });

  it('defaults to this host without arguments', () => {
    expect(browserCacheRoots({}, undefined)).toEqual(browserCacheRoots({}, homedir()));
  });
});

describe('noPlaywrightMessage', () => {
  it('names every path tried, so a bare exit code never has to be guessed at', () => {
    const message = noPlaywrightMessage(browserCacheRoots({}, HOME));
    expect(message).toContain(linuxCache);
    expect(message).toContain(macCache);
  });

  it('says how to install the browser', () => {
    expect(noPlaywrightMessage()).toContain('install-browser chrome-for-testing');
  });
});
