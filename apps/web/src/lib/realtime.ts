import type { ClientToServerEvents, ServerToClientEvents } from '@leilao/shared';
import { io, type Socket } from 'socket.io-client';

export type RealtimeSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

let socket: RealtimeSocket | undefined;
let sessionUserId: string | null | undefined;

/** Cria uma conexão same-origin; o navegador envia o cookie `session` no handshake. */
export function getRealtimeSocket(): RealtimeSocket {
  socket ??= io({
    path: '/socket.io',
    autoConnect: false,
  }) as RealtimeSocket;
  return socket;
}

/** Reabre o handshake após login/logout para que a nova sessão seja autenticada pelo cookie. */
export function refreshRealtimeSession(userId: string | null): void {
  if (sessionUserId === userId) return;
  sessionUserId = userId;
  if (!socket) return;

  const shouldReconnect = socket.connected || socket.active;
  socket.disconnect();
  if (shouldReconnect) socket.connect();
}

/** Mantido exportado para isolar o singleton entre testes sem expor estado de produção. */
export function resetRealtimeSocketForTests(): void {
  socket?.disconnect();
  socket = undefined;
  sessionUserId = undefined;
}
