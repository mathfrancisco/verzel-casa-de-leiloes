import { describe, expect, it } from 'vitest';
import { catalogSearchQuerySchema, LOT_CATEGORIES } from './catalog';

describe('catalogSearchQuerySchema', () => {
  it('aceita busca válida e converte page para número', () => {
    expect(catalogSearchQuerySchema.parse({ q: ' monet ', page: '2' })).toEqual({
      q: 'monet',
      page: 2,
    });
  });

  it('page padrão é 1', () => {
    expect(catalogSearchQuerySchema.parse({ q: 'monet' })).toEqual({ q: 'monet', page: 1 });
  });

  it.each([
    [{ q: 'a' }, 'q'],
    [{ q: 'x'.repeat(101) }, 'q'],
    [{ q: 'monet', page: '0' }, 'page'],
    [{ q: 'monet', page: '51' }, 'page'],
    [{ q: 'monet', page: '1.5' }, 'page'],
  ])('rejeita %o', (input, field) => {
    const result = catalogSearchQuerySchema.safeParse(input);
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual([field]);
  });
});

describe('LOT_CATEGORIES', () => {
  it('tem rótulo em português para cada categoria', () => {
    expect(Object.keys(LOT_CATEGORIES)).toEqual([
      'PAINTING',
      'SCULPTURE',
      'PHOTOGRAPHY',
      'PRINT',
      'DRAWING',
      'TEXTILE',
      'OTHER',
    ]);
    expect(LOT_CATEGORIES.PAINTING).toBe('Pintura');
  });
});
