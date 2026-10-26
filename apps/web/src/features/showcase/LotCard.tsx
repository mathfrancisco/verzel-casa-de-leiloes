import { formatBRL, LOT_CATEGORIES, type LotSummary } from '@leilao/shared';
import { Link } from 'react-router-dom';
import { Countdown } from './Countdown';
import { priceLine } from './showcase';

export function LotCard({ lot, onPhaseChange }: { lot: LotSummary; onPhaseChange: () => void }) {
  const price = priceLine(lot);
  return (
    <article className="lot-card">
      <Link to={`/lotes/${lot.id}`} className="lot-card-link">
        <img src={lot.imageUrl} alt="" loading="lazy" decoding="async" width={400} height={300} />
        <h2>{lot.title}</h2>
      </Link>
      <p className="lot-category">{LOT_CATEGORIES[lot.category]}</p>
      <p className="lot-price">
        {price.label}
        {price.amountCents !== null && <strong> {formatBRL(price.amountCents)}</strong>}
      </p>
      <p className="lot-bids">{lot.bidCount === 1 ? '1 lance' : `${lot.bidCount} lances`}</p>
      {lot.phase === 'LIVE' && (
        <Countdown label="Termina em" target={lot.endsAt} onElapsed={onPhaseChange} />
      )}
      {lot.phase === 'SCHEDULED' && (
        <Countdown label="Começa em" target={lot.startsAt} onElapsed={onPhaseChange} />
      )}
      {lot.phase === 'CLOSING' && <p className="countdown">Encerrado — apurando resultado</p>}
    </article>
  );
}
