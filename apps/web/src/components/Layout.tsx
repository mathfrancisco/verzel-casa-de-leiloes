import { type CSSProperties, Suspense, useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { ChunkErrorBoundary } from './ChunkErrorBoundary';
import { formatBRL, type UserDto, type Wallet } from '@leilao/shared';
import { useQuery } from '@tanstack/react-query';
import { useLogout, useMe } from '../features/auth/session';
import { walletQueryKey } from '../features/wallet/wallet';
import { apiFetch } from '../lib/api';
import { Icon, type IconName } from './Icon';
import { OutbidToast } from './OutbidToast';
import { ThemeToggle } from './ThemeToggle';

const ROLE_LABEL = { AUCTIONEER: 'Leiloeiro', BIDDER: 'Licitante' } as const;

/** Trilha de navegação por rota (rótulos em português; o primeiro nível é sempre Início). */
function crumbsFor(pathname: string): string[] {
  const [first, second] = pathname.split('/').filter(Boolean);
  switch (first) {
    case undefined:
      return ['Leilões'];
    case 'lotes':
      return ['Leilões', 'Lote'];
    case 'auditoria':
      return ['Leilões', 'Auditoria'];
    case 'comprovante':
      return ['Comprovante'];
    case 'carteira':
      return ['Carteira'];
    case 'meus-lances':
      return ['Meus arremates'];
    case 'painel':
      return second === 'novo' ? ['Painel', 'Novo lote'] : ['Painel'];
    case 'entrar':
      return ['Entrar'];
    case 'cadastro':
      return ['Criar conta'];
    default:
      return ['Página não encontrada'];
  }
}

function NavItem({
  to,
  icon,
  end,
  children,
}: {
  to: string;
  icon: IconName;
  end?: boolean;
  children: string;
}) {
  return (
    <NavLink to={to} end={end} className="side-link">
      <Icon name={icon} />
      <span>{children}</span>
    </NavLink>
  );
}

function ProfileRow({ user }: { user: UserDto }) {
  const bidder = user.role === 'BIDDER';
  const wallet = useQuery({
    queryKey: walletQueryKey(user.id),
    queryFn: () => apiFetch<Wallet>('/api/wallet'),
    enabled: bidder,
  });
  return (
    <div className="profile">
      <span className="avatar" aria-hidden="true">
        {user.name.trim().charAt(0).toUpperCase()}
      </span>
      <span className="profile-name">
        Meu perfil
        <span className="sr-only">
          : {user.name}, {ROLE_LABEL[user.role]}
        </span>
      </span>
      {bidder && (
        <>
          <span className="profile-balance">
            <span className="sr-only">Saldo </span>
            {wallet.data ? formatBRL(wallet.data.availableCents) : '…'}
          </span>
          <Link to="/carteira" className="plus-button" aria-label="Depositar saldo">
            <Icon name="plus" size={14} />
          </Link>
        </>
      )}
    </div>
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

function Wordmark() {
  return (
    <Link to="/" className="brand" aria-label="Casa de Leilões, página inicial">
      <span aria-hidden="true">
        Casa de <span className="brand-accent">L</span>eilões
      </span>
    </Link>
  );
}

export function Layout() {
  const [loading, setLoading] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const user = useMe();
  const logout = useLogout();
  const navigate = useNavigate();
  const crumbs = crumbsFor(location.pathname);
  const atHome = location.pathname === '/';

  // O menu em gaveta (telas estreitas) fecha ao navegar e com Esc.
  useEffect(() => setMenuOpen(false), [location.pathname]);
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setMenuOpen(false);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [menuOpen]);

  return (
    <div className="app-shell">
      <a href="#conteudo" className="skip-link">
        Pular para o conteúdo
      </a>
      <header className="topbar">
        <Wordmark />
        <button
          type="button"
          className="menu-button"
          aria-expanded={menuOpen}
          aria-controls="menu-lateral"
          aria-label={menuOpen ? 'Fechar menu' : 'Abrir menu'}
          onClick={() => setMenuOpen((open) => !open)}
        >
          <Icon name={menuOpen ? 'close' : 'menu'} />
        </button>
      </header>
      {menuOpen && <div className="scrim" aria-hidden="true" onClick={() => setMenuOpen(false)} />}
      <div id="menu-lateral" className="sidebar" data-open={menuOpen}>
        <div className="sidebar-brand">
          <Wordmark />
        </div>
        <nav aria-label="Principal" className="side-nav">
          <NavItem to="/" icon="gavel" end>
            Leilões
          </NavItem>
          {user?.role === 'BIDDER' && (
            <NavItem to="/meus-lances" icon="bag">
              Meus arremates
            </NavItem>
          )}
          {user?.role === 'AUCTIONEER' && (
            <>
              <NavItem to="/painel" icon="grid" end>
                Painel
              </NavItem>
              <NavItem to="/painel/novo" icon="plus-square">
                Novo lote
              </NavItem>
            </>
          )}
          {user?.role === 'AUCTIONEER' && (
            <NavItem to="/carteira" icon="wallet">
              Carteira
            </NavItem>
          )}
          {user === null && (
            <>
              <NavItem to="/entrar" icon="login">
                Entrar
              </NavItem>
              <NavItem to="/cadastro" icon="user-plus">
                Criar conta
              </NavItem>
            </>
          )}
        </nav>

        {user && (
          <section aria-labelledby="rotulo-conta" className="side-account">
            <h2 id="rotulo-conta" className="side-label">
              Conta
            </h2>
            <ProfileRow user={user} />
            {user.role === 'BIDDER' && (
              <NavItem to="/carteira" icon="wallet">
                Depositar
              </NavItem>
            )}
            <button
              type="button"
              className="side-link side-button"
              onClick={() => logout.mutate(undefined, { onSuccess: () => navigate('/') })}
            >
              <Icon name="logout" />
              <span>Sair</span>
            </button>
          </section>
        )}

        <div className="side-footer">
          <ThemeToggle />
          <p>
            Saldo simulado: nenhum dinheiro real é movimentado. Acervo do{' '}
            <a href="https://www.artic.edu" rel="noreferrer" target="_blank">
              Art Institute of Chicago
            </a>
            .
          </p>
        </div>
      </div>

      <main id="conteudo" className="app-main">
        <div className="crumb-row">
          {!atHome && (
            <button
              type="button"
              className="back-button"
              aria-label="Voltar"
              onClick={() => navigate(-1)}
            >
              <Icon name="arrow-left" />
            </button>
          )}
          <nav aria-label="Trilha de navegação" className="breadcrumb">
            <ol>
              <li>
                <Link to="/">Início</Link>
              </li>
              {crumbs.map((crumb, i) => (
                <li key={crumb} aria-current={i === crumbs.length - 1 ? 'page' : undefined}>
                  {crumb}
                </li>
              ))}
            </ol>
          </nav>
        </div>
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
    </div>
  );
}
