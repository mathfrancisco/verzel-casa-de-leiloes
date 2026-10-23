import { describe, expect, it } from 'vitest';
import { formatBRL, parseBRL } from './money';

// Intl usa espaço não separável entre "R$" e o número.
const nbsp = ' ';

describe('formatBRL', () => {
  it.each([
    [0, `R$${nbsp}0,00`],
    [1, `R$${nbsp}0,01`],
    [100, `R$${nbsp}1,00`],
    [123456, `R$${nbsp}1.234,56`],
    [100_000_000, `R$${nbsp}1.000.000,00`],
  ])('formata %i centavos como %s', (cents, expected) => {
    expect(formatBRL(cents)).toBe(expected);
  });

  it('rejeita valor que não é inteiro seguro', () => {
    expect(() => formatBRL(1.5)).toThrow(RangeError);
    expect(() => formatBRL(Number.MAX_SAFE_INTEGER + 1)).toThrow(RangeError);
  });
});

describe('parseBRL', () => {
  it.each([
    ['1.234,56', 123456],
    ['R$ 1.234,56', 123456],
    [`R$${nbsp}1.234,56`, 123456],
    ['1234,56', 123456],
    ['1234', 123400],
    ['1234,5', 123450],
    ['0,01', 1],
    ['  10  ', 1000],
    ['1.000.000', 100_000_000],
  ])('lê "%s" como %i centavos', (input, expected) => {
    expect(parseBRL(input)).toBe(expected);
  });

  it.each(['', 'abc', '-10', '1,234', '1.23', '12.34,56', '1,2,3', 'R$', '1e5', '10,'])(
    'rejeita "%s"',
    (input) => {
      expect(parseBRL(input)).toBeNull();
    },
  );

  it('rejeita valor acima do inteiro seguro', () => {
    expect(parseBRL('999999999999999999')).toBeNull();
  });

  it('ida e volta com formatBRL é exata', () => {
    for (const cents of [0, 1, 99, 100, 123456, 987654321]) {
      expect(parseBRL(formatBRL(cents))).toBe(cents);
    }
  });
});
