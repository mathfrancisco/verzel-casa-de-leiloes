import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { App } from './App';
import { RealtimeLifecycle } from './lib/RealtimeLifecycle';
import './styles.css';

const queryClient = new QueryClient();

// Chunk de rota inexistente após novo deploy: recarrega uma única vez por sessão.
window.addEventListener('vite:preloadError', (event) => {
  try {
    if (sessionStorage.getItem('preload-reloaded')) return;
    sessionStorage.setItem('preload-reloaded', '1');
  } catch {
    return; // sem sessionStorage não dá para garantir uma só vez; o boundary mostra o aviso
  }
  event.preventDefault();
  window.location.reload();
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <RealtimeLifecycle />
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
);
