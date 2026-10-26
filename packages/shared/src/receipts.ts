import type { CatalogItem } from './catalog';
import type { LotPhase } from './lots';

/** Representação pública e verificável de um comprovante (RN-16, RN-19). */
export interface Receipt {
  code: string;
  lot: { id: string; title: string; imageUrl: string; item: CatalogItem };
  amountCents: number;
  winnerPseudonym: string;
  issuedAt: string;
  finalHash: string;
  signature: string;
  /** Chave Ed25519 bruta (32 bytes), em base64url. */
  publicKey: string;
  auditUrl: string;
  revoked: boolean;
  revokedAt: string | null;
}

export type ParticipationStatus = 'WINNING' | 'OUTBID' | 'WON' | 'LOST' | 'CANCELLED';

export interface Participation {
  lotId: string;
  title: string;
  imageUrl: string;
  phase: LotPhase;
  myBestBidCents: number;
  currentPriceCents: number;
  status: ParticipationStatus;
  receiptCode: string | null;
  endsAt: string;
}

export interface ParticipationsResponse {
  items: Participation[];
}
