import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
// Design system: tokens + component classes (.btn, .tag, themed :focus-visible).
import '../design/_ds/modernist-86c43557-9db6-4330-a863-9ea3a48fad23/styles.css';
// App text roles on top of the system's ramps — which step each job uses.
import './tokens.css';
import App from './App';
import ErrorBoundary from './ErrorBoundary';
import StandaloneZoomLock from './pwa/StandaloneZoomLock';

// Offline precache + silent auto-update (ENGINEERING.md §9). The generated
// registration knows the deploy base, so this works at any subpath; in dev it
// is a no-op. `immediate` installs the worker on first paint rather than on
// window load, so a first visit is offline-ready as early as possible.
registerSW({ immediate: true });

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* The boundary above everything (#96, UI baseline §10): a throw
        anywhere in the tree — including loadCurriculum(), now computed
        inside App rather than at module scope — renders a Notice instead of
        an empty #root. */}
    <ErrorBoundary>
      {/* Zoom is on in a browser tab and off once installed (#98, UI baseline
          §7) — rendered once, near the root, beside <App/> rather than inside
          it: it owns no screen and returns null, so it never affects what
          ErrorBoundary is guarding. */}
      <StandaloneZoomLock />
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
