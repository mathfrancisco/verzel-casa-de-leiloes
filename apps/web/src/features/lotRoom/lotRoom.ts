import type { LotPhase } from '@leilao/shared';

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

/** Mantém a mesma chave enquanto a pessoa repete um lance de resultado incerto. */
export class BidAttempts {
  private readonly keys = new Map<string, string>();

  constructor(private readonly storage: SessionStorageLike | undefined = browserSessionStorage()) {}

  keyFor(userId: string, lotId: string, amountCents: number, createKey: () => string): string {
    const attempt = this.attemptKey(userId, lotId, amountCents);
    const existing = this.keys.get(attempt) ?? this.read(attempt);
    if (existing) {
      this.keys.set(attempt, existing);
      return existing;
    }
    const key = createKey();
    this.keys.set(attempt, key);
    this.write(attempt, key);
    return key;
  }

  resolve(userId: string, lotId: string, amountCents: number) {
    const attempt = this.attemptKey(userId, lotId, amountCents);
    this.keys.delete(attempt);
    try {
      this.storage?.removeItem(attempt);
    } catch {
      // O mapa em memória continua disponível quando o storage é bloqueado.
    }
  }

  private attemptKey(userId: string, lotId: string, amountCents: number) {
    return `lot-bid:${encodeURIComponent(userId)}:${encodeURIComponent(lotId)}:${amountCents}`;
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
      // O mapa em memória continua disponível quando o storage é bloqueado.
    }
  }
}

export function isDeterministicBidFailure(status: number | undefined) {
  return status !== undefined && status >= 400 && status < 500;
}

/** Um ACK atrasado não pode substituir um snapshot que já contém um lance posterior. */
export function shouldApplyBidSnapshot(responseSeq: number, newestSeq: number) {
  return responseSeq >= newestSeq;
}

export function bidStatus(input: {
  phase: LotPhase;
  myPseudonym: string | undefined;
  myBestBidCents: number | null | undefined;
  leaderPseudonym: string | null;
  bidCount: number;
  isSeller?: boolean;
}): 'winning' | 'outbid' | 'first' | 'closed' | null {
  if (input.isSeller) return null;
  if (input.phase !== 'LIVE') {
    return input.phase === 'SETTLED' || input.phase === 'UNSOLD'
      ? input.myPseudonym
        ? 'closed'
        : null
      : null;
  }
  if (!input.myPseudonym) return null;
  if (input.leaderPseudonym === input.myPseudonym) return 'winning';
  if (input.myBestBidCents === null || input.myBestBidCents === undefined) return 'first';
  return 'outbid';
}
