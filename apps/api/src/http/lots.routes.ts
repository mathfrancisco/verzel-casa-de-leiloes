import {
  createLotSchema,
  lotListQuerySchema,
  type LotDetail,
  type LotListResponse,
} from '@leilao/shared';
import type { FastifyInstance } from 'fastify';
import { createLot, getImage, getLotDetail, listLots, type LotDeps } from '../application/lots';
import { DomainError } from '../domain/errors';
import { optionalUser, requireRole } from './auth-guard';

export function lotRoutes(app: FastifyInstance, deps: LotDeps): void {
  app.post('/api/lots', { preHandler: requireRole('AUCTIONEER') }, async (request, reply) => {
    const lot = await createLot(
      deps,
      { id: request.user.sub, role: request.user.role },
      createLotSchema.parse(request.body),
    );
    return reply.code(201).send(lot);
  });

  app.get(
    '/api/lots',
    async (request): Promise<LotListResponse> =>
      listLots(deps.db, lotListQuerySchema.parse(request.query)),
  );

  app.get<{ Params: { id: string } }>('/api/lots/:id', async (request): Promise<LotDetail> => {
    const lot = await getLotDetail(deps, request.params.id, await optionalUser(request));
    if (!lot) throw new DomainError('LOT_NOT_FOUND');
    return lot;
  });

  app.get<{ Params: { id: string } }>('/api/images/:id', async (request, reply) => {
    const image = await getImage(deps.db, request.params.id);
    if (!image) throw new DomainError('NOT_FOUND');
    return reply
      .header('content-type', image.contentType)
      .header('cache-control', 'public, max-age=31536000, immutable')
      .send(image.bytes);
  });
}
