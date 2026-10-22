import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../../src/app';
import { FakeCatalog } from '../../src/infra/catalog/fake-catalog';
import { buildTestApp } from '../support/app';
import { createTestDatabase } from '../support/database';

let testDb: Awaited<ReturnType<typeof createTestDatabase>>;
beforeAll(async () => {
  testDb = await createTestDatabase();
});
afterAll(() => testDb.drop());

describe('GET /ready', () => {
  it('responde 200 quando o banco está acessível', async () => {
    const app = buildTestApp(testDb);
    const res = await app.inject({ method: 'GET', url: '/ready' });
    await app.close();

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ status: 'ready' });
  });

  it('responde 503 quando o banco não responde', async () => {
    const unreachable = postgres('postgres://leilao:leilao@127.0.0.1:1/leilao', {
      connect_timeout: 1,
      max: 1,
    });
    const app = buildApp({
      db: drizzle(unreachable),
      sql: unreachable,
      catalog: new FakeCatalog(),
      config: { jwtSecret: 'x'.repeat(32), secureCookies: false },
    });
    const res = await app.inject({ method: 'GET', url: '/ready' });
    await app.close();
    await unreachable.end();

    expect(res.statusCode).toBe(503);
    expect(res.json()).toEqual({ status: 'unavailable' });
  });
});
