// @vitest-environment happy-dom

import { hashGenesis, type AuditGenesis, type AuditReportResponse } from '@leilao/shared';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { webcrypto } from 'node:crypto';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BrowserAuditCrypto } from '@leilao/shared';
import { AuditPage } from './AuditPage';
import { apiFetch } from '../../lib/api';

vi.mock('../../lib/api', () => ({ apiFetch: vi.fn() }));

const genesis = (lotId: string): AuditGenesis => ({
  lotId,
  externalId: '1001',
  imageSha256: 'a'.repeat(64),
  title: 'Lote de teste',
  description: 'Descrição',
  category: 'PAINTING',
  itemSnapshot: {
    externalId: '1001',
    title: 'Lote de teste',
    artist: null,
    date: null,
    medium: null,
    dimensions: null,
    origin: null,
    imageUrl: 'https://example.test/image',
    sourceUrl: 'https://example.test/item',
    suggestedCategory: 'PAINTING',
  },
  sellerPseudonym: 'VENDEDOR-01',
  startingPriceCents: 1_000,
  minIncrementCents: 100,
  startsAt: '2026-10-25T12:00:00.000Z',
  originalEndsAt: '2026-10-25T13:00:00.000Z',
});

async function reportFor(lotId: string, valid: boolean): Promise<AuditReportResponse> {
  const lotGenesis = genesis(lotId);
  const genesisHash = await hashGenesis(lotGenesis, new BrowserAuditCrypto(webcrypto.subtle));
  return {
    lot: {
      id: lotId,
      title: lotGenesis.title,
      state: 'SCHEDULED',
      genesis: lotGenesis,
      genesisHash: valid ? genesisHash : '0'.repeat(64),
      bidCount: 0,
      chainLength: 0,
      headHash: valid ? genesisHash : '0'.repeat(64),
    },
    entries: [],
    receipt: null,
    // The component must never use this server-side assessment as its result.
    verdict: { status: 'INTACT', checks: [] },
    publicKey: 'A'.repeat(43),
    serverTime: '2026-10-25T12:00:00.000Z',
  };
}

function MoveToLotB() {
  const navigate = useNavigate();
  return <button onClick={() => navigate('/auditoria/lot-b')}>Trocar lote</button>;
}

describe('AuditPage', () => {
  let root: Root;
  let container: HTMLDivElement;
  let queryClient: QueryClient;

  beforeEach(() => {
    Object.defineProperty(globalThis, 'crypto', { configurable: true, value: webcrypto });
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    vi.clearAllMocks();
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    queryClient.clear();
  });

  it('ignora o veredito da API e mostra o resultado da verificação BrowserAuditCrypto', async () => {
    vi.mocked(apiFetch).mockResolvedValue(await reportFor('lot-a', false));
    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={['/auditoria/lot-a']}>
            <Routes>
              <Route path="/auditoria/:lotId" element={<AuditPage />} />
            </Routes>
          </MemoryRouter>
        </QueryClientProvider>,
      );
    });

    await vi.waitFor(() => expect(container.textContent).toContain('Cadeia com inconsistências'));
    expect(container.textContent).not.toContain('Cadeia íntegra');
  });

  it('não mostra o veredito local do lote anterior durante a troca de rota', async () => {
    const intact = await reportFor('lot-a', true);
    const altered = await reportFor('lot-b', false);
    vi.mocked(apiFetch).mockImplementation((url) =>
      Promise.resolve(url.endsWith('/lot-b/audit') ? altered : intact),
    );
    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={['/auditoria/lot-a']}>
            <MoveToLotB />
            <Routes>
              <Route path="/auditoria/:lotId" element={<AuditPage />} />
            </Routes>
          </MemoryRouter>
        </QueryClientProvider>,
      );
    });
    await vi.waitFor(() => expect(container.textContent).toContain('Cadeia íntegra'));

    queryClient.setQueryData(['audit', 'lot-b'], altered);
    act(() => container.querySelector('button')!.click());
    expect(container.textContent).toContain('Verificando a cadeia neste navegador');
    expect(container.textContent).not.toContain('Cadeia íntegra');
    await vi.waitFor(() => expect(container.textContent).toContain('Cadeia com inconsistências'));
  });
});
