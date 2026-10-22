type State = 'closed' | 'open' | 'half-open';

/**
 * Abre após `failureThreshold` falhas seguidas; depois de `openMs` libera uma única tentativa
 * (meia-abertura): sucesso fecha, falha reabre.
 */
export class CircuitBreaker {
  private state: State = 'closed';
  private failures = 0;
  private openedAt = 0;

  constructor(
    private readonly opts: { failureThreshold: number; openMs: number; now?: () => number },
  ) {}

  canRequest(): boolean {
    if (this.state === 'closed') return true;
    if (this.state === 'open' && this.now() - this.openedAt >= this.opts.openMs) {
      this.state = 'half-open';
      return true;
    }
    return false;
  }

  recordSuccess(): void {
    this.state = 'closed';
    this.failures = 0;
  }

  recordFailure(): void {
    this.failures++;
    if (this.state === 'half-open' || this.failures >= this.opts.failureThreshold) {
      this.state = 'open';
      this.openedAt = this.now();
    }
  }

  private now(): number {
    return (this.opts.now ?? Date.now)();
  }
}
