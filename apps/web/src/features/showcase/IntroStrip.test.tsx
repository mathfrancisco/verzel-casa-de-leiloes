// @vitest-environment happy-dom

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { apiFetch } from '../../lib/api';
import { INTRO_DISMISSED_KEY, IntroStrip } from './IntroStrip';

vi.mock('../../lib/api', async (importOriginal) => {
  const actual = await importOriginal<object>();
  return { ...actual, apiFetch: vi.fn() };
});

describe('IntroStrip — apresentação da vitrine (CT-09-07)', () => {
  let root: Root;
  let container: HTMLDivElement;
  let queryClient: QueryClient;

  const render = () =>
    act(async () => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter>
            <IntroStrip />
          </MemoryRouter>
        </QueryClientProvider>,
      );
    });
  const closeButton = () =>
    container.querySelector<HTMLButtonElement>('button[aria-label="Fechar apresentação"]');

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(apiFetch).mockResolvedValue({ user: null });
    localStorage.clear();
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    act(() => root.unmount());
    container.remove();
    queryClient.clear();
  });

  it('explica o produto, os três passos e o "Como funciona"', async () => {
    await render();
    const text = container.textContent!;
    expect(text).toContain('Art Institute of Chicago');
    expect(text).toContain('lances ao vivo');
    expect(text).toContain('auditável');
    expect(container.querySelectorAll('ol li')).toHaveLength(3);
    expect(container.querySelector('details summary')?.textContent).toBe('Como funciona');
    expect(closeButton()).not.toBeNull();
  });

  it('visitante vê o link "Entrar" e a nota sobre usuários de demonstração, sem senhas', async () => {
    await render();
    await vi.waitFor(() => expect(container.querySelector('a[href="/entrar"]')).not.toBeNull());
    expect(container.textContent).toContain('README');
    expect(container.textContent).not.toMatch(/demo1234|@demo\.com/);
  });

  it('usuário logado não vê o link "Entrar", mas vê a apresentação', async () => {
    vi.mocked(apiFetch).mockResolvedValue({ user: { id: 'u1', name: 'Ana', role: 'BIDDER' } });
    await render();
    await vi.waitFor(() => expect(vi.mocked(apiFetch)).toHaveBeenCalled());
    await act(async () => {});
    expect(container.querySelector('a[href="/entrar"]')).toBeNull();
    expect(closeButton()).not.toBeNull();
  });

  it('fechar esconde a faixa e lembra a escolha no próximo carregamento', async () => {
    await render();
    await act(async () => closeButton()!.click());
    expect(container.querySelector('.intro-strip')).toBeNull();
    expect(localStorage.getItem(INTRO_DISMISSED_KEY)).toBe('1');

    act(() => root.unmount());
    root = createRoot(container);
    await render();
    expect(container.querySelector('.intro-strip')).toBeNull();
  });

  it('localStorage lançando não quebra: mostra a faixa e fechar funciona na sessão', async () => {
    const fail = () => {
      throw new Error('storage bloqueado');
    };
    vi.stubGlobal('localStorage', { getItem: fail, setItem: fail });
    await render();
    expect(container.querySelector('.intro-strip')).not.toBeNull();
    await act(async () => closeButton()!.click());
    expect(container.querySelector('.intro-strip')).toBeNull();
  });
});
