type Entry<Value> = { expiresAt: number; staleAt: number; value: Promise<Value>; refresh?: Promise<void> };

export class TtlCache {
  private readonly entries = new Map<string, Entry<unknown>>();

  getOrCreate<Value>(key: string, ttlMs: number, load: () => Promise<Value>, staleTtlMs = 0): Promise<Value> {
    const existing = this.entries.get(key) as Entry<Value> | undefined;
    if (existing && existing.expiresAt > Date.now()) return existing.value;
    if (existing && existing.staleAt > Date.now()) {
      existing.refresh ??= load().then((next) => {
        this.entries.set(key, { expiresAt: Date.now() + ttlMs, staleAt: Date.now() + ttlMs + staleTtlMs, value: Promise.resolve(next) });
      }).catch(() => undefined).finally(() => { delete existing.refresh; });
      return existing.value;
    }
    const value = load().catch((error) => {
      if (this.entries.get(key)?.value === value) this.entries.delete(key);
      throw error;
    });
    this.entries.set(key, { expiresAt: Date.now() + ttlMs, staleAt: Date.now() + ttlMs + staleTtlMs, value });
    return value;
  }

  deletePrefix(prefix: string) {
    for (const key of this.entries.keys()) if (key.startsWith(prefix)) this.entries.delete(key);
  }

  extendStale(key: string, staleTtlMs: number) {
    const entry = this.entries.get(key);
    if (entry) entry.staleAt = Math.max(entry.staleAt, Date.now() + staleTtlMs);
  }
}
