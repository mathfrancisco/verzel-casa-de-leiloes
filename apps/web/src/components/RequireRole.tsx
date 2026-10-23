import type { Role } from '@leilao/shared';
import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useMe } from '../features/auth/session';
import { resolveAccess } from '../lib/access';

/** Protege uma rota no front (UX). A autorização de verdade é do servidor. */
export function RequireRole({ role, children }: { role?: Role; children: ReactNode }) {
  const user = useMe();
  const location = useLocation();

  switch (resolveAccess(user, role)) {
    case 'loading':
      return <p role="status">Carregando…</p>;
    case 'login':
      return <Navigate to={`/entrar?next=${encodeURIComponent(location.pathname)}`} replace />;
    case 'forbidden':
      return (
        <section>
          <h1>Sem permissão</h1>
          <p>Esta área é exclusiva de {role === 'AUCTIONEER' ? 'leiloeiros' : 'licitantes'}.</p>
        </section>
      );
    case 'allow':
      return <>{children}</>;
  }
}
