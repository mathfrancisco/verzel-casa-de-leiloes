import type { ApiErrorBody } from '@leilao/shared';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildTestApp } from '../support/app';
import { createTestDatabase } from '../support/database';

const webDistDir = fileURLToPath(new URL('../fixtures/web', import.meta.url));

let testDb: Awaited<ReturnType<typeof createTestDatabase>>;
let app: ReturnType<typeof buildTestApp>;
beforeAll(async () => {
  testDb = await createTestDatabase();
  app = buildTestApp(testDb, { webDistDir });
});
afterAll(async () => {
  await app.close();
  await testDb.drop();
});

describe('SPA servido pela API', () => {
  it('GET / devolve o index.html sem cache', async () => {
    const res = await app.inject({ method: 'GET', url: '/' });
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toContain('text/html');
    expect(res.body).toContain('SPA de teste');
    expect(res.headers['cache-control']).toBe('no-cache');
  });

  it('rota do SPA (ex.: /lotes/123) cai no index.html', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/lotes/123',
      headers: { accept: 'text/html' },
    });
    expect(res.statusCode).toBe(200);
    expect(res.body).toContain('SPA de teste');
  });

  it('arquivos de /assets têm cache imutável', async () => {
    const res = await app.inject({ method: 'GET', url: '/assets/app-abc123.js' });
    expect(res.statusCode).toBe(200);
    expect(res.headers['cache-control']).toBe('public, max-age=31536000, immutable');
  });

  it('rota de API inexistente continua respondendo JSON 404', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/nao-existe' });
    expect(res.statusCode).toBe(404);
    expect(res.json<ApiErrorBody>().error.code).toBe('NOT_FOUND');
  });

  it('asset inexistente responde 404 em vez do index.html', async () => {
    const res = await app.inject({ method: 'GET', url: '/assets/nao-existe.js' });
    expect(res.statusCode).toBe(404);
  });

  it('POST em rota desconhecida não cai no SPA', async () => {
    const res = await app.inject({ method: 'POST', url: '/qualquer', payload: {} });
    expect(res.statusCode).toBe(404);
    expect(res.json<ApiErrorBody>().error.code).toBe('NOT_FOUND');
  });
});
