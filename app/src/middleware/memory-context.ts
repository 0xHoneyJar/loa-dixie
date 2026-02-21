import type { MiddlewareHandler } from 'hono';
import type { MemoryStore } from '../services/memory-store.js';
import type { InjectionContext } from '../types/memory.js';

/**
 * Memory context injection dependencies.
 *
 * The resolveNftId function maps a wallet to its owned nftId.
 * In production this calls loa-finn's identity graph.
 * Returns null when the wallet has no associated dNFT.
 */
export interface MemoryContextDeps {
  memoryStore: MemoryStore;
  resolveNftId: (wallet: string) => Promise<string | null>;
}

/**
 * Memory context injection middleware — position 14 in the middleware pipeline.
 *
 * Per SDD §4.2 Memory Injection Flow:
 * 1. Extract wallet from x-wallet-address header (set by JWT + wallet-bridge)
 * 2. Resolve nftId from wallet via loa-finn identity graph
 * 3. Fetch projection from Redis cache-aside (< 1ms hit, < 50ms miss)
 * 4. Construct InjectionContext with token-bounded memory summary
 * 5. Attach to request header as JSON for loa-finn proxy
 *
 * Graceful degradation: if memory resolution fails for any reason,
 * the request proceeds without memory context. Chat works without memory.
 * See: SDD §14.1
 */
export function createMemoryContext(deps: MemoryContextDeps): MiddlewareHandler {
  const { memoryStore, resolveNftId } = deps;

  return async (c, next) => {
    const wallet = c.req.header('x-wallet-address');

    if (!wallet) {
      // No authenticated wallet — skip memory injection
      await next();
      return;
    }

    try {
      const nftId = await resolveNftId(wallet);
      if (!nftId) {
        // Wallet has no associated dNFT — skip memory injection
        await next();
        return;
      }

      const injectionContext: InjectionContext = await memoryStore.getInjectionContext(nftId, wallet);

      // Attach memory context as JSON header for downstream handlers
      // Chat routes will include this when proxying to loa-finn
      c.req.raw.headers.set('x-memory-context', JSON.stringify(injectionContext));
    } catch {
      // Graceful degradation — memory resolution failure should not block the request
      // SDD §14.1: loa-finn Memory API down → chat works without memory context
    }

    await next();
  };
}
