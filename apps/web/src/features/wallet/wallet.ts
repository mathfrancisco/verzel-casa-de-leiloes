import { parseBRL } from '@leilao/shared';

export type DepositPayload = { ok: true; amountCents: number } | { ok: false; error: string };

export const walletQueryKey = (userId: string) => ['wallet', userId] as const;

interface SessionStorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

function browserSessionStorage(): SessionStorageLike | undefined {
  try {
    return window.sessionStorage;
  } catch {
    return undefined;
  }
}

/** Mantém a mesma chave enquanto a pessoa repete uma tentativa não confirmada. */
export class DepositAttempts {
  private readonly keys = new Map<string, string>();

  constructor(private readonly storage: SessionStorageLike | undefined = browserSessionStorage()) {}

  keyFor(userId: string, amountCents: number, createKey: () => string): string {
    const attempt = this.attemptKey(userId, amountCents);
    const existing = this.keys.get(attempt);
    if (existing) return existing;

    const persisted = this.read(attempt);
    if (persisted) {
      this.keys.set(attempt, persisted);
      return persisted;
    }

    const key = createKey();
    this.keys.set(attempt, key);
    this.write(attempt, key);
    return key;
  }

  resolve(userId: string, amountCents: number) {
    const attempt = this.attemptKey(userId, amountCents);
    this.keys.delete(attempt);
    try {
      this.storage?.removeItem(attempt);
    } catch {
      // O fallback em memória continua funcionando quando o storage é bloqueado.
    }
  }

  private attemptKey(userId: string, amountCents: number) {
    return `wallet-deposit:${encodeURIComponent(userId)}:${amountCents}`;
  }

  private read(attempt: string) {
    try {
      return this.storage?.getItem(attempt) ?? undefined;
    } catch {
      return undefined;
    }
  }

  private write(attempt: string, key: string) {
    try {
      this.storage?.setItem(attempt, key);
    } catch {
      // O fallback em memória continua funcionando quando o storage é bloqueado.
    }
  }
}

export function isDeterministicDepositFailure(status: number | undefined) {
  return status !== undefined && status >= 400 && status < 500;
}

/** Validação local espelha RN-17; o servidor permanece a fonte de verdade. */
export function buildDepositPayload(value: string): DepositPayload {
  const amountCents = parseBRL(value);
  if (amountCents === null || !Number.isInteger(amountCents)) {
    return { ok: false, error: 'Informe um valor em reais, ex.: 100,00.' };
  }
  if (amountCents < 100) return { ok: false, error: 'O depósito mínimo é R$ 1,00.' };
  if (amountCents > 100_000_000) {
    return { ok: false, error: 'O depósito máximo é R$ 1.000.000,00.' };
  }
  return { ok: true, amountCents };
}
