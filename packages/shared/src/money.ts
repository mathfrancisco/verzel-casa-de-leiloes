// Dinheiro trafega sempre como inteiro em centavos (BRL). Estes helpers são a única ponte
// entre centavos e o texto exibido/digitado pelo usuário.

const formatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

// "1.234,56" | "1234,56" | "1234" | "1234,5" — milhares com ponto só em grupos de 3.
const BRL_PATTERN = /^(\d{1,3}(?:\.\d{3})+|\d+)(?:,(\d{1,2}))?$/;

export function formatBRL(cents: number): string {
  if (!Number.isSafeInteger(cents)) {
    throw new RangeError(`Valor em centavos inválido: ${cents}`);
  }
  return formatter.format(cents / 100);
}

/** Converte texto em reais para centavos. Retorna `null` se o texto não for um valor válido. */
export function parseBRL(input: string): number | null {
  const normalized = input.replace(/^\s*R\$\s*/u, '').trim();
  const match = BRL_PATTERN.exec(normalized);
  if (!match) return null;

  const reais = match[1]!.replaceAll('.', '');
  const centavos = (match[2] ?? '').padEnd(2, '0');
  const cents = Number(reais + centavos);
  return Number.isSafeInteger(cents) ? cents : null;
}
