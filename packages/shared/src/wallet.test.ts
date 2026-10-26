import { describe, expect, it } from 'vitest';
import { depositSchema } from './wallet';

describe('depositSchema', () => {
  it('aceita um depósito inteiro dentro dos limites de RN-17', () => {
    expect(depositSchema.parse({ amountCents: 10_000 })).toEqual({ amountCents: 10_000 });
  });

  it.each([0, -1, 100.5, 100_000_001])('recusa %s centavos', (amountCents) => {
    expect(depositSchema.safeParse({ amountCents }).success).toBe(false);
  });
});
