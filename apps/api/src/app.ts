import Fastify, { type FastifyServerOptions } from 'fastify';
import { healthRoutes } from './http/health';

export function buildApp(options: FastifyServerOptions = {}) {
  const app = Fastify(options);
  healthRoutes(app);
  return app;
}
