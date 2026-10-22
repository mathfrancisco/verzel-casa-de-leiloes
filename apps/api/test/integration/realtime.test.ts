import type { AddressInfo } from 'node:net';
import { io as connect, type Socket } from 'socket.io-client';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildTestApp } from '../support/app';
import { createTestDatabase } from '../support/database';

let testDb: Awaited<ReturnType<typeof createTestDatabase>>;
let app: ReturnType<typeof buildTestApp>;
let client: Socket;

beforeAll(async () => {
  testDb = await createTestDatabase();
  app = buildTestApp(testDb);
  await app.listen({ port: 0, host: '127.0.0.1' });
  const { port } = app.server.address() as AddressInfo;
  client = connect(`http://127.0.0.1:${port}`, { transports: ['websocket'] });
  await new Promise<void>((resolve, reject) => {
    client.once('connect', resolve);
    client.once('connect_error', reject);
  });
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
});
