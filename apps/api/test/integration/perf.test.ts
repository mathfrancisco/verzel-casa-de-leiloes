import { PAYLOAD_TOO_LARGE_MESSAGE, type ApiErrorBody } from '@leilao/shared';
import { drizzle } from 'drizzle-orm/postgres-js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { SERVER_LIMITS } from '../../src/app';
import { getWallet } from '../../src/application/wallet';
import { listAuctioneerLots, listLots } from '../../src/application/lots';
import * as schema from '../../src/infra/db/schema';
import { buildTestApp } from '../support/app';
import { createTestDatabase } from '../support/database';
import { insertLotRow } from '../support/lots';

let testDb: Awaited<ReturnType<typeof createTestDatabase>>;
let app: ReturnType<typeof buildTestApp>;
let sellerId: string;
let imageUrl: string;

beforeAll(async () => {
  testDb = await createTestDatabase();
  app = buildTestApp(testDb);
  const res = await app.inject({
    method: 'POST',
    url: '/api/auth/register',
    payload: {
      name: 'Leila Leiloeira',
      email: 'leila@perf.test',
      password: 'senha-forte',
      role: 'AUCTIONEER',
    },
  });
  sellerId = res.json().user.id as string;
  const lotId = await insertLotRow(testDb, { sellerId, startsInMin: -10, endsInMin: 10 });
  const lot = await app.inject({ method: 'GET', url: `/api/lots/${lotId}` });
  imageUrl = lot.json().imageUrl as string;
});
afterAll(async () => {
  await app.close();
  await testDb.drop();
});

describe('limites do servidor', () => {
  it('aplica limites de corpo e tempo no Fastify', () => {
    expect(app.initialConfig.bodyLimit).toBe(SERVER_LIMITS.bodyLimit);
    expect(app.initialConfig.connectionTimeout).toBe(SERVER_LIMITS.connectionTimeout);
    expect(app.initialConfig.keepAliveTimeout).toBe(SERVER_LIMITS.keepAliveTimeout);
    expect(app.server.requestTimeout).toBe(SERVER_LIMITS.requestTimeout);
    // keep-alive acima dos 60 s típicos de balanceador
    expect(SERVER_LIMITS.keepAliveTimeout).toBeGreaterThan(60_000);
  });

  it('corpo acima do limite -> 413 no envelope da SP-00', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      headers: { 'content-type': 'application/json' },
      payload: JSON.stringify({ email: 'a@b.co', password: 'x'.repeat(SERVER_LIMITS.bodyLimit) }),
    });
    expect(res.statusCode).toBe(413);
    const body = res.json<ApiErrorBody>();
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(body.error.message).toBe(PAYLOAD_TOO_LARGE_MESSAGE);
  });

  it('corpo normal continua passando', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: 'leila@perf.test', password: 'senha-forte' },
    });
    expect(res.statusCode).toBe(200);
  });

  it('headersTimeout fica acima do keepAliveTimeout', () => {
    expect(app.server.headersTimeout).toBe(SERVER_LIMITS.headersTimeout);
    expect(app.server.headersTimeout).toBeGreaterThan(app.server.keepAliveTimeout);
  });
});

describe('GET /api/images/:id', () => {
  it('envia cache longo imutável e ETag', async () => {
    const res = await app.inject({ method: 'GET', url: imageUrl });
    expect(res.statusCode).toBe(200);
    expect(res.headers['cache-control']).toBe('public, max-age=31536000, immutable');
    expect(res.headers.etag).toBe(`"${'0'.repeat(64)}"`);
    expect(res.headers['content-type']).toContain('image/png');
  });

  it('If-None-Match igual -> 304 sem corpo, mantendo o cache', async () => {
    const etag = `"${'0'.repeat(64)}"`;
    const res = await app.inject({
      method: 'GET',
      url: imageUrl,
      headers: { 'if-none-match': `"outro", ${etag}` },
    });
    expect(res.statusCode).toBe(304);
    expect(res.body).toBe('');
    expect(res.headers['cache-control']).toBe('public, max-age=31536000, immutable');
    expect(res.headers.etag).toBe(etag);
  });

  it('validador fraco (W/) e "*" também dão 304', async () => {
    for (const value of [`W/"${'0'.repeat(64)}"`, '*']) {
      const res = await app.inject({
        method: 'GET',
        url: imageUrl,
        headers: { 'if-none-match': value },
      });
      expect(res.statusCode, value).toBe(304);
    }
  });

  it('If-None-Match diferente -> 200 com corpo', async () => {
    const res = await app.inject({
      method: 'GET',
      url: imageUrl,
      headers: { 'if-none-match': '"outro"' },
    });
    expect(res.statusCode).toBe(200);
    expect(res.rawPayload.length).toBeGreaterThan(0);
  });
});

describe('número de consultas (sem N+1)', () => {
  function countingDb() {
    let count = 0;
    const db = drizzle(testDb.sql, { schema, logger: { logQuery: () => (count += 1) } });
    return { db, queries: () => count, reset: () => (count = 0) };
  }

  it('vitrine e painel do leiloeiro têm custo constante em consultas por número de lotes', async () => {
    const counting = countingDb();
    const measure = async () => {
      counting.reset();
      await listLots(counting.db, { phase: 'live', limit: 12 } as never);
      const vitrine = counting.queries();
      counting.reset();
      await listAuctioneerLots(counting.db, sellerId);
      return { vitrine, painel: counting.queries() };
    };

    const few = await measure();
    for (let i = 0; i < 15; i += 1) {
      await insertLotRow(testDb, { sellerId, startsInMin: -10, endsInMin: 10 + i });
    }
    const many = await measure();

    expect(many).toEqual(few);
  });

  it('carteira não consulta por lote comprometido', async () => {
    const bidder = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { name: 'Beto', email: 'beto@perf.test', password: 'senha-forte', role: 'BIDDER' },
    });
    const bidderId = bidder.json().user.id as string;
    const counting = countingDb();
    const measure = async () => {
      counting.reset();
      await getWallet({ db: counting.db }, { id: bidderId });
      return counting.queries();
    };
    await testDb.sql`
      INSERT INTO wallet_entries (user_id, type, amount_cents) VALUES (${bidderId}, 'DEPOSIT', 1000000)`;
    const before = await measure();
    for (let i = 0; i < 5; i += 1) {
      await insertLotRow(testDb, {
        sellerId,
        startsInMin: -10,
        endsInMin: 30,
        current: { bidderId, priceCents: 5000 + i },
      });
    }
    expect(await measure()).toBe(before);
  });
});

describe('índices da vitrine', () => {
  it('existem os índices parciais de ordenação (encerrados e mais novos)', async () => {
    const rows = await testDb.sql<{ indexname: string }[]>`
      SELECT indexname FROM pg_indexes
      WHERE tablename = 'lots' AND indexname IN ('lots_visible_ends_idx', 'lots_visible_created_idx')`;
    expect(rows.map((r) => r.indexname).sort()).toEqual([
      'lots_visible_created_idx',
      'lots_visible_ends_idx',
    ]);
  });
});
