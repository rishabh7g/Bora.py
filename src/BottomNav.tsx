// The bottom navigation (#75) — the app's whole top level: Map · Shelf ·
// Settings, in that order, and nothing else. The setup guide is a module
// reached from the map, and Module / Exercise are deep screens, so none of
// them is a destination here.
//
// It renders as the last flex child of the shell (#73, src/app.css), beside
// the scrolling <main> rather than over it: no `position: fixed`, no z-index,
// and no screen padding to compensate for an overlap that cannot happen. The
// nav is on every routed screen, Exercise included — there is no immersive
// mode, which would need a session context and a back-button guard this app
// does not have yet.
//
// Two rules live in src/bottomnav.css rather than here, because they are
// layout facts: an item is 48px tall (above the app's 44px floor — a bottom
// nav is thumb territory) and `touch-action: manipulation` kills the 300ms
// double-tap-zoom delay; the bar clears the home indicator with
// `max(var(--space-8), env(safe-area-inset-bottom))`.
import { Layers, Map, Settings } from 'lucide-react';
import { HOME_ROUTE, SETTINGS_ROUTE, SHELF_ROUTE } from './HomeMap';
import './bottomnav.css';

/** The three destinations, paired with the route screen each one *is*. This
 *  app has no react-router and so no NavLink to hand out `aria-current`; the
 *  screen App already resolved is the single source the state comes from. */
const ITEMS = [
  { href: HOME_ROUTE, screen: 'home', label: 'Map', Icon: Map },
  { href: SHELF_ROUTE, screen: 'shelf', label: 'Shelf', Icon: Layers },
  { href: SETTINGS_ROUTE, screen: 'settings', label: 'Settings', Icon: Settings },
] as const;

export default function BottomNav({ screen }: { screen: string }) {
  return (
    <nav className="bottomnav" aria-label="Primary">
      {ITEMS.map((item) => (
        <a
          key={item.href}
          className="bottomnav-item"
          href={item.href}
          // The icon is the whole item, so this is the only accessible name it
          // has — without it the link announces as its href.
          aria-label={item.label}
          // On #/setup, #/module/… and the exercise routes none of the three
          // destinations is the screen being shown, so nothing is current.
          // That is the honest answer, not a gap.
          aria-current={item.screen === screen ? 'page' : undefined}
        >
          <item.Icon className="bottomnav-icon" aria-hidden="true" />
        </a>
      ))}
    </nav>
  );
}
