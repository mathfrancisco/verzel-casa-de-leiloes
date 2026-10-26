import {
  base64urlToBytes,
  BrowserAuditCrypto,
  formatBRL,
  receiptSignatureBytes,
  type Receipt,
} from '@leilao/shared';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ApiError, apiFetch } from '../../lib/api';
import { messageFor } from '../../lib/errorMessages';

type LocalResult = { receipt: Receipt; ok: boolean; durationMs: number };

export function ReceiptPage() {
  const { code = '' } = useParams();
  const receipt = useQuery({
    queryKey: ['receipt', code],
    queryFn: () => apiFetch<Receipt>(`/api/receipts/${encodeURIComponent(code)}`),
    retry: false,
  });
  const [local, setLocal] = useState<LocalResult | null>(null);
  useEffect(() => {
    if (!receipt.data) return;
    const snapshot = receipt.data;
    const start = performance.now();
    void new BrowserAuditCrypto()
      .verify(
        base64urlToBytes(snapshot.publicKey),
        base64urlToBytes(snapshot.signature),
        receiptSignatureBytes({
          lotId: snapshot.lot.id,
          finalHash: snapshot.finalHash,
          amountCents: snapshot.amountCents,
          winnerPseudonym: snapshot.winnerPseudonym,
          issuedAt: snapshot.issuedAt,
        }),
      )
      .then((ok) =>
        setLocal({ receipt: snapshot, ok, durationMs: Math.round(performance.now() - start) }),
      )
      .catch(() =>
        setLocal({
          receipt: snapshot,
          ok: false,
          durationMs: Math.round(performance.now() - start),
        }),
      );
  }, [receipt.data]);
  if (receipt.isPending) return <p role="status">Carregando comprovante…</p>;
  if (receipt.isError)
    return receipt.error instanceof ApiError && receipt.error.status === 404 ? (
      <section>
        <h1>Comprovante não encontrado</h1>
        <p>Confira o link compartilhado ou volte para a vitrine.</p>
        <Link to="/">Voltar para a vitrine</Link>
      </section>
    ) : (
      <p className="form-error" role="alert">
        {messageFor(receipt.error)}
      </p>
    );
  if (!receipt.data) return null;
  const data = receipt.data;
  const verified = local?.receipt === data ? local : null;
  return (
    <section className="receipt-page" aria-labelledby="receipt-title">
      <h1 id="receipt-title">Comprovante de arremate</h1>
      <h2>{data.lot.title}</h2>
      <img className="receipt-image" src={data.lot.imageUrl} alt={`Imagem de ${data.lot.title}`} />
      {data.lot.item.artist && <p>Artista: {data.lot.item.artist}</p>}
      <dl>
        <div>
          <dt>Valor</dt>
          <dd>{formatBRL(data.amountCents)}</dd>
        </div>
        <div>
          <dt>Vencedor</dt>
          <dd>{data.winnerPseudonym}</dd>
        </div>
        <div>
          <dt>Emitido em</dt>
          <dd>
            <time dateTime={data.issuedAt}>{new Date(data.issuedAt).toLocaleString('pt-BR')}</time>
          </dd>
        </div>
        <div>
          <dt>Hash final</dt>
          <dd>
            <code className="receipt-hash">{data.finalHash}</code>
          </dd>
        </div>
      </dl>
      <p
        aria-live="polite"
        className={verified ? (verified.ok ? 'audit-intact' : 'audit-tampered') : ''}
      >
        {verified
          ? verified.ok
            ? '✓ Assinatura verificada neste navegador'
            : '✗ Assinatura inválida'
          : 'Verificando assinatura neste navegador…'}
      </p>
      {verified && <p>Verificação local concluída em {verified.durationMs} ms.</p>}
      {data.revoked && (
        <p className="form-error" role="alert">
          Este comprovante foi revogado.
        </p>
      )}
      <Link to={data.auditUrl}>Auditar este lote</Link>
    </section>
  );
}
