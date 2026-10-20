import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App.tsx';
import { createRepository } from './store/createRepository.ts';

const container = document.getElementById('root');
if (!container) throw new Error('missing #root');
const root = createRoot(container);

createRepository().then(({ repository, fallbackNotice }) => {
  root.render(
    <StrictMode>
      <App repository={repository} fallbackNotice={fallbackNotice} />
    </StrictMode>,
  );
});
