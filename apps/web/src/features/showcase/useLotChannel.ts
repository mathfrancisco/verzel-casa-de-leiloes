import type { BidAcceptedEvent, LotRoomInput } from '@leilao/shared';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { getRealtimeSocket } from '../../lib/realtime';
import { isFreshBidEvent, resolveSyncState, type SyncState } from '../../lib/syncState';

export const lotQueryKey = (lotId: string) => ['lot', lotId] as const;

interface UseLotChannelOptions {
  lotId: string;
  /** Maior sequência já incluída no snapshot REST exibido. */
  displayedSeq: number;
  onBidAccepted?: (event: BidAcceptedEvent) => void;
}

type Client = ReturnType<typeof useQueryClient>;

function invalidateLotSnapshots(queryClient: Client, lotId: string) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: ['lots'] }),
    queryClient.invalidateQueries({ queryKey: lotQueryKey(lotId) }),
    queryClient.invalidateQueries({ queryKey: ['wallet'] }),
  ]);
}

/** O snapshot só está confirmado se nenhuma consulta do lote terminou em erro. */
function lotSnapshotConfirmed(queryClient: Client, lotId: string) {
  return queryClient
    .getQueryCache()
    .findAll({ queryKey: lotQueryKey(lotId) })
    .every((query) => query.state.status !== 'error');
}

/**
 * Mantém o snapshot REST da vitrine e carteira sincronizado com a sala pública do lote e devolve
 * o estado de sincronização: "conectado" só vira "sincronizado" depois que o snapshot REST pedido
 * após o ACK do `lot.join` é confirmado. O servidor segue como autoridade; eventos só invalidam.
 */
export function useLotChannel({
  lotId,
  displayedSeq,
  onBidAccepted,
}: UseLotChannelOptions): SyncState {
  const queryClient = useQueryClient();
  const [connected, setConnected] = useState(() => getRealtimeSocket().connected);
  const [snapshotConfirmed, setSnapshotConfirmed] = useState(false);
  const lastDisplayedSeq = useRef(displayedSeq);
  const currentLotId = useRef(lotId);
  const bidCallback = useRef(onBidAccepted);

  if (currentLotId.current !== lotId) {
    currentLotId.current = lotId;
    lastDisplayedSeq.current = displayedSeq;
  } else {
    lastDisplayedSeq.current = Math.max(lastDisplayedSeq.current, displayedSeq);
  }
  bidCallback.current = onBidAccepted;

  useEffect(() => {
    const socket = getRealtimeSocket();
    // Cada (re)conexão abre uma época; confirmações de épocas anteriores são descartadas.
    let epoch = 0;
    const join = () => {
      if (!socket.connected) return;
      const joinEpoch = epoch;
      socket.emit('lot.join', { lotId } satisfies LotRoomInput, (ack) => {
        if (!ack.ok) return;
        void invalidateLotSnapshots(queryClient, lotId).then(() => {
          if (joinEpoch === epoch && socket.connected) {
            setSnapshotConfirmed(lotSnapshotConfirmed(queryClient, lotId));
          }
        });
      });
    };
    const onConnect = () => {
      epoch += 1;
      setConnected(true);
      setSnapshotConfirmed(false);
      join();
    };
    const onDisconnect = () => {
      epoch += 1;
      setConnected(false);
      setSnapshotConfirmed(false);
    };
    const onBid = (event: BidAcceptedEvent) => {
      if (event.lotId !== lotId || !isFreshBidEvent(event.seq, lastDisplayedSeq.current)) return;
      lastDisplayedSeq.current = event.seq;
      bidCallback.current?.(event);
      void queryClient.invalidateQueries({ queryKey: ['lots'] });
      void queryClient.invalidateQueries({ queryKey: lotQueryKey(lotId) });
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        if (socket.connected) join();
        void invalidateLotSnapshots(queryClient, lotId);
      }
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('bid.accepted', onBid);
    document.addEventListener('visibilitychange', onVisibilityChange);
    setConnected(socket.connected);
    setSnapshotConfirmed(false);
    if (socket.connected) join();
    else socket.connect();

    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('bid.accepted', onBid);
      if (socket.connected) {
        socket.emit('lot.leave', { lotId } satisfies LotRoomInput, () => undefined);
      }
    };
  }, [lotId, queryClient]);

  return resolveSyncState({ connected, snapshotConfirmed });
}
