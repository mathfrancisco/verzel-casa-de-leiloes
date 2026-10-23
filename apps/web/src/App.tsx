import { Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { RequireRole } from './components/RequireRole';
import { LoginPage } from './features/auth/LoginPage';
import { RegisterPage } from './features/auth/RegisterPage';
import { ShowcasePage } from './features/showcase/ShowcasePage';
import { ComingSoonPage } from './routes/ComingSoonPage';
import { NotFoundPage } from './routes/NotFoundPage';

export function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<ShowcasePage />} />
        <Route path="entrar" element={<LoginPage />} />
        <Route path="cadastro" element={<RegisterPage />} />
        <Route
          path="carteira"
          element={
            <RequireRole role="BIDDER">
              <ComingSoonPage title="Carteira" />
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
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
