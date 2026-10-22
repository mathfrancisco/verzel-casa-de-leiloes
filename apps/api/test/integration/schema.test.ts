import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestDatabase } from '../support/database';

let testDb: Awaited<ReturnType<typeof createTestDatabase>>;
beforeAll(async () => {
  testDb = await createTestDatabase();
});
afterAll(() => testDb.drop());

async function insertUser(email = `${randomUUID()}@demo.com`) {
  const id = randomUUID();
  await testDb.sql`
    INSERT INTO users (id, name, email, password_hash, role)
    VALUES (${id}, 'Ana', ${email}, 'hash', 'BIDDER')`;
  await testDb.sql`INSERT INTO wallets (user_id) VALUES (${id})`;
  return id;
}

describe('schema inicial (migrations)', () => {
  it('cria as tabelas de usuários, carteira, livro-razão e idempotência', async () => {
    const rows = await testDb.sql<{ table_name: string }[]>`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' ORDER BY table_name`;
    expect(rows.map((r) => r.table_name)).toEqual(
      expect.arrayContaining(['idempotency_keys', 'users', 'wallet_entries', 'wallets']),
    );
  });

  it('carteira nova começa com saldo 0', async () => {
    const id = await insertUser();
    const [wallet] = await testDb.sql`SELECT balance_cents FROM wallets WHERE user_id = ${id}`;
    expect(Number(wallet!.balance_cents)).toBe(0);
  });

  it('rejeita saldo negativo (CHECK balance_cents >= 0)', async () => {
    const id = await insertUser();
    await expect(
      testDb.sql`UPDATE wallets SET balance_cents = -1 WHERE user_id = ${id}`,
    ).rejects.toThrow(/wallets_balance_non_negative/);
  });

  it('rejeita lançamento de valor zero (CHECK amount_cents <> 0)', async () => {
    const id = await insertUser();
    await expect(
      testDb.sql`INSERT INTO wallet_entries (user_id, type, amount_cents) VALUES (${id}, 'DEPOSIT', 0)`,
    ).rejects.toThrow(/wallet_entries_amount_non_zero/);
  });

  it('exige lote em lançamentos de liquidação e estorno', async () => {
    const id = await insertUser();
    await expect(
      testDb.sql`INSERT INTO wallet_entries (user_id, type, amount_cents) VALUES (${id}, 'SETTLEMENT_DEBIT', -100)`,
    ).rejects.toThrow(/wallet_entries_lot_required/);
  });

  it('impede liquidar o mesmo lote duas vezes', async () => {
    const id = await insertUser();
    const lotId = randomUUID();
    await testDb.sql`INSERT INTO wallet_entries (user_id, type, amount_cents, lot_id) VALUES (${id}, 'SETTLEMENT_CREDIT', 100, ${lotId})`;
    await expect(
      testDb.sql`INSERT INTO wallet_entries (user_id, type, amount_cents, lot_id) VALUES (${id}, 'SETTLEMENT_CREDIT', 100, ${lotId})`,
    ).rejects.toThrow(/wallet_entries_lot_type_unique/);
  });

  it('permite vários depósitos sem lote', async () => {
    const id = await insertUser();
    await testDb.sql`INSERT INTO wallet_entries (user_id, type, amount_cents) VALUES (${id}, 'DEPOSIT', 100)`;
    await testDb.sql`INSERT INTO wallet_entries (user_id, type, amount_cents) VALUES (${id}, 'DEPOSIT', 100)`;
    const [row] = await testDb.sql<{ count: number }[]>`
      SELECT count(*)::int AS count FROM wallet_entries WHERE user_id = ${id}`;
    expect(row?.count).toBe(2);
  });

  it('e-mail é único sem diferenciar maiúsculas (citext)', async () => {
    await insertUser('Bruno@Demo.com');
    await expect(insertUser('bruno@demo.com')).rejects.toThrow(/users_email_unique/);
  });

  it('chave de idempotência é única por usuário', async () => {
    const id = await insertUser();
    const insert = () =>
      testDb.sql`INSERT INTO idempotency_keys (user_id, key, route, response) VALUES (${id}, 'k1', 'POST /x', '{}')`;
    await insert();
    await expect(insert()).rejects.toThrow(/idempotency_keys_pkey/);
  });
});
