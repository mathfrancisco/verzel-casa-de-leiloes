import { describe, expect, it } from 'vitest';
import { safeNext } from './LoginPage';

describe('safeNext', () => {
  it.each([
    ['/carteira', '/carteira'],
    [null, '/'],
    ['https://malicioso.com', '/'],
    ['//malicioso.com', '/'],
    ['carteira', '/'],
  ])('%s → %s', (input, expected) => {
    expect(safeNext(input)).toBe(expected);
  });
});
