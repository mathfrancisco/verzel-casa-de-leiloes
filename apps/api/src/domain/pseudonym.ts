import { createHmac } from 'node:crypto';
import type { Role } from '@leilao/shared';

const BASE32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const PREFIX: Record<Role, string> = { BIDDER: 'Licitante', AUCTIONEER: 'Leiloeiro' };

/**
 * Identificação pública por lote (RN-16): HMAC com segredo do servidor, então não dá para
 * descobrir quem é nem correlacionar o mesmo usuário entre lotes.
 */
export function pseudonym(secret: string, role: Role, userId: string, lotId: string): string {
  const digest = createHmac('sha256', secret).update(`${userId}:${lotId}`).digest();
  let code = '';
  // 6 caracteres × 5 bits = 30 bits dos primeiros 4 bytes.
  const bits = digest.readUInt32BE(0);
  for (let i = 0; i < 6; i++) code += BASE32[(bits >>> (27 - i * 5)) & 31];
  return `${PREFIX[role]} ${code}`;
}
