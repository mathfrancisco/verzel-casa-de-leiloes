import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { buildApp } from './app';
import { EnvError, loadEnv } from './config/env';
import { ArticCatalog } from './infra/catalog/artic-catalog';
import { FakeCatalog } from './infra/catalog/fake-catalog';
import { createDb } from './infra/db/client';
import { runMigrations } from './infra/db/migrate';

let env;
try {
  env = loadEnv();
} catch (err) {
  if (err instanceof EnvError) {
    console.error(err.message);
    process.exit(1);
  }
  throw err;
}

await runMigrations(env.DATABASE_URL);

// Na imagem Docker o build do web fica em `public/`, ao lado de `dist/`. Em dev ele não existe e o
// Vite serve o front.
const webDistDir = fileURLToPath(new URL('../public', import.meta.url));

const { db, sql } = createDb(env.DATABASE_URL);
const app = buildApp({
  db,
  sql,
  catalog: env.CATALOG_PROVIDER === 'fake' ? new FakeCatalog() : new ArticCatalog(),
  config: {
    jwtSecret: env.JWT_SECRET,
    pseudonymSecret: env.PSEUDONYM_SECRET,
    secureCookies: env.NODE_ENV === 'production',
    webDistDir: existsSync(webDistDir) ? webDistDir : undefined,
  },
  logger: true,
});

try {
  await app.listen({ port: env.PORT, host: '0.0.0.0' });
} catch (err) {
  app.log.error(err);
  process.exit(1);
}

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    void app
      .close()
      .then(() => sql.end())
      .then(() => process.exit(0));
  });
}
