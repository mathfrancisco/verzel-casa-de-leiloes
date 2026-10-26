import { idemKey } from '../support/idempotency';
import { generateKeyPairSync } from 'node:crypto';
import {
  base64urlToBytes,
  receiptSignatureBytes,
  utf8Bytes,
  type ApiErrorBody,
  type CatalogItem,
  type LotDetail,
  type Signer,
} from '@leilao/shared';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { settleDueLots, type SettlementDeps } from '../../src/application/settlement';
import type { RealtimeEvent } from '../../src/application/bids';
import { Ed25519Signer, NodeAuditCrypto } from '../../src/infra/auditCrypto';
import { FakeCatalog } from '../../src/infra/catalog/fake-catalog';
import { buildTestApp, sessionCookie } from '../support/app';
import { createTestDatabase } from '../support/database';

let testDb: Awaited<ReturnType<typeof createTestDatabase>>;
let app: ReturnType<typeof buildTestApp>;
let signer: Ed25519Signer;
let auditPublicKey: Uint8Array;
let sequence = 0;
const catalog = new FakeCatalog(
  Array.from(
    { length: 9 },
    (_, index): CatalogItem => ({
      externalId: String(1001 + index),
      title: `Obra ${index + 1}`,
      artist: 'Artista de teste',
      date: '1900',
      medium: 'Óleo sobre tela',
      dimensions: '50 × 60 cm',
      origin: 'França',
      imageUrl: 'https://example.invalid/obra.png',
      sourceUrl: `https://example.invalid/obra-${index + 1}`,
      suggestedCategory: 'PAINTING',
    }),
  ),
);

beforeAll(async () => {
  testDb = await createTestDatabase();
  const auditKeys = generateKeyPairSync('ed25519');
  signer = new Ed25519Signer(auditKeys.privateKey);
  const publicJwk = auditKeys.publicKey.export({ format: 'jwk' });
  auditPublicKey = new Uint8Array(Buffer.from(publicJwk.x!, 'base64url'));
  app = buildTestApp(testDb, {}, { catalog, auditSigner: signer });
});

afterAll(async () => {
  await app.close();
  await testDb.drop();
});

async function register(role: 'BIDDER' | 'AUCTIONEER') {
  const response = await app.inject({
    method: 'POST',
    url: '/api/auth/register',
    payload: {
      name: `${role} ${++sequence}`,
      email: `settle-${sequence}@demo.com`,
      password: 'senha-forte',
      role,
    },
  });
  return { cookie: sessionCookie(response), user: response.json<{ user: { id: string } }>().user };
}

async function deposit(cookie: Record<string, string>, key: string, amountCents = 10_000) {
  const response = await app.inject({
    method: 'POST',
    url: '/api/wallet/deposits',
    cookies: cookie,
    headers: { 'idempotency-key': idemKey(key) },
    payload: { amountCents },
  });
  expect(response.statusCode).toBe(201);
}

async function createLot(cookie: Record<string, string>, externalId = '1001') {
  const response = await app.inject({
    method: 'POST',
    url: '/api/lots',
    cookies: cookie,
    payload: {
      externalId,
      title: `Lote liquidável ${externalId}`,
      description: 'Teste de liquidação.',
      category: 'PAINTING',
      startingPriceCents: 1_000,
      minIncrementCents: 100,
      startsAt: new Date(Date.now() - 30_000).toISOString(),
      endsAt: new Date(Date.now() + 3_600_000).toISOString(),
    },
  });
  expect(response.statusCode).toBe(201);
  return response.json<LotDetail>();
}

async function bid(
  cookie: Record<string, string>,
  lotId: string,
  key: string,
  amountCents = 1_000,
) {
  const response = await app.inject({
    method: 'POST',
    url: `/api/lots/${lotId}/bids`,
    cookies: cookie,
    headers: { 'idempotency-key': idemKey(key) },
    payload: { amountCents },
  });
  expect(response.statusCode).toBe(201);
}

async function makeDue(lotId: string) {
  await testDb.sql`UPDATE lots SET original_ends_at = now() - interval '1 second', ends_at = now() - interval '1 second' WHERE id = ${lotId}`;
}

function deps(events: RealtimeEvent[] = []): SettlementDeps {
  return {
    db: testDb.db,
    signer,
    crypto: new NodeAuditCrypto(),
    collectEvents: (value) => events.push(...value),
  };
}

async function expectSettlementInvariants() {
  const mismatch = await testDb.sql<{ user_id: string }[]>`
    SELECT w.user_id FROM wallets w LEFT JOIN wallet_entries e ON e.user_id = w.user_id
    GROUP BY w.user_id, w.balance_cents HAVING w.balance_cents <> coalesce(sum(e.amount_cents), 0)`;
  const unbalanced = await testDb.sql<{ amount: number }[]>`
    SELECT coalesce(sum(amount_cents), 0)::int AS amount FROM wallet_entries WHERE type <> 'DEPOSIT'`;
  expect(mismatch).toEqual([]);
  expect(unbalanced[0]!.amount).toBe(0);
}

describe('liquidação (SP-07)', () => {
  it('liquida lance, cria recibo e publica somente após commit (CT-07-01)', async () => {
    const seller = await register('AUCTIONEER');
    const winner = await register('BIDDER');
    await deposit(winner.cookie, 'fundos-vencedor');
    const lot = await createLot(seller.cookie);
    await bid(winner.cookie, lot.id, 'lance-vencedor', 1_200);
    await makeDue(lot.id);
    const events: RealtimeEvent[] = [];
    const committedObservations: Promise<{ state: string; entries: number }[]>[] = [];

    expect(
      await settleDueLots(
        {
          ...deps(events),
          collectEvents: (value) => {
            events.push(...value);
            committedObservations.push(testDb.sql<{ state: string; entries: number }[]>`
          SELECT l.state, count(e.id)::int AS entries FROM lots l
          LEFT JOIN lot_entries e ON e.lot_id = l.id WHERE l.id = ${lot.id} GROUP BY l.state`);
          },
        },
        { limit: 20 },
      ),
    ).toMatchObject({ settled: 1, failures: [] });
    const [settled] = await testDb.sql<
      { state: string; chain_length: number }[]
    >`SELECT state, chain_length FROM lots WHERE id = ${lot.id}`;
    const entries = await testDb.sql<
      { type: string; amount_cents: number }[]
    >`SELECT type, amount_cents::int AS amount_cents FROM wallet_entries WHERE lot_id = ${lot.id} ORDER BY amount_cents`;
    const [receipt] = await testDb.sql<
      {
        public_code: string;
        final_hash: string;
        signature: string;
        winner_pseudonym: string;
        amount_cents: number;
        issued_at: string;
      }[]
    >`SELECT public_code, final_hash, signature, winner_pseudonym, amount_cents::int AS amount_cents, issued_at FROM receipts WHERE lot_id = ${lot.id}`;
    const [closed] = await testDb.sql<
      { hash: string; signature: string }[]
    >`SELECT hash, signature FROM lot_entries WHERE lot_id = ${lot.id} AND type = 'CLOSED'`;
    expect(settled).toMatchObject({ state: 'SETTLED', chain_length: 2 });
    expect(entries).toEqual([
      { type: 'SETTLEMENT_DEBIT', amount_cents: -1_200 },
      { type: 'SETTLEMENT_CREDIT', amount_cents: 1_200 },
    ]);
    expect(receipt!.public_code).toMatch(/^[A-Za-z0-9_-]{22}$/);
    expect(events.map((event) => event.type)).toEqual([
      'lot.closed',
      'lot.won',
      'wallet.changed',
      'wallet.changed',
    ]);
    expect(await Promise.all(committedObservations)).toEqual([[{ state: 'SETTLED', entries: 2 }]]);
    const crypto = new NodeAuditCrypto();
    expect(
      await crypto.verify(
        auditPublicKey,
        base64urlToBytes(closed!.signature),
        utf8Bytes(closed!.hash),
      ),
    ).toBe(true);
    expect(
      await crypto.verify(
        auditPublicKey,
        base64urlToBytes(receipt!.signature),
        receiptSignatureBytes({
          lotId: lot.id,
          finalHash: receipt!.final_hash,
          amountCents: receipt!.amount_cents,
          winnerPseudonym: receipt!.winner_pseudonym,
          issuedAt: new Date(receipt!.issued_at).toISOString(),
        }),
      ),
    ).toBe(true);
    await expectSettlementInvariants();
  });

  it('fecha lote sem lances sem movimentação (CT-07-02)', async () => {
    const seller = await register('AUCTIONEER');
    const lot = await createLot(seller.cookie, '1002');
    await makeDue(lot.id);
    await settleDueLots(deps(), { limit: 20 });
    const [closed] = await testDb.sql<
      { state: string; bid_count: number }[]
    >`SELECT state, bid_count FROM lots WHERE id = ${lot.id}`;
    const financial = await testDb.sql<
      { count: number }[]
    >`SELECT count(*)::int AS count FROM wallet_entries WHERE lot_id = ${lot.id}`;
    expect(closed).toEqual({ state: 'CLOSED_NO_WINNER', bid_count: 0 });
    expect(financial[0]!.count).toBe(0);
  });

  it('não duplica quando dois workers concorrem (CT-07-03)', async () => {
    const seller = await register('AUCTIONEER');
    const winner = await register('BIDDER');
    await deposit(winner.cookie, 'fundos-concorrentes');
    const lot = await createLot(seller.cookie, '1003');
    await bid(winner.cookie, lot.id, 'lance-concorrente');
    await makeDue(lot.id);
    await Promise.all([settleDueLots(deps(), { limit: 20 }), settleDueLots(deps(), { limit: 20 })]);
    const rows = await testDb.sql<
      { count: number }[]
    >`SELECT count(*)::int AS count FROM wallet_entries WHERE lot_id = ${lot.id}`;
    const receipts = await testDb.sql<
      { count: number }[]
    >`SELECT count(*)::int AS count FROM receipts WHERE lot_id = ${lot.id}`;
    expect(rows[0]!.count).toBe(2);
    expect(receipts[0]!.count).toBe(1);
  });

  it('não liquida antes do fim prorrogado (CT-07-04)', async () => {
    const seller = await register('AUCTIONEER');
    const winner = await register('BIDDER');
    await deposit(winner.cookie, 'fundos-prorrogado');
    const lot = await createLot(seller.cookie, '1004');
    await testDb.sql`UPDATE lots SET original_ends_at = now() + interval '90 seconds', ends_at = now() + interval '90 seconds' WHERE id = ${lot.id}`;
    await bid(winner.cookie, lot.id, 'lance-prorrogado');
    await testDb.sql`UPDATE lots SET original_ends_at = now() - interval '1 second' WHERE id = ${lot.id}`;
    const [timing] = await testDb.sql<
      { originalEndsAt: string; endsAt: string }[]
    >`SELECT original_ends_at AS "originalEndsAt", ends_at AS "endsAt" FROM lots WHERE id = ${lot.id}`;
    expect(new Date(timing!.originalEndsAt).getTime()).toBeLessThan(Date.now());
    expect(new Date(timing!.endsAt).getTime()).toBeGreaterThan(Date.now());
    expect(await settleDueLots(deps(), { limit: 20 })).toMatchObject({ settled: 0 });
    const [active] = await testDb.sql<
      { state: string }[]
    >`SELECT state FROM lots WHERE id = ${lot.id}`;
    expect(active!.state).toBe('ACTIVE');
  });

  it('recusa lance após o fim antes do worker (CT-07-05)', async () => {
    const seller = await register('AUCTIONEER');
    const bidder = await register('BIDDER');
    await deposit(bidder.cookie, 'fundos-atrasado');
    const lot = await createLot(seller.cookie, '1005');
    await makeDue(lot.id);
    const response = await app.inject({
      method: 'POST',
      url: `/api/lots/${lot.id}/bids`,
      cookies: bidder.cookie,
      headers: { 'idempotency-key': idemKey('lance-atrasado') },
      payload: { amountCents: 1_000 },
    });
    expect(response.statusCode).toBe(409);
    expect(response.json<ApiErrorBody>().error.code).toBe('LOT_CLOSED');
    await testDb.sql`UPDATE lots SET state = 'CANCELLED', cancelled_at = now() WHERE id = ${lot.id}`;
  });

  it('gera código de recibo base64url de 128 bits (CT-07-08)', async () => {
    const { generateReceiptCode } = await import('../../src/application/settlement');
    expect(generateReceiptCode()).toMatch(/^[A-Za-z0-9_-]{22}$/);
  });

  it('desfaz lote com assinatura falha e continua o próximo lote devido', async () => {
    const seller = await register('AUCTIONEER');
    const firstWinner = await register('BIDDER');
    const secondWinner = await register('BIDDER');
    await Promise.all([
      deposit(firstWinner.cookie, 'fundos-falha-1'),
      deposit(secondWinner.cookie, 'fundos-falha-2'),
    ]);
    const failedLot = await createLot(seller.cookie, '1006');
    const settledLot = await createLot(seller.cookie, '1007');
    await bid(firstWinner.cookie, failedLot.id, 'lance-falha-1');
    await bid(secondWinner.cookie, settledLot.id, 'lance-falha-2');
    await testDb.sql`UPDATE lots SET original_ends_at = now() - interval '5 seconds', ends_at = now() - interval '5 seconds' WHERE id = ${failedLot.id}`;
    await testDb.sql`UPDATE lots SET original_ends_at = now() - interval '2 seconds', ends_at = now() - interval '2 seconds' WHERE id = ${settledLot.id}`;
    let failOnce = true;
    const failingSigner: Signer = {
      sign: async (message) => {
        if (failOnce) {
          failOnce = false;
          throw new Error('assinatura indisponível');
        }
        return signer.sign(message);
      },
    };

    const result = await settleDueLots({ ...deps(), signer: failingSigner }, { limit: 20 });
    expect(result).toMatchObject({ settled: 1, failures: [expect.any(Error)] });
    const [failed] = await testDb.sql<
      { state: string }[]
    >`SELECT state FROM lots WHERE id = ${failedLot.id}`;
    const [completed] = await testDb.sql<
      { state: string }[]
    >`SELECT state FROM lots WHERE id = ${settledLot.id}`;
    const failedFinancial = await testDb.sql<
      { count: number }[]
    >`SELECT count(*)::int AS count FROM wallet_entries WHERE lot_id = ${failedLot.id}`;
    const failedReceipts = await testDb.sql<
      { count: number }[]
    >`SELECT count(*)::int AS count FROM receipts WHERE lot_id = ${failedLot.id}`;
    expect(failed!.state).toBe('ACTIVE');
    expect(completed!.state).toBe('SETTLED');
    expect(failedFinancial[0]!.count).toBe(0);
    expect(failedReceipts[0]!.count).toBe(0);
    await testDb.sql`UPDATE lots SET state = 'CANCELLED', cancelled_at = now() WHERE id = ${failedLot.id}`;
  });

  it('mantém liquidações confirmadas quando a publicação pós-commit falha', async () => {
    const seller = await register('AUCTIONEER');
    const firstWinner = await register('BIDDER');
    const secondWinner = await register('BIDDER');
    await Promise.all([
      deposit(firstWinner.cookie, 'fundos-publicador-1'),
      deposit(secondWinner.cookie, 'fundos-publicador-2'),
    ]);
    const firstLot = await createLot(seller.cookie, '1008');
    const secondLot = await createLot(seller.cookie, '1009');
    await bid(firstWinner.cookie, firstLot.id, 'lance-publicador-1');
    await bid(secondWinner.cookie, secondLot.id, 'lance-publicador-2');
    await Promise.all([makeDue(firstLot.id), makeDue(secondLot.id)]);
    let publishAttempts = 0;
    const result = await settleDueLots(
      {
        ...deps(),
        collectEvents: () => {
          publishAttempts += 1;
          if (publishAttempts === 1) throw new Error('socket indisponível');
        },
      },
      { limit: 20 },
    );
    expect(result).toMatchObject({ settled: 2, failures: [expect.any(Error)] });
    const states = await testDb.sql<
      { state: string }[]
    >`SELECT state FROM lots WHERE id IN (${firstLot.id}, ${secondLot.id}) ORDER BY state`;
    expect(states).toEqual([{ state: 'SETTLED' }, { state: 'SETTLED' }]);
  });
});
