// @vitest-environment happy-dom

import { BrowserAuditCrypto } from '@leilao/shared';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { apiFetch } from '../../lib/api';
import { ReceiptPage } from './ReceiptPage';

vi.mock('../../lib/api', () => ({ apiFetch: vi.fn() }));

describe('ReceiptPage com comprovante revogado', () => {
  let root: Root;
  let container: HTMLDivElement;
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(BrowserAuditCrypto.prototype, 'verify').mockResolvedValue(true);
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
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

  it('avisa que o lote foi cancelado e o comprovante revogado', async () => {
    vi.mocked(apiFetch).mockResolvedValue({
      code: 'a'.repeat(22),
      lot: {
        id: 'lot-1',
        title: 'Natureza morta',
        imageUrl: '/api/images/image-1',
        item: {
          externalId: '1',
          title: 'Natureza morta',
          artist: null,
          date: null,
          medium: null,
          dimensions: null,
          origin: null,
          imageUrl: 'https://example.invalid/item',
          sourceUrl: 'https://example.invalid/source',
          suggestedCategory: 'PAINTING',
        },
      },
      amountCents: 12_000,
      winnerPseudonym: 'Licitante 7KQ2PX',
      issuedAt: '2026-10-25T12:00:00.000Z',
      finalHash: 'a'.repeat(64),
      signature: 'A'.repeat(86),
      publicKey: 'A'.repeat(43),
      auditUrl: '/auditoria/lot-1',
      revoked: true,
      revokedAt: '2026-10-25T13:00:00.000Z',
    });
    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={[`/comprovante/${'a'.repeat(22)}`]}>
            <Routes>
              <Route path="/comprovante/:code" element={<ReceiptPage />} />
            </Routes>
          </MemoryRouter>
        </QueryClientProvider>,
      );
    });
    await vi.waitFor(() => expect(container.textContent).toContain('Natureza morta'));
    expect(container.querySelector('h1')?.textContent).toBe('Comprovante revogado');
    expect(container.textContent).toContain('Lote cancelado');
    expect(container.textContent).toContain('estornado');
  });
});
