import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
// Design system: tokens + component classes (.btn, .tag, themed :focus-visible).
import '../design/_ds/modernist-86c43557-9db6-4330-a863-9ea3a48fad23/styles.css';
import App from './App';

// Offline precache + silent auto-update (ENGINEERING.md §9). The generated
// registration knows the deploy base, so this works at any subpath; in dev it
// is a no-op. `immediate` installs the worker on first paint rather than on
// window load, so a first visit is offline-ready as early as possible.
registerSW({ immediate: true });

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
