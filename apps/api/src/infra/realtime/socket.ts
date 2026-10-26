import {
  lotRoomSchema,
  type ClientToServerEvents,
  type LotRoomAck,
  type ServerToClientEvents,
} from '@leilao/shared';
import { eq } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { Server, type Socket } from 'socket.io';
import type { BidEvent } from '../../application/bids';
import type { Db } from '../db/client';
import { lots } from '../db/schema';

type SocketData = { user?: { id: string } };
type RealtimeSocket = Socket<ClientToServerEvents, ServerToClientEvents, object, SocketData>;

function cookieValue(header: string | undefined, name: string) {
  return header
    ?.split(';')
    .map((part) => part.trim().split('='))
    .find(([key]) => key === name)?.[1];
}

function lotRoom(lotId: string) {
  return `lot:${lotId}`;
}

function userRoom(userId: string) {
  return `user:${userId}`;
}

/** Socket.IO transport. Application use cases collect events and call `publish` after commit. */
export function attachRealtime(app: FastifyInstance, db: Db) {
  const io = new Server<ClientToServerEvents, ServerToClientEvents, object, SocketData>(
    app.server,
    {
      path: '/socket.io',
      serveClient: false,
      allowRequest(request, callback) {
        const origin = request.headers.origin;
        if (!origin) return callback(null, true);
        try {
          return callback(null, new URL(origin).host === request.headers.host);
        } catch {
          return callback(null, false);
        }
      },
    },
  );

  io.use((socket, next) => {
    const token = cookieValue(socket.handshake.headers.cookie, 'session');
    if (!token) return next();
    try {
      const session = app.jwt.verify<{ sub: string }>(token);
      socket.data.user = { id: session.sub };
      return next();
    } catch {
      // A sessão inválida tem os mesmos poderes de um visitante: só salas públicas.
      return next();
    }
  });

  io.on('connection', (socket: RealtimeSocket) => {
    if (socket.data.user) socket.join(userRoom(socket.data.user.id));
    let roomChanges = Promise.resolve();

    const changeLotRoom = async (input: unknown, join: boolean, callback: unknown) => {
      const ack: (reply: LotRoomAck) => void =
        typeof callback === 'function' ? (callback as (reply: LotRoomAck) => void) : () => {};
      try {
        const parsed = lotRoomSchema.safeParse(input);
        if (!parsed.success) return ack({ ok: false, error: { code: 'VALIDATION_ERROR' } });
        const [lot] = await db
          .select({ id: lots.id })
          .from(lots)
          .where(eq(lots.id, parsed.data.lotId));
        if (!lot) return ack({ ok: false, error: { code: 'LOT_NOT_FOUND' } });
        if (join) await socket.join(lotRoom(lot.id));
        else await socket.leave(lotRoom(lot.id));
        return ack({ ok: true });
      } catch {
        app.log.warn('Falha ao alterar sala realtime.');
        return ack({ ok: false, error: { code: 'REALTIME_UNAVAILABLE' } });
      }
    };

    socket.on('lot.join', (input, ack) => {
      roomChanges = roomChanges.then(() => changeLotRoom(input, true, ack));
    });
    socket.on('lot.leave', (input, ack) => {
      roomChanges = roomChanges.then(() => changeLotRoom(input, false, ack));
    });
    socket.on('ping', (ack) => {
      if (typeof ack === 'function') ack({ pong: true, serverTime: new Date().toISOString() });
    });
  });

  app.addHook('preClose', async () => {
    io.disconnectSockets(true);
  });

  return {
    publish(events: BidEvent[]) {
      for (const event of events) {
        const message = { ...event.payload, serverTime: event.serverTime };
        if (event.userId) io.to(userRoom(event.userId)).emit(event.type, message as never);
        else {
          const payload = event.payload as { lotId: string };
          io.to(lotRoom(payload.lotId)).emit(event.type, message as never);
        }
      }
    },
  };
}
