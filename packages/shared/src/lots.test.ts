import { describe, expect, it } from 'vitest';
import { createLotSchema, lotListQuerySchema, lotStartIssue } from './lots';

const valid = {
  externalId: '16568',
  title: 'Lírios d’água',
  description: 'Óleo sobre tela.',
  category: 'PAINTING',
  startingPriceCents: 100_000,
  minIncrementCents: 10_000,
  startsAt: '2026-10-24T18:00:00.000Z',
  endsAt: '2026-10-25T18:00:00.000Z',
};

const fieldOf = (input: unknown) => {
  const result = createLotSchema.safeParse(input);
  return result.success ? null : result.error.issues[0]?.path[0];
};

describe('createLotSchema (RN-02)', () => {
  it('aceita lote válido e converte datas', () => {
    const lot = createLotSchema.parse(valid);
    expect(lot.startsAt).toEqual(new Date(valid.startsAt));
    expect(lot.endsAt).toEqual(new Date(valid.endsAt));
  });

  it('descrição é opcional', () => {
    const withoutDescription: Partial<typeof valid> = { ...valid };
    delete withoutDescription.description;
    expect(createLotSchema.parse(withoutDescription).description).toBe('');
  });

  it.each([
    [{ startingPriceCents: 99 }, 'startingPriceCents'],
    [{ startingPriceCents: 1_000_000_001 }, 'startingPriceCents'],
    [{ startingPriceCents: 100.5 }, 'startingPriceCents'],
    [{ minIncrementCents: 0 }, 'minIncrementCents'],
    [{ minIncrementCents: 1_000_001 }, 'minIncrementCents'], // > 10 × inicial
    [{ title: 'ab' }, 'title'],
    [{ title: 'x'.repeat(141) }, 'title'],
    [{ description: 'x'.repeat(2001) }, 'description'],
    [{ category: 'JOIA' }, 'category'],
    [{ externalId: 'abc' }, 'externalId'],
    [{ startsAt: 'amanhã' }, 'startsAt'],
    [{ endsAt: '2026-10-24T18:04:59.999Z' }, 'endsAt'], // < início + 5 min
    [{ endsAt: '2026-11-23T18:00:00.001Z' }, 'endsAt'], // > início + 30 dias
  ])('rejeita %o', (override, field) => {
    expect(fieldOf({ ...valid, ...override })).toBe(field);
  });

  it('aceita exatamente 5 minutos e exatamente 30 dias', () => {
    expect(fieldOf({ ...valid, endsAt: '2026-10-24T18:05:00.000Z' })).toBeNull();
    expect(fieldOf({ ...valid, endsAt: '2026-11-23T18:00:00.000Z' })).toBeNull();
  });
});

describe('lotStartIssue', () => {
  const now = new Date('2026-10-24T18:00:00.000Z');
  it('aceita começar agora ou até 1 min no passado', () => {
    expect(lotStartIssue(new Date('2026-10-24T17:59:00.000Z'), now)).toBeNull();
    expect(lotStartIssue(new Date('2026-10-25T00:00:00.000Z'), now)).toBeNull();
  });
  it('recusa início mais de 1 min no passado', () => {
    expect(lotStartIssue(new Date('2026-10-24T17:58:59.999Z'), now)).toBe(
      'O início não pode estar no passado.',
    );
  });
});

describe('lotListQuerySchema', () => {
  it('exige a aba e aplica limite padrão', () => {
    expect(lotListQuerySchema.parse({ phase: 'live' })).toEqual({ phase: 'live', limit: 12 });
  });

  it.each([
    {},
    { phase: 'cancelled' },
    { phase: 'live', limit: '25' },
    { phase: 'live', limit: '0' },
  ])('rejeita %o', (input) => {
    expect(lotListQuerySchema.safeParse(input).success).toBe(false);
  });
});
