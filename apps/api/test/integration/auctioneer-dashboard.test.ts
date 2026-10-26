import type { ApiErrorBody, AuctioneerLotsResponse, CatalogItem, LotDetail } from '@leilao/shared';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { settleDueLots, type SettlementDeps } from '../../src/application/settlement';
import { NodeAuditCrypto } from '../../src/infra/auditCrypto';
import { FakeCatalog } from '../../src/infra/catalog/fake-catalog';
import { buildTestApp, sessionCookie, TEST_AUDIT_SIGNER } from '../support/app';
import { createTestDatabase } from '../support/database';

let testDb: Awaited<ReturnType<typeof createTestDatabase>>;
let app: ReturnType<typeof buildTestApp>;
let sequence = 0;
const catalog = new FakeCatalog(
  Array.from(
    { length: 9 },
    (_, index): CatalogItem => ({
      externalId: String(1701 + index),
      title: `Obra do painel ${index + 1}`,
      artist: 'Artista de teste',
      date: null,
      medium: null,
      dimensions: null,
      origin: null,
      imageUrl: 'https://example.invalid/obra.png',
      sourceUrl: 'https://example.invalid/obra',
      suggestedCategory: 'PAINTING',
    }),
  ),
);

beforeAll(async () => {
  testDb = await createTestDatabase();
  app = buildTestApp(testDb, {}, { catalog });
});

afterAll(async () => {
  await app.close();
  await testDb.drop();
});

async function register(role: 'AUCTIONEER' | 'BIDDER') {
  const response = await app.inject({
    method: 'POST',
    url: '/api/auth/register',
    payload: {
      name: `${role} painel ${++sequence}`,
      email: `painel-${sequence}@demo.com`,
      password: 'senha-forte',
      role,
    },
  });
  return { cookie: sessionCookie(response), user: response.json<{ user: { id: string } }>().user };
}

async function createLot(cookie: Record<string, string>, externalId: string) {
  const response = await app.inject({
    method: 'POST',
    url: '/api/lots',
    cookies: cookie,
    payload: {
      externalId,
      title: `Lote painel ${externalId}`,
      description: '',
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

async function deposit(cookie: Record<string, string>, key: string) {
  const response = await app.inject({
    method: 'POST',
    url: '/api/wallet/deposits',
    cookies: cookie,
    headers: { 'idempotency-key': key },
    payload: { amountCents: 10_000 },
  });
  expect(response.statusCode).toBe(201);
}

async function bid(
  cookie: Record<string, string>,
  lotId: string,
  key: string,
  amountCents: number,
) {
  const response = await app.inject({
    method: 'POST',
    url: `/api/lots/${lotId}/bids`,
    cookies: cookie,
    headers: { 'idempotency-key': key },
    payload: { amountCents },
  });
  expect(response.statusCode).toBe(201);
}

async function settle(lotId: string, expectedState: 'SETTLED' | 'CLOSED_NO_WINNER' = 'SETTLED') {
  await testDb.sql`UPDATE lots SET original_ends_at = now() - interval '1 second', ends_at = now() - interval '1 second' WHERE id = ${lotId}`;
  const deps: SettlementDeps = {
    db: testDb.db,
    signer: TEST_AUDIT_SIGNER,
    crypto: new NodeAuditCrypto(),
  };
  const result = await settleDueLots(deps, { limit: 20 });
  expect(result.failures).toEqual([]);
  const [lot] = await testDb.sql<{ state: string }[]>`SELECT state FROM lots WHERE id = ${lotId}`;
  expect(lot!.state).toBe(expectedState);
}

describe('painel do leiloeiro (CT-03-13)', () => {
  it('mostra só os próprios resultados e deriva o total do razão após duas liquidações', async () => {
    const seller = await register('AUCTIONEER');
    const otherSeller = await register('AUCTIONEER');
    const winner = await register('BIDDER');
    await deposit(winner.cookie, 'painel-fundos');
    const first = await createLot(seller.cookie, '1701');
    const second = await createLot(seller.cookie, '1702');
    const pending = await createLot(seller.cookie, '1703');
    const other = await createLot(otherSeller.cookie, '1704');
    const scheduled = await createLot(seller.cookie, '1705');
    const closing = await createLot(seller.cookie, '1706');
    await testDb.sql`UPDATE lots SET starts_at = now() + interval '1 hour', ends_at = now() + interval '2 hours', original_ends_at = now() + interval '2 hours' WHERE id = ${scheduled.id}`;
    await bid(winner.cookie, first.id, 'painel-lance-1', 1_200);
    await bid(winner.cookie, second.id, 'painel-lance-2', 1_600);
    await bid(winner.cookie, other.id, 'painel-lance-outro', 2_000);
    await settle(first.id);
    await settle(second.id);
    await settle(other.id);
    await testDb.sql`UPDATE lots SET ends_at = now() - interval '1 second', original_ends_at = now() - interval '1 second' WHERE id = ${closing.id}`;
    // Um depósito do leiloeiro é um lançamento de carteira, mas não é receita de leilão.
    await testDb.sql`INSERT INTO wallet_entries (user_id, type, amount_cents) VALUES (${seller.user.id}, 'DEPOSIT', 5000)`;
    await testDb.sql`UPDATE wallets SET balance_cents = balance_cents + 5000 WHERE user_id = ${seller.user.id}`;

    // Fixture de razão: o total já desconta REFUND_DEBIT (sinal negativo); o fluxo de estorno é do LC-018.
    await testDb.sql`INSERT INTO wallet_entries (user_id, type, amount_cents, lot_id) VALUES (${seller.user.id}, 'REFUND_DEBIT', -300, ${first.id})`;
    await testDb.sql`UPDATE wallets SET balance_cents = balance_cents - 300 WHERE user_id = ${seller.user.id}`;

    const response = await app.inject({
      method: 'GET',
      url: '/api/auctioneer/lots',
      cookies: seller.cookie,
    });
    expect(response.statusCode).toBe(200);
    const body = response.json<AuctioneerLotsResponse>();
    expect(body.totalReceivedCents).toBe(2_500);
    expect(body.items.map((item) => item.id)).toEqual(
      expect.arrayContaining([first.id, second.id, pending.id, scheduled.id, closing.id]),
    );
    expect(body.items.map((item) => item.id)).not.toContain(other.id);
    expect(body.items.find((item) => item.id === first.id)).toMatchObject({
      result: 'SOLD',
      finalPriceCents: 1_200,
      cancellable: true,
    });
    expect(body.items.find((item) => item.id === pending.id)).toMatchObject({
      result: 'PENDING',
      finalPriceCents: null,
      settledAt: null,
      cancellable: true,
    });
    expect(body.items.find((item) => item.id === scheduled.id)).toMatchObject({
      phase: 'SCHEDULED',
      result: 'PENDING',
      currentPriceCents: null,
      cancellable: true,
    });
    expect(body.items.find((item) => item.id === closing.id)).toMatchObject({
      phase: 'CLOSING',
      result: 'PENDING',
      finalPriceCents: null,
      cancellable: false,
    });
    const [ledger] = await testDb.sql<{ total: number }[]>`
      SELECT coalesce(sum(amount_cents) FILTER (WHERE type IN ('SETTLEMENT_CREDIT', 'REFUND_DEBIT')), 0)::int AS total
      FROM wallet_entries WHERE user_id = ${seller.user.id}`;
    expect(body.totalReceivedCents).toBe(ledger!.total);
    expect(JSON.stringify(body)).not.toContain(seller.user.id);
    expect(JSON.stringify(body)).not.toContain('painel-1@demo.com');
    // Três cadastros e três liquidações reais; sob a suíte paralela completa passa de 10 s.
  }, 30_000);

  it('mantém preço final nulo para sem vencedor e cancelado', async () => {
    const seller = await register('AUCTIONEER');
    const unsold = await createLot(seller.cookie, '1707');
    const cancelled = await createLot(seller.cookie, '1708');
    await settle(unsold.id, 'CLOSED_NO_WINNER');
    // Fixture de projeção: não testa nem implementa o cancelamento do LC-018.
    await testDb.sql`UPDATE lots SET state = 'CANCELLED', cancelled_at = now() WHERE id = ${cancelled.id}`;

    const response = await app.inject({
      method: 'GET',
      url: '/api/auctioneer/lots',
      cookies: seller.cookie,
    });
    const body = response.json<AuctioneerLotsResponse>();
    expect(body.items.find((item) => item.id === unsold.id)).toMatchObject({
      result: 'UNSOLD',
      finalPriceCents: null,
      cancellable: false,
    });
    expect(body.items.find((item) => item.id === cancelled.id)).toMatchObject({
      result: 'CANCELLED',
      finalPriceCents: null,
      settledAt: null,
      cancellable: false,
    });
  });

  it('exige sessão de leiloeiro', async () => {
    expect((await app.inject({ method: 'GET', url: '/api/auctioneer/lots' })).statusCode).toBe(401);
    const bidder = await register('BIDDER');
    const response = await app.inject({
      method: 'GET',
      url: '/api/auctioneer/lots',
      cookies: bidder.cookie,
    });
    expect(response.statusCode).toBe(403);
    expect(response.json<ApiErrorBody>().error.code).toBe('FORBIDDEN');
  });
});
