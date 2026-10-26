import { formatBRL, type LotEntryView } from '@leilao/shared';
import { memo } from 'react';

interface LotHistoryProps {
  entries: LotEntryView[];
  myPseudonym: string | undefined;
  position: number | null | undefined;
}

/** Histórico isolado: só re-renderiza quando os lances (ou a posição do usuário) mudam. */
export const LotHistory = memo(function LotHistory({
  entries,
  myPseudonym,
  position,
}: LotHistoryProps) {
  const dateFormat = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
  return (
    <section className="lot-history" aria-labelledby="lot-history-title">
      <h2 id="lot-history-title">Histórico de lances</h2>
      {entries.length === 0 ? (
        <p>Ainda não há lances.</p>
      ) : (
        <ol>
          {entries.map((entry) => (
            <li key={entry.seq}>
              <span>{entry.bidderPseudonym ?? entry.type}</span>
              {entry.amountCents !== null && <strong>{formatBRL(entry.amountCents)}</strong>}
              <time dateTime={entry.createdAt}>{dateFormat.format(new Date(entry.createdAt))}</time>
              {entry.bidderPseudonym === myPseudonym && ' (você)'}
            </li>
          ))}
        </ol>
      )}
      {position !== null && position !== undefined && <p>Sua posição: {position}ª</p>}
    </section>
  );
});
