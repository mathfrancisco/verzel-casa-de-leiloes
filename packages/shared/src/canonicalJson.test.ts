import { describe, expect, it } from 'vitest';
import { canonicalJson } from './canonicalJson';

describe('canonicalJson', () => {
  it('ordena chaves recursivamente e não usa espaços', () => {
    expect(canonicalJson({ b: 1, a: { d: [3, { z: 1, y: 2 }], c: 'x' } })).toBe(
      '{"a":{"c":"x","d":[3,{"y":2,"z":1}]},"b":1}',
    );
  });

  it('mantém null explícito, booleanos e strings UTF-8', () => {
    expect(canonicalJson({ title: 'Lírios d’água', amount: null, ok: true })).toBe(
      '{"amount":null,"ok":true,"title":"Lírios d’água"}',
    );
  });

  it('a mesma informação em ordem diferente gera o mesmo texto', () => {
    expect(canonicalJson({ x: 1, y: 2 })).toBe(canonicalJson({ y: 2, x: 1 }));
  });

  it.each([
    [{ a: undefined }, 'undefined'],
    [{ a: 1.5 }, 'inteiro'],
    [{ a: Number.MAX_SAFE_INTEGER + 1 }, 'inteiro'],
    [{ a: Number.NaN }, 'inteiro'],
    [{ a: new Date(0) }, 'Date'],
  ])('rejeita valor ambíguo %o', (value, message) => {
    expect(() => canonicalJson(value)).toThrow(message);
  });
});
