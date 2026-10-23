import type { LotSummary } from '@leilao/shared';
import { describe, expect, it } from 'vitest';
import { priceLine, tabFromParam, TAB_PARAM } from './showcase';

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
