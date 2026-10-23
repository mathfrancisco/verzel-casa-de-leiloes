import type { FastifyInstance } from 'fastify';
import type { Sql } from '../infra/db/client';

export function readyRoutes(app: FastifyInstance, sql: Sql): void {
  app.get('/ready', async (request, reply) => {
    try {
      await sql`SELECT 1`;
      return { status: 'ready' };
    } catch (err) {
      request.log.warn({ err }, 'banco indisponível');
      return reply.code(503).send({ status: 'unavailable' });
    }
  });
}
