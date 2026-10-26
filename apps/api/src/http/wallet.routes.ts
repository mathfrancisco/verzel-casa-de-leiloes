import { depositSchema } from '@leilao/shared';
import type { FastifyInstance } from 'fastify';
import { createDeposit, getWallet, type WalletDeps } from '../application/wallet';
import { requireAuth, requireRole } from './auth-guard';
import { readIdempotencyKey } from './idempotency-key';

export function walletRoutes(app: FastifyInstance, deps: WalletDeps) {
  app.get('/api/wallet', { preHandler: requireAuth }, async (request) =>
    getWallet(deps, { id: request.user.sub }),
  );

  app.post(
    '/api/wallet/deposits',
    { preHandler: requireRole('BIDDER') },
    async (request, reply) => {
      const key = readIdempotencyKey(request);
      const wallet = await createDeposit(
        deps,
        { id: request.user.sub },
        depositSchema.parse(request.body),
        key,
      );
      return reply.code(201).send(wallet);
    },
  );
}
