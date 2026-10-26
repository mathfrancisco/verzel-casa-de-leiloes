// @vitest-environment happy-dom

import type { UserDto } from '@leilao/shared';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { apiFetch } from '../../lib/api';
import { useMe } from '../auth/session';
import { AuctioneerPanelPage } from './AuctioneerPanelPage';

vi.mock('../../lib/api', () => ({ apiFetch: vi.fn() }));
vi.mock('../auth/session', () => ({ useMe: vi.fn() }));

describe('AuctioneerPanelPage', () => {
  let root: Root;
  let container: HTMLDivElement;
  let queryClient: QueryClient;
  let currentUser: UserDto;

  beforeEach(() => {
    vi.clearAllMocks();
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    currentUser = { id: 'seller-a', name: 'Leiloeiro A', email: 'a@demo.com', role: 'AUCTIONEER' };
    vi.mocked(useMe).mockImplementation(() => currentUser);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    queryClient.clear();
  });

  it('lista resultados, total recebido e links públicos sem botão de cancelar', async () => {
    vi.mocked(apiFetch).mockResolvedValue({
      totalReceivedCents: 2_800,
      items: [
        {
          id: 'lot-1',
          title: 'Natureza morta',
          imageUrl: '/api/images/1',
          category: 'PAINTING',
          phase: 'SETTLED',
          startsAt: '2026-10-25T10:00:00.000Z',
          endsAt: '2026-10-25T11:00:00.000Z',
          currentPriceCents: 1_200,
          startingPriceCents: 1_000,
          bidCount: 1,
          serverTime: '2026-10-25T12:00:00.000Z',
          result: 'SOLD',
          finalPriceCents: 1_200,
          settledAt: '2026-10-25T11:00:00.000Z',
          cancellable: false,
        },
        {
          id: 'lot-2',
          title: 'Sem vencedor',
          imageUrl: '/api/images/2',
          category: 'PAINTING',
          phase: 'UNSOLD',
          startsAt: '2026-10-25T10:00:00.000Z',
          endsAt: '2026-10-25T11:00:00.000Z',
          currentPriceCents: null,
          startingPriceCents: 1_000,
          bidCount: 0,
          serverTime: '2026-10-25T12:00:00.000Z',
          result: 'UNSOLD',
          finalPriceCents: null,
          settledAt: '2026-10-25T11:00:00.000Z',
          cancellable: false,
        },
      ],
    });
    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter>
            <AuctioneerPanelPage />
          </MemoryRouter>
        </QueryClientProvider>,
      );
    });
    await vi.waitFor(() => expect(container.textContent).toContain('R$ 28,00'));
    expect(container.textContent).toContain('Arrematado por R$ 12,00');
    expect(container.textContent).toContain('Sem vencedor');
    expect(container.querySelector('a[href="/lotes/lot-1"]')).not.toBeNull();
    expect(container.querySelector('a[href="/auditoria/lot-1"]')).not.toBeNull();
    expect(container.querySelector('button')).toBeNull();
  });

  it('apresenta carregamento, vazio e erro', async () => {
    let resolve!: (value: { items: []; totalReceivedCents: number }) => void;
    vi.mocked(apiFetch).mockImplementationOnce(
      () =>
        new Promise((done) => {
          resolve = done;
        }),
    );
    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter>
            <AuctioneerPanelPage />
          </MemoryRouter>
        </QueryClientProvider>,
      );
    });
    expect(container.textContent).toContain('Carregando seus lotes');
    await act(async () => resolve({ items: [], totalReceivedCents: 0 }));
    await vi.waitFor(() => expect(container.textContent).toContain('Ainda não há lotes'));
  });

  it('não mostra dados de A enquanto a consulta privada de B ainda carrega', async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce({
      totalReceivedCents: 1_200,
      items: [
        {
          id: 'lot-a',
          title: 'Lote de A',
          imageUrl: '/api/images/a',
          category: 'PAINTING',
          phase: 'SETTLED',
          startsAt: '2026-10-25T10:00:00.000Z',
          endsAt: '2026-10-25T11:00:00.000Z',
          currentPriceCents: 1_200,
          startingPriceCents: 1_000,
          bidCount: 1,
          serverTime: '2026-10-25T12:00:00.000Z',
          result: 'SOLD',
          finalPriceCents: 1_200,
          settledAt: '2026-10-25T11:00:00.000Z',
          cancellable: true,
        },
      ],
    });
    let resolveB!: (value: { items: []; totalReceivedCents: number }) => void;
    vi.mocked(apiFetch).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveB = resolve;
        }),
    );

    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter>
            <AuctioneerPanelPage />
          </MemoryRouter>
        </QueryClientProvider>,
      );
    });
    await vi.waitFor(() => expect(container.textContent).toContain('Lote de A'));

    currentUser = { id: 'seller-b', name: 'Leiloeiro B', email: 'b@demo.com', role: 'AUCTIONEER' };
    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter>
            <AuctioneerPanelPage />
          </MemoryRouter>
        </QueryClientProvider>,
      );
    });
    expect(container.textContent).toContain('Carregando seus lotes');
    expect(container.textContent).not.toContain('Lote de A');

    await act(async () => resolveB({ items: [], totalReceivedCents: 0 }));
    await vi.waitFor(() => expect(container.textContent).toContain('Ainda não há lotes'));
  });
});
