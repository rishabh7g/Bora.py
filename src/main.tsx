import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
// Design system: tokens + component classes (.btn, .tag, themed :focus-visible).
import '../design/_ds/modernist-86c43557-9db6-4330-a863-9ea3a48fad23/styles.css';
import App from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
