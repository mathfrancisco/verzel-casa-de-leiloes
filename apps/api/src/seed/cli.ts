import { createPrivateKey } from 'node:crypto';
import { EnvError, loadEnv } from '../config/env';
import { Ed25519Signer, NodeAuditCrypto } from '../infra/auditCrypto';
import { createDb } from '../infra/db/client';
import { runMigrations } from '../infra/db/migrate';
import { resetDemo, seedCatalog, seedDemo } from './seed';

// `pnpm seed` (idempotente) e `pnpm seed:reset` (apaga e recria). Em produção só o `seed`.

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

const reset = process.argv.includes('--reset');
if (reset && env.NODE_ENV === 'production') {
  console.error('seed:reset apaga o banco e não roda com NODE_ENV=production.');
  process.exit(1);
}

if (reset) await resetDemo(env.DATABASE_URL);
else await runMigrations(env.DATABASE_URL);

const { db, sql } = createDb(env.DATABASE_URL);
try {
  const { created } = await seedDemo({
    db,
    catalog: seedCatalog(),
    signer: new Ed25519Signer(createPrivateKey(env.AUDIT_SIGNING_PRIVATE_KEY)),
    crypto: new NodeAuditCrypto(),
    pseudonymSecret: env.PSEUDONYM_SECRET,
  });
  console.log(created ? 'Seed de demonstração criado.' : 'Seed já presente; nada a fazer.');
} finally {
  await sql.end();
}
