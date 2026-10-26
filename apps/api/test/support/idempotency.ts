import { createHash } from 'node:crypto';

/**
 * Converte um rótulo legível em UUID determinístico (mesmo rótulo → mesma chave), já que a API
 * exige `Idempotency-Key` em UUID (SP-00).
 */
export function idemKey(label: string): string {
  const h = createHash('sha256').update(label).digest('hex');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-8${h.slice(17, 20)}-${h.slice(20, 32)}`;
}
