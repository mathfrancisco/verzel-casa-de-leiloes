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

// Camada 3: o que a verificação NÃO prova. Fica visível em qualquer resultado, inclusive o inconclusivo.
function LimitsNote() {
  return (
    <aside className="audit-limits" aria-labelledby="audit-limits-title">
      <h3 id="audit-limits-title">Limites desta verificação</h3>
      <ul>
        <li>
          A chave pública vem da própria API: a verificação prova a consistência da cadeia com
          aquela chave, não a identidade independente do servidor.
        </li>
        <li>
          Remover os últimos elos de um lote ativo não é detectável; só lotes liquidados têm o
          comprovante para cruzar o hash final.
        </li>
        <li>
          Quem controla o banco de dados e a chave privada ao mesmo tempo poderia reescrever a
          cadeia.
        </li>
      </ul>
    </aside>
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
    // verdict nulo = a verificação não terminou (exceção): inconclusivo, nunca íntegro.
    verdict: AuditVerdict | null;
    durationMs: number;
  } | null>(null);
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>('idle');

  useEffect(() => {
    let active = true;
    setLocalVerification(null);
    setCopyState('idle');
    if (!audit.data) return;
    const startedAt = performance.now();
    // Decodifica dentro da promessa: uma chave malformada vira resultado inconclusivo, não erro de render.
    void Promise.resolve()
      .then(() =>
        verifyChain(audit.data, base64urlToBytes(audit.data.publicKey), new BrowserAuditCrypto()),
      )
      .then(
        (verdict): AuditVerdict | null => verdict,
        (): AuditVerdict | null => null,
      )
      .then((verdict) => {
        if (!active) return;
        setLocalVerification({
          report: audit.data,
          verdict,
          durationMs: Math.round(performance.now() - startedAt),
        });
      });
    return () => {
      active = false;
    };
  }, [audit.data]);

  async function copyHash(hash: string) {
    try {
      await navigator.clipboard.writeText(hash);
      setCopyState('copied');
    } catch {
      setCopyState('failed');
    }
  }

  if (audit.isPending) return <p>Carregando auditoria…</p>;
  if (audit.isError) {
    return (
      <section>
        <h1>Auditoria indisponível</h1>
        <p className="audit-verdict">Verificação inconclusiva</p>
        <p className="form-error" role="alert">
          {messageFor(audit.error)}
        </p>
        <p>
          Não foi possível obter os dados da cadeia, então nenhuma verificação foi feita. Isso não
          indica que o lote foi alterado nem que está correto.
        </p>
        <LimitsNote />
      </section>
    );
  }
  if (!audit.data) return null;
  const report = audit.data;
  const current = localVerification?.report === report ? localVerification : null;
  const localVerdict = current?.verdict ?? null;
  const verificationMs = current ? current.durationMs : null;
  const outcome: 'pending' | 'intact' | 'invalid' | 'inconclusive' = !current
    ? 'pending'
    : !localVerdict
      ? 'inconclusive'
      : localVerdict.status === 'INTACT'
        ? 'intact'
        : 'invalid';
  const firstFailure = localVerdict?.checks.find((check) => !check.ok);

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

      <section aria-labelledby="audit-summary-title">
        <h2 id="audit-summary-title">Resultado da verificação</h2>
        <p
          className={`audit-verdict ${outcome === 'intact' ? 'audit-intact' : outcome === 'invalid' ? 'audit-tampered' : ''}`}
          aria-live="polite"
        >
          {outcome === 'pending' && 'Verificando a cadeia neste navegador…'}
          {outcome === 'intact' && '✓ Cadeia íntegra'}
          {outcome === 'invalid' && '✗ Cadeia com inconsistências'}
          {outcome === 'inconclusive' && 'Verificação inconclusiva'}
        </p>
        {outcome === 'intact' && (
          <p>
            A sequência, os hashes e as assinaturas conferem com a chave pública enviada pelo
            servidor.
          </p>
        )}
        {outcome === 'invalid' && firstFailure && (
          <p>
            Primeira verificação que falhou: {firstFailure.id}
            {firstFailure.failedAtSeq !== undefined ? ` (elo ${firstFailure.failedAtSeq})` : ''}
            {firstFailure.detail ? `: ${firstFailure.detail}` : ''}
          </p>
        )}
        {outcome === 'inconclusive' && (
          <p>
            A verificação não foi concluída (por exemplo, chave pública malformada ou falha ao
            calcular as assinaturas). Nenhum resultado de integridade foi produzido; isso não
            significa que a cadeia está correta nem que foi alterada.
          </p>
        )}
        {verificationMs !== null && outcome !== 'inconclusive' && (
          <p>Verificação local concluída em {verificationMs} ms.</p>
        )}
        <p>
          Hash final da cadeia: <code className="audit-key">{report.lot.headHash}</code>{' '}
          <button type="button" onClick={() => void copyHash(report.lot.headHash)}>
            Copiar hash
          </button>
        </p>
        <p role="status" className={copyState === 'failed' ? 'form-error' : undefined}>
          {copyState === 'copied' && 'Hash copiado.'}
          {copyState === 'failed' &&
            'Não foi possível copiar automaticamente. Selecione o hash acima e copie manualmente.'}
        </p>
        <LimitsNote />
      </section>

      <details className="audit-details">
        <summary>Detalhes técnicos: verificações, hashes e elos</summary>
        <h3 id="audit-checks-title">Verificações</h3>
        {!localVerdict ? (
          <p>
            {outcome === 'pending'
              ? 'Calculando hashes e assinaturas com a chave pública.'
              : 'Sem verificações individuais: a verificação não foi concluída.'}
          </p>
        ) : (
          <ul className="audit-checks" aria-labelledby="audit-checks-title">
            {localVerdict.checks.map((check) => (
              <li key={check.id} className={check.ok ? 'audit-intact' : 'audit-tampered'}>
                {check.ok ? '✓' : '✗'} {check.id}
                {!check.ok && check.failedAtSeq !== undefined ? ` (elo ${check.failedAtSeq})` : ''}
                {!check.ok && check.detail ? `: ${check.detail}` : ''}
              </li>
            ))}
          </ul>
        )}

        <h3 id="audit-entries-title">Elos da cadeia</h3>
        {report.entries.length === 0 ? (
          <p>O lote ainda não possui elos além da gênese.</p>
        ) : (
          <div className="audit-table-wrap">
            <table aria-labelledby="audit-entries-title">
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

        <h3>Como verificar</h3>
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
      </details>
    </section>
  );
}
