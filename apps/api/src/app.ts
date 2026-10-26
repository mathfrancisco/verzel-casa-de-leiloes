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
import { receiptRoutes } from './http/receipts.routes';
import { walletRoutes } from './http/wallet.routes';
import { readyRoutes } from './http/ready';
import { registerSpa } from './http/spa';
import { attachRealtime } from './infra/realtime/socket';
import { bytesToBase64url, type AuditCrypto, type Signer } from '@leilao/shared';
import type { RealtimeEvent } from './application/bids';

export interface AppDeps {
  db: Db;
  sql: Sql;
  catalog: CatalogProvider;
  auditSigner: Signer;
  /** Chave Ed25519 pública bruta, derivada da mesma privada usada para assinar a cadeia. */
  auditPublicKey: Uint8Array;
  auditCrypto: AuditCrypto;
  /** Coletor pós-commit; o transporte Socket.IO entra no LC-012. */
  bidEventCollector?: (events: RealtimeEvent[]) => void;
  /** Expõe o mesmo coletor pós-commit ao worker iniciado pelo entrypoint. */
  onRealtimeEventCollectorReady?: (collectEvents: (events: RealtimeEvent[]) => void) => void;
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

/**
 * Limites do servidor HTTP. Os corpos JSON da API são pequenos (maior: criação de lote); o resto
 * protege contra clientes lentos. `keepAliveTimeout` fica acima dos 60 s típicos de balanceadores
 * (Render, nginx) para evitar 502 em conexão reaproveitada na hora em que o servidor a fecha.
 */
export const SERVER_LIMITS = {
  bodyLimit: 100 * 1024,
  /** Tempo máximo para receber a requisição inteira (cabeçalhos + corpo). */
  requestTimeout: 30_000,
  /** Inatividade máxima de um socket; o upgrade do WebSocket zera esse timer no Node. */
  connectionTimeout: 120_000,
  keepAliveTimeout: 65_000,
  /** Deve ser maior que `keepAliveTimeout`, senão o Node fecha a conexão ociosa antes. */
  headersTimeout: 66_000,
} as const;

export function buildApp({
  db,
  sql,
  catalog,
  auditSigner,
  auditPublicKey,
  auditCrypto,
  bidEventCollector,
  onRealtimeEventCollectorReady,
  config,
  logger = false,
}: AppDeps) {
  const { headersTimeout, ...fastifyLimits } = SERVER_LIMITS;
  const app = Fastify({ logger, ...fastifyLimits });
  app.server.headersTimeout = headersTimeout;

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

  const realtime = attachRealtime(app, db);
  const collectEvents = (events: RealtimeEvent[]) => {
    try {
      realtime.publish(events);
      bidEventCollector?.(events);
    } catch (error) {
      app.log.warn({ err: error }, 'Falha ao entregar eventos pós-commit.');
    }
  };
  onRealtimeEventCollectorReady?.(collectEvents);
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
      publicKey: auditPublicKey,
      publicKeyBase64url: bytesToBase64url(auditPublicKey),
      crypto: auditCrypto,
      collectEvents,
    });
    receiptRoutes(api, { db, publicKeyBase64url: bytesToBase64url(auditPublicKey) });
    walletRoutes(api, { db, collectEvents });
  });

  return app;
}
