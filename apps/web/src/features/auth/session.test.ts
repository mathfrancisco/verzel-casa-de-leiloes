import { QueryClient } from '@tanstack/react-query';
import { describe, expect, it } from 'vitest';
import { clearPrivateSessionQueries } from './session';

describe('clearPrivateSessionQueries', () => {
  it('remove carteiras privadas de sessões anteriores ao sair', () => {
    const client = new QueryClient();
    client.setQueryData(['wallet', 'user-a'], { totalCents: 100 });
    client.setQueryData(['wallet', 'user-b'], { totalCents: 200 });
    client.setQueryData(['lots'], { items: [] });

    clearPrivateSessionQueries(client);

    expect(client.getQueryData(['wallet', 'user-a'])).toBeUndefined();
    expect(client.getQueryData(['wallet', 'user-b'])).toBeUndefined();
    expect(client.getQueryData(['lots'])).toEqual({ items: [] });
  });
});
