import { describe, expect, it } from 'vitest';
import { DomainError } from './errors';
import { validateBid, type BidLotState } from './bidRules';

const now = new Date('2026-10-23T18:00:00.000Z');
const lot = (overrides: Partial<BidLotState> = {}): BidLotState => ({
  state: 'ACTIVE',
  startsAt: new Date('2026-10-23T17:00:00.000Z'),
  endsAt: new Date('2026-10-23T19:00:00.000Z'),
  sellerId: 'seller',
  leaderId: null,
  startingPriceCents: 1_000,
  currentPriceCents: null,
  minIncrementCents: 100,
  ...overrides,
});

function errorCode(run: () => void) {
  return errorOf(run).code;
}

function errorOf(run: () => void): DomainError {
  try {
    run();
  } catch (error) {
    if (error instanceof DomainError) return error;
    throw error;
  }
  throw new Error('A regra deveria rejeitar o lance.');
}

describe('validateBid (RN-04..08)', () => {
  it('aceita o primeiro lance no valor inicial e rejeita um centavo abaixo (CT-05-01)', () => {
    expect(() => validateBid(lot(), 'bidder', 1_000, now, 1_000)).not.toThrow();
    expect(() => validateBid(lot({ startsAt: now }), 'bidder', 1_000, now, 1_000)).not.toThrow();
    expect(errorOf(() => validateBid(lot(), 'bidder', 999, now, 1_000))).toMatchObject({
      code: 'BELOW_MINIMUM',
      details: { minimumCents: 1_000 },
    });
  });

  it('exige o incremento depois do primeiro lance (CT-05-02)', () => {
    const current = lot({ currentPriceCents: 1_000, leaderId: 'other' });
    expect(() => validateBid(current, 'bidder', 1_100, now, 1_100)).not.toThrow();
    expect(errorOf(() => validateBid(current, 'bidder', 1_099, now, 1_100))).toMatchObject({
      code: 'BELOW_MINIMUM',
      details: { minimumCents: 1_100 },
    });
  });

  it.each([
    ['antes do início', lot({ startsAt: new Date('2026-10-23T18:00:00.001Z') }), 'LOT_NOT_STARTED'],
    ['no fim', lot({ endsAt: now }), 'LOT_CLOSED'],
    ['cancelado', lot({ state: 'CANCELLED' }), 'LOT_CANCELLED'],
    ['líder atual', lot({ leaderId: 'bidder' }), 'ALREADY_WINNING'],
    ['saldo insuficiente', lot(), 'INSUFFICIENT_FUNDS'],
  ] as const)('%s usa o primeiro erro prescrito (CT-05-03..05,07,10)', (_name, state, code) => {
    expect(errorCode(() => validateBid(state, 'bidder', 1_000, now, 999))).toBe(code);
  });

  it('não deixa o vendedor cobrir o próprio lote (CT-05-09)', () => {
    expect(errorCode(() => validateBid(lot(), 'seller', 1_000, now, 1_000))).toBe(
      'SELLER_CANNOT_BID',
    );
  });

  it('fecha antes de avaliar o mínimo e informa saldo disponível (CT-05-05,07)', () => {
    expect(errorCode(() => validateBid(lot({ endsAt: now }), 'bidder', 999, now, 0))).toBe(
      'LOT_CLOSED',
    );
    expect(errorOf(() => validateBid(lot(), 'bidder', 1_000, now, 999))).toMatchObject({
      code: 'INSUFFICIENT_FUNDS',
      details: { availableCents: 999 },
    });
  });
});
