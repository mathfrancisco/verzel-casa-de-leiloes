import { catalogSearchQuerySchema, type CatalogSearchResult } from '@leilao/shared';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { CatalogProvider } from '../ports/catalog';
import { requireRole } from './auth-guard';

/** Limite por usuário logado (SP-00); sem sessão válida, cai no IP. */
async function userKey(request: FastifyRequest): Promise<string> {
  try {
    await request.jwtVerify();
    return `user:${request.user.sub}`;
  } catch {
    return `ip:${request.ip}`;
  }
}

export function catalogRoutes(app: FastifyInstance, catalog: CatalogProvider): void {
  const config = { rateLimit: { max: 30, timeWindow: '1 minute', keyGenerator: userKey } };
  const preHandler = requireRole('AUCTIONEER');

  app.get(
    '/api/catalog/search',
    { config, preHandler },
    async (request): Promise<CatalogSearchResult> => {
      const { q, page } = catalogSearchQuerySchema.parse(request.query);
      return catalog.search(q, page);
    },
  );

  app.get<{ Params: { externalId: string } }>(
    '/api/catalog/items/:externalId',
    { config, preHandler },
    async (request) => catalog.getItem(request.params.externalId),
  );
}
