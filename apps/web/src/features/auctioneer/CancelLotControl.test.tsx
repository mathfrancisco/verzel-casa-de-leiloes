// @vitest-environment happy-dom

import type { AuctioneerLot } from '@leilao/shared';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError, apiFetch } from '../../lib/api';
import { CancelLotControl, cancelEffect } from './CancelLotControl';

vi.mock('../../lib/api', async (importOriginal) => {
  const actual = await importOriginal<{ ApiError: unknown }>();
  return { ...actual, apiFetch: vi.fn() };
});

const base: AuctioneerLot = {
  id: 'lot-1',
  title: 'Natureza morta',
  imageUrl: '/api/images/1',
  category: 'PAINTING',
  phase: 'LIVE',
  startsAt: '2026-10-25T10:00:00.000Z',
  endsAt: '2026-10-25T11:00:00.000Z',
  currentPriceCents: null,
  startingPriceCents: 1_000,
  bidCount: 0,
  serverTime: '2026-10-25T10:30:00.000Z',
  result: 'PENDING',
  finalPriceCents: null,
  settledAt: null,
  cancellable: true,
};

describe('CancelLotControl', () => {
  let root: Root;
  let container: HTMLDivElement;
  let queryClient: QueryClient;

  const render = (lot: AuctioneerLot) =>
    act(async () => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <CancelLotControl lot={lot} />
        </QueryClientProvider>,
      );
    });
  const button = (label: string) =>
    [...container.querySelectorAll('button')].find((b) => b.textContent?.includes(label));

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

  it('não renderiza nada quando o lote não pode ser cancelado', async () => {
    await render({ ...base, cancellable: false });
    expect(container.querySelector('button')).toBeNull();
  });

  it('explica o efeito antes de confirmar e só chama a API na confirmação', async () => {
    vi.mocked(apiFetch).mockResolvedValue({});
    await render({ ...base, bidCount: 2, currentPriceCents: 1_500 });
    await act(async () => button('Cancelar lote')!.click());
    expect(apiFetch).not.toHaveBeenCalled();
    expect(container.textContent).toContain('R$ 15,00');
    expect(container.textContent).toContain('liberado');
    const input = container.querySelector('input')!;
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(
        input,
        ' Erro ',
      );
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await act(async () => button('Confirmar cancelamento')!.click());
    expect(apiFetch).toHaveBeenCalledWith('/api/lots/lot-1/cancel', {
      method: 'POST',
      body: { reason: 'Erro' },
    });
  });

  it('permite desistir sem chamar a API', async () => {
    await render(base);
    await act(async () => button('Cancelar lote')!.click());
    await act(async () => button('Manter lote')!.click());
    expect(apiFetch).not.toHaveBeenCalled();
    expect(button('Cancelar lote')).toBeDefined();
  });

  it('mostra o erro do servidor e mantém a confirmação aberta', async () => {
    vi.mocked(apiFetch).mockRejectedValue(
      new ApiError(409, 'LOT_NOT_CANCELLABLE', 'Este lote não pode ser cancelado.'),
    );
    await render(base);
    await act(async () => button('Cancelar lote')!.click());
    await act(async () => button('Confirmar cancelamento')!.click());
    await vi.waitFor(() =>
      expect(container.querySelector('[role="alert"]')?.textContent).toBe(
        'Este lote não pode ser cancelado.',
      ),
    );
    expect(button('Confirmar cancelamento')).toBeDefined();
  });

  it('descreve o estorno para lote arrematado', () => {
    const text = cancelEffect({ ...base, result: 'SOLD', finalPriceCents: 12_000, bidCount: 3 });
    expect(text).toContain('R$ 120,00');
    expect(text).toContain('comprovante será revogado');
  });
});
