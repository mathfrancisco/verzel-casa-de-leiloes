import cookie from '@fastify/cookie';
import helmet from '@fastify/helmet';
import jwt from '@fastify/jwt';
import rateLimit from '@fastify/rate-limit';
import Fastify, { type FastifyServerOptions } from 'fastify';
import { DomainError } from './domain/errors';
import type { Db, Sql } from './infra/db/client';
import type { CatalogProvider } from './ports/catalog';
import { authRoutes } from './http/auth.routes';
import { catalogRoutes } from './http/catalog.routes';
import { registerErrorHandling } from './http/error-handler';
import { healthRoutes } from './http/health';
import { lotRoutes } from './http/lots.routes';
import { walletRoutes } from './http/wallet.routes';
import { readyRoutes } from './http/ready';
import { registerSpa } from './http/spa';
import { attachRealtime } from './infra/realtime/socket';
import type { AuditCrypto, Signer } from '@leilao/shared';
import type { BidEvent } from './application/bids';

export interface AppDeps {
  db: Db;
  sql: Sql;
  catalog: CatalogProvider;
  auditSigner: Signer;
  auditCrypto: AuditCrypto;
  /** Coletor pós-commit; o transporte Socket.IO entra no LC-012. */
  bidEventCollector?: (events: BidEvent[]) => void;
  config: {
    jwtSecret: string;
    /** Segredo do HMAC dos pseudônimos (RN-16). */
    pseudonymSecret: string;
    secureCookies: boolean;
    /** Tentativas de login/cadastro por IP por minuto (SP-00). */
    authRateLimitPerMinute?: number;
    /** Pasta do build do web; quando definida, a API também serve o SPA. */
    webDistDir?: string | undefined;
  };
  logger?: FastifyServerOptions['logger'];
}

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export function buildApp({
  db,
  sql,
  catalog,
  auditSigner,
  auditCrypto,
  bidEventCollector,
  config,
  logger = false,
}: AppDeps) {
  const app = Fastify({ logger });

  registerErrorHandling(app, { serveSpa: Boolean(config.webDistDir) });
  app.register(helmet, {
    contentSecurityPolicy: {
      // Miniaturas da busca no catálogo vêm direto do IIIF do Art Institute (painel do leiloeiro).
      directives: { imgSrc: ["'self'", 'data:', 'https://www.artic.edu'] },
    },
  });
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
    catalogRoutes(api, catalog);
    lotRoutes(api, {
      db,
      catalog,
      pseudonymSecret: config.pseudonymSecret,
      signer: auditSigner,
      crypto: auditCrypto,
      collectEvents: bidEventCollector
        ? (events) => {
            try {
              bidEventCollector(events);
            } catch (error) {
              app.log.warn({ err: error }, 'Falha ao entregar eventos de lance pós-commit.');
            }
          }
        : undefined,
    });
    walletRoutes(api, { db });
  });

  return app;
}
