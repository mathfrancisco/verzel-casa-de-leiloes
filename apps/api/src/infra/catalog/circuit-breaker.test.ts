import { describe, expect, it } from 'vitest';
import { CircuitBreaker } from './circuit-breaker';

describe('CircuitBreaker', () => {
  it('abre após 5 falhas seguidas e bloqueia novas chamadas', () => {
    const breaker = new CircuitBreaker({ failureThreshold: 5, openMs: 30_000, now: () => 0 });
    for (let i = 0; i < 4; i++) breaker.recordFailure();
    expect(breaker.canRequest()).toBe(true);
    breaker.recordFailure();
    expect(breaker.canRequest()).toBe(false);
  });

  it('sucesso zera a contagem de falhas', () => {
    const breaker = new CircuitBreaker({ failureThreshold: 2, openMs: 1000, now: () => 0 });
    breaker.recordFailure();
    breaker.recordSuccess();
    breaker.recordFailure();
    expect(breaker.canRequest()).toBe(true);
  });

  it('após o período aberto libera uma única tentativa (meia-abertura)', () => {
    let now = 0;
    const breaker = new CircuitBreaker({ failureThreshold: 1, openMs: 30_000, now: () => now });
    breaker.recordFailure();

    now = 29_999;
    expect(breaker.canRequest()).toBe(false);
    now = 30_000;
    expect(breaker.canRequest()).toBe(true);
    expect(breaker.canRequest()).toBe(false); // segunda chamada simultânea espera
  });

  it('tentativa da meia-abertura com sucesso fecha; com falha reabre', () => {
    let now = 0;
    const breaker = new CircuitBreaker({ failureThreshold: 1, openMs: 10, now: () => now });
    breaker.recordFailure();
    now = 10;
    breaker.canRequest();
    breaker.recordFailure();
    expect(breaker.canRequest()).toBe(false);

    now = 20;
    breaker.canRequest();
    breaker.recordSuccess();
    expect(breaker.canRequest()).toBe(true);
    expect(breaker.canRequest()).toBe(true);
  });
});
