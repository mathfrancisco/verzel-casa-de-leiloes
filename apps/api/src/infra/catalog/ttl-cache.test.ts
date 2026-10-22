import { describe, expect, it } from 'vitest';
import { TtlCache } from './ttl-cache';

describe('TtlCache', () => {
  it('devolve valor fresco dentro do TTL e nada depois dele', () => {
    let now = 0;
    const cache = new TtlCache<string>({ ttlMs: 100, maxEntries: 10, now: () => now });
    cache.set('a', 'A');

    now = 100;
    expect(cache.getFresh('a')).toBe('A');
    now = 101;
    expect(cache.getFresh('a')).toBeUndefined();
    expect(cache.getAny('a')).toBe('A'); // fallback quando a API cai
  });

  it('descarta o menos usado recentemente ao passar do limite', () => {
    const cache = new TtlCache<number>({ ttlMs: 1000, maxEntries: 2, now: () => 0 });
    cache.set('a', 1);
    cache.set('b', 2);
    cache.getFresh('a'); // "a" passa a ser o mais recente
    cache.set('c', 3);

    expect(cache.getAny('b')).toBeUndefined();
    expect(cache.getAny('a')).toBe(1);
    expect(cache.getAny('c')).toBe(3);
  });
});
