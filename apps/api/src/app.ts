import cookie from '@fastify/cookie';
import helmet from '@fastify/helmet';
import jwt from '@fastify/jwt';
import rateLimit from '@fastify/rate-limit';
import Fastify, { type FastifyServerOptions } from 'fastify';
import { DomainError } from './domain/errors';
import type { Db, Sql } from './infra/db/client';
import { authRoutes } from './http/auth.routes';
import { registerErrorHandling } from './http/error-handler';
import { healthRoutes } from './http/health';
import { readyRoutes } from './http/ready';
import { registerSpa } from './http/spa';
import { attachRealtime } from './infra/realtime/socket';

export interface AppDeps {
  db: Db;
  sql: Sql;
  config: {
    jwtSecret: string;
    secureCookies: boolean;
    /** Tentativas de login/cadastro por IP por minuto (SP-00). */
    authRateLimitPerMinute?: number;
    /** Pasta do build do web; quando definida, a API também serve o SPA. */
    webDistDir?: string | undefined;
  };
  logger?: FastifyServerOptions['logger'];
}

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export function buildApp({ db, sql, config, logger = false }: AppDeps) {
  const app = Fastify({ logger });

  registerErrorHandling(app, { serveSpa: Boolean(config.webDistDir) });
  app.register(helmet);
  app.register(cookie);
  app.register(jwt, {
    secret: config.jwtSecret,
    cookie: { cookieName: 'session', signed: false },
    sign: { expiresIn: '7d' },
  });
  app.register(rateLimit, { max: 300, timeWindow: '1 minute' });

  attachRealtime(app);
  if (config.webDistDir) registerSpa(app, config.webDistDir);

  // Defesa contra CSRF junto com SameSite=Lax: formulários de outros sites não enviam JSON.
  app.addHook('onRequest', async (request) => {
    if (!MUTATING_METHODS.has(request.method)) return;
    if (!request.headers['content-type']?.startsWith('application/json')) {
      throw new DomainError(
        'VALIDATION_ERROR',
        undefined,
        'Content-Type deve ser application/json.',
      );
    }
  });

  // Rotas dentro de um plugin para carregarem depois do rate limit (que lê a config de cada rota).
  app.register(async (api) => {
    healthRoutes(api);
    readyRoutes(api, sql);
    authRoutes(api, {
      db,
      secureCookies: config.secureCookies,
      rateLimitPerMinute: config.authRateLimitPerMinute ?? 10,
    });
  });

  return app;
}
