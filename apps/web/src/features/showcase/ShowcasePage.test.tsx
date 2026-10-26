// @vitest-environment happy-dom

import type { LotListResponse, LotSummary } from '@leilao/shared';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { apiFetch } from '../../lib/api';
import { ShowcasePage } from './ShowcasePage';

vi.mock('../../lib/api', async (importOriginal) => {
  const actual = await importOriginal<object>();
  return { ...actual, apiFetch: vi.fn() };
});

const lot: LotSummary = {
  id: 'lot-1',
  title: 'Lírios d’água',
  imageUrl: '/api/images/1',
  category: 'PAINTING',
  phase: 'LIVE',
  startsAt: '2026-10-25T10:00:00.000Z',
  endsAt: '2026-10-25T11:00:00.000Z',
  currentPriceCents: null,
  startingPriceCents: 1_000,
  bidCount: 0,
  serverTime: '2026-10-25T10:30:00.000Z',
};
const response = (items: LotSummary[]): LotListResponse => ({
  items,
  nextCursor: null,
  counts: { live: items.length, scheduled: 0, closed: 0 },
  serverTime: '2026-10-25T10:30:00.000Z',
});

function Where() {
  const { search } = useLocation();
  return <output data-testid="search">{search}</output>;
}

describe('ShowcasePage — busca e filtros (CT-09-06)', () => {
  let root: Root;
  let container: HTMLDivElement;
  let queryClient: QueryClient;

  const render = (initial: string) =>
    act(async () => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={[initial]}>
            <ShowcasePage />
            <Where />
          </MemoryRouter>
        </QueryClientProvider>,
      );
    });
  const search = () => container.querySelector('[data-testid="search"]')!.textContent!;
  const urlParams = () => new URLSearchParams(search());
  const lastRequest = () => {
    const calls = vi.mocked(apiFetch).mock.calls;
    return new URL(calls.at(-1)![0] as string, 'http://x').searchParams;
  };
  const control = <T extends HTMLElement>(label: string) =>
    [...container.querySelectorAll<T>('input, select')].find(
      (el) => container.querySelector(`label[for="${el.id}"]`)?.textContent === label,
    )!;
  const setValue = (el: HTMLInputElement | HTMLSelectElement, value: string) =>
    act(async () => {
      const proto = el instanceof HTMLSelectElement ? HTMLSelectElement : HTMLInputElement;
      Object.getOwnPropertyDescriptor(proto.prototype, 'value')!.set!.call(el, value);
      el.dispatchEvent(
        new Event(el instanceof HTMLSelectElement ? 'change' : 'input', { bubbles: true }),
      );
    });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(apiFetch).mockResolvedValue(response([lot]));
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  });

  afterEach(() => {
    vi.useRealTimers();
    act(() => root.unmount());
    container.remove();
    queryClient.clear();
  });

  it('recarregar com filtros na URL repete a consulta e preenche os controles', async () => {
    await render('/?aba=encerrados&q=monet&categoria=PRINT&min=1000&max=550000&ordem=price_asc');

    expect(Object.fromEntries(lastRequest())).toEqual({
      phase: 'closed',
      q: 'monet',
      category: 'PRINT',
      minPriceCents: '1000',
      maxPriceCents: '550000',
      sort: 'price_asc',
    });
    expect(control<HTMLInputElement>('Buscar').value).toBe('monet');
    expect(control<HTMLSelectElement>('Categoria').value).toBe('PRINT');
    expect(control<HTMLInputElement>('Preço mínimo (R$)').value).toBe('10,00');
    expect(control<HTMLInputElement>('Preço máximo (R$)').value).toBe('5.500,00');
    expect(control<HTMLSelectElement>('Ordenar por').value).toBe('price_asc');
  });

  it('digitar espera 300 ms sem novas teclas antes de buscar e grava na URL', async () => {
    vi.useFakeTimers();
    await render('/?aba=ao-vivo');
    const calls = vi.mocked(apiFetch).mock.calls.length;

    await setValue(control('Buscar'), 'mon');
    await setValue(control('Buscar'), 'monet');
    await act(async () => void vi.advanceTimersByTime(299));
    expect(vi.mocked(apiFetch).mock.calls.length).toBe(calls);
    expect(urlParams().get('q')).toBeNull();

    await act(async () => void vi.advanceTimersByTime(1));
    expect(urlParams().get('q')).toBe('monet');
    expect(urlParams().get('aba')).toBe('ao-vivo');
    expect(lastRequest().get('q')).toBe('monet');
    expect(vi.mocked(apiFetch).mock.calls.length).toBe(calls + 1);
  });

  it('categoria e ordenação aplicam na hora e vão para a URL', async () => {
    await render('/');
    await setValue(control('Categoria'), 'SCULPTURE');
    await setValue(control('Ordenar por'), 'newest');

    expect(urlParams().get('categoria')).toBe('SCULPTURE');
    expect(urlParams().get('ordem')).toBe('newest');
    expect(lastRequest().get('category')).toBe('SCULPTURE');
    expect(lastRequest().get('sort')).toBe('newest');
  });

  it('faixa de preço digitada em reais vira centavos na URL e na consulta', async () => {
    vi.useFakeTimers();
    await render('/');
    await setValue(control('Preço mínimo (R$)'), '10');
    await setValue(control('Preço máximo (R$)'), '1.234,56');
    await act(async () => void vi.advanceTimersByTime(300));

    expect(urlParams().get('min')).toBe('1000');
    expect(urlParams().get('max')).toBe('123456');
    expect(lastRequest().get('minPriceCents')).toBe('1000');
    expect(lastRequest().get('maxPriceCents')).toBe('123456');
  });

  it('preço inválido mostra aviso e não consulta nem altera a URL', async () => {
    vi.useFakeTimers();
    await render('/');
    const calls = vi.mocked(apiFetch).mock.calls.length;
    await setValue(control('Preço mínimo (R$)'), 'abc');
    await act(async () => void vi.advanceTimersByTime(300));

    expect(container.querySelector('[role="alert"]')?.textContent).toContain('Preço inválido');
    expect(urlParams().get('min')).toBeNull();
    expect(vi.mocked(apiFetch).mock.calls.length).toBe(calls);
  });

  it('mínimo maior que o máximo avisa e não consulta', async () => {
    vi.useFakeTimers();
    await render('/');
    const calls = vi.mocked(apiFetch).mock.calls.length;
    await setValue(control('Preço mínimo (R$)'), '50');
    await setValue(control('Preço máximo (R$)'), '10');
    await act(async () => void vi.advanceTimersByTime(300));

    expect(container.querySelector('[role="alert"]')?.textContent).toContain('mínimo');
    expect(vi.mocked(apiFetch).mock.calls.length).toBe(calls);
  });

  it('as abas mantêm os filtros e "Limpar filtros" os remove, mantendo a aba', async () => {
    await render('/?aba=ao-vivo&q=monet&categoria=PRINT');
    const tab = [...container.querySelectorAll('nav a')].find((a) =>
      a.textContent?.startsWith('Agendados'),
    )!;
    expect(new URL(tab.getAttribute('href')!, 'http://x').searchParams.get('q')).toBe('monet');
    expect(tab.getAttribute('href')).toContain('aba=agendados');

    const clear = [...container.querySelectorAll('button')].find(
      (b) => b.textContent === 'Limpar filtros',
    )!;
    await act(async () => clear.click());
    expect(search()).toBe('?aba=ao-vivo');
    expect(control<HTMLInputElement>('Buscar').value).toBe('');
    expect(lastRequest().get('q')).toBeNull();
  });

  it('sem filtros não mostra "Limpar filtros"', async () => {
    await render('/');
    expect(
      [...container.querySelectorAll('button')].some((b) => b.textContent === 'Limpar filtros'),
    ).toBe(false);
  });

  it('sem resultados com filtros explica a ausência de resultados', async () => {
    vi.mocked(apiFetch).mockResolvedValue(response([]));
    await render('/?q=nada');
    await vi.waitFor(() =>
      expect(container.textContent).toContain('Nenhum lote encontrado com estes filtros.'),
    );
  });

  it('mostra os lotes retornados', async () => {
    await render('/');
    await vi.waitFor(() => expect(container.textContent).toContain('Lírios d’água'));
  });
});
