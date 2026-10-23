import type { HealthResponse } from '@leilao/shared';
import type { FastifyInstance } from 'fastify';

export function healthRoutes(app: FastifyInstance): void {
  const handler = async (): Promise<HealthResponse> => ({
    status: 'ok',
    serverTime: new Date().toISOString(),
  });

  // `/health` para o provedor de deploy; `/api/health` para o SPA (mesmo prefixo do resto da API).
  app.get('/health', handler);
  app.get('/api/health', handler);
}
