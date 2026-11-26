import '@fontsource-variable/inter';
import '@fontsource-variable/manrope';
import './styles/index.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App';

// Scroll-reveal and entrance animations apply only when JS runs and motion is not reduced.
if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) document.documentElement.classList.add('motion');

const root = document.getElementById('root')!;

/**
 * Each indexable page ships with a pre-rendered copy of its content (#snapshot, written by
 * scripts/prerender.ts) so crawlers that do not run scripts still read the page. For a person it
 * only bridges the first moments: it stays until the live app has drawn its heading, then goes.
 * Automated browsers (tests) skip it, so they only ever see the live app.
 */
const snapshot = document.getElementById('snapshot');
if (snapshot) {
  if (navigator.webdriver) {
    snapshot.remove();
  } else {
    root.classList.add('app-pending');
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      observer.disconnect();
      snapshot.remove();
      root.classList.remove('app-pending');
    };
    const observer = new MutationObserver(() => {
      if (root.querySelector('main h1')) finish();
    });
    observer.observe(root, { childList: true, subtree: true });
    window.setTimeout(finish, 8000);
  }
}

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
