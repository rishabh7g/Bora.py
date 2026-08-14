// Pinch-zoom off in the installed app, on in a browser tab (UI baseline §7,
// #98). index.html's static viewport tag carries no zoom flags — exactly
// `width=device-width, initial-scale=1.0, viewport-fit=cover`
// (src/pwa/manifest.test.ts) — so the web keeps ordinary browser zoom and
// WCAG 2.1 SC 1.4.4 / 1.4.10 stay satisfied there. This component is the
// runtime amendment for the one case that tag cannot answer on its own:
// whether THIS launch is a home-screen install or a tab. That is only
// knowable client-side — the same URL is a tab on one visit and an installed
// app on the next — so detection has to happen here, after the static HTML
// has already shipped.
//
// It AMENDS the tag's existing content string; it never replaces it. A
// hardcoded replacement would pass a "zoom is locked" check while silently
// dropping viewport-fit=cover — which is what turns every
// env(safe-area-inset-*) on, including src/bottomnav.css's home-indicator
// padding. Losing it is invisible until a real notched device is in front of
// you, which is exactly why src/pwa/StandaloneZoomLock.test.tsx pins the
// string surviving the lock rather than trusting a visual check.
import { useEffect } from 'react';

/** The two directives this component owns — everything else already on the
 *  tag (width=device-width, initial-scale=1.0, viewport-fit=cover) is not
 *  ours and must pass through untouched. */
const LOCK = ['maximum-scale=1', 'user-scalable=no'];

const OWNED = /^(maximum-scale|user-scalable)\s*=/i;

/** The string transform, factored out from the DOM write it feeds (below) so
 *  it is unit-testable without a document: this repo's suite has no jsdom
 *  (src/App.test.tsx), and there is no other DOM-touching decision here to
 *  justify adding one for a two-line function.
 *
 *  Strips our directives before deciding whether to re-add them — reads the
 *  CURRENT content, not a captured original, so repeated calls are
 *  idempotent and it can never get stuck locked after a display-mode change. */
export function computeViewportContent(content: string, standalone: boolean): string {
  const base = content
    .split(',')
    .map((directive) => directive.trim())
    .filter((directive) => directive.length > 0 && !OWNED.test(directive));
  return (standalone ? [...base, ...LOCK] : base).join(', ');
}

export default function StandaloneZoomLock(): null {
  useEffect(() => {
    const meta = document.querySelector<HTMLMetaElement>('meta[name="viewport"]');
    if (!meta) return;

    const apply = (): void => {
      meta.content = computeViewportContent(
        meta.content,
        window.matchMedia('(display-mode: standalone)').matches,
      );
    };
    apply();

    // Honour a display-mode change without a reload — installing mid-session,
    // or a PWA opened back out into a browser tab.
    const query = window.matchMedia('(display-mode: standalone)');
    query.addEventListener('change', apply);
    return () => {
      query.removeEventListener('change', apply);
      // Leave the tag as we found it, so an unmount never strands the app
      // zoom-locked (this component is rendered once near the root and never
      // unmounts in production, but a dev hot-reload does exercise this).
      meta.content = computeViewportContent(meta.content, false);
    };
  }, []);

  return null;
}
