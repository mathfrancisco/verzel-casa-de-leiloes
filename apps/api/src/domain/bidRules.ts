import type { ErrorCode } from '@leilao/shared';
import { DomainError } from './errors';

export interface BidLotState {
  state: 'ACTIVE' | 'SETTLED' | 'CLOSED_NO_WINNER' | 'CANCELLED';
  startsAt: Date;
  endsAt: Date;
  sellerId: string;
  leaderId: string | null;
  startingPriceCents: number;
  currentPriceCents: number | null;
  minIncrementCents: number;
}

/** RN-04..08, in the prescribed order after the route checked the bidder role. */
export function validateBid(
  lot: BidLotState,
  bidderId: string,
  amountCents: number,
  now: Date,
  availableCents: number,
): void {
  const fail = (code: ErrorCode, details?: Record<string, unknown>) => {
    throw new DomainError(code, details);
  };
  if (lot.sellerId === bidderId) fail('SELLER_CANNOT_BID');
  if (lot.state === 'CANCELLED') fail('LOT_CANCELLED');
  if (now < lot.startsAt) fail('LOT_NOT_STARTED', { startsAt: lot.startsAt.toISOString() });
  if (now >= lot.endsAt || lot.state !== 'ACTIVE') fail('LOT_CLOSED');
  if (lot.leaderId === bidderId) fail('ALREADY_WINNING');
  const minimumCents =
    lot.currentPriceCents === null
      ? lot.startingPriceCents
      : lot.currentPriceCents + lot.minIncrementCents;
  if (amountCents < minimumCents) fail('BELOW_MINIMUM', { minimumCents });
  if (amountCents > availableCents) fail('INSUFFICIENT_FUNDS', { availableCents });
}
