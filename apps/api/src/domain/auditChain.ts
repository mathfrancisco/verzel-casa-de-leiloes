import { createHash } from 'node:crypto';
import { canonicalJson } from '@leilao/shared';

// Cadeia de auditoria (docs/03-arquitetura.md §5, ai/specs/SP-08-auditoria.md). Aqui só a gênese;
// os elos assinados entram no LC-010.

export interface GenesisTerms {
  lotId: string;
  externalId: string;
  imageSha256: string;
  title: string;
  sellerPseudonym: string;
  startingPriceCents: number;
  minIncrementCents: number;
  /** ISO-8601 UTC com milissegundos. */
  startsAt: string;
  originalEndsAt: string;
}

export function sha256Hex(data: string | Uint8Array): string {
  return createHash('sha256').update(data).digest('hex');
}

/** Hash dos termos do lote: alterar qualquer termo depois quebra a cadeia. */
export function genesisHash(terms: GenesisTerms): string {
  return sha256Hex(canonicalJson({ ...terms }));
}
