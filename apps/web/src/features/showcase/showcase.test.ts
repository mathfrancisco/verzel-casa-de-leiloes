import type { LotSummary } from '@leilao/shared';
import { describe, expect, it } from 'vitest';
import { mergeLotPages, priceLine, tabFromParam, TAB_PARAM } from './showcase';

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
