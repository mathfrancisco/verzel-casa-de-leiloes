import type { ServerToClientEvents } from '@leilao/shared';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useMe } from '../features/auth/session';
import { getRealtimeSocket, refreshRealtimeSession } from './realtime';
import { syncServerTime } from './serverClock';

function invalidateSnapshot(queryClient: ReturnType<typeof useQueryClient>, lotId?: string) {
  void queryClient.invalidateQueries({ queryKey: ['lots'] });
  void queryClient.invalidateQueries({ queryKey: ['wallet'] });
  if (lotId) void queryClient.invalidateQueries({ queryKey: ['lot', lotId] });
}

/** Keeps the shared connection and account-wide events active across web routes. */
export function RealtimeLifecycle() {
  const queryClient = useQueryClient();
  const user = useMe();

  useEffect(() => {
    if (user !== undefined) refreshRealtimeSession(user?.id ?? null);
  }, [user?.id, user]);

  useEffect(() => {
    const socket = getRealtimeSocket();
    const onConnect = () => invalidateSnapshot(queryClient);
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') invalidateSnapshot(queryClient);
    };
    const sync = (event: { serverTime: string }) => syncServerTime(event.serverTime);
    const onLotEvent = (event: { serverTime: string; lotId: string }) => {
      sync(event);
      invalidateSnapshot(queryClient, event.lotId);
    };
    const onWalletEvent = (event: { serverTime: string }) => {
      sync(event);
      void queryClient.invalidateQueries({ queryKey: ['wallet'] });
    };
    const onBidAccepted: ServerToClientEvents['bid.accepted'] = (event) => onLotEvent(event);
    const onLotExtended: ServerToClientEvents['lot.extended'] = (event) => onLotEvent(event);
    const onLotClosed: ServerToClientEvents['lot.closed'] = (event) => onLotEvent(event);
    const onLotCancelled: ServerToClientEvents['lot.cancelled'] = (event) => onLotEvent(event);
    const onBidOutbid: ServerToClientEvents['bid.outbid'] = (event) => onLotEvent(event);
    const onWalletChanged: ServerToClientEvents['wallet.changed'] = onWalletEvent;
    const onLotWon: ServerToClientEvents['lot.won'] = (event) => onLotEvent(event);
    const onPong: ServerToClientEvents['pong'] = sync;
    socket.on('connect', onConnect);
    socket.on('bid.accepted', onBidAccepted);
    socket.on('lot.extended', onLotExtended);
    socket.on('lot.closed', onLotClosed);
    socket.on('lot.cancelled', onLotCancelled);
    socket.on('bid.outbid', onBidOutbid);
    socket.on('wallet.changed', onWalletChanged);
    socket.on('lot.won', onLotWon);
    socket.on('pong', onPong);
    document.addEventListener('visibilitychange', onVisibilityChange);
    socket.connect();

    return () => {
      socket.off('connect', onConnect);
      socket.off('bid.accepted', onBidAccepted);
      socket.off('lot.extended', onLotExtended);
      socket.off('lot.closed', onLotClosed);
      socket.off('lot.cancelled', onLotCancelled);
      socket.off('bid.outbid', onBidOutbid);
      socket.off('wallet.changed', onWalletChanged);
      socket.off('lot.won', onLotWon);
      socket.off('pong', onPong);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      socket.disconnect();
    };
  }, [queryClient]);

  return null;
}
