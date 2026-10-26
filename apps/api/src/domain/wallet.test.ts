import { describe, expect, it } from 'vitest';
import { computeAvailable } from './wallet';

describe('computeAvailable', () => {
  it('subtrai o saldo comprometido do total (RN-07)', () => {
    expect(computeAvailable(10_000, 3_500)).toBe(6_500);
  });

  it('não permite compromisso maior que o saldo', () => {
    expect(() => computeAvailable(1_000, 1_001)).toThrow('comprometido');
  });
});
