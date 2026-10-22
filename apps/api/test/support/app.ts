import { randomBytes } from 'node:crypto';
import { buildApp, type AppDeps } from '../../src/app';
import { FakeCatalog } from '../../src/infra/catalog/fake-catalog';
import type { createTestDatabase } from './database';

type TestDb = Awaited<ReturnType<typeof createTestDatabase>>;

// Gerado a cada execução: valores fixos com cara de segredo disparam scanners de segredos.
export const TEST_JWT_SECRET = randomBytes(32).toString('base64url');

export function buildTestApp(
  testDb: TestDb,
  overrides: Partial<AppDeps['config']> = {},
  deps: Partial<Pick<AppDeps, 'catalog'>> = {},
) {
  return buildApp({
    db: testDb.db,
    sql: testDb.sql,
    catalog: deps.catalog ?? new FakeCatalog(),
    config: {
      jwtSecret: TEST_JWT_SECRET,
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
