import { lazy } from 'react';
import { Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { RequireRole } from './components/RequireRole';
import { ShowcasePage } from './features/showcase/ShowcasePage';
import { NotFoundPage } from './routes/NotFoundPage';

// A vitrine fica no bundle principal; as demais rotas carregam sob demanda.
const LoginPage = lazy(() =>
  import('./features/auth/LoginPage').then((m) => ({ default: m.LoginPage })),
);
const RegisterPage = lazy(() =>
  import('./features/auth/RegisterPage').then((m) => ({ default: m.RegisterPage })),
);
const LotRoomPage = lazy(() =>
  import('./features/lotRoom/LotRoomPage').then((m) => ({ default: m.LotRoomPage })),
);
const AuditPage = lazy(() =>
  import('./features/audit/AuditPage').then((m) => ({ default: m.AuditPage })),
);
const ReceiptPage = lazy(() =>
  import('./features/receipt/ReceiptPage').then((m) => ({ default: m.ReceiptPage })),
);
const WalletPage = lazy(() =>
  import('./features/wallet/WalletPage').then((m) => ({ default: m.WalletPage })),
);
const ParticipationsPage = lazy(() =>
  import('./features/participations/ParticipationsPage').then((m) => ({
    default: m.ParticipationsPage,
  })),
);
const AuctioneerPanelPage = lazy(() =>
  import('./features/auctioneer/AuctioneerPanelPage').then((m) => ({
    default: m.AuctioneerPanelPage,
  })),
);
const NewLotPage = lazy(() =>
  import('./features/auctioneer/NewLotPage').then((m) => ({ default: m.NewLotPage })),
);

export function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<ShowcasePage />} />
        <Route path="lotes/:id" element={<LotRoomPage />} />
        <Route path="auditoria/:lotId" element={<AuditPage />} />
        <Route path="comprovante/:code" element={<ReceiptPage />} />
        <Route path="entrar" element={<LoginPage />} />
        <Route path="cadastro" element={<RegisterPage />} />
        <Route
          path="carteira"
          element={
            <RequireRole>
              <WalletPage />
            </RequireRole>
          }
        />
        <Route
          path="meus-lances"
          element={
            <RequireRole role="BIDDER">
              <ParticipationsPage />
            </RequireRole>
          }
        />
        <Route
          path="painel"
          element={
            <RequireRole role="AUCTIONEER">
              <AuctioneerPanelPage />
            </RequireRole>
          }
        />
        <Route
          path="painel/novo"
          element={
            <RequireRole role="AUCTIONEER">
              <NewLotPage />
            </RequireRole>
          }
        />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
