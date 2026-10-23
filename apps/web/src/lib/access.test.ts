import { describe, expect, it } from 'vitest';
import { resolveAccess } from './access';

const bidder = { id: '1', name: 'Ana', email: 'a@b.com', role: 'BIDDER' as const };

describe('resolveAccess', () => {
  it.each([
    [undefined, 'BIDDER', 'loading'],
    [null, 'BIDDER', 'login'],
    [bidder, 'BIDDER', 'allow'],
    [bidder, 'AUCTIONEER', 'forbidden'],
    [bidder, undefined, 'allow'],
    [null, undefined, 'login'],
  ] as const)('usuário %o em rota %s → %s', (user, role, expected) => {
    expect(resolveAccess(user, role)).toBe(expected);
  });
});
