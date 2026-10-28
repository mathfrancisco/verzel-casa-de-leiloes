// @vitest-environment happy-dom

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { apiFetch } from '../../lib/api';
import { LoginPage } from './LoginPage';

vi.mock('../../lib/api', async (importOriginal) => {
  const actual = await importOriginal<object>();
  return { ...actual, apiFetch: vi.fn() };
});

let root: Root;
let container: HTMLDivElement;

function button(name: string): HTMLButtonElement {
  const found = [...container.querySelectorAll('button')].find((b) => b.textContent === name);
  if (!found) throw new Error(`botão não encontrado: ${name}`);
  return found;
}
function field(type: string): HTMLInputElement {
  return container.querySelector<HTMLInputElement>(`input[type="${type}"]`)!;
}

describe('LoginPage — contas de demonstração', () => {
  beforeEach(async () => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    vi.mocked(apiFetch).mockReset();
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
    await act(async () => {
      root.render(
        <QueryClientProvider client={new QueryClient()}>
          <MemoryRouter>
            <LoginPage />
          </MemoryRouter>
        </QueryClientProvider>,
      );
    });
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it('explica os papéis, o saldo simulado e a dica de dois perfis', () => {
    const text = container.querySelector('.demo-accounts')!.textContent!;
    expect(text).toContain('Contas de demonstração');
    expect(text).toContain('ana@demo.com');
    expect(text).toContain('bruno@demo.com');
    expect(text).toContain('leiloeiro@demo.com');
    expect(text).toContain('não dá lance');
    expect(text).toContain('saldo é simulado');
    expect(text).toContain('perfil de navegador separado');
  });

  it.each([
    ['Usar conta da Ana', 'ana@demo.com'],
    ['Usar conta do Bruno', 'bruno@demo.com'],
    ['Usar conta do leiloeiro', 'leiloeiro@demo.com'],
  ])('%s preenche os campos sem enviar', async (name, email) => {
    await act(async () => button(name).click());
    expect(field('email').value).toBe(email);
    expect(field('password').value).toBe('demo1234');
    expect(apiFetch).not.toHaveBeenCalled();
  });

  it('mantém um único botão chamado Entrar', () => {
    const entrar = [...container.querySelectorAll('button')].filter(
      (b) => b.textContent === 'Entrar',
    );
    expect(entrar).toHaveLength(1);
  });

  it('Entrar continua enviando as credenciais preenchidas', async () => {
    vi.mocked(apiFetch).mockResolvedValue({ user: { id: '1' } });
    await act(async () => button('Usar conta da Ana').click());
    await act(async () => button('Entrar').click());
    expect(apiFetch).toHaveBeenCalledTimes(1);
  });
});
