import { createHash } from 'node:crypto';
import type { ApiErrorBody, LotDetail } from '@leilao/shared';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { genesisHash } from '../../src/domain/auditChain';
import { DomainError } from '../../src/domain/errors';
import { FAKE_IMAGE, FakeCatalog } from '../../src/infra/catalog/fake-catalog';
import { buildTestApp, sessionCookie, TEST_PSEUDONYM_SECRET } from '../support/app';
import { createTestDatabase } from '../support/database';
import { pseudonym } from '../../src/domain/pseudonym';

let testDb: Awaited<ReturnType<typeof createTestDatabase>>;
let app: ReturnType<typeof buildTestApp>;
const catalog = new FakeCatalog();
let auctioneer: Record<string, string>;
let auctioneerId: string;
let bidder: Record<string, string>;

async function signup(role: 'AUCTIONEER' | 'BIDDER', name: string) {
  const res = await app.inject({
    method: 'POST',
    url: '/api/auth/register',
    payload: {
      name,
      email: `${role.toLowerCase()}-${Date.now()}@demo.com`,
      password: 'senha-forte',
      role,
    },
  });
  return { cookies: sessionCookie(res), id: res.json().user.id as string };
}

beforeAll(async () => {
  testDb = await createTestDatabase();
  app = buildTestApp(testDb, {}, { catalog });
  ({ cookies: auctioneer, id: auctioneerId } = await signup('AUCTIONEER', 'Leila Leiloeira'));
  ({ cookies: bidder } = await signup('BIDDER', 'Ana Licitante'));
});
afterAll(async () => {
  await app.close();
  await testDb.drop();
});
beforeEach(() => {
  catalog.setMode('ok');
  vi.restoreAllMocks();
});

const inHours = (h: number) => new Date(Date.now() + h * 3_600_000).toISOString();
const validLot = (overrides: Record<string, unknown> = {}) => ({
  externalId: '1001',
  title: 'Lírios d’água',
  description: 'Óleo sobre tela.',
  category: 'PAINTING' as const,
  startingPriceCents: 100_000,
  minIncrementCents: 10_000,
  startsAt: inHours(1),
  endsAt: inHours(25),
  ...overrides,
});
const createLot = (payload: unknown, cookies = auctioneer) =>
  app.inject({ method: 'POST', url: '/api/lots', payload: payload as object, cookies });
const countRows = async (table: string) =>
  (await testDb.sql.unsafe<{ n: number }[]>(`SELECT count(*)::int AS n FROM ${table}`))[0]!.n;

describe('POST /api/lots', () => {
  it('cria lote com snapshot do item, imagem e gênese (CT-03-01)', async () => {
    const input = validLot();
    const res = await createLot(input);

    expect(res.statusCode).toBe(201);
    const lot = res.json<LotDetail>();
    expect(lot).toMatchObject({
      title: 'Lírios d’água',
      category: 'PAINTING',
      phase: 'SCHEDULED',
      startsAt: input.startsAt,
      endsAt: input.endsAt,
      originalEndsAt: input.endsAt,
      startingPriceCents: 100_000,
      minIncrementCents: 10_000,
      minimumNextBidCents: 100_000,
      currentPriceCents: null,
      bidCount: 0,
      leaderPseudonym: null,
      extended: false,
      recentEntries: [],
      item: { artist: 'Claude Monet', medium: 'Óleo sobre tela' },
      me: { isSeller: true, isLeader: false },
    });
    expect(lot.imageUrl).toMatch(/^\/api\/images\/[0-9a-f-]{36}$/);
    expect(lot.sellerPseudonym).toBe(
      pseudonym(TEST_PSEUDONYM_SECRET, 'AUCTIONEER', auctioneerId, lot.id),
    );

    const [row] = await testDb.sql`
      SELECT l.*, i.sha256, i.bytes, i.content_type FROM lots l JOIN images i ON i.id = l.image_id
      WHERE l.id = ${lot.id}`;
    expect(row!.item_snapshot).toMatchObject({ externalId: '1001', title: 'Lírios d’água' });
    expect(Buffer.from(row!.bytes).equals(Buffer.from(FAKE_IMAGE.bytes))).toBe(true);
    expect(row!.sha256).toBe(createHash('sha256').update(FAKE_IMAGE.bytes).digest('hex'));
    expect(row!.state).toBe('ACTIVE');
    expect(row!.head_hash).toBe(row!.genesis_hash);
    expect(row!.genesis_hash).toBe(
      genesisHash({
        lotId: lot.id,
        externalId: '1001',
        imageSha256: row!.sha256,
        title: input.title,
        description: input.description,
        category: input.category,
        itemSnapshot: row!.item_snapshot,
        sellerPseudonym: lot.sellerPseudonym,
        startingPriceCents: input.startingPriceCents,
        minIncrementCents: input.minIncrementCents,
        startsAt: input.startsAt,
        originalEndsAt: input.endsAt,
      }),
    );
  });

  it('lote que começa agora já nasce ao vivo', async () => {
    const res = await createLot(validLot({ startsAt: new Date().toISOString() }));
    expect(res.json<LotDetail>().phase).toBe('LIVE');
  });

  it.each([
    [{ endsAt: inHours(1.05) }, 'endsAt'], // dura 3 min
    [{ minIncrementCents: 0 }, 'minIncrementCents'],
    [{ startingPriceCents: -100 }, 'startingPriceCents'],
    [{ startsAt: inHours(-1) }, 'startsAt'],
  ])('recusa %o com erro no campo (CT-03-02)', async (override, field) => {
    const res = await createLot(validLot(override));
    expect(res.statusCode).toBe(400);
    expect(res.json<ApiErrorBody>().error.details?.issues).toEqual(
      expect.arrayContaining([expect.objectContaining({ path: [field] })]),
    );
  });

  it('licitante não cria lote (CT-03-03)', async () => {
    expect((await createLot(validLot(), bidder)).statusCode).toBe(403);
  });

  it('visitante não cria lote', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/lots', payload: validLot() });
    expect(res.statusCode).toBe(401);
  });

  it('catálogo fora → 503 e nada é gravado (CT-03-04)', async () => {
    const before = [await countRows('lots'), await countRows('images')];
    catalog.setMode('fail');
    const res = await createLot(validLot());
    expect(res.statusCode).toBe(503);
    expect(res.json<ApiErrorBody>().error.code).toBe('CATALOG_UNAVAILABLE');
    expect([await countRows('lots'), await countRows('images')]).toEqual(before);
  });

  it('falha ao baixar a imagem → 503 e nada é gravado', async () => {
    const before = await countRows('images');
    vi.spyOn(catalog, 'fetchImage').mockRejectedValueOnce(new DomainError('CATALOG_UNAVAILABLE'));
    const res = await createLot(validLot());
    expect(res.statusCode).toBe(503);
    expect(await countRows('images')).toBe(before);
  });

  it('obra inexistente → 404 CATALOG_ITEM_NOT_FOUND', async () => {
    const res = await createLot(validLot({ externalId: '9' }));
    expect(res.statusCode).toBe(404);
    expect(res.json<ApiErrorBody>().error.code).toBe('CATALOG_ITEM_NOT_FOUND');
  });
});

describe('GET /api/lots/:id', () => {
  it('é público e não expõe dados pessoais (CT-03-07)', async () => {
    const created = (await createLot(validLot())).json<LotDetail>();
    const res = await app.inject({ method: 'GET', url: `/api/lots/${created.id}` });

    expect(res.statusCode).toBe(200);
    const body = res.json<LotDetail>();
    expect(body.me).toBeUndefined();
    expect(body.serverTime).toEqual(expect.any(String));
    for (const forbidden of [
      auctioneerId,
      'Leila Leiloeira',
      '@demo.com',
      'sellerId',
      'leaderId',
    ]) {
      expect(res.body).not.toContain(forbidden);
    }
  });

  it('licitante logado recebe "me" com o próprio pseudônimo', async () => {
    const created = (await createLot(validLot())).json<LotDetail>();
    const body = (
      await app.inject({ method: 'GET', url: `/api/lots/${created.id}`, cookies: bidder })
    ).json<LotDetail>();
    expect(body.me).toMatchObject({
      isSeller: false,
      isLeader: false,
      myBestBidCents: null,
      position: null,
    });
    expect(body.me?.myPseudonym).toMatch(/^Licitante [A-Z2-7]{6}$/);
  });

  it.each(['00000000-0000-7000-8000-000000000000', 'nao-e-uuid'])(
    'lote %s inexistente → 404',
    async (id) => {
      const res = await app.inject({ method: 'GET', url: `/api/lots/${id}` });
      expect(res.statusCode).toBe(404);
      expect(res.json<ApiErrorBody>().error.code).toBe('LOT_NOT_FOUND');
    },
  );
});

describe('GET /api/images/:id', () => {
  it('devolve os bytes guardados com cache imutável', async () => {
    const lot = (await createLot(validLot())).json<LotDetail>();
    const res = await app.inject({ method: 'GET', url: lot.imageUrl });
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toBe(FAKE_IMAGE.contentType);
    expect(res.headers['cache-control']).toBe('public, max-age=31536000, immutable');
    expect(res.rawPayload.equals(Buffer.from(FAKE_IMAGE.bytes))).toBe(true);
  });

  it('continua servindo com o catálogo fora (RN-21)', async () => {
    const lot = (await createLot(validLot())).json<LotDetail>();
    catalog.setMode('fail');
    expect((await app.inject({ method: 'GET', url: lot.imageUrl })).statusCode).toBe(200);
    expect((await app.inject({ method: 'GET', url: `/api/lots/${lot.id}` })).statusCode).toBe(200);
  });

  it('imagem inexistente → 404', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/images/00000000-0000-7000-8000-000000000000',
    });
    expect(res.statusCode).toBe(404);
  });
});

describe('lot_entries é append-only', () => {
  it('bloqueia UPDATE e DELETE pelo banco', async () => {
    const lot = (await createLot(validLot())).json<LotDetail>();
    await testDb.sql`
      INSERT INTO lot_entries (lot_id, seq, type, payload, created_at, prev_hash, hash, signature)
      VALUES (${lot.id}, 1, 'CLOSED', '{}', now(), ${'0'.repeat(64)}, ${'1'.repeat(64)}, 'sig')`;

    await expect(
      testDb.sql`UPDATE lot_entries SET signature = 'x' WHERE lot_id = ${lot.id}`,
    ).rejects.toThrow(/append-only/);
    await expect(testDb.sql`DELETE FROM lot_entries WHERE lot_id = ${lot.id}`).rejects.toThrow(
      /append-only/,
    );
  });
});
