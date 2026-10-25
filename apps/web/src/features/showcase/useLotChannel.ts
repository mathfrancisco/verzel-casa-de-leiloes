import type { BidAcceptedEvent, LotRoomInput } from '@leilao/shared';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { getRealtimeSocket } from '../../lib/realtime';

export const lotQueryKey = (lotId: string) => ['lot', lotId] as const;

interface UseLotChannelOptions {
  lotId: string;
  /** Maior sequência já incluída no snapshot REST exibido. */
  displayedSeq: number;
  onBidAccepted?: (event: BidAcceptedEvent) => void;
}

function invalidateLotSnapshots(queryClient: ReturnType<typeof useQueryClient>, lotId: string) {
  void queryClient.invalidateQueries({ queryKey: ['lots'] });
  void queryClient.invalidateQueries({ queryKey: lotQueryKey(lotId) });
  void queryClient.invalidateQueries({ queryKey: ['wallet'] });
}

/** Mantém o snapshot REST da vitrine e carteira sincronizado com a sala pública do lote. */
export function useLotChannel({ lotId, displayedSeq, onBidAccepted }: UseLotChannelOptions): void {
  const queryClient = useQueryClient();
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
    const join = () => {
      if (!socket.connected) return;
      socket.emit('lot.join', { lotId } satisfies LotRoomInput, (ack) => {
        if (ack.ok) invalidateLotSnapshots(queryClient, lotId);
      });
    };
    const onBid = (event: BidAcceptedEvent) => {
      if (event.lotId !== lotId || event.seq <= lastDisplayedSeq.current) return;
      lastDisplayedSeq.current = event.seq;
      bidCallback.current?.(event);
      void queryClient.invalidateQueries({ queryKey: ['lots'] });
      void queryClient.invalidateQueries({ queryKey: lotQueryKey(lotId) });
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        if (socket.connected) join();
        invalidateLotSnapshots(queryClient, lotId);
      }
    };

    socket.on('connect', join);
    socket.on('bid.accepted', onBid);
    document.addEventListener('visibilitychange', onVisibilityChange);
    if (socket.connected) join();
    else socket.connect();

    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      socket.off('connect', join);
      socket.off('bid.accepted', onBid);
      if (socket.connected) {
        socket.emit('lot.leave', { lotId } satisfies LotRoomInput, () => undefined);
      }
    };
  }, [lotId, queryClient]);
}
