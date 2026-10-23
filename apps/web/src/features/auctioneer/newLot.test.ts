import type { CatalogItem } from '@leilao/shared';
import { describe, expect, it } from 'vitest';
import { buildCreateLotPayload, formFromItem, toLocalInputValue, type LotForm } from './newLot';

const now = new Date('2026-10-24T15:00:30.000Z');
const local = (value: string) => new Date(value).toISOString(); // independe do fuso da máquina

const form = (overrides: Partial<LotForm> = {}): LotForm => ({
  title: 'Lírios d’água',
  description: '',
  category: 'PAINTING',
  startingPrice: '1.500,00',
  minIncrement: '100',
  startsAt: toLocalInputValue(new Date(now.getTime() + 60_000)),
  endsAt: toLocalInputValue(new Date(now.getTime() + 86_400_000)),
  ...overrides,
});

describe('buildCreateLotPayload', () => {
  it('converte reais em centavos e datas locais em UTC', () => {
    const result = buildCreateLotPayload(
      form({ startsAt: '2026-10-24T18:00', endsAt: '2026-10-25T18:00' }),
      '16568',
      now,
    );
    expect(result).toEqual({
      ok: true,
      payload: {
        externalId: '16568',
        title: 'Lírios d’água',
        description: '',
        category: 'PAINTING',
        startingPriceCents: 150_000,
        minIncrementCents: 10_000,
        startsAt: local('2026-10-24T18:00'),
        endsAt: local('2026-10-25T18:00'),
      },
    });
  });

  it('fim antes de início + 5 min → erro no campo fim', () => {
    const result = buildCreateLotPayload(
      form({ startsAt: '2026-10-24T18:00', endsAt: '2026-10-24T18:04' }),
      '1',
      now,
    );
    expect(result).toEqual({
      ok: false,
      errors: { endsAt: 'O lote deve durar pelo menos 5 minutos.' },
    });
  });

  it('incremento 0 → erro no campo incremento', () => {
    const result = buildCreateLotPayload(form({ minIncrement: '0' }), '1', now);
    expect(result).toEqual({
      ok: false,
      errors: { minIncrement: 'O incremento mínimo é R$ 1,00.' },
    });
  });

  it('valor em formato inválido → erro no campo', () => {
    const result = buildCreateLotPayload(form({ startingPrice: '1,5,0' }), '1', now);
    expect(result.ok).toBe(false);
    expect(!result.ok && result.errors.startingPrice).toBe(
      'Informe um valor em reais, ex.: 1.500,00.',
    );
  });

  it('início no passado → erro no campo início', () => {
    const result = buildCreateLotPayload(
      form({ startsAt: toLocalInputValue(new Date(now.getTime() - 3_600_000)) }),
      '1',
      now,
    );
    expect(!result.ok && result.errors.startsAt).toBe('O início não pode estar no passado.');
  });

  it('sem obra selecionada → erro de obra', () => {
    const result = buildCreateLotPayload(form(), null, now);
    expect(!result.ok && result.errors.externalId).toBe('Selecione uma obra do catálogo.');
  });

  it('data vazia → erro no campo', () => {
    const result = buildCreateLotPayload(form({ endsAt: '' }), '1', now);
    expect(!result.ok && result.errors.endsAt).toBe('Informe data e hora.');
  });
});

describe('formFromItem', () => {
  const item: CatalogItem = {
    externalId: '16568',
    title: 'x'.repeat(200),
    artist: 'Claude Monet',
    date: '1906',
    medium: null,
    dimensions: null,
    origin: null,
    imageUrl: 'https://www.artic.edu/iiif/2/a/full/843,/0/default.jpg',
    sourceUrl: 'https://www.artic.edu/artworks/16568',
    suggestedCategory: 'PRINT',
  };

  it('preenche título (até 140) e categoria sugerida; início no próximo minuto e fim em 24 h', () => {
    const filled = formFromItem(item, now);
    expect(filled.title).toHaveLength(140);
    expect(filled.category).toBe('PRINT');
    expect(filled.startsAt).toBe(toLocalInputValue(new Date('2026-10-24T15:01:00.000Z')));
    expect(filled.endsAt).toBe(toLocalInputValue(new Date('2026-10-25T15:01:00.000Z')));
  });
});

describe('toLocalInputValue', () => {
  it('gera o formato do input datetime-local na hora local', () => {
    const date = new Date(2026, 9, 24, 8, 5); // 24/10/2026 08:05 local
    expect(toLocalInputValue(date)).toBe('2026-10-24T08:05');
  });
});
