import { generateKeyPairSync, randomBytes } from 'node:crypto';
import { buildApp, type AppDeps } from '../../src/app';
import { FakeCatalog } from '../../src/infra/catalog/fake-catalog';
import { Ed25519Signer, NodeAuditCrypto } from '../../src/infra/auditCrypto';
import type { createTestDatabase } from './database';

type TestDb = Awaited<ReturnType<typeof createTestDatabase>>;

// Gerados a cada execução: valores fixos com cara de segredo disparam scanners de segredos.
export const TEST_JWT_SECRET = randomBytes(32).toString('base64url');
export const TEST_PSEUDONYM_SECRET = randomBytes(32).toString('base64url');
const TEST_AUDIT_PAIR = generateKeyPairSync('ed25519');
const TEST_AUDIT_KEY = TEST_AUDIT_PAIR.privateKey;
const testAuditPublicJwk = TEST_AUDIT_PAIR.publicKey.export({ format: 'jwk' });
if (!testAuditPublicJwk.x) throw new Error('Chave pública Ed25519 de teste ausente.');
export const TEST_AUDIT_PUBLIC_KEY = new Uint8Array(Buffer.from(testAuditPublicJwk.x, 'base64url'));

export function buildTestApp(
  testDb: TestDb,
  overrides: Partial<AppDeps['config']> = {},
  deps: Partial<
    Pick<
      AppDeps,
      'db' | 'catalog' | 'bidEventCollector' | 'auditSigner' | 'onRealtimeEventCollectorReady'
    >
  > = {},
) {
  return buildApp({
    db: deps.db ?? testDb.db,
    sql: testDb.sql,
    catalog: deps.catalog ?? new FakeCatalog(),
    auditSigner: deps.auditSigner ?? new Ed25519Signer(TEST_AUDIT_KEY),
    auditCrypto: new NodeAuditCrypto(),
    bidEventCollector: deps.bidEventCollector,
    onRealtimeEventCollectorReady: deps.onRealtimeEventCollectorReady,
    config: {
      jwtSecret: TEST_JWT_SECRET,
      pseudonymSecret: TEST_PSEUDONYM_SECRET,
      secureCookies: false,
      authRateLimitPerMinute: 1000,
      ...overrides,
    },
  });
}

/** Extrai o cookie de sessão de uma resposta para reutilizar em outra requisição. */
export function sessionCookie(res: { cookies: { name: string; value: string }[] }) {
  const cookie = res.cookies.find((c) => c.name === 'session');
  if (!cookie) throw new Error('Resposta sem cookie de sessão');
  return { session: cookie.value };
}
