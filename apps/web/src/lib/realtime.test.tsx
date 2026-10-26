// @vitest-environment happy-dom

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const socketHarness = vi.hoisted(() => ({
  handlers: new Map<string, Set<(...args: never[]) => void>>(),
  emit: vi.fn(),
  connect: vi.fn(),
  disconnect: vi.fn(),
  on: vi.fn(),
  off: vi.fn(),
  connected: false,
}));

vi.mock('socket.io-client', () => ({
  io: vi.fn(() => ({
    on: (event: string, handler: (...args: never[]) => void) => {
      socketHarness.on(event, handler);
      const handlers = socketHarness.handlers.get(event) ?? new Set();
      handlers.add(handler);
      socketHarness.handlers.set(event, handlers);
    },
    off: (event: string, handler: (...args: never[]) => void) => {
      socketHarness.off(event, handler);
      socketHarness.handlers.get(event)?.delete(handler);
    },
    emit: socketHarness.emit,
    get connected() {
      return socketHarness.connected;
    },
    get active() {
      return socketHarness.connected;
    },
    connect: () => {
      socketHarness.connect();
      socketHarness.connected = true;
      for (const handler of socketHarness.handlers.get('connect') ?? []) handler();
    },
    disconnect: () => {
      socketHarness.disconnect();
      socketHarness.connected = false;
    },
  })),
}));

vi.mock('../features/auth/session', () => ({ useMe: () => null }));

import { io } from 'socket.io-client';
import { useLotChannel } from '../features/showcase/useLotChannel';
import { RealtimeLifecycle } from './RealtimeLifecycle';
import { resetRealtimeSocketForTests } from './realtime';

function TestChannel({
  lotId,
  displayedSeq = 5,
  onBid,
}: {
  lotId: string;
  displayedSeq?: number;
  onBid: (seq: number) => void;
}) {
  useLotChannel({ lotId, displayedSeq, onBidAccepted: ({ seq }) => onBid(seq) });
  return null;
}

let root: Root;
let container: HTMLDivElement;
let queryClient: QueryClient;

function fire(event: string, ...args: unknown[]) {
  for (const handler of socketHarness.handlers.get(event) ?? []) handler(...(args as never[]));
}

describe('realtime web client', () => {
  beforeEach(() => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    vi.clearAllMocks();
    socketHarness.handlers.clear();
    socketHarness.connected = false;
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    queryClient.setQueryData(['lots', 'live'], []);
    queryClient.setQueryData(['wallet', 'user-1'], {});
    queryClient.setQueryData(['participations'], { items: [] });
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    queryClient.clear();
    resetRealtimeSocketForTests();
    socketHarness.handlers.clear();
    socketHarness.connected = false;
  });

  it('uses one same-origin socket, rejoins on reconnect, refreshes snapshots on visibility, and cleans listeners', () => {
    const onBid = vi.fn();
    const render = (lotId: string) =>
      act(() =>
        root.render(
          <QueryClientProvider client={queryClient}>
            <TestChannel lotId={lotId} onBid={onBid} />
          </QueryClientProvider>,
        ),
      );

    render('lot-1');
    expect(io).toHaveBeenCalledTimes(1);
    expect(io).toHaveBeenCalledWith({ autoConnect: false, path: '/socket.io' });
    expect(socketHarness.connect).toHaveBeenCalledTimes(1);
    expect(socketHarness.emit).toHaveBeenCalledWith(
      'lot.join',
      { lotId: 'lot-1' },
      expect.any(Function),
    );

    render('lot-2');
    expect(io).toHaveBeenCalledTimes(1);
    expect(socketHarness.emit).toHaveBeenCalledWith(
      'lot.leave',
      { lotId: 'lot-1' },
      expect.any(Function),
    );
    expect(socketHarness.emit).toHaveBeenCalledWith(
      'lot.join',
      { lotId: 'lot-2' },
      expect.any(Function),
    );

    act(() => fire('connect'));
    expect(socketHarness.emit).toHaveBeenLastCalledWith(
      'lot.join',
      { lotId: 'lot-2' },
      expect.any(Function),
    );

    act(() => {
      socketHarness.connected = false;
      socketHarness.emit.mockClear();
      Object.defineProperty(document, 'visibilityState', {
        configurable: true,
        value: 'visible',
      });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    expect(socketHarness.emit).not.toHaveBeenCalledWith(
      'lot.join',
      expect.anything(),
      expect.any(Function),
    );
    expect(queryClient.getQueryState(['lots', 'live'])?.isInvalidated).toBe(true);
    expect(queryClient.getQueryState(['wallet', 'user-1'])?.isInvalidated).toBe(true);

    act(() => {
      socketHarness.connected = true;
      fire('connect');
    });
    expect(socketHarness.emit).toHaveBeenLastCalledWith(
      'lot.join',
      { lotId: 'lot-2' },
      expect.any(Function),
    );

    const event = (lotId: string, seq: number) => ({
      lotId,
      seq,
      serverTime: '2026-10-23T12:00:00.000Z',
      amountCents: 100,
      bidderPseudonym: 'Licitante A',
      createdAt: '2026-10-23T12:00:00.000Z',
      hash: 'abc',
      currentPriceCents: 100,
      minimumNextBidCents: 200,
      bidCount: 1,
      endsAt: '2026-10-23T13:00:00.000Z',
    });
    act(() => fire('bid.accepted', event('lot-2', 5)));
    act(() => fire('bid.accepted', event('lot-2', 6)));
    expect(onBid).toHaveBeenCalledTimes(1);
    expect(onBid).toHaveBeenCalledWith(6);

    renderWithLot('lot-3', onBid, 0);
    act(() => fire('bid.accepted', event('lot-3', 1)));
    expect(onBid).toHaveBeenCalledTimes(2);
    expect(onBid).toHaveBeenLastCalledWith(1);

    act(() => root.unmount());
    expect(socketHarness.handlers.get('bid.accepted')?.size ?? 0).toBe(0);
    expect(socketHarness.emit).toHaveBeenCalledWith(
      'lot.leave',
      { lotId: 'lot-3' },
      expect.any(Function),
    );
  });

  it('reconnects the singleton when the authenticated session changes', async () => {
    const { refreshRealtimeSession } = await import('./realtime');
    renderWithHook();
    act(() => refreshRealtimeSession('user-1'));
    expect(socketHarness.disconnect).toHaveBeenCalledTimes(1);
    expect(socketHarness.connect).toHaveBeenCalledTimes(2);
  });

  it('refreshes lot and wallet snapshots only after each successful room join acknowledgement', () => {
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
    renderWithHook();
    expect(invalidate).not.toHaveBeenCalled();

    const firstAck = latestJoinAck('lot-1');
    act(() => firstAck?.({ ok: true }));
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['lots'] });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['lot', 'lot-1'] });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['wallet'] });

    invalidate.mockClear();
    act(() => fire('connect'));
    expect(invalidate).not.toHaveBeenCalled();
    act(() => latestJoinAck('lot-1')?.({ ok: true }));
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['lot', 'lot-1'] });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['wallet'] });

    invalidate.mockClear();
    act(() => {
      Object.defineProperty(document, 'visibilityState', {
        configurable: true,
        value: 'visible',
      });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['lot', 'lot-1'] });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['wallet'] });
    const visibilityCalls = invalidate.mock.calls.length;
    act(() => latestJoinAck('lot-1')?.({ ok: true }));
    expect(invalidate.mock.calls.length).toBeGreaterThan(visibilityCalls);
  });

  it('keeps account-wide event listeners mounted and invalidates wallet and participations snapshots', () => {
    act(() =>
      root.render(
        <QueryClientProvider client={queryClient}>
          <RealtimeLifecycle />
        </QueryClientProvider>,
      ),
    );
    expect(socketHarness.connect).toHaveBeenCalledTimes(1);
    act(() =>
      fire('wallet.changed', {
        serverTime: '2026-10-23T12:00:00.000Z',
        totalCents: 500,
        committedCents: 100,
        availableCents: 400,
      }),
    );
    expect(queryClient.getQueryState(['wallet', 'user-1'])?.isInvalidated).toBe(true);
    act(() =>
      fire('lot.closed', {
        lotId: 'lot-1',
        serverTime: '2026-10-23T12:00:00.000Z',
        state: 'SETTLED',
        receiptCode: 'a'.repeat(22),
      }),
    );
    expect(queryClient.getQueryState(['participations'])?.isInvalidated).toBe(true);
    act(() => root.unmount());
    expect(socketHarness.handlers.get('wallet.changed')?.size ?? 0).toBe(0);
  });
});

function renderWithHook() {
  act(() =>
    root.render(
      <QueryClientProvider client={queryClient}>
        <TestChannel lotId="lot-1" onBid={vi.fn()} />
      </QueryClientProvider>,
    ),
  );
}

function latestJoinAck(lotId: string) {
  const calls = socketHarness.emit.mock.calls as unknown as [string, unknown, unknown][];
  const call = [...calls]
    .reverse()
    .find(([event, input]) => event === 'lot.join' && (input as { lotId: string }).lotId === lotId);
  return call?.[2] as ((response: { ok: boolean }) => void) | undefined;
}

function renderWithLot(lotId: string, onBid: (seq: number) => void, displayedSeq: number) {
  act(() =>
    root.render(
      <QueryClientProvider client={queryClient}>
        <TestChannel lotId={lotId} displayedSeq={displayedSeq} onBid={onBid} />
      </QueryClientProvider>,
    ),
  );
}
