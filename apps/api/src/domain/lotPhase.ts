import type { LotPhase } from '@leilao/shared';

export type LotState = 'ACTIVE' | 'SETTLED' | 'CLOSED_NO_WINNER' | 'CANCELLED';

/** Fase exibida, derivada do estado gravado e do horário (RN-03). Nunca é gravada. */
export function lotPhase(
  lot: { state: LotState; startsAt: Date; endsAt: Date },
  now: Date,
): LotPhase {
  switch (lot.state) {
    case 'SETTLED':
      return 'SETTLED';
    case 'CLOSED_NO_WINNER':
      return 'UNSOLD';
    case 'CANCELLED':
      return 'CANCELLED';
    case 'ACTIVE':
      if (now < lot.startsAt) return 'SCHEDULED';
      return now < lot.endsAt ? 'LIVE' : 'CLOSING';
  }
}
