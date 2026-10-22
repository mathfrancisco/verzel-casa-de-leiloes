import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { genesisHash, type GenesisTerms } from './auditChain';

const terms: GenesisTerms = {
  lotId: '0192f3a0-0000-7000-8000-000000000001',
  externalId: '16568',
  imageSha256: 'a'.repeat(64),
  title: 'Lírios d’água',
  sellerPseudonym: 'Leiloeiro ABCDEF',
  startingPriceCents: 100_000,
  minIncrementCents: 10_000,
  startsAt: '2026-10-24T18:00:00.000Z',
  originalEndsAt: '2026-10-25T18:00:00.000Z',
};

describe('genesisHash', () => {
  it('é o SHA-256 do JSON canônico dos termos', () => {
    const canonical =
      '{"externalId":"16568","imageSha256":"' +
      'a'.repeat(64) +
      '","lotId":"0192f3a0-0000-7000-8000-000000000001","minIncrementCents":10000,' +
      '"originalEndsAt":"2026-10-25T18:00:00.000Z","sellerPseudonym":"Leiloeiro ABCDEF",' +
      '"startingPriceCents":100000,"startsAt":"2026-10-24T18:00:00.000Z","title":"Lírios d’água"}';
    expect(genesisHash(terms)).toBe(createHash('sha256').update(canonical, 'utf8').digest('hex'));
  });

  it.each(Object.keys(terms) as (keyof GenesisTerms)[])('muda quando "%s" muda', (key) => {
    const changed = {
      ...terms,
      [key]: typeof terms[key] === 'number' ? Number(terms[key]) + 1 : `${terms[key]}x`,
    };
    expect(genesisHash(changed)).not.toBe(genesisHash(terms));
  });
});
