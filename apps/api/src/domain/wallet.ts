/** Saldo disponível é sempre derivado do total menos o valor comprometido (RN-07). */
export function computeAvailable(totalCents: number, committedCents: number): number {
  if (!Number.isSafeInteger(totalCents) || !Number.isSafeInteger(committedCents)) {
    throw new RangeError('Valores da carteira devem ser inteiros seguros.');
  }
  if (totalCents < 0 || committedCents < 0 || committedCents > totalCents) {
    throw new RangeError('Saldo comprometido inválido.');
  }
  return totalCents - committedCents;
}
