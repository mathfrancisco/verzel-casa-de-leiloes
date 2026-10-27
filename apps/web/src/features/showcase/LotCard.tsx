import { formatBRL, LOT_CATEGORIES, type LotSummary } from '@leilao/shared';
import { Link } from 'react-router-dom';
import { Icon } from '../../components/Icon';
import { Countdown } from './Countdown';
import { priceLine } from './showcase';

const PHASE_CHIP = {
  LIVE: { text: 'Ao vivo', tone: 'live' },
  SCHEDULED: { text: 'Agendado', tone: 'scheduled' },
  CLOSING: { text: 'Apurando', tone: 'closed' },
  SETTLED: { text: 'Encerrado', tone: 'closed' },
  UNSOLD: { text: 'Encerrado', tone: 'closed' },
  CANCELLED: { text: 'Cancelado', tone: 'closed' },
} as const;

export function LotCard({ lot, onPhaseChange }: { lot: LotSummary; onPhaseChange: () => void }) {
  const price = priceLine(lot);
  const chip = PHASE_CHIP[lot.phase as keyof typeof PHASE_CHIP];
  return (
    <article className="lot-card">
      <div className="lot-media">
        <Link to={`/lotes/${lot.id}`} className="lot-media-link" tabIndex={-1} aria-hidden="true">
          <img src={lot.imageUrl} alt="" loading="lazy" decoding="async" width={400} height={300} />
        </Link>
        {chip && <span className={`phase-chip phase-${chip.tone}`}>{chip.text}</span>}
      </div>
      <p className="lot-meta">
        <span className="lot-bids">
          <Icon name="users" size={14} />
          {lot.bidCount === 1 ? '1 lance' : `${lot.bidCount} lances`}
        </span>
        <span className="lot-category">{LOT_CATEGORIES[lot.category]}</span>
      </p>
      <h2>
        <Link to={`/lotes/${lot.id}`} className="lot-card-link">
          {lot.title}
        </Link>
      </h2>
      <div className="lot-foot">
        <div className="lot-foot-info">
          <p className="lot-min">Lance inicial {formatBRL(lot.startingPriceCents)}</p>
          {lot.phase === 'LIVE' && (
            <Countdown label="Termina em" target={lot.endsAt} onElapsed={onPhaseChange} />
          )}
          {lot.phase === 'SCHEDULED' && (
            <Countdown label="Começa em" target={lot.startsAt} onElapsed={onPhaseChange} />
          )}
          {lot.phase === 'CLOSING' && <p className="countdown">Encerrado — apurando resultado</p>}
        </div>
        {lot.currentPriceCents !== null && price.amountCents !== null && (
          <p className="lot-price">
            <span className="sr-only">{price.label} </span>
            <strong>{formatBRL(price.amountCents)}</strong>
          </p>
        )}
      </div>
    </article>
  );
}
