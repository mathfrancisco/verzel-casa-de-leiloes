// @vitest-environment happy-dom

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { apiFetch } from '../lib/api';
import { Layout } from './Layout';

vi.mock('../lib/api', async (importOriginal) => {
  const actual = await importOriginal<object>();
  return { ...actual, apiFetch: vi.fn() };
});
vi.mock('./OutbidToast', () => ({ OutbidToast: () => null }));

let root: Root;
let container: HTMLDivElement;
let queryClient: QueryClient;

const render = () =>
  act(async () => {
    root.render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/']}>
          <Routes>
            <Route element={<Layout />}>
              <Route index element={<p>Início</p>} />
              <Route path="entrar" element={<p>Entrar</p>} />
            </Route>
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );
  });

const menuButton = () => container.querySelector<HTMLButtonElement>('.menu-button')!;
const main = () => container.querySelector<HTMLElement>('main')!;

describe('Layout — gaveta de navegação', () => {
  beforeEach(() => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    vi.mocked(apiFetch).mockResolvedValue({ user: null });
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

  it('main é focável por programa (alvo do link de pular)', async () => {
    await render();
    expect(main().getAttribute('tabindex')).toBe('-1');
  });

  it('ao abrir: foca o primeiro link e torna o conteúdo inerte; Esc devolve o foco ao botão', async () => {
    await render();
    expect(main().hasAttribute('inert')).toBe(false);

    await act(async () => menuButton().click());
    expect(menuButton().getAttribute('aria-expanded')).toBe('true');
    expect(main().hasAttribute('inert')).toBe(true);
    expect(document.activeElement).toBe(container.querySelector('#menu-lateral .side-nav a'));

    await act(async () => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    });
    expect(menuButton().getAttribute('aria-expanded')).toBe('false');
    expect(main().hasAttribute('inert')).toBe(false);
    expect(document.activeElement).toBe(menuButton());
  });

  it('fechar pelo fundo também devolve o foco ao botão', async () => {
    await render();
    await act(async () => menuButton().click());
    await act(async () => container.querySelector<HTMLElement>('.scrim')!.click());
    expect(document.activeElement).toBe(menuButton());
  });

  it('navegar por um link da gaveta fecha e devolve o foco ao botão', async () => {
    await render();
    await act(async () => menuButton().click());
    await act(async () => {
      [...container.querySelectorAll<HTMLAnchorElement>('#menu-lateral a')]
        .find((a) => a.textContent === 'Entrar')!
        .click();
    });
    expect(menuButton().getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(menuButton());
  });
});
