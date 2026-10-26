import { formatBRL, type Participation, type ParticipationsResponse } from '@leilao/shared';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../../lib/api';
import { messageFor } from '../../lib/errorMessages';

type Tab = 'OPEN' | 'WON' | 'CLOSED';
const tabs: { id: Tab; label: string; statuses: Participation['status'][] }[] = [
  { id: 'OPEN', label: 'Participando', statuses: ['WINNING', 'OUTBID'] },
  { id: 'WON', label: 'Arrematados', statuses: ['WON'] },
  { id: 'CLOSED', label: 'Encerrados sem vitória', statuses: ['LOST', 'CANCELLED'] },
];
const statusLabel: Record<Participation['status'], string> = {
  WINNING: 'Ganhando',
  OUTBID: 'Superado',
  WON: 'Arrematado',
  LOST: 'Encerrado sem vitória',
  CANCELLED: 'Cancelado',
};
export async function shareReceipt(code: string): Promise<'shared' | 'copied'> {
  const url = new URL(`/comprovante/${code}`, window.location.origin).toString();
  if (navigator.share) {
    await navigator.share({ title: 'Comprovante de arremate', url });
    return 'shared';
  }
  await navigator.clipboard.writeText(url);
  return 'copied';
}
export function ParticipationsPage() {
  const [tab, setTab] = useState<Tab>('OPEN');
  const [notice, setNotice] = useState('');
  const query = useQuery({
    queryKey: ['participations'],
    queryFn: () => apiFetch<ParticipationsResponse>('/api/me/participations'),
  });
  if (query.isPending) return <p role="status">Carregando seus lances…</p>;
  if (query.isError)
    return (
      <p className="form-error" role="alert">
        {messageFor(query.error)}
      </p>
    );
  const items = query.data.items.filter((item) =>
    tabs.find((x) => x.id === tab)!.statuses.includes(item.status),
  );
  return (
    <section aria-labelledby="participations-title">
      <h1 id="participations-title">Meus arremates</h1>
      <div role="tablist" aria-label="Lotes em que participei">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={tab === item.id}
            onClick={() => setTab(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>
      <p aria-live="polite">{notice}</p>
      {items.length === 0 ? (
        <p className="empty-state">Nenhum lote nesta aba.</p>
      ) : (
        <ul className="wallet-list">
          {items.map((item) => (
            <li key={item.lotId}>
              <span>
                <Link to={`/lotes/${item.lotId}`}>{item.title}</Link> · {statusLabel[item.status]} ·
                seu melhor lance {formatBRL(item.myBestBidCents)}
              </span>
              {item.receiptCode && (
                <span>
                  <Link to={`/comprovante/${item.receiptCode}`}>Comprovante</Link>{' '}
                  <button
                    type="button"
                    onClick={() =>
                      void shareReceipt(item.receiptCode!)
                        .then((result) =>
                          setNotice(result === 'copied' ? 'Link copiado.' : 'Link compartilhado.'),
                        )
                        .catch(() => setNotice('Não foi possível compartilhar o link.'))
                    }
                  >
                    Compartilhar
                  </button>
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
