import { z } from 'zod';

/** Mensagens do cliente para entrar e sair das salas públicas de lotes. */
export const lotRoomSchema = z.object({
  lotId: z.string().uuid('Lote inválido.'),
});
export type LotRoomInput = z.infer<typeof lotRoomSchema>;

export type LotRoomAck = { ok: true } | { ok: false; error: { code: string } };

export interface RealtimeEvent {
  serverTime: string;
}

export interface BidAcceptedEvent extends RealtimeEvent {
  lotId: string;
  seq: number;
  amountCents: number;
  bidderPseudonym: string;
  createdAt: string;
  hash: string;
  currentPriceCents: number;
  minimumNextBidCents: number;
  bidCount: number;
  endsAt: string;
}

export interface LotExtendedEvent extends RealtimeEvent {
  lotId: string;
  endsAt: string;
  previousEndsAt: string;
}

export interface LotClosedEvent extends RealtimeEvent {
  lotId: string;
  result: 'SOLD' | 'UNSOLD';
  finalPriceCents: number | null;
  winnerPseudonym: string | null;
}

export interface LotCancelledEvent extends RealtimeEvent {
  lotId: string;
  reason: string;
}

export interface BidOutbidEvent extends RealtimeEvent {
  lotId: string;
  lotTitle: string;
  newPriceCents: number;
}

export interface WalletChangedEvent extends RealtimeEvent {
  totalCents: number;
  committedCents: number;
  availableCents: number;
}

export interface LotWonEvent extends RealtimeEvent {
  lotId: string;
  lotTitle: string;
  amountCents: number;
  receiptCode: string;
}

export interface ServerToClientEvents {
  'bid.accepted': (event: BidAcceptedEvent) => void;
  'lot.extended': (event: LotExtendedEvent) => void;
  'lot.closed': (event: LotClosedEvent) => void;
  'lot.cancelled': (event: LotCancelledEvent) => void;
  'bid.outbid': (event: BidOutbidEvent) => void;
  'wallet.changed': (event: WalletChangedEvent) => void;
  'lot.won': (event: LotWonEvent) => void;
  pong: (event: RealtimeEvent & { pong: true }) => void;
}

export interface ClientToServerEvents {
  'lot.join': (input: LotRoomInput, ack: (response: LotRoomAck) => void) => void;
  'lot.leave': (input: LotRoomInput, ack: (response: LotRoomAck) => void) => void;
  ping: (ack: (response: RealtimeEvent & { pong: true }) => void) => void;
}
