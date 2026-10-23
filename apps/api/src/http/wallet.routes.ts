import { depositSchema } from '@leilao/shared';
import type { FastifyInstance } from 'fastify';
import { createDeposit, getWallet } from '../application/wallet';
import type { Db } from '../infra/db/client';
import { DomainError } from '../domain/errors';
import { requireAuth, requireRole } from './auth-guard';

export function walletRoutes(app: FastifyInstance, deps: { db: Db }) {
  app.get('/api/wallet', { preHandler: requireAuth }, async (request) =>
    getWallet(deps, { id: request.user.sub }),
  );

  app.post(
    '/api/wallet/deposits',
    { preHandler: requireRole('BIDDER') },
    async (request, reply) => {
      const key = request.headers['idempotency-key'];
      if (typeof key !== 'string' || key.trim() === '')
        throw new DomainError('IDEMPOTENCY_KEY_REQUIRED');
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
