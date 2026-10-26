import {
  cancelLotSchema,
  createLotSchema,
  lotListQuerySchema,
  placeBidSchema,
  type LotDetail,
  type LotListResponse,
  type AuctioneerLotsResponse,
} from '@leilao/shared';
import type { FastifyInstance } from 'fastify';
import {
  createLot,
  getImage,
  getLotDetail,
  listAuctioneerLots,
  listLots,
  type LotDeps,
} from '../application/lots';
import { getAuditReport, type AuditDeps } from '../application/audit';
import { placeBid, type BidDeps } from '../application/bids';
import { cancelLot } from '../application/cancel';
import { DomainError } from '../domain/errors';
import { optionalUser, requireAuth, requireRole } from './auth-guard';
import { readIdempotencyKey } from './idempotency-key';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function lotRoutes(app: FastifyInstance, deps: LotDeps & BidDeps & AuditDeps): void {
  app.get('/api/audit/public-key', async () => ({
    algorithm: 'Ed25519' as const,
    publicKey: deps.publicKeyBase64url,
  }));
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

  app.get(
    '/api/auctioneer/lots',
    { preHandler: requireRole('AUCTIONEER') },
    async (request): Promise<AuctioneerLotsResponse> =>
      listAuctioneerLots(deps.db, request.user.sub),
  );

  app.get<{ Params: { id: string } }>('/api/lots/:id', async (request): Promise<LotDetail> => {
    const lot = await getLotDetail(deps, request.params.id, await optionalUser(request));
    if (!lot) throw new DomainError('LOT_NOT_FOUND');
    return lot;
  });

  app.post<{ Params: { id: string } }>(
    '/api/lots/:id/cancel',
    { preHandler: requireRole('AUCTIONEER') },
    async (request): Promise<LotDetail> => {
      if (!UUID.test(request.params.id)) throw new DomainError('LOT_NOT_FOUND');
      return cancelLot(
        deps,
        { id: request.user.sub, role: request.user.role },
        request.params.id,
        cancelLotSchema.parse(request.body ?? {}),
      );
    },
  );
  app.get<{ Params: { id: string } }>('/api/lots/:id/audit', async (request) => {
    if (!UUID.test(request.params.id)) throw new DomainError('LOT_NOT_FOUND');
    const report = await getAuditReport(deps, request.params.id);
    if (!report) throw new DomainError('LOT_NOT_FOUND');
    return report;
  });

  app.post<{ Params: { id: string } }>('/api/lots/:id/bids', async (request, reply) => {
    await requireAuth(request);
    if (request.user.role !== 'BIDDER') throw new DomainError('SELLER_CANNOT_BID');
    if (!UUID.test(request.params.id)) throw new DomainError('LOT_NOT_FOUND');
    const key = readIdempotencyKey(request);
    const result = await placeBid(
      deps,
      { id: request.user.sub, role: request.user.role },
      request.params.id,
      placeBidSchema.parse(request.body),
      key,
    );
    return reply.code(201).send(result);
  });

  app.get<{ Params: { id: string } }>('/api/images/:id', async (request, reply) => {
    const image = await getImage(deps.db, request.params.id);
    if (!image) throw new DomainError('NOT_FOUND');
    // A imagem de um lote nunca muda (id novo a cada upload): cache longo + validador pelo SHA-256.
    const etag = `"${image.sha256}"`;
    reply.header('etag', etag).header('cache-control', 'public, max-age=31536000, immutable');
    const candidates = request.headers['if-none-match']
      ?.split(',')
      .map((v) => v.trim().replace(/^W\//, ''));
    if (candidates?.includes(etag) || candidates?.includes('*')) return reply.code(304).send();
    return reply.header('content-type', image.contentType).send(image.bytes);
  });
}
