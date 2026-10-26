// @vitest-environment happy-dom

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { apiFetch } from '../../lib/api';
import { AuditPage } from './AuditPage';

vi.mock('../../lib/api', () => ({ apiFetch: vi.fn() }));

describe('AuditPage de lote cancelado', () => {
  let root: Root;
  let container: HTMLDivElement;
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
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

  it('exibe o aviso e o motivo registrado no elo CANCELLED', async () => {
    vi.mocked(apiFetch).mockResolvedValue({
      lot: {
        id: 'lot-1',
        title: 'Lote cancelado',
        state: 'CANCELLED',
        genesis: {},
        genesisHash: '0'.repeat(64),
        bidCount: 0,
        chainLength: 1,
        headHash: '1'.repeat(64),
      },
      entries: [
        {
          seq: 1,
          type: 'CANCELLED',
          bidderPseudonym: null,
          amountCents: null,
          createdAt: '2026-10-25T12:00:00.000Z',
          payload: { reason: 'Obra danificada' },
          prevHash: '0'.repeat(64),
          hash: '1'.repeat(64),
          signature: 'A'.repeat(86),
        },
      ],
      receipt: null,
      verdict: { status: 'INTACT', checks: [] },
      publicKey: 'A'.repeat(43),
      serverTime: '2026-10-25T12:00:01.000Z',
    });
    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={['/auditoria/lot-1']}>
            <Routes>
              <Route path="/auditoria/:lotId" element={<AuditPage />} />
            </Routes>
          </MemoryRouter>
        </QueryClientProvider>,
      );
    });
    await vi.waitFor(() => expect(container.textContent).toContain('Lote cancelado.'));
    expect(container.querySelector('.cancelled-notice')).not.toBeNull();
    expect(container.textContent).toContain('Obra danificada');
  });
});
