// @vitest-environment happy-dom

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { apiFetch } from '../../lib/api';
import { ParticipationsPage } from './ParticipationsPage';

vi.mock('../../lib/api', () => ({ apiFetch: vi.fn() }));

describe('ParticipationsPage', () => {
  let root: Root;
  let container: HTMLDivElement;
  let queryClient: QueryClient;

  beforeEach(() => {
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

  it('separa estados de participação, apresenta rótulos em português e compartilha só o comprovante vencedor', async () => {
    vi.mocked(apiFetch).mockResolvedValue({
      items: [
        {
          lotId: 'ganhando',
          title: 'Obra ganhando',
          imageUrl: '/api/images/1',
          phase: 'LIVE',
          myBestBidCents: 1_000,
          currentPriceCents: 1_000,
          status: 'WINNING',
          receiptCode: null,
          endsAt: '2026-10-25T13:00:00.000Z',
        },
        {
          lotId: 'superado',
          title: 'Obra superada',
          imageUrl: '/api/images/2',
          phase: 'LIVE',
          myBestBidCents: 1_000,
          currentPriceCents: 1_100,
          status: 'OUTBID',
          receiptCode: null,
          endsAt: '2026-10-25T13:00:00.000Z',
        },
        {
          lotId: 'vencido',
          title: 'Obra arrematada',
          imageUrl: '/api/images/3',
          phase: 'SETTLED',
          myBestBidCents: 1_200,
          currentPriceCents: 1_200,
          status: 'WON',
          receiptCode: 'a'.repeat(22),
          endsAt: '2026-10-25T13:00:00.000Z',
        },
        {
          lotId: 'perdido',
          title: 'Obra perdida',
          imageUrl: '/api/images/4',
          phase: 'SETTLED',
          myBestBidCents: 1_000,
          currentPriceCents: 1_200,
          status: 'LOST',
          receiptCode: null,
          endsAt: '2026-10-25T13:00:00.000Z',
        },
      ],
    });
    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter>
            <ParticipationsPage />
          </MemoryRouter>
        </QueryClientProvider>,
      );
    });

    await vi.waitFor(() => expect(container.textContent).toContain('Ganhando'));
    expect(container.textContent).toContain('Superado');
    expect(container.textContent).not.toContain('WINNING');
    expect(container.textContent).not.toContain('Obra arrematada');

    act(() => (container.querySelectorAll('[role="tab"]')[1] as HTMLButtonElement).click());
    expect(container.textContent).toContain('Obra arrematada');
    expect(container.textContent).toContain('Comprovante');
    expect(container.textContent).not.toContain('Obra perdida');
  });
});
