// @vitest-environment happy-dom

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { describe, expect, it, vi } from 'vitest';
import { apiFetch } from '../../lib/api';
import { clearPrivateSessionQueries, useLogin } from './session';

vi.mock('../../lib/api', () => ({ apiFetch: vi.fn() }));

function LoginButton() {
  const login = useLogin();
  return createElement(
    'button',
    { onClick: () => login.mutate({ email: 'b@example.test', password: 'senha' }) },
    'Entrar',
  );
}

describe('clearPrivateSessionQueries', () => {
  it('remove carteiras privadas de sessões anteriores ao sair', () => {
    const client = new QueryClient();
    client.setQueryData(['wallet', 'user-a'], { totalCents: 100 });
    client.setQueryData(['wallet', 'user-b'], { totalCents: 200 });
    client.setQueryData(['auctioneer-lots', 'user-a'], { items: [{ id: 'lot-a' }] });
    client.setQueryData(['lots'], { items: [] });

    clearPrivateSessionQueries(client);

    expect(client.getQueryData(['wallet', 'user-a'])).toBeUndefined();
    expect(client.getQueryData(['wallet', 'user-b'])).toBeUndefined();
    expect(client.getQueryData(['auctioneer-lots', 'user-a'])).toBeUndefined();
    expect(client.getQueryData(['lots'])).toEqual({ items: [] });
  });

  it('remove dados privados de A antes de aceitar login direto de B', async () => {
    const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
    client.setQueryData(['wallet', 'user-a'], { totalCents: 100 });
    client.setQueryData(['participations'], { items: [{ lotId: 'a' }] });
    client.setQueryData(['auctioneer-lots', 'user-a'], { items: [{ id: 'lot-a' }] });
    vi.mocked(apiFetch).mockResolvedValue({
      user: { id: 'user-b', name: 'B', role: 'BIDDER' },
    });
    const container = document.createElement('div');
    document.body.append(container);
    const root: Root = createRoot(container);
    await act(async () => {
      root.render(createElement(QueryClientProvider, { client }, createElement(LoginButton)));
    });
    act(() => (container.querySelector('button') as HTMLButtonElement).click());
    await vi.waitFor(() => expect(client.getQueryData(['me'])).toMatchObject({ id: 'user-b' }));
    expect(client.getQueryData(['wallet', 'user-a'])).toBeUndefined();
    expect(client.getQueryData(['participations'])).toBeUndefined();
    expect(client.getQueryData(['auctioneer-lots', 'user-a'])).toBeUndefined();
    act(() => root.unmount());
    container.remove();
  });
});
