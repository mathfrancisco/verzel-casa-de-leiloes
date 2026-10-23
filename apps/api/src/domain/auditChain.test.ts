import { createHash } from 'node:crypto';
import type { CatalogItem } from '@leilao/shared';
import { describe, expect, it } from 'vitest';
import { genesisHash, type GenesisTerms } from './auditChain';

const itemSnapshot: CatalogItem = {
  externalId: '16568',
  title: 'Lírios d’água',
  artist: 'Claude Monet',
  date: '1906',
  medium: 'Óleo sobre tela',
  dimensions: '89 × 100 cm',
  origin: 'França',
  imageUrl: 'https://example.invalid/16568.jpg',
  sourceUrl: 'https://example.invalid/16568',
  suggestedCategory: 'PAINTING',
};

const terms: GenesisTerms = {
  lotId: '0192f3a0-0000-7000-8000-000000000001',
  externalId: '16568',
  imageSha256: 'a'.repeat(64),
  title: 'Lírios d’água',
  description: 'Pintura impressionista.',
  category: 'PAINTING',
  itemSnapshot,
  sellerPseudonym: 'Leiloeiro ABCDEF',
  startingPriceCents: 100_000,
  minIncrementCents: 10_000,
  startsAt: '2026-10-24T18:00:00.000Z',
  originalEndsAt: '2026-10-25T18:00:00.000Z',
};

describe('genesisHash', () => {
  it('é o SHA-256 do JSON canônico dos termos', () => {
    const canonical =
      '{"category":"PAINTING","description":"Pintura impressionista.","externalId":"16568","imageSha256":"' +
      'a'.repeat(64) +
      '","itemSnapshot":{"artist":"Claude Monet","date":"1906","dimensions":"89 × 100 cm","externalId":"16568","imageUrl":"https://example.invalid/16568.jpg","medium":"Óleo sobre tela","origin":"França","sourceUrl":"https://example.invalid/16568","suggestedCategory":"PAINTING","title":"Lírios d’água"},"lotId":"0192f3a0-0000-7000-8000-000000000001","minIncrementCents":10000,' +
      '"originalEndsAt":"2026-10-25T18:00:00.000Z","sellerPseudonym":"Leiloeiro ABCDEF",' +
      '"startingPriceCents":100000,"startsAt":"2026-10-24T18:00:00.000Z","title":"Lírios d’água"}';
    expect(genesisHash(terms)).toBe(createHash('sha256').update(canonical, 'utf8').digest('hex'));
  });

  it.each([
    ['lotId', { ...terms, lotId: `${terms.lotId}x` }],
    ['externalId', { ...terms, externalId: `${terms.externalId}x` }],
    ['imageSha256', { ...terms, imageSha256: `${terms.imageSha256}x` }],
    ['title', { ...terms, title: `${terms.title}x` }],
    ['description', { ...terms, description: `${terms.description}x` }],
    ['category', { ...terms, category: 'SCULPTURE' as const }],
    ['sellerPseudonym', { ...terms, sellerPseudonym: `${terms.sellerPseudonym}x` }],
    ['startingPriceCents', { ...terms, startingPriceCents: terms.startingPriceCents + 1 }],
    ['minIncrementCents', { ...terms, minIncrementCents: terms.minIncrementCents + 1 }],
    ['startsAt', { ...terms, startsAt: `${terms.startsAt}x` }],
    ['originalEndsAt', { ...terms, originalEndsAt: `${terms.originalEndsAt}x` }],
  ] as const)('muda quando "%s" muda', (_field, changed) => {
    expect(genesisHash(changed)).not.toBe(genesisHash(terms));
  });

  it.each(Object.entries(itemSnapshot))('muda quando atributo "%s" do item muda', (key, value) => {
    const changed = {
      ...terms,
      itemSnapshot: {
        ...terms.itemSnapshot,
        [key]: value === null ? 'alterado' : `${value}x`,
      } as CatalogItem,
    };
    expect(genesisHash(changed)).not.toBe(genesisHash(terms));
  });
});
