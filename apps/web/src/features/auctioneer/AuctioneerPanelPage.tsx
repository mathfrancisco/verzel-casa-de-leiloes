import { formatBRL, type AuctioneerLot, type AuctioneerLotsResponse } from '@leilao/shared';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useMe } from '../auth/session';
import { apiFetch } from '../../lib/api';
import { messageFor } from '../../lib/errorMessages';
import { CancelLotControl } from './CancelLotControl';

const phaseLabels: Record<AuctioneerLot['phase'], string> = {
  SCHEDULED: 'Agendado',
  LIVE: 'Ao vivo',
  CLOSING: 'Encerrado — apurando resultado',
  SETTLED: 'Encerrado',
  UNSOLD: 'Encerrado',
  CANCELLED: 'Cancelado',
};

function resultLabel(lot: AuctioneerLot): string {
  switch (lot.result) {
    case 'SOLD':
      return `Arrematado por ${formatBRL(lot.finalPriceCents!)}`;
    case 'UNSOLD':
      return 'Sem vencedor';
    case 'CANCELLED':
      return 'Cancelado';
    default:
      return 'Pendente';
  }
}

export function AuctioneerPanelPage() {
  const user = useMe();
  const query = useQuery({
    queryKey: ['auctioneer-lots', user?.id],
    queryFn: () => apiFetch<AuctioneerLotsResponse>('/api/auctioneer/lots'),
    enabled: Boolean(user?.id),
  });

  if (query.isPending) return <p role="status">Carregando seus lotes…</p>;
  if (query.isError)
    return (
      <p className="form-error" role="alert">
        {messageFor(query.error)}
      </p>
    );

  const { items, totalReceivedCents } = query.data;
  return (
    <section className="auctioneer-panel" aria-labelledby="painel-title">
      <div className="auctioneer-panel-heading">
        <div>
          <h1 id="painel-title">Painel do leiloeiro</h1>
          <p>Acompanhe os resultados dos seus lotes.</p>
        </div>
        <Link className="button-link" to="/painel/novo">
          Novo lote
        </Link>
      </div>
      <dl className="auctioneer-total">
        <dt>Total recebido</dt>
        <dd>{formatBRL(totalReceivedCents)}</dd>
      </dl>

      {items.length === 0 ? (
        <p>Ainda não há lotes no seu painel. Crie seu primeiro lote para começar.</p>
      ) : (
        <ul className="auctioneer-lot-list">
          {items.map((lot) => (
            <li key={lot.id}>
              <img src={lot.imageUrl} alt="" />
              <div>
                <h2>{lot.title}</h2>
                <p>
                  Fase: {phaseLabels[lot.phase]} · Resultado: <strong>{resultLabel(lot)}</strong>
                </p>
                <p>
                  Preço atual:{' '}
                  {lot.currentPriceCents === null ? 'sem lances' : formatBRL(lot.currentPriceCents)}
                </p>
                <p className="auctioneer-links">
                  <Link to={`/lotes/${lot.id}`}>Ver sala</Link>
                  <Link to={`/auditoria/${lot.id}`}>Auditar lote</Link>
                </p>
                <CancelLotControl lot={lot} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
