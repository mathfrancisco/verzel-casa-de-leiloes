import type { HealthResponse } from '@leilao/shared';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { afterAll, describe, expect, it } from 'vitest';
import { buildApp } from '../app';

// O cliente postgres só conecta na primeira query; o health não consulta o banco.
const sql = postgres('postgres://unused@127.0.0.1:1/unused');
const app = buildApp({
  db: drizzle(sql),
  sql,
  config: { jwtSecret: 'x'.repeat(32), secureCookies: false },
});
afterAll(async () => {
  await app.close();
  await sql.end();
});

describe('health', () => {
  it.each(['/health', '/api/health'])(
    'GET %s responde ok com o horário do servidor',
    async (url) => {
      const res = await app.inject({ method: 'GET', url });

      expect(res.statusCode).toBe(200);
      const body = res.json<HealthResponse>();
      expect(body.status).toBe('ok');
      expect(Number.isNaN(Date.parse(body.serverTime))).toBe(false);
    },
  );

  it('rota inexistente responde 404', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/nao-existe' });
    expect(res.statusCode).toBe(404);
  });
});
