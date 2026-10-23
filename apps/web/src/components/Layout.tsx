import { Link, Outlet, useNavigate } from 'react-router-dom';
import { useLogout, useMe } from '../features/auth/session';

const ROLE_LABEL = { AUCTIONEER: 'Leiloeiro', BIDDER: 'Licitante' } as const;

export function Layout() {
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
          {user?.role === 'BIDDER' && <Link to="/carteira">Carteira</Link>}
          {user?.role === 'AUCTIONEER' && <Link to="/painel">Painel</Link>}
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
        </nav>
      </header>
      <main id="conteudo">
        <Outlet />
      </main>
    </>
  );
}
