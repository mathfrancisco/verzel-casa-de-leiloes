import { formatBRL, type Wallet } from '@leilao/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRef, useState, type FormEvent } from 'react';
import { FormField } from '../../components/FormField';
import { ApiError, apiFetch } from '../../lib/api';
import { messageFor } from '../../lib/errorMessages';
import { useMe } from '../auth/session';
import {
  buildDepositPayload,
  DepositAttempts,
  isDeterministicDepositFailure,
  walletQueryKey,
} from './wallet';

function entryLabel(entry: Wallet['entries'][number]) {
  const labels: Record<Wallet['entries'][number]['type'], string> = {
    DEPOSIT: 'Depósito simulado',
    SETTLEMENT_DEBIT: 'Pagamento de lote',
    SETTLEMENT_CREDIT: 'Crédito de arremate',
    REFUND_DEBIT: 'Estorno de crédito',
    REFUND_CREDIT: 'Estorno recebido',
  };
  return entry.lotTitle ? `${labels[entry.type]} · ${entry.lotTitle}` : labels[entry.type];
}

export function WalletPage() {
  const user = useMe();
  const client = useQueryClient();
  const [amount, setAmount] = useState('');
  const [localError, setLocalError] = useState('');
  const attempts = useRef(new DepositAttempts());
  const walletKey = user ? walletQueryKey(user.id) : ['wallet', 'anonymous'];
  const wallet = useQuery({
    queryKey: walletKey,
    queryFn: () => apiFetch<Wallet>('/api/wallet'),
    enabled: Boolean(user),
  });
  const deposit = useMutation({
    mutationFn: (attempt: DepositAttempt) =>
      apiFetch<Wallet>('/api/wallet/deposits', {
        method: 'POST',
        body: { amountCents: attempt.amountCents },
        headers: { 'Idempotency-Key': attempt.idempotencyKey },
      }),
    onSuccess: (next, attempt) => {
      attempts.current.resolve(attempt.userId, attempt.amountCents);
      const currentUser = client.getQueryData<{ id: string } | null>(['me']);
      if (currentUser?.id === attempt.userId) {
        client.setQueryData(walletQueryKey(attempt.userId), next);
      }
      setAmount('');
    },
    onError: (error, attempt) => {
      if (isDeterministicDepositFailure(error instanceof ApiError ? error.status : undefined)) {
        attempts.current.resolve(attempt.userId, attempt.amountCents);
      }
    },
  });

  function submit(event: FormEvent) {
    event.preventDefault();
    const payload = buildDepositPayload(amount);
    if (!payload.ok) {
      setLocalError(payload.error);
      return;
    }
    setLocalError('');
    if (!user) return;
    deposit.mutate({
      amountCents: payload.amountCents,
      userId: user.id,
      idempotencyKey: attempts.current.keyFor(user.id, payload.amountCents, () =>
        crypto.randomUUID(),
      ),
    });
  }

  if (wallet.isPending) return <p role="status">Carregando carteira…</p>;
  if (wallet.isError) return <p role="alert">{messageFor(wallet.error)}</p>;
  const data = wallet.data;

  return (
    <section aria-labelledby="titulo-carteira">
      <h1 id="titulo-carteira">Carteira</h1>
      <dl className="wallet-balances">
        <div>
          <dt>Saldo total</dt>
          <dd>{formatBRL(data.totalCents)}</dd>
        </div>
        <div>
          <dt>Saldo comprometido</dt>
          <dd>{formatBRL(data.committedCents)}</dd>
        </div>
        <div>
          <dt>Saldo disponível</dt>
          <dd>{formatBRL(data.availableCents)}</dd>
        </div>
      </dl>

      {user?.role === 'BIDDER' && (
        <form
          className="wallet-deposit"
          onSubmit={submit}
          noValidate
          aria-labelledby="titulo-deposito"
        >
          <h2 id="titulo-deposito">Adicionar saldo</h2>
          <FormField
            label="Valor do depósito (R$)"
            inputMode="decimal"
            placeholder="100,00"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            error={localError}
          />
          <p role="alert" className="form-error">
            {deposit.isError ? messageFor(deposit.error) : ''}
          </p>
          <button type="submit" disabled={deposit.isPending}>
            {deposit.isPending ? 'Adicionando…' : 'Adicionar saldo'}
          </button>
        </form>
      )}

      <h2>Compromissos</h2>
      {data.commitments.length === 0 ? (
        <p>Nenhum saldo comprometido em lotes.</p>
      ) : (
        <ul className="wallet-list">
          {data.commitments.map((commitment) => (
            <li key={commitment.lotId}>
              <span>{commitment.title}</span>
              <strong>{formatBRL(commitment.amountCents)}</strong>
            </li>
          ))}
        </ul>
      )}

      <h2>Extrato</h2>
      {data.entries.length === 0 ? (
        <p>Seu extrato ainda não tem lançamentos.</p>
      ) : (
        <ul className="wallet-list">
          {data.entries.map((entry) => (
            <li key={entry.id}>
              <span>{entryLabel(entry)}</span>
              <strong>{formatBRL(entry.amountCents)}</strong>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

interface DepositAttempt {
  amountCents: number;
  userId: string;
  idempotencyKey: string;
}
