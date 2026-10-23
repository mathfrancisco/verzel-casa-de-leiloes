import type { FastifyInstance } from 'fastify';
import { Server } from 'socket.io';

/**
 * Socket.IO no mesmo servidor HTTP da API. Por ora só o eco `ping`, usado para validar
 * WebSocket no deploy; salas e eventos de lote entram no LC-012.
 */
export function attachRealtime(app: FastifyInstance): Server {
  const io = new Server(app.server, { path: '/socket.io', serveClient: false });

  io.on('connection', (socket) => {
    socket.on('ping', (ack: unknown) => {
      if (typeof ack === 'function') ack({ pong: true, serverTime: new Date().toISOString() });
    });
  });

  // O Fastify fecha o servidor HTTP; aqui só derrubamos as conexões abertas.
  app.addHook('preClose', async () => {
    io.disconnectSockets(true);
  });
  return io;
}
