// Global styles first, so component styles can override them.
import './styles/tokens.css';
import './styles/base.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { startClock } from './viewmodels/clock';
import { currentLang } from './viewmodels/i18n';
import { initLocation } from './viewmodels/location';

document.documentElement.lang = currentLang();
startClock();
void initLocation();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    try {
      navigator.serviceWorker.register('./sw.js').catch(() => {});
    } catch {
      // Offline support is optional; the app works without it (e.g. in sandboxed frames).
    }
  });
}
