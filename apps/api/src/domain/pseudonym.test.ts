import { describe, expect, it } from 'vitest';
import { pseudonym } from './pseudonym';

const secret = 's'.repeat(32);

describe('pseudonym (RN-16)', () => {
  it('tem prefixo e 6 caracteres base32 e é determinístico', () => {
    const value = pseudonym(secret, 'BIDDER', 'user-1', 'lot-1');
    expect(value).toMatch(/^Licitante [A-Z2-7]{6}$/);
    expect(pseudonym(secret, 'BIDDER', 'user-1', 'lot-1')).toBe(value);
    expect(pseudonym(secret, 'AUCTIONEER', 'user-1', 'lot-1')).toMatch(/^Leiloeiro [A-Z2-7]{6}$/);
  });

  it('o mesmo usuário tem pseudônimos diferentes em lotes diferentes (CT-08-12)', () => {
    expect(pseudonym(secret, 'BIDDER', 'user-1', 'lot-1')).not.toBe(
      pseudonym(secret, 'BIDDER', 'user-1', 'lot-2'),
    );
  });

  it('depende do segredo (não dá para recalcular sem ele)', () => {
    expect(pseudonym(secret, 'BIDDER', 'user-1', 'lot-1')).not.toBe(
      pseudonym('t'.repeat(32), 'BIDDER', 'user-1', 'lot-1'),
    );
  });
});
