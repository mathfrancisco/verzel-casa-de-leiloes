import Fastify, { type FastifyServerOptions } from 'fastify';
import { healthRoutes } from './http/health';
import { readyRoutes } from './http/ready';
import type { Sql } from './infra/db/client';

export interface AppDeps {
  sql: Sql;
  logger?: FastifyServerOptions['logger'];
}

export function buildApp({ sql, logger = false }: AppDeps) {
  const app = Fastify({ logger });
  healthRoutes(app);
  readyRoutes(app, sql);
  return app;
}
