import { type CSSProperties, Suspense, useEffect, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { ChunkErrorBoundary } from './ChunkErrorBoundary';
import { formatBRL, type Wallet } from '@leilao/shared';
import { useQuery } from '@tanstack/react-query';
import { useLogout, useMe } from '../features/auth/session';
import { walletQueryKey } from '../features/wallet/wallet';
import { apiFetch } from '../lib/api';
import { OutbidToast } from './OutbidToast';
import { ThemeToggle } from './ThemeToggle';

const ROLE_LABEL = { AUCTIONEER: 'Leiloeiro', BIDDER: 'Licitante' } as const;

function WalletHeaderLink({ userId }: { userId: string }) {
  const wallet = useQuery({
    queryKey: walletQueryKey(userId),
    queryFn: () => apiFetch<Wallet>('/api/wallet'),
  });
  return (
    <Link to="/carteira">
      Carteira{wallet.data ? ` · ${formatBRL(wallet.data.availableCents)}` : ''}
    </Link>
  );
}

const SR_ONLY: CSSProperties = {
  position: 'absolute',
  width: 1,
  height: 1,
  overflow: 'hidden',
  clip: 'rect(0 0 0 0)',
  whiteSpace: 'nowrap',
};

/** Fallback do Suspense: o texto é anunciado pela região `role="status"` persistente do Layout. */
function RouteLoading({ onChange }: { onChange: (loading: boolean) => void }) {
  useEffect(() => {
    onChange(true);
    return () => onChange(false);
  }, [onChange]);
  return <p aria-hidden="true">Carregando página…</p>;
}

export function Layout() {
  const [loading, setLoading] = useState(false);
  const location = useLocation();
  const user = useMe();
  const logout = useLogout();
  const navigate = useNavigate();

  return (
    <>
      <header className="site-header">
        <Link to="/" className="brand">
          Casa de Leilões
        </Link>
        <nav aria-label="Principal">
          {user?.role === 'BIDDER' ? (
            <>
              <WalletHeaderLink userId={user.id} />
              <Link to="/meus-lances">Meus arremates</Link>
            </>
          ) : (
            user && <Link to="/carteira">Carteira</Link>
          )}
          {user?.role === 'AUCTIONEER' && (
            <>
              <Link to="/painel">Painel</Link>
              <Link to="/painel/novo">Novo lote</Link>
            </>
          )}
          {user ? (
            <>
              <span className="user-badge">
                {user.name} · {ROLE_LABEL[user.role]}
              </span>
              <button
                type="button"
                onClick={() => logout.mutate(undefined, { onSuccess: () => navigate('/') })}
              >
                Sair
              </button>
            </>
          ) : (
            user === null && (
              <>
                <Link to="/entrar">Entrar</Link>
                <Link to="/cadastro">Criar conta</Link>
              </>
            )
          )}
          <ThemeToggle />
        </nav>
      </header>
      <main id="conteudo">
        <div role="status" aria-live="polite" style={SR_ONLY}>
          {loading ? 'Carregando página…' : ''}
        </div>
        <ChunkErrorBoundary key={location.pathname}>
          <Suspense fallback={<RouteLoading onChange={setLoading} />}>
            <Outlet />
          </Suspense>
        </ChunkErrorBoundary>
      </main>
      <OutbidToast sessionKey={user?.id} />
    </>
  );
}
