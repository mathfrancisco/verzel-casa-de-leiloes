import { randomUUID } from 'node:crypto';
import {
  createAuditEntry,
  type ApiErrorBody,
  type AuditReportResponse,
  type CatalogItem,
  type LotDetail,
} from '@leilao/shared';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { genesisHash, sha256Hex } from '../../src/domain/auditChain';
import { pseudonym } from '../../src/domain/pseudonym';
import type { RealtimeEvent } from '../../src/application/bids';
import { settleDueLots } from '../../src/application/settlement';
import { NodeAuditCrypto } from '../../src/infra/auditCrypto';
import { FakeCatalog } from '../../src/infra/catalog/fake-catalog';
import {
  buildTestApp,
  sessionCookie,
  TEST_AUDIT_SIGNER,
  TEST_PSEUDONYM_SECRET,
} from '../support/app';
import { createTestDatabase } from '../support/database';

let testDb: Awaited<ReturnType<typeof createTestDatabase>>;
let app: ReturnType<typeof buildTestApp>;
let sequence = 0;
let published: RealtimeEvent[] = [];
const catalog = new FakeCatalog(
  Array.from(
    { length: 12 },
    (_, index): CatalogItem => ({
      externalId: String(2001 + index),
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
type Cookie = Record<string, string>;

beforeAll(async () => {
  testDb = await createTestDatabase();
  app = buildTestApp(
    testDb,
    {},
    { catalog, bidEventCollector: (events) => published.push(...events) },
  );
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
      email: `cancel-${sequence}@demo.com`,
      password: 'senha-forte',
      role,
    },
  });
  return { cookie: sessionCookie(response), id: response.json<{ user: { id: string } }>().user.id };
}

async function deposit(cookie: Cookie, amountCents = 10_000) {
  const response = await app.inject({
    method: 'POST',
    url: '/api/wallet/deposits',
    cookies: cookie,
    headers: { 'idempotency-key': `dep-${++sequence}` },
    payload: { amountCents },
  });
  expect(response.statusCode).toBe(201);
}

async function createLot(cookie: Cookie, externalId: string, startsInMs = -30_000) {
  const response = await app.inject({
    method: 'POST',
    url: '/api/lots',
    cookies: cookie,
    payload: {
      externalId,
      title: `Lote ${externalId}`,
      description: 'Teste de cancelamento.',
      category: 'PAINTING',
      startingPriceCents: 1_000,
      minIncrementCents: 100,
      startsAt: new Date(Date.now() + startsInMs).toISOString(),
      endsAt: new Date(Date.now() + startsInMs + 3_600_000).toISOString(),
    },
  });
  expect(response.statusCode).toBe(201);
  return response.json<LotDetail>();
}

async function bid(cookie: Cookie, lotId: string, amountCents: number) {
  const response = await app.inject({
    method: 'POST',
    url: `/api/lots/${lotId}/bids`,
    cookies: cookie,
    headers: { 'idempotency-key': `bid-${++sequence}` },
    payload: { amountCents },
  });
  expect(response.statusCode).toBe(201);
}

function cancel(cookie: Cookie | undefined, lotId: string, payload: unknown = {}) {
  return app.inject({
    method: 'POST',
    url: `/api/lots/${lotId}/cancel`,
    ...(cookie ? { cookies: cookie } : {}),
    payload: payload as object,
  });
}

async function settle(lotId: string) {
  await testDb.sql`UPDATE lots SET original_ends_at = now() - interval '1 second', ends_at = now() - interval '1 second' WHERE id = ${lotId}`;
  const result = await settleDueLots(
    { db: testDb.db, signer: TEST_AUDIT_SIGNER, crypto: new NodeAuditCrypto() },
    { limit: 20 },
  );
  expect(result.failures).toEqual([]);
}

/**
 * Insere um lote cuja janela (início há 10 min, fim há 5 min) e cuja cadeia (gênese + 1 lance)
 * são coerentes e assinadas, pronto para o worker liquidar. O lote criado pela API dura no
 * mínimo 5 min, então não dá para obter isso sem mexer no relógio e quebrar a gênese.
 */
async function seedEndedLot(
  sellerId: string,
  bidderId: string,
  externalId: string,
  bidCents: number,
) {
  const lotId = randomUUID();
  const imageId = randomUUID();
  const item = await catalog.getItem(externalId);
  const imageSha256 = sha256Hex('imagem');
  const startsAt = new Date(Date.now() - 600_000);
  const endsAt = new Date(Date.now() - 300_000);
  const sellerPseudonym = pseudonym(TEST_PSEUDONYM_SECRET, 'AUCTIONEER', sellerId, lotId);
  const genesis = genesisHash({
    lotId,
    externalId: item.externalId,
    imageSha256,
    title: 'Lote encerrado',
    description: '',
    category: 'PAINTING',
    itemSnapshot: item,
    sellerPseudonym,
    startingPriceCents: 1_000,
    minIncrementCents: 100,
    startsAt: startsAt.toISOString(),
    originalEndsAt: endsAt.toISOString(),
  });
  const bidderPseudonym = pseudonym(TEST_PSEUDONYM_SECRET, 'BIDDER', bidderId, lotId);
  const bidAt = new Date(startsAt.getTime() + 60_000);
  const entry = await createAuditEntry(
    {
      lotId,
      seq: 1,
      type: 'BID',
      bidderPseudonym,
      amountCents: bidCents,
      createdAt: bidAt.toISOString(),
      payload: {},
      prevHash: genesis,
    },
    TEST_AUDIT_SIGNER,
    new NodeAuditCrypto(),
  );
  await testDb.sql`INSERT INTO images (id, content_type, bytes, sha256) VALUES (${imageId}, 'image/png', ${Buffer.from('imagem')}, ${imageSha256})`;
  await testDb.sql`
    INSERT INTO lots (id, seller_id, image_id, item_source, item_external_id, item_snapshot, title,
      description, category, starting_price_cents, min_increment_cents, starts_at, ends_at,
      original_ends_at, state, current_price_cents, leader_id, bid_count, chain_length,
      genesis_hash, head_hash, seller_pseudonym)
    VALUES (${lotId}, ${sellerId}, ${imageId}, 'artic', ${item.externalId}, ${JSON.stringify(item)}::jsonb,
      'Lote encerrado', '', 'PAINTING', 1000, 100, ${startsAt.toISOString()}, ${endsAt.toISOString()}, ${endsAt.toISOString()}, 'ACTIVE',
      ${bidCents}, ${bidderId}, 1, 1, ${genesis}, ${entry.hash}, ${sellerPseudonym})`;
  await testDb.sql`
    INSERT INTO lot_entries (lot_id, seq, type, bidder_id, bidder_pseudonym, amount_cents, payload,
      created_at, prev_hash, hash, signature)
    VALUES (${lotId}, 1, 'BID', ${bidderId}, ${bidderPseudonym}, ${bidCents}, '{}', ${bidAt.toISOString()},
      ${genesis}, ${entry.hash}, ${entry.signature})`;
  return lotId;
}

async function audit(lotId: string) {
  const response = await app.inject({ method: 'GET', url: `/api/lots/${lotId}/audit` });
  return response.json<AuditReportResponse>();
}

async function expectLedgerInvariants() {
  const mismatch = await testDb.sql<{ user_id: string }[]>`
    SELECT w.user_id FROM wallets w LEFT JOIN wallet_entries e ON e.user_id = w.user_id
    GROUP BY w.user_id, w.balance_cents HAVING w.balance_cents <> coalesce(sum(e.amount_cents), 0)`;
  const [sum] = await testDb.sql<{ amount: number }[]>`
    SELECT coalesce(sum(amount_cents), 0)::int AS amount FROM wallet_entries WHERE type <> 'DEPOSIT'`;
  expect(mismatch).toEqual([]);
  expect(sum!.amount).toBe(0);
}

async function total(userId: string) {
  const [row] = await testDb.sql<
    { total: number }[]
  >`SELECT coalesce(sum(amount_cents), 0)::int AS total FROM wallet_entries WHERE user_id = ${userId}`;
  return row!.total;
}

describe('cancelamento de lote (SP-03, RN-12, RN-13)', () => {
  it('cancela lote sem lances, some da vitrine e fica auditável (CT-03-08)', async () => {
    const seller = await register('AUCTIONEER');
    const lot = await createLot(seller.cookie, '2001');
    published = [];

    const response = await cancel(seller.cookie, lot.id, { reason: '  Erro de cadastro  ' });
    expect(response.statusCode).toBe(200);
    expect(response.json<LotDetail>()).toMatchObject({ id: lot.id, phase: 'CANCELLED' });

    const showcase = await app.inject({ method: 'GET', url: '/api/lots?phase=live&limit=24' });
    expect(showcase.json<{ items: { id: string }[] }>().items.map((i) => i.id)).not.toContain(
      lot.id,
    );
    const report = await audit(lot.id);
    expect(report.verdict.status).toBe('INTACT');
    expect(report.lot.state).toBe('CANCELLED');
    expect(report.entries.map((e) => [e.type, e.payload])).toEqual([
      ['CANCELLED', { reason: 'Erro de cadastro' }],
    ]);
    const cancelledEvents = published.filter((e) => e.type === 'lot.cancelled');
    expect(cancelledEvents).toHaveLength(1);
    expect(cancelledEvents[0]!.payload).toMatchObject({
      lotId: lot.id,
      reason: 'Erro de cadastro',
    });
    const [row] = await testDb.sql<
      { cancelled_at: Date | null }[]
    >`SELECT cancelled_at FROM lots WHERE id = ${lot.id}`;
    expect(row!.cancelled_at).not.toBeNull();
  });

  it('cancela lote agendado sem lances', async () => {
    const seller = await register('AUCTIONEER');
    const lot = await createLot(seller.cookie, '2002', 3_600_000);
    expect((await cancel(seller.cookie, lot.id)).statusCode).toBe(200);
    expect((await audit(lot.id)).verdict.status).toBe('INTACT');
  });

  it('recusa quem não é o dono, licitante, visitante, lote inexistente e motivo longo (CT-03-09)', async () => {
    const seller = await register('AUCTIONEER');
    const other = await register('AUCTIONEER');
    const bidder = await register('BIDDER');
    const lot = await createLot(seller.cookie, '2003');
    const forbiddenOther = await cancel(other.cookie, lot.id);
    expect(forbiddenOther.statusCode).toBe(403);
    expect(forbiddenOther.json<ApiErrorBody>().error.code).toBe('FORBIDDEN');
    expect((await cancel(bidder.cookie, lot.id)).statusCode).toBe(403);
    expect((await cancel(undefined, lot.id)).statusCode).toBe(401);
    expect((await cancel(seller.cookie, '00000000-0000-4000-8000-000000000000')).statusCode).toBe(
      404,
    );
    expect((await cancel(seller.cookie, 'nao-e-uuid')).statusCode).toBe(404);
    expect((await cancel(seller.cookie, lot.id, { reason: 'x'.repeat(201) })).statusCode).toBe(400);
    const [row] = await testDb.sql<
      { state: string }[]
    >`SELECT state FROM lots WHERE id = ${lot.id}`;
    expect(row!.state).toBe('ACTIVE');
  });

  it('libera o comprometido do líder antes da liquidação e notifica (CT-03-10)', async () => {
    const seller = await register('AUCTIONEER');
    const ana = await register('BIDDER');
    const bruno = await register('BIDDER');
    await deposit(ana.cookie);
    await deposit(bruno.cookie);
    const lot = await createLot(seller.cookie, '2004');
    await bid(ana.cookie, lot.id, 1_000);
    await bid(bruno.cookie, lot.id, 1_500);
    const wallet = async (cookie: Cookie) =>
      (await app.inject({ method: 'GET', url: '/api/wallet', cookies: cookie })).json<{
        committedCents: number;
        availableCents: number;
      }>();
    expect((await wallet(bruno.cookie)).committedCents).toBe(1_500);
    published = [];

    const response = await cancel(seller.cookie, lot.id, {});
    expect(response.statusCode).toBe(200);
    expect(await wallet(bruno.cookie)).toMatchObject({
      committedCents: 0,
      availableCents: 10_000,
    });
    const wallets = published.filter((e) => e.type === 'wallet.changed');
    expect(wallets.map((e) => e.userId)).toEqual([bruno.id]);
    expect(wallets[0]!.payload).toMatchObject({ committedCents: 0, availableCents: 10_000 });
    const notified = published
      .filter((e) => e.type === 'lot.cancelled')
      .map((e) => e.userId ?? 'room')
      .sort();
    expect(notified).toEqual(['room', ana.id, bruno.id].sort());
    expect(JSON.stringify(published)).not.toContain('@demo.com');
    const financial = await testDb.sql`SELECT 1 FROM wallet_entries WHERE lot_id = ${lot.id}`;
    expect(financial).toHaveLength(0);
    const report = await audit(lot.id);
    expect(report.verdict.status).toBe('INTACT');
    expect(report.entries.map((e) => e.type)).toEqual(['BID', 'BID', 'CANCELLED']);

    const late = await app.inject({
      method: 'POST',
      url: `/api/lots/${lot.id}/bids`,
      cookies: ana.cookie,
      headers: { 'idempotency-key': `late-${++sequence}` },
      payload: { amountCents: 2_000 },
    });
    expect(late.json<ApiErrorBody>().error.code).toBe('LOT_CANCELLED');
    const participations = await app.inject({
      method: 'GET',
      url: '/api/me/participations',
      cookies: ana.cookie,
    });
    expect(
      participations.json<{ items: { lotId: string; status: string }[] }>().items,
    ).toContainEqual(expect.objectContaining({ lotId: lot.id, status: 'CANCELLED' }));
    await expectLedgerInvariants();
  });

  it('estorna vencedor e leiloeiro após a liquidação e revoga o comprovante (CT-03-11)', async () => {
    const seller = await register('AUCTIONEER');
    const winner = await register('BIDDER');
    await deposit(winner.cookie);
    // Cadeia coerente numa janela já encerrada: o relógio forçado de `settle` quebraria a gênese.
    const lot = { id: await seedEndedLot(seller.id, winner.id, '2005', 1_200) };
    await settleDueLots(
      { db: testDb.db, signer: TEST_AUDIT_SIGNER, crypto: new NodeAuditCrypto() },
      { limit: 20 },
    );
    expect(await total(winner.id)).toBe(8_800);
    expect(await total(seller.id)).toBe(1_200);
    const [receipt] = await testDb.sql<
      { public_code: string }[]
    >`SELECT public_code FROM receipts WHERE lot_id = ${lot.id}`;
    published = [];

    const response = await cancel(seller.cookie, lot.id, { reason: 'Obra danificada' });
    expect(response.statusCode).toBe(200);
    expect(await total(winner.id)).toBe(10_000);
    expect(await total(seller.id)).toBe(0);
    const entries = await testDb.sql<
      { type: string; amount: number }[]
    >`SELECT type, amount_cents::int AS amount FROM wallet_entries WHERE lot_id = ${lot.id} AND type::text LIKE 'REFUND%' ORDER BY amount_cents DESC`;
    expect(entries).toEqual([
      { type: 'REFUND_CREDIT', amount: 1_200 },
      { type: 'REFUND_DEBIT', amount: -1_200 },
    ]);
    await expectLedgerInvariants();

    const view = await app.inject({ method: 'GET', url: `/api/receipts/${receipt!.public_code}` });
    expect(view.json()).toMatchObject({ revoked: true, revokedAt: expect.any(String) });
    const report = await audit(lot.id);
    expect(report.verdict.checks.filter((c) => !c.ok)).toEqual([]);
    expect(report.verdict.status).toBe('INTACT');
    expect(report.entries.map((e) => e.type)).toEqual(['BID', 'CLOSED', 'CANCELLED']);
    expect(report.receipt?.revokedAt).toBe(report.entries[2]!.createdAt);
    expect(
      published
        .filter((e) => e.type === 'wallet.changed')
        .map((e) => e.userId)
        .sort(),
    ).toEqual([seller.id, winner.id].sort());
    expect(published.some((e) => e.type === 'lot.cancelled' && !e.userId)).toBe(true);
    const participations = await app.inject({
      method: 'GET',
      url: '/api/me/participations',
      cookies: winner.cookie,
    });
    expect(
      participations.json<{
        items: { lotId: string; status: string; receiptCode: string | null }[];
      }>().items,
    ).toContainEqual(
      expect.objectContaining({ lotId: lot.id, status: 'CANCELLED', receiptCode: null }),
    );
  });

  it('recusa sem vencedor, já cancelado e encerrando sem lances (CT-03-12)', async () => {
    const seller = await register('AUCTIONEER');
    const unsold = await createLot(seller.cookie, '2006');
    await settle(unsold.id);
    const first = await cancel(seller.cookie, unsold.id);
    expect(first.statusCode).toBe(409);
    expect(first.json<ApiErrorBody>().error.code).toBe('LOT_NOT_CANCELLABLE');

    const closing = await createLot(seller.cookie, '2007');
    await testDb.sql`UPDATE lots SET original_ends_at = now() - interval '1 second', ends_at = now() - interval '1 second' WHERE id = ${closing.id}`;
    expect((await cancel(seller.cookie, closing.id)).statusCode).toBe(409);

    const lot = await createLot(seller.cookie, '2008');
    expect((await cancel(seller.cookie, lot.id)).statusCode).toBe(200);
    const again = await cancel(seller.cookie, lot.id);
    expect(again.statusCode).toBe(409);
    expect(again.json<ApiErrorBody>().error.code).toBe('LOT_NOT_CANCELLABLE');
    expect((await audit(lot.id)).entries).toHaveLength(1);
  });

  it('cancelamentos concorrentes estornam uma única vez', async () => {
    const seller = await register('AUCTIONEER');
    const winner = await register('BIDDER');
    await deposit(winner.cookie);
    const lot = await createLot(seller.cookie, '2009');
    await bid(winner.cookie, lot.id, 1_100);
    await settle(lot.id);
    const results = await Promise.all([
      cancel(seller.cookie, lot.id),
      cancel(seller.cookie, lot.id),
    ]);
    expect(results.map((r) => r.statusCode).sort()).toEqual([200, 409]);
    const refunds =
      await testDb.sql`SELECT 1 FROM wallet_entries WHERE lot_id = ${lot.id} AND type::text LIKE 'REFUND%'`;
    expect(refunds).toHaveLength(2);
    await expectLedgerInvariants();
  });

  it('painel: resultados e total após 2 liquidações e 1 estorno (CT-03-13)', async () => {
    const seller = await register('AUCTIONEER');
    const winner = await register('BIDDER');
    await deposit(winner.cookie);
    const a = await createLot(seller.cookie, '2010');
    const b = await createLot(seller.cookie, '2011');
    const c = await createLot(seller.cookie, '2012');
    await bid(winner.cookie, a.id, 1_000);
    await bid(winner.cookie, b.id, 1_300);
    await bid(winner.cookie, c.id, 1_500);
    await settle(a.id);
    await settle(b.id);
    await settle(c.id);
    expect((await cancel(seller.cookie, b.id)).statusCode).toBe(200);

    const panel = await app.inject({
      method: 'GET',
      url: '/api/auctioneer/lots',
      cookies: seller.cookie,
    });
    const body = panel.json<{
      totalReceivedCents: number;
      items: { id: string; result: string; cancellable: boolean }[];
    }>();
    // 3 liquidações (1.000 + 1.300 + 1.500) menos o estorno de 1.300.
    expect(body.totalReceivedCents).toBe(1_000 + 1_500);
    const byId = new Map(body.items.map((item) => [item.id, item]));
    expect(byId.get(a.id)).toMatchObject({ result: 'SOLD', cancellable: true });
    expect(byId.get(b.id)).toMatchObject({ result: 'CANCELLED', cancellable: false });
    expect(byId.get(c.id)).toMatchObject({ result: 'SOLD' });
    await expectLedgerInvariants();
  });
});
