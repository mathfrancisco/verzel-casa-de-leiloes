import { randomBytes } from 'node:crypto';
import postgres from 'postgres';
import { createDb } from '../../src/infra/db/client';
import { runMigrations } from '../../src/infra/db/migrate';

// Banco usado só para criar/remover os bancos descartáveis de cada arquivo de teste.
export const TEST_ADMIN_URL =
  process.env.DATABASE_URL ?? 'postgres://leilao:leilao@localhost:5432/leilao';

/** Cria um banco vazio e migrado, exclusivo do arquivo de teste que o chama. */
export async function createTestDatabase() {
  const name = `leilao_test_${randomBytes(6).toString('hex')}`;
  const admin = postgres(TEST_ADMIN_URL, { max: 1, onnotice: () => {} });
  await admin.unsafe(`CREATE DATABASE ${name}`);

  const url = new URL(TEST_ADMIN_URL);
  url.pathname = `/${name}`;
  await runMigrations(url.toString());
  const { db, sql } = createDb(url.toString());

  return {
    db,
    sql,
    url: url.toString(),
    async drop() {
      await sql.end();
      await admin.unsafe(`DROP DATABASE IF EXISTS ${name} WITH (FORCE)`);
      await admin.end();
    },
  };
}
