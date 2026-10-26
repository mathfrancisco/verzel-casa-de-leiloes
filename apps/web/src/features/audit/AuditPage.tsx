import {
  base64urlToBytes,
  BrowserAuditCrypto,
  formatBRL,
  verifyChain,
  type AuditReportResponse,
  type AuditVerdict,
} from '@leilao/shared';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CancelledNotice } from '../../components/CancelledNotice';
import { apiFetch } from '../../lib/api';
import { messageFor } from '../../lib/errorMessages';

function shortHash(hash: string) {
  return `${hash.slice(0, 12)}…${hash.slice(-8)}`;
}

function cancelReason(report: AuditReportResponse): string | null {
  const payload = report.entries.find((entry) => entry.type === 'CANCELLED')?.payload;
  const reason =
    payload && typeof payload === 'object' && !Array.isArray(payload) ? payload.reason : null;
  return typeof reason === 'string' && reason ? reason : null;
}
function dateTime(value: string) {
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'medium' }).format(
    new Date(value),
  );
}

export function AuditPage() {
  const { lotId = '' } = useParams();
  const audit = useQuery({
    queryKey: ['audit', lotId],
    queryFn: () => apiFetch<AuditReportResponse>(`/api/lots/${lotId}/audit`),
    enabled: Boolean(lotId),
    retry: false,
  });
  const [localVerification, setLocalVerification] = useState<{
    report: AuditReportResponse;
    verdict: AuditVerdict;
    durationMs: number;
  } | null>(null);

  useEffect(() => {
    let active = true;
    setLocalVerification(null);
    if (!audit.data) return;
    const startedAt = performance.now();
    void verifyChain(audit.data, base64urlToBytes(audit.data.publicKey), new BrowserAuditCrypto())
      .then((verdict) => {
        if (!active) return;
        setLocalVerification({
          report: audit.data,
          verdict,
          durationMs: Math.round(performance.now() - startedAt),
        });
      })
      .catch(() => {
        if (!active) return;
        setLocalVerification({
          report: audit.data,
          verdict: {
            status: 'TAMPERED',
            checks: [
              { id: 'SIGNATURES', ok: false, detail: 'Não foi possível verificar a assinatura.' },
            ],
          },
          durationMs: Math.round(performance.now() - startedAt),
        });
      });
    return () => {
      active = false;
    };
  }, [audit.data]);

  if (audit.isPending) return <p>Carregando auditoria…</p>;
  if (audit.isError) {
    return (
      <section>
        <h1>Auditoria indisponível</h1>
        <p className="form-error" role="alert">
          {messageFor(audit.error)}
        </p>
      </section>
    );
  }
  if (!audit.data) return null;
  const report = audit.data;
  const localVerdict = localVerification?.report === report ? localVerification.verdict : null;
  const verificationMs = localVerification?.report === report ? localVerification.durationMs : null;
  const verified = localVerdict?.status === 'INTACT';

  return (
    <section className="audit-page" aria-labelledby="audit-title">
      <Link to={`/lotes/${lotId}`}>Voltar ao lote</Link>
      <h1 id="audit-title">Auditoria pública</h1>
      <h2>{report.lot.title}</h2>
      {report.lot.state === 'CANCELLED' && (
        <CancelledNotice>
          {cancelReason(report) ? `Motivo informado: ${cancelReason(report)}. ` : ''}
          Os elos abaixo continuam verificáveis; o evento CANCELLED faz parte da cadeia.
        </CancelledNotice>
      )}
      <p
        className={`audit-verdict ${localVerdict ? (verified ? 'audit-intact' : 'audit-tampered') : ''}`}
        aria-live="polite"
      >
        {localVerdict
          ? verified
            ? '✓ Cadeia íntegra'
            : '✗ Cadeia com inconsistências'
          : 'Verificando a cadeia neste navegador…'}
      </p>
      {verificationMs !== null && <p>Verificação local concluída em {verificationMs} ms.</p>}

      <section aria-labelledby="audit-checks-title">
        <h2 id="audit-checks-title">Verificações</h2>
        {!localVerdict ? (
          <p>Calculando hashes e assinaturas com a chave pública.</p>
        ) : (
          <ul className="audit-checks">
            {localVerdict.checks.map((check) => (
              <li key={check.id} className={check.ok ? 'audit-intact' : 'audit-tampered'}>
                {check.ok ? '✓' : '✗'} {check.id}
                {!check.ok && check.failedAtSeq !== undefined ? ` (elo ${check.failedAtSeq})` : ''}
                {!check.ok && check.detail ? `: ${check.detail}` : ''}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="audit-entries-title">
        <h2 id="audit-entries-title">Elos da cadeia</h2>
        {report.entries.length === 0 ? (
          <p>O lote ainda não possui elos além da gênese.</p>
        ) : (
          <div className="audit-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Seq.</th>
                  <th>Evento</th>
                  <th>Pseudônimo</th>
                  <th>Hash</th>
                  <th>Data</th>
                  <th>Valor</th>
                </tr>
              </thead>
              <tbody>
                {report.entries.map((entry) => (
                  <tr key={entry.seq}>
                    <td>{entry.seq}</td>
                    <td>{entry.type}</td>
                    <td>{entry.bidderPseudonym ?? '—'}</td>
                    <td>
                      <code title={entry.hash}>{shortHash(entry.hash)}</code>
                    </td>
                    <td>
                      <time dateTime={entry.createdAt}>{dateTime(entry.createdAt)}</time>
                    </td>
                    <td>{entry.amountCents === null ? '—' : formatBRL(entry.amountCents)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section aria-labelledby="audit-how-title">
        <h2 id="audit-how-title">Como verificar</h2>
        <p>
          Esta página recalcula a gênese, todos os hashes e as assinaturas Ed25519 localmente no seu
          navegador.
        </p>
        <p>
          Chave pública Ed25519: <code className="audit-key">{report.publicKey}</code>
        </p>
        <p>
          Snapshot do servidor:{' '}
          <time dateTime={report.serverTime}>{dateTime(report.serverTime)}</time>.
        </p>
      </section>
    </section>
  );
}
