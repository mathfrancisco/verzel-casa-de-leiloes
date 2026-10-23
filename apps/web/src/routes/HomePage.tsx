import { useQuery } from '@tanstack/react-query';
import { fetchHealth } from '../lib/health';

export function HomePage() {
  const health = useQuery({ queryKey: ['health'], queryFn: () => fetchHealth(), retry: false });
  const status = health.isPending
    ? 'Verificando a API…'
    : health.isSuccess
      ? 'API no ar'
      : 'API indisponível';

  return (
    <section>
      <h1>Vitrine</h1>
      <p>Os lotes aparecem aqui em breve.</p>
      <p role="status">{status}</p>
    </section>
  );
}
