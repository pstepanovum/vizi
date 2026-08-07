import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { Dashboard } from './dashboard';
import { RenderView } from './render-view';
import './styles.css';

const params = new URLSearchParams(window.location.search);
const isRender = params.has('render');

const root = createRoot(document.getElementById('root')!);

if (isRender) {
  // Export mode is not wrapped in StrictMode: the double-invoked effects would
  // race the readiness flag Playwright waits on.
  document.body.classList.add('render-mode');
  root.render(
    <RenderView
      deviceId={params.get('device') ?? 'iphone-6.9'}
      slideIndex={Number(params.get('slide') ?? '0')}
    />,
  );
} else {
  root.render(
    <StrictMode>
      <Dashboard />
    </StrictMode>,
  );
}
