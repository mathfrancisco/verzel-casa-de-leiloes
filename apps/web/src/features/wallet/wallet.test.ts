import { describe, expect, it, vi } from 'vitest';
import {
  buildDepositPayload,
  DepositAttempts,
  isDeterministicDepositFailure,
  walletQueryKey,
} from './wallet';

describe('buildDepositPayload', () => {
  it('converte reais em centavos para o depósito', () => {
    expect(buildDepositPayload('100,00')).toEqual({ ok: true, amountCents: 10_000 });
  });

  it('recusa valor abaixo do mínimo', () => {
    expect(buildDepositPayload('0,99')).toEqual({
      ok: false,
      error: 'O depósito mínimo é R$ 1,00.',
    });
  });

  it('isola a cache da carteira por usuário', () => {
    expect(walletQueryKey('user-a')).not.toEqual(walletQueryKey('user-b'));
  });

  it('repete uma tentativa incerta com a mesma chave e separa contas', () => {
    const storage = new MapStorage();
    const attempts = new DepositAttempts(storage);
    const createKey = vi.fn(() => `key-${createKey.mock.calls.length}`);

    const first = attempts.keyFor('user-a', 10_000, createKey);
    expect(attempts.keyFor('user-a', 10_000, createKey)).toBe(first);
    expect(attempts.keyFor('user-b', 10_000, createKey)).not.toBe(first);
    expect(createKey).toHaveBeenCalledTimes(2);

    attempts.resolve('user-a', 10_000);
    expect(attempts.keyFor('user-a', 10_000, createKey)).not.toBe(first);
  });

  it('recupera a chave pendente depois de reconstruir a tela', () => {
    const storage = new MapStorage();
    const firstPage = new DepositAttempts(storage);
    const key = firstPage.keyFor('user-a', 10_000, () => 'attempt-key');
    const reloadedPage = new DepositAttempts(storage);

    expect(reloadedPage.keyFor('user-a', 10_000, () => 'new-key')).toBe(key);
    reloadedPage.resolve('user-a', 10_000);
    expect(new DepositAttempts(storage).keyFor('user-a', 10_000, () => 'new-key')).toBe('new-key');
  });

  it('continua sem crash quando sessionStorage está indisponível', () => {
    const attempts = new DepositAttempts(new UnavailableStorage());

    expect(attempts.keyFor('user-a', 10_000, () => 'attempt-key')).toBe('attempt-key');
    expect(() => attempts.resolve('user-a', 10_000)).not.toThrow();
  });

  it('libera a tentativa após erro determinístico, mas retém falha incerta', () => {
    expect(isDeterministicDepositFailure(400)).toBe(true);
    expect(isDeterministicDepositFailure(403)).toBe(true);
    expect(isDeterministicDepositFailure(500)).toBe(false);
    expect(isDeterministicDepositFailure(undefined)).toBe(false);
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

class UnavailableStorage {
  getItem(): never {
    throw new Error('blocked');
  }

  setItem(): never {
    throw new Error('blocked');
  }

  removeItem(): never {
    throw new Error('blocked');
  }
}
