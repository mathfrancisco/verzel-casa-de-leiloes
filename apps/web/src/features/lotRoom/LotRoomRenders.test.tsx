// @vitest-environment happy-dom

import type { LotDetail } from '@leilao/shared';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { apiFetch } from '../../lib/api';
import { LotRoomPage } from './LotRoomPage';

vi.mock('../../lib/api', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  apiFetch: vi.fn(),
}));
vi.mock('../showcase/useLotChannel', () => ({ useLotChannel: () => undefined }));
vi.mock('../../lib/realtime', () => ({ refreshRealtimeSession: () => undefined }));

const now = Date.now();
const lot = {
  id: 'l1',
  title: 'Obra',
  imageUrl: '/api/images/1',
  category: 'PAINTING',
  phase: 'LIVE',
  startsAt: new Date(now - 3_600_000).toISOString(),
  endsAt: new Date(now + 3_600_000).toISOString(),
  currentPriceCents: 10_000,
  startingPriceCents: 10_000,
  bidCount: 2,
  serverTime: new Date(now).toISOString(),
  description: 'desc',
  item: { artist: null, date: null, medium: null, dimensions: null, origin: null, sourceUrl: 'x' },
  minIncrementCents: 500,
  minimumNextBidCents: 10_500,
  leaderPseudonym: 'Lobo',
  sellerPseudonym: 'Vendedor',
  originalEndsAt: new Date(now + 3_600_000).toISOString(),
  extended: false,
  recentEntries: [
    {
      seq: 2,
      type: 'BID',
      bidderPseudonym: 'Lobo',
      amountCents: 10_000,
      createdAt: new Date(now).toISOString(),
    },
    {
      seq: 1,
      type: 'BID',
      bidderPseudonym: 'Gato',
      amountCents: 9_000,
      createdAt: new Date(now).toISOString(),
    },
  ],
} as unknown as LotDetail;

describe('LotRoomPage re-renders', () => {
  let root: Root;
  let container: HTMLDivElement;
  let queryClient: QueryClient;

  beforeEach(() => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    vi.mocked(apiFetch).mockImplementation((async (path: string) =>
      path === '/api/auth/me'
        ? { user: { id: 'u1', role: 'BIDDER', name: 'A', email: 'a@a.com' } }
        : lot) as typeof apiFetch);
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    queryClient.clear();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  // Proxy de renders: o histórico cria um Intl.DateTimeFormat por render (e nada mais na sala
  // o usa), então o número de construções do formatador é o número de renders do histórico.
  it('não re-renderiza o histórico no tick do cronômetro, ao digitar o lance nem quando só o preço muda', async () => {
    vi.useFakeTimers({ now });
    const formatter = vi.spyOn(Intl, 'DateTimeFormat');
    const advance = (ms: number) =>
      act(async () => {
        await vi.advanceTimersByTimeAsync(ms);
      });

    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={['/lotes/l1']}>
            <Routes>
              <Route path="lotes/:id" element={<LotRoomPage />} />
            </Routes>
          </MemoryRouter>
        </QueryClientProvider>,
      );
    });
    await advance(50);
    await advance(50);
    expect(container.querySelector('.lot-history li')).not.toBeNull();
    const afterMount = formatter.mock.calls.length;
    expect(afterMount).toBeGreaterThan(0);

    // tick do cronômetro: o texto muda, o histórico não re-renderiza
    const countdown = () => container.querySelector('.countdown time')!.textContent;
    const before = countdown();
    await advance(3_000);
    expect(countdown()).not.toBe(before);
    expect(formatter.mock.calls.length).toBe(afterMount);

    // digitar no campo do lance
    const input = container.querySelector<HTMLInputElement>('#bid-amount')!;
    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
      setter.call(input, '120,00');
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    expect(input.value).toBe('120,00');
    expect(formatter.mock.calls.length).toBe(afterMount);

    // evento que muda só a prorrogação (mesmos lances no histórico)
    await act(async () => {
      await queryClient.cancelQueries();
      queryClient.setQueryData(['lot', 'l1', 'u1'], { ...lot, extended: true });
    });
    await advance(50);
    expect(container.querySelector('.lot-extended')).not.toBeNull();
    expect(formatter.mock.calls.length).toBe(afterMount);
  });
});
