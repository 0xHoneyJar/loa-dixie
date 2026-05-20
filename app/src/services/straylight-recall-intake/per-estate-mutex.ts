// Phase 26E — per-estate async mutex.
//
// ADR-026D §3.c (i): same-estate writes serialize so audit-tail-then-append
// is atomic. Inter-estate calls run in parallel.
//
// Implementation: a per-estate promise chain. Each acquire awaits the
// previous tail; the slot is dropped when no other waiter is queued.

export interface PerEstateMutex {
  withLock<T>(estate_id: string, fn: () => Promise<T>): Promise<T>;
  inflight(estate_id: string): boolean;
}

export function createPerEstateMutex(): PerEstateMutex {
  const tails = new Map<string, Promise<void>>();

  return {
    inflight(estate_id) {
      return tails.has(estate_id);
    },
    withLock<T>(estate_id: string, fn: () => Promise<T>): Promise<T> {
      const prev = tails.get(estate_id) ?? Promise.resolve();
      const result = prev.then(fn);
      const next = result.then(
        () => undefined,
        () => undefined,
      );
      tails.set(estate_id, next);
      void next.then(() => {
        if (tails.get(estate_id) === next) tails.delete(estate_id);
      });
      return result;
    },
  };
}
