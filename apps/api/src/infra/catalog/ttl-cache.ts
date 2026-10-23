interface Entry<T> {
  value: T;
  storedAt: number;
}

/** Cache em memória com expiração e descarte do menos usado (LRU via ordem do Map). */
export class TtlCache<T> {
  private readonly entries = new Map<string, Entry<T>>();

  constructor(private readonly opts: { ttlMs: number; maxEntries: number; now?: () => number }) {}

  private now(): number {
    return (this.opts.now ?? Date.now)();
  }

  set(key: string, value: T): void {
    this.entries.delete(key);
    this.entries.set(key, { value, storedAt: this.now() });
    if (this.entries.size > this.opts.maxEntries) {
      this.entries.delete(this.entries.keys().next().value!);
    }
  }

  /** Valor ainda dentro do TTL. */
  getFresh(key: string): T | undefined {
    const entry = this.entries.get(key);
    if (!entry || this.now() - entry.storedAt > this.opts.ttlMs) return undefined;
    this.entries.delete(key);
    this.entries.set(key, entry);
    return entry.value;
  }

  /** Valor mesmo vencido — usado só quando a API externa está fora. */
  getAny(key: string): T | undefined {
    return this.entries.get(key)?.value;
  }
}
