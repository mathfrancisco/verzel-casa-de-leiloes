import { useEffect, useState } from 'react';
import { fetchHealth } from './lib/health';

type ApiStatus = 'checking' | 'online' | 'offline';

const STATUS_TEXT: Record<ApiStatus, string> = {
  checking: 'Verificando a API…',
  online: 'API no ar',
  offline: 'API indisponível',
};

export function App() {
  const [status, setStatus] = useState<ApiStatus>('checking');

  useEffect(() => {
    fetchHealth()
      .then(() => setStatus('online'))
      .catch(() => setStatus('offline'));
  }, []);

  return (
    <main>
      <h1>Casa de Leilões</h1>
      <p role="status">{STATUS_TEXT[status]}</p>
    </main>
  );
}
