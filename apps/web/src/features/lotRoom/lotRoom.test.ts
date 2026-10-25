import { describe, expect, it, vi } from 'vitest';
import { ApiError } from '../../lib/api';
import { bidMessageFor } from '../../lib/errorMessages';
import {
  BidAttempts,
  bidStatus,
  isDeterministicBidFailure,
  shouldApplyBidSnapshot,
} from './lotRoom';

describe('BidAttempts', () => {
  it('preserva a chave de uma tentativa incerta e cria outra para um novo valor', () => {
    const attempts = new BidAttempts(new MapStorage());
    const createKey = vi.fn(() => `key-${createKey.mock.calls.length}`);

    const first = attempts.keyFor('user-a', 'lot-a', 10_000, createKey);
    expect(attempts.keyFor('user-a', 'lot-a', 10_000, createKey)).toBe(first);
    expect(attempts.keyFor('user-a', 'lot-a', 10_100, createKey)).not.toBe(first);
    expect(createKey).toHaveBeenCalledTimes(2);

    attempts.resolve('user-a', 'lot-a', 10_000);
    expect(attempts.keyFor('user-a', 'lot-a', 10_000, createKey)).not.toBe(first);
  });

  it('não reutiliza uma chave após recusa determinística', () => {
    expect(isDeterministicBidFailure(422)).toBe(true);
    expect(isDeterministicBidFailure(500)).toBe(false);
    expect(isDeterministicBidFailure(undefined)).toBe(false);
  });

  it('não substitui o snapshot se um evento mais novo já chegou', () => {
    expect(shouldApplyBidSnapshot(8, 8)).toBe(true);
    expect(shouldApplyBidSnapshot(8, 9)).toBe(false);
  });
});

describe('bidStatus', () => {
  it('deriva liderança, superação e primeiro lance a partir do snapshot público', () => {
    expect(
      bidStatus({
        phase: 'LIVE',
        myPseudonym: 'Eu',
        myBestBidCents: 11_000,
        leaderPseudonym: 'Eu',
        bidCount: 2,
      }),
    ).toBe('winning');
    expect(
      bidStatus({
        phase: 'LIVE',
        myPseudonym: 'Eu',
        myBestBidCents: 10_000,
        leaderPseudonym: 'Outra',
        bidCount: 2,
      }),
    ).toBe('outbid');
    expect(
      bidStatus({
        phase: 'LIVE',
        myPseudonym: 'Eu',
        myBestBidCents: null,
        leaderPseudonym: 'Outra',
        bidCount: 2,
      }),
    ).toBe('first');
    expect(
      bidStatus({
        phase: 'SETTLED',
        myPseudonym: 'Eu',
        myBestBidCents: 10_000,
        leaderPseudonym: 'Outra',
        bidCount: 2,
      }),
    ).toBe('closed');
    expect(
      bidStatus({
        phase: 'SCHEDULED',
        myPseudonym: 'Eu',
        myBestBidCents: null,
        leaderPseudonym: null,
        bidCount: 0,
      }),
    ).toBeNull();
  });
});

describe('bidErrorMessage', () => {
  it('inclui o mínimo e o saldo disponível devolvidos pela API', () => {
    expect(bidMessageFor(new ApiError(422, 'BELOW_MINIMUM', 'x', { minimumCents: 12_345 }))).toBe(
      'Lance abaixo do mínimo. O próximo lance deve ser de pelo menos R$ 123,45.',
    );
    expect(
      bidMessageFor(new ApiError(422, 'INSUFFICIENT_FUNDS', 'x', { availableCents: 500 })),
    ).toBe('Saldo insuficiente. Seu disponível é R$ 5,00.');
    expect(
      bidMessageFor(
        new ApiError(422, 'LOT_NOT_STARTED', 'x', { startsAt: '2026-10-25T14:30:00.000Z' }),
      ),
    ).toContain('Este lote ainda não começou. Abre em');
  });
});

class MapStorage {
  private readonly values = new Map<string, string>();

  getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string) {
    this.values.set(key, value);
  }

  removeItem(key: string) {
    this.values.delete(key);
  }
}
