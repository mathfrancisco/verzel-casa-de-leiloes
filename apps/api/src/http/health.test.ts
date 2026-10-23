import type { HealthResponse } from '@leilao/shared';
import { afterAll, describe, expect, it } from 'vitest';
import { buildApp } from '../app';

const app = buildApp({ logger: false });
afterAll(() => app.close());

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
