import { Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { RequireRole } from './components/RequireRole';
import { NewLotPage } from './features/auctioneer/NewLotPage';
import { LoginPage } from './features/auth/LoginPage';
import { RegisterPage } from './features/auth/RegisterPage';
import { ShowcasePage } from './features/showcase/ShowcasePage';
import { LotRoomPage } from './features/lotRoom/LotRoomPage';
import { WalletPage } from './features/wallet/WalletPage';
import { AuditPage } from './features/audit/AuditPage';
import { ReceiptPage } from './features/receipt/ReceiptPage';
import { ParticipationsPage } from './features/participations/ParticipationsPage';
import { ComingSoonPage } from './routes/ComingSoonPage';
import { NotFoundPage } from './routes/NotFoundPage';

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
              <ComingSoonPage title="Painel do leiloeiro" />
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
