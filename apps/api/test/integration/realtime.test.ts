import type { AddressInfo } from 'node:net';
import { io as connect, type Socket } from 'socket.io-client';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { CatalogItem, LotDetail } from '@leilao/shared';
import { FakeCatalog } from '../../src/infra/catalog/fake-catalog';
import { buildTestApp, sessionCookie } from '../support/app';
import { createTestDatabase } from '../support/database';

let testDb: Awaited<ReturnType<typeof createTestDatabase>>;
let app: ReturnType<typeof buildTestApp>;
let client: Socket;
let url: string;
let sequence = 0;
const catalog = new FakeCatalog(
  Array.from(
    { length: 4 },
    (_, index): CatalogItem => ({
      externalId: String(5001 + index),
      title: `Obra realtime ${index + 1}`,
      artist: 'Artista',
      date: '1900',
      medium: 'Óleo',
      dimensions: '50 x 60 cm',
      origin: 'Brasil',
      imageUrl: 'https://example.invalid/obra.png',
      sourceUrl: `https://example.invalid/${5001 + index}`,
      suggestedCategory: 'PAINTING',
    }),
  ),
);

beforeAll(async () => {
  testDb = await createTestDatabase();
  app = buildTestApp(testDb, {}, { catalog });
  await app.listen({ port: 0, host: '127.0.0.1' });
  const { port } = app.server.address() as AddressInfo;
  url = `http://127.0.0.1:${port}`;
  client = await socket();
});
afterAll(async () => {
  client.close();
  await app.close();
  await testDb.drop();
});

describe('WebSocket (Socket.IO)', () => {
  it('conecta por WebSocket e responde ao eco "ping"', async () => {
    const reply = await client.timeout(2000).emitWithAck('ping');
    expect(reply).toEqual({ pong: true, serverTime: expect.any(String) });
  });

  it('rejeita uma conexão WebSocket autenticada de outra origem', async () => {
    const bidder = await register();
    await expect(socket(bidder.cookie, url, 'https://outra-origem.example')).rejects.toBeTruthy();
  });

  it('entrega bid.accepted a dois clientes que entraram no lote (CT-06-01)', async () => {
    const seller = await register('AUCTIONEER');
    const bidder = await register();
    await deposit(bidder.cookie, 'fundos-01');
    const lot = await createLiveLot(seller.cookie, '5001');
    const first = await socket();
    const second = await socket();
    try {
      await Promise.all([join(first, lot.id), join(second, lot.id)]);
      const events = Promise.all([once(first, 'bid.accepted'), once(second, 'bid.accepted')]);
      expect((await bid(bidder.cookie, lot.id, 'bid-01', 1_000)).statusCode).toBe(201);
      const [a, b] = await events;
      expect(a).toMatchObject({
        lotId: lot.id,
        amountCents: 1_000,
        serverTime: expect.any(String),
      });
      expect(b).toEqual(a);
      expect(JSON.stringify(a)).not.toContain(bidder.user.id);
      expect(JSON.stringify(a)).not.toContain('@demo.com');
    } finally {
      first.close();
      second.close();
    }
  });

  it('preserva a ordem recebida entre lot.join e lot.leave', async () => {
    const seller = await register('AUCTIONEER');
    const bidder = await register();
    await deposit(bidder.cookie, 'fundos-ordem');
    const lot = await createLiveLot(seller.cookie, '5001');
    const delayedApp = buildTestApp(testDb, {}, { catalog, db: delayFirstLotLookup(testDb.db) });
    await delayedApp.listen({ port: 0, host: '127.0.0.1' });
    const delayedPort = (delayedApp.server.address() as AddressInfo).port;
    const observer = await socket(undefined, `http://127.0.0.1:${delayedPort}`);
    try {
      const joining = ack(observer, 'lot.join', { lotId: lot.id });
      const leaving = ack(observer, 'lot.leave', { lotId: lot.id });
      await expect(joining).resolves.toEqual({ ok: true });
      await expect(leaving).resolves.toEqual({ ok: true });

      let emitted = false;
      observer.once('bid.accepted', () => {
        emitted = true;
      });
      expect((await bid(bidder.cookie, lot.id, 'bid-ordem', 1_000, delayedApp)).statusCode).toBe(
        201,
      );
      await new Promise((resolve) => setTimeout(resolve, 100));
      expect(emitted).toBe(false);
    } finally {
      observer.close();
      await delayedApp.close();
    }
  });

  it('não emite evento para lance recusado (CT-06-02)', async () => {
    const seller = await register('AUCTIONEER');
    const bidder = await register();
    await deposit(bidder.cookie, 'fundos-02');
    const lot = await createLiveLot(seller.cookie, '5002');
    const observer = await socket();
    try {
      await join(observer, lot.id);
      let emitted = false;
      observer.once('bid.accepted', () => {
        emitted = true;
      });
      expect((await bid(bidder.cookie, lot.id, 'bid-02', 999)).statusCode).toBe(422);
      await new Promise((resolve) => setTimeout(resolve, 100));
      expect(emitted).toBe(false);
    } finally {
      observer.close();
    }
  });

  it('notifica o líder superado apenas no canal pessoal (CT-06-03)', async () => {
    const seller = await register('AUCTIONEER');
    const firstBidder = await register();
    const secondBidder = await register();
    await Promise.all([
      deposit(firstBidder.cookie, 'fundos-03a'),
      deposit(secondBidder.cookie, 'fundos-03b'),
    ]);
    const lot = await createLiveLot(seller.cookie, '5003');
    const firstSocket = await socket(firstBidder.cookie);
    try {
      const ownWallet = once(firstSocket, 'wallet.changed');
      expect((await bid(firstBidder.cookie, lot.id, 'bid-03a', 1_000)).statusCode).toBe(201);
      await ownWallet;
      const outbid = once(firstSocket, 'bid.outbid');
      const wallet = once(firstSocket, 'wallet.changed');
      expect((await bid(secondBidder.cookie, lot.id, 'bid-03b', 1_100)).statusCode).toBe(201);
      expect(await outbid).toMatchObject({ lotId: lot.id, newPriceCents: 1_100 });
      expect(await wallet).toMatchObject({ committedCents: 0, availableCents: 10_000 });
    } finally {
      firstSocket.close();
    }
  });

  it('mantém a sala pessoal privada e tolera join inválido sem ack (CT-06-04)', async () => {
    const bidder = await register();
    const privateSocket = await socket(bidder.cookie);
    const visitor = await socket();
    try {
      let leaked = false;
      visitor.once('wallet.changed', () => {
        leaked = true;
      });
      visitor.emit('user.join', { userId: bidder.user.id });
      const walletChanged = once(privateSocket, 'wallet.changed');
      expect((await deposit(bidder.cookie, 'fundos-04')).statusCode).toBe(201);
      expect(await walletChanged).toMatchObject({
        availableCents: 10_000,
        serverTime: expect.any(String),
      });
      await new Promise((resolve) => setTimeout(resolve, 100));
      expect(leaked).toBe(false);
      await expect(ack(visitor, 'lot.join', { lotId: `user:${bidder.user.id}` })).resolves.toEqual({
        ok: false,
        error: { code: 'VALIDATION_ERROR' },
      });
      visitor.emit('lot.join', { lotId: 'inválido' });
      expect(await visitor.timeout(2000).emitWithAck('ping')).toMatchObject({ pong: true });
    } finally {
      privateSocket.close();
      visitor.close();
    }
  });

  it('não emite nada quando a transação falha (CT-06-05)', async () => {
    const events: unknown[] = [];
    const rollbackDb = Object.create(testDb.db) as typeof testDb.db;
    rollbackDb.transaction = async (callback, config) =>
      testDb.db.transaction(async (tx) => {
        await callback(tx);
        throw new Error('falha antes do commit');
      }, config);
    const failingApp = buildTestApp(
      testDb,
      {},
      {
        catalog,
        db: rollbackDb,
        bidEventCollector: (collected) => events.push(...collected),
      },
    );
    await failingApp.listen({ port: 0, host: '127.0.0.1' });
    const port = (failingApp.server.address() as AddressInfo).port;
    const failingUrl = `http://127.0.0.1:${port}`;
    const seller = await register('AUCTIONEER');
    const bidder = await register('BIDDER');
    await deposit(bidder.cookie, 'fundos-05');
    const lot = await createLiveLot(seller.cookie, '5004');
    const observer = await socket(undefined, failingUrl);
    try {
      await join(observer, lot.id);
      let emitted = false;
      observer.once('bid.accepted', () => {
        emitted = true;
      });
      expect((await bid(bidder.cookie, lot.id, 'bid-05', 1_000, failingApp)).statusCode).toBe(500);
      await new Promise((resolve) => setTimeout(resolve, 100));
      expect(emitted).toBe(false);
      expect(events).toEqual([]);
      const [entryCount] = await testDb.sql<{ count: number }[]>`
        SELECT count(*)::int AS count FROM lot_entries WHERE lot_id = ${lot.id}
      `;
      expect(entryCount!.count).toBe(0);
    } finally {
      observer.close();
      await failingApp.close();
    }
  });
});

async function socket(cookie?: Record<string, string>, target = url, origin?: string) {
  const connected = connect(target, {
    transports: ['websocket'],
    extraHeaders: {
      ...(cookie ? { cookie: `session=${cookie.session}` } : {}),
      ...(origin ? { origin } : {}),
    },
  });
  await new Promise<void>((resolve, reject) => {
    connected.once('connect', resolve);
    connected.once('connect_error', reject);
  });
  return connected;
}

function once(socket: Socket, event: string) {
  return new Promise<Record<string, unknown>>((resolve) => socket.once(event, resolve));
}

function ack(socket: Socket, event: 'lot.join' | 'lot.leave', input: unknown) {
  return socket.timeout(2000).emitWithAck(event, input);
}

async function join(socket: Socket, lotId: string) {
  await expect(ack(socket, 'lot.join', { lotId })).resolves.toEqual({ ok: true });
}

async function register(role: 'BIDDER' | 'AUCTIONEER' = 'BIDDER', target = app) {
  const response = await target.inject({
    method: 'POST',
    url: '/api/auth/register',
    payload: {
      name: `${role} ${++sequence}`,
      email: `realtime-${sequence}@demo.com`,
      password: 'senha-forte',
      role,
    },
  });
  return { cookie: sessionCookie(response), user: response.json<{ user: { id: string } }>().user };
}

function deposit(cookie: Record<string, string>, key: string, target = app) {
  return target.inject({
    method: 'POST',
    url: '/api/wallet/deposits',
    cookies: cookie,
    headers: { 'idempotency-key': key },
    payload: { amountCents: 10_000 },
  });
}

async function createLiveLot(cookie: Record<string, string>, externalId: string, target = app) {
  const response = await target.inject({
    method: 'POST',
    url: '/api/lots',
    cookies: cookie,
    payload: {
      externalId,
      title: `Lote ${externalId}`,
      description: 'Lote de teste realtime.',
      category: 'PAINTING',
      startingPriceCents: 1_000,
      minIncrementCents: 100,
      startsAt: new Date(Date.now() - 10_000).toISOString(),
      endsAt: new Date(Date.now() + 3_600_000).toISOString(),
    },
  });
  expect(response.statusCode).toBe(201);
  return response.json<LotDetail>();
}

function bid(
  cookie: Record<string, string>,
  lotId: string,
  key: string,
  amountCents: number,
  target = app,
) {
  return target.inject({
    method: 'POST',
    url: `/api/lots/${lotId}/bids`,
    cookies: cookie,
    headers: { 'idempotency-key': key },
    payload: { amountCents },
  });
}

function delayFirstLotLookup(db: typeof testDb.db) {
  const delayedDb = Object.create(db) as typeof db;
  const select = db.select.bind(db);
  let delay = true;
  (delayedDb as { select: (...args: unknown[]) => unknown }).select = (...args) => {
    const selectBuilder = (select as (...selectArgs: unknown[]) => ReturnType<typeof select>)(
      ...args,
    );
    const from = selectBuilder.from.bind(selectBuilder);
    selectBuilder.from = (...fromArgs) => {
      const fromBuilder = from(...fromArgs);
      const where = fromBuilder.where.bind(fromBuilder);
      fromBuilder.where = (...whereArgs) => {
        const query = where(...whereArgs);
        if (!delay) return query;
        delay = false;
        return new Proxy(query, {
          get(target, property) {
            if (property === 'then') {
              return (resolve: (value: unknown) => void, reject: (reason: unknown) => void) =>
                new Promise((continueQuery) => setTimeout(continueQuery, 50))
                  .then(() => target)
                  .then(resolve, reject);
            }
            const value = Reflect.get(target, property, target);
            return typeof value === 'function' ? value.bind(target) : value;
          },
        });
      };
      return fromBuilder;
    };
    return selectBuilder;
  };
  return delayedDb;
}
