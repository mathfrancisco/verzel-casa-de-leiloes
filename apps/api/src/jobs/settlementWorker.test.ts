import { afterEach, describe, expect, it, vi } from 'vitest';
import type { SettlementDeps } from '../application/settlement';

const mocks = vi.hoisted(() => ({
  settleDueLots: vi.fn(),
  clearExpiredIdempotencyKeys: vi.fn(),
}));

vi.mock('../application/settlement', () => mocks);

import { startSettlementWorker } from './settlementWorker';

afterEach(() => {
  vi.clearAllMocks();
});

describe('startSettlementWorker', () => {
  it('absorve erro de ciclo sem rejection não tratada e permite desligamento limpo', async () => {
    mocks.settleDueLots.mockRejectedValueOnce(new Error('banco temporariamente indisponível'));
    const onError = vi.fn();
    const rejections: unknown[] = [];
    const onRejection = (reason: unknown) => rejections.push(reason);
    process.on('unhandledRejection', onRejection);
    const stop = startSettlementWorker({ onError } as unknown as SettlementDeps & {
      onError: () => void;
    });

    await new Promise((resolve) => setTimeout(resolve, 25));
    await stop();
    process.off('unhandledRejection', onRejection);

    expect(mocks.settleDueLots).toHaveBeenCalledWith({ onError }, { limit: 20 });
    expect(onError).toHaveBeenCalledTimes(1);
    expect(rejections).toEqual([]);
  });

  it('reporta falhas retornadas pela liquidação sem interromper o ciclo', async () => {
    mocks.settleDueLots.mockResolvedValueOnce({ settled: 0, failures: [new Error('assinatura')] });
    const onError = vi.fn();
    const stop = startSettlementWorker({ onError } as unknown as SettlementDeps & {
      onError: () => void;
    });

    await vi.waitFor(() => expect(onError).toHaveBeenCalledTimes(1));
    await stop();
  });

  it('aguarda o ciclo corrente antes de concluir o desligamento', async () => {
    let releaseCycle: (() => void) | undefined;
    mocks.settleDueLots.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          releaseCycle = resolve;
        }),
    );
    const stop = startSettlementWorker({} as SettlementDeps);
    await vi.waitFor(() => expect(mocks.settleDueLots).toHaveBeenCalledTimes(1));
    let stopped = false;
    const shutdown = stop().then(() => {
      stopped = true;
    });
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(stopped).toBe(false);
    releaseCycle?.();
    await shutdown;
    expect(stopped).toBe(true);
  });
});
