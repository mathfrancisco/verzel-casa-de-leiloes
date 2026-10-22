import type { ApiErrorBody, CatalogSearchResult } from '@leilao/shared';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { FakeCatalog } from '../../src/infra/catalog/fake-catalog';
import { buildTestApp, sessionCookie } from '../support/app';
import { createTestDatabase } from '../support/database';

let testDb: Awaited<ReturnType<typeof createTestDatabase>>;
let app: ReturnType<typeof buildTestApp>;
const catalog = new FakeCatalog();
let auctioneer: Record<string, string>;
let bidder: Record<string, string>;

const signup = async (role: string) =>
  sessionCookie(
    await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: {
        name: 'Teste',
        email: `${role}${Date.now()}@demo.com`,
        password: 'senha-forte',
        role,
      },
    }),
  );

beforeAll(async () => {
  testDb = await createTestDatabase();
  app = buildTestApp(testDb, {}, { catalog });
  auctioneer = await signup('AUCTIONEER');
  bidder = await signup('BIDDER');
});
afterAll(async () => {
  await app.close();
  await testDb.drop();
});
beforeEach(() => catalog.setMode('ok'));

const search = (query: string, cookies?: Record<string, string>) =>
  app.inject({ method: 'GET', url: `/api/catalog/search?${query}`, cookies });

describe('GET /api/catalog/search', () => {
  it('leiloeiro busca e recebe itens', async () => {
    const res = await search('q=lírios', auctioneer);
    expect(res.statusCode).toBe(200);
    const body = res.json<CatalogSearchResult>();
    expect(body).toMatchObject({ page: 1, fromCache: false });
    expect(body.items[0]?.title).toContain('Lírios');
  });

  it('catálogo fora → 503 CATALOG_UNAVAILABLE (CT-02-06)', async () => {
    catalog.setMode('fail');
    const res = await search('q=monet', auctioneer);
    expect(res.statusCode).toBe(503);
    expect(res.json<ApiErrorBody>().error.code).toBe('CATALOG_UNAVAILABLE');
  });

  it('licitante não pode buscar (CT-02-08)', async () => {
    const res = await search('q=monet', bidder);
    expect(res.statusCode).toBe(403);
  });

  it('visitante não pode buscar', async () => {
    expect((await search('q=monet')).statusCode).toBe(401);
  });

  it.each(['q=a', 'q=monet&page=0', 'page=1'])('consulta inválida "%s" → 400', async (query) => {
    const res = await search(query, auctioneer);
    expect(res.statusCode).toBe(400);
    expect(res.json<ApiErrorBody>().error.code).toBe('VALIDATION_ERROR');
  });
});

describe('GET /api/catalog/items/:externalId', () => {
  it('devolve o item', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/catalog/items/1001',
      cookies: auctioneer,
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ externalId: '1001' });
  });

  it('item inexistente → 404 CATALOG_ITEM_NOT_FOUND', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/catalog/items/9',
      cookies: auctioneer,
    });
    expect(res.statusCode).toBe(404);
    expect(res.json<ApiErrorBody>().error.code).toBe('CATALOG_ITEM_NOT_FOUND');
  });
});

describe('rate limit do catálogo', () => {
  it('limita a 30 buscas por minuto por usuário', async () => {
    const limited = buildTestApp(testDb, {}, { catalog });
    const registered = await limited.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: {
        name: 'Leiloeira',
        email: `limite${Date.now()}@demo.com`,
        password: 'senha-forte',
        role: 'AUCTIONEER',
      },
    });
    const cookies = sessionCookie(registered);
    let last = 0;
    for (let i = 0; i < 31; i++) {
      last = (await limited.inject({ method: 'GET', url: '/api/catalog/search?q=monet', cookies }))
        .statusCode;
    }
    await limited.close();
    expect(last).toBe(429);
  });
});
