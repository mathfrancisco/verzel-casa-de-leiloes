import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMe } from '../auth/session';

/** Chave de localStorage: lembra que o visitante já fechou a apresentação. */
export const INTRO_DISMISSED_KEY = 'intro-dismissed';

function wasDismissed(): boolean {
  try {
    return localStorage.getItem(INTRO_DISMISSED_KEY) === '1';
  } catch {
    return false;
  }
}

function rememberDismissal(): void {
  try {
    localStorage.setItem(INTRO_DISMISSED_KEY, '1');
  } catch {
    /* storage indisponível: a faixa some só nesta sessão */
  }
}

/** Faixa curta no topo da vitrine que apresenta o produto; dispensável. */
export function IntroStrip() {
  const me = useMe();
  const [dismissed, setDismissed] = useState(wasDismissed);
  if (dismissed) return null;

  const close = () => {
    rememberDismissal();
    setDismissed(true);
  };

  return (
    <aside className="intro-strip" aria-label="Apresentação">
      <button
        type="button"
        className="secondary intro-close"
        aria-label="Fechar apresentação"
        onClick={close}
      >
        <span aria-hidden="true">×</span>
      </button>
      <p className="intro-lead">
        Leilões de arte do Art Institute of Chicago, com lances ao vivo e histórico auditável.
      </p>
      <ol className="intro-steps">
        <li>Deposite saldo simulado.</li>
        <li>Dê lances ao vivo.</li>
        <li>Audite qualquer lote (hash encadeado e assinado).</li>
      </ol>
      <details className="intro-more">
        <summary>Como funciona</summary>
        <p>
          O saldo é simulado: nenhum dinheiro real é movimentado. Cada lance é validado pelo
          servidor e entra numa cadeia de hashes assinada, que qualquer pessoa pode conferir na
          página de auditoria do lote, sem precisar de conta.
        </p>
      </details>
      {me === null && (
        <p className="intro-login">
          <Link to="/entrar">Entrar</Link> para dar lances. Os usuários de demonstração estão no
          README.
        </p>
      )}
    </aside>
  );
}
