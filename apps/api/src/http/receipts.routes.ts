import type { ParticipationsResponse, Receipt } from '@leilao/shared';
import type { FastifyInstance } from 'fastify';
import { getReceipt, listParticipations, type ReceiptDeps } from '../application/receipts';
import { DomainError } from '../domain/errors';
import { requireRole } from './auth-guard';

const RECEIPT_CODE = /^[A-Za-z0-9_-]{22}$/;

export function receiptRoutes(app: FastifyInstance, deps: ReceiptDeps): void {
  app.get<{ Params: { code: string } }>(
    '/api/receipts/:code',
    async (request): Promise<Receipt> => {
      if (!RECEIPT_CODE.test(request.params.code)) throw new DomainError('NOT_FOUND');
      const receipt = await getReceipt(deps, request.params.code);
      if (!receipt) throw new DomainError('NOT_FOUND');
      return receipt;
    },
  );

  app.get(
    '/api/me/participations',
    { preHandler: requireRole('BIDDER') },
    async (request): Promise<ParticipationsResponse> =>
      listParticipations(deps.db, request.user.sub),
  );
}
