import { formatBRL, parseBRL, type BidResponse, type LotDetail } from '@leilao/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CancelledNotice } from '../../components/CancelledNotice';
import { useMe } from '../auth/session';
import { Countdown } from '../showcase/Countdown';
import { useLotChannel } from '../showcase/useLotChannel';
import { ApiError, apiFetch } from '../../lib/api';
import { bidMessageFor, messageFor } from '../../lib/errorMessages';
import { syncServerTime } from '../../lib/serverClock';
import {
  BidAttempts,
  bidStatus,
  isDeterministicBidFailure,
  shouldApplyBidSnapshot,
} from './lotRoom';
import { BidErrorNotice, type BidErrorNoticeValue } from './BidErrorNotice';

const attempts = new BidAttempts();

function randomKey() {
  return crypto.randomUUID();
}

function displayedSeq(lot: LotDetail | undefined) {
  return Math.max(0, ...(lot?.recentEntries ?? []).map((entry) => entry.seq));
}

function statusText(lot: LotDetail) {
  const status = bidStatus({
    phase: lot.phase,
    myPseudonym: lot.me?.myPseudonym,
    myBestBidCents: lot.me?.myBestBidCents,
    leaderPseudonym: lot.leaderPseudonym,
    bidCount: lot.bidCount,
  });
  if (status === 'winning') return '✓ Você está ganhando';
  if (status === 'outbid') return '⚠ Você foi superado';
  if (status === 'first') return 'Faça seu primeiro lance';
  if (status === 'closed') {
    if (lot.phase === 'UNSOLD') return 'Lote encerrado sem vencedor';
    return lot.me?.isLeader ? 'Lote encerrado — você venceu' : 'Lote encerrado — você não venceu';
  }
  if (lot.phase === 'CANCELLED') return 'Lote cancelado';
  if (lot.phase === 'SCHEDULED') return 'Este lote ainda não começou';
  if (lot.phase === 'CLOSING') return 'Lote encerrado — apurando resultado';
  return lot.phase === 'LIVE' ? 'Acompanhe os lances ao vivo' : 'Lote encerrado';
}

function attributes(lot: LotDetail) {
  return [
    ['Artista', lot.item.artist],
    ['Data', lot.item.date],
    ['Técnica', lot.item.medium],
    ['Dimensões', lot.item.dimensions],
    ['Origem', lot.item.origin],
  ].filter(([, value]) => value) as [string, string][];
}

export function LotRoomPage() {
  const { id = '' } = useParams();
  const user = useMe();
  const queryClient = useQueryClient();
  const queryKey = ['lot', id, user?.id ?? 'visitor'] as const;
  const lot = useQuery({
    queryKey,
    queryFn: async () => {
      const detail = await apiFetch<LotDetail>(`/api/lots/${id}`);
      syncServerTime(detail.serverTime);
      return detail;
    },
    enabled: Boolean(id) && user !== undefined,
    retry: false,
  });
  const detail = lot.data;
  const [amount, setAmount] = useState('');
  const [error, setError] = useState<BidErrorNoticeValue | null>(null);
  const displayed = displayedSeq(detail);
  const currentLot = useRef(id);
  const currentUserId = useRef(user?.id);
  const newestSeq = useRef(displayed);
  const submissionNumber = useRef(0);
  const activeSubmission = useRef<number | null>(null);

  currentUserId.current = user?.id;
  newestSeq.current =
    currentLot.current === id ? Math.max(newestSeq.current, displayed) : displayed;

  useEffect(() => {
    currentLot.current = id;
    activeSubmission.current = null;
    setAmount('');
    setError(null);
  }, [id]);

  const minimumNextBidCents = detail?.minimumNextBidCents;
  useEffect(() => {
    if (minimumNextBidCents !== undefined) setAmount(formatBRL(minimumNextBidCents));
  }, [minimumNextBidCents]);

  useLotChannel({
    lotId: id,
    displayedSeq: displayed,
    onBidAccepted: (event) => {
      newestSeq.current = Math.max(newestSeq.current, event.seq);
    },
  });

  const bid = useMutation({
    mutationFn: async (amountCents: number) => {
      if (!user) throw new ApiError(401, 'UNAUTHENTICATED', 'Faça login para continuar.');
      const key = attempts.keyFor(user.id, id, amountCents, randomKey);
      try {
        return await apiFetch<BidResponse>(`/api/lots/${id}/bids`, {
          method: 'POST',
          body: { amountCents },
          headers: { 'Idempotency-Key': key },
        });
      } catch (cause) {
        if (cause instanceof ApiError && isDeterministicBidFailure(cause.status)) {
          attempts.resolve(user.id, id, amountCents);
        }
        throw cause;
      }
    },
    onSuccess: async (response, amountCents) => {
      const bidderId = user?.id;
      if (bidderId) attempts.resolve(bidderId, id, amountCents);
      const activeUser = queryClient.getQueryData<{ id: string } | null>(['me']);
      if (
        activeUser?.id === bidderId &&
        shouldApplyBidSnapshot(response.bid.seq, newestSeq.current)
      ) {
        await queryClient.cancelQueries({ queryKey });
        const userAfterCancellation = queryClient.getQueryData<{ id: string } | null>(['me']);
        if (
          userAfterCancellation?.id === bidderId &&
          shouldApplyBidSnapshot(response.bid.seq, newestSeq.current)
        ) {
          queryClient.setQueryData(queryKey, response.lot);
        }
      }
      void queryClient.invalidateQueries({ queryKey: ['lots'] });
      void queryClient.invalidateQueries({ queryKey: ['wallet'] });
      if (currentLot.current === id && currentUserId.current === bidderId) setError(null);
    },
    onError: (cause) => {
      if (currentLot.current !== id || currentUserId.current !== user?.id) return;
      setError({
        message: bidMessageFor(cause),
        deposit: cause instanceof ApiError && cause.code === 'INSUFFICIENT_FUNDS',
      });
    },
  });

  const quickAmounts = useMemo(() => {
    if (!detail) return [];
    return [1, 2, 5].map(
      (multiple) => detail.minimumNextBidCents + multiple * detail.minIncrementCents,
    );
  }, [detail]);

  if (lot.isPending || user === undefined) return <p>Carregando lote…</p>;
  if (lot.isError) {
    return (
      <section>
        <h1>Não foi possível abrir o lote</h1>
        <p className="form-error" role="alert">
          {messageFor(lot.error)}
        </p>
      </section>
    );
  }
  if (!detail) return null;

  const canBid = user?.role === 'BIDDER' && detail.phase === 'LIVE' && !detail.me?.isSeller;
  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (activeSubmission.current !== null || bid.isPending) return;
    const amountCents = parseBRL(amount);
    if (amountCents === null) {
      setError({ message: 'Informe um valor em reais, por exemplo 100,00.', deposit: false });
      return;
    }
    if (amountCents >= 2 * (detail.currentPriceCents ?? detail.startingPriceCents)) {
      if (!window.confirm(`Confirmar lance de ${formatBRL(amountCents)}?`)) return;
    }
    setError(null);
    const submission = ++submissionNumber.current;
    activeSubmission.current = submission;
    bid.mutate(amountCents, {
      onSettled: () => {
        if (activeSubmission.current === submission) activeSubmission.current = null;
      },
    });
  };

  return (
    <section className="lot-room">
      {detail.phase === 'CANCELLED' && <CancelledNotice />}
      <div className="lot-room-main">
        <img className="lot-room-image" src={detail.imageUrl} alt="" />
        <div>
          <p className="lot-category">{detail.category}</p>
          <h1>{detail.title}</h1>
          <p>{detail.description}</p>
          <dl className="lot-attributes">
            {attributes(detail).map(([label, value]) => (
              <Fragment key={label}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </Fragment>
            ))}
          </dl>
          <a href={detail.item.sourceUrl} rel="noreferrer" target="_blank">
            Ver obra no catálogo
          </a>
        </div>
      </div>

      <div className="lot-room-summary">
        <p>
          Preço atual{' '}
          <strong>{formatBRL(detail.currentPriceCents ?? detail.startingPriceCents)}</strong>
        </p>
        <p>
          Próximo lance mínimo <strong>{formatBRL(detail.minimumNextBidCents)}</strong>
        </p>
        {detail.phase === 'LIVE' && (
          <Countdown
            label="Termina em"
            target={detail.endsAt}
            onElapsed={() => void lot.refetch()}
          />
        )}
        {detail.extended && <p className="lot-extended">Prorrogado</p>}
        <p className="lot-status" aria-live="polite">
          {statusText(detail)}
        </p>
      </div>

      {canBid && (
        <form className="bid-form" onSubmit={submit}>
          <label htmlFor="bid-amount">Seu lance</label>
          <input
            id="bid-amount"
            inputMode="decimal"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            disabled={bid.isPending}
          />
          <div className="bid-shortcuts" aria-label="Atalhos de lance">
            {quickAmounts.map((value, index) => (
              <button key={value} type="button" onClick={() => setAmount(formatBRL(value))}>
                +{[1, 2, 5][index]} incremento{index === 0 ? '' : 's'}
              </button>
            ))}
          </div>
          {error && <BidErrorNotice error={error} />}
          <button type="submit" disabled={bid.isPending}>
            {bid.isPending ? 'Enviando lance…' : 'Dar lance'}
          </button>
        </form>
      )}

      <section className="lot-history" aria-labelledby="lot-history-title">
        <h2 id="lot-history-title">Histórico de lances</h2>
        {detail.recentEntries.length === 0 ? (
          <p>Ainda não há lances.</p>
        ) : (
          <ol>
            {detail.recentEntries.map((entry) => (
              <li key={entry.seq}>
                <span>{entry.bidderPseudonym ?? entry.type}</span>
                {entry.amountCents !== null && <strong>{formatBRL(entry.amountCents)}</strong>}
                <time dateTime={entry.createdAt}>
                  {new Intl.DateTimeFormat('pt-BR', {
                    dateStyle: 'short',
                    timeStyle: 'short',
                  }).format(new Date(entry.createdAt))}
                </time>
                {entry.bidderPseudonym === detail.me?.myPseudonym && ' (você)'}
              </li>
            ))}
          </ol>
        )}
        {detail.me?.position !== null && detail.me?.position !== undefined && (
          <p>Sua posição: {detail.me.position}ª</p>
        )}
      </section>
      <Link to={`/auditoria/${detail.id}`}>Auditar este lote</Link>
    </section>
  );
}
