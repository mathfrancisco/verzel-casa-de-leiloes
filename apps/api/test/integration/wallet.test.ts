import type { ApiErrorBody, LotDetail, Wallet } from '@leilao/shared';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { FakeCatalog } from '../../src/infra/catalog/fake-catalog';
import { buildTestApp, sessionCookie } from '../support/app';
import { createTestDatabase } from '../support/database';

let testDb: Awaited<ReturnType<typeof createTestDatabase>>;
let app: ReturnType<typeof buildTestApp>;
let sequence = 0;
const catalog = new FakeCatalog();

beforeAll(async () => {
  testDb = await createTestDatabase();
  app = buildTestApp(testDb, {}, { catalog });
});

afterAll(async () => {
  if (app) await app.close();
  if (testDb) await testDb.drop();
});

async function register(role: 'BIDDER' | 'AUCTIONEER' = 'BIDDER') {
  const response = await app.inject({
    method: 'POST',
    url: '/api/auth/register',
    payload: {
      name: 'Ana Souza',
      email: `wallet-${++sequence}@demo.com`,
      password: 'senha-forte',
      role,
    },
  });
  return { cookie: sessionCookie(response), user: response.json<{ user: { id: string } }>().user };
}

function lotPayload(externalId: string, endsAt: Date) {
  return {
    externalId,
    title: `Lote ${externalId}`,
    description: 'Lote para calcular saldo comprometido.',
    category: 'PAINTING',
    startingPriceCents: 500,
    minIncrementCents: 100,
    startsAt: new Date(Date.now() - 10_000).toISOString(),
    endsAt: endsAt.toISOString(),
  };
}

function deposit(cookie: Record<string, string>, amountCents: unknown, key?: string) {
  return app.inject({
    method: 'POST',
    url: '/api/wallet/deposits',
    cookies: cookie,
    headers: { 'idempotency-key': key ?? '', 'content-type': 'application/json' },
    payload: { amountCents },
  });
}

describe('carteira (SP-04)', () => {
  it('deposita R$ 100 e registra entrada DEPOSIT (CT-04-01)', async () => {
    const { cookie } = await register();
    const response = await deposit(cookie, 10_000, 'deposito-100');

    expect(response.statusCode).toBe(201);
    const wallet = response.json<Wallet>();
    expect(typeof wallet.totalCents).toBe('number');
    expect(wallet).toMatchObject({
      totalCents: 10_000,
      committedCents: 0,
      availableCents: 10_000,
      entries: [expect.objectContaining({ type: 'DEPOSIT', amountCents: 10_000, lotId: null })],
    });
  });

  it('repete a mesma resposta sem duplicar o depósito (CT-04-02)', async () => {
    const { cookie } = await register();
    const first = await deposit(cookie, 10_000, 'mesma-chave');
    const second = await deposit(cookie, 10_000, 'mesma-chave');

    expect(second.statusCode).toBe(201);
    expect(second.json<Wallet>()).toEqual(first.json<Wallet>());
    expect(
      (await app.inject({ method: 'GET', url: '/api/wallet', cookies: cookie })).json<Wallet>(),
    ).toMatchObject({ totalCents: 10_000, entries: [expect.any(Object)] });
  });

  it('exige Idempotency-Key (CT-04-03)', async () => {
    const { cookie } = await register();
    const response = await deposit(cookie, 10_000);

    expect(response.statusCode).toBe(400);
    expect(response.json<ApiErrorBody>().error.code).toBe('IDEMPOTENCY_KEY_REQUIRED');
  });

  it.each([0, -1, 100.5, 100_000_001])(
    'recusa valor de depósito inválido %s (CT-04-04)',
    async (amountCents) => {
      const { cookie } = await register();
      const response = await deposit(cookie, amountCents, `invalido-${amountCents}`);

      expect(response.statusCode).toBe(400);
      expect(response.json<ApiErrorBody>().error.code).toBe('VALIDATION_ERROR');
    },
  );

  it('leiloeiro consulta carteira mas não deposita (CT-04-05)', async () => {
    const { cookie } = await register('AUCTIONEER');
    const read = await app.inject({ method: 'GET', url: '/api/wallet', cookies: cookie });
    const write = await deposit(cookie, 10_000, 'leiloeiro');

    expect(read.statusCode).toBe(200);
    expect(read.json<Wallet>().totalCents).toBe(0);
    expect(write.statusCode).toBe(403);
    expect(write.json<ApiErrorBody>().error.code).toBe('FORBIDDEN');
  });

  it('deriva compromissos de dois lotes ativos liderados pelo licitante (CT-04-06)', async () => {
    const bidder = await register();
    const auctioneer = await register('AUCTIONEER');
    await deposit(bidder.cookie, 10_000, 'saldo-para-compromissos');

    const first = await app.inject({
      method: 'POST',
      url: '/api/lots',
      cookies: auctioneer.cookie,
      payload: lotPayload('1001', new Date(Date.now() + 3_600_000)),
    });
    const second = await app.inject({
      method: 'POST',
      url: '/api/lots',
      cookies: auctioneer.cookie,
      payload: lotPayload('1002', new Date(Date.now() + 7_200_000)),
    });
    expect(first.statusCode).toBe(201);
    expect(second.statusCode).toBe(201);

    const firstLot = first.json<LotDetail>();
    const secondLot = second.json<LotDetail>();
    await testDb.sql`
      UPDATE lots SET leader_id = ${bidder.user.id}, current_price_cents = 1_000, bid_count = 1, chain_length = 1
      WHERE id = ${firstLot.id}`;
    await testDb.sql`
      UPDATE lots SET leader_id = ${bidder.user.id}, current_price_cents = 2_500, bid_count = 1, chain_length = 1
      WHERE id = ${secondLot.id}`;

    const response = await app.inject({
      method: 'GET',
      url: '/api/wallet',
      cookies: bidder.cookie,
    });
    expect(response.statusCode).toBe(200);
    expect(response.json<Wallet>()).toMatchObject({
      totalCents: 10_000,
      committedCents: 3_500,
      availableCents: 6_500,
      commitments: [
        { lotId: firstLot.id, title: 'Lote 1001', amountCents: 1_000 },
        { lotId: secondLot.id, title: 'Lote 1002', amountCents: 2_500 },
      ],
    });
  });

  it('serializa dez depósitos concorrentes sem perder saldo (CT-04-07)', async () => {
    const { cookie } = await register();
    const responses = await Promise.all(
      Array.from({ length: 10 }, (_, index) => deposit(cookie, 100, `concorrente-${index}`)),
    );

    expect(responses.map((response) => response.statusCode)).toEqual(Array(10).fill(201));
    const wallet = (
      await app.inject({ method: 'GET', url: '/api/wallet', cookies: cookie })
    ).json<Wallet>();
    expect(wallet.totalCents).toBe(1_000);
    expect(wallet.entries).toHaveLength(10);
  });
});
