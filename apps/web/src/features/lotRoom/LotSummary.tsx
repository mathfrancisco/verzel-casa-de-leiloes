import { formatBRL } from '@leilao/shared';
import { memo } from 'react';
import { Countdown } from '../showcase/Countdown';

interface LotSummaryProps {
  priceCents: number;
  minimumNextBidCents: number;
  live: boolean;
  endsAt: string;
  extended: boolean;
  statusText: string;
  /** Tom visual do status; o texto e o ícone continuam carregando o significado. */
  statusTone?: 'winning' | 'outbid' | 'neutral';
  onElapsed: () => void;
}

/** Preço, cronômetro e status: bloco que muda a cada lance, separado do histórico e do formulário. */
export const LotSummary = memo(function LotSummary({
  priceCents,
  minimumNextBidCents,
  live,
  endsAt,
  extended,
  statusText,
  statusTone = 'neutral',
  onElapsed,
}: LotSummaryProps) {
  return (
    <div className="lot-room-summary">
      <p className="lot-price-main">
        Preço atual <strong>{formatBRL(priceCents)}</strong>
      </p>
      <p className="lot-price-next">
        Próximo lance mínimo <strong>{formatBRL(minimumNextBidCents)}</strong>
      </p>
      {live && <Countdown label="Termina em" target={endsAt} onElapsed={onElapsed} />}
      {extended && <p className="lot-extended">Prorrogado</p>}
      <p className={`lot-status lot-status-${statusTone}`} aria-live="polite">
        {statusText}
      </p>
    </div>
  );
});
