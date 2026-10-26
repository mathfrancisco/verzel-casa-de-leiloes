import { idemKey } from '../support/idempotency';
import { type CatalogItem, type LotDetail } from '@leilao/shared';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { settleDueLots } from '../../src/application/settlement';
import { NodeAuditCrypto } from '../../src/infra/auditCrypto';
import { FakeCatalog } from '../../src/infra/catalog/fake-catalog';
import { buildTestApp, sessionCookie, TEST_AUDIT_SIGNER } from '../support/app';
import { createTestDatabase } from '../support/database';

let testDb: Awaited<ReturnType<typeof createTestDatabase>>;
let app: ReturnType<typeof buildTestApp>;
let sequence = 0;
const catalog = new FakeCatalog(
  Array.from(
    { length: 8 },
    (_, index): CatalogItem => ({
      externalId: String(8001 + index),
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
  app = buildTestApp(testDb, {}, { catalog });
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
      email: `receipt-${sequence}@demo.com`,
      password: 'senha-forte',
      role,
    },
  });
  expect(response.statusCode).toBe(201);
  return { cookie: sessionCookie(response), user: response.json<{ user: { id: string } }>().user };
}

async function deposit(cookie: Record<string, string>, key: string) {
  const response = await app.inject({
    method: 'POST',
    url: '/api/wallet/deposits',
    cookies: cookie,
    headers: { 'idempotency-key': idemKey(key) },
    payload: { amountCents: 10_000 },
  });
  expect(response.statusCode).toBe(201);
}

async function createLot(cookie: Record<string, string>, externalId: string): Promise<LotDetail> {
  const response = await app.inject({
    method: 'POST',
    url: '/api/lots',
    cookies: cookie,
    payload: {
      externalId,
      title: `Lote ${externalId}`,
      description: 'Teste de comprovante.',
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
  amountCents: number,
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

async function settle(lotId: string) {
  await testDb.sql`UPDATE lots SET original_ends_at = now() - interval '1 second', ends_at = now() - interval '1 second' WHERE id = ${lotId}`;
  const outcome = await settleDueLots(
    {
      db: testDb.db,
      signer: TEST_AUDIT_SIGNER,
      crypto: new NodeAuditCrypto(),
      collectEvents: () => {},
    },
    { limit: 20 },
  );
  expect(outcome).toMatchObject({ settled: 1, failures: [] });
}

describe('comprovantes e participações (SP-07)', () => {
  it('expõe comprovante público assinado sem PII e trata código ausente como 404 (CT-07-06)', async () => {
    const seller = await register('AUCTIONEER');
    const winner = await register('BIDDER');
    const loser = await register('BIDDER');
    await Promise.all([
      deposit(winner.cookie, 'winner-funds'),
      deposit(loser.cookie, 'loser-funds'),
    ]);
    const lot = await createLot(seller.cookie, '8001');
    await bid(loser.cookie, lot.id, 'loser-bid', 1_000);
    await bid(winner.cookie, lot.id, 'winner-bid', 1_100);
    await settle(lot.id);

    const [stored] = await testDb.sql<
      { public_code: string }[]
    >`SELECT public_code FROM receipts WHERE lot_id = ${lot.id}`;
    const response = await app.inject({
      method: 'GET',
      url: `/api/receipts/${stored!.public_code}`,
    });
    expect(response.statusCode).toBe(200);
    const receipt = response.json<{
      lot: { id: string; imageUrl: string; item: { title: string } };
      amountCents: number;
      publicKey: string;
    }>();
    expect(receipt).toMatchObject({
      lot: {
        id: lot.id,
        imageUrl: expect.stringMatching(/^\/api\/images\//),
        item: { title: 'Obra 1' },
      },
      amountCents: 1_100,
      publicKey: expect.any(String),
    });
    const body = response.body;
    expect(body).not.toContain('receipt-');
    expect(body).not.toContain(winner.user.id);
    expect(body).not.toContain(loser.user.id);
    expect(body).not.toMatch(/"(?:name|email|userId|bidderId|winnerId|sellerId)"/);
    expect(
      (await app.inject({ method: 'GET', url: `/api/receipts/${'a'.repeat(22)}` })).statusCode,
    ).toBe(404);
    expect((await app.inject({ method: 'GET', url: '/api/receipts/invalido' })).statusCode).toBe(
      404,
    );
  });

  it('isola participações do licitante e informa ganhando, superado, venceu e perdeu (CT-07-07)', async () => {
    const seller = await register('AUCTIONEER');
    const bidder = await register('BIDDER');
    const rival = await register('BIDDER');
    await Promise.all([
      deposit(bidder.cookie, 'bidder-funds'),
      deposit(rival.cookie, 'rival-funds'),
    ]);
    const winning = await createLot(seller.cookie, '8002');
    await bid(bidder.cookie, winning.id, 'winning', 1_000);
    const outbid = await createLot(seller.cookie, '8003');
    await bid(bidder.cookie, outbid.id, 'outbid-first', 1_000);
    await bid(rival.cookie, outbid.id, 'outbid-rival', 1_100);
    const won = await createLot(seller.cookie, '8004');
    await bid(bidder.cookie, won.id, 'won', 1_000);
    await settle(won.id);
    const lost = await createLot(seller.cookie, '8005');
    await bid(bidder.cookie, lost.id, 'lost-first', 1_000);
    await bid(rival.cookie, lost.id, 'lost-rival', 1_100);
    await settle(lost.id);

    expect((await app.inject({ method: 'GET', url: '/api/me/participations' })).statusCode).toBe(
      401,
    );
    expect(
      (await app.inject({ method: 'GET', url: '/api/me/participations', cookies: seller.cookie }))
        .statusCode,
    ).toBe(403);
    const response = await app.inject({
      method: 'GET',
      url: '/api/me/participations',
      cookies: bidder.cookie,
    });
    expect(response.statusCode).toBe(200);
    const items = response.json<{
      items: { lotId: string; status: string; receiptCode: string | null }[];
    }>().items;
    expect(
      Object.fromEntries(
        items.map((item) => [item.lotId, { status: item.status, receiptCode: item.receiptCode }]),
      ),
    ).toMatchObject({
      [winning.id]: { status: 'WINNING', receiptCode: null },
      [outbid.id]: { status: 'OUTBID', receiptCode: null },
      [won.id]: { status: 'WON', receiptCode: expect.stringMatching(/^[A-Za-z0-9_-]{22}$/) },
      [lost.id]: { status: 'LOST', receiptCode: null },
    });
  });
});
