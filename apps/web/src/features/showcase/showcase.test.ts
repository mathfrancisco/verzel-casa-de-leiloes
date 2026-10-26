import type { LotSummary } from '@leilao/shared';
import { describe, expect, it } from 'vitest';
import {
  activeFilterCount,
  filtersFromParams,
  lotsApiPath,
  mergeLotPages,
  priceLine,
  priceParamFromText,
  searchFromState,
  tabFromParam,
  TAB_PARAM,
  type ShowcaseFilters,
} from './showcase';

const lot = (overrides: Partial<LotSummary>): LotSummary => ({
  id: '1',
  title: 'Obra',
  imageUrl: '/api/images/1',
  category: 'PAINTING',
  phase: 'LIVE',
  startsAt: '2026-10-24T18:00:00.000Z',
  endsAt: '2026-10-24T19:00:00.000Z',
  currentPriceCents: null,
  startingPriceCents: 10_000,
  bidCount: 0,
  serverTime: '2026-10-24T18:30:00.000Z',
  ...overrides,
});

describe('priceLine', () => {
  it.each([
    [{ phase: 'LIVE' as const }, 'Lance inicial', 10_000],
    [{ phase: 'LIVE' as const, currentPriceCents: 15_000, bidCount: 2 }, 'Lance atual', 15_000],
    [{ phase: 'SCHEDULED' as const }, 'Lance inicial', 10_000],
    [
      { phase: 'CLOSING' as const, currentPriceCents: 15_000, bidCount: 2 },
      'Lance vencedor',
      15_000,
    ],
    [
      { phase: 'SETTLED' as const, currentPriceCents: 15_000, bidCount: 2 },
      'Arrematado por',
      15_000,
    ],
    [{ phase: 'UNSOLD' as const }, 'Sem lances', null],
  ])('%o → %s', (overrides, label, amount) => {
    expect(priceLine(lot(overrides))).toEqual({ label, amountCents: amount });
  });
});

describe('tabFromParam', () => {
  it('lê a aba da URL e cai em "ao vivo" se vier algo desconhecido', () => {
    expect(tabFromParam(TAB_PARAM.scheduled)).toBe('scheduled');
    expect(tabFromParam(TAB_PARAM.closed)).toBe('closed');
    expect(tabFromParam(null)).toBe('live');
    expect(tabFromParam('qualquer')).toBe('live');
  });
});

describe('mergeLotPages', () => {
  it('reordena o lote prorrogado após o vizinho e mantém os dados mais recentes', () => {
    const first = lot({ id: '1', title: 'Primeiro', endsAt: '2026-10-24T19:00:00.000Z' });
    const second = lot({ id: '2', title: 'Segundo', endsAt: '2026-10-24T19:30:00.000Z' });
    const extended = lot({
      id: '1',
      title: 'Primeiro atualizado',
      endsAt: '2026-10-24T20:00:00.000Z',
    });

    expect(mergeLotPages([[first, second], [extended]], 'live')).toEqual([second, extended]);
  });

  it('ordena agendados por início e encerrados por fim decrescente com UUID na mesma direção', () => {
    const scheduledLate = lot({
      id: '2',
      phase: 'SCHEDULED',
      startsAt: '2026-10-25T12:00:00.000Z',
    });
    const scheduledEarly = lot({
      id: '1',
      phase: 'SCHEDULED',
      startsAt: '2026-10-25T11:00:00.000Z',
    });
    expect(mergeLotPages([[scheduledLate, scheduledEarly]], 'scheduled')).toEqual([
      scheduledEarly,
      scheduledLate,
    ]);

    const closedEarly = lot({ id: '1', phase: 'SETTLED', endsAt: '2026-10-24T18:00:00.000Z' });
    const closedTie1 = lot({ id: '2', phase: 'UNSOLD', endsAt: '2026-10-24T19:00:00.000Z' });
    const closedTie2 = lot({ id: '3', phase: 'SETTLED', endsAt: '2026-10-24T19:00:00.000Z' });
    expect(mergeLotPages([[closedEarly, closedTie1, closedTie2]], 'closed')).toEqual([
      closedTie2,
      closedTie1,
      closedEarly,
    ]);
  });
});

const none: ShowcaseFilters = { q: '', category: '', min: null, max: null, sort: '' };

describe('filtersFromParams (estado na URL)', () => {
  it('lê todos os filtros da URL', () => {
    const params = new URLSearchParams(
      'aba=encerrados&q=monet&categoria=PRINT&min=1000&max=5000&ordem=price_asc',
    );
    expect(filtersFromParams(params)).toEqual({
      q: 'monet',
      category: 'PRINT',
      min: 1000,
      max: 5000,
      sort: 'price_asc',
    });
  });

  it('sem parâmetros devolve filtros vazios', () => {
    expect(filtersFromParams(new URLSearchParams())).toEqual(none);
  });

  it('ignora valores inválidos ou adulterados na URL', () => {
    const params = new URLSearchParams(
      'q=' + 'x'.repeat(150) + '&categoria=JOIAS&min=-5&max=abc&ordem=aleatorio',
    );
    expect(filtersFromParams(params)).toEqual({ ...none, q: 'x'.repeat(100) });
  });

  it('ida e volta: o que vai para a URL volta igual', () => {
    const filters: ShowcaseFilters = {
      q: 'natureza morta',
      category: 'PAINTING',
      min: 0,
      max: 123_456,
      sort: 'newest',
    };
    expect(filtersFromParams(searchFromState('scheduled', filters))).toEqual(filters);
    expect(searchFromState('scheduled', filters).get('aba')).toBe('agendados');
  });
});

describe('searchFromState', () => {
  it('omite filtros vazios, mantendo só a aba', () => {
    expect(searchFromState('live', none).toString()).toBe('aba=ao-vivo');
  });
});

describe('lotsApiPath', () => {
  it('monta a consulta da API com os filtros ativos e sem os vazios', () => {
    expect(lotsApiPath('live', none)).toBe('/api/lots?phase=live');
    const path = lotsApiPath(
      'closed',
      { q: 'água & luz', category: 'PRINT', min: 1000, max: null, sort: 'price_desc' },
      'abc=',
    );
    const url = new URL(path, 'http://x');
    expect(url.pathname).toBe('/api/lots');
    expect(Object.fromEntries(url.searchParams)).toEqual({
      phase: 'closed',
      q: 'água & luz',
      category: 'PRINT',
      minPriceCents: '1000',
      sort: 'price_desc',
      cursor: 'abc=',
    });
  });
});

describe('priceParamFromText', () => {
  it.each([
    ['', { ok: true, cents: null }],
    ['  ', { ok: true, cents: null }],
    ['10', { ok: true, cents: 1000 }],
    ['R$ 1.234,56', { ok: true, cents: 123_456 }],
    ['abc', { ok: false }],
    ['-5', { ok: false }],
    ['1,234', { ok: false }],
  ])('%j → %j', (text, expected) => {
    expect(priceParamFromText(text)).toEqual(expected);
  });
});

describe('activeFilterCount', () => {
  it('conta só os filtros preenchidos', () => {
    expect(activeFilterCount(none)).toBe(0);
    expect(activeFilterCount({ ...none, q: 'a', min: 0, sort: 'newest' })).toBe(3);
  });
});

describe('mergeLotPages com ordenação escolhida', () => {
  it('price_asc ordena pelo preço efetivo, desempatando pelo id', () => {
    const cheap = lot({ id: 'b', startingPriceCents: 1000 });
    const bid = lot({ id: 'a', startingPriceCents: 500, currentPriceCents: 3000, bidCount: 1 });
    const tie = lot({ id: 'c', startingPriceCents: 1000 });
    expect(mergeLotPages([[bid, tie, cheap]], 'live', 'price_asc')).toEqual([cheap, tie, bid]);
    expect(mergeLotPages([[cheap, bid, tie]], 'live', 'price_desc')).toEqual([bid, tie, cheap]);
  });

  it('newest preserva a ordem do servidor, sem duplicar', () => {
    const a = lot({ id: 'a' });
    const b = lot({ id: 'b' });
    const aNew = lot({ id: 'a', title: 'novo' });
    expect(mergeLotPages([[b, a], [aNew]], 'live', 'newest')).toEqual([b, aNew]);
  });
});
