import {
  clearExpiredIdempotencyKeys,
  settleDueLots,
  type SettlementDeps,
} from '../application/settlement';

const CYCLE_MS = 1_000;
const CLEANUP_MS = 10 * 60 * 1_000;

/** Starts the worker and awaits its current cycle when shutdown begins. */
export function startSettlementWorker(deps: SettlementDeps & { onError?: () => void }) {
  let stopped = false;
  let running: Promise<void> | undefined;
  let lastCleanup = 0;
  const reportError = () => {
    try {
      deps.onError?.();
    } catch {
      // A observabilidade não pode derrubar o worker.
    }
  };
  const cycle = async () => {
    if (stopped || running) return;
    running = (async () => {
      try {
        const result = await settleDueLots(deps, { limit: 20 });
        if (result.failures.length > 0) reportError();
        if (Date.now() - lastCleanup >= CLEANUP_MS) {
          await clearExpiredIdempotencyKeys(deps.db);
          lastCleanup = Date.now();
        }
      } catch {
        // O próximo ciclo tenta novamente; nunca deixar uma rejeição solta no processo.
        reportError();
      }
    })().finally(() => {
      running = undefined;
    });
    await running;
  };
  void cycle();
  const timer = setInterval(() => void cycle(), CYCLE_MS);
  return async () => {
    stopped = true;
    clearInterval(timer);
    await running;
  };
}
