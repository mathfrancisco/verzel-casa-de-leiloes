import { randomBytes } from 'node:crypto';
import postgres from 'postgres';
import { afterAll, describe, expect, it } from 'vitest';
import { runMigrations } from '../../src/infra/db/migrate';
import { TEST_ADMIN_URL } from '../support/database';

const name = `leilao_test_${randomBytes(6).toString('hex')}`;
const admin = postgres(TEST_ADMIN_URL, { max: 1, onnotice: () => {} });
afterAll(async () => {
  await admin.unsafe(`DROP DATABASE IF EXISTS ${name} WITH (FORCE)`);
  await admin.end();
});

describe('runMigrations', () => {
  it('encontra a pasta de migrations sozinho e é idempotente', async () => {
    await admin.unsafe(`CREATE DATABASE ${name}`);
    const url = new URL(TEST_ADMIN_URL);
    url.pathname = `/${name}`;

    await runMigrations(url.toString());
    await runMigrations(url.toString());

    const db = postgres(url.toString(), { max: 1 });
    const [row] = await db<
      { count: number }[]
    >`SELECT count(*)::int AS count FROM drizzle.__drizzle_migrations`;
    await db.end();
    expect(row?.count).toBeGreaterThanOrEqual(2);
  });
});
