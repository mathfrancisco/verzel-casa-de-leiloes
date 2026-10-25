import { utf8Bytes } from '@leilao/shared';
import type { ApiErrorBody, BidResponse, CatalogItem, LotDetail } from '@leilao/shared';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { NodeAuditCrypto } from '../../src/infra/auditCrypto';
import { FakeCatalog } from '../../src/infra/catalog/fake-catalog';
import type { BidEvent } from '../../src/application/bids';
import { buildTestApp, sessionCookie, TEST_AUDIT_PUBLIC_KEY } from '../support/app';
import { createTestDatabase } from '../support/database';

let testDb: Awaited<ReturnType<typeof createTestDatabase>>;
let app: ReturnType<typeof buildTestApp>;
const catalogItems: CatalogItem[] = Array.from({ length: 7 }, (_, index) => ({
  externalId: String(1001 + index),
  title: `Obra ${index + 1}`,
  artist: 'Artista de teste',
  date: '1900',
  medium: 'Óleo sobre tela',
  dimensions: '50 × 60 cm',
  origin: 'França',
  imageUrl: 'https://example.invalid/obra.png',
  sourceUrl: `https://example.invalid/obras/${1001 + index}`,
  suggestedCategory: 'PAINTING',
}));
const catalog = new FakeCatalog(catalogItems);
let sequence = 0;

beforeAll(async () => {
  testDb = await createTestDatabase();
  app = buildTestApp(testDb, {}, { catalog });
});
afterAll(async () => {
  await app.close();
  await testDb.drop();
});

/** I-2, I-3 e I-4 são propriedades do banco, não só da resposta HTTP. */
async function expectInvariants() {
  const negativeAvailable = await testDb.sql<{ user_id: string }[]>`
    SELECT w.user_id
    FROM wallets w
    LEFT JOIN lots l ON l.leader_id = w.user_id AND l.state = 'ACTIVE'
    GROUP BY w.user_id, w.balance_cents
    HAVING w.balance_cents - coalesce(sum(l.current_price_cents), 0) < 0
  `;
  expect(negativeAvailable).toEqual([]);

  const inconsistentLeader = await testDb.sql<{ id: string }[]>`
    SELECT l.id
    FROM lots l
    JOIN LATERAL (
      SELECT bidder_id, amount_cents
      FROM lot_entries
      WHERE lot_id = l.id AND type = 'BID'
      ORDER BY seq DESC
      LIMIT 1
    ) last_bid ON true
    WHERE l.bid_count > 0
      AND (l.leader_id <> last_bid.bidder_id OR l.current_price_cents <> last_bid.amount_cents)
  `;
  expect(inconsistentLeader).toEqual([]);

  const brokenSequence = await testDb.sql<{ id: string }[]>`
    SELECT l.id
    FROM lots l
    LEFT JOIN lot_entries e ON e.lot_id = l.id
    GROUP BY l.id, l.chain_length
    HAVING coalesce(count(e.seq), 0) <> l.chain_length
      OR (l.chain_length > 0 AND (min(e.seq) <> 1 OR max(e.seq) <> l.chain_length))
  `;
  expect(brokenSequence).toEqual([]);
}

afterEach(async () => {
  await expectInvariants();
});

async function register(role: 'BIDDER' | 'AUCTIONEER' = 'BIDDER') {
  const res = await app.inject({
    method: 'POST',
    url: '/api/auth/register',
    payload: {
      name: `${role} ${++sequence}`,
      email: `bid-${sequence}@demo.com`,
      password: 'senha-forte',
      role,
    },
  });
  return { cookie: sessionCookie(res), user: res.json<{ user: { id: string } }>().user };
}

async function deposit(cookie: Record<string, string>, key: string, amountCents = 10_000) {
  return app.inject({
    method: 'POST',
    url: '/api/wallet/deposits',
    cookies: cookie,
    headers: { 'idempotency-key': key },
    payload: { amountCents },
  });
}

async function createLiveLot(cookie: Record<string, string>, externalId = '1001', endsAt?: Date) {
  const res = await app.inject({
    method: 'POST',
    url: '/api/lots',
    cookies: cookie,
    payload: {
      externalId,
      title: `Lote ${externalId}`,
      description: 'Lote de teste de lances.',
      category: 'PAINTING',
      startingPriceCents: 1_000,
      minIncrementCents: 100,
      startsAt: new Date(Date.now() - 15_000).toISOString(),
      endsAt: (endsAt ?? new Date(Date.now() + 3_600_000)).toISOString(),
    },
  });
  expect(res.statusCode).toBe(201);
  return res.json<LotDetail>();
}

function bid(cookie: Record<string, string>, lotId: string, key: string, amountCents: number) {
  return app.inject({
    method: 'POST',
    url: `/api/lots/${lotId}/bids`,
    cookies: cookie,
    headers: { 'idempotency-key': key },
    payload: { amountCents },
  });
}

describe('POST /api/lots/:id/bids (SP-05)', () => {
  it('aceita, encadeia, assina e retorna o detalhe do lote (CT-05-01,08; I3/I4)', async () => {
    const seller = await register('AUCTIONEER');
    const bidder = await register();
    await deposit(bidder.cookie, 'fundos-a');
    const lot = await createLiveLot(seller.cookie);

    const res = await bid(bidder.cookie, lot.id, 'lance-a', 1_000);
    expect(res.statusCode).toBe(201);
    const body = res.json<BidResponse>();
    expect(body).toMatchObject({
      bid: { seq: 1, amountCents: 1_000 },
      lot: { bidCount: 1, currentPriceCents: 1_000 },
    });
    expect(body.lot.me).toMatchObject({ isLeader: true, position: 1, myBestBidCents: 1_000 });

    const [entry] = await testDb.sql<
      {
        seq: number;
        prev_hash: string;
        hash: string;
        signature: string;
        bidder_pseudonym: string;
        created_at: Date;
      }[]
    >`SELECT * FROM lot_entries WHERE lot_id = ${lot.id}`;
    const [storedLot] = await testDb.sql<
      { genesis_hash: string; head_hash: string; chain_length: number; bid_count: number }[]
    >`SELECT * FROM lots WHERE id = ${lot.id}`;
    expect(entry!.prev_hash).toBe(storedLot!.genesis_hash);
    expect(entry!.hash).toBe(storedLot!.head_hash);
    expect(storedLot).toMatchObject({ chain_length: 1, bid_count: 1 });
    const crypto = new NodeAuditCrypto();
    expect(
      await crypto.verify(
        TEST_AUDIT_PUBLIC_KEY,
        Buffer.from(entry!.signature, 'base64url'),
        utf8Bytes(entry!.hash),
      ),
    ).toBe(true);
  });

  it('preserva a primeira resposta e não cria novo elo para repetição idempotente (CT-05-14)', async () => {
    const seller = await register('AUCTIONEER');
    const bidder = await register();
    await deposit(bidder.cookie, 'fundos-idem');
    const lot = await createLiveLot(seller.cookie);
    const first = await bid(bidder.cookie, lot.id, 'repetido', 1_000);
    const second = await bid(bidder.cookie, lot.id, 'repetido', 1_000);
    expect(second.statusCode).toBe(201);
    expect(second.json()).toEqual(first.json());
    const [count] = await testDb.sql<
      { count: number }[]
    >`SELECT count(*)::int AS count FROM lot_entries WHERE lot_id = ${lot.id}`;
    expect(count!.count).toBe(1);
  });

  it('aplica a ordem de erros e não permite leiloeiro (CT-05-03..05,07,09,10)', async () => {
    const seller = await register('AUCTIONEER');
    const bidder = await register();
    await deposit(bidder.cookie, 'fundos-erros', 1_000);
    const live = await createLiveLot(seller.cookie, '1002');

    const noAuth = await app.inject({
      method: 'POST',
      url: `/api/lots/${live.id}/bids`,
      headers: { 'idempotency-key': 'x' },
      payload: { amountCents: 1_000 },
    });
    const sellerBid = await bid(seller.cookie, live.id, 'seller', 1_000);
    const tooLow = await bid(bidder.cookie, live.id, 'baixo', 999);
    const tooHigh = await bid(bidder.cookie, live.id, 'alto', 1_001);
    expect(
      [noAuth, sellerBid, tooLow, tooHigh].map((res) => res.json<ApiErrorBody>().error.code),
    ).toEqual(['UNAUTHENTICATED', 'SELLER_CANNOT_BID', 'BELOW_MINIMUM', 'INSUFFICIENT_FUNDS']);
  });

  it('recusa id de lote malformado sem expor erro do PostgreSQL', async () => {
    const bidder = await register();
    const response = await bid(bidder.cookie, 'id-invalido', 'lote-invalido', 1_000);
    expect(response.statusCode).toBe(404);
    expect(response.json<ApiErrorBody>().error.code).toBe('LOT_NOT_FOUND');

    const seller = await register('AUCTIONEER');
    const sellerResponse = await bid(seller.cookie, 'id-invalido', 'lote-invalido-vendedor', 1_000);
    expect(sellerResponse.statusCode).toBe(403);
    expect(sellerResponse.json<ApiErrorBody>().error.code).toBe('SELLER_CANNOT_BID');
  });

  it('recusa lote cancelado sem coletar evento (CT-05-10,13)', async () => {
    const events: BidEvent[] = [];
    await app.close();
    app = buildTestApp(
      testDb,
      {},
      { catalog, bidEventCollector: (collected) => events.push(...collected) },
    );
    const seller = await register('AUCTIONEER');
    const bidder = await register();
    await deposit(bidder.cookie, 'fundos-cancelado');
    const lot = await createLiveLot(seller.cookie, '1007');
    await testDb.sql`UPDATE lots SET state = 'CANCELLED', cancelled_at = now() WHERE id = ${lot.id}`;

    events.length = 0;
    const response = await bid(bidder.cookie, lot.id, 'lance-cancelado', 1_000);
    expect(response.statusCode).toBe(409);
    expect(response.json<ApiErrorBody>().error.code).toBe('LOT_CANCELLED');
    expect(events).toEqual([]);
  });

  it('mantém o 201 quando a entrega pós-commit de eventos falha', async () => {
    await app.close();
    app = buildTestApp(
      testDb,
      {},
      {
        catalog,
        bidEventCollector: () => {
          throw new Error('transport indisponível');
        },
      },
    );
    const seller = await register('AUCTIONEER');
    const bidder = await register();
    await deposit(bidder.cookie, 'fundos-coletor');
    const lot = await createLiveLot(seller.cookie, '1007');

    const response = await bid(bidder.cookie, lot.id, 'coletor-falha', 1_000);
    expect(response.statusCode).toBe(201);
    expect((await bid(bidder.cookie, lot.id, 'coletor-falha', 1_000)).statusCode).toBe(201);
  });

  it('estende no limite anti-sniping e coleta eventos somente após commit sem PII (CT-05-06,13,15,16)', async () => {
    const events: BidEvent[] = [];
    const committedEntries: Promise<{ count: number }[]>[] = [];
    await app.close();
    app = buildTestApp(
      testDb,
      {},
      {
        catalog,
        bidEventCollector: (collected) => {
          events.push(...collected);
          committedEntries.push(
            testDb.sql<{ count: number }[]>`SELECT count(*)::int AS count FROM lot_entries`,
          );
        },
      },
    );
    const seller = await register('AUCTIONEER');
    const first = await register();
    const second = await register();
    await Promise.all([
      deposit(first.cookie, 'fundos-primeiro'),
      deposit(second.cookie, 'fundos-segundo'),
    ]);
    const lot = await createLiveLot(seller.cookie, '1003');
    await testDb.sql`
      UPDATE lots
      SET original_ends_at = now() + interval '90 seconds', ends_at = now() + interval '90 seconds'
      WHERE id = ${lot.id}
    `;
    expect((await bid(first.cookie, lot.id, 'primeiro', 1_000)).statusCode).toBe(201);
    expect((await bid(second.cookie, lot.id, 'segundo', 1_100)).statusCode).toBe(201);
    const publicEventText = JSON.stringify(events.map(({ userId: _userId, ...event }) => event));
    expect(events.map((event) => event.type)).toContain('lot.extended');
    expect(events.map((event) => event.type)).toContain('bid.outbid');
    expect(
      events.some((event) => event.type === 'bid.outbid' && event.userId === first.user.id),
    ).toBe(true);
    expect(
      events
        .filter((event) => event.type === 'wallet.changed' && event.userId === first.user.id)
        .at(-1)?.payload,
    ).toMatchObject({
      availableCents: 10_000,
      committedCents: 0,
    });
    expect(publicEventText).not.toContain(first.user.id);
    expect(publicEventText).not.toContain('@demo.com');
    expect(publicEventText).toContain('availableCents');
    expect(
      JSON.stringify((await bid(second.cookie, lot.id, 'segundo-repetido', 1_100)).json()),
    ).not.toContain(first.user.id);
    expect((await Promise.all(committedEntries)).flat().every((row) => row.count > 0)).toBe(true);
  });

  it('serializa 20 lances concorrentes no mesmo lote sem quebrar I3/I4 (CT-05-11)', async () => {
    const seller = await register('AUCTIONEER');
    const lot = await createLiveLot(seller.cookie, '1004');
    const bidders = await Promise.all(Array.from({ length: 20 }, () => register()));
    await Promise.all(bidders.map((member, index) => deposit(member.cookie, `fundos-${index}`)));
    const responses = await Promise.all(
      bidders.map((member, index) => bid(member.cookie, lot.id, `conc-${index}`, 1_000)),
    );
    expect(responses.filter((res) => res.statusCode === 201)).toHaveLength(1);
    expect(responses.filter((res) => res.statusCode === 422)).toHaveLength(19);
    expect(
      responses
        .filter((res) => res.statusCode === 422)
        .map((res) => res.json<ApiErrorBody>().error.code),
    ).toEqual(Array.from({ length: 19 }, () => 'BELOW_MINIMUM'));
    const [stored] = await testDb.sql<
      {
        bid_count: number;
        chain_length: number;
        genesis_hash: string;
        head_hash: string;
        prev_hash: string;
        hash: string;
      }[]
    >`
      SELECT l.bid_count, l.chain_length, l.genesis_hash, l.head_hash, e.prev_hash, e.hash
      FROM lots l
      JOIN lot_entries e ON e.lot_id = l.id AND e.seq = 1
      WHERE l.id = ${lot.id}
    `;
    expect(stored).toMatchObject({ bid_count: 1, chain_length: 1 });
    expect(stored).toMatchObject({ prev_hash: stored!.genesis_hash, hash: stored!.head_hash });
  });

  it('serializa o saldo de um licitante em dois lotes (CT-05-12; I-2)', async () => {
    const seller = await register('AUCTIONEER');
    const bidder = await register();
    await deposit(bidder.cookie, 'fundos-dois-lotes', 1_000);
    const [firstLot, secondLot] = await Promise.all([
      createLiveLot(seller.cookie, '1005'),
      createLiveLot(seller.cookie, '1006'),
    ]);

    const responses = await Promise.all([
      bid(bidder.cookie, firstLot.id, 'dois-lotes-a', 1_000),
      bid(bidder.cookie, secondLot.id, 'dois-lotes-b', 1_000),
    ]);
    expect(responses.filter((res) => res.statusCode === 201)).toHaveLength(1);
    const [rejected] = responses.filter((res) => res.statusCode === 422);
    expect(rejected!.json<ApiErrorBody>().error).toMatchObject({
      code: 'INSUFFICIENT_FUNDS',
      details: { availableCents: 0 },
    });
  });
});
